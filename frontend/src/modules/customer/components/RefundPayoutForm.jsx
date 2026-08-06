import React, { useState, useEffect } from "react";
import { CheckCircle, Clock, Shield, AlertCircle, RefreshCw, X, CreditCard, Landmark, Smartphone, Mail, ArrowRight, Edit } from "lucide-react";
import { customerApi } from "../services/customerApi";
import { toast } from "sonner";

/**
 * RefundPayoutForm Component
 * 
 * Renders the Refund Payout Details collection form for customers,
 * including validation, encryption-friendly masked previews, and status tracking.
 */
const RefundPayoutForm = ({ order, onClose, onSuccess }) => {
  const [refundStatusRecord, setRefundStatusRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [step, setStep] = useState("FORM"); // "FORM", "CONFIRM", "STATUS"
  const [refundMethod, setRefundMethod] = useState("UPI"); // "UPI" or "BANK_ACCOUNT"
  const [accountHolderName, setAccountHolderName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [ifscError, setIfscError] = useState("");
  const [bankName, setBankName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  // Fetch existing payout details if any
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const res = await customerApi.getRefundPayoutStatus(order.orderId);
        if (res.data?.success && res.data?.result) {
          const record = res.data.result;
          setRefundStatusRecord(record);
          setStep("STATUS");
        }
      } catch (err) {
        // 404 is expected if no details have been submitted yet
        if (err.response?.status !== 404) {
          console.error("Error fetching refund payout status:", err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (order?.orderId) {
      fetchStatus();
    }
  }, [order?.orderId]);

  // Pre-fill profile data if available
  useEffect(() => {
    if (order) {
      if (order.customerName) {
        setAccountHolderName(order.customerName);
      }
      if (order.customerPhone || order.customer?.phone) {
        setMobile(order.customerPhone || order.customer?.phone || "");
      }
      if (order.customerEmail || order.customer?.email) {
        setEmail(order.customerEmail || order.customer?.email || "");
      }
    }
  }, [order]);

  // Lock body & html scroll when modal is active
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  // Helper for IFSC code validation
  const validateIfscCode = (value) => {
    const val = (value || "").trim().toUpperCase();
    if (!val) {
      return "IFSC Code is required";
    }
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(val)) {
      return "Enter a valid IFSC code (e.g. SBIN0001234)";
    }
    return "";
  };

  // Client-side validations
  const validateForm = () => {
    if (!accountHolderName.trim()) {
      toast.error("Account holder name is required");
      return false;
    }
    const nameRegex = /^[a-zA-Z0-9\s.]{2,100}$/;
    if (!nameRegex.test(accountHolderName.trim())) {
      toast.error("Enter a valid account holder name (2-100 chars, alphanumeric, spaces and dots only)");
      return false;
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast.error("Enter a valid email address");
        return false;
      }
    }

    if (mobile.trim()) {
      const mobileRegex = /^\+?[0-9]{10,15}$/;
      if (!mobileRegex.test(mobile.trim())) {
        toast.error("Enter a valid mobile number (10-15 digits)");
        return false;
      }
    }

    if (refundMethod === "UPI") {
      if (!upiId.trim()) {
        toast.error("UPI ID is required");
        return false;
      }
      const upiRegex = /^[a-zA-Z0-9._\-]{2,256}@[a-zA-Z]{2,64}$/;
      if (!upiRegex.test(upiId.trim().toLowerCase())) {
        toast.error("Enter a valid UPI ID (e.g. name@bank)");
        return false;
      }
    } else {
      // Bank Account validations
      if (!accountNumber.trim()) {
        toast.error("Bank account number is required");
        return false;
      }
      const accountRegex = /^\d{9,18}$/;
      if (!accountRegex.test(accountNumber.trim())) {
        toast.error("Account number must be 9-18 digits");
        return false;
      }
      if (accountNumber.trim() !== confirmAccountNumber.trim()) {
        toast.error("Account numbers do not match");
        return false;
      }
      const ifscErr = validateIfscCode(ifscCode);
      if (ifscErr) {
        setIfscError(ifscErr);
        toast.error(ifscErr);
        return false;
      }
    }
    return true;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setStep("CONFIRM");
    }
  };

  const handleConfirmSubmit = async () => {
    try {
      setIsSubmitting(true);
      const payload = {
        refundMethod,
        accountHolderName: accountHolderName.trim(),
        mobile: mobile.trim() || undefined,
        email: email.trim() || undefined,
      };

      if (refundMethod === "UPI") {
        payload.upiId = upiId.trim().toLowerCase();
      } else {
        payload.accountNumber = accountNumber.trim();
        payload.confirmAccountNumber = confirmAccountNumber.trim();
        payload.ifscCode = ifscCode.trim().toUpperCase();
        payload.bankName = bankName.trim() || undefined;
      }

      const res = await customerApi.submitRefundPayoutDetails(order.orderId, payload);
      if (res.data?.success && res.data?.result) {
        toast.success("Refund details submitted successfully");
        setRefundStatusRecord(res.data.result);
        setStep("STATUS");
        if (onSuccess) {
          onSuccess(res.data.result);
        }
      }
    } catch (err) {
      console.error("Failed to submit refund details:", err);
      const errMsg = err.response?.data?.message || "Failed to submit refund details";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status tracker helper
  const renderStatusTracker = (status) => {
    const steps = ["PENDING", "APPROVED", "PROCESSING", "COMPLETED"];
    const currentIdx = steps.indexOf(status);

    return (
      <div className="mt-6">
        <div className="relative flex justify-between">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 z-0"></div>
          <div
            className="absolute top-1/2 left-0 h-1 bg-brand-500 -translate-y-1/2 z-0 transition-all duration-500"
            style={{ width: `${(Math.max(0, currentIdx) / (steps.length - 1)) * 100}%` }}
          ></div>
          {steps.map((stepName, idx) => {
            const isCompletedStep = idx <= currentIdx;
            const isActiveStep = idx === currentIdx;
            return (
              <div key={stepName} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isActiveStep
                      ? "bg-brand-600 text-white ring-4 ring-brand-100 scale-110"
                      : isCompletedStep
                      ? "bg-brand-500 text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {isCompletedStep ? "✓" : idx + 1}
                </div>
                <span className={`text-[10px] mt-2 font-bold uppercase tracking-wider ${isCompletedStep ? "text-brand-800" : "text-gray-400"}`}>
                  {stepName}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Loader
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
          <p className="text-gray-600 font-medium">Checking for existing payout record...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-brand-600 to-purple-700 text-white px-6 py-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/15 hover:bg-black/25 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-white/70 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold tracking-tight">Refund Payout Portal</h2>
              <p className="text-xs text-white/80 mt-0.5">Secure bank/UPI transfer details</p>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl px-4 py-3 mt-4 flex items-center justify-between border border-white/10">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Refundable Amount</p>
              <p className="text-xl font-black">₹{(order.returnRefundAmount || 0).toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Order ID</p>
              <p className="text-sm font-mono font-bold text-white/95">{order.orderId}</p>
            </div>
          </div>
        </div>

        {/* Step: Form Input */}
        {step === "FORM" && (
          <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Refund Payout Option</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRefundMethod("UPI")}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-bold transition-all ${
                    refundMethod === "UPI"
                      ? "border-brand-600 bg-brand-50/50 text-brand-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  UPI ID
                </button>
                <button
                  type="button"
                  onClick={() => setRefundMethod("BANK_ACCOUNT")}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-bold transition-all ${
                    refundMethod === "BANK_ACCOUNT"
                      ? "border-brand-600 bg-brand-50/50 text-brand-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
                >
                  <Landmark className="w-4 h-4" />
                  Bank Account
                </button>
              </div>
            </div>

            {/* Common Fields */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">Account Holder Name *</label>
                <input
                  type="text"
                  required
                  placeholder="As registered in bank/UPI profile"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-gray-800 font-medium"
                />
              </div>

              {/* Method-Specific Fields */}
              {refundMethod === "UPI" ? (
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">UPI ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. accountname@okaxis, name@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    onBlur={() => setUpiId(upiId.trim().toLowerCase())}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-gray-800 font-mono font-medium"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 block mb-1">Bank Account Number *</label>
                    <div className="relative">
                      <input
                        type={showAccountNumber ? "text" : "password"}
                        required
                        placeholder="Enter account number"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                        maxLength={18}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-gray-800 font-mono font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAccountNumber(!showAccountNumber)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-semibold"
                      >
                        {showAccountNumber ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 block mb-1">Confirm Bank Account Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="Re-enter account number to validate"
                      value={confirmAccountNumber}
                      onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ""))}
                      maxLength={18}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-gray-800 font-mono font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">IFSC Code *</label>
                      <input
                        type="text"
                        required
                        placeholder="SBIN0001234"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                        onBlur={(e) => {
                          const trimmed = e.target.value.trim();
                          setIfscCode(trimmed);
                          setIfscError(validateIfscCode(trimmed));
                        }}
                        maxLength={11}
                        pattern="^[A-Za-z]{4}0[A-Za-z0-9]{6}$"
                        title="IFSC code must be 11 characters (e.g. SBIN0001234), with 4 letters, followed by a 0, then 6 letters or digits."
                        className={`w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-gray-800 font-mono uppercase font-medium ${
                          ifscError ? "border-rose-400 focus:ring-rose-200" : "border-gray-200"
                        }`}
                      />
                      {ifscError && (
                        <p className="text-[10px] text-rose-500 mt-1 font-semibold leading-normal">
                          {ifscError}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">Bank Name (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC Bank"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-gray-800 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Optional Contact Fields for Alerts */}
              <div className="border-t border-gray-100 pt-3 mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">Mobile for Alerts</label>
                  <input
                    type="text"
                    placeholder="Alert phone number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-gray-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">Email for Alerts</label>
                  <input
                    type="email"
                    placeholder="Alert email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-gray-800"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-primary hover:opacity-90 text-primary-foreground font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-100 transition-all active:scale-[0.98]"
              >
                Proceed to Verification
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Step: Confirmation */}
        {step === "CONFIRM" && (
          <div className="p-6 space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-900 text-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-bold">Verify details carefully</p>
                <p className="mt-0.5 leading-relaxed text-amber-800">
                  Ensure the name and account/UPI ID match exactly. Mismatches can cause bank rejections or transfer errors.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-150 space-y-4">
              <h3 className="font-bold text-gray-800 text-sm border-b border-gray-200 pb-2">Verification Preview</h3>
              
              <div className="grid grid-cols-3 gap-y-3 text-xs">
                <div className="text-gray-400 font-bold uppercase tracking-wider">Method</div>
                <div className="col-span-2 text-gray-800 font-black">{refundMethod === "UPI" ? "📱 UPI Transfer" : "🏦 Bank Account"}</div>
                
                <div className="text-gray-400 font-bold uppercase tracking-wider">Holder Name</div>
                <div className="col-span-2 text-gray-800 font-semibold">{accountHolderName}</div>
                
                {refundMethod === "UPI" ? (
                  <>
                    <div className="text-gray-400 font-bold uppercase tracking-wider">UPI ID</div>
                    <div className="col-span-2 font-mono font-bold text-gray-900">{upiId}</div>
                  </>
                ) : (
                  <>
                    <div className="text-gray-400 font-bold uppercase tracking-wider">Account No.</div>
                    <div className="col-span-2 font-mono font-bold text-gray-900">
                      {accountNumber.slice(0, 3) + "****" + accountNumber.slice(-4)}
                    </div>
                    
                    <div className="text-gray-400 font-bold uppercase tracking-wider">IFSC Code</div>
                    <div className="col-span-2 font-mono font-bold text-gray-900">{ifscCode}</div>

                    {bankName && (
                      <>
                        <div className="text-gray-400 font-bold uppercase tracking-wider">Bank Name</div>
                        <div className="col-span-2 text-gray-800">{bankName}</div>
                      </>
                    )}
                  </>
                )}

                {mobile && (
                  <>
                    <div className="text-gray-400 font-bold uppercase tracking-wider">Mobile</div>
                    <div className="col-span-2 text-gray-700">{mobile}</div>
                  </>
                )}
                {email && (
                  <>
                    <div className="text-gray-400 font-bold uppercase tracking-wider">Email</div>
                    <div className="col-span-2 text-gray-700">{email}</div>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStep("FORM")}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Edit className="w-4 h-4" />
                Change
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="bg-primary hover:opacity-90 disabled:bg-brand-400 text-primary-foreground py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-100 active:scale-95 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirm Submit
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step: Status Tracking */}
        {step === "STATUS" && refundStatusRecord && (
          <div className="p-6 space-y-6">
            <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5 text-center">
              <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-3 text-brand-600">
                {refundStatusRecord.refundStatus === "COMPLETED" ? (
                  <CheckCircle className="w-7 h-7" />
                ) : refundStatusRecord.refundStatus === "FAILED" || refundStatusRecord.refundStatus === "REJECTED" ? (
                  <AlertCircle className="w-7 h-7 text-red-500" />
                ) : (
                  <Clock className="w-7 h-7" />
                )}
              </div>
              <h3 className="font-black text-brand-900 text-lg">
                Payout is {refundStatusRecord.refundStatus.toUpperCase()}
              </h3>
              <p className="text-xs text-brand-700 mt-1 leading-relaxed">
                {refundStatusRecord.refundStatus === "PENDING" && "We have received your details. Our administrative team will verify and authorize this payout shortly."}
                {refundStatusRecord.refundStatus === "APPROVED" && "Details verified. Payout queue request initialized."}
                {refundStatusRecord.refundStatus === "PROCESSING" && "Transfer is in progress. The bank is currently executing the payout."}
                {refundStatusRecord.refundStatus === "COMPLETED" && "Refund amount successfully remitted to your bank account."}
                {refundStatusRecord.refundStatus === "FAILED" && `Transfer failed: ${refundStatusRecord.failureReason || "System error"}`}
                {refundStatusRecord.refundStatus === "REJECTED" && `Details rejected: ${refundStatusRecord.remarks || "Invalid details supplied"}`}
                {refundStatusRecord.refundStatus === "CANCELLED" && "This refund request has been cancelled."}
              </p>

              {/* If failed or pending, customer is allowed to update details */}
              {(refundStatusRecord.refundStatus === "PENDING" || refundStatusRecord.refundStatus === "FAILED") && (
                <button
                  onClick={() => setStep("FORM")}
                  className="mt-4 inline-flex items-center gap-2 bg-white hover:bg-gray-50 border border-brand-200 text-brand-700 font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Payout Details
                </button>
              )}
            </div>

            {/* Render Horizontal Timeline */}
            {renderStatusTracker(refundStatusRecord.refundStatus)}

            {/* Detail Summary */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-gray-400 font-bold uppercase">Method</span>
                <span className="text-gray-700 font-bold">
                  {refundStatusRecord.refundMethod === "UPI" ? "📱 UPI" : "🏦 Bank Account"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-bold uppercase">Account Holder</span>
                <span className="text-gray-700 font-semibold">{refundStatusRecord.accountHolderNameMasked}</span>
              </div>
              
              {refundStatusRecord.refundMethod === "UPI" ? (
                <div className="flex justify-between">
                  <span className="text-gray-400 font-bold uppercase">UPI ID</span>
                  <span className="text-gray-700 font-mono font-semibold">{refundStatusRecord.upiIdMasked}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-bold uppercase">Account No.</span>
                    <span className="text-gray-700 font-mono font-semibold">{refundStatusRecord.accountNumberMasked}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-bold uppercase">IFSC Code</span>
                    <span className="text-gray-700 font-mono font-semibold">{refundStatusRecord.ifscCode}</span>
                  </div>
                </>
              )}
              {refundStatusRecord.remarks && (
                <div className="border-t border-gray-150 pt-2 mt-2">
                  <p className="text-gray-400 font-bold uppercase mb-0.5">Admin Remarks</p>
                  <p className="text-gray-600 leading-normal">{refundStatusRecord.remarks}</p>
                </div>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl transition-all"
              >
                Close Portal
              </button>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 py-3 text-center text-[10px] text-gray-400 font-medium">
          🔒 Secure 256-bit AES authenticated encryption. Details are strictly private.
        </div>
      </div>
    </div>
  );
};

// Export Loader2 so the file compiles fine without needing to resolve loader separately
const Loader2 = ({ className }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export default RefundPayoutForm;
