import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from '../app/models/customer.js';
import Wallet from '../app/models/wallet.js';

dotenv.config();

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb+srv://smarteannadatacanteen_db_user:eannadata-canteen@cluster0.ghyp4km.mongodb.net/Quick_commerce?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(uri);
  
  const customer = await Customer.findOne({ name: /MOBIN ANSARI/i });
  if (!customer) {
    console.log('Customer not found');
    await mongoose.disconnect();
    return;
  }
  
  const wallet = await Wallet.findOneAndUpdate(
    { ownerId: customer._id },
    { $set: { availableBalance: 100 } },
    { new: true }
  );
  
  console.log(`Updated MOBIN ANSARI's availableBalance to ₹${wallet.availableBalance}`);
  await mongoose.disconnect();
}

run().catch(console.error);
