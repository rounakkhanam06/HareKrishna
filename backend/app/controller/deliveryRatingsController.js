import mongoose from "mongoose";
import DeliveryRating from "../models/deliveryRating.js";
import Order from "../models/order.js";
import Delivery from "../models/delivery.js";
import handleResponse from "../utils/helper.js";
import getPagination from "../utils/pagination.js";
import { orderMatchQueryFromRouteParam } from "../utils/orderLookup.js";
import { createDeliveryRatingSchema } from "../validation/deliveryRatingValidation.js";
import { emitNotificationEvent } from "../modules/notifications/notification.emitter.js";
import { NOTIFICATION_EVENTS } from "../modules/notifications/notification.constants.js";
import { emitToDelivery } from "../services/orderSocketEmitter.js";

// Helper to escape HTML and prevent basic XSS
const sanitizeText = (text) => {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// 1. Submit or Edit a Delivery Rating (Customer)
export const rateDeliveryPartner = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.params;
    const customerId = req.user.id;

    // Validate body input
    const { error, value } = createDeliveryRatingSchema.validate(req.body);
    if (error) {
      await session.abortTransaction();
      session.endSession();
      return handleResponse(res, 400, error.details[0].message);
    }

    const { stars, review, tags } = value;
    const sanitizedReview = sanitizeText(review);

    // Fetch the order
    const orderQuery = orderMatchQueryFromRouteParam(orderId);
    if (!orderQuery) {
      await session.abortTransaction();
      session.endSession();
      return handleResponse(res, 400, "Invalid order identifier format.");
    }

    const order = await Order.findOne(orderQuery).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return handleResponse(res, 404, "Order not found.");
    }

    // Validate order ownership
    if (order.customer.toString() !== customerId) {
      await session.abortTransaction();
      session.endSession();
      return handleResponse(res, 403, "Access denied. You do not own this order.");
    }

    // Validate order delivery status
    if (order.status !== "delivered" && order.workflowStatus !== "DELIVERED") {
      await session.abortTransaction();
      session.endSession();
      return handleResponse(res, 400, "Order must be Delivered before rating.");
    }

    // Validate delivery partner assignment
    if (!order.deliveryBoy) {
      await session.abortTransaction();
      session.endSession();
      return handleResponse(res, 400, "No delivery partner assigned to this order.");
    }

    const deliveryPartnerId = order.deliveryBoy;

    // Retrieve Delivery Partner doc
    const rider = await Delivery.findById(deliveryPartnerId).session(session);
    if (!rider) {
      await session.abortTransaction();
      session.endSession();
      return handleResponse(res, 404, "Delivery partner not found.");
    }

    // Initialize rating fields if missing
    if (!rider.ratingDistribution) {
      rider.ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    }

    // Check if a rating already exists
    let existingRating = await DeliveryRating.findOne({ order: order._id }).session(session);

    if (existingRating) {
      // Handle EDIT rating flow
      const now = new Date();
      if (now > existingRating.editableUntil) {
        await session.abortTransaction();
        session.endSession();
        return handleResponse(res, 400, "Editing window of 24 hours has expired.");
      }

      const oldStars = existingRating.stars;

      // Update rating document
      existingRating.stars = stars;
      existingRating.review = sanitizedReview;
      existingRating.tags = tags || [];
      await existingRating.save({ session });

      // Update Delivery Partner statistics
      const diffStars = stars - oldStars;
      rider.totalStars += diffStars;

      // Adjust distribution count
      rider.ratingDistribution[oldStars] = Math.max(0, (rider.ratingDistribution[oldStars] || 0) - 1);
      rider.ratingDistribution[stars] = (rider.ratingDistribution[stars] || 0) + 1;

      // Recalculate average
      rider.averageRating = rider.totalRatings > 0 
        ? Math.round((rider.totalStars / rider.totalRatings) * 100) / 100 
        : 0;

      // Mark modified explicitly since ratingDistribution keys are mixed-type keys or sub-paths in mongoose
      rider.markModified("ratingDistribution");
      await rider.save({ session });

      await session.commitTransaction();
      session.endSession();

      // Emit Socket notification
      emitToDelivery(deliveryPartnerId.toString(), {
        event: "deliveryPartner:ratingReceived",
        payload: {
          orderId: order.orderId,
          stars,
          review: sanitizedReview,
          tags: tags || [],
          updated: true,
        },
      });

      return handleResponse(res, 200, "Delivery rating updated successfully.", existingRating);
    } else {
      // Handle CREATE rating flow
      const editableUntil = new Date();
      editableUntil.setHours(editableUntil.getHours() + 24);

      const newRating = new DeliveryRating({
        order: order._id,
        customerId,
        deliveryPartnerId,
        sellerId: order.seller,
        stars,
        review: sanitizedReview,
        tags: tags || [],
        status: "visible",
        editableUntil,
      });

      await newRating.save({ session });

      // Link rating in order schema
      order.deliveryRating = {
        isRated: true,
        ratingId: newRating._id,
        ratedAt: new Date(),
      };
      await order.save({ session });

      // Increment Delivery Partner statistics
      rider.totalRatings += 1;
      rider.totalStars += stars;
      rider.ratingDistribution[stars] = (rider.ratingDistribution[stars] || 0) + 1;

      // Recalculate average
      rider.averageRating = Math.round((rider.totalStars / rider.totalRatings) * 100) / 100;

      rider.markModified("ratingDistribution");
      await rider.save({ session });

      await session.commitTransaction();
      session.endSession();

      // Dispatch Notification Job asynchronously (safe outside transaction)
      emitNotificationEvent(NOTIFICATION_EVENTS.DELIVERY_RATING_RECEIVED, {
        deliveryPartnerId: deliveryPartnerId.toString(),
        stars,
        orderId: order.orderId,
        review: sanitizedReview,
      });

      // Emit Socket notification
      emitToDelivery(deliveryPartnerId.toString(), {
        event: "deliveryPartner:ratingReceived",
        payload: {
          orderId: order.orderId,
          stars,
          review: sanitizedReview,
          tags: tags || [],
          updated: false,
        },
      });

      return handleResponse(res, 201, "Delivery rating submitted successfully.", newRating);
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return handleResponse(res, 500, error.message);
  }
};

