import express from "express";
import multer from "multer";
import {
  getAdminExperienceSections,
  createExperienceSection,
  updateExperienceSection,
  deleteExperienceSection,
  reorderExperienceSections,
  getPublicExperienceSections,
  uploadBannerImage,
  getPublicHeroConfig,
  getAdminHeroConfig,
  upsertHeroConfig,
} from "../controller/experienceController.js";
import { verifyToken, allowRoles, requireAdminPermission } from "../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Admin routes (protected)
router.get(
  "/admin/experience",
  verifyToken,
  allowRoles("admin"),
  requireAdminPermission("marketing"),
  getAdminExperienceSections
);

router.post(
  "/admin/experience",
  verifyToken,
  allowRoles("admin"),
  requireAdminPermission("marketing"),
  createExperienceSection
);

// Specific routes MUST come before generic parameterized route /admin/experience/:id
router.put(
  "/admin/experience/reorder",
  verifyToken,
  allowRoles("admin"),
  requireAdminPermission("marketing"),
  reorderExperienceSections
);

// Admin hero config (separate from experience sections) - before :id so "hero" is not matched as id
router.get(
  "/admin/experience/hero",
  verifyToken,
  allowRoles("admin"),
  requireAdminPermission("marketing"),
  getAdminHeroConfig
);
router.put(
  "/admin/experience/hero",
  verifyToken,
  allowRoles("admin"),
  requireAdminPermission("marketing"),
  upsertHeroConfig
);

router.put(
  "/admin/experience/:id",
  verifyToken,
  allowRoles("admin"),
  requireAdminPermission("marketing"),
  updateExperienceSection
);

router.delete(
  "/admin/experience/:id",
  verifyToken,
  allowRoles("admin"),
  requireAdminPermission("marketing"),
  deleteExperienceSection
);

router.post(
  "/admin/experience/upload-banner",
  verifyToken,
  allowRoles("admin"),
  requireAdminPermission("marketing"),
  upload.single("image"),
  uploadBannerImage
);

// Public routes
router.get("/experience", getPublicExperienceSections);
router.get("/experience/hero", getPublicHeroConfig);

export default router;
