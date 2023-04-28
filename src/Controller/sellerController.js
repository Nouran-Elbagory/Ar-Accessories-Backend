// #Task route solution
const sellerModel = require('../Models/seller');
const Model = require('../Models/models')
const Images = require('../Models/images')
const Product = require('../Models/Product')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const https = require('https'); // or 'https' for https:// URLs
const fs = require('fs');
const app = require('../config/firebaseConfig');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const Order = require('../Models/order');
const Seller = require('../Models/seller');



const maxAge = 3 * 24 * 60 * 60;
const createToken = (name) => {
    return jwt.sign({ name }, 'secret', {
        expiresIn: maxAge
    });
};

const login = async (req, res) => {
    const { email, password } = req.body;
    const seller = await sellerModel.findOne({ email: email });
    if (!seller) {
        return res.status(404).json({ error: "No such seller" });
    } else {
        try {
            const hashedPassword = await bcrypt.compare(password, seller.password);
            if (hashedPassword) {
                const token = createToken(seller.email);
                res.cookie('jwt', token, { httponly: true, maxAge: maxAge * 1000 });
                res.status(200).json({ "token": token })
            } else {
                res.status(400).json({ error: "your password is wrong" })
            }
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    }
}
const signUp = async (req, res) => {
    try {
        const sellerEntered = req.body;
        const sellerFound = await Seller.findOne({ email: sellerEntered.email });
        if (sellerFound) {
            throw Error('Seller already exists with the same email');
        }
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(sellerEntered.password, salt);
        sellerEntered.password = hashedPassword;
        const seller = await Seller.create(sellerEntered);
        const token = createToken(seller.email);
        res.status(200).json(token);
    } catch (err) {
        res.status(404).json({ "error": err.message });
    }
}

const logout = async (_req, res) => {
    try {
        res.clearCookie('jwt'); //remove the value from our cookie.
        res.status(200).json("you are logged out")
    } catch (error) {
        res.status(406).json({ error: error.message });
    }
}

const getSellers = async (req, res) => {
    const sellers = await sellerModel.find({}).sort({ createdAt: -1 }) //descending order
    res.status(200).json(sellers)
}

const updateProfile = async (req, res) => {
    try {
        const result = await sellerModel.findByIdAndUpdate(req.body._id, req.body, { new: true });
        res.status(200).json(result);

    } catch (err) {
        res.status(400).send({ err: "Seller Not Found" });
    }
};

const getSellerProfile = async (req, res) => {
    try {
        const result = await sellerModel.findById(req.params.id);
        res.status(200).json(result);

    } catch (err) {
        res.status(400).send({ err: "Seller Not Found" });
    }
}


const getProducts = async (req, res) => {
    try {
        const products = await Product.find({ sellerEmail: req.params.sellerEmail });
        res.status(200).json(products);
    }
    catch (err) {
        res.status(406).json({ "error": err.message })
    }
}
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        res.status(200).json(product);
    }
    catch (err) {
        res.status(406).json({ "error": err.message })
    }
}

const getModel = async (req, res) => {
    try {
        Model.findOne({ productID: req.body.productID })
            .then(model => {
                let modelLink = model.modelLink
                let path = fs.createWriteStream("model" + model.productID + ".fbx");

                https.get(modelLink, (result) => {
                    result.pipe(path);

                    // after download completed close filestream
                    path.on("finish", () => {
                        path.close();
                        res.status(200).json("Model Downloaded");
                    });
                });
            })
            .catch(err => {
                res.status(406).json({ error: err.messages })
            })
    }
    catch (error) {
        console.log(error);
        res.status(406).json({ error: error.messages });
    }

}
const getImages = async (req, res) => {
    try {
        Images.find({ productID: { $in: req.body.productID } })
            .then(images => {
                for (let i = 0; i < images.length; i++) {
                    let imageLink = images[i].imageLink
                    let path = fs.createWriteStream("image" + i + ".png");
                    https.get(imageLink, (result) => {
                        result.pipe(path);

                        // after download completed close filestream
                        path.on("finish", () => {
                            path.close();
                        });
                    });
                }
                res.status(200).json("Images Downloaded");
            })
            .catch(err => {
                res.status(406).json({ error: err.messages })
            })
    }
    catch (error) {
        console.log(error);
        res.status(406).json({ error: error.messages });
    }

}
const getOrders = async (req, res) => {
    try {
        // let seller = jwt.verify(req.cookies.jwt, 'secret')
        // let sellerEmail=seller.email
        let sellerEmail = req.params.sellerEmail
        const orders = await Order.find({});
        let sellerOrders = []
        orders.forEach((order) => {
            order.items.every((item) => {
                if (item.sellerEmail == sellerEmail) {
                    sellerOrders.push(order)
                    return false;
                }
            })
        })
        res.status(200).json(sellerOrders);
    }
    catch (err) {
        res.status(406).json({ "error": err.message })
    }
}

