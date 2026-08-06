import mongoose from 'mongoose';
import dotenv from 'dotenv';
import './app/core/modelRegistry.js';
import Coupon from './app/models/coupon.js';
import Order from './app/models/order.js';

dotenv.config();

async function checkCouponsAndOrders() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        
        const coupons = await Coupon.find({}).lean();
        console.log('--- Coupons in DB ---');
        for (const c of coupons) {
            console.log(`Code: "${c.code}" (ID: ${c._id})`);
            console.log(`  usedCount: ${c.usedCount}`);
            console.log(`  usageLimit: ${c.usageLimit}`);
            console.log(`  isActive: ${c.isActive}`);
        }
        
        const orders = await Order.find({ coupon: { $ne: null } }).lean();
        console.log(`\n--- Orders with Coupons: ${orders.length} ---`);
        for (const o of orders) {
            console.log(`Order ID: ${o.orderId} (Status: ${o.status})`);
            console.log(`  Coupon field: ${o.coupon}`);
            console.log(`  CouponSnapshot:`, o.couponSnapshot);
        }
        
        // Let's also count total orders
        const totalOrders = await Order.countDocuments({});
        console.log(`\nTotal Orders in DB: ${totalOrders}`);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkCouponsAndOrders();
