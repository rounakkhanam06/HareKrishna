import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from '../app/models/customer.js';
import Wallet from '../app/models/wallet.js';

dotenv.config();

async function check() {
  const uri = process.env.MONGO_URI || 'mongodb+srv://smarteannadatacanteen_db_user:eannadata-canteen@cluster0.ghyp4km.mongodb.net/Quick_commerce?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const customer = await Customer.findOne({ name: /MOBIN ANSARI/i });
  if (!customer) {
    console.log('MOBIN ANSARI not found');
    await mongoose.disconnect();
    return;
  }

  const wallet = await Wallet.findOne({ ownerId: customer._id });
  if (wallet) {
    console.log('Wallet full document:', JSON.stringify(wallet, null, 2));
  } else {
    console.log('No Wallet document found');
  }

  await mongoose.disconnect();
}

check().catch(console.error);
