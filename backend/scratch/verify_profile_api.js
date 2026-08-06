import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from '../app/models/customer.js';
import { getCustomerProfile } from '../app/controller/customerAuthController.js';

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

  // Create a mock req and res
  const req = {
    user: {
      id: customer._id.toString(),
      role: 'customer'
    }
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

  await getCustomerProfile(req, res);

  console.log('API Status Code:', res.statusCode);
  console.log('API Result:', JSON.stringify(res.resultPayload, null, 2));

  await mongoose.disconnect();
}

verify().catch(console.error);
