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

const banana = await Product.findOne({ name: /banana/i });
if (!banana) {
  console.log('Banana not found');
} else {
  console.log('=== BEFORE BANANA PRODUCT ===');
  console.log('name:', banana.name);
  console.log('stock:', banana.stock);
  console.log('variants:', JSON.stringify(banana.variants, null, 2));

  // Update variant stock to match root stock
  if (banana.variants && banana.variants.length > 0) {
    banana.variants.forEach(variant => {
      variant.stock = banana.stock;
    });
    // Mark variants as modified since it's a nested array
    banana.markModified('variants');
    await banana.save();
    console.log('=== AFTER UPDATE ===');
    console.log('variants:', JSON.stringify(banana.variants, null, 2));
  }
}

await mongoose.disconnect();
