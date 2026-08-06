import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { normalizePhoneNumber } from "../utils/phone.js";


const addressSchema = new mongoose.Schema({
    label: {
        type: String,
        enum: ["home", "work", "other"],
        default: "home",
    },
    fullAddress: {
        type: String,
        required: true,
    },
    formattedAddress: String,
    placeId: String,
    landmark: String,
    city: String,
    state: String,
    pincode: String,
    location: {
        lat: Number,
        lng: Number,
    },
});

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
        },

        "Farmer Name": {
            type: String,
            trim: true,
        },

        email: {
            type: String,
            lowercase: true,
            unique: true,
            sparse: true, // phone login users ke liye
        },

        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        "Mobile No": {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
        },

        "eAnnadata Card Number": {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
        },

        "eAnnadata Card Status": {
            type: String,
            enum: ["no", "pending", "yes", "rejected"],
            default: "no",
        },

        "eAnnadata Card Image": {
            type: String,
        },

        "eAnnadata Card Registration Date": {
            type: Date,
        },

        "Father/Mother/Husband": {
            type: String,
            trim: true,
        },

        "Date Of Birth": {
            type: Date,
        },

        gender: {
            type: String,
            enum: ["Male", "Female", "Other"],
            default: "Other",
        },

        "Pin Code": {
            type: String,
            trim: true,
        },

        "State Name": {
            type: String,
            trim: true,
        },

        "District Name": {
            type: String,
            trim: true,
        },

        "Block Name": {
            type: String,
            trim: true,
        },

        "Village Name": {
            type: String,
            trim: true,
        },

        "A/C Holder Name": {
            type: String,
            trim: true,
        },

        "Bank Name": {
            type: String,
            trim: true,
        },

        "A/C Number": {
            type: String,
            trim: true,
        },

        "Ifsc Code": {
            type: String,
            uppercase: true,
            trim: true,
        },

        "Registration Date": {
            type: Date,
            default: Date.now,
        },


        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },

        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
        },

        // DBT Subsidy — only true for admin-added farmers (never for self-registered customers)
        isSubsidyEligible: {
            type: Boolean,
            default: false,
        },

        password: {
            type: String,
            select: false, // response me password na aaye
        },

        role: {
            type: String,
            enum: ["user", "admin", "delivery", "seller"],
            default: "user",
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

        otp: {
            type: String,
            select: false,
        },

        otpExpiry: {
            type: Date,
            select: false,
        },

        otpHash: {
            type: String,
            select: false,
        },

        otpExpiresAt: {
            type: Date,
            select: false,
        },

        otpFailedAttempts: {
            type: Number,
            default: 0,
            select: false,
        },

        otpLockedUntil: {
            type: Date,
            select: false,
        },

        otpLastSentAt: {
            type: Date,
            select: false,
        },

        otpSessionVersion: {
            type: Number,
            default: 0,
            select: false,
        },

        addresses: [addressSchema],

        /**
         * @deprecated Phase 4 (P4-7). Use the canonical
         * `Wallet({ownerType:"CUSTOMER", ownerId:<userId>}).availableBalance`
         * via `walletService.getCustomerBalance(userId)` instead.
         *
         * This field remains as a denormalised read-cache for
         * frontend backwards compatibility. Every Wallet credit / debit
         * for a customer now $inc's this field in the same Mongo session
         * (Phase 4 P4-3) so the two stay aligned. Will be removed in
         * Phase 7 after every read site has migrated.
         */
        walletBalance: {
            type: Number,
            default: 0,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        lastLogin: Date,
    },
    {
        timestamps: true,
    }
);

userSchema.index({ role: 1, isActive: 1 });

userSchema.pre("validate", function(next) {
    if (this["Mobile No"]) {
        this["Mobile No"] = normalizePhoneNumber(this["Mobile No"]);
        this.phone = this["Mobile No"];
    } else if (this.phone) {
        this.phone = normalizePhoneNumber(this.phone);
        this["Mobile No"] = this.phone;
    }
    if (this["Farmer Name"]) {
        this.name = this["Farmer Name"];
    } else if (this.name) {
        this["Farmer Name"] = this.name;
    }
    next();
});

// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    if (this.password) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

// Phase 4 P4-8 — reverse virtual to the canonical Wallet document.

//
// Usage:
//   const user = await User.findById(id).populate("wallet");
//   user.wallet.availableBalance  // canonical
//
// This is opt-in via .populate() — existing queries that don't reference
// `wallet` see zero behavioural change.
userSchema.virtual("wallet", {
    ref: "Wallet",
    localField: "_id",
    foreignField: "ownerId",
    justOne: true,
    match: { ownerType: "CUSTOMER" },
});

// Make sure virtuals surface in `.toJSON()` / `.toObject()` so the
// frontend can read them once it migrates.
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

export default mongoose.model("User", userSchema);
