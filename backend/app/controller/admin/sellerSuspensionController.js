import handleResponse from "../../utils/helper.js";
import getPagination from "../../utils/pagination.js";
import Admin from "../../models/admin.js";
import {
  suspendSeller,
  unsuspendSeller,
  getSellerAuditLogData,
} from "../../services/admin/sellerSuspensionService.js";

/**
 * Resolve the acting admin's display name from the JWT id.
 * Falls back gracefully if admin doc not found.
 */
async function resolveAdminName(adminId) {
  try {
    const admin = await Admin.findById(adminId).select("name").lean();
    return admin?.name || "Admin";
  } catch {
    return "Admin";
  }
}

/* ===============================
   SUSPEND SELLER
================================ */
export const suspendSellerHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = "" } = req.body || {};
    const adminId = req.user.id;
    const adminName = await resolveAdminName(adminId);

    const result = await suspendSeller({ sellerId: id, adminId, adminName, reason });

    return handleResponse(res, 200, "Seller suspended successfully", result);
  } catch (error) {
    const status = error.statusCode || 500;
    return handleResponse(res, status, error.message);
  }
};

/* ===============================
   UNSUSPEND SELLER
================================ */
export const unsuspendSellerHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = "" } = req.body || {};
    const adminId = req.user.id;
    const adminName = await resolveAdminName(adminId);

    const result = await unsuspendSeller({ sellerId: id, adminId, adminName, reason });

    return handleResponse(res, 200, "Seller unsuspended successfully", result);
  } catch (error) {
    const status = error.statusCode || 500;
    return handleResponse(res, status, error.message);
  }
};

/* ===============================
   GET SELLER AUDIT LOG
================================ */
export const getSellerAuditLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 20,
      maxLimit: 100,
    });

    const data = await getSellerAuditLogData({ sellerId: id, page, limit, skip });

    return handleResponse(res, 200, "Seller audit log fetched", data);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
