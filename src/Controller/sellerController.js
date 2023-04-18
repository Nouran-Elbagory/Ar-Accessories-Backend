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
const { log } = require('console');



const maxAge = 3 * 24 * 60 * 60;
const createToken = (name) => {
    return jwt.sign({ name }, 'secret', {
        expiresIn: maxAge
    });
};

const login = async (req, res) => {
    const { email, password } = req.body;
    console.log(req.body)
    const seller = await sellerModel.findOne({ email: email });
    if (!seller) {
        return res.status(404).json({ error: "No such seller" });
    } else {
        try {
            const hahsedpassword = await bcrypt.compare(password, seller.password);
            if (hahsedpassword) {
                const token = createToken(seller.email);
                res.cookie('jwt', token, { httponly: true, maxAge: maxAge * 1000 });
                res.status(200).json(token)
            } else {
                res.status(400).json({ error: " your password is wrong" })
            }
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    }
}

const logout = async (req, res) => {
    try {
        res.cookie('jwt', ""); //remove the value from our cookie.
        res.status(200).json("you are logged out")
    } catch (error) {
        res.status(406).json({ error: error.messages });
    }
}

const getSellers = async (req, res) => {
    const sellers = await sellerModel.find({}).sort({ createdAt: -1 }) //descending order
    res.status(200).json(sellers)
}


const addProduct = async (req, res) => {
    // Pass data as form-data not in JSON
    try {


        const files = req.files;
        let modelFile;
        const images = [];

        files.forEach(file => {
            if (file.fieldname === 'model') {
                modelFile = file;
            }
            else {
                images.push(file);
            }
        });

        //res.send(req.files);

        const product = req.body;
        const storage = getStorage(app);

        const imagesPromise = images.map(async (image) => {

            const storageRef = ref(storage, `${image.originalname}`);
            const metaData = {
                contentType: image.mimetype
            }
            const snapshot = await uploadBytes(storageRef, image.buffer, metaData);
            const URL = await getDownloadURL(snapshot.ref);
            return URL;
        });
        const imagesURLS = await Promise.all(imagesPromise);

        const storageRef = ref(storage, `${modelFile.originalname}`);
        const snapshot = await uploadBytes(storageRef, modelFile.buffer);
        const modelURL = await getDownloadURL(snapshot.ref);


        product.images = imagesURLS;
        product.model = modelURL;

        const createdProduct = await Product.create(product);
        res.status(200).send(createdProduct);

    } catch (err) {
        console.log(err);
        res.status(406).json({ error: err.message });
    }
}

const getProducts = async (req, res) => {
    try {
        const products = await Product.find({});
        res.status(200).json(products);
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
const updateProduct = (req, res) => {
    Product.findOneAndUpdate(
        { productID: req.body.id },
        {
            $set: {
                productName: req.body.name,
                productPrice: req.body.price,
                categoryID: req.body.category,

            },
        },
        { new: true },
        (err, doc) => {
            if (err) {
                res.status(406).json({ error: error.messages });
            }
            else
                res.status(200).json(doc);
        }

    );
};

const updateModel = (req, res) => {
    Model.findOneAndUpdate(
        { productID: req.body.id },
        {
            $set: {
                modelLink: req.body.modelLink,


            },
        },
        { new: true },
        (err, doc) => {
            if (err) {
                res.status(406).json({ error: error.messages });
            }
            else
                res.status(200).json(doc);
        }

    );
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
                res.status(406).json({ error: error.messages });
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


module.exports = { logout, getSellers, login, getImages, getModel, addProduct, deleteProduct, getProducts, updateImage, updateModel, updateProduct };


