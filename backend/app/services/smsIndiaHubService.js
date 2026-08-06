import { sendSmsIndiaHubOtp } from "../infrastructure/sms/smsService.js";
import { __testables as legacyTestables } from "../infrastructure/sms/smsIndiaHubService.js";

export { sendSmsIndiaHubOtp };
export const __testables = legacyTestables;
