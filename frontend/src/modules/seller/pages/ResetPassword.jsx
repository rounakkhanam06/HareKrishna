import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { sellerApi } from "../services/sellerApi";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!resetToken) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 font-['Outfit']">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center rounded-3xl border border-white/10 bg-white/[0.04] p-10 backdrop-blur-xl shadow-2xl"
        >
          <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={28} className="text-red-400" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Invalid Reset Link</h2>
          <p className="text-sm text-slate-400 font-medium mb-6">
            This reset link is missing or invalid. Please request a new one.
          </p>
          <button
            onClick={() => navigate("/seller/forgot-password")}
            className="w-full bg-slate-900 hover:bg-black text-white rounded-xl py-3 text-sm font-black tracking-widest border border-white/10 transition-all"
          >
            REQUEST NEW OTP
          </button>
        </motion.div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await sellerApi.resetPassword({ resetToken, newPassword });
      if (data.success) {
        toast.success("Password reset successfully! Please log in.");
        navigate("/seller/auth");
      } else {
        setError(data.message || "Failed to reset password");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid or expired session. Please request a new OTP.";
      if (err.response?.status === 400 || err.response?.status === 404) {
        setError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden font-['Outfit'] flex items-center justify-center px-4">
      <div className="absolute top-[-20%] left-[-10%] h-[420px] w-[420px] rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[420px] w-[420px] rounded-full bg-violet-400/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl"
      >
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/seller/forgot-password")}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors mb-6 font-bold uppercase tracking-widest"
          >
            <ArrowLeft size={14} />
            Back
          </button>

          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-3">
            <CheckCircle2 size={20} className="text-emerald-400" />
          </div>

          <h1 className="text-2xl font-black text-white leading-tight">Set New Password</h1>
          <p className="mt-2 text-sm text-slate-400 font-medium">
            Choose a strong password for your seller account.
          </p>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300 font-semibold"
          >
            {error}
            {(error.includes("expired") || error.includes("Invalid or expired")) && (
              <button
                type="button"
                onClick={() => navigate("/seller/forgot-password")}
                className="block mt-2 text-xs text-red-400 hover:text-red-200 underline font-bold"
              >
                Request a new OTP
              </button>
            )}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-400 transition-colors">
              <Lock size={18} />
            </div>
            <input
              type={showNew ? "text" : "password"}
              required
              minLength={8}
              maxLength={128}
              autoFocus
              placeholder="New password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
              className="w-full pl-12 pr-14 py-4 bg-slate-50/5 border-2 border-transparent rounded-xl text-sm font-bold text-white outline-none focus:bg-white/5 focus:border-slate-600 transition-all placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              tabIndex={-1}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Password strength hint */}
          {newPassword.length > 0 && newPassword.length < 8 && (
            <p className="text-[11px] text-amber-400 font-bold -mt-1 pl-1">
              Password must be at least 8 characters
            </p>
          )}

          {/* Confirm Password */}
          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-400 transition-colors">
              <Lock size={18} />
            </div>
            <input
              type={showConfirm ? "text" : "password"}
              required
              minLength={8}
              maxLength={128}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              className="w-full pl-12 pr-14 py-4 bg-slate-50/5 border-2 border-transparent rounded-xl text-sm font-bold text-white outline-none focus:bg-white/5 focus:border-slate-600 transition-all placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              tabIndex={-1}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Match indicator */}
          {confirmPassword.length > 0 && (
            <p className={`text-[11px] font-bold -mt-1 pl-1 ${newPassword === confirmPassword ? "text-emerald-400" : "text-red-400"}`}>
              {newPassword === confirmPassword ? "✓ Passwords match" : "Passwords do not match"}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || newPassword.length < 8 || newPassword !== confirmPassword}
            className="w-full bg-slate-900 hover:bg-black text-white rounded-xl py-4 text-sm font-black tracking-[2px] transition-all flex items-center justify-center gap-3 disabled:opacity-50 border border-white/10 mt-2"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            {isLoading ? "RESETTING..." : "RESET PASSWORD"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