const addProduct = async (req, res) => {
    // Pass data as form-data not in JSON
    try {

        // add Product to mongo and get ID
        const createdProduct = await Product.create(req.body);
        const productId = createdProduct._id.toString();

        // get files from request
        const files = req.files;
        let model;
        const images = [];
        files.forEach(file => {
            if (file.fieldname === 'model') {
                model = file;
            }
            else {
                images.push(file);
            }
        });

        // add images and model to firebase
        const imagesURLS = await Promise.all(getImagesURL(productId, images));
        const modelURL = await getModelURL(productId, model);

        // update Product in mongo
        const newProduct = await Product.findOneAndUpdate(
            { _id: productId },
            {
                $set: {
                    images: imagesURLS,
                    model: modelURL
                }
            },
            { new: true });
        res.send(newProduct);

    } catch (err) {
        res.status(406).json({ error: err.message });
    }

}

const getImagesURL = (productId, images) => {
    const storage = getStorage(app);
    return imagesPromise = images.map(async (image) => {
        const imagesRef = ref(storage, `Products/Product${productId}/images/${image.originalname}`);
        const metaData = {
            contentType: image.mimetype
        }
        const snapshot = await uploadBytes(imagesRef, image.buffer, metaData);
        const URL = await getDownloadURL(snapshot.ref);
        return URL;
    });
}


const getModelURL = async (productId, model) => {
    try {
        const storage = getStorage(app);
        const modelRef = ref(storage, `Products/Product${productId}/${model.originalname}`);
        const snapshot = await uploadBytes(modelRef, model.buffer);
        const modelURL = await getDownloadURL(snapshot.ref);
        return modelURL;
    }
    catch (err) {
        return err.message;
    }
}

const updateModel = async (req, res) => {

    // add the model to firebaseStorage
    try {

        const productId = req.params.id;
        const model = req.files[0];
        console.log(model);
        const modelURL = await getModelURL(productId, model);
        res.status(200).json(modelURL);

    } catch (err) {
        res.status(404).json({ error: err.message });
    }

};

const updateProduct = async (req, res) => {
    try {
        console.log(req.body);
        const product = await Product.findOneAndUpdate({ _id: req.params.id }, req.body, { new: true });
        res.status(200).json(product);
    } catch (err) {
        res.send({ error: err.message })
    }
};


const updateImage = (req, res) => {
    Images.findOneAndUpdate(
        { productID: req.body.id },
        {
            $set: {
                imageLink: req.body.imageLink,
            },
        },
        { new: true },
        (err, doc) => {
            if (err) {
                res.status(406).json({ error: err.messages });
            }
            else
                res.status(200).json(doc);
        }

    );
};

const deleteProduct = (req, res) => {
    Product.deleteOne({ _id: req.body.id })
        .then(() => res.json({ message: "product Deleted " }))
        .catch((err) => res.send(err));
}


module.exports = {
    logout, getSellers, login, signUp, getProductById,
    getOrders, updateProfile, getImages, getModel, addProduct,
    deleteProduct, getProducts, updateImage, updateModel, updateProduct,
    getSellerProfile
};


