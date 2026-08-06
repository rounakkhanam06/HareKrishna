/**
 * One-time migration: Set isSubsidyEligible = true for all admin-added farmers.
 *
 * A customer is considered "admin-added" when `created_by` is set (admin ID).
 * Self-registered customers go through OTP signup and never have `created_by`.
 *
 * Run once after deployment:
 *   node backend/scripts/migrateSubsidyEligibility.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend root
dotenv.config({ path: join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("❌ No MongoDB URI found in environment. Set MONGO_URI in your .env file.");
  process.exit(1);
}

try {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const Customer = (await import("../app/models/customer.js")).default;

  // Count before
  const totalAdminAdded = await Customer.countDocuments({
    created_by: { $exists: true, $ne: null },
  });
  console.log(`📊 Found ${totalAdminAdded} admin-added farmer records`);

  // Update all admin-added farmers
  const result = await Customer.updateMany(
    {
      created_by: { $exists: true, $ne: null },
      isSubsidyEligible: { $ne: true }, // Only update those not already set
    },
    {
      $set: { isSubsidyEligible: true },
    },
  );

  console.log(`✅ Migration complete:`);
  console.log(`   - Matched:  ${result.matchedCount} records`);
  console.log(`   - Updated:  ${result.modifiedCount} records`);
  console.log(`   - Skipped:  ${result.matchedCount - result.modifiedCount} already had isSubsidyEligible=true`);

  await mongoose.disconnect();
  console.log("✅ Disconnected from MongoDB");
  process.exit(0);
} catch (err) {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
}
