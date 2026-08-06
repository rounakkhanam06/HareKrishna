import express from "express";
import multer from "multer";
import {
    signupCustomer,
    loginCustomer,
    verifyCustomerOTP,
    getCustomerProfile,
    updateCustomerProfile,
    getCustomerTransactions,
    requestWithdrawal,
} from "../controller/customerAuthController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
    authRouteRateLimiter,
    createContentLengthGuard,
    otpRouteRateLimiter,
} from "../middleware/securityMiddlewares.js";
import { uploadToCloudinary } from "../services/mediaService.js";

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        cb(null, allowed.includes(file.mimetype));
    },
});
const smallAuthPayload = createContentLengthGuard(
    parseInt(process.env.AUTH_MAX_PAYLOAD_BYTES || "16384", 10),
    "Auth payload too large",
);

// Public route: upload E-Anndata card image before signup (no auth required)
router.post(
    "/upload-card-image",
    upload.single("cardImage"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: "No image file provided" });
            }
            const imageUrl = await uploadToCloudinary(req.file.buffer, "eannadata_cards", {
                mimeType: req.file.mimetype,
                resourceType: "image",
            });
            return res.status(200).json({ success: true, result: { url: imageUrl } });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message || "Upload failed" });
        }
    }
);

router.post("/signup", authRouteRateLimiter, otpRouteRateLimiter, smallAuthPayload, signupCustomer);
router.post("/send-signup-otp", authRouteRateLimiter, otpRouteRateLimiter, smallAuthPayload, signupCustomer);
router.post("/send-login-otp", authRouteRateLimiter, otpRouteRateLimiter, smallAuthPayload, loginCustomer);

router.post("/verify-otp", authRouteRateLimiter, otpRouteRateLimiter, smallAuthPayload, verifyCustomerOTP);

// Profile routes
router.get("/profile", verifyToken, getCustomerProfile);
router.put("/profile", verifyToken, updateCustomerProfile);

// Wallet
router.get("/transactions", verifyToken, getCustomerTransactions);
router.post("/request-withdrawal", verifyToken, requestWithdrawal);

export default router;

