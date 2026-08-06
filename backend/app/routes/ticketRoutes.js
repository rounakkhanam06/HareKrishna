import express from "express";
import {
    createTicket,
    getMyTickets,
    getAllTickets,
    replyToTicket,
    updateTicketStatus
} from "../controller/ticketController.js";
import { verifyToken, allowRoles, requireAdminPermission } from "../middleware/authMiddleware.js";

const router = express.Router();

// Mixed/Shared routes (Need login)
router.post("/create", verifyToken, createTicket);
router.get("/my-tickets", verifyToken, getMyTickets);
router.post("/reply/:id", verifyToken, replyToTicket);

// Admin only routes
router.get("/admin/all", verifyToken, allowRoles("admin"), requireAdminPermission("support"), getAllTickets);
router.patch("/admin/status/:id", verifyToken, allowRoles("admin"), requireAdminPermission("support"), updateTicketStatus);

export default router;
