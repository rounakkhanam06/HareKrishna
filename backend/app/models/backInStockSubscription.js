import mongoose from "mongoose";

const backInStockSubscriptionSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    variantSku: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "notified"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

// Ensure a user can only subscribe once per product/variant in pending state
backInStockSubscriptionSchema.index(
  { productId: 1, userId: 1, variantSku: 1, status: 1 },
  { unique: true }
);

export default mongoose.models.BackInStockSubscription ||
  mongoose.model("BackInStockSubscription", backInStockSubscriptionSchema);
