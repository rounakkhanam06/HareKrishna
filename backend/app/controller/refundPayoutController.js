import handleResponse from "../utils/helper.js";
import {
  submitRefundPayoutDetails,
  updateRefundPayoutDetails,
  getRefundPayoutForCustomer,
  listRefundPayoutsForAdmin,
  getRefundPayoutForAdmin,
  updateRefundStatus,
} from "../services/finance/refundPayoutService.js";

/**
 * Customer: Submit refund payout details for an order
 */
export const submitRefundDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerId = req.user?.id;
    if (!customerId) {
      return handleResponse(res, 401, "Unauthorized");
    }

    const idempotencyKey = String(req.headers["idempotency-key"] || "").trim() || undefined;
    const payload = {
      ...req.body,
      idempotencyKey,
    };

    const record = await submitRefundPayoutDetails(orderId, customerId, payload);
    return handleResponse(res, 201, "Refund payout details submitted successfully", record);
  } catch (error) {
    if (error.duplicate) {
      return handleResponse(res, 409, error.message, {
        duplicate: true,
        existing: error.existing,
      });
    }
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * Customer: Update refund payout details (allowed only in PENDING/FAILED)
 */
export const updateRefundDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerId = req.user?.id;
    if (!customerId) {
      return handleResponse(res, 401, "Unauthorized");
    }

    const record = await updateRefundPayoutDetails(orderId, customerId, req.body);
    return handleResponse(res, 200, "Refund payout details updated successfully", record);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * Customer: Get own refund status and details (masked)
 */
export const getMyRefundStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerId = req.user?.id;
    if (!customerId) {
      return handleResponse(res, 401, "Unauthorized");
    }

    const record = await getRefundPayoutForCustomer(orderId, customerId);
    return handleResponse(res, 200, "Refund status retrieved successfully", record);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * Admin: List refund payout requests with pagination and filters
 */
export const adminListRefunds = async (req, res) => {
  try {
    const { status, method, page, limit, search } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    const data = await listRefundPayoutsForAdmin({
      status,
      method,
      page: pageNum,
      limit: limitNum,
      search,
    });

    return handleResponse(res, 200, "Refund payout requests list retrieved successfully", data);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * Admin: View single refund payout (masked by default)
 */
export const adminGetRefundDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const actorId = req.user?.id;
    if (!actorId) {
      return handleResponse(res, 401, "Unauthorized");
    }

    const record = await getRefundPayoutForAdmin(id, actorId, { decryptData: false });
    return handleResponse(res, 200, "Refund payout request detail retrieved", record);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * Admin: Decrypt and reveal sensitive refund payout details (logged in audit trail)
 */
export const adminDecryptRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const actorId = req.user?.id;
    if (!actorId) {
      return handleResponse(res, 401, "Unauthorized");
    }

    const record = await getRefundPayoutForAdmin(id, actorId, { decryptData: true });
    return handleResponse(res, 200, "Sensitive refund details revealed successfully", record);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * Admin: Update refund payout lifecycle status
 */
export const adminUpdateRefundStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const actorId = req.user?.id;
    if (!actorId) {
      return handleResponse(res, 401, "Unauthorized");
    }

    const { status, remarks, failureReason } = req.body;
    if (!status) {
      return handleResponse(res, 400, "Status is required");
    }

    const record = await updateRefundStatus(id, status, actorId, { remarks, failureReason });
    return handleResponse(res, 200, `Refund status updated to ${status} successfully`, record);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};
