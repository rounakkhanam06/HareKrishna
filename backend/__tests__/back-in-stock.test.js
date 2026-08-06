import { jest } from "@jest/globals";

const mockSubscriptionFind = jest.fn();
const mockSubscriptionUpdateMany = jest.fn();
const mockSubscriptionFindOneAndUpdate = jest.fn();
const mockProductFindById = jest.fn();
const mockEmitCustomerNotification = jest.fn();
const mockEmitSellerNotification = jest.fn();

// Mock Mongoose models
jest.unstable_mockModule("../app/models/backInStockSubscription.js", () => ({
  default: {
    find: mockSubscriptionFind,
    updateMany: mockSubscriptionUpdateMany,
    findOneAndUpdate: mockSubscriptionFindOneAndUpdate,
  },
}));

jest.unstable_mockModule("../app/models/product.js", () => ({
  default: {
    findById: mockProductFindById,
  },
}));

// Mock Notification Service
jest.unstable_mockModule("../app/modules/notifications/notification.service.js", () => ({
  emitCustomerNotification: mockEmitCustomerNotification,
  emitSellerNotification: mockEmitSellerNotification,
  notify: jest.fn(),
  emitNotificationEvent: jest.fn(),
  emitDeliveryNotification: jest.fn(),
}));

jest.unstable_mockModule("../app/services/logger.js", () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Imports
const { notifyBackInStock } = await import("../app/services/backInStockService.js");
const { requestProductNotification } = await import("../app/controller/productController.js");

describe("Back-in-Stock Notification & Subscription System", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("requestProductNotification controller", () => {
    it("should successfully register subscription and notify seller", async () => {
      const req = {
        params: { id: "product-123" },
        user: { id: "user-456" },
        body: { variantSku: "variant-789" },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      mockProductFindById.mockResolvedValue({
        _id: "product-123",
        name: "Test Product",
        sellerId: "seller-789",
      });

      mockSubscriptionFindOneAndUpdate.mockResolvedValue({});

      await requestProductNotification(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Notification request registered successfully",
        })
      );

      // Verify db subscription upsert
      expect(mockSubscriptionFindOneAndUpdate).toHaveBeenCalledWith(
        { productId: "product-123", userId: "user-456", variantSku: "variant-789", status: "pending" },
        { $setOnInsert: { productId: "product-123", userId: "user-456", variantSku: "variant-789", status: "pending" } },
        { upsert: true }
      );

      // Verify notification triggered to seller
      expect(mockEmitSellerNotification).toHaveBeenCalledWith(
        "PRODUCT_NOTIFY_REQUEST",
        expect.objectContaining({
          sellerId: "seller-789",
          productId: "product-123",
          productName: "Test Product",
          userId: "user-456",
        })
      );
    });

    it("should return 404 if product does not exist", async () => {
      const req = {
        params: { id: "invalid-prod" },
        user: { id: "user-456" },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      mockProductFindById.mockResolvedValue(null);

      await requestProductNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Product not found",
        })
      );
    });
  });

  describe("notifyBackInStock service", () => {
    it("should send notifications to all subscribed users and mark them notified", async () => {
      const product = {
        _id: "product-123",
        name: "Test Product",
      };

      mockSubscriptionFind.mockResolvedValue([
        { userId: "user-abc" },
        { userId: "user-xyz" },
      ]);

      await notifyBackInStock(product);

      // Verify notification sent to both users
      expect(mockEmitCustomerNotification).toHaveBeenCalledTimes(2);
      expect(mockEmitCustomerNotification).toHaveBeenNthCalledWith(
        1,
        "PRODUCT_BACK_IN_STOCK",
        expect.objectContaining({
          userId: "user-abc",
          productId: "product-123",
          productName: "Test Product",
        })
      );
      expect(mockEmitCustomerNotification).toHaveBeenNthCalledWith(
        2,
        "PRODUCT_BACK_IN_STOCK",
        expect.objectContaining({
          userId: "user-xyz",
          productId: "product-123",
          productName: "Test Product",
        })
      );

      // Verify update status
      expect(mockSubscriptionUpdateMany).toHaveBeenCalledWith(
        { productId: "product-123", status: "pending" },
        { $set: { status: "notified" } }
      );
    });

    it("should do nothing if there are no pending subscriptions", async () => {
      const product = {
        _id: "product-123",
        name: "Test Product",
      };

      mockSubscriptionFind.mockResolvedValue([]);

      await notifyBackInStock(product);

      expect(mockEmitCustomerNotification).not.toHaveBeenCalled();
      expect(mockSubscriptionUpdateMany).not.toHaveBeenCalled();
    });
  });
});
