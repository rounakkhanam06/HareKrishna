import mongoose from 'mongoose';
import Category from './app/models/category.js';

const MONGO_URI = "mongodb+srv://smarteannadatacanteen_db_user:eannadata-canteen@cluster0.ghyp4km.mongodb.net/Quick_commerce?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const results = await Category.find({ name: /electronic/i }).lean();
  console.log(`Found ${results.length} matches for "electronic":`);
  results.forEach(r => {
    console.log({
      name: r.name,
      _id: r._id,
      parentId: r.parentId,
      type: r.type,
      slug: r.slug
    });
  });

  await mongoose.disconnect();
}

run().catch(console.error);
