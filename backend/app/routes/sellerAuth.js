import express from "express";
import { getSellerProductReviews, getSellerProductReviewAnalytics } from "../controller/productReviewController.js";
import {
    signupSeller,
    loginSeller,
    sendSellerSignupOtp,
    verifySellerSignupOtp,
} from "../controller/sellerAuthController.js";
import {
    sendPasswordResetOtp,
    verifyPasswordResetOtpController,
    resetPassword,
} from "../controller/sellerPasswordResetController.js";
import { getSellerProfile, updateSellerProfile, requestWithdrawal, getNearbySellers } from "../controller/sellerController.js";
import { createProfileUpdateRequest, getPendingRequest } from "../controller/admin/sellerProfileRequestController.js";
import { getSellerStats, getSellerEarnings } from "../controller/sellerStatsController.js";
import { getSellerWalletSummaryController } from "../controller/adminFinanceController.js";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";
import {
    authRouteRateLimiter,
    createContentLengthGuard,
    otpRouteRateLimiter,
} from "../middleware/securityMiddlewares.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const sellerOtpPayloadGuard = createContentLengthGuard(
    parseInt(process.env.AUTH_MAX_PAYLOAD_BYTES || "16384", 10),
    "Verification payload too large",
);

router.post(
    "/verification/send-otp",
    authRouteRateLimiter,
    otpRouteRateLimiter,
    sellerOtpPayloadGuard,
    sendSellerSignupOtp
);
router.post(
    "/verification/verify-otp",
    authRouteRateLimiter,
    otpRouteRateLimiter,
    sellerOtpPayloadGuard,
    verifySellerSignupOtp
);

router.post(
    "/signup",
    upload.any(),
    signupSeller
);
router.post("/login", loginSeller);
router.get("/nearby", getNearbySellers);

// Forgot Password (OTP-based) — public routes
router.post("/forgot-password/send-otp", authRouteRateLimiter, otpRouteRateLimiter, sellerOtpPayloadGuard, sendPasswordResetOtp);
router.post("/forgot-password/verify-otp", authRouteRateLimiter, otpRouteRateLimiter, sellerOtpPayloadGuard, verifyPasswordResetOtpController);
router.post("/forgot-password/reset-password", authRouteRateLimiter, resetPassword);

// Profile routes
router.get(
    "/profile",
    verifyToken,
    allowRoles("seller"),
    getSellerProfile
);

router.put(
    "/profile",
    verifyToken,
    allowRoles("seller"),
    updateSellerProfile
);

router.post(
    "/profile-request",
    verifyToken,
    allowRoles("seller"),
    createProfileUpdateRequest
);

router.get(
    "/profile-request/pending",
    verifyToken,
    allowRoles("seller"),
    getPendingRequest
);

// Analytics & Financials
router.get("/stats", verifyToken, allowRoles("seller"), getSellerStats);
router.get("/earnings", verifyToken, allowRoles("seller"), getSellerEarnings);
router.get("/wallet/summary", verifyToken, allowRoles("seller"), getSellerWalletSummaryController);
router.post("/request-withdrawal", verifyToken, allowRoles("seller"), requestWithdrawal);

// Reviews & Review Analytics
router.get("/products/:id/reviews", verifyToken, allowRoles("seller"), getSellerProductReviews);
router.get("/products/:id/review-analytics", verifyToken, allowRoles("seller"), getSellerProductReviewAnalytics);

export default router;
