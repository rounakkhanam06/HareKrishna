import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from './app/models/customer.js';
import Wallet from './app/models/wallet.js';
import LedgerEntry from './app/models/ledgerEntry.js';
import Order from './app/models/order.js';

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
  console.log(`Customer: ${customer.name}, ID: ${customer._id}, walletBalance: ${customer.walletBalance}`);

  const wallet = await Wallet.findOne({ ownerId: customer._id });
  if (wallet) {
    console.log(`Wallet Document: ID: ${wallet._id}, availableBalance: ${wallet.availableBalance}, pendingBalance: ${wallet.pendingBalance}`);
  } else {
    console.log('No Wallet document found');
  }

  const ledgers = await LedgerEntry.find({ actorId: customer._id }).sort({ createdAt: -1 });
  console.log(`Found ${ledgers.length} Ledger entries:`);
  for (const l of ledgers) {
    console.log(`- Type: ${l.type}, Amount: ${l.amount}, Direction: ${l.direction}, Status: ${l.status}, Ref: ${l.reference}, Desc: ${l.description}`);
  }

  const orders = await Order.find({ customer: customer._id }).sort({ createdAt: -1 });
  console.log(`Found ${orders.length} orders:`);
  for (const o of orders) {
    console.log(`- OrderId: ${o.orderId}, Status: ${o.status}, returnStatus: ${o.returnStatus}, paymentMode: ${o.paymentMode}, paymentStatus: ${o.paymentStatus}, subsidyDiscount: ${o.paymentBreakdown?.subsidyDiscount}`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
