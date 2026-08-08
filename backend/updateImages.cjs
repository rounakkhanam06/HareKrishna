require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadImage = async (filePath) => {
    const result = await cloudinary.uploader.upload(filePath, {
        folder: "categories"
    });
    return result.secure_url;
};

mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        const Category = require('./app/models/category.js').default;
        
        console.log("Uploading Dairy & Breads...");
        const dairyUrl = await uploadImage('C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\25799d5d-ef65-416a-a568-1ce6f2f2305c\\dairy_breads_1786193587711.png');
        console.log("Uploaded:", dairyUrl);
        
        console.log("Uploading Masala & Spices...");
        const masalaUrl = await uploadImage('C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\25799d5d-ef65-416a-a568-1ce6f2f2305c\\masala_spices_1786193648746.png');
        console.log("Uploaded:", masalaUrl);
        
        console.log("Updating Database...");
        
        await Category.findOneAndUpdate({ name: "Dairy & Breads" }, { image: dairyUrl }, { new: true });
        await Category.findOneAndUpdate({ name: "Masala & Spices" }, { image: masalaUrl }, { new: true });
        
        console.log("Successfully updated categories!");
    } catch (e) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}).catch(console.error);
