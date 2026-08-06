import React from "react";
import { ChevronLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@core/context/SettingsContext";

const PrivacyPage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const appName = settings?.appName || "eAnnadata canteen";

  return (
    <div className="min-h-screen bg-[#fcfaff] font-['Outfit'] pb-12 relative overflow-hidden">
      {/* Elegant Ambient Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-slate-100/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-slate-50/50 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center gap-4 border-b border-slate-100 shadow-xs">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-slate-100 active:scale-95 transition-all text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200 shadow-2xs"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Seller Privacy Policy
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Data protection
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-w-3xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl p-8 shadow-[0_30px_80px_rgba(0,0,0,0.02)] border border-slate-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shadow-sm">
                <Shield size={26} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Privacy Policy
                </h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Last updated: June 2026
                </p>
              </div>
            </div>

            <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-6 leading-relaxed">
              <p className="font-medium text-slate-700">
                At {appName}, we are committed to protecting the privacy and security of your business and personal data. This policy outlines how we collect, store, process, and protect seller information.
              </p>

              <div className="space-y-3">
                <h3 className="text-slate-900 font-black text-base tracking-tight uppercase border-l-4 border-slate-900 pl-3">
                  1. Information We Collect
                </h3>
                <p>
                  We collect business details including business name, email, phone number, physical address, and documents (Trade License, GST Certificate, ID Proofs). We also collect bank details and payout records to process payments.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-slate-900 font-black text-base tracking-tight uppercase border-l-4 border-slate-900 pl-3">
                  2. Use of Information
                </h3>
                <p>
                  We use your details to verify your seller account application, set up your storefront, route customer orders, display your shop location to nearby customers, process earnings payouts, and detect or prevent fraudulent activity.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-slate-900 font-black text-base tracking-tight uppercase border-l-4 border-slate-900 pl-3">
                  3. Security & Integrity
                </h3>
                <p>
                  All uploaded documents and business files are stored securely with restricted access. Payout details are processed via secure encryption. We use industry-standard precautions to prevent unauthorized access or disclosure of your data.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-slate-900 font-black text-base tracking-tight uppercase border-l-4 border-slate-900 pl-3">
                  4. Sharing of Information
                </h3>
                <p>
                  We do not sell or rent seller information. We share your business name and storefront location with customers to enable order placing. Essential delivery details are shared with designated delivery agents to facilitate order pickup and delivery.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-slate-900 font-black text-base tracking-tight uppercase border-l-4 border-slate-900 pl-3">
                  5. Updates & Access
                </h3>
                <p>
                  Sellers have the right to access and update their profile details through the seller dashboard. For queries regarding account closure or complete data removal, please contact our support team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
