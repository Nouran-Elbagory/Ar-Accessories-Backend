const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const {ObjectId} = mongoose.Schema;

const productSchema = new Schema({
    name: {
      type: String,
      required: true,
    },
    price: {
        type: Number,
        required: true,
    },
   
    sellerEmail: {
        type: String,
        required: true,
    },
    category:{
        type:String,
        required:true,
    },
    productID:{
        type: Number,
        required: true,
        unique:true
    }

 
  
  }, { timestamps: true });

  const Product= mongoose.model('Product',productSchema);
  module.exports = Product;
  