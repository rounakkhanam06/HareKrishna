import { jest } from "@jest/globals";
import mongoose from "mongoose";

const mockOrderFindOne = jest.fn();
const mockDeliveryFindById = jest.fn();
const mockDeliveryRatingFindOne = jest.fn();
const mockDeliveryRatingCreate = jest.fn();

jest.unstable_mockModule("../app/models/order.js", () => ({
  default: {
    findOne: mockOrderFindOne,
  },
}));

jest.unstable_mockModule("../app/models/delivery.js", () => ({
  default: {
    findById: mockDeliveryFindById,
  },
}));

jest.unstable_mockModule("../app/models/deliveryRating.js", () => {
  const MockModel = function (data) {
    this.stars = data.stars;
    this.review = data.review;
    this.tags = data.tags;
    this.order = data.order;
    this.deliveryPartner = data.deliveryPartner;
    this.customer = data.customer;
    this.seller = data.seller;
    this.save = jest.fn().mockResolvedValue(this);
  };
  MockModel.findOne = mockDeliveryRatingFindOne;
  MockModel.create = mockDeliveryRatingCreate;
  return {
    default: MockModel,
  };
});

jest.unstable_mockModule("../app/modules/notifications/notification.emitter.js", () => ({
  emitNotificationEvent: jest.fn(),
}));

jest.unstable_mockModule("../app/services/orderSocketEmitter.js", () => ({
  emitToDelivery: jest.fn(),
}));

const { rateDeliveryPartner } = await import("../app/controller/deliveryRatingsController.js");

describe("deliveryRatingsController rateDeliveryPartner", () => {
  let req;
  let res;
  let mockSession;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };

    jest.spyOn(mongoose, "startSession").mockResolvedValue(mockSession);

    req = {
      params: { orderId: "ord-123" },
      user: { id: "64b8e23f0000000000000002" }, // matches stringified customer
      body: {
        stars: 5,
        review: "Super fast and friendly rider!",
        tags: ["Fast Delivery", "Friendly"],
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should successfully submit a new rating and update delivery statistics", async () => {
    const mockOrder = {
      _id: new mongoose.Types.ObjectId("64b8e23f0000000000000001"),
      orderId: "ord-123",
      customer: new mongoose.Types.ObjectId("64b8e23f0000000000000002"),
      status: "delivered",
      workflowStatus: "DELIVERED",
      deliveryBoy: new mongoose.Types.ObjectId("64b8e23f0000000000000003"),
      seller: new mongoose.Types.ObjectId("64b8e23f0000000000000004"),
      save: jest.fn().mockResolvedValue(true),
    };

    const mockRider = {
      _id: new mongoose.Types.ObjectId("64b8e23f0000000000000003"),
      totalRatings: 10,
      totalStars: 45,
      averageRating: 4.5,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 5, 5: 5 },
      save: jest.fn().mockResolvedValue(true),
      markModified: jest.fn(),
    };

    mockOrderFindOne.mockReturnValue({
      session: jest.fn().mockResolvedValue(mockOrder),
    });

    mockDeliveryFindById.mockReturnValue({
      session: jest.fn().mockResolvedValue(mockRider),
    });

    mockDeliveryRatingFindOne.mockReturnValue({
      session: jest.fn().mockResolvedValue(null),
    });

    await rateDeliveryPartner(req, res);

    expect(mockSession.startTransaction).toHaveBeenCalled();
    expect(mockSession.commitTransaction).toHaveBeenCalled();
    expect(mockRider.totalRatings).toBe(11);
    expect(mockRider.totalStars).toBe(50);
    expect(mockRider.averageRating).toBe(4.55); // (45 + 5) / 11 = 4.545 -> round to 2 decimals: 4.55
    expect(mockRider.ratingDistribution[5]).toBe(6);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Delivery rating submitted successfully.",
      })
    );
  });

  it("should fail if stars value is missing or invalid", async () => {
    req.body.stars = 10; // invalid rating value

    await rateDeliveryPartner(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining("stars"),
      })
    );
  });
});
