import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, ArrowRight, RefreshCw, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sellerApi } from "../services/sellerApi";
import { useSettings } from "@core/context/SettingsContext";

const RESEND_COOLDOWN = 60;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const appName = settings?.appName || "HareKrishna";

  const [step, setStep] = useState(1); // 1 = email, 2 = OTP
  const [email, setEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const timerRef = useRef(null);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [countdown]);

  const startCountdown = () => setCountdown(RESEND_COOLDOWN);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError("");
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await sellerApi.sendPasswordResetOtp({ email: trimmedEmail });
      if (data.success) {
        setMaskedEmail(data.result?.maskedTarget || trimmedEmail);
        setStep(2);
        setOtp(["", "", "", ""]);
        startCountdown();
        toast.success("OTP sent! Check your email.");
      } else {
        setError(data.message || "Failed to send OTP");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (idx, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const updated = [...otp];
    updated[idx] = digit;
    setOtp(updated);
    setError("");
    if (digit && idx < 3) {
      otpRefs[idx + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs[idx - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (paste.length === 4) {
      setOtp(paste.split(""));
      otpRefs[3].current?.focus();
    }
    e.preventDefault();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    const code = otp.join("");
    if (code.length !== 4) {
      setError("Please enter the complete 4-digit OTP");
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await sellerApi.verifyPasswordResetOtp({
        email: email.trim().toLowerCase(),
        otp: code,
      });
      if (data.success) {
        const resetToken = data.result?.resetToken;
        toast.success("OTP verified! Set your new password.");
        navigate(`/seller/reset-password?token=${encodeURIComponent(resetToken)}`);
      } else {
        setError(data.message || "Invalid OTP");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden font-['Outfit'] flex items-center justify-center px-4">
      {/* Background blurs */}
      <div className="absolute top-[-20%] right-[-10%] h-[420px] w-[420px] rounded-full bg-amber-400/10 blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-10%] h-[420px] w-[420px] rounded-full bg-violet-400/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl"
      >
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => (step === 1 ? navigate("/seller/auth") : setStep(1))}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors mb-6 font-bold uppercase tracking-widest"
          >
            <ArrowLeft size={14} />
            {step === 1 ? "Back to Login" : "Change Email"}
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              {step === 1
                ? <Mail size={20} className="text-violet-400" />
                : <ShieldCheck size={20} className="text-emerald-400" />
              }
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {appName} Seller
            </span>
          </div>

          <h1 className="text-2xl font-black text-white leading-tight">
            {step === 1 ? "Forgot Password?" : "Verify Your Email"}
          </h1>
          <p className="mt-2 text-sm text-slate-400 font-medium">
            {step === 1
              ? "Enter your registered business email and we'll send you a verification code."
              : `We sent a 4-digit code to ${maskedEmail}. Enter it below.`}
          </p>
        </div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300 font-semibold"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 1: Email */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSendOtp}
              className="space-y-4"
            >
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-violet-400 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="Business email address"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50/5 border-2 border-transparent rounded-xl text-sm font-bold text-white outline-none focus:bg-white/5 focus:border-slate-600 transition-all placeholder:text-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-black text-white rounded-xl py-4 text-sm font-black tracking-[2px] transition-all flex items-center justify-center gap-3 group disabled:opacity-50 border border-white/10"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                {isLoading ? "SENDING..." : "SEND OTP"}
                {!isLoading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </motion.form>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifyOtp}
              className="space-y-6"
            >
              {/* OTP boxes */}
              <div className="flex gap-3 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={otpRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    autoFocus={idx === 0}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-14 h-16 text-center text-2xl font-black text-white bg-slate-50/5 border-2 border-slate-700 rounded-xl outline-none focus:border-violet-500 focus:bg-white/5 transition-all caret-transparent"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.join("").length !== 4}
                className="w-full bg-slate-900 hover:bg-black text-white rounded-xl py-4 text-sm font-black tracking-[2px] transition-all flex items-center justify-center gap-3 group disabled:opacity-50 border border-white/10"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                {isLoading ? "VERIFYING..." : "VERIFY OTP"}
              </button>

              {/* Resend */}
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-xs text-slate-500 font-bold">
                    Resend OTP in <span className="text-white">{countdown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isLoading}
                    className="text-xs text-slate-400 hover:text-white font-bold flex items-center gap-1.5 mx-auto transition-colors"
                  >
                    <RefreshCw size={12} />
                    Resend OTP
                  </button>
                )}
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
