import React from "react";
import { ChevronLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@core/context/SettingsContext";

const PrivacyPage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const appName = settings?.appName || "HareKrishna";

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
              Delivery Partner Privacy Policy
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
                  Rider Privacy Policy
                </h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Last updated: June 2026
                </p>
              </div>
            </div>

            <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-6 leading-relaxed">
              <p className="font-medium text-slate-700">
                At {appName}, we are committed to protecting the privacy and security of your personal, vehicle, and location data. This policy outlines how we collect, store, process, and protect delivery partner information.
              </p>

              <h3 className="text-slate-800 font-black text-base mt-6">1. Information Collection</h3>
              <p>
                We collect registration details, including your name, contact information, banking details, vehicle details, and government-issued identification documents (DL, PAN, Aadhar).
              </p>

              <h3 className="text-slate-800 font-black text-base mt-6">2. Location Data</h3>
              <p>
                To coordinate deliveries, track orders, and calculate routes, we track and store your real-time location data when you are online in the delivery app.
              </p>

              <h3 className="text-slate-800 font-black text-base mt-6">3. Use of Information</h3>
              <p>
                Collected data is used for verification purposes, routing optimization, payout processing, system support, and ensuring compliance with our delivery standards.
              </p>

              <h3 className="text-slate-800 font-black text-base mt-6">4. Data Sharing and Protection</h3>
              <p>
                We do not sell your personal data. Location data is shared with customers tracking their orders and is protected under robust industry-standard security measures.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
