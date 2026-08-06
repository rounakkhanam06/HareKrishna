import mongoose from "mongoose";
import ProductReview from "../models/productReview.js";
import Product from "../models/product.js";
import Order from "../models/order.js";
import cloudinary from "../utils/cloudinary.js";
import { emitNotificationEvent } from "../modules/notifications/notification.emitter.js";
import { NOTIFICATION_EVENTS } from "../modules/notifications/notification.constants.js";
import { getIo } from "../services/orderSocketEmitter.js";

// Predefined allowed tags
export const ALLOWED_POSITIVE_TAGS = new Set([
  "Fresh",
  "Good Packaging",
  "Value for Money",
  "Premium Quality",
  "Good Taste",
  "Exactly as Expected"
]);

export const ALLOWED_NEGATIVE_TAGS = new Set([
  "Damaged",
  "Expired",
  "Wrong Item",
  "Poor Packaging",
  "Bad Quality",
  "Not Fresh"
]);

export const ALLOWED_TAGS = new Set([
  ...ALLOWED_POSITIVE_TAGS,
  ...ALLOWED_NEGATIVE_TAGS
]);

// Helper to extract Cloudinary public ID from URL
function getPublicIdFromUrl(url) {
  if (!url) return null;
  const parts = url.split("/upload/");
  if (parts.length < 2) return null;
  const afterUpload = parts[1];
  const pathParts = afterUpload.split("/");
  if (pathParts[0].match(/^v\d+$/)) {
    pathParts.shift();
  }
  const pathWithExtension = pathParts.join("/");
  const lastDot = pathWithExtension.lastIndexOf(".");
  if (lastDot === -1) return pathWithExtension;
  return pathWithExtension.substring(0, lastDot);
}

// Helper to delete an image from Cloudinary
async function deleteFromCloudinary(url) {
  try {
    const publicId = getPublicIdFromUrl(url);
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Failed to delete image from Cloudinary:", error);
  }
}

// Validator function
export function validateReview({ stars, review, tags, images }) {
  if (typeof stars !== "number" || stars < 1 || stars > 5) {
    throw new Error("Rating stars must be a number between 1 and 5.");
  }
  if (typeof review !== "string" || review.trim().length < 5 || review.trim().length > 1000) {
    throw new Error("Review comment must be between 5 and 1000 characters.");
  }
  if (tags && !Array.isArray(tags)) {
    throw new Error("Tags must be an array of strings.");
  }
  if (tags) {
    for (const tag of tags) {
      if (!ALLOWED_TAGS.has(tag)) {
        throw new Error(`Invalid tag: "${tag}". Only predefined tags are accepted.`);
      }
    }
  }
  if (!images || !Array.isArray(images) || images.length < 1) {
    throw new Error("Please upload at least 1 image of the product.");
  }
  if (images.length > 5) {
    throw new Error("Maximum 5 images allowed per review.");
  }
}

