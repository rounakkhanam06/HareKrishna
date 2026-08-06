import mongoose from "mongoose";
import Order from "../models/order.js";
import { escapeRegex } from "./regex.js";

export function normalizeOrderRouteParam(raw) {
  return decodeURIComponent(String(raw ?? "")).trim();
}

function isStrictObjectIdString(s) {
  return (
    typeof s === "string" &&
    s.length === 24 &&
    mongoose.Types.ObjectId.isValid(s) &&
    new mongoose.Types.ObjectId(s).toString() === s
  );
}

/**
 * Match an order from a route/query/body param: human orderId (e.g. ORD…) or MongoDB _id (24-char hex).
 */
export function orderMatchQueryFromRouteParam(routeParam) {
  const raw = normalizeOrderRouteParam(routeParam);
  if (!raw) return null;
  if (isStrictObjectIdString(raw)) {
    return { _id: new mongoose.Types.ObjectId(raw) };
  }
  if (raw.toUpperCase().startsWith("ORD-") && raw.length === 8) {
    const prefix = escapeRegex(raw.substring(0, 4));
    const suffix = escapeRegex(raw.substring(4));
    return { orderId: new RegExp(`^${prefix}.*${suffix}$`, "i") };
  }
  return { orderId: raw };
}

/**
 * Same as {@link orderMatchQueryFromRouteParam} but tolerates orderId case drift (e.g. ORD vs ord)
 * by matching case-insensitively when the exact string is not found.
 * Use for read endpoints (e.g. customer order detail); keep strict matching for mutating flows when needed.
 */
export function orderMatchQueryFlexible(routeParam) {
  const raw = normalizeOrderRouteParam(routeParam);
  if (!raw) return null;
  if (isStrictObjectIdString(raw)) {
    return { _id: new mongoose.Types.ObjectId(raw) };
  }
  const esc = escapeRegex(raw);
  const conditions = [
    { orderId: raw },
    { orderId: new RegExp(`^${esc}$`, "i") },
    { checkoutGroupId: raw },
    { checkoutGroupId: new RegExp(`^${esc}$`, "i") },
  ];
  if (raw.toUpperCase().startsWith("ORD-") && raw.length === 8) {
    const prefix = escapeRegex(raw.substring(0, 4));
    const suffix = escapeRegex(raw.substring(4));
    conditions.push({ orderId: new RegExp(`^${prefix}.*${suffix}$`, "i") });
  }
  return {
    $or: conditions,
  };
}

export async function resolveCanonicalOrderId(routeParam) {
  const q = orderMatchQueryFromRouteParam(routeParam);
  if (!q) return null;
  const doc = await Order.findOne(q).select("orderId").lean();
  return doc?.orderId ?? null;
}

export async function requireCanonicalOrderId(routeParam) {
  const rid = await resolveCanonicalOrderId(routeParam);
  if (!rid) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }
  return rid;
}
