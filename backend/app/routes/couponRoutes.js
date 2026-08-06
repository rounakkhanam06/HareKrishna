import express from "express";
import {
    listCoupons,
    createCoupon,
    updateCoupon,
    toggleCouponStatus,
    deleteCoupon,
    validateCoupon,
} from "../controller/couponController.js";
import { verifyToken, allowRoles, requireAdminPermission, optionalVerifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin management
router.get("/admin/coupons", verifyToken, allowRoles("admin"), requireAdminPermission("marketing"), listCoupons);
router.post("/admin/coupons", verifyToken, allowRoles("admin"), requireAdminPermission("marketing"), createCoupon);
router.put("/admin/coupons/:id", verifyToken, allowRoles("admin"), requireAdminPermission("marketing"), updateCoupon);
router.patch("/admin/coupons/:id/status", verifyToken, allowRoles("admin"), requireAdminPermission("marketing"), toggleCouponStatus);
router.delete("/admin/coupons/:id", verifyToken, allowRoles("admin"), requireAdminPermission("marketing"), deleteCoupon);

// Customer‑facing
router.post("/coupons/validate", validateCoupon);
router.get("/coupons", optionalVerifyToken, listCoupons);

export default router;

