import { jest } from "@jest/globals";

const mockSendSmsIndiaHubOtp = jest.fn();
const mockSendICloudSms = jest.fn();

jest.unstable_mockModule("../app/infrastructure/sms/smsIndiaHubService.js", () => ({
  sendSmsIndiaHubOtp: mockSendSmsIndiaHubOtp,
}));

jest.unstable_mockModule("../app/infrastructure/sms/icloudSmsService.js", () => ({
  sendICloudSms: mockSendICloudSms,
}));

const { sendOtpSms } = await import(
  "../app/infrastructure/sms/smsService.js"
);

describe("smsService router", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SMS_PROVIDER;
  });

  it("defaults to sms_india_hub and calls sendSmsIndiaHubOtp", async () => {
    mockSendSmsIndiaHubOtp.mockResolvedValue({ provider: "sms_india_hub" });
    const result = await sendOtpSms({ phone: "9876543210", otp: "1234" });
    expect(mockSendSmsIndiaHubOtp).toHaveBeenCalled();
    expect(mockSendICloudSms).not.toHaveBeenCalled();
    expect(result.provider).toBe("sms_india_hub");
  });

  it("routes to icloudSmsService when SMS_PROVIDER is icloud_sms", async () => {
    process.env.SMS_PROVIDER = "icloud_sms";
    mockSendICloudSms.mockResolvedValue({ provider: "icloud_sms" });
    const result = await sendOtpSms({ phone: "9876543210", otp: "1234" });
    expect(mockSendICloudSms).toHaveBeenCalled();
    expect(mockSendSmsIndiaHubOtp).not.toHaveBeenCalled();
    expect(result.provider).toBe("icloud_sms");
  });
});
