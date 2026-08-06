import express from "express";
import { getAdminProductReviews, getAdminProductReviewById, updateAdminProductReviewStatus, getAdminProductReviewsAnalytics } from "../controller/productReviewController.js";
import multer from "multer";
import {
    bootstrapAdmin,
    signupAdmin,
    loginAdmin,
} from "../controller/adminAuthController.js";
import {
    getAdminProfile,
    updateAdminProfile,
    updateAdminPassword,
    getAdminStats,
    getDeliveryPartners,
    approveDeliveryPartner,
    rejectDeliveryPartner,
    getActiveFleet,
    getAdminWalletData,
    getDeliveryTransactions,
    settleTransaction,
    bulkSettleDelivery,
    getActiveSellers,
    getPendingSellers,
    approveSellerApplication,
    rejectSellerApplication,
    getSellerWithdrawals,
    getDeliveryWithdrawals,
    getCustomerWithdrawals,
    updateWithdrawalStatus,
    getSellerTransactions,
    getDeliveryCashBalances,
    getRiderCashDetails,
    settleRiderCash,
    getCashSettlementHistory,
    remindRiderCash,
    getUsers,
    getUserById,
    createUser,
    updateUser,
    updateUserStatus,
    bulkUploadUsers,
    verifyUserCard,
    sendUserNotification,
    getSellers,
    getSellerLocations,
    getPlatformSettings,
    updatePlatformSettings,
    getInternalAdmins,
    createInternalAdmin,
    updateInternalAdmin,
    deleteInternalAdmin
} from "../controller/adminController.js";
import {
    exportAdminFinanceStatementController,
    getAdminFinanceLedgerController,
    getAdminFinancePayoutsController,
    getAdminFinanceSummaryController,
    getDeliverySettingsController,
    processAdminFinancePayoutsController,
    updateDeliverySettingsController,
} from "../controller/adminFinanceController.js";

import {
    listProfileUpdateRequests,
    decideProfileUpdateRequest,
} from "../controller/admin/sellerProfileRequestController.js";
import {
    suspendSellerHandler,
    unsuspendSellerHandler,
    getSellerAuditLog,
} from "../controller/admin/sellerSuspensionController.js";
import { getSuspendedSellers } from "../controller/adminController.js";

import { verifyToken, allowRoles, requireAdminPermission, requireSuperAdmin } from "../middleware/authMiddleware.js";
import {
    adminBootstrapRateLimiter,
    authRouteRateLimiter,
    createContentLengthGuard,
} from "../middleware/securityMiddlewares.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const smallAdminPayload = createContentLengthGuard(
    parseInt(process.env.ADMIN_AUTH_MAX_PAYLOAD_BYTES || "20480", 10),
    "Admin auth payload too large",
);
router.post("/bootstrap", adminBootstrapRateLimiter, smallAdminPayload, bootstrapAdmin);
router.post("/signup", adminBootstrapRateLimiter, smallAdminPayload, signupAdmin);
router.post("/login", authRouteRateLimiter, smallAdminPayload, loginAdmin);

// Profile routes
router.get(
    "/profile",
    verifyToken,
    allowRoles("admin"),
    getAdminProfile
);

router.put(
    "/profile",
    verifyToken,
    allowRoles("admin"),
    updateAdminProfile
);

router.put(
    "/profile/password",
    verifyToken,
    allowRoles("admin"),
    updateAdminPassword
);

