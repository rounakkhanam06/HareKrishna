import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../app/models/customer.js";
import Setting from "../app/models/setting.js";

dotenv.config({ path: "./.env" });

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const user = await User.findOne({ phone: "+916268423925" });
        if (!user) {
            console.log("User Harshvardhan not found");
        } else {
            console.log("=== USER HARSHVARDHAN ===");
            console.log({
                id: user._id,
                name: user["Farmer Name"] || user.name,
                phone: user.phone,
                isSubsidyEligible: user.isSubsidyEligible,
                eAnnadataCardStatus: user["eAnnadata Card Status"],
                eAnnadataCardNumber: user["eAnnadata Card Number"],
                eAnnadataCardRegistrationDate: user["eAnnadata Card Registration Date"],
                registrationDate: user["Registration Date"],
                createdAt: user.createdAt,
            });
        }

        const settings = await Setting.findOne({});
        console.log("=== FINANCE SETTINGS ===");
        console.log({
            dbtTier1Years: settings?.dbtTier1Years,
            dbtTier1Months: settings?.dbtTier1Months,
            dbtTier1Rate: settings?.dbtTier1Rate,
            dbtTier2Years: settings?.dbtTier2Years,
            dbtTier2Months: settings?.dbtTier2Months,
            dbtTier2Rate: settings?.dbtTier2Rate,
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

run();
