import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const schema = new mongoose.Schema({}, { strict: false });
const Setting = mongoose.model('Setting', schema);

await mongoose.connect(process.env.MONGO_URI || process.env.DATABASE_URL);
console.log('Connected');

const setting = await Setting.findOne().lean();
console.log('=== SETTING ===');
console.log(setting);

await mongoose.disconnect();
