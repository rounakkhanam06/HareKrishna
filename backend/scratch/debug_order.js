import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../app/models/order.js";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/eannadata-canteen";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const orderId = "ORD-01KWFA0K1Y90WPFHG7MHYZKXQ6";
  const sellerId = "6a1aca9de507a6a23ceb1375";

  const filter = {
    orderId,
    seller: sellerId,
    workflowVersion: { $gte: 2 },
    workflowStatus: "SELLER_PENDING",
    $or: [
      { paymentMode: { $ne: "ONLINE" } },
      { paymentStatus: "PAID" },
    ],
  };

  const doc = await Order.findOne(filter);
  console.log("Found doc with actual Order model:", doc ? "YES" : "NO");

  await mongoose.disconnect();
}

main().catch(console.error);
