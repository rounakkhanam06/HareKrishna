import React from 'react';
import { useLocation } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';
import { ExternalLink, Store, ShieldCheck, BadgeCheck } from 'lucide-react';
import { FaHandshake } from 'react-icons/fa6';

const MobileFooterMessage = () => {
    const location = useLocation();
    const { settings } = useSettings();
    const appName = settings?.appName || 'eAnnadata canteen';
    const isHomePage = location.pathname === '/';
    return (
        <div className="md:hidden w-full flex flex-col items-center -mt-20 pt-0 pb-28 px-4 bg-transparent">
            {/* Registration & Partner Portals Section for Mobile (Light Theme) */}
            {isHomePage && (
                <div className="w-full mb-8 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-md text-left">
                    <h3 className="text-slate-900 font-bold text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
                        <span className="h-1.5 w-4 bg-emerald-600 rounded-full"></span>
                        Registration & Partner Portals
                    </h3>
                    <p className="text-[11px] text-slate-500 mb-4">
                        Direct links to register as a partner, canteen, or care center operator.
                    </p>
                <div className="flex flex-col gap-2.5">
                    <a
                        href="https://eannadata.in/Customer/PartnerRegistration"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-950 active:scale-98 transition-all shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <FaHandshake size={16} />
                            </div>
                            <span className="font-bold text-xs text-emerald-950">Service Partner Registration</span>
                        </div>
                        <ExternalLink size={14} className="text-emerald-600" />
                    </a>

                    <a
                        href="https://eannadata.in/Customer/CanteenRegistration"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/80 text-amber-950 active:scale-98 transition-all shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <Store size={16} />
                            </div>
                            <span className="font-bold text-xs text-amber-950">Canteen Registration</span>
                        </div>
                        <ExternalLink size={14} className="text-amber-600" />
                    </a>

                    <a
                        href="https://eannadata.in/Customer/FhcRegistration"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-rose-50/80 hover:bg-rose-100/80 border border-rose-200/80 text-rose-950 active:scale-98 transition-all shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <ShieldCheck size={16} />
                            </div>
                            <span className="font-bold text-xs text-rose-950">Care Center Registration</span>
                        </div>
                        <ExternalLink size={14} className="text-rose-600" />
                    </a>

                    <a
                        href="https://eannadata.in/Customer/FarmerReg"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 text-blue-950 active:scale-98 transition-all shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <BadgeCheck size={16} />
                            </div>
                            <span className="font-bold text-xs text-blue-950">eAnnadata Card Registration</span>
                        </div>
                        <ExternalLink size={14} className="text-blue-600" />
                    </a>
                </div>
            </div>
            )}

            <div className="w-full flex flex-col">
                <h2 className="text-[38px] leading-[1.1] font-black text-slate-300 tracking-tight text-left">
                    India's last<br />minute app <span className="text-red-500">❤️</span>
                </h2>

                <div className="w-full h-[1px] bg-slate-200 mt-6 mb-4"></div>

                <div className="text-slate-300 font-black text-2xl tracking-tighter text-left">
                    {appName}
                </div>
            </div>
        </div>
    );
};

export default MobileFooterMessage;
