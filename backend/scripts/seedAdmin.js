import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../app/models/admin.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is not defined');
    }

    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    // Admin details
    const adminData = {
      name: process.env.ADMIN_SEED_NAME || 'Admin',
      email: process.env.ADMIN_SEED_EMAIL || 'admin123@gmail.com',
      password: process.env.ADMIN_SEED_PASSWORD || 'admin123',
      role: 'admin',
      isSuperAdmin: true,
      permissions: [
        "dashboard",
        "categories",
        "products",
        "marketing",
        "support",
        "sellers",
        "delivery",
        "wallet",
        "withdrawals",
        "refunds",
        "sellerPayments",
        "cashCollection",
        "customers",
        "faqs",
        "orders",
        "billing",
        "settings",
        "systemSettings"
      ],
      isVerified: true,
    };

    // Create or update the admin so the script is safe to rerun.
    const admin = await Admin.findOne({ email: adminData.email }).select('+password');

    if (admin) {
      admin.name = adminData.name;
      admin.password = adminData.password;
      admin.role = adminData.role;
      admin.isSuperAdmin = adminData.isSuperAdmin;
      admin.permissions = adminData.permissions;
      admin.isVerified = adminData.isVerified;
      await admin.save();

      console.log('✓ Admin user updated successfully!');
    } else {
      const createdAdmin = new Admin(adminData);
      await createdAdmin.save();

      console.log('✓ Admin user created successfully!');
    }

    console.log('Email:', adminData.email);
    console.log('Password:', adminData.password);
    console.log('Name:', adminData.name);
    console.log('Role:', adminData.role);

    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
