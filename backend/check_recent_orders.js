import mongoose from 'mongoose';
import dotenv from 'dotenv';
import './app/core/modelRegistry.js';
import Order from './app/models/order.js';

dotenv.config();

async function checkRecentOrders() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        
        // Fetch all orders placed in the last 15 minutes
        const timeLimit = new Date(Date.now() - 15 * 60 * 1000);
        const orders = await Order.find({ createdAt: { $gte: timeLimit } }).sort({ createdAt: -1 }).lean();
        console.log(`Orders placed in the last 15 minutes: ${orders.length}`);
        for (const o of orders) {
            console.log(`Order ID: ${o.orderId}`);
            console.log(`  CreatedAt: ${o.createdAt}`);
            console.log(`  Coupon ID: ${o.coupon}`);
            console.log(`  CouponSnapshot:`, o.couponSnapshot);
            console.log(`  PaymentMode: ${o.paymentMode}`);
            console.log(`  PaymentStatus: ${o.paymentStatus}`);
            console.log(`  Status: ${o.status}`);
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkRecentOrders();
