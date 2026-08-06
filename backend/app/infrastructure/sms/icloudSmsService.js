import axios from "axios";
import { buildMessage, toIndianNumber } from "../../utils/smsHelpers.js";
import logger from "../../services/logger.js";

const ICLOUD_SMS_SUCCESS_CODE = "3001";

const ICLOUD_SMS_ERROR_MESSAGES = {
  "3002": "Invalid URL",
  "3003": "Invalid User/Password",
  "3004": "Invalid Message Type",
  "3005": "Invalid Message Content",
  "3006": "Invalid Destination Number",
  "3007": "Invalid Sender ID / Source",
  "3008": "Invalid DLR Field",
  "3009": "Authentication Failed (Invalid AUTH_KEY)",
  "3010": "iCloud SMS Internal Server Error",
  "3011": "Insufficient SMS Balance / Credits",
  "3012": "iCloud SMS Gateway Timeout",
  "3013": "Invalid Request Content Type",
  "3014": "Missing Mobile Number",
  "3015": "SMS Content Pending Approval",
  "3016": "Missing Required Parameter",
  "3017": "Request Failed",
  "3018": "iCloud SMS Account Expired",
  "3019": "Null Pointer Exception in Gateway"
};

function getICloudSmsConfig() {
  return {
    authKey: String(process.env.ICLOUD_SMS_AUTH_KEY || "").trim(),
    senderId: String(process.env.ICLOUD_SMS_SENDER_ID || "").trim(),
    routeId: String(process.env.ICLOUD_SMS_ROUTE_ID || "1").trim(),
    url: String(
      process.env.ICLOUD_SMS_URL || "http://msg.icloudsms.com/rest/services/sendSMS/sendGroupSms"
    ).trim(),
    entityId: String(process.env.ICLOUD_SMS_ENTITY_ID || "NoneedIfAddedInPanel").trim(),
    tmid: String(process.env.ICLOUD_SMS_TMID || "140200000022").trim(),
    templateId: String(process.env.ICLOUD_SMS_TEMPLATE_ID || "NoneedIfAddedInPanel").trim(),
    smsContentType: String(process.env.ICLOUD_SMS_CONTENT_TYPE || "english").trim(),
    concentFailoverId: String(process.env.ICLOUD_SMS_CONCENT_FAILOVER_ID || "30").trim(),
    timeoutMs: parseInt(process.env.ICLOUD_SMS_TIMEOUT_MS || "10000", 10),
  };
}

export async function sendICloudSms({ phone, otp, message }) {
  const config = getICloudSmsConfig();
  
  if (!config.authKey || !config.senderId || !config.url) {
    const missing = [];
    if (!config.authKey) missing.push("authKey");
    if (!config.senderId) missing.push("senderId");
    if (!config.url) missing.push("url");
    const error = new Error(`Missing iCloud SMS config: ${missing.join(", ")}`);
    error.statusCode = 500;
    throw error;
  }

  const msgContent = message || buildMessage(otp);
  
  logger.info("[sendICloudSms] Sending SMS via MsgClub/iCloudSMS", {
    url: config.url,
    senderId: config.senderId,
    routeId: config.routeId,
    mobileNos: toIndianNumber(phone),
    message: msgContent,
    templateId: config.templateId,
    tmid: config.tmid,
  });

  const response = await axios.get(config.url, {
    params: {
      AUTH_KEY: config.authKey,
      message: msgContent,
      senderId: config.senderId,
      routeId: config.routeId,
      mobileNos: toIndianNumber(phone),
      smsContentType: config.smsContentType,
      entityId: config.entityId,
      tmid: config.tmid,
      templateId: config.templateId,
      concentFailoverId: config.concentFailoverId,
    },
    timeout: config.timeoutMs,
  });

  const body = response.data;
  logger.info("[sendICloudSms] Received response from MsgClub/iCloudSMS", {
    body,
  });
  let responseCode = null;
  let responseVal = null;
  
  if (body && typeof body === "object") {
    responseCode = String(body.responseCode || "").trim();
    responseVal = String(body.response || "").trim();
  } else if (body && typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      responseCode = String(parsed.responseCode || "").trim();
      responseVal = String(parsed.response || "").trim();
    } catch {
      // Regexp fallback for malformed JSON
      const codeMatch = body.match(/"responseCode"\s*:\s*"([^"]+)"/);
      if (codeMatch) {
        responseCode = codeMatch[1];
      }
      const valMatch = body.match(/"response"\s*:\s*"([^"]+)"/);
      if (valMatch) {
        responseVal = valMatch[1];
      }
    }
  }

  if (responseCode !== ICLOUD_SMS_SUCCESS_CODE) {
    const errMsg = ICLOUD_SMS_ERROR_MESSAGES[responseCode] || "iCloud SMS request failed";
    const error = new Error(`${errMsg} (${responseCode || "unknown response"})`);
    error.isKnownProviderCode = Boolean(ICLOUD_SMS_ERROR_MESSAGES[responseCode]);
    error.statusCode = ["3003", "3009", "3018"].includes(responseCode) ? 500 : 502;
    error.providerCode = responseCode;
    error.providerRaw = body;
    throw error;
  }

  return {
    provider: "icloud_sms",
    providerCode: responseCode,
    rawResponse: body,
  };
}

export const __testables = {
  getICloudSmsConfig,
  ICLOUD_SMS_ERROR_MESSAGES,
  ICLOUD_SMS_SUCCESS_CODE,
};
