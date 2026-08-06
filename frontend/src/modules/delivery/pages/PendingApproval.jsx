import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Clock, 
  ShieldCheck, 
  FileText, 
  RefreshCw, 
  LogOut, 
  PhoneCall, 
  CheckCircle2, 
  AlertCircle,
  Truck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@core/context/AuthContext";
import { useSettings } from "@core/context/SettingsContext";
import { toast } from "sonner";

const PendingApproval = () => {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const { settings } = useSettings();
  const appName = settings?.appName || "eAnnadata Canteen";
  const [isChecking, setIsChecking] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      const updatedUser = await refreshUser();
      if (updatedUser?.isVerified) {
        toast.success("Congratulations! Your account has been approved!");
        navigate("/delivery/dashboard");
      } else {
        toast.info("Your application is still undergoing admin review. Please check back shortly.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to refresh status. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  const docChecklist = [
    { label: "Profile Photo", submitted: !!user?.profileImage },
    { label: "Driving License (DL)", submitted: !!user?.documents?.drivingLicense || !!user?.drivingLicenseNumber },
    { label: "Vehicle Registration (RC)", submitted: !!user?.documents?.vehicleRegistration || !!user?.vehicleRegistrationNumber },
    { label: "Aadhar Card / PAN", submitted: !!user?.documents?.aadhar || !!user?.documents?.pan },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6 max-w-md mx-auto font-sans">
      {/* Top Header */}
      <div className="pt-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Truck className="h-5 w-5" />
            </div>
            <span className="font-black text-slate-900 tracking-tight text-lg">eAnnadata canteen delivery</span>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all active:scale-95"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>

        {/* Hero Illustration Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col items-center text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-primary" />
          
          <div className="relative mb-4 mt-2">
            <div className="h-20 w-20 bg-amber-50 rounded-full flex items-center justify-center ring-8 ring-amber-50/50">
              <Clock className="h-10 w-10 text-amber-500 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-md border border-slate-100">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
          </div>

          <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">
            Application Under Review
          </h2>
          <p className="text-xs font-medium text-slate-500 leading-relaxed max-w-xs">
            Thank you for registering! Our admin team is currently verifying your documents. You will get full dashboard access once approved.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 px-3.5 py-1.5 rounded-full border border-amber-200/60 text-[11px] font-bold text-amber-800">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            Status: Pending Admin Approval
          </div>
        </motion.div>
      </div>

      {/* Submitted Documents Summary */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="my-6 space-y-3"
      >
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Verification Checklist
          </h3>
          <span className="text-[11px] font-bold text-slate-500">
            {docChecklist.filter(d => d.submitted).length}/{docChecklist.length} Submitted
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
          {docChecklist.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-none">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">{item.label}</span>
              </div>
              {item.submitted ? (
                <div className="flex items-center gap-1 text-emerald-600 text-[11px] font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Uploaded</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-amber-600 text-[11px] font-bold">
                  <AlertCircle className="h-4 w-4" />
                  <span>Pending</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Actions & Bottom Info */}
      <div className="pb-6 space-y-3">
        <button
          onClick={handleCheckStatus}
          disabled={isChecking}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2.5 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
          {isChecking ? "Checking Approval Status..." : "Check Approval Status"}
        </button>

        {(() => {
          const supportPhone = String(settings?.supportPhone || "").trim();
          const supportPhoneSanitized = supportPhone ? supportPhone.replace(/(?!^\+)[^\d]/g, "") : "";
          const supportPhoneHref = supportPhoneSanitized ? `tel:${supportPhoneSanitized}` : "";
          
          return supportPhoneHref ? (
            <a
              href={supportPhoneHref}
              className="bg-slate-100/70 p-4 rounded-2xl flex items-center gap-3 text-slate-600 hover:bg-slate-200/80 active:scale-[0.99] transition-all cursor-pointer block no-underline"
              aria-label={`Call support at ${settings?.supportPhone}`}
              title={`Call support: ${settings?.supportPhone}`}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-500">
                  <PhoneCall className="h-4 w-4 text-brand-600" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-900">Need Assistance?</p>
                  <p className="text-[10px] text-slate-500">
                    Call support at <span className="font-bold text-brand-600">{settings?.supportPhone}</span>
                  </p>
                </div>
              </div>
            </a>
          ) : (
            <div className="bg-slate-100/70 p-4 rounded-2xl flex items-center gap-3 text-slate-600">
              <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm text-slate-500">
                <PhoneCall className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-900">Need Assistance?</p>
                <p className="text-[10px] text-slate-500">Contact canteen admin support for quick verification.</p>
              </div>
            </div>
          );
        })()}
      </div>

      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full border border-gray-100 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-4">
                  <LogOut size={24} className="text-red-500" />
                </div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Confirm Logout</h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  Are you sure you want to log out from the delivery partner application?
                </p>
                <div className="flex gap-3 w-full mt-6">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all text-sm uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={logout}
                    className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all text-sm uppercase tracking-wider shadow-lg shadow-red-200"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PendingApproval;
