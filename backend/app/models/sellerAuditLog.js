import mongoose from "mongoose";

const SELLER_AUDIT_ACTIONS = ["SUSPEND", "UNSUSPEND"];

const sellerAuditLogSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },
    sellerName: {
      type: String,
      trim: true,
      default: "",
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },
    adminName: {
      type: String,
      trim: true,
      default: "",
    },
    action: {
      type: String,
      enum: SELLER_AUDIT_ACTIONS,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

sellerAuditLogSchema.index({ createdAt: -1 });
sellerAuditLogSchema.index({ sellerId: 1, createdAt: -1 });

export const SELLER_AUDIT_ACTIONS_ENUM = SELLER_AUDIT_ACTIONS;
export default mongoose.model("SellerAuditLog", sellerAuditLogSchema);
