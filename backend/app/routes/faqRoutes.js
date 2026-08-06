import express from 'express';
import { getFAQs, createFAQ, updateFAQ, deleteFAQ } from '../controller/faqController.js';
import { verifyToken, allowRoles, requireAdminPermission } from '../middleware/authMiddleware.js';

const router = express.Router();

// General Routes (accessible by all)
router.get('/', getFAQs);
router.get('/:id', getFAQs); // Generic get by id if needed

// Admin Routes
router.post('/', verifyToken, allowRoles("admin"), requireAdminPermission("faqs"), createFAQ);
router.put('/:id', verifyToken, allowRoles("admin"), requireAdminPermission("faqs"), updateFAQ);
router.delete('/:id', verifyToken, allowRoles("admin"), requireAdminPermission("faqs"), deleteFAQ);

export default router;
