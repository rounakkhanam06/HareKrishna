import express from "express";
import { getProductReviewsPublic, getProductReviewSummaryPublic } from "../controller/productReviewController.js";
import {
    getProducts,
    getSellerProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    getModerationProducts,
    approveProduct,
    rejectProduct,
    requestProductNotification,
    toggleProductStatus,
} from "../controller/productController.js";
import { adjustStock, getStockHistory } from "../controller/stockController.js";
import {
    verifyToken,
    allowRoles,
    optionalVerifyToken,
    requireApprovedSeller,
    requireAdminPermission,
} from "../middleware/authMiddleware.js";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

// Public routes with optional auth (to detect admin/seller vs customer)
router.get("/", optionalVerifyToken, getProducts);

// Seller protected routes
router.get("/seller/me", verifyToken, allowRoles("seller"), requireApprovedSeller, getSellerProducts);
router.get("/stock-history", verifyToken, allowRoles("seller"), requireApprovedSeller, getStockHistory);
router.post("/adjust-stock", verifyToken, allowRoles("seller"), requireApprovedSeller, adjustStock);
router.get("/moderation", verifyToken, allowRoles("admin"), requireAdminPermission("products"), getModerationProducts);
router.patch("/moderation/:id/approve", verifyToken, allowRoles("admin"), requireAdminPermission("products"), approveProduct);
router.patch("/moderation/:id/reject", verifyToken, allowRoles("admin"), requireAdminPermission("products"), rejectProduct);

router.get("/:id", optionalVerifyToken, getProductById);
router.get("/:productId/reviews", optionalVerifyToken, getProductReviewsPublic);
router.get("/:productId/review-summary", getProductReviewSummaryPublic);
router.post("/:id/notify-me", verifyToken, allowRoles("customer"), requestProductNotification);
router.patch("/:id/status", verifyToken, allowRoles("admin", "seller"), toggleProductStatus);
router.put("/:id/status", verifyToken, allowRoles("admin", "seller"), toggleProductStatus);

router.post(
    "/",
    verifyToken,
    allowRoles("seller", "admin"),
    requireApprovedSeller,
    upload.any(),
    createProduct
);

router.put(
    "/:id",
    verifyToken,
    allowRoles("seller", "admin"),
    requireApprovedSeller,
    upload.any(),
    updateProduct
);

router.delete(
    "/:id",
    verifyToken,
    allowRoles("seller", "admin"),
    requireApprovedSeller,
    deleteProduct
);

export default router;
