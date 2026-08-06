import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        riderId: {
            type: String,
            unique: true,
            sparse: true,
        },

        phone: {
            type: String,
            required: true,
            unique: true,
        },

        vehicleType: {
            type: String,
            enum: ["bike", "cycle", "scooter"],
            default: "bike",
        },

        email: {
            type: String,
            trim: true,
        },

        address: {
            type: String,
            trim: true,
        },

        accountHolder: {
            type: String,
            trim: true,
        },

        accountNumber: {
            type: String,
            trim: true,
        },

        ifsc: {
            type: String,
            trim: true,
        },

        documents: {
            aadhar: { type: String },
            pan: { type: String },
            drivingLicense: { type: String },
            vehicleRegistration: { type: String },
            policeClearance: { type: String },
            bankPassbook: { type: String },
        },

        documentStatuses: {
            aadhar: {
                status: { type: String, enum: ["Pending", "Verified", "Rejected"], default: "Verified" },
                reason: { type: String },
                updatedAt: { type: Date }
            },
            pan: {
                status: { type: String, enum: ["Pending", "Verified", "Rejected"], default: "Verified" },
                reason: { type: String },
                updatedAt: { type: Date }
            },
            drivingLicense: {
                status: { type: String, enum: ["Pending", "Verified", "Rejected"], default: "Verified" },
                reason: { type: String },
                updatedAt: { type: Date }
            },
            vehicleRegistration: {
                status: { type: String, enum: ["Pending", "Verified", "Rejected"], default: "Verified" },
                reason: { type: String },
                updatedAt: { type: Date }
            },
            policeClearance: {
                status: { type: String, enum: ["Pending", "Verified", "Rejected"], default: "Pending" },
                reason: { type: String },
                updatedAt: { type: Date }
            },
            bankPassbook: {
                status: { type: String, enum: ["Pending", "Verified", "Rejected"], default: "Pending" },
                reason: { type: String },
                updatedAt: { type: Date }
            }
        },

        vehicleNumber: {
            type: String,
            trim: true,
        },

        drivingLicenseNumber: {
            type: String,
            trim: true,
        },

        vehicleRegistrationNumber: {
            type: String,
            trim: true,
        },

        currentArea: {
            type: String,
            trim: true,
        },
        emergencyContact: {
            name: { type: String, trim: true },
            relation: { type: String, trim: true },
            phone: { type: String, trim: true }
        },
        profileImage: {
            type: String,
            trim: true,
        },

        isVerified: {
            type: Boolean,
            default: false,
        },



        isOnline: {
            type: Boolean,
            default: true,
        },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number],
                default: [0, 0],
            },
        },
        role: {
            type: String,
            default: "delivery",
        },

        averageRating: {
            type: Number,
            default: 0,
        },
        totalRatings: {
            type: Number,
            default: 0,
        },
        totalStars: {
            type: Number,
            default: 0,
        },
        ratingDistribution: {
            1: { type: Number, default: 0 },
            2: { type: Number, default: 0 },
            3: { type: Number, default: 0 },
            4: { type: Number, default: 0 },
            5: { type: Number, default: 0 },
        },

        otp: {
            type: String,
            select: false,
        },

        otpExpiry: {
            type: Date,
            select: false,
        },

        lastLogin: Date,

        /** Last GPS fix from POST /delivery/location (for radius matching). */
        lastLocationAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

deliverySchema.index({ location: "2dsphere" });
deliverySchema.index({ isOnline: 1, isVerified: 1 });

deliverySchema.virtual('id').get(function () {
    return this._id.toHexString();
});

deliverySchema.pre("save", async function (next) {
    if (!this.riderId) {
        let isUnique = false;
        while (!isUnique) {
            const candidate = `RID-${Math.floor(100000 + Math.random() * 900000)}`;
            const existing = await this.constructor.findOne({ riderId: candidate });
            if (!existing) {
                this.riderId = candidate;
                isUnique = true;
            }
        }
    }
    next();
});

export default mongoose.model("Delivery", deliverySchema);
