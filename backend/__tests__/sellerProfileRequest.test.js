import { jest } from "@jest/globals";

// Mock variables
const mockRequestFindOne = jest.fn();
const mockRequestCreate = jest.fn();
const mockRequestFind = jest.fn();
const mockRequestCountDocuments = jest.fn();
const mockRequestFindById = jest.fn();
const mockSellerFindById = jest.fn();
const mockInvalidateSellerName = jest.fn();
const mockEmitSellerNotification = jest.fn();

// Mock models
jest.unstable_mockModule("../app/models/sellerProfileUpdateRequest.js", () => ({
  default: {
    findOne: mockRequestFindOne,
    create: mockRequestCreate,
    find: mockRequestFind,
    countDocuments: mockRequestCountDocuments,
    findById: mockRequestFindById,
  },
}));

jest.unstable_mockModule("../app/models/seller.js", () => ({
  default: {
    findById: mockSellerFindById,
  },
}));

// Mock services
jest.unstable_mockModule("../app/services/entityNameCache.js", () => ({
  invalidateSellerName: mockInvalidateSellerName,
}));

jest.unstable_mockModule("../app/modules/notifications/notification.service.js", () => ({
  emitSellerNotification: mockEmitSellerNotification,
}));

// Import controller
const {
  createProfileUpdateRequest,
  getPendingRequest,
  listProfileUpdateRequests,
  decideProfileUpdateRequest,
} = await import("../app/controller/admin/sellerProfileRequestController.js");

describe("Seller Profile Update Request & Approval Controller", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: "seller-123" },
      body: {},
      params: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockInvalidateSellerName.mockResolvedValue();
  });

  describe("createProfileUpdateRequest", () => {
    it("should successfully create request if none is pending", async () => {
      req.body = {
        requestedData: {
          name: "New Owner Name",
          shopName: "New Shop Name",
          phone: "9876543210",
        },
        reason: "Relocating storefront",
      };

      mockRequestFindOne.mockResolvedValue(null);
      mockRequestCreate.mockResolvedValue({
        _id: "request-111",
        seller: "seller-123",
        requestedData: req.body.requestedData,
        reason: req.body.reason,
        status: "pending",
      });

      await createProfileUpdateRequest(req, res);

      expect(mockRequestFindOne).toHaveBeenCalledWith({
        seller: "seller-123",
        status: "pending",
      });
      expect(mockRequestCreate).toHaveBeenCalledWith({
        seller: "seller-123",
        requestedData: req.body.requestedData,
        reason: req.body.reason,
        status: "pending",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Profile update request submitted successfully for admin review.",
        })
      );
    });

    it("should reject if a request is already pending", async () => {
      req.body = {
        requestedData: { name: "New Name" },
        reason: "Update",
      };

      mockRequestFindOne.mockResolvedValue({ _id: "request-already-pending" });

      await createProfileUpdateRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "You already have a pending profile update request. Please wait for admin review.",
        })
      );
      expect(mockRequestCreate).not.toHaveBeenCalled();
    });

    it("should reject if reason is missing or too short", async () => {
      req.body = {
        requestedData: { name: "New Name" },
        reason: "abc", // too short, min 5 characters
      };

      await createProfileUpdateRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockRequestCreate).not.toHaveBeenCalled();
    });
  });

  describe("getPendingRequest", () => {
    it("should return the pending request if it exists", async () => {
      const mockPending = {
        _id: "request-pending",
        seller: "seller-123",
        reason: "Store update",
        status: "pending",
      };
      mockRequestFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockPending),
      });

      await getPendingRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          result: mockPending,
        })
      );
    });

    it("should return null if no pending request exists", async () => {
      mockRequestFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await getPendingRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          result: null,
        })
      );
    });
  });

  describe("decideProfileUpdateRequest", () => {
    let mockSave, mockSellerSave, mockRequestRecord, mockSellerRecord;

    beforeEach(() => {
      mockSave = jest.fn();
      mockSellerSave = jest.fn();

      mockRequestRecord = {
        _id: "request-789",
        seller: "seller-123",
        requestedData: {
          name: "Approved Name",
          shopName: "Approved Shop",
          phone: "9999999999",
        },
        reason: "Details update",
        status: "pending",
        save: mockSave,
      };

      mockSellerRecord = {
        _id: "seller-123",
        name: "Old Name",
        shopName: "Old Shop",
        phone: "1111111111",
        save: mockSellerSave,
      };

      mockRequestFindById.mockResolvedValue(mockRequestRecord);
      mockSellerFindById.mockResolvedValue(mockSellerRecord);
    });

    it("should successfully approve request, update seller profile and emit notification", async () => {
      req.params = { id: "request-789" };
      req.body = { status: "approved", adminFeedback: "Looks good" };
      req.user = { id: "admin-456" };

      await decideProfileUpdateRequest(req, res);

      // Verify updates applied to seller
      expect(mockSellerRecord.name).toBe("Approved Name");
      expect(mockSellerRecord.shopName).toBe("Approved Shop");
      expect(mockSellerRecord.phone).toBe("9999999999");
      expect(mockSellerSave).toHaveBeenCalled();

      // Verify request record state
      expect(mockRequestRecord.status).toBe("approved");
      expect(mockRequestRecord.adminFeedback).toBe("Looks good");
      expect(mockRequestRecord.reviewedBy).toBe("admin-456");
      expect(mockSave).toHaveBeenCalled();

      // Verify cache invalidation
      expect(mockInvalidateSellerName).toHaveBeenCalledWith("seller-123");

      // Verify notification
      expect(mockEmitSellerNotification).toHaveBeenCalledWith(
        "SELLER_PROFILE_APPROVED",
        expect.objectContaining({ sellerId: "seller-123" })
      );

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should reject request, leave seller profile unchanged, and emit rejection notification", async () => {
      req.params = { id: "request-789" };
      req.body = { status: "rejected", adminFeedback: "Incorrect details" };
      req.user = { id: "admin-456" };

      await decideProfileUpdateRequest(req, res);

      // Verify seller is NOT updated or saved
      expect(mockSellerSave).not.toHaveBeenCalled();

      // Verify request record state
      expect(mockRequestRecord.status).toBe("rejected");
      expect(mockRequestRecord.adminFeedback).toBe("Incorrect details");
      expect(mockSave).toHaveBeenCalled();

      // Verify notification with feedback
      expect(mockEmitSellerNotification).toHaveBeenCalledWith(
        "SELLER_PROFILE_REJECTED",
        expect.objectContaining({
          sellerId: "seller-123",
          feedback: "Incorrect details",
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
