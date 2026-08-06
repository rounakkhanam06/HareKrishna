import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from '../app/models/customer.js';
import Seller from '../app/models/seller.js';
import Order from '../app/models/order.js';
import Product from '../app/models/product.js';
import { sellerAcceptAtomic, sellerPackAtomic } from '../app/services/orderWorkflowService.js';

dotenv.config();

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb+srv://smarteannadatacanteen_db_user:eannadata-canteen@cluster0.ghyp4km.mongodb.net/Quick_commerce?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const customer = await Customer.findOne({ name: /MOBIN ANSARI/i });
  const seller = await Seller.findOne({});
  const product = await Product.findOne({});

  if (!customer || !seller || !product) {
    console.error('Pre-requisite data missing');
    await mongoose.disconnect();
    return;
  }

  // Create a mock order
  const orderId = 'TEST-WFL-' + Date.now();
  let order = await Order.create({
    orderId,
    customer: customer._id,
    seller: seller._id,
    items: [{
      product: product._id,
      name: product.name,
      quantity: 1,
      price: product.price,
    }],
    address: {
      type: 'Home',
      name: 'Test Customer',
      address: '123 Street',
      city: 'City',
      phone: '1234567890',
    },
    workflowVersion: 2,
    workflowStatus: 'SELLER_PENDING',
    status: 'pending',
    sellerPendingExpiresAt: new Date(Date.now() + 60000),
  });

  console.log(`Created test order ${orderId} with status: ${order.workflowStatus}`);

  // Test Accept
  console.log('Accepting order...');
  order = await sellerAcceptAtomic(seller._id, orderId);
  console.log(`After accept - workflowStatus: ${order.workflowStatus}, status: ${order.status}`);

  if (order.workflowStatus === 'SELLER_ACCEPTED' && order.status === 'confirmed') {
    console.log('SUCCESS: Seller Accept transition works perfectly!');
  } else {
    console.log('FAIL: Seller Accept transition returned incorrect values!');
  }

  // Test Pack
  console.log('Packing order...');
  order = await sellerPackAtomic(seller._id, orderId);
  console.log(`After pack - workflowStatus: ${order.workflowStatus}, status: ${order.status}`);

  if (order.workflowStatus === 'DELIVERY_SEARCH' && order.status === 'packed') {
    console.log('SUCCESS: Seller Pack transition works perfectly!');
  } else {
    console.log('FAIL: Seller Pack transition returned incorrect values!');
  }

  // Cleanup
  await Order.deleteOne({ _id: order._id });
  console.log('Test order cleaned up.');

  await mongoose.disconnect();
}

run().catch(console.error);
