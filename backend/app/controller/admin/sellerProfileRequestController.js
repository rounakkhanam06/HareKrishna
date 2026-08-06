import SellerProfileUpdateRequest from "../../models/sellerProfileUpdateRequest.js";
import Seller from "../../models/seller.js";
import { handleResponse } from "../../utils/helper.js";
import getPagination from "../../utils/pagination.js";
import { invalidateSellerName } from "../../services/entityNameCache.js";
import { emitSellerNotification } from "../../modules/notifications/notification.service.js";
import Joi from "joi";

// Validation schema for creating a profile update request
const createRequestSchema = Joi.object({
  requestedData: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    shopName: Joi.string().trim().min(2).max(200).optional(),
    phone: Joi.string().trim().pattern(/^\d{10}$/).optional().messages({
      "string.pattern.base": "Phone number must be exactly 10 digits"
    }),
    email: Joi.string().trim().email().lowercase().optional(),
    registrationNumber: Joi.string().trim().min(3).max(50).optional().allow(""),
    address: Joi.string().trim().max(500).optional().allow(""),
    locality: Joi.string().trim().max(100).optional().allow(""),
    pincode: Joi.string().trim().max(20).optional().allow(""),
    city: Joi.string().trim().max(100).optional().allow(""),
    state: Joi.string().trim().max(100).optional().allow(""),
    serviceRadius: Joi.number().min(1).max(100).optional(),
    lat: Joi.number().min(-90).max(90).optional().allow(null),
    lng: Joi.number().min(-180).max(180).optional().allow(null),
  }).required(),
  reason: Joi.string().trim().min(5).max(1000).required().messages({
    "string.min": "Reason must be at least 5 characters long",
    "any.required": "Reason is required to request changes"
  }),
});

// Validation schema for admin decision
const decideRequestSchema = Joi.object({
  status: Joi.string().valid("approved", "rejected").required(),
  adminFeedback: Joi.string().trim().max(1000).optional().allow(""),
});

/* ===============================
   CREATE PROFILE UPDATE REQUEST (Seller)
   ================================ */
export const createProfileUpdateRequest = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // Validate request body
    const { error, value } = createRequestSchema.validate(req.body);
    if (error) {
      return handleResponse(res, 400, error.details[0].message);
    }

    // Check if seller has a pending request
    const pendingRequest = await SellerProfileUpdateRequest.findOne({
      seller: sellerId,
      status: "pending",
    });

    if (pendingRequest) {
      return handleResponse(
        res,
        400,
        "You already have a pending profile update request. Please wait for admin review."
      );
    }

    const { requestedData, reason } = value;

    // Structure location object if lat and lng are provided
    if (requestedData.lat !== undefined && requestedData.lng !== undefined) {
      if (requestedData.lat !== null && requestedData.lng !== null) {
        requestedData.location = {
          type: "Point",
          coordinates: [Number(requestedData.lng), Number(requestedData.lat)],
        };
      }
      delete requestedData.lat;
      delete requestedData.lng;
    }

    // Create the update request record
    const requestRecord = await SellerProfileUpdateRequest.create({
      seller: sellerId,
      requestedData,
      reason,
      status: "pending",
    });

    return handleResponse(
      res,
      201,
      "Profile update request submitted successfully for admin review.",
      requestRecord
    );
  } catch (err) {
    return handleResponse(res, 500, err.message);
  }
};

/* ===============================
   GET PENDING REQUEST (Seller)
   ================================ */
export const getPendingRequest = async (req, res) => {
  try {
    const sellerId = req.user.id;

    const pendingRequest = await SellerProfileUpdateRequest.findOne({
      seller: sellerId,
      status: "pending",
    }).lean();

    return handleResponse(
      res,
      200,
      "Pending request status fetched successfully",
      pendingRequest || null
    );
  } catch (err) {
    return handleResponse(res, 500, err.message);
  }
};

