import nodemailer from "nodemailer";
import logger from "./logger.js";

let cachedTransporter = null;

export function useRealEmailOTP() {
  return (
    process.env.USE_REAL_EMAIL_OTP === "true" ||
    process.env.USE_REAL_EMAIL_OTP === "1"
  );
}

function parseSmtpPort() {
  return parseInt(process.env.SMTP_PORT || "587", 10);
}

function parseSmtpSecure(port) {
  if (process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1") {
    return true;
  }

  if (process.env.SMTP_SECURE === "false" || process.env.SMTP_SECURE === "0") {
    return false;
  }

  return port === 465;
}

function getMailFrom() {
  const fromAddress = String(process.env.MAIL_FROM || "").trim();
  const fromName = String(process.env.MAIL_FROM_NAME || "").trim();

  if (!fromAddress) {
    const error = new Error("MAIL_FROM is required for email OTP delivery");
    error.statusCode = 500;
    throw error;
  }

  return fromName ? `${fromName} <${fromAddress}>` : fromAddress;
}

function getTransportConfig() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = parseSmtpPort();
  const secure = parseSmtpSecure(port);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();

  if (!host) {
    const error = new Error("SMTP_HOST is required for email OTP delivery");
    error.statusCode = 500;
    throw error;
  }

  if (!Number.isFinite(port) || port <= 0) {
    const error = new Error("SMTP_PORT must be a valid number");
    error.statusCode = 500;
    throw error;
  }

  if ((user && !pass) || (!user && pass)) {
    const error = new Error("SMTP_USER and SMTP_PASS must be provided together");
    error.statusCode = 500;
    throw error;
  }

  return {
    host,
    port,
    secure,
    ...(user && pass
      ? {
          auth: {
            user,
            pass,
          },
        }
      : {}),
  };
}

function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport(getTransportConfig());
  }

  return cachedTransporter;
}

export async function sendSellerVerificationOtpEmail({
  email,
  otp,
  expiresInMinutes,
}) {
  if (!useRealEmailOTP()) {
    console.log(`\n🔑 [MOCK OTP] Verification code for ${email} is: ${otp} (expires in ${expiresInMinutes}m)\n`);
    logger.info("Seller email OTP generated in mock mode", {
      email,
      mode: "mock",
    });
    return {
      delivered: false,
      mode: "mock",
    };
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: getMailFrom(),
    to: email,
    subject: "Verify your seller signup email",
    text: `Your seller signup verification code is ${otp}. This code expires in ${expiresInMinutes} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a;">
        <p>Your seller signup verification code is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${otp}</p>
        <p>This code expires in ${expiresInMinutes} minutes.</p>
      </div>
    `,
  });

  return {
    delivered: true,
    mode: "real",
  };
}

export function __resetEmailTransportForTests() {
  cachedTransporter = null;
}

export async function sendSellerPasswordResetOtpEmail({
  email,
  otp,
  expiresInMinutes,
}) {
  if (!useRealEmailOTP()) {
    console.log(`\n🔑 [MOCK OTP] Password Reset code for ${email} is: ${otp} (expires in ${expiresInMinutes}m)\n`);
    logger.info("[Password Reset] OTP generated in mock mode", {
      email,
      mode: "mock",
    });
    return {
      delivered: false,
      mode: "mock",
    };
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: getMailFrom(),
    to: email,
    subject: "Password Reset Code — eAnnadata Seller",
    text: `Your password reset code is ${otp}. It expires in ${expiresInMinutes} minutes. If you did not request this, ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 480px; margin: 0 auto;">
        <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Password Reset Request</h2>
        <p style="color: #475569; margin-bottom: 16px;">Use the code below to reset your seller account password. This code expires in <strong>${expiresInMinutes} minutes</strong>.</p>
        <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 16px;">
          <p style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #0f172a; margin: 0;">${otp}</p>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">If you did not request a password reset, you can safely ignore this email. Your account remains secure.</p>
      </div>
    `,
  });

  return {
    delivered: true,
    mode: "real",
  };
}
