const express = require("express");
const { logout, getSellers, login,
    addProduct, getProductById, updateProfile,
    getProducts, getImages, getModel, deleteProduct,
    updateImage, updateModel, updateProduct, getOrders } = require('../Controller/sellerController');
const router = express.Router();
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage() });

router.post('/login', login)
router.get('/logout', logout);
router.get('/sellers', getSellers);
router.post('/addProduct', upload.any(), addProduct);
router.get('/getProducts/:sellerEmail', getProducts);
router.get('/getProduct/:id', getProductById);
router.get('/getModel', upload.none(), getModel);
router.get('/getImages', upload.none(), getImages);
router.get('/getOrders/:sellerEmail', upload.none(), getOrders);
router.put('/updateSeller', updateProfile)
router.post('/deleteproduct', deleteProduct);
router.post('/updateimage', updateImage);
router.patch('/updatemodel/:id', upload.single('model'), updateModel);
router.patch('/updateproduct/:id', updateProduct);


module.exports = router;