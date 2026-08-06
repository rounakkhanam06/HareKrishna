import mongoose from "mongoose";
import Order from "../../models/order.js";
import User from "../../models/customer.js";
import RefundPayoutDetail from "../../models/refundPayoutDetail.js";
import { createFinanceAuditLog } from "./auditLogService.js";
import {
  REFUND_PAYOUT_STATUS,
  REFUND_PAYOUT_METHOD,
  REFUND_AUDIT_ACTION,
  OWNER_TYPE,
} from "../../constants/finance.js";
import { encrypt, decrypt, maskValue } from "../../utils/encryptionUtil.js";
import { orderMatchQueryFromRouteParam } from "../../utils/orderLookup.js";

/**
 * Helper to sanitize a RefundPayoutDetail document for the client.
 * Decrypts the encrypted fields internally to generate correct masks,
 * then strips the actual encrypted blobs so they never leave the server.
 */
export function sanitizeRefundPayoutDetail(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };

  // Decrypt internally to generate mask if possible
  let plainName = "";
  let plainUpi = "";
  let plainAccount = "";
  let plainMobile = "";
  let plainEmail = "";

  try {
    if (obj.accountHolderNameEncrypted) {
      plainName = decrypt(obj.accountHolderNameEncrypted);
    }
    if (obj.upiIdEncrypted) {
      plainUpi = decrypt(obj.upiIdEncrypted);
    }
    if (obj.accountNumberEncrypted) {
      plainAccount = decrypt(obj.accountNumberEncrypted);
    }
    if (obj.mobileEncrypted) {
      plainMobile = decrypt(obj.mobileEncrypted);
    }
    if (obj.emailEncrypted) {
      plainEmail = decrypt(obj.emailEncrypted);
    }
  } catch (err) {
    // If decryption fails, we default to generic masks
    plainName = "";
    plainUpi = "";
    plainAccount = "";
    plainMobile = "";
    plainEmail = "";
  }

  // Add masked fields
  obj.accountHolderNameMasked = plainName ? maskValue(plainName, "name") : "****";
  if (obj.refundMethod === REFUND_PAYOUT_METHOD.UPI) {
    obj.upiIdMasked = plainUpi ? maskValue(plainUpi, "upi") : "****";
  } else if (obj.refundMethod === REFUND_PAYOUT_METHOD.BANK_ACCOUNT) {
    obj.accountNumberMasked = plainAccount ? maskValue(plainAccount, "account") : "****";
  }
  if (obj.mobileEncrypted) {
    obj.mobileMasked = plainMobile ? maskValue(plainMobile, "default") : "****";
  }
  if (obj.emailEncrypted) {
    obj.emailMasked = plainEmail ? maskValue(plainEmail, "default") : "****";
  }

  // Remove encrypted blobs for security
  delete obj.accountHolderNameEncrypted;
  delete obj.upiIdEncrypted;
  delete obj.accountNumberEncrypted;
  delete obj.mobileEncrypted;
  delete obj.emailEncrypted;

  return obj;
}

/**
 * Validates common and method-specific refund payout details.
 */
function validatePayoutPayload(payload) {
  const {
    refundMethod,
    accountHolderName,
    upiId,
    accountNumber,
    confirmAccountNumber,
    ifscCode,
    email,
    mobile,
  } = payload;

  if (!refundMethod || ![REFUND_PAYOUT_METHOD.UPI, REFUND_PAYOUT_METHOD.BANK_ACCOUNT].includes(refundMethod)) {
    const err = new Error("Please select a valid refund method");
    err.statusCode = 400;
    throw err;
  }

  // Common account holder name validation
  if (!accountHolderName || typeof accountHolderName !== "string") {
    const err = new Error("Enter a valid account holder name");
    err.statusCode = 400;
    throw err;
  }
  const trimmedName = accountHolderName.trim();
  const nameRegex = /^[a-zA-Z0-9\s.]{2,100}$/;
  if (!nameRegex.test(trimmedName)) {
    const err = new Error("Enter a valid account holder name (2-100 characters, alphanumeric, spaces and dots only)");
    err.statusCode = 400;
    throw err;
  }

  // Validate optional fields if provided
  if (email && typeof email === "string") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      const err = new Error("Enter a valid email address");
      err.statusCode = 400;
      throw err;
    }
  }

  if (mobile && typeof mobile === "string") {
    const mobileRegex = /^\+?[0-9]{10,15}$/;
    if (!mobileRegex.test(mobile.trim())) {
      const err = new Error("Enter a valid mobile number");
      err.statusCode = 400;
      throw err;
    }
  }

  if (refundMethod === REFUND_PAYOUT_METHOD.UPI) {
    if (!upiId || typeof upiId !== "string") {
      const err = new Error("Enter a valid UPI ID (e.g. name@upi)");
      err.statusCode = 400;
      throw err;
    }
    const trimmedUpi = upiId.trim().toLowerCase();
    const upiRegex = /^[a-zA-Z0-9._\-]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(trimmedUpi)) {
      const err = new Error("Enter a valid UPI ID (e.g. name@upi)");
      err.statusCode = 400;
      throw err;
    }
  } else {
    // Bank Account
    if (!accountNumber || typeof accountNumber !== "string") {
      const err = new Error("Account number must be 9–18 digits");
      err.statusCode = 400;
      throw err;
    }
    const trimmedAccount = accountNumber.trim();
    const accountRegex = /^\d{9,18}$/;
    if (!accountRegex.test(trimmedAccount)) {
      const err = new Error("Account number must be 9–18 digits");
      err.statusCode = 400;
      throw err;
    }

    if (confirmAccountNumber !== accountNumber) {
      const err = new Error("Account numbers do not match");
      err.statusCode = 400;
      throw err;
    }

    if (!ifscCode || typeof ifscCode !== "string") {
      const err = new Error("Enter a valid IFSC code (e.g. SBIN0001234)");
      err.statusCode = 400;
      throw err;
    }
    const trimmedIfsc = ifscCode.trim().toUpperCase();
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(trimmedIfsc)) {
      const err = new Error("Enter a valid IFSC code (e.g. SBIN0001234)");
      err.statusCode = 400;
      throw err;
    }
  }
}

