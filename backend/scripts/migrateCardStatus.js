import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("❌ No MongoDB URI found in environment.");
  process.exit(1);
}

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const Customer = (await import("../app/models/customer.js")).default;

    const result = await Customer.updateMany(
      {
        created_by: { $exists: true, $ne: null },
        isSubsidyEligible: true,
        "eAnnadata Card Status": { $ne: "yes" }
      },
      {
        $set: { "eAnnadata Card Status": "yes" },
      }
    );

    console.log(`✅ Database migration complete:`);
    console.log(`   - Matched and updated: ${result.modifiedCount} records`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

run();
