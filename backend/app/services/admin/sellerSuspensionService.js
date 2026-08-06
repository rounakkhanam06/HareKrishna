import Seller from "../../models/seller.js";
import SellerAuditLog from "../../models/sellerAuditLog.js";
import PushToken from "../../modules/notifications/token.model.js";
import { delPattern } from "../cacheService.js";
import * as logger from "../logger.js";

/**
 * Invalidates all nearby-seller and product-list caches.
 * Called after any suspension state change so customers see
 * up-to-date availability immediately.
 */
async function invalidateSellerCaches() {
  try {
    await Promise.all([
      delPattern("cache:sellers:nearby:*"),
      delPattern("cache:catalog:productList:*"),
      // handle versioned keys too
      delPattern("cache:*:sellers:nearby:*"),
      delPattern("cache:*:catalog:productList:*"),
    ]);
  } catch (err) {
    // Non-fatal — cache will expire naturally
    logger.warn("[SellerSuspension] Cache invalidation error:", err);
  }
}

/**
 * Mute all push tokens for a seller (on suspension).
 */
async function mutePushTokens(sellerId) {
  try {
    await PushToken.updateMany(
      { userId: sellerId, role: "seller" },
      {
        $set: {
          isActive: false,
          invalidatedAt: new Date(),
          invalidReason: "seller_suspended",
        },
      },
    );
  } catch (err) {
    logger.warn("[SellerSuspension] PushToken mute error:", err);
  }
}

/**
 * Re-enable push tokens for a seller (on unsuspension).
 */
async function restorePushTokens(sellerId) {
  try {
    await PushToken.updateMany(
      { userId: sellerId, role: "seller", invalidReason: "seller_suspended" },
      {
        $set: {
          isActive: true,
          invalidatedAt: null,
          invalidReason: "",
        },
      },
    );
  } catch (err) {
    logger.warn("[SellerSuspension] PushToken restore error:", err);
  }
}

/**
 * Suspend a seller.
 * Sets isSuspended: true, isActive: false, mutes push tokens,
 * invalidates caches, and records audit log.
 */
export async function suspendSeller({ sellerId, adminId, adminName, reason = "" }) {
  const seller = await Seller.findById(sellerId).select(
    "shopName name isSuspended isActive isVerified applicationStatus",
  );

  if (!seller) {
    const err = new Error("Seller not found");
    err.statusCode = 404;
    throw err;
  }

  if (seller.isSuspended === true) {
    const err = new Error("Seller is already suspended");
    err.statusCode = 400;
    throw err;
  }

  // Suspend the seller
  seller.isSuspended = true;
  seller.isActive = false;
  seller.suspendedAt = new Date();
  seller.suspensionReason = String(reason || "").trim();
  seller.suspendedBy = adminId;
  await seller.save();

  // Mute push notifications
  await mutePushTokens(sellerId);

  // Flush caches
  await invalidateSellerCaches();

  // Write audit log
  await SellerAuditLog.create({
    sellerId,
    sellerName: seller.shopName || seller.name || "",
    adminId,
    adminName: adminName || "",
    action: "SUSPEND",
    reason: String(reason || "").trim(),
  });

  logger.info(`[SellerSuspension] Seller ${sellerId} suspended by admin ${adminId}`);

  return {
    sellerId: String(sellerId),
    sellerName: seller.shopName || seller.name || "",
    isSuspended: true,
    suspendedAt: seller.suspendedAt,
    suspensionReason: seller.suspensionReason,
  };
}

/**
 * Unsuspend a seller.
 * Restores isActive, clears suspension fields, restores push tokens,
 * invalidates caches, and records audit log.
 */
export async function unsuspendSeller({ sellerId, adminId, adminName, reason = "" }) {
  const seller = await Seller.findById(sellerId).select(
    "shopName name isSuspended isVerified applicationStatus",
  );

  if (!seller) {
    const err = new Error("Seller not found");
    err.statusCode = 404;
    throw err;
  }

  if (seller.isSuspended !== true) {
    const err = new Error("Seller is not currently suspended");
    err.statusCode = 400;
    throw err;
  }

  // Only restore isActive if seller was previously approved
  const isApproved =
    seller.isVerified === true && seller.applicationStatus === "approved";

  seller.isSuspended = false;
  seller.isActive = isApproved;
  seller.suspendedAt = null;
  seller.suspensionReason = "";
  seller.suspendedBy = null;
  await seller.save();

  // Restore push notifications
  await restorePushTokens(sellerId);

  // Flush caches
  await invalidateSellerCaches();

  // Write audit log
  await SellerAuditLog.create({
    sellerId,
    sellerName: seller.shopName || seller.name || "",
    adminId,
    adminName: adminName || "",
    action: "UNSUSPEND",
    reason: String(reason || "").trim(),
  });

  logger.info(`[SellerSuspension] Seller ${sellerId} unsuspended by admin ${adminId}`);

  return {
    sellerId: String(sellerId),
    sellerName: seller.shopName || seller.name || "",
    isSuspended: false,
    restoredActive: isApproved,
  };
}

/**
 * Get paginated audit log for a specific seller.
 */
export async function getSellerAuditLogData({ sellerId, page = 1, limit = 20, skip = 0 }) {
  const [items, total] = await Promise.all([
    SellerAuditLog.find({ sellerId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SellerAuditLog.countDocuments({ sellerId }),
  ]);

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
