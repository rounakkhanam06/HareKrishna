import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const productSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model('Product', productSchema);

await mongoose.connect(process.env.MONGO_URI || process.env.DATABASE_URL);
console.log('Connected');

const result = await Product.findOneAndUpdate(
  { name: /banana/i },
  { $set: { salePrice: 45 } },
  { new: true }
).select('name price salePrice variants').lean();

console.log('=== UPDATED BANANA ===');
console.log('name:', result.name);
console.log('price (MRP):', result.price);
console.log('salePrice:', result.salePrice);
console.log('variants:', JSON.stringify(result.variants, null, 2));

await mongoose.disconnect();
console.log('Done!');