/**
 * Submit refund payout details for an order.
 */
export async function submitRefundPayoutDetails(orderId, customerId, payload) {
  // Validate order existence and ownership
  const orderKey = orderMatchQueryFromRouteParam(orderId);
  if (!orderKey) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }
  const order = await Order.findOne(orderKey);
  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  if (order.customer.toString() !== customerId.toString()) {
    const err = new Error("You are not authorized to access this order");
    err.statusCode = 403;
    throw err;
  }

  // Validate order eligibility
  if (!order.returnStatus || order.returnStatus === "none") {
    const err = new Error("This order is not eligible for return/refund");
    err.statusCode = 400;
    throw err;
  }

  if (order.returnStatus === "refund_completed") {
    const err = new Error("Refund already completed for this order");
    err.statusCode = 400;
    throw err;
  }

  // Check if payout details already submitted
  const existing = await RefundPayoutDetail.findOne({ orderId: order._id });
  if (existing) {
    const err = new Error("Refund details already submitted for this order");
    err.statusCode = 409;
    err.duplicate = true;
    err.existing = sanitizeRefundPayoutDetail(existing);
    throw err;
  }

  // Validate request inputs
  validatePayoutPayload(payload);

  const customer = await User.findById(customerId);
  if (!customer) {
    const err = new Error("Customer user not found");
    err.statusCode = 404;
    throw err;
  }

  // Encrypt fields
  const accountHolderNameEncrypted = encrypt(payload.accountHolderName.trim());
  let upiIdEncrypted = undefined;
  let accountNumberEncrypted = undefined;

  if (payload.refundMethod === REFUND_PAYOUT_METHOD.UPI) {
    upiIdEncrypted = encrypt(payload.upiId.trim().toLowerCase());
  } else {
    accountNumberEncrypted = encrypt(payload.accountNumber.trim());
  }

  const mobileEncrypted = payload.mobile ? encrypt(payload.mobile.trim()) : undefined;
  const emailEncrypted = payload.email ? encrypt(payload.email.trim()) : undefined;

  // Create document
  const record = new RefundPayoutDetail({
    orderId: order._id,
    customerId: customer._id,
    orderPublicId: order.orderId,
    customerName: customer.name || "Customer",
    refundMethod: payload.refundMethod,
    refundAmount: order.returnRefundAmount || 0,
    accountHolderNameEncrypted,
    upiIdEncrypted,
    accountNumberEncrypted,
    mobileEncrypted,
    emailEncrypted,
    ifscCode: payload.refundMethod === REFUND_PAYOUT_METHOD.BANK_ACCOUNT ? payload.ifscCode.trim().toUpperCase() : undefined,
    bankName: payload.refundMethod === REFUND_PAYOUT_METHOD.BANK_ACCOUNT ? (payload.bankName || "").trim() : undefined,
    returnReason: order.returnReason || "",
    refundStatus: REFUND_PAYOUT_STATUS.PENDING,
    idempotencyKey: payload.idempotencyKey || undefined,
  });

  await record.save();

  // Log audit event
  await createFinanceAuditLog({
    action: REFUND_AUDIT_ACTION.REFUND_PAYOUT_CREATED,
    actorType: OWNER_TYPE.CUSTOMER,
    actorId: customer._id,
    orderId: order._id,
    metadata: {
      refundMethod: payload.refundMethod,
      refundAmount: record.refundAmount,
    },
    note: "Refund payout details submitted by customer.",
  });

  return sanitizeRefundPayoutDetail(record);
}

