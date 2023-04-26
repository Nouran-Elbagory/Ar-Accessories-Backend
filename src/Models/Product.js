const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    stock: {
        type: Number,
        required: true
    },
    sellerEmail: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    origin: {
        type: String,
        required: true,
    },
    color: {
        type: String,
        required: true,
    },
    model: {
        type: String,
    },
    images: {
        type: mongoose.SchemaTypes.Array,
    },
    description: {
        type: String,
        required: true,
    }

}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
