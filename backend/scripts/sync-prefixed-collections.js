import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is not defined in the environment variables.");
  process.exit(1);
}

async function syncCollections() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    
    const collections = await db.listCollections().toArray();
    console.log(`Connected to database. Found ${collections.length} collections.`);

    const quickPrefix = "quick_";
    const quickCollections = collections.filter(col => col.name.startsWith(quickPrefix));
    
    console.log(`Found ${quickCollections.length} collections with prefix "${quickPrefix}":`);
    
    for (const col of quickCollections) {
      const sourceName = col.name;
      const targetName = sourceName.substring(quickPrefix.length);
      
      const count = await db.collection(sourceName).countDocuments();
      console.log(`\nProcessing source "${sourceName}" (${count} documents) -> target "${targetName}"`);
      
      if (count === 0) {
        console.log(`Source collection "${sourceName}" is empty. Skipping.`);
        continue;
      }
      
      // Clean target collection
      console.log(`Clearing target collection "${targetName}"...`);
      await db.collection(targetName).deleteMany({});
      
      // Fetch all docs from source
      const docs = await db.collection(sourceName).find({}).toArray();
      
      // Insert into target
      console.log(`Copying ${docs.length} documents to target "${targetName}"...`);
      const insertResult = await db.collection(targetName).insertMany(docs);
      console.log(`Successfully copied ${insertResult.insertedCount} documents.`);
    }

    console.log("\nSynchronisation completed successfully!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error during synchronisation:", err);
    process.exit(1);
  }
}

syncCollections();