/**
 * Update refund payout details for an order (allowed only if status is PENDING or FAILED).
 */
export async function updateRefundPayoutDetails(orderId, customerId, payload) {
  const orderKey = orderMatchQueryFromRouteParam(orderId);
  if (!orderKey) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }
  const order = await Order.findOne(orderKey).select("_id");
  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  const record = await RefundPayoutDetail.findOne({ orderId: order._id });
  if (!record) {
    const err = new Error("Refund payout details not found");
    err.statusCode = 404;
    throw err;
  }

  if (record.customerId.toString() !== customerId.toString()) {
    const err = new Error("You are not authorized to update this record");
    err.statusCode = 403;
    throw err;
  }

  if (record.refundStatus !== REFUND_PAYOUT_STATUS.PENDING && record.refundStatus !== REFUND_PAYOUT_STATUS.FAILED) {
    const err = new Error("Refund payout details can only be updated when status is PENDING or FAILED");
    err.statusCode = 409;
    throw err;
  }

  // Validate payload
  validatePayoutPayload(payload);

  // Re-encrypt and update fields
  record.refundMethod = payload.refundMethod;
  record.accountHolderNameEncrypted = encrypt(payload.accountHolderName.trim());

  if (payload.refundMethod === REFUND_PAYOUT_METHOD.UPI) {
    record.upiIdEncrypted = encrypt(payload.upiId.trim().toLowerCase());
    record.accountNumberEncrypted = undefined;
    record.ifscCode = undefined;
    record.bankName = undefined;
  } else {
    record.accountNumberEncrypted = encrypt(payload.accountNumber.trim());
    record.ifscCode = payload.ifscCode.trim().toUpperCase();
    record.bankName = (payload.bankName || "").trim();
    record.upiIdEncrypted = undefined;
  }

  record.mobileEncrypted = payload.mobile ? encrypt(payload.mobile.trim()) : undefined;
  record.emailEncrypted = payload.email ? encrypt(payload.email.trim()) : undefined;

  const changedFields = ["refundMethod", "accountHolderName", "mobile", "email"];
  if (payload.refundMethod === REFUND_PAYOUT_METHOD.UPI) {
    changedFields.push("upiId");
  } else {
    changedFields.push("accountNumber", "ifscCode", "bankName");
  }

  await record.save();

  // Log audit event
  await createFinanceAuditLog({
    action: REFUND_AUDIT_ACTION.REFUND_PAYOUT_DETAILS_UPDATED,
    actorType: OWNER_TYPE.CUSTOMER,
    actorId: record.customerId,
    orderId: record.orderId,
    metadata: {
      changedFields,
    },
    note: "Refund payout details updated by customer.",
  });

  return sanitizeRefundPayoutDetail(record);
}

/**
 * Get refund payout details for a customer (masked).
 */
export async function getRefundPayoutForCustomer(orderId, customerId) {
  const orderKey = orderMatchQueryFromRouteParam(orderId);
  if (!orderKey) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }
  const order = await Order.findOne(orderKey).select("_id");
  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  const record = await RefundPayoutDetail.findOne({ orderId: order._id });
  if (!record) {
    const err = new Error("Refund payout details not found");
    err.statusCode = 404;
    throw err;
  }

  if (record.customerId.toString() !== customerId.toString()) {
    const err = new Error("You are not authorized to view this record");
    err.statusCode = 403;
    throw err;
  }

  return sanitizeRefundPayoutDetail(record);
}

/**
 * Admin: List refund payout requests with pagination and filters.
 */
