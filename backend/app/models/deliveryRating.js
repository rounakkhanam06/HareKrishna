import mongoose from "mongoose";

const deliveryRatingSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deliveryPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Delivery",
      required: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
    },
    stars: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
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
  },
  { timestamps: true }
);

deliveryRatingSchema.index({ deliveryPartnerId: 1, status: 1, createdAt: -1 });

export default mongoose.model("DeliveryRating", deliveryRatingSchema);
