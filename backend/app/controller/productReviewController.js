import mongoose from "mongoose";
import ProductReview from "../models/productReview.js";
import Product from "../models/product.js";
import { productRatingService, ALLOWED_POSITIVE_TAGS, ALLOWED_NEGATIVE_TAGS } from "../services/productRating.service.js";
import handleResponse from "../utils/helper.js";
import getPagination from "../utils/pagination.js";

// 1. Create a review (Customer)
export const createProductReview = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { orderId, orderItemId, productId, stars, review, tags, images } = req.body;

    const result = await productRatingService.createReview(customerId, {
      orderId,
      orderItemId,
      productId,
      stars: Number(stars),
      review,
      tags,
      images,
    });

    return handleResponse(res, 201, "Review submitted successfully", result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 400, error.message);
  }
};

// 2. Edit a review (Customer)
export const updateProductReview = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { id } = req.params;
    const { stars, review, tags, images } = req.body;

    const result = await productRatingService.updateReview(customerId, id, {
      stars: Number(stars),
      review,
      tags,
      images,
    });

    return handleResponse(res, 200, "Review updated successfully", result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 400, error.message);
  }
};

// 3. Get reviews for a specific order (Customer)
export const getOrderProductReviews = async (req, res) => {
  try {
    const { orderId: lookupId } = req.params;
    const customerId = req.user.id;

    let orderQuery = {};
    if (mongoose.Types.ObjectId.isValid(lookupId)) {
      orderQuery = { _id: lookupId };
    } else {
      orderQuery = { orderId: lookupId };
    }

    const orderDoc = await mongoose.model("Order").findOne(orderQuery).select("_id").lean();
    if (!orderDoc) {
      return handleResponse(res, 404, "Order not found");
    }

    const reviews = await ProductReview.find({
      orderId: orderDoc._id,
      customerId,
      status: { $ne: "deleted" },
    }).lean();

    return handleResponse(res, 200, "Order reviews fetched successfully", reviews);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

// 4. Get visible reviews for a product (Public)
export const getProductReviewsPublic = async (req, res) => {
  try {
    const { productId } = req.params;
    const { stars, sortBy } = req.query;
    const { page, limit, skip } = getPagination(req, { defaultLimit: 10, maxLimit: 50 });

    const userId = req.user?.id;
    const query = {
      productId: new mongoose.Types.ObjectId(productId),
      ...(userId
        ? {
            $or: [
              { status: "visible" },
              { customerId: new mongoose.Types.ObjectId(userId) },
            ],
          }
        : { status: "visible" }),
    };

    if (stars) {
      query.stars = Number(stars);
    }

    let sort = { createdAt: -1 }; // Default: Latest
    if (sortBy === "highest") {
      sort = { stars: -1, createdAt: -1 };
    } else if (sortBy === "lowest") {
      sort = { stars: 1, createdAt: -1 };
    } else if (sortBy === "helpful") {
      sort = { helpfulCount: -1, createdAt: -1 };
    }

    const [reviews, total] = await Promise.all([
      ProductReview.find(query)
        .populate("customerId", "name image")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductReview.countDocuments(query),
    ]);

    const formatted = reviews.map((r) => {
      const name = r.customerId?.name || "Customer";
      return {
        ...r,
        customerName: name,
        customerImage: r.customerId?.image || null,
        customerId: undefined, // Strip ID
      };
    });

    return handleResponse(res, 200, "Product reviews fetched successfully", {
      items: formatted,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

// 5. Get review summary for a product (Public)
export const getProductReviewSummaryPublic = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId)
      .select("averageRating totalRatings ratingDistribution totalReviews reviewImagesCount")
      .lean();

    if (!product) {
      return handleResponse(res, 404, "Product not found");
    }

    // Aggregate most used tags
    const tagAggregation = await ProductReview.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId), status: "visible" } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]);

    const mostUsedTags = tagAggregation.map((t) => ({ tag: t._id, count: t.count }));

    return handleResponse(res, 200, "Review summary fetched successfully", {
      ratingSummary: {
        averageRating: product.averageRating || 0,
        totalRatings: product.totalRatings || 0,
        ratingDistribution: product.ratingDistribution || { star1: 0, star2: 0, star3: 0, star4: 0, star5: 0 },
        totalReviews: product.totalReviews || 0,
        reviewImagesCount: product.reviewImagesCount || 0,
      },
      mostUsedTags,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

// 6. Get seller product reviews (Seller)
export const getSellerProductReviews = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { id: productId } = req.params; // Product ID
    const { stars, startDate, endDate } = req.query;
    const { page, limit, skip } = getPagination(req, { defaultLimit: 15, maxLimit: 50 });

    const query = {
      productId: new mongoose.Types.ObjectId(productId),
      sellerId: new mongoose.Types.ObjectId(sellerId),
      status: { $ne: "deleted" },
    };

    if (stars) {
      query.stars = Number(stars);
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [reviews, total] = await Promise.all([
      ProductReview.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductReview.countDocuments(query),
    ]);

    // Format for seller dashboard (hide sensitive customer fields)
    const formatted = reviews.map((r) => ({
      id: r._id,
      stars: r.stars,
      review: r.review,
      tags: r.tags,
      images: r.images,
      helpfulCount: r.helpfulCount,
      isVerifiedPurchase: r.isVerifiedPurchase,
      status: r.status,
      createdAt: r.createdAt,
      customerName: "Verified Customer",
    }));

    return handleResponse(res, 200, "Seller product reviews fetched successfully", {
      items: formatted,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

// 7. Get seller review analytics (Seller)
export const getSellerProductReviewAnalytics = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { id: productId } = req.params;

    const product = await Product.findOne({ _id: productId, sellerId })
      .select("averageRating totalRatings ratingDistribution totalReviews")
      .lean();

    if (!product) {
      return handleResponse(res, 404, "Product not found or unauthorized");
    }

    // Get tags statistics
    const tagStats = await ProductReview.aggregate([
      {
        $match: {
          productId: new mongoose.Types.ObjectId(productId),
          sellerId: new mongoose.Types.ObjectId(sellerId),
          status: "visible"
        }
      },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } }
    ]);

    const positiveTags = [];
    const negativeTags = [];
    for (const t of tagStats) {
      if (ALLOWED_POSITIVE_TAGS.has(t._id)) {
        positiveTags.push({ tag: t._id, count: t.count });
      } else if (ALLOWED_NEGATIVE_TAGS.has(t._id)) {
        negativeTags.push({ tag: t._id, count: t.count });
      }
    }

    // Monthly rating trend (past 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const trend = await ProductReview.aggregate([
      {
        $match: {
          productId: new mongoose.Types.ObjectId(productId),
          sellerId: new mongoose.Types.ObjectId(sellerId),
          status: "visible",
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          averageRating: { $avg: "$stars" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const formattedTrend = trend.map((t) => ({
      period: `${t._id.year}-${String(t._id.month).padStart(2, "0")}`,
      averageRating: Number(t.averageRating.toFixed(2)),
      count: t.count
    }));

    return handleResponse(res, 200, "Seller review analytics fetched successfully", {
      ratingSummary: {
        averageRating: product.averageRating || 0,
        totalRatings: product.totalRatings || 0,
        ratingDistribution: product.ratingDistribution || { star1: 0, star2: 0, star3: 0, star4: 0, star5: 0 },
        totalReviews: product.totalReviews || 0,
      },
      positiveTags,
      negativeTags,
      monthlyRatingTrend: formattedTrend,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

// 8. Get all reviews for moderation (Admin)
export const getAdminProductReviews = async (req, res) => {
  try {
    const { sellerId, customerId, productId, stars, status, search } = req.query;
    const { page, limit, skip } = getPagination(req, { defaultLimit: 25, maxLimit: 100 });

    const query = {};
    if (sellerId) query.sellerId = new mongoose.Types.ObjectId(sellerId);
    if (customerId) query.customerId = new mongoose.Types.ObjectId(customerId);
    if (productId) query.productId = new mongoose.Types.ObjectId(productId);
    if (stars) query.stars = Number(stars);
    if (status) query.status = status;

    if (search) {
      query.review = { $regex: search, $options: "i" };
    }

    const [reviews, total] = await Promise.all([
      ProductReview.find(query)
        .populate("productId", "name mainImage")
        .populate("customerId", "name email phone")
        .populate("sellerId", "shopName name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductReview.countDocuments(query),
    ]);

    return handleResponse(res, 200, "Admin product reviews fetched successfully", {
      items: reviews,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

// 9. Get specific review details (Admin)
export const getAdminProductReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await ProductReview.findById(id)
      .populate("productId", "name mainImage averageRating totalRatings")
      .populate("customerId", "name email phone")
      .populate("sellerId", "shopName name")
      .lean();

    if (!review) {
      return handleResponse(res, 404, "Review not found");
    }

    return handleResponse(res, 200, "Admin review details fetched successfully", review);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

// 10. Update moderation status (Admin)
export const updateAdminProductReviewStatus = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { action, reason } = req.body; // hide, unhide, delete, restore

    const result = await productRatingService.moderateReview(adminId, id, { action, reason });

    return handleResponse(res, 200, `Review status updated successfully via action: ${action}`, result);
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};

// 11. Get review system analytics (Admin)
export const getAdminProductReviewsAnalytics = async (req, res) => {
  try {
    // 1. Highest rated products
    const highestRated = await Product.find({ totalRatings: { $gt: 2 } })
      .sort({ averageRating: -1 })
      .limit(5)
      .select("name mainImage averageRating totalRatings")
      .lean();

    // 2. Lowest rated products
    const lowestRated = await Product.find({ totalRatings: { $gt: 2 } })
      .sort({ averageRating: 1 })
      .limit(5)
      .select("name mainImage averageRating totalRatings")
      .lean();

    // 3. Most reviewed products
    const mostReviewed = await Product.find({})
      .sort({ totalReviews: -1 })
      .limit(5)
      .select("name mainImage totalReviews averageRating")
      .lean();

    // 4. Positive vs Negative tag trends
    const tagStats = await ProductReview.aggregate([
      { $match: { status: "visible" } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } }
    ]);

    const positiveTags = [];
    const negativeTags = [];
    for (const t of tagStats) {
      if (ALLOWED_POSITIVE_TAGS.has(t._id)) {
        positiveTags.push({ tag: t._id, count: t.count });
      } else if (ALLOWED_NEGATIVE_TAGS.has(t._id)) {
        negativeTags.push({ tag: t._id, count: t.count });
      }
    }

    // 5. Daily review trend (past 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trend = await ProductReview.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
          avgStars: { $avg: "$stars" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const reviewTrend = trend.map((t) => ({
      date: t._id,
      count: t.count,
      avgStars: Number(t.avgStars.toFixed(2))
    }));

    return handleResponse(res, 200, "Admin review analytics fetched successfully", {
      highestRated,
      lowestRated,
      mostReviewed,
      positiveTags,
      negativeTags,
      dailyReviewTrend: reviewTrend,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
