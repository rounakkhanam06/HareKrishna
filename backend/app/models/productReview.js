import mongoose from "mongoose";

const productReviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    stars: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 1000,
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    images: [
      {
        type: String, // Cloudinary URLs
      },
    ],
    helpfulCount: {
      type: Number,
      default: 0,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["visible", "hidden", "deleted"],
      default: "visible",
      index: true,
    },
    editableUntil: {
      type: Date,
      required: true,
    },
    moderation: {
      reason: { type: String, default: "" },
      moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
      moderatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// Indexes
// Compound index for public listings: visible reviews sorted by newest
productReviewSchema.index({ productId: 1, status: 1, createdAt: -1 });

// Compound index for public star filtering
productReviewSchema.index({ productId: 1, status: 1, stars: 1 });

// Compound index for seller dashboard
productReviewSchema.index({ sellerId: 1, status: 1, createdAt: -1 });

// Compound index for customer order page
productReviewSchema.index({ customerId: 1, orderId: 1 });

export default mongoose.models.ProductReview ||
  mongoose.model("ProductReview", productReviewSchema);