router.get(
    "/stats",
    verifyToken,
    allowRoles("admin"),
    requireAdminPermission("dashboard"),
    getAdminStats
);
router.get(
    "/finance/summary",
    verifyToken,
    allowRoles("admin"),
    requireAdminPermission("wallet"),
    getAdminFinanceSummaryController,
);
router.get(
    "/finance/ledger",
    verifyToken,
    allowRoles("admin"),
    requireAdminPermission("wallet"),
    getAdminFinanceLedgerController,
);
router.get(
    "/finance/payouts",
    verifyToken,
    allowRoles("admin"),
    requireAdminPermission("sellerPayments"),
    getAdminFinancePayoutsController,
);
router.post(
    "/finance/payouts/process",
    verifyToken,
    allowRoles("admin"),
    requireAdminPermission("sellerPayments"),
    processAdminFinancePayoutsController,
);
router.get(
    "/finance/export-statement",
    verifyToken,
    allowRoles("admin"),
    requireAdminPermission("wallet"),
    exportAdminFinanceStatementController,
);
router.get(
    "/settings/platform",
    verifyToken,
    allowRoles("admin"),
    requireAdminPermission("settings"),
    getPlatformSettings
);
router.get(
    "/settings/delivery",
    verifyToken,
    allowRoles("admin"),
    requireAdminPermission("settings"),
    getDeliverySettingsController,
);
router.put(
    "/settings/delivery",
    verifyToken,
    allowRoles("admin"),
    requireAdminPermission("settings"),
    updateDeliverySettingsController,
);
router.put(
    "/settings/platform",
    verifyToken,
    allowRoles("admin"),
    requireAdminPermission("settings"),
    updatePlatformSettings
);
router.get("/users", verifyToken, allowRoles("admin"), requireAdminPermission("customers"), getUsers);
router.post("/users", verifyToken, allowRoles("admin"), requireAdminPermission("customers"), createUser);
router.get("/users/:id", verifyToken, allowRoles("admin"), requireAdminPermission("customers"), getUserById);
router.put("/users/:id", verifyToken, allowRoles("admin"), requireAdminPermission("customers"), updateUser);
router.patch("/users/:id/status", verifyToken, allowRoles("admin"), requireAdminPermission("customers"), updateUserStatus);
router.patch("/users/:id/verify-card", verifyToken, allowRoles("admin"), requireAdminPermission("customers"), verifyUserCard);
router.post("/users/:id/notify", verifyToken, allowRoles("admin"), requireAdminPermission("customers"), sendUserNotification);
router.post("/users/bulk-upload", verifyToken, allowRoles("admin"), requireAdminPermission("customers"), upload.single("file"), bulkUploadUsers);
router.get("/sellers", verifyToken, allowRoles("admin"), requireAdminPermission("sellers"), getSellers);
router.get("/sellers/locations", verifyToken, allowRoles("admin"), requireAdminPermission("sellers"), getSellerLocations);
router.get("/sellers/active", verifyToken, allowRoles("admin"), requireAdminPermission("sellers"), getActiveSellers);
router.get("/sellers/pending", verifyToken, allowRoles("admin"), requireAdminPermission("sellers"), getPendingSellers);
router.patch("/sellers/approve/:id", verifyToken, allowRoles("admin"), requireAdminPermission("sellers"), approveSellerApplication);
router.delete("/sellers/reject/:id", verifyToken, allowRoles("admin"), requireAdminPermission("sellers"), rejectSellerApplication);
router.get("/sellers/suspended", verifyToken, allowRoles("admin"), requireAdminPermission("sellers"), getSuspendedSellers);
router.patch("/sellers/:id/suspend", verifyToken, allowRoles("admin"), requireAdminPermission("sellers"), suspendSellerHandler);
router.patch("/sellers/:id/unsuspend", verifyToken, allowRoles("admin"), requireAdminPermission("sellers"), unsuspendSellerHandler);
router.get("/sellers/:id/audit-log", verifyToken, allowRoles("admin"), requireAdminPermission("sellers"), getSellerAuditLog);

router.get("/sellers/profile-requests", verifyToken, allowRoles("admin"), requireAdminPermission("sellers"), listProfileUpdateRequests);
router.put("/sellers/profile-requests/:id/decide", verifyToken, allowRoles("admin"), requireAdminPermission("sellers"), decideProfileUpdateRequest);

router.get(
    "/delivery-partners",
    verifyToken,
    allowRoles("admin"),
    requireAdminPermission("delivery"),
    getDeliveryPartners
);

