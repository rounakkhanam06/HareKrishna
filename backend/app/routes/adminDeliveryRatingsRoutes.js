import express from "express";
import {
  getAdminDeliveryRatings,
  getAdminDeliveryRatingById,
  moderateDeliveryRating,
} from "../controller/admin/adminDeliveryRatingsController.js";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.use(allowRoles("admin"));

router.get("/", getAdminDeliveryRatings);
router.get("/:id", getAdminDeliveryRatingById);
router.patch("/:id", moderateDeliveryRating);

export default router;
