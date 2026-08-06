import express from "express";
import { createProductReview, updateProductReview } from "../controller/productReviewController.js";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  verifyToken,
  allowRoles("customer", "user"),
  createProductReview
);

router.patch(
  "/:id",
  verifyToken,
  allowRoles("customer", "user"),
  updateProductReview
);

export default router;
