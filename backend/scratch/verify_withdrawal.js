import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from '../app/models/customer.js';
import Wallet from '../app/models/wallet.js';
import LedgerEntry from '../app/models/ledgerEntry.js';
import Transaction from '../app/models/transaction.js';
import { requestWithdrawal } from '../app/controller/customerAuthController.js';

dotenv.config();

async function verify() {
  const uri = process.env.MONGO_URI || 'mongodb+srv://smarteannadatacanteen_db_user:eannadata-canteen@cluster0.ghyp4km.mongodb.net/Quick_commerce?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const customer = await Customer.findOne({ name: /MOBIN ANSARI/i });
  if (!customer) {
    console.log('MOBIN ANSARI not found');
    await mongoose.disconnect();
    return;
  }

  // Get current wallet balance
  let wallet = await Wallet.findOne({ ownerId: customer._id });
  const startBalance = wallet.availableBalance;
  console.log(`Initial Available Balance: ₹${startBalance}`);

  if (startBalance <= 0) {
    console.log('No balance available for testing. Exiting...');
    await mongoose.disconnect();
    return;
  }

  // Mock withdrawal of ₹10
  const req = {
    user: { id: customer._id.toString() },
    body: { amount: 1 }
  };

  const res = {
    statusCode: 200,
    headers: {},
    resultPayload: null,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(payload) {
      this.resultPayload = payload;
      return this;
    }
  };

  await requestWithdrawal(req, res);

  console.log('API Response Status:', res.statusCode);
  console.log('API Response Payload:', JSON.stringify(res.resultPayload, null, 2));

  // Reload wallet
  wallet = await Wallet.findOne({ ownerId: customer._id });
  console.log(`New Available Balance in Wallet: ₹${wallet.availableBalance}`);
  console.log(`Expected Available Balance: ₹${startBalance - 1}`);

  // Fetch the latest LedgerEntry
  const latestLedger = await LedgerEntry.findOne({ actorId: customer._id }).sort({ createdAt: -1 });
  console.log('Latest Ledger Entry:', {
    type: latestLedger.type,
    amount: latestLedger.amount,
    direction: latestLedger.direction,
    description: latestLedger.description
  });

  // Fetch the latest Transaction
  const latestTx = await Transaction.findOne({ user: customer._id }).sort({ createdAt: -1 });
  console.log('Latest Transaction Entry:', {
    type: latestTx.type,
    amount: latestTx.amount,
    status: latestTx.status,
    reference: latestTx.reference
  });

  await mongoose.disconnect();
}

verify().catch(console.error);
