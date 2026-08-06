import BackInStockSubscription from "../models/backInStockSubscription.js";
import { emitCustomerNotification } from "../modules/notifications/notification.service.js";
import { NOTIFICATION_EVENTS } from "../modules/notifications/notification.constants.js";
import logger from "./logger.js";

/**
 * Notifies all customers subscribed to the given product that it is back in stock.
 * Marks their subscriptions as notified.
 * @param {Object} product - The product document that was restocked.
 */
export const notifyBackInStock = async (product, options = {}) => {
  try {
    const productId = product._id;
    const variantSku = options.variantSku || null;

    // Find all pending subscriptions for this product (and optional variant)
    const query = { productId, status: "pending" };
    if (variantSku) {
      query.$or = [
        { variantSku },
        { variantSku: { $exists: false } },
        { variantSku: "" },
        { variantSku: null },
      ];
    }

    const subscriptions = await BackInStockSubscription.find(query);

    if (subscriptions.length === 0) {
      return;
    }

    logger.info(
      `Sending back-in-stock notifications for product ${product.name} (ID: ${productId}) to ${subscriptions.length} users`
    );

    // Notify each user
    for (const sub of subscriptions) {
      emitCustomerNotification(NOTIFICATION_EVENTS.PRODUCT_BACK_IN_STOCK, {
        userId: sub.userId,
        productId,
        productName: product.name,
        variantSku: sub.variantSku || variantSku || "",
        data: {
          productId,
          productName: product.name,
          variantSku: sub.variantSku || variantSku || "",
        },
      });
    }

    // Mark subscriptions as notified
    const subIds = subscriptions.map((s) => s._id);
    await BackInStockSubscription.updateMany(
      { _id: { $in: subIds } },
      { $set: { status: "notified" } }
    );
  } catch (error) {
    logger.error("Error sending back-in-stock notifications", {
      scope: "notifyBackInStock",
      error,
    });
  }
};