// 2. Get Delivery Rating details for a specific order (All Authenticated)
export const getDeliveryRatingForOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderQuery = orderMatchQueryFromRouteParam(orderId);
    if (!orderQuery) {
      return handleResponse(res, 400, "Invalid order identifier format.");
    }

    const order = await Order.findOne(orderQuery).lean();
    if (!order) {
      return handleResponse(res, 404, "Order not found.");
    }

    if (!order.deliveryRating?.isRated) {
      return handleResponse(res, 200, "Order has not been rated yet.", { isRated: false });
    }

    const rating = await DeliveryRating.findById(order.deliveryRating.ratingId).lean();
    if (!rating) {
      return handleResponse(res, 404, "Rating record not found.");
    }

    return handleResponse(res, 200, "Rating details fetched successfully.", {
      isRated: true,
      rating,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

// 3. Get paginated ratings list for a delivery partner (Public/Authenticated)
export const getDeliveryPartnerRatings = async (req, res) => {
  try {
    const { id } = req.params;
    const { page, limit, skip } = getPagination(req, { defaultLimit: 10, maxLimit: 50 });
    const { sort } = req.query;

    const query = {
      deliveryPartnerId: id,
      status: "visible",
    };

    let sortOption = { createdAt: -1 };
    if (sort === "highest") {
      sortOption = { stars: -1, createdAt: -1 };
    } else if (sort === "lowest") {
      sortOption = { stars: 1, createdAt: -1 };
    }

    const [ratings, total] = await Promise.all([
      DeliveryRating.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate("order", "orderId")
        .lean(),
      DeliveryRating.countDocuments(query),
    ]);

    // Anonymize customer identities (verified customer tag)
    const anonymizedRatings = ratings.map((r) => ({
      _id: r._id,
      orderId: r.order?.orderId || "—",
      stars: r.stars,
      review: r.review,
      tags: r.tags,
      createdAt: r.createdAt,
      customerName: "Verified Customer",
    }));

    return handleResponse(res, 200, "Partner ratings fetched successfully.", {
      items: anonymizedRatings,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
