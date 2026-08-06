import mongoose from "mongoose";

const sellerProfileUpdateRequestSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
    },
    requestedData: {
      name: { type: String, trim: true },
      shopName: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
      registrationNumber: { type: String, trim: true },
      address: { type: String, trim: true },
      locality: { type: String, trim: true },
      pincode: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      serviceRadius: { type: Number },
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
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminFeedback: {
      type: String,
      trim: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexing for quick lookups on pending state
sellerProfileUpdateRequestSchema.index({ seller: 1, status: 1 });

export default mongoose.model("SellerProfileUpdateRequest", sellerProfileUpdateRequestSchema);