// Main Rating & Review Business Service
export const productRatingService = {
  // Submit a new review
  createReview: async (userId, { orderId, orderItemId, productId, stars, review: reviewText, tags, images = [] }) => {
    validateReview({ stars, review: reviewText, tags, images });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the order
      let orderQuery = {};
      if (mongoose.Types.ObjectId.isValid(orderId)) {
        orderQuery = { _id: orderId };
      } else {
        orderQuery = { orderId: orderId };
      }
      orderQuery.customer = userId;
      orderQuery.$or = [{ status: "delivered" }, { workflowStatus: "DELIVERED" }];

      const order = await Order.findOne(orderQuery).session(session);

      if (!order) {
        throw new Error("Delivered order not found or user unauthorized.");
      }

      // Find the specific item in the order
      const itemIndex = order.items.findIndex(
        (item) => String(item._id) === String(orderItemId) && String(item.product) === String(productId)
      );

      if (itemIndex === -1) {
        throw new Error("Product not found in this order.");
      }

      const item = order.items[itemIndex];
      if (item.review?.isRated) {
        throw new Error("You have already rated this item.");
      }

      // Check if a ProductReview with this orderItemId already exists (double safety check)
      const existing = await ProductReview.findOne({ orderItemId }).session(session);
      if (existing) {
        throw new Error("Review already exists for this order item.");
      }

      const editableUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create ProductReview
      const [newReview] = await ProductReview.create(
        [
          {
            productId,
            sellerId: order.seller,
            customerId: userId,
            orderId: order._id,
            orderItemId,
            stars,
            review: reviewText,
            tags: tags || [],
            images,
            isVerifiedPurchase: true,
            status: "visible",
            editableUntil,
          }
        ],
        { session }
      );

      // Update Order item status
      order.items[itemIndex].review = {
        isRated: true,
        reviewId: newReview._id,
        reviewedAt: new Date()
      };
      await order.save({ session });

      // Update Product statistics incrementally
      const product = await Product.findById(productId).session(session);
      if (!product) {
        throw new Error("Product not found.");
      }

      product.totalRatings = (product.totalRatings || 0) + 1;
      product.totalStars = (product.totalStars || 0) + stars;
      product.averageRating = Number((product.totalStars / product.totalRatings).toFixed(2));
      product.totalReviews = (product.totalReviews || 0) + 1;
      product.reviewImagesCount = (product.reviewImagesCount || 0) + images.length;

      // Update distribution
      product.ratingDistribution = product.ratingDistribution || { star1: 0, star2: 0, star3: 0, star4: 0, star5: 0 };
      const starKey = `star${stars}`;
      product.ratingDistribution[starKey] = (product.ratingDistribution[starKey] || 0) + 1;

      await product.save({ session });
      await session.commitTransaction();

      // Fire notification asynchronously after commit
      emitNotificationEvent(NOTIFICATION_EVENTS.PRODUCT_REVIEW_RECEIVED, {
        orderId: order.orderId,
        customerId: userId,
        userId,
        sellerId: order.seller,
      });

      // Broadcast Socket.IO event to Seller and Admin rooms
      try {
        const io = getIo();
        if (io) {
          io.to(`seller:${order.seller}`).emit("product:review:new", {
            productId,
            stars,
            reviewText,
            tags
          });
          io.to("admin").emit("product:review:new", {
            productId,
            stars,
            reviewText,
            tags
          });
        }
      } catch (socketError) {
        console.error("Failed to emit Socket.IO notification for new review:", socketError.message);
      }

      return {
        review: newReview,
        ratingSummary: {
          averageRating: product.averageRating,
          totalRatings: product.totalRatings,
          ratingDistribution: product.ratingDistribution,
          totalReviews: product.totalReviews,
          reviewImagesCount: product.reviewImagesCount
        }
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  // Edit review (within 24h)
  updateReview: async (userId, reviewId, { stars, review: reviewText, tags, images = [] }) => {
    validateReview({ stars, review: reviewText, tags, images });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const reviewDoc = await ProductReview.findOne({
        _id: reviewId,
        customerId: userId,
        status: { $ne: "deleted" }
      }).session(session);

      if (!reviewDoc) {
        throw new Error("Review not found or unauthorized.");
      }

      if (new Date() > reviewDoc.editableUntil) {
        throw new Error("Review can only be edited within 24 hours of submission.");
      }

      const oldStars = reviewDoc.stars;
      const oldImages = reviewDoc.images || [];

      // Determine images removed
      const remainingImagesSet = new Set(images);
      const removedImages = oldImages.filter((img) => !remainingImagesSet.has(img));

      // Destroy removed images in Cloudinary
      for (const imgUrl of removedImages) {
        await deleteFromCloudinary(imgUrl);
      }

      // Update ReviewDoc
      reviewDoc.stars = stars;
      reviewDoc.review = reviewText;
      reviewDoc.tags = tags || [];
      reviewDoc.images = images;
      await reviewDoc.save({ session });

      // Update Product statistics incrementally
      const product = await Product.findById(reviewDoc.productId).session(session);
      if (!product) {
        throw new Error("Product not found.");
      }

      // Update stars and distribution if rating changed, only if review is currently visible
      if (reviewDoc.status === "visible") {
        const starsDiff = stars - oldStars;
        const imagesDiff = images.length - oldImages.length;

        product.totalStars = (product.totalStars || 0) + starsDiff;
        product.averageRating = Number((product.totalStars / product.totalRatings).toFixed(2));
        product.reviewImagesCount = Math.max(0, (product.reviewImagesCount || 0) + imagesDiff);

        product.ratingDistribution = product.ratingDistribution || { star1: 0, star2: 0, star3: 0, star4: 0, star5: 0 };
        const oldStarKey = `star${oldStars}`;
        const newStarKey = `star${stars}`;

        product.ratingDistribution[oldStarKey] = Math.max(0, (product.ratingDistribution[oldStarKey] || 0) - 1);
        product.ratingDistribution[newStarKey] = (product.ratingDistribution[newStarKey] || 0) + 1;

        await product.save({ session });
      }

      await session.commitTransaction();

      return {
        review: reviewDoc,
        ratingSummary: {
          averageRating: product.averageRating,
          totalRatings: product.totalRatings,
          ratingDistribution: product.ratingDistribution,
          totalReviews: product.totalReviews,
          reviewImagesCount: product.reviewImagesCount
        }
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  // Admin Moderation (hide, unhide, soft delete, restore)
  moderateReview: async (adminId, reviewId, { action, reason }) => {
    if (!["hide", "unhide", "delete", "restore"].includes(action)) {
      throw new Error("Invalid moderation action.");
    }
    if (!reason || !reason.trim()) {
      throw new Error("Moderation reason is required.");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const reviewDoc = await ProductReview.findById(reviewId).session(session);
      if (!reviewDoc) {
        throw new Error("Review not found.");
      }

      const product = await Product.findById(reviewDoc.productId).session(session);
      if (!product) {
        throw new Error("Product not found.");
      }

      const wasVisible = reviewDoc.status === "visible";

      if (action === "hide") {
        if (reviewDoc.status === "hidden") {
          await session.commitTransaction();
          return { review: reviewDoc, ratingSummary: product };
        }
        reviewDoc.status = "hidden";

        // Exclude stats if it was visible
        if (wasVisible) {
          product.totalRatings = Math.max(0, (product.totalRatings || 0) - 1);
          product.totalStars = Math.max(0, (product.totalStars || 0) - reviewDoc.stars);
          product.averageRating = product.totalRatings > 0 ? Number((product.totalStars / product.totalRatings).toFixed(2)) : 0;
          product.totalReviews = Math.max(0, (product.totalReviews || 0) - 1);
          product.reviewImagesCount = Math.max(0, (product.reviewImagesCount || 0) - (reviewDoc.images || []).length);

          const starKey = `star${reviewDoc.stars}`;
          if (product.ratingDistribution && product.ratingDistribution[starKey]) {
            product.ratingDistribution[starKey] = Math.max(0, product.ratingDistribution[starKey] - 1);
          }
        }
      } else if (action === "unhide" || action === "restore") {
        if (reviewDoc.status === "visible") {
          await session.commitTransaction();
          return { review: reviewDoc, ratingSummary: product };
        }
        reviewDoc.status = "visible";

        // Include stats
        product.totalRatings = (product.totalRatings || 0) + 1;
        product.totalStars = (product.totalStars || 0) + reviewDoc.stars;
        product.averageRating = Number((product.totalStars / product.totalRatings).toFixed(2));
        product.totalReviews = (product.totalReviews || 0) + 1;
        product.reviewImagesCount = (product.reviewImagesCount || 0) + (reviewDoc.images || []).length;

        product.ratingDistribution = product.ratingDistribution || { star1: 0, star2: 0, star3: 0, star4: 0, star5: 0 };
        const starKey = `star${reviewDoc.stars}`;
        product.ratingDistribution[starKey] = (product.ratingDistribution[starKey] || 0) + 1;

      } else if (action === "delete") {
        if (reviewDoc.status === "deleted") {
          await session.commitTransaction();
          return { review: reviewDoc, ratingSummary: product };
        }
        reviewDoc.status = "deleted";

        // Exclude stats if it was visible
        if (wasVisible) {
          product.totalRatings = Math.max(0, (product.totalRatings || 0) - 1);
          product.totalStars = Math.max(0, (product.totalStars || 0) - reviewDoc.stars);
          product.averageRating = product.totalRatings > 0 ? Number((product.totalStars / product.totalRatings).toFixed(2)) : 0;
          product.totalReviews = Math.max(0, (product.totalReviews || 0) - 1);
          product.reviewImagesCount = Math.max(0, (product.reviewImagesCount || 0) - (reviewDoc.images || []).length);

          const starKey = `star${reviewDoc.stars}`;
          if (product.ratingDistribution && product.ratingDistribution[starKey]) {
            product.ratingDistribution[starKey] = Math.max(0, product.ratingDistribution[starKey] - 1);
          }
        }
      }

      // Record Moderation Audit Log
      reviewDoc.moderation = {
        reason: reason.trim(),
        moderatedBy: adminId,
        moderatedAt: new Date()
      };

      await reviewDoc.save({ session });
      await product.save({ session });
      await session.commitTransaction();

      return {
        review: reviewDoc,
        ratingSummary: {
          averageRating: product.averageRating,
          totalRatings: product.totalRatings,
          ratingDistribution: product.ratingDistribution,
          totalReviews: product.totalReviews,
          reviewImagesCount: product.reviewImagesCount
        }
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
};
