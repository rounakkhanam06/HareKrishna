import mongoose from "mongoose";
import DeliveryRating from "../../models/deliveryRating.js";
import Delivery from "../../models/delivery.js";
import handleResponse from "../../utils/helper.js";
import getPagination from "../../utils/pagination.js";

// 1. Get all delivery ratings with advanced filtering (Admin Only)
export const getAdminDeliveryRatings = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req, { defaultLimit: 20, maxLimit: 100 });
    const { search, stars, deliveryPartnerId, sellerId, status, sortBy } = req.query;

    const query = {};

    // Filter by stars
    if (stars) {
      query.stars = Number(stars);
    }

    // Filter by delivery partner
    if (deliveryPartnerId && mongoose.Types.ObjectId.isValid(deliveryPartnerId)) {
      query.deliveryPartnerId = new mongoose.Types.ObjectId(deliveryPartnerId);
    }

    // Filter by seller
    if (sellerId && mongoose.Types.ObjectId.isValid(sellerId)) {
      query.sellerId = new mongoose.Types.ObjectId(sellerId);
    }

    // Filter by status (visible, hidden, deleted)
    if (status) {
      query.status = status;
    } else {
      // Default: exclude soft-deleted ratings unless explicitly requested
      query.status = { $ne: "deleted" };
    }

    let sortOption = { createdAt: -1 };
    if (sortBy === "oldest") {
      sortOption = { createdAt: 1 };
    } else if (sortBy === "highest") {
      sortOption = { stars: -1, createdAt: -1 };
    } else if (sortBy === "lowest") {
      sortOption = { stars: 1, createdAt: -1 };
    }

    // Count and list with populate
    const [ratings, total] = await Promise.all([
      DeliveryRating.find(query)
        .populate("order", "orderId")
        .populate("customerId", "name email phone")
        .populate("deliveryPartnerId", "name phone email")
        .populate("sellerId", "name shopName")
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      DeliveryRating.countDocuments(query),
    ]);

    // Format the items list
    const items = ratings.map((r) => ({
      _id: r._id,
      order: r.order,
      customer: r.customerId ? { id: r.customerId._id, name: r.customerId.name, email: r.customerId.email, phone: r.customerId.phone } : null,
      deliveryPartner: r.deliveryPartnerId ? { id: r.deliveryPartnerId._id, name: r.deliveryPartnerId.name, phone: r.deliveryPartnerId.phone, email: r.deliveryPartnerId.email } : null,
      seller: r.sellerId ? { id: r.sellerId._id, name: r.sellerId.shopName || r.sellerId.name } : null,
      stars: r.stars,
      review: r.review,
      tags: r.tags,
      status: r.status,
      createdAt: r.createdAt,
    }));

    // Gather overall dashboard analytics (total count per star)
    const analytics = await DeliveryRating.aggregate([
      { $match: { status: { $ne: "deleted" } } },
      { $group: { _id: "$stars", count: { $sum: 1 } } },
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    analytics.forEach((d) => {
      if (d._id >= 1 && d._id <= 5) {
        distribution[d._id] = d.count;
      }
    });

    return handleResponse(res, 200, "Admin delivery ratings fetched successfully.", {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      analytics: {
        distribution,
        totalReviews: Object.values(distribution).reduce((a, b) => a + b, 0),
      },
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

// 2. Get detailed rating by ID (Admin Only)
export const getAdminDeliveryRatingById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return handleResponse(res, 400, "Invalid rating ID format.");
    }

    const rating = await DeliveryRating.findById(id)
      .populate("order", "orderId items pricing")
      .populate("customerId", "name email phone")
      .populate("deliveryPartnerId", "name phone email vehicleType vehicleNumber")
      .populate("sellerId", "name shopName address phone")
      .lean();

    if (!rating) {
      return handleResponse(res, 404, "Rating not found.");
    }

    return handleResponse(res, 200, "Rating details fetched successfully.", rating);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

// 3. Moderate delivery rating (Admin Only - Hide, Unhide, Soft Delete)
export const moderateDeliveryRating = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { status } = req.body; // "visible", "hidden", "deleted"

    if (!["visible", "hidden", "deleted"].includes(status)) {
      await session.abortTransaction();
      session.endSession();
      return handleResponse(res, 400, "Invalid moderation status option.");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return handleResponse(res, 400, "Invalid rating ID format.");
    }

    const rating = await DeliveryRating.findById(id).session(session);
    if (!rating) {
      await session.abortTransaction();
      session.endSession();
      return handleResponse(res, 404, "Rating not found.");
    }

    const oldStatus = rating.status;
    if (oldStatus === status) {
      await session.abortTransaction();
      session.endSession();
      return handleResponse(res, 200, "Rating status is already as requested.", rating);
    }

    // Update rating status
    rating.status = status;
    await rating.save({ session });

    // Update Delivery Partner statistics based on visibility change
    const rider = await Delivery.findById(rating.deliveryPartnerId).session(session);
    if (rider) {
      const stars = rating.stars;
      if (!rider.ratingDistribution) {
        rider.ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      }

      // If moving from visible to hidden/deleted -> remove from stats
      if (oldStatus === "visible" && (status === "hidden" || status === "deleted")) {
        rider.totalRatings = Math.max(0, rider.totalRatings - 1);
        rider.totalStars = Math.max(0, rider.totalStars - stars);
        rider.ratingDistribution[stars] = Math.max(0, (rider.ratingDistribution[stars] || 0) - 1);
      }
      // If moving from hidden/deleted to visible -> add back to stats
      else if (oldStatus !== "visible" && status === "visible") {
        rider.totalRatings += 1;
        rider.totalStars += stars;
        rider.ratingDistribution[stars] = (rider.ratingDistribution[stars] || 0) + 1;
      }

      // Recalculate average
      rider.averageRating = rider.totalRatings > 0 
        ? Math.round((rider.totalStars / rider.totalRatings) * 100) / 100 
        : 0;

      rider.markModified("ratingDistribution");
      await rider.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return handleResponse(res, 200, `Rating moderated to ${status} successfully.`, rating);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return handleResponse(res, 500, error.message);
  }
};
