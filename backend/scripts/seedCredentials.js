import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../app/models/admin.js';
import Seller from '../app/models/seller.js';
import Delivery from '../app/models/delivery.js';
import User from '../app/models/customer.js';


dotenv.config();

const admins = [
    { name: 'Admin', email: 'admin123@gmail.com', password: 'admin123' },
    { name: 'Ankit Ahirwar', email: 'ankit@eannadata.com', password: 'Admin!@#123' },
    { name: 'Harshvardhan Panchal', email: 'harshvardhanpanc145@gmail.com', password: 'Admin!@#123' }
];

const sellers = [
    { name: 'Seller', email: 'seller123@gmail.com', password: 'seller123', shopName: 'Eannadata Store' }
];

const riders = [
    { name: 'Delivery Partner', phone: '7389961407', email: 'delivery123@gmail.com', vehicleType: 'bike', vehicleNumber: 'MH-12-AB-1234', drivingLicenseNumber: 'DL-1234567890' }
];

const users = [
    { name: 'Customer User', phone: '7389961407', email: 'user123@gmail.com' }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        for (const adminData of admins) {
            // Find existing
            let admin = await Admin.findOne({ email: adminData.email });
            if (admin) {
                admin.password = adminData.password;
                await admin.save();
                console.log(`Updated Admin: ${adminData.email}`);
            } else {
                await Admin.create({ ...adminData, role: 'admin', isVerified: true });
                console.log(`Created Admin: ${adminData.email}`);
            }
        }

        for (const sellerData of sellers) {
            let seller = await Seller.findOne({ email: sellerData.email });
            if (seller) {
                seller.password = sellerData.password;
                seller.isVerified = true;
                seller.isActive = true;
                seller.applicationStatus = 'approved';
                await seller.save();
                console.log(`Updated Seller: ${sellerData.email}`);
            } else {
                await Seller.create({ 
                    ...sellerData, 
                    role: 'seller', 
                    isVerified: true, 
                    isActive: true, 
                    applicationStatus: 'approved',
                    phone: '8888888888' 
                });
                console.log(`Created Seller: ${sellerData.email}`);
            }
        }

        for (const riderData of riders) {
            let rider = await Delivery.findOne({ $or: [{ phone: riderData.phone }, { email: riderData.email }] });
            if (rider) {
                rider.name = riderData.name;
                rider.phone = riderData.phone;
                rider.email = riderData.email;
                rider.isVerified = true;
                rider.isOnline = true;
                await rider.save();
                console.log(`Updated Delivery Partner: ${riderData.phone}`);
            } else {
                await Delivery.create({
                    ...riderData,
                    isVerified: true,
                    isOnline: true
                });
                console.log(`Created Delivery Partner: ${riderData.phone}`);
            }
        }

        for (const userData of users) {
            const normalizedPhone = `+91${userData.phone}`;
            let user = await User.findOne({ $or: [{ phone: normalizedPhone }, { email: userData.email }] });
            if (user) {
                user.name = userData.name;
                user.phone = normalizedPhone;
                user.email = userData.email;
                user.isVerified = true;
                await user.save();
                console.log(`Updated User: ${userData.phone}`);
            } else {
                await User.create({
                    ...userData,
                    phone: normalizedPhone,
                    isVerified: true
                });
                console.log(`Created User: ${userData.phone}`);
            }
        }

        console.log('Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding:', error);
        process.exit(1);
    }
}

seed();
