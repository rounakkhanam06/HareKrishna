import Seller from "../models/seller.js";
import handleResponse from "../utils/helper.js";
import {
  issuePasswordResetOtp,
  verifyPasswordResetOtp,
  consumePasswordResetToken,
} from "../services/sellerVerificationService.js";

/* ============================================================
   POST /api/seller/forgot-password/send-otp
   Body: { email }
   Sends a 4-digit OTP to the seller's email address.
   Always returns 200 (prevents user enumeration).
============================================================= */
export const sendPasswordResetOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return handleResponse(res, 400, "Email is required");
    }

    const result = await issuePasswordResetOtp({
      email: email.trim().toLowerCase(),
      ipAddress: req.ip || "unknown",
    });

    return handleResponse(res, 200, "If an account with this email exists, an OTP has been sent.", {
      maskedTarget: result.maskedTarget,
      expiresInSeconds: result.expiresInSeconds,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return handleResponse(res, status, error.message);
  }
};

/* ============================================================
   POST /api/seller/forgot-password/verify-otp
   Body: { email, otp }
   Verifies the OTP and returns a short-lived resetToken (10 min).
============================================================= */
export const verifyPasswordResetOtpController = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return handleResponse(res, 400, "Email and OTP are required");
    }

    const result = await verifyPasswordResetOtp({
      email: email.trim().toLowerCase(),
      otp: String(otp).trim(),
      ipAddress: req.ip || "unknown",
    });

    return handleResponse(res, 200, "OTP verified successfully", {
      resetToken: result.resetToken,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return handleResponse(res, status, error.message);
  }
};

/* ============================================================
   POST /api/seller/forgot-password/reset-password
   Body: { resetToken, newPassword }
   Validates the resetToken and updates the seller's password.
============================================================= */
export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return handleResponse(res, 400, "Reset token and new password are required");
    }

    const pwd = String(newPassword).trim();
    if (pwd.length < 8) {
      return handleResponse(res, 400, "Password must be at least 8 characters");
    }
    if (pwd.length > 128) {
      return handleResponse(res, 400, "Password must not exceed 128 characters");
    }

    // Validate token and extract verified email
    const { email } = consumePasswordResetToken(resetToken);

    // Find seller
    const seller = await Seller.findOne({ email }).select("+password");
    if (!seller) {
      return handleResponse(res, 404, "Seller account not found");
    }

    // Update password — the pre("save") hook in seller.js handles bcrypt hashing
    seller.password = pwd;
    await seller.save();

    return handleResponse(res, 200, "Password reset successfully. You can now log in with your new password.");
  } catch (error) {
    const status = error.statusCode || 500;
    return handleResponse(res, status, error.message);
  }
};
