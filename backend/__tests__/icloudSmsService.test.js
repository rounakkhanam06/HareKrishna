import { jest } from "@jest/globals";

const mockAxiosGet = jest.fn();

jest.unstable_mockModule("axios", () => ({
  default: { get: mockAxiosGet },
}));

const { sendICloudSms } = await import(
  "../app/infrastructure/sms/icloudSmsService.js"
);

describe("icloudSmsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ICLOUD_SMS_AUTH_KEY = "test-auth-key";
    process.env.ICLOUD_SMS_SENDER_ID = "DEMOOS";
    process.env.ICLOUD_SMS_URL = "http://msg.icloudsms.com/rest/services/sendSMS/sendGroupSms";
  });

  it("sends SMS successfully when API returns code 3001", async () => {
    mockAxiosGet.mockResolvedValue({
      data: { response: "req-123", responseCode: "3001" },
    });

    const result = await sendICloudSms({
      phone: "9876543210",
      otp: "1234",
    });

    expect(mockAxiosGet).toHaveBeenCalledWith(
      "http://msg.icloudsms.com/rest/services/sendSMS/sendGroupSms",
      expect.objectContaining({
        params: expect.objectContaining({
          AUTH_KEY: "test-auth-key",
          senderId: "DEMOOS",
          mobileNos: "919876543210",
          message: expect.stringContaining("1234"),
        }),
      })
    );

    expect(result).toEqual({
      provider: "icloud_sms",
      providerCode: "3001",
      rawResponse: { response: "req-123", responseCode: "3001" },
    });
  });

  it("fails when configuration is missing", async () => {
    delete process.env.ICLOUD_SMS_AUTH_KEY;
    await expect(
      sendICloudSms({ phone: "9876543210", otp: "1234" })
    ).rejects.toThrow("Missing iCloud SMS config: authKey");
  });

  it("throws error with friendly message on bad responseCode", async () => {
    mockAxiosGet.mockResolvedValue({
      data: { response: "error", responseCode: "3009" },
    });

    await expect(
      sendICloudSms({ phone: "9876543210", otp: "1234" })
    ).rejects.toMatchObject({
      message: expect.stringContaining("Authentication Failed"),
      providerCode: "3009",
    });
  });

  it("handles string response payloads and parses correctly", async () => {
    mockAxiosGet.mockResolvedValue({
      data: '{"response":"req-456","responseCode":"3001"}',
    });

    const result = await sendICloudSms({
      phone: "9876543210",
      otp: "5678",
    });

    expect(result).toEqual({
      provider: "icloud_sms",
      providerCode: "3001",
      rawResponse: '{"response":"req-456","responseCode":"3001"}',
    });
  });
});
