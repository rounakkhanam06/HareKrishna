import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadFile(filePath) {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(filePath, { folder: "products" }, (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
        });
    });
}

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        const Product = (await import('./app/models/product.js')).default;
        
        const images = {
            saunf: "C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\88df521e-441c-46b1-98b7-b53fc3f06ce3\\saunf_seeds_1786690572627.jpg",
            cardamom: "C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\88df521e-441c-46b1-98b7-b53fc3f06ce3\\green_cardamom_1786690638234.jpg",
        };
        
        console.log("Uploading Saunf Seeds image...");
        const saunfUrl = await uploadFile(images.saunf);
        console.log("Uploading Green Cardamom image...");
        const cardamomUrl = await uploadFile(images.cardamom);
        
        console.log("Updating Saunf product...");
        await Product.updateMany({ name: { $regex: /saunt|saunf/i } }, { mainImage: saunfUrl });
        console.log("Updating Cardamom product...");
        await Product.updateMany({ name: { $regex: /cardamom|elaichi/i } }, { mainImage: cardamomUrl });
        
        console.log("Images successfully updated!");
        
        // Invalidate cache
        const cacheService = (await import('./app/services/cacheService.js')).default;
        await cacheService.delPattern('cache:*');
        
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

run();
