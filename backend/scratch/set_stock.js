import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../app/models/product.js';

dotenv.config();

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb+srv://smarteannadatacanteen_db_user:eannadata-canteen@cluster0.ghyp4km.mongodb.net/Quick_commerce?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(uri);
  
  const product = await Product.findOneAndUpdate(
    { name: /Banana/i },
    { $set: { stock: 0 } },
    { new: true }
  );
  
  console.log(`Updated Banana stock to: ${product?.stock}`);
  await mongoose.disconnect();
}

run().catch(console.error);
