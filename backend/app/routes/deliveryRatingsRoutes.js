import express from "express";
import { getDeliveryPartnerRatings } from "../controller/deliveryRatingsController.js";

const router = express.Router();

router.get("/:id/ratings", getDeliveryPartnerRatings);

export default router;
