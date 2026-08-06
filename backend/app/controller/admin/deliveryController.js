import Delivery from "../../models/delivery.js";
import Order from "../../models/order.js";
import Transaction from "../../models/transaction.js";
import Notification from "../../models/notification.js";
import handleResponse from "../../utils/helper.js";
import getPagination from "../../utils/pagination.js";
import { emitDeliveryNotification } from "../../modules/notifications/notification.service.js";

export const getDeliveryPartners = async (req, res) => {
  try {
    const { status, verified } = req.query;
    const query = {};

    if (status === "online") {
      query.isOnline = true;
    } else if (status === "offline") {
      query.isOnline = false;
    }

    if (verified === "true") {
      query.isVerified = true;
    } else if (verified === "false") {
      query.isVerified = false;
    }

    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 25,
      maxLimit: 200,
    });

    const [deliveryPartners, total] = await Promise.all([
      Delivery.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Delivery.countDocuments(query),
    ]);

    // Enrich each partner with todayEarnings and totalDeliveries
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const partnerIds = deliveryPartners.map((dp) => dp._id);

    const [earningsAgg, deliveryCounts] = await Promise.all([
      // Today's earnings per partner
      Transaction.aggregate([
        {
          $match: {
            user: { $in: partnerIds },
            userModel: "Delivery",
            status: "Settled",
            type: { $in: ["Delivery Earning", "Incentive", "Bonus"] },
            createdAt: { $gte: startOfToday },
          },
        },
        {
          $group: {
            _id: "$user",
            todayEarnings: { $sum: "$amount" },
          },
        },
      ]),
      // Total delivered orders per partner
      Order.aggregate([
        {
          $match: {
            deliveryBoy: { $in: partnerIds },
            status: "delivered",
          },
        },
        {
          $group: {
            _id: "$deliveryBoy",
            totalDeliveries: { $sum: 1 },
          },
        },
      ]),
    ]);

    const earningsMap = new Map(
      earningsAgg.map((e) => [String(e._id), e.todayEarnings]),
    );
    const deliveryMap = new Map(
      deliveryCounts.map((d) => [String(d._id), d.totalDeliveries]),
    );

    const enrichedPartners = deliveryPartners.map((dp) => ({
      ...dp,
      todayEarnings: earningsMap.get(String(dp._id)) || 0,
      totalDeliveries: deliveryMap.get(String(dp._id)) || 0,
    }));

    return handleResponse(res, 200, "Delivery partners fetched successfully", {
      items: enrichedPartners,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const approveDeliveryPartner = async (req, res) => {
  try {
    const { id } = req.params;
    const rider = await Delivery.findByIdAndUpdate(
      id,
      { isVerified: true },
      { new: true },
    );

    if (!rider) {
      return handleResponse(res, 404, "Rider not found");
    }

    try {
      emitDeliveryNotification("DELIVERY_PROFILE_APPROVED", {
        deliveryId: rider._id,
      });
    } catch (notifErr) {
      console.error("Failed to send approval notification:", notifErr);
    }

    return handleResponse(res, 200, "Rider approved successfully", rider);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const rejectDeliveryPartner = async (req, res) => {
  try {
    const { id } = req.params;
    const rider = await Delivery.findById(id);

    if (!rider) {
      return handleResponse(res, 404, "Rider not found");
    }

    try {
      emitDeliveryNotification("DELIVERY_PROFILE_REJECTED", {
        deliveryId: rider._id,
      });
    } catch (notifErr) {
      console.error("Failed to notify delivery partner of rejection:", notifErr);
    }

    await Delivery.findByIdAndDelete(id);

    return handleResponse(
      res,
      200,
      "Rider application rejected and removed",
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getActiveFleet = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 25,
      maxLimit: 200,
    });

    const query = {
      deliveryBoy: { $ne: null },
      status: {
        $in: ["confirmed", "packed", "shipped", "out_for_delivery"],
      },
    };

    const [activeOrders, total] = await Promise.all([
      Order.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("deliveryBoy", "name phone documents vehicleType")
        .populate("seller", "shopName address name")
        .populate("customer", "name phone")
        .lean(),
      Order.countDocuments(query),
    ]);

    const fleetData = activeOrders.map((order) => ({
      id: order.orderId,
      status:
        order.status === "out_for_delivery"
          ? "On the Way"
          : order.status === "packed"
            ? "At Pickup"
            : order.status === "shipped"
              ? "In Transit"
              : "Assigned",
      deliveryBoy: {
        name: order.deliveryBoy?.name || "Unknown",
        phone: order.deliveryBoy?.phone || "N/A",
        id: order.deliveryBoy?._id || "N/A",
        vehicle: order.deliveryBoy?.vehicleType || "N/A",
        image:
          order.deliveryBoy?.documents?.profileImage ||
          "https://via.placeholder.com/200",
      },
      seller: {
        name: order.seller?.shopName || order.seller?.name || "Unknown",
      },
      customer: {
        name: order.customer?.name || "Guest",
        phone: order.customer?.phone || "N/A",
      },
      lastUpdate: order.updatedAt,
    }));

    return handleResponse(res, 200, "Active fleet fetched successfully", {
      items: fleetData,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
