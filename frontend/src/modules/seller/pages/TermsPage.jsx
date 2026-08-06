import React from "react";
import { ChevronLeft, ScrollText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@core/context/SettingsContext";

const TermsPage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const appName = settings?.appName || "eAnnadata canteen";
  const companyName = settings?.companyName || appName;

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
              Seller Terms & Conditions
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Partnership Agreement
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-w-3xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl p-8 shadow-[0_30px_80px_rgba(0,0,0,0.02)] border border-slate-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shadow-sm">
                <ScrollText size={26} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Seller Agreement
                </h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Last updated: June 2026
                </p>
              </div>
            </div>

            <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-6 leading-relaxed">
              <p className="font-medium text-slate-700">
                Welcome to the {appName} partner network. By registering as a seller on our platform, you agree to comply with and be bound by the following Seller Terms & Conditions. Please read them carefully.
              </p>

              <div className="space-y-3">
                <h3 className="text-slate-900 font-black text-base tracking-tight uppercase border-l-4 border-slate-900 pl-3">
                  1. Seller Eligibility & Registration
                </h3>
                <p>
                  To register as a seller, you must own or operate a valid store/canteen and provide accurate business information, including valid registration details, trade licenses, tax identifiers, and contact details. You agree to upload authentic documents during the application process and keep this information updated at all times.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-slate-900 font-black text-base tracking-tight uppercase border-l-4 border-slate-900 pl-3">
                  2. Product Compliance & Listings
                </h3>
                <p>
                  Sellers are solely responsible for all products listed under their profile. You warrant that all listed items are fresh, safe, compliant with local food safety laws, and match their descriptions. Listing prohibited, expired, or counterfeit goods will result in immediate suspension.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-slate-900 font-black text-base tracking-tight uppercase border-l-4 border-slate-900 pl-3">
                  3. Pricing, Orders & Fulfillment
                </h3>
                <p>
                  You agree to fulfill orders received through the platform promptly. Prices listed must be inclusive of all applicable taxes unless stated otherwise. If an order cannot be fulfilled due to stock shortages, the seller must cancel or update the order status immediately to trigger customer refund flows.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-slate-900 font-black text-base tracking-tight uppercase border-l-4 border-slate-900 pl-3">
                  4. Platform Fees & Commission
                </h3>
                <p>
                  {companyName} charges a platform commission or subscription fee on transactions completed through the app, as agreed upon during setup. Settlement cycles and payout schedules will run according to your plan configuration.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-slate-900 font-black text-base tracking-tight uppercase border-l-4 border-slate-900 pl-3">
                  5. Suspension & Termination
                </h3>
                <p>
                  We reserve the right to suspend or permanently terminate seller accounts due to fraudulent behavior, poor quality ratings, late order processing, or violations of any section of this agreement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
