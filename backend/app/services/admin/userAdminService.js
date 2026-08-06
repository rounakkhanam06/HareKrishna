import mongoose from "mongoose";
import User from "../../models/customer.js";
import Order from "../../models/order.js";

export async function getUsersData({ page, limit, skip, customerType }) {
  const matchConditions = [{ role: "user" }, { role: { $exists: false } }, { role: null }];

  let roleAndTypeMatch = { $or: matchConditions };

  if (customerType === "dbt") {
    roleAndTypeMatch = {
      $and: [
        { $or: matchConditions },
        { isSubsidyEligible: true }
      ]
    };
  } else if (customerType === "app") {
    roleAndTypeMatch = {
      $and: [
        { $or: matchConditions },
        {
          $or: [
            { isSubsidyEligible: false },
            { isSubsidyEligible: { $exists: false } },
            { isSubsidyEligible: null }
          ]
        }
      ]
    };
  }

  const pipeline = [
    { $match: roleAndTypeMatch },
    {
      $lookup: {
        from: "orders",
        localField: "_id",
        foreignField: "customer",
        as: "userOrders",
      },
    },
    {
      $project: {
        id: { $toString: "$_id" },
        name: { $ifNull: ["$Farmer Name", "$name", "Unnamed Customer"] },
        "Farmer Name": 1,
        "Mobile No": 1,
        "eAnnadata Card Number": 1,
        "eAnnadata Card Status": 1,
        "eAnnadata Card Image": 1,
        "eAnnadata Card Registration Date": 1,
        "Father/Mother/Husband": 1,
        "Date Of Birth": 1,
        "Pin Code": 1,
        "State Name": 1,
        "District Name": 1,
        "Block Name": 1,
        "Village Name": 1,
        "A/C Holder Name": 1,
        "Bank Name": 1,
        "A/C Number": 1,
        "Ifsc Code": 1,
        "Registration Date": 1,
        isSubsidyEligible: 1,
        email: 1,
        phone: 1,
        joinedDate: "$createdAt",
        status: {
          $ifNull: ["$status", { $cond: [{ $eq: ["$isActive", false] }, "inactive", "active"] }],
        },
        totalOrders: { $size: "$userOrders" },
        totalSpent: { $sum: "$userOrders.pricing.total" },
        lastOrderDate: { $max: "$userOrders.createdAt" },
        avatar: {
          $concat: [
            "https://api.dicebear.com/7.x/avataaars/svg?seed=",
            { $ifNull: ["$Farmer Name", "$name", "Customer"] },
          ],
        },
      },
    },
    { $sort: { totalOrders: -1 } },
  ];

  const [result] = await User.aggregate([
    ...pipeline,
    {
      $facet: {
        totalCount: [{ $count: "count" }],
        items: [{ $skip: skip }, { $limit: limit }],
      },
    },
  ]);

  const total = result?.totalCount?.[0]?.count ?? 0;
  const items = result?.items ?? [];

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getUserByIdData(id) {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(id),
        $or: [{ role: "user" }, { role: { $exists: false } }, { role: null }]
      },
    },
    {
      $lookup: {
        from: "orders",
        localField: "_id",
        foreignField: "customer",
        as: "userOrders",
      },
    },
    {
      $project: {
        id: { $toString: "$_id" },
        name: { $ifNull: ["$Farmer Name", "$name", "Unnamed Customer"] },
        "Farmer Name": 1,
        "Mobile No": 1,
        "eAnnadata Card Number": 1,
        "eAnnadata Card Status": 1,
        "eAnnadata Card Image": 1,
        "eAnnadata Card Registration Date": 1,
        "Father/Mother/Husband": 1,
        "Date Of Birth": 1,
        "Pin Code": 1,
        "State Name": 1,
        "District Name": 1,
        "Block Name": 1,
        "Village Name": 1,
        "A/C Holder Name": 1,
        "Bank Name": 1,
        "A/C Number": 1,
        "Ifsc Code": 1,
        "Registration Date": 1,

        isSubsidyEligible: 1,
        gender: 1,
        email: 1,
        phone: 1,
        created_by: 1,
        joinedDate: "$createdAt",
        status: {
          $ifNull: ["$status", { $cond: [{ $eq: ["$isActive", false] }, "inactive", "active"] }],
        },
        totalOrders: { $size: "$userOrders" },
        totalSpent: { $sum: "$userOrders.pricing.total" },
        lastOrderDate: { $max: "$userOrders.createdAt" },
        avatar: {
          $concat: [
            "https://api.dicebear.com/7.x/avataaars/svg?seed=",
            { $ifNull: ["$Farmer Name", "$name", "Customer"] },
          ],
        },
        addresses: { $ifNull: ["$addresses", []] },
      },
    },
  ]);

  if (!user || user.length === 0) {
    return null;
  }

  const recentOrders = await Order.find({ customer: id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("items.product", "name mainImage");

  const selectedUser = user[0];
  const addresses = Array.isArray(selectedUser.addresses)
    ? selectedUser.addresses
    : [];

  return {
    ...selectedUser,
    addresses,
    recentOrders: recentOrders.map((order) => ({
      id: order.orderId,
      _id: order._id,
      itemsCount: order.items.length,
      amount: order.pricing.total,
      date: order.createdAt,
      status: order.status,
    })),
  };
}