export async function listRefundPayoutsForAdmin({ status, method, page = 1, limit = 20, search }) {
  const query = {};
  if (status) {
    query.refundStatus = status;
  }
  if (method) {
    query.refundMethod = method;
  }
  if (search) {
    query.$or = [
      { orderPublicId: { $regex: search, $options: "i" } },
      { customerName: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const total = await RefundPayoutDetail.countDocuments(query);
  const docs = await RefundPayoutDetail.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    results: docs.map((doc) => sanitizeRefundPayoutDetail(doc)),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

/**
 * Admin: Get single refund payout details (optionally decrypted).
 */
export async function getRefundPayoutForAdmin(refundId, actorId, { decryptData = false }) {
  const record = await RefundPayoutDetail.findById(refundId);
  if (!record) {
    const err = new Error("Refund payout details not found");
    err.statusCode = 404;
    throw err;
  }

  if (!decryptData) {
    return sanitizeRefundPayoutDetail(record);
  }

  // Decrypt all fields
  try {
    const result = record.toObject();

    // Plaintext decryption
    result.accountHolderName = decrypt(record.accountHolderNameEncrypted);
    if (record.refundMethod === REFUND_PAYOUT_METHOD.UPI) {
      result.upiId = decrypt(record.upiIdEncrypted);
    } else {
      result.accountNumber = decrypt(record.accountNumberEncrypted);
    }
    if (record.mobileEncrypted) {
      result.mobile = decrypt(record.mobileEncrypted);
    }
    if (record.emailEncrypted) {
      result.email = decrypt(record.emailEncrypted);
    }

    // Masked versions as well for UX convenience
    result.accountHolderNameMasked = maskValue(result.accountHolderName, "name");
    if (record.refundMethod === REFUND_PAYOUT_METHOD.UPI) {
      result.upiIdMasked = maskValue(result.upiId, "upi");
    } else {
      result.accountNumberMasked = maskValue(result.accountNumber, "account");
    }

    // Strip actual encrypted blobs
    delete result.accountHolderNameEncrypted;
    delete result.upiIdEncrypted;
    delete result.accountNumberEncrypted;
    delete result.mobileEncrypted;
    delete result.emailEncrypted;

    // Log the decryption access (mandatory)
    await createFinanceAuditLog({
      action: REFUND_AUDIT_ACTION.REFUND_PAYOUT_VIEWED_DECRYPTED,
      actorType: OWNER_TYPE.ADMIN,
      actorId,
      orderId: record.orderId,
      metadata: {
        refundId: record._id,
        orderPublicId: record.orderPublicId,
      },
      note: `Sensitive payout data decrypted and viewed by Admin (${actorId}).`,
    });

    return result;
  } catch (err) {
    const error = new Error("Failed to decrypt secure refund data");
    error.statusCode = 500;
    throw error;
  }
}

/**
 * Admin: Update refund payout status.
 */
export async function updateRefundStatus(refundId, newStatus, actorId, { remarks = "", failureReason = "" } = {}) {
  const record = await RefundPayoutDetail.findById(refundId);
  if (!record) {
    const err = new Error("Refund payout details not found");
    err.statusCode = 404;
    throw err;
  }

  const previousStatus = record.refundStatus;

  // Validate status transition
  const validTransitions = {
    [REFUND_PAYOUT_STATUS.PENDING]: [REFUND_PAYOUT_STATUS.APPROVED, REFUND_PAYOUT_STATUS.REJECTED, REFUND_PAYOUT_STATUS.CANCELLED],
    [REFUND_PAYOUT_STATUS.APPROVED]: [REFUND_PAYOUT_STATUS.PROCESSING, REFUND_PAYOUT_STATUS.CANCELLED],
    [REFUND_PAYOUT_STATUS.PROCESSING]: [REFUND_PAYOUT_STATUS.COMPLETED, REFUND_PAYOUT_STATUS.FAILED],
    [REFUND_PAYOUT_STATUS.FAILED]: [REFUND_PAYOUT_STATUS.PROCESSING],
    [REFUND_PAYOUT_STATUS.COMPLETED]: [],
    [REFUND_PAYOUT_STATUS.REJECTED]: [],
    [REFUND_PAYOUT_STATUS.CANCELLED]: [],
  };

  const allowed = validTransitions[previousStatus] || [];
  if (!allowed.includes(newStatus)) {
    const err = new Error(`Invalid status transition from ${previousStatus} to ${newStatus}`);
    err.statusCode = 400;
    throw err;
  }

  // Handle transition logic
  record.refundStatus = newStatus;
  if (remarks) {
    record.remarks = remarks.trim();
  }

  if (newStatus === REFUND_PAYOUT_STATUS.COMPLETED || newStatus === REFUND_PAYOUT_STATUS.FAILED) {
    record.processedAt = Date.now();
  }

  if (newStatus === REFUND_PAYOUT_STATUS.FAILED) {
    record.failureReason = failureReason.trim() || remarks.trim() || "Payout processing failed";
  }

  if (newStatus === REFUND_PAYOUT_STATUS.PROCESSING && previousStatus === REFUND_PAYOUT_STATUS.FAILED) {
    record.retryCount += 1;
  }

  await record.save();

  // Log status change
  await createFinanceAuditLog({
    action: REFUND_AUDIT_ACTION.REFUND_PAYOUT_STATUS_UPDATED,
    actorType: OWNER_TYPE.ADMIN,
    actorId,
    orderId: record.orderId,
    metadata: {
      refundId: record._id,
      fromStatus: previousStatus,
      toStatus: newStatus,
      remarks: record.remarks,
    },
    note: `Refund payout status updated from ${previousStatus} to ${newStatus} by Admin.`,
  });

  return sanitizeRefundPayoutDetail(record);
}