router.patch(
    "/delivery-partners/approve/:id",
    verifyToken,
    allowRoles("admin"),
    requireAdminPermission("delivery"),
    approveDeliveryPartner
);

router.delete(
    "/delivery-partners/reject/:id",
    verifyToken,
    allowRoles("admin"),
    requireAdminPermission("delivery"),
    rejectDeliveryPartner
);

router.get("/active-fleet", verifyToken, allowRoles("admin"), requireAdminPermission("delivery"), getActiveFleet);
router.get("/wallet-data", verifyToken, allowRoles("admin"), requireAdminPermission("wallet"), getAdminWalletData);

// Delivery Payouts / Funds
router.get("/delivery-transactions", verifyToken, allowRoles('admin'), requireAdminPermission("delivery"), getDeliveryTransactions);
router.put("/transactions/:id/settle", verifyToken, allowRoles("admin"), requireAdminPermission("delivery"), settleTransaction);
router.put("/transactions/bulk-settle-delivery", verifyToken, allowRoles("admin"), requireAdminPermission("delivery"), bulkSettleDelivery);

// Cash Collection Hub
router.get("/delivery-cash", verifyToken, allowRoles("admin"), requireAdminPermission("cashCollection"), getDeliveryCashBalances);
router.get("/rider-cash-details/:id", verifyToken, allowRoles("admin"), requireAdminPermission("cashCollection"), getRiderCashDetails);
router.post("/settle-cash", verifyToken, allowRoles("admin"), requireAdminPermission("cashCollection"), settleRiderCash);
router.post("/remind-cash/:id", verifyToken, allowRoles("admin"), requireAdminPermission("cashCollection"), remindRiderCash);
router.get("/cash-history", verifyToken, allowRoles("admin"), requireAdminPermission("cashCollection"), getCashSettlementHistory);

// Seller Withdrawal Management
router.get("/seller-withdrawals", verifyToken, allowRoles("admin"), requireAdminPermission("withdrawals"), getSellerWithdrawals);
router.get("/delivery-withdrawals", verifyToken, allowRoles("admin"), requireAdminPermission("withdrawals"), getDeliveryWithdrawals);
router.get("/customer-withdrawals", verifyToken, allowRoles("admin"), requireAdminPermission("withdrawals"), getCustomerWithdrawals);
router.get("/seller-transactions", verifyToken, allowRoles("admin"), requireAdminPermission("sellerPayments"), getSellerTransactions);
router.put("/withdrawals/:id", verifyToken, allowRoles("admin"), requireAdminPermission("withdrawals"), updateWithdrawalStatus);

// Protected admin route example
router.get(
    "/dashboard",
    verifyToken,
    allowRoles("admin"),
    requireAdminPermission("dashboard"),
    (req, res) => {
        res.json({
            success: true,
            message: "Welcome to Admin Dashboard",
        });
    }
);

// Internal Admin Management routes (Superadmin only)
router.get("/internal-users", verifyToken, allowRoles("admin"), requireSuperAdmin, getInternalAdmins);
router.post("/internal-users", verifyToken, allowRoles("admin"), requireSuperAdmin, createInternalAdmin);
router.put("/internal-users/:id", verifyToken, allowRoles("admin"), requireSuperAdmin, updateInternalAdmin);
router.delete("/internal-users/:id", verifyToken, allowRoles("admin"), requireSuperAdmin, deleteInternalAdmin);

// Admin Product Reviews Management
router.get("/product-reviews", verifyToken, allowRoles("admin"), requireAdminPermission("products"), getAdminProductReviews);
router.get("/product-reviews/analytics", verifyToken, allowRoles("admin"), requireAdminPermission("products"), getAdminProductReviewsAnalytics);
router.get("/product-reviews/:id", verifyToken, allowRoles("admin"), requireAdminPermission("products"), getAdminProductReviewById);
router.patch("/product-reviews/:id", verifyToken, allowRoles("admin"), requireAdminPermission("products"), updateAdminProductReviewStatus);

export default router;
