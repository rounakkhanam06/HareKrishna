import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from './app/models/customer.js';
import Transaction from './app/models/transaction.js';

dotenv.config();

async function check() {
  const uri = process.env.MONGO_URI || 'mongodb+srv://smarteannadatacanteen_db_user:eannadata-canteen@cluster0.ghyp4km.mongodb.net/Quick_commerce?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(uri);
  console.log('Connected to DB');

  // Let's find customers
  const customers = await Customer.find({});
  console.log(`Found ${customers.length} customers:`);
  for (const c of customers) {
    console.log(`- Name: ${c.name}, Phone: ${c.phone}, walletBalance: ${c.walletBalance}`);
    
    // Find transactions for this user
    const txs = await Transaction.find({ user: c._id }).sort({ createdAt: -1 });
    if (txs.length > 0) {
      console.log('  Transactions:');
      for (const t of txs) {
        console.log(`    * [${t.createdAt.toISOString()}] Type: ${t.type}, Amount: ${t.amount}, Status: ${t.status}, Ref: ${t.reference}, Meta: ${JSON.stringify(t.meta)}`);
      }
    } else {
      console.log('  No transactions');
    }
  }

  await mongoose.disconnect();
}

check().catch(console.error);
