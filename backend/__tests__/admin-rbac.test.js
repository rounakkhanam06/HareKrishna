import { jest } from "@jest/globals";
import { requireAdminPermission, requireSuperAdmin } from "../app/middleware/authMiddleware.js";

describe("Admin RBAC Middleware", () => {
  let mockReq;
  let mockRes;
  let nextFunction;

  beforeEach(() => {
    mockReq = {
      user: null
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  describe("requireAdminPermission", () => {
    it("should deny access if role is not admin", () => {
      mockReq.user = { role: "customer" };
      const middleware = requireAdminPermission("products");
      middleware(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it("should allow access if admin is a superadmin", () => {
      mockReq.user = { role: "admin", isSuperAdmin: true };
      const middleware = requireAdminPermission("products");
      middleware(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it("should allow access if admin has the required permission key", () => {
      mockReq.user = { role: "admin", isSuperAdmin: false, permissions: ["products", "orders"] };
      const middleware = requireAdminPermission("products");
      middleware(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it("should deny access if admin does not have the required permission key", () => {
      mockReq.user = { role: "admin", isSuperAdmin: false, permissions: ["orders"] };
      const middleware = requireAdminPermission("products");
      middleware(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe("requireSuperAdmin", () => {
    it("should deny access if role is not admin", () => {
      mockReq.user = { role: "customer" };
      requireSuperAdmin(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it("should deny access if user is admin but not superadmin", () => {
      mockReq.user = { role: "admin", isSuperAdmin: false };
      requireSuperAdmin(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it("should allow access if user is superadmin", () => {
      mockReq.user = { role: "admin", isSuperAdmin: true };
      requireSuperAdmin(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
