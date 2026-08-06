import { sendSmsIndiaHubOtp } from "./smsIndiaHubService.js";
import { sendICloudSms } from "./icloudSmsService.js";

export function getActiveProvider() {
  return String(process.env.SMS_PROVIDER || "sms_india_hub").trim().toLowerCase();
}

/**
 * Universal SMS send method that dispatches to the active provider.
 */
export async function sendOtpSms({ phone, otp, message }) {
  const provider = getActiveProvider();
  if (provider === "icloud_sms" || provider === "icloud" || provider === "msg_club") {
    return sendICloudSms({ phone, otp, message });
  }
  // Default to SMS India Hub
  return sendSmsIndiaHubOtp({ phone, otp, message });
}

/**
 * Legacy wrapper exported under the old name for backward compatibility.
 */
export async function sendSmsIndiaHubOtpLegacy({ phone, otp, message }) {
  return sendOtpSms({ phone, otp, message });
}

export { sendSmsIndiaHubOtpLegacy as sendSmsIndiaHubOtp };

export const __testables = {
  getActiveProvider,
};
