import mongoose from "mongoose";
import { ALL_REFUND_PAYOUT_STATUSES, ALL_REFUND_PAYOUT_METHODS } from "../constants/finance.js";

const refundPayoutDetailSchema = new mongoose.Schema(
  {
    orderId: {
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
    orderPublicId: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    refundMethod: {
      type: String,
      enum: ALL_REFUND_PAYOUT_METHODS,
      required: true,
    },
    refundAmount: {
      type: Number,
      required: true,
    },
    accountHolderNameEncrypted: {
      type: String,
      required: true,
    },
    upiIdEncrypted: {
      type: String,
      required: function() {
        return this.refundMethod === "UPI";
      },
    },
    accountNumberEncrypted: {
      type: String,
      required: function() {
        return this.refundMethod === "BANK_ACCOUNT";
      },
    },
    mobileEncrypted: {
      type: String,
    },
    emailEncrypted: {
      type: String,
    },
    ifscCode: {
      type: String,
      required: function() {
        return this.refundMethod === "BANK_ACCOUNT";
      },
      trim: true,
    },
    bankName: {
      type: String,
      trim: true,
    },
    returnReason: {
      type: String,
      trim: true,
    },
    refundStatus: {
      type: String,
      enum: ALL_REFUND_PAYOUT_STATUSES,
      default: "PENDING",
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    processedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
      trim: true,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    remarks: {
      type: String,
      trim: true,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
refundPayoutDetailSchema.index({ customerId: 1, refundStatus: 1 });
refundPayoutDetailSchema.index({ refundStatus: 1, createdAt: -1 });

export default mongoose.model("RefundPayoutDetail", refundPayoutDetailSchema);