/* ===============================
   LIST PROFILE UPDATE REQUESTS (Admin)
   ================================ */
export const listProfileUpdateRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 10,
      maxLimit: 100,
    });

    const [requests, total] = await Promise.all([
      SellerProfileUpdateRequest.find(query)
        .populate("seller", "name shopName email phone")
        .populate("reviewedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SellerProfileUpdateRequest.countDocuments(query),
    ]);

    return handleResponse(res, 200, "Seller profile update requests fetched successfully", {
      items: requests,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    return handleResponse(res, 500, err.message);
  }
};

/* ===============================
   DECIDE PROFILE UPDATE REQUEST (Admin)
   ================================ */
export const decideProfileUpdateRequest = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;

    const { error, value } = decideRequestSchema.validate(req.body);
    if (error) {
      return handleResponse(res, 400, error.details[0].message);
    }

    const { status, adminFeedback } = value;

    const requestRecord = await SellerProfileUpdateRequest.findById(id);
    if (!requestRecord) {
      return handleResponse(res, 404, "Profile update request not found");
    }

    if (requestRecord.status !== "pending") {
      return handleResponse(
        res,
        400,
        `This request has already been ${requestRecord.status}`
      );
    }

    requestRecord.status = status;
    requestRecord.adminFeedback = adminFeedback || "";
    requestRecord.reviewedBy = adminId;
    requestRecord.reviewedAt = new Date();

    if (status === "approved") {
      // Find the seller
      const seller = await Seller.findById(requestRecord.seller);
      if (!seller) {
        return handleResponse(res, 404, "Seller associated with this request not found");
      }

      // Apply requested updates
      const fieldsToUpdate = requestRecord.requestedData;

      if (fieldsToUpdate.name) seller.name = fieldsToUpdate.name;
      if (fieldsToUpdate.shopName) seller.shopName = fieldsToUpdate.shopName;
      if (fieldsToUpdate.phone) seller.phone = fieldsToUpdate.phone;
      if (fieldsToUpdate.email) seller.email = fieldsToUpdate.email;
      if (fieldsToUpdate.registrationNumber !== undefined) {
        seller.registrationNumber = fieldsToUpdate.registrationNumber;
      }
      if (fieldsToUpdate.address !== undefined) seller.address = fieldsToUpdate.address;
      if (fieldsToUpdate.locality !== undefined) seller.locality = fieldsToUpdate.locality;
      if (fieldsToUpdate.pincode !== undefined) seller.pincode = fieldsToUpdate.pincode;
      if (fieldsToUpdate.city !== undefined) seller.city = fieldsToUpdate.city;
      if (fieldsToUpdate.state !== undefined) seller.state = fieldsToUpdate.state;
      if (fieldsToUpdate.serviceRadius !== undefined) {
        seller.serviceRadius = fieldsToUpdate.serviceRadius;
      }
      if (fieldsToUpdate.location !== undefined) {
        seller.location = fieldsToUpdate.location;
      }

      await seller.save();

      // Invalidate cache if shopName changed
      if (fieldsToUpdate.shopName) {
        invalidateSellerName(String(seller._id)).catch((err) => {
          console.warn("[Seller] Name cache invalidation failed:", err.message);
        });
      }

      // Emit Live Notification
      emitSellerNotification("SELLER_PROFILE_APPROVED", {
        sellerId: String(seller._id),
      });
    } else {
      // If rejected, emit Live Notification with rejection reason
      emitSellerNotification("SELLER_PROFILE_REJECTED", {
        sellerId: String(requestRecord.seller),
        feedback: adminFeedback || "Details changed do not meet platform criteria.",
      });
    }

    await requestRecord.save();

    return handleResponse(
      res,
      200,
      `Profile update request successfully ${status}.`,
      requestRecord
    );
  } catch (err) {
    if (err.code === 11000) {
      return handleResponse(res, 400, "Email or phone number already in use by another seller");
    }
    return handleResponse(res, 500, err.message);
  }
};
