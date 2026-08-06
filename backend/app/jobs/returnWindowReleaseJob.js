import dotenv from "dotenv";
import Order from "../models/order.js";
import logger from "../services/logger.js";
import Payout from "../models/payout.js";
import { processPayout } from "../services/finance/payoutService.js";
import * as walletService from "../services/finance/walletService.js";
import { roundCurrency } from "../utils/money.js";

dotenv.config();

const DEFAULT_INTERVAL_MS = 60000;
const RETURN_HOLD_RELEASE_INTERVAL_MS = parseInt(
  process.env.RETURN_HOLD_RELEASE_INTERVAL_MS || `${DEFAULT_INTERVAL_MS}`,
  10,
);

const AUTO_RELEASE_SELLER_PAYOUT =
  String(process.env.AUTO_RELEASE_SELLER_PAYOUT || "true").toLowerCase() === "true";

const releaseExpiredSellerHolds = async () => {
  const startTime = Date.now();
  try {
    const now = new Date();
    const candidates = await Order.find({
      status: "delivered",
      returnStatus: "none",
      returnWindowExpiresAt: { $lte: now },
      "settlementStatus.sellerPayout": "HOLD",
    })
      .select("_id orderId")
      .lean();

    for (const row of candidates) {
      try {
        const payout = await Payout.findOne({
          payoutType: "SELLER",
          relatedOrderIds: row._id,
          status: { $in: ["PENDING", "PROCESSING"] },
        }).select("_id").lean();

        if (AUTO_RELEASE_SELLER_PAYOUT && payout?._id) {
          try {
            await processPayout(payout._id);
          } catch (err) {
            logger.warn("Auto-release seller payout failed", {
              jobName: "returnWindowReleaseJob",
              orderId: row.orderId,
              payoutId: String(payout._id),
              error: err.message,
            });
          }
        } else if (payout?._id) {
          await Order.updateOne(
            { _id: row._id },
            {
              $set: {
                "settlementStatus.sellerPayout": "PENDING",
                "financeFlags.sellerPayoutHeld": false,
              },
            },
          );
        }
      } catch (err) {
        logger.error("Failed to release seller payout hold", {
          jobName: "returnWindowReleaseJob",
          orderId: row.orderId,
          error: err.message,
        });
      }
    }

    const duration = Date.now() - startTime;
    if (candidates.length > 0) {
      logger.info("Return window release job completed", {
        jobName: "returnWindowReleaseJob",
        duration,
        releasedCount: candidates.length,
      });
    }
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error("Return window release job failed", {
      jobName: "returnWindowReleaseJob",
      duration,
      error: err.message,
      stack: err.stack,
    });
  }
};

const releaseExpiredSubsidies = async () => {
  const startTime = Date.now();
  try {
    const now = new Date();
    const candidates = await Order.find({
      status: "delivered",
      returnWindowExpiresAt: { $lte: now },
      "items.subsidyStatus": "locked",
    });

    for (const order of candidates) {
      let amountToRelease = 0;
      for (const item of order.items) {
        if (item.subsidyStatus === "locked") {
          amountToRelease = roundCurrency(amountToRelease + (item.subsidyDiscount || 0));
        }
      }

      if (amountToRelease <= 0) continue;

      const session = await Order.db.startSession();
      try {
        await session.withTransaction(async () => {
          const freshOrder = await Order.findById(order._id).session(session);
          if (!freshOrder) return;

          let freshAmountToRelease = 0;
          const lockedItems = [];
          for (const item of freshOrder.items) {
            if (item.subsidyStatus === "locked") {
              freshAmountToRelease = roundCurrency(freshAmountToRelease + (item.subsidyDiscount || 0));
              lockedItems.push(item);
            }
          }

          if (freshAmountToRelease > 0) {
            await walletService.moveLockedSubsidyToAvailable({
              ownerType: "CUSTOMER",
              ownerId: freshOrder.customer,
              amount: freshAmountToRelease,
              session,
              ledgerType: "DBT_SUBSIDY_RELEASED",
              ledgerReference: `REL-DBT-${freshOrder.orderId}`,
              ledgerDescription: `DBT subsidy released for order ${freshOrder.orderId}`,
              orderId: freshOrder._id,
              idempotencyKey: `REL-DBT-${freshOrder._id}`,
            });

            for (const item of lockedItems) {
              item.subsidyStatus = "released";
            }

            await freshOrder.save({ session });
            logger.info("Released locked DBT subsidy for order", {
              jobName: "returnWindowReleaseJob",
              orderId: freshOrder.orderId,
              amount: freshAmountToRelease,
            });
          }
        });
      } catch (err) {
        logger.error("Failed to release DBT subsidy for order inside transaction", {
          jobName: "returnWindowReleaseJob",
          orderId: order.orderId,
          error: err.message,
        });
      } finally {
        session.endSession();
      }
    }

    const duration = Date.now() - startTime;
    if (candidates.length > 0) {
      logger.info("DBT subsidy release job completed", {
        jobName: "returnWindowReleaseJob",
        duration,
        releasedCount: candidates.length,
      });
    }
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error("DBT subsidy release job failed", {
      jobName: "returnWindowReleaseJob",
      duration,
      error: err.message,
      stack: err.stack,
    });
  }
};

const returnWindowReleaseJobHandler = async () => {
  await releaseExpiredSellerHolds();
  await releaseExpiredSubsidies();
};

export const getReturnWindowReleaseJobHandler = () => returnWindowReleaseJobHandler;

export const getReturnWindowReleaseJobInterval = () => RETURN_HOLD_RELEASE_INTERVAL_MS;

export default returnWindowReleaseJobHandler;
