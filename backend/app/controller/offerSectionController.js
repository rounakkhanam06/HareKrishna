import OfferSection from "../models/offerSection.js";
import handleResponse from "../utils/helper.js";
import {
  parseCustomerCoordinates,
  getNearbySellerIdsForCustomer,
} from "../services/customerVisibilityService.js";
import { buildKey, getOrSet, getTTL } from "../services/cacheService.js";
import { getApprovedOrLegacyFilter } from "../services/productModerationService.js";

export const getPublicOfferSections = async (req, res) => {
  try {
    const coords = parseCustomerCoordinates(req.query || {});
    if (!coords.valid) {
      return handleResponse(
        res,
        400,
        "lat and lng are required for customer offer visibility",
      );
    }

    // Round coordinates to 3 decimals for cache bucket
    const cacheKey = buildKey(
      "offersections",
      "public",
      `${coords.lat.toFixed(3)}:${coords.lng.toFixed(3)}`,
    );

    const filteredSections = await getOrSet(
      cacheKey,
      async () => {
        const nearbySellerIds = await getNearbySellerIdsForCustomer(
          coords.lat,
          coords.lng,
        );
        const nearbySellerSet = new Set(nearbySellerIds.map(String));

        const sections = await OfferSection.find({ status: "active" })
          .sort({ order: 1, createdAt: 1 })
          .populate("categoryIds", "name slug image")
          .populate("categoryId", "name slug image")
          .populate("sellerIds", "shopName name logo")
          .populate({
            path: "productIds",
            select: "name slug price salePrice mainImage stock unit sellerId status approvalStatus",
            match: {
              status: "active",
              ...getApprovedOrLegacyFilter(),
            },
          })
          .lean();

        const Product = (await import("../models/product.js")).default;
        const enrichedSections = [];

        for (const section of sections) {
          const sellerIds = Array.isArray(section.sellerIds)
            ? section.sellerIds.filter((seller) => {
                const sid = String(seller?._id || seller || "");
                return sid && nearbySellerSet.has(sid);
              })
            : [];

          let productIds = Array.isArray(section.productIds)
            ? section.productIds.filter(Boolean)
            : [];

          // If no products are explicitly curated, fetch dynamically from the linked categories
          if (productIds.length === 0) {
            const categoryFilter = [];
            if (Array.isArray(section.categoryIds)) {
              categoryFilter.push(...section.categoryIds.map(c => c._id || c));
            }
            if (section.categoryId) {
              categoryFilter.push(section.categoryId._id || section.categoryId);
            }

            if (categoryFilter.length > 0) {
              // Try to find products from nearby sellers first
              let dynamicProducts = await Product.find({
                categoryId: { $in: categoryFilter },
                sellerId: { $in: nearbySellerIds },
                status: "active",
                ...getApprovedOrLegacyFilter(),
              })
              .select("name slug price salePrice mainImage stock unit sellerId status approvalStatus")
              .limit(10)
              .lean();

              // Fallback to any seller if nearby results are empty (ensures products are visible)
              if (dynamicProducts.length === 0) {
                dynamicProducts = await Product.find({
                  categoryId: { $in: categoryFilter },
                  status: "active",
                  ...getApprovedOrLegacyFilter(),
                })
                .select("name slug price salePrice mainImage stock unit sellerId status approvalStatus")
                .limit(10)
                .lean();
              }

              productIds = dynamicProducts;
            }
          }

          enrichedSections.push({
            ...section,
            sellerIds,
            productIds,
          });
        }

        return enrichedSections;
      },
      getTTL("homepage"),
    );

    return handleResponse(res, 200, "Offer sections fetched", filteredSections);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getAdminOfferSections = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && ["active", "inactive"].includes(status)) query.status = status;

    const sections = await OfferSection.find(query)
      .sort({ order: 1, createdAt: 1 })
      .populate("categoryIds", "name")
      .populate("categoryId", "name")
      .populate("sellerIds", "shopName name")
      .lean();

    return handleResponse(res, 200, "Offer sections fetched", sections);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const createOfferSection = async (req, res) => {
  try {
    const {
      title,
      backgroundColor,
      sideImageKey,
      categoryIds = [],
      sellerIds = [],
      productIds = [],
      order,
      status,
    } = req.body;

    if (!title || !title.trim()) {
      return handleResponse(res, 400, "Title is required");
    }
    const catIds = Array.isArray(categoryIds) ? categoryIds.filter(Boolean) : [];
    if (!catIds.length) {
      return handleResponse(res, 400, "At least one category is required");
    }

    const count = await OfferSection.countDocuments({});
    const section = await OfferSection.create({
      title: title.trim(),
      backgroundColor: backgroundColor || "#FCD34D",
      sideImageKey: sideImageKey || "hair-care",
      categoryIds: catIds,
      sellerIds: Array.isArray(sellerIds) ? sellerIds.filter(Boolean) : [],
      productIds: Array.isArray(productIds) ? productIds : [],
      order: typeof order === "number" ? order : count,
      status: status || "active",
    });

    return handleResponse(res, 201, "Offer section created", section);
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};

export const updateOfferSection = async (req, res) => {
  try {
    const { id } = req.params;
    const section = await OfferSection.findById(id);
    if (!section) return handleResponse(res, 404, "Offer section not found");

    const payload = req.body || {};
    if (payload.title !== undefined) section.title = payload.title.trim();
    if (payload.backgroundColor !== undefined)
      section.backgroundColor = payload.backgroundColor;
    if (payload.sideImageKey !== undefined)
      section.sideImageKey = payload.sideImageKey;
    if (Array.isArray(payload.categoryIds))
      section.categoryIds = payload.categoryIds.filter(Boolean);
    if (Array.isArray(payload.sellerIds))
      section.sellerIds = payload.sellerIds.filter(Boolean);
    if (Array.isArray(payload.productIds)) section.productIds = payload.productIds;
    if (payload.order !== undefined) section.order = payload.order;
    if (payload.status !== undefined) section.status = payload.status;

    await section.save();
    return handleResponse(res, 200, "Offer section updated", section);
  } catch (error) {
    return handleResponse(res, 400, error.message);
  }
};

export const deleteOfferSection = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await OfferSection.findByIdAndDelete(id);
    if (!deleted) return handleResponse(res, 404, "Offer section not found");
    return handleResponse(res, 200, "Offer section deleted");
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const reorderOfferSections = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return handleResponse(res, 200, "No sections to reorder");
    }
    const bulkOps = items
      .filter((it) => it && it.id)
      .map((it) => ({
        updateOne: {
          filter: { _id: it.id },
          update: { $set: { order: it.order } },
        },
      }));
    if (bulkOps.length) await OfferSection.bulkWrite(bulkOps);
    return handleResponse(res, 200, "Sections reordered");
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
