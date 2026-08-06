import { jest } from "@jest/globals";

const mockCouponFind = jest.fn();
const mockOrderCountDocuments = jest.fn();

jest.unstable_mockModule("../app/models/coupon.js", () => ({
  default: {
    find: mockCouponFind,
  },
}));

jest.unstable_mockModule("../app/models/order.js", () => ({
  default: {
    countDocuments: mockOrderCountDocuments,
  },
}));

const { listCoupons } = await import("../app/controller/couponController.js");

describe("listCoupons visibility filter", () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  test("does not filter coupons for guest users (no req.user)", async () => {
    mockReq = {
      query: { status: "active" },
    };

    const mockCouponsList = [
      { _id: "coupon1", code: "COUPON1", perUserLimit: 1 },
      { _id: "coupon2", code: "COUPON2", perUserLimit: 2 },
    ];

    mockCouponFind.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCouponsList),
      }),
    });

    await listCoupons(mockReq, mockRes);

    expect(mockCouponFind).toHaveBeenCalled();
    expect(mockOrderCountDocuments).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    const responseData = mockRes.json.mock.calls[0][0];
    expect(responseData.results).toHaveLength(2);
  });

  test("filters out coupons that have reached the usage limit for customer user", async () => {
    mockReq = {
      query: { status: "active" },
      user: { id: "customer-1", role: "customer" },
    };

    const mockCouponsList = [
      { _id: "coupon1", code: "COUPON1", perUserLimit: 1 },
      { _id: "coupon2", code: "COUPON2", perUserLimit: 2 },
    ];

    mockCouponFind.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCouponsList),
      }),
    });

    mockOrderCountDocuments.mockImplementation(async (query) => {
      if (String(query.coupon) === "coupon1") return 1;
      if (String(query.coupon) === "coupon2") return 1;
      return 0;
    });

    await listCoupons(mockReq, mockRes);

    expect(mockCouponFind).toHaveBeenCalled();
    expect(mockOrderCountDocuments).toHaveBeenCalledTimes(2);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    const responseData = mockRes.json.mock.calls[0][0];
    expect(responseData.results).toHaveLength(1);
    expect(responseData.results[0].code).toBe("COUPON2");
  });

  test("does not filter coupons for admin user even if usage limits exist", async () => {
    mockReq = {
      query: { status: "active" },
      user: { id: "admin-1", role: "admin" },
    };

    const mockCouponsList = [
      { _id: "coupon1", code: "COUPON1", perUserLimit: 1 },
    ];

    mockCouponFind.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCouponsList),
      }),
    });

    await listCoupons(mockReq, mockRes);

    expect(mockCouponFind).toHaveBeenCalled();
    expect(mockOrderCountDocuments).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    const responseData = mockRes.json.mock.calls[0][0];
    expect(responseData.results).toHaveLength(1);
  });
});
