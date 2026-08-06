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
              Delivery Partner Terms & Conditions
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Rider Agreement
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
                  Rider Partner Agreement
                </h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Last updated: June 2026
                </p>
              </div>
            </div>

            <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-6 leading-relaxed">
              <p className="font-medium text-slate-700">
                Welcome to the {appName} delivery partner network. By registering as a delivery partner (rider) on our platform, you agree to comply with and be bound by the following Rider Terms & Conditions. Please read them carefully.
              </p>

              <h3 className="text-slate-800 font-black text-base mt-6">1. Delivery Standards</h3>
              <p>
                Riders are expected to deliver canteen orders safely, cleanly, and on time. You must maintain professional behaviour with customers and canteen staff at all times.
              </p>

              <h3 className="text-slate-800 font-black text-base mt-6">2. Safety and Vehicle Integrity</h3>
              <p>
                You must possess a valid driving license (if using a motor vehicle) and valid registration documents. Wearing protective gear like helmets is mandatory during all deliveries.
              </p>

              <h3 className="text-slate-800 font-black text-base mt-6">3. Payout and Cash Settlement</h3>
              <p>
                Earnings will be credited weekly or daily depending on the scheme. You must settle any cash collected on delivery within the specified limits.
              </p>

              <h3 className="text-slate-800 font-black text-base mt-6">4. GPS and Location Tracking</h3>
              <p>
                You consent to the application tracking your location in real-time during active delivery periods to offer live tracking functionality to customers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
