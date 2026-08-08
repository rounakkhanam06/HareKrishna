require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        const Category = require('./app/models/category.js').default;
        
        console.log("Updating Database...");
        
        await Category.findOneAndUpdate({ name: "Dairy & Breads" }, { image: "/images/categories/dairy_breads.png" }, { new: true });
        await Category.findOneAndUpdate({ name: "Masala & Spices" }, { image: "/images/categories/masala_spices.png" }, { new: true });
        
        console.log("Successfully updated categories!");
    } catch (e) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}).catch(console.error);
