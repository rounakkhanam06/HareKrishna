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
            banana: "C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\88df521e-441c-46b1-98b7-b53fc3f06ce3\\banana_product_1786688851197.jpg",
            guava: "C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\88df521e-441c-46b1-98b7-b53fc3f06ce3\\guava_product_1786689157687.jpg",
            apple: "C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\88df521e-441c-46b1-98b7-b53fc3f06ce3\\apple_product_1786689271164.jpg"
        };
        
        console.log("Uploading banana image...");
        const bananaUrl = await uploadFile(images.banana);
        console.log("Uploading guava image...");
        const guavaUrl = await uploadFile(images.guava);
        console.log("Uploading apple image...");
        const appleUrl = await uploadFile(images.apple);
        
        console.log("Updating Banana product...");
        await Product.updateMany({ name: { $regex: /banana/i } }, { mainImage: bananaUrl });
        console.log("Updating Guava product...");
        await Product.updateMany({ name: { $regex: /guava/i } }, { mainImage: guavaUrl });
        console.log("Updating Apple product...");
        await Product.updateMany({ name: { $regex: /apple/i } }, { mainImage: appleUrl });
        
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
