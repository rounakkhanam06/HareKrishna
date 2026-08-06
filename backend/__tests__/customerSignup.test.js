import { jest } from "@jest/globals";

const mockCustomerFindOne = jest.fn();
const mockCustomerCreate = jest.fn();
const mockIssueCustomerOtp = jest.fn();

jest.unstable_mockModule("../app/models/customer.js", () => ({
  default: {
    findOne: mockCustomerFindOne,
    create: mockCustomerCreate,
  },
}));

jest.unstable_mockModule("../app/services/otpAuthService.js", () => ({
  issueCustomerOtp: mockIssueCustomerOtp,
  sanitizeCustomer: jest.fn(),
  verifyCustomerOtpCode: jest.fn(),
}));

const { signupCustomer } = await import("../app/controller/customerAuthController.js");

describe("customerAuthController signupCustomer", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {
        firstName: "John",
        lastName: "Doe",
        phone: "9876543210",
        email: "john@example.com",
      },
      ip: "127.0.0.1",
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it("registers a new customer successfully", async () => {
    mockCustomerFindOne.mockResolvedValue(null);
    mockCustomerCreate.mockImplementation(async (payload) => ({
      _id: "customer-1",
      ...payload,
    }));

    await signupCustomer(req, res);

    expect(mockCustomerFindOne).toHaveBeenCalledTimes(2);
    expect(mockCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "John Doe",
        phone: "+919876543210",
        email: "john@example.com",
        isVerified: false,
        isActive: true,
        role: "user",
      })
    );
    expect(mockIssueCustomerOtp).toHaveBeenCalledWith({
      name: "John Doe",
      rawPhone: "+919876543210",
      flow: "signup",
      ipAddress: "127.0.0.1",
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Registration successful. OTP sent for verification.",
      })
    );
  });

  it("rejects signup if customer phone number is already verified", async () => {
    mockCustomerFindOne.mockResolvedValue({
      _id: "customer-1",
      phone: "+919876543210",
      isVerified: true,
    });

    await signupCustomer(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Phone number is already registered",
      })
    );
  });

  it("rejects signup if email is already verified", async () => {
    mockCustomerFindOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        _id: "customer-2",
        email: "john@example.com",
        isVerified: true,
      });

    await signupCustomer(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Email is already registered",
      })
    );
  });

  it("allows signup and updates unverified user if phone exists but is not verified", async () => {
    const mockSave = jest.fn();
    mockCustomerFindOne.mockResolvedValue({
      _id: "customer-1",
      phone: "+919876543210",
      isVerified: false,
      save: mockSave,
    });

    await signupCustomer(req, res);

    expect(mockCustomerCreate).not.toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalled();
    expect(mockIssueCustomerOtp).toHaveBeenCalled();
  });
});
