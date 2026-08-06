import handleResponse from "../../utils/helper.js";
import getPagination from "../../utils/pagination.js";
import Delivery from "../../models/delivery.js";
import { emitNotificationEvent } from "../../modules/notifications/notification.emitter.js";
import { emitToDelivery } from "../../services/orderSocketEmitter.js";
import {
  getCashSettlementHistoryData,
  getDeliveryCashBalancesData,
  getRiderCashDetailsData,
  settleRiderCashEntry,
} from "../../services/admin/cashService.js";

export const getDeliveryCashBalances = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 25,
      maxLimit: 200,
    });

    const data = await getDeliveryCashBalancesData({ page, limit, skip });
    return handleResponse(res, 200, "Cash balances fetched", data);
  } catch (error) {
    console.error("Aggregation Error:", error);
    return handleResponse(res, 500, error.message);
  }
};

export const settleRiderCash = async (req, res) => {
  try {
    const { riderId, amount, method } = req.body;
    const settlement = await settleRiderCashEntry({ riderId, amount, method });

    if (!settlement) {
      return handleResponse(res, 404, "Rider not found");
    }

    return handleResponse(res, 201, "Cash settled successfully", settlement);
  } catch (error) {
    const isValidationError =
      error.message === "Missing riderId or invalid amount" ||
      error.message.includes("cannot exceed");
    const statusCode = isValidationError ? 400 : 500;
    return handleResponse(res, statusCode, error.message);
  }
};

export const getRiderCashDetails = async (req, res) => {
  try {
    const { id: riderId } = req.params;
    const formatted = await getRiderCashDetailsData(riderId);
    return handleResponse(res, 200, "Rider cash details fetched", formatted);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getCashSettlementHistory = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 25,
      maxLimit: 200,
    });

    const data = await getCashSettlementHistoryData({ page, limit, skip });
    return handleResponse(res, 200, "Settlement history fetched", data);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const remindRiderCash = async (req, res) => {
  try {
    const { id: riderId } = req.params;
    const rider = await Delivery.findById(riderId);
    if (!rider) {
      return handleResponse(res, 404, "Rider not found");
    }

    const currentCash = rider.currentCash || 0;
    const limit = rider.limit || 5000;

    emitNotificationEvent("CASH_SETTLEMENT_REMINDER", {
      deliveryPartnerId: riderId,
      currentCash,
      limit,
    });

    emitToDelivery(riderId, {
      event: "notification:new",
      payload: {
        title: "Cash Settlement Reminder 🔔",
        body: `Please settle your collected cash of ₹${currentCash}. Your limit is ₹${limit}.`,
        data: { type: "CASH_SETTLEMENT_REMINDER" },
      },
    });

    return handleResponse(res, 200, "Reminder notification sent successfully");
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
