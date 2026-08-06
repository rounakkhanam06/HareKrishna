import mongoose from "mongoose";
import dotenv from "dotenv";
import Customer from "../app/models/customer.js";
import Wallet from "../app/models/wallet.js";
import LedgerEntry from "../app/models/ledgerEntry.js";
import Order from "../app/models/order.js";
import Transaction from "../app/models/transaction.js";
import { settleDeliveredOrder } from "../app/services/finance/orderFinanceService.js";
import OrderReturnService from "../app/services/order/orderReturnService.js";
import returnWindowReleaseJob from "../app/jobs/returnWindowReleaseJob.js";
import * as walletService from "../app/services/finance/walletService.js";

dotenv.config();

async function simulate() {
  const uri = process.env.MONGO_URI || "mongodb+srv://smarteannadatacanteen_db_user:eannadata-canteen@cluster0.ghyp4km.mongodb.net/Quick_commerce?retryWrites=true&w=majority&appName=Cluster0";
  await mongoose.connect(uri);
  console.log("Connected to DB");

  // 1. Find Mobin Ansari
  const customer = await Customer.findOne({ name: /MOBIN ANSARI/i });
  if (!customer) {
    console.error("Mobin Ansari not found in DB");
    await mongoose.disconnect();
    return;
  }
  console.log(`Original Mobin Ansari Wallet Balance: ${customer.walletBalance}`);

  // Fetch his current authoritative wallet document to back up original balances
  const wallet = await Wallet.findOne({ ownerType: "CUSTOMER", ownerId: customer._id });
  const originalAvailable = wallet ? wallet.availableBalance : 18;
  const originalLocked = wallet ? wallet.lockedSubsidyBalance : 0;
  console.log(`Original Wallet - Available: ${originalAvailable}, Locked: ${originalLocked}`);

  // Clean slate for test
  if (wallet) {
    wallet.availableBalance = 0;
    wallet.lockedSubsidyBalance = 0;
    await wallet.save();
  }
  customer.walletBalance = 0;
  await customer.save();
  console.log("Wallet cleared to 0 for test run.");

  try {
    // 2. Create a Mock Order
    const mockOrder = await Order.create({
      orderId: "MOCK-DBT-" + Date.now().toString().slice(-6),
      customer: customer._id,
      seller: new mongoose.Types.ObjectId(), // dummy seller
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          name: "Organic Rice (Proportional Subsidy Test A)",
          quantity: 1,
          price: 20,
          subsidyDiscount: 2.00,
          subsidyStatus: "none"
        },
        {
          product: new mongoose.Types.ObjectId(),
          name: "Fresh Wheat (Proportional Subsidy Test B)",
          quantity: 1,
          price: 25,
          subsidyDiscount: 2.50,
          subsidyStatus: "none"
        }
      ],
      paymentMode: "COD",
      paymentStatus: "PENDING_CASH_COLLECTION",
      payment: {
        method: "cash",
        status: "pending",
      },
      pricing: {
        subtotal: 45,
        total: 45,
      },
      paymentBreakdown: {
        productSubtotal: 45,
        subsidyDiscountPercent: 10,
        subsidyDiscount: 4.50,
        grandTotal: 45,
      },
      status: "pending",
      orderStatus: "pending",
      returnStatus: "none",
    });

    console.log(`Created mock order ${mockOrder.orderId} with subtotal ₹45 and DBT subsidy ₹4.50.`);

    // 3. Transition order status to delivered and settle it
    mockOrder.status = "delivered";
    mockOrder.orderStatus = "delivered";
    mockOrder.deliveredAt = new Date();
    await mockOrder.save();

    console.log("Settling delivered order to trigger DBT subsidy lock...");
    await settleDeliveredOrder(mockOrder.orderId);

    // Verify Locked Subsidy Balance
    const walletAfterDelivery = await Wallet.findOne({ ownerType: "CUSTOMER", ownerId: customer._id });
    console.log(`\n--- Verification after delivery ---`);
    console.log(`Available Balance: ${walletAfterDelivery.availableBalance} (Expected: 0)`);
    console.log(`Locked Subsidy Balance: ${walletAfterDelivery.lockedSubsidyBalance} (Expected: 4.5)`);

    const settledOrder = await Order.findById(mockOrder._id);
    console.log(`Item 1 Subsidy Status: ${settledOrder.items[0].subsidyStatus} (Expected: locked)`);
    console.log(`Item 2 Subsidy Status: ${settledOrder.items[1].subsidyStatus} (Expected: locked)`);

    const lockLedger = await LedgerEntry.findOne({ orderId: mockOrder._id, type: "DBT_SUBSIDY_LOCKED" });
    console.log(`DBT_SUBSIDY_LOCKED Ledger Created: ${lockLedger ? "YES" : "NO"} (Amount: ${lockLedger?.amount})`);

    // 4. Simulate Partial Return of Item 1 (Organic Rice - ₹20.00 subtotal)
    console.log("\nSimulating Partial Return of Item 1 (Organic Rice)...");
    settledOrder.returnStatus = "qc_passed";
    settledOrder.returnItems = [
      {
        product: settledOrder.items[0].product,
        name: settledOrder.items[0].name,
        quantity: 1,
        price: 20,
        itemIndex: 0,
        status: "approved",
      }
    ];
    await settledOrder.save();

    console.log("Triggering return refund and subsidy cancellation...");
    await OrderReturnService.completeReturnAndRefund(settledOrder);

    // Verify partial refund and subsidy cancel
    const walletAfterReturn = await Wallet.findOne({ ownerType: "CUSTOMER", ownerId: customer._id });
    console.log(`\n--- Verification after partial return ---`);
    console.log(`Available Balance: ${walletAfterReturn.availableBalance} (Expected: 20)`);
    console.log(`Locked Subsidy Balance: ${walletAfterReturn.lockedSubsidyBalance} (Expected: 2.5)`);

    const refundedOrder = await Order.findById(mockOrder._id);
    console.log(`Item 1 (Returned) Subsidy Status: ${refundedOrder.items[0].subsidyStatus} (Expected: cancelled)`);
    console.log(`Item 2 (Kept) Subsidy Status: ${refundedOrder.items[1].subsidyStatus} (Expected: locked)`);

    const cancelLedger = await LedgerEntry.findOne({ orderId: mockOrder._id, type: "DBT_SUBSIDY_CANCELLED" });
    console.log(`DBT_SUBSIDY_CANCELLED Ledger Created: ${cancelLedger ? "YES" : "NO"} (Amount: ${cancelLedger?.amount})`);

    // 5. Simulate Return Window Expiration and Run background Cron
    console.log("\nSimulating Return Window Expiration for remaining items...");
    refundedOrder.returnWindowExpiresAt = new Date(Date.now() - 1000); // Expired
    await refundedOrder.save();

    console.log("Executing returnWindowReleaseJob...");
    await returnWindowReleaseJob();

    // Verify Auto-Release
    const walletAfterRelease = await Wallet.findOne({ ownerType: "CUSTOMER", ownerId: customer._id });
    console.log(`\n--- Verification after return window expiration ---`);
    console.log(`Available Balance: ${walletAfterRelease.availableBalance} (Expected: 22.5)`);
    console.log(`Locked Subsidy Balance: ${walletAfterRelease.lockedSubsidyBalance} (Expected: 0)`);

    const releasedOrder = await Order.findById(mockOrder._id);
    console.log(`Item 2 Subsidy Status: ${releasedOrder.items[1].subsidyStatus} (Expected: released)`);

    const releaseLedger = await LedgerEntry.findOne({ orderId: mockOrder._id, type: "DBT_SUBSIDY_RELEASED" });
    console.log(`DBT_SUBSIDY_RELEASED Ledger Created: ${releaseLedger ? "YES" : "NO"} (Amount: ${releaseLedger?.amount})`);

    // 6. Test Customer Withdrawal Request
    console.log("\nSimulating Customer Withdrawal of ₹10.00...");
    await walletService.debitWallet({
      ownerType: "CUSTOMER",
      ownerId: customer._id,
      amount: 10,
      bucket: "available",
      ledgerType: "WITHDRAWAL",
      ledgerReference: `WDR-CUST-SIM`,
      ledgerDescription: "Customer withdrawal request created (Simulation)",
    });

    const withdrawalTx = await Transaction.create({
      user: customer._id,
      userModel: "User",
      type: "Withdrawal",
      amount: -10,
      status: "Pending",
      reference: `WDR-CUST-SIM`,
    });

    const walletAfterWithdraw = await Wallet.findOne({ ownerType: "CUSTOMER", ownerId: customer._id });
    console.log(`\n--- Verification after customer withdrawal ---`);
    console.log(`Available Balance: ${walletAfterWithdraw.availableBalance} (Expected: 12.5)`);
    console.log(`Pending Withdrawal Transaction created: ${withdrawalTx ? "YES" : "NO"}`);

    // Cleanup simulation records
    console.log("\nCleaning up simulation records...");
    await Order.deleteOne({ _id: mockOrder._id });
    await LedgerEntry.deleteMany({ orderId: mockOrder._id });
    await LedgerEntry.deleteOne({ idempotencyKey: `REL-DBT-${mockOrder._id}` });
    await LedgerEntry.deleteOne({ reference: `WDR-CUST-SIM` });
    await Transaction.deleteOne({ _id: withdrawalTx._id });

  } catch (error) {
    console.error("Simulation failed with error:", error);
  } finally {
    // Restore Original Mobin Ansari Balance
    console.log("\nRestoring original customer wallet balances...");
    if (wallet) {
      wallet.availableBalance = originalAvailable;
      wallet.lockedSubsidyBalance = originalLocked;
      await wallet.save();
    }
    customer.walletBalance = originalAvailable;
    await customer.save();
    console.log(`Customer balance restored successfully. walletBalance = ${customer.walletBalance}`);

    await mongoose.disconnect();
    console.log("Disconnected from DB");
  }
}

simulate().catch(console.error);
