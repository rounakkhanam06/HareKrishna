import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail, MapPin, Phone, ExternalLink, Store, ShieldCheck, BadgeCheck, Contact2 } from 'lucide-react';
import { FaHandshake } from 'react-icons/fa6';
import Logo from '@/assets/Logo.png';
import { useSettings } from '@core/context/SettingsContext';

const Footer = () => {
    const { settings } = useSettings();
    const logoUrl = settings?.logoUrl || Logo;
    const primaryColor = settings?.primaryColor || 'var(--primary)';

    return (
        <footer className="relative bg-[#1e4836] pt-20 pb-10 mt-20 text-slate-300 md:pt-32 md:pb-16 md:mt-32 overflow-hidden">
            {/* Subtle Texture/Glow Overlay */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-30 blur-[150px]" style={{ backgroundColor: primaryColor }} />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full opacity-20 blur-[150px]" style={{ backgroundColor: primaryColor }} />
            </div>

            {/* Top Curved Divider */}
            <div className="absolute top-[-1px] left-0 w-full overflow-hidden leading-[0]">
                <svg className="relative block w-[calc(100%+1.3px)] h-[25px] md:h-[60px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                    <path d="M0,0 Q600,120 1200,0 V0 H0 Z" className="fill-white"></path>
                </svg>
            </div>

            <div className="container mx-auto px-4 z-10 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-16">

                    {/* Brand Info */}
                    <div className="space-y-4 md:space-y-8">
                        <div className="flex items-center">
                            <img src={logoUrl} alt={`${settings?.appName || 'eAnnadata canteen'} Logo`} loading="lazy" className="h-16 md:h-20 w-auto object-contain rounded-full ml-4" />
                        </div>
                        <p className="text-sm leading-relaxed md:text-base md:leading-loose text-white/90 md:max-w-xs transition-opacity hover:opacity-100 font-medium">
                            Your daily dose of fresh, organic, and healthy products delivered straight to your door. Freshness guaranteed.
                        </p>
                        <div className="flex gap-4">
                            {settings?.facebook && <a href={settings.facebook} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 text-white rounded-full transition-all group active:scale-95 hover:opacity-90"><Facebook size={18} /></a>}
                            {settings?.twitter && <a href={settings.twitter} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 text-white rounded-full transition-all group active:scale-95 hover:opacity-90"><Twitter size={18} /></a>}
                            {settings?.instagram && <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 text-white rounded-full transition-all group active:scale-95 hover:opacity-90"><Instagram size={18} /></a>}
                            {settings?.youtube && <a href={settings.youtube} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 text-white rounded-full transition-all group active:scale-95 hover:opacity-90"><Youtube size={18} /></a>}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="md:pt-4">
                        <h3 className="text-white font-bold text-lg mb-4 md:text-xl md:font-black md:uppercase md:tracking-widest md:mb-8 flex items-center gap-2">
                            <span className="h-1 w-4 hidden md:block" style={{ backgroundColor: primaryColor }}></span> Quick Links
                        </h3>
                        <ul className="space-y-2 md:space-y-4">
                            <li><a href="#" className="hover:text-brand-300 transition-colors md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>Home</a></li>
                            <li><a href="#" className="hover:text-brand-300 transition-colors md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>About Us</a></li>
                            <li><a href="#" className="hover:text-brand-300 transition-colors md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>Shop</a></li>
                            <li><a href="#" className="hover:text-brand-300 transition-colors md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>Blogs</a></li>
                            <li><a href="#" className="hover:text-brand-300 transition-colors md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>Contact</a></li>
                        </ul>
                    </div>

                    {/* Categories */}
                    <div className="md:pt-4">
                        <h3 className="text-white font-bold text-lg mb-4 md:text-xl md:font-black md:uppercase md:tracking-widest md:mb-8 flex items-center gap-2">
                            <span className="h-1 w-4 hidden md:block" style={{ backgroundColor: primaryColor }}></span> Categories
                        </h3>
                        <ul className="space-y-2 md:space-y-4">
                            <li><a href="#" className="hover:text-brand-300 transition-colors md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>Fruits & Vegetables</a></li>
                            <li><a href="#" className="hover:text-brand-300 transition-colors md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>Dairy Products</a></li>
                            <li><a href="#" className="hover:text-brand-300 transition-colors md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>Meat & Fish</a></li>
                            <li><a href="#" className="hover:text-brand-300 transition-colors md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>Bakery & Snacks</a></li>
                            <li><a href="#" className="hover:text-brand-300 transition-colors md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>Beverages</a></li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div className="md:pt-4">
                        <h3 className="text-white font-bold text-lg mb-4 md:text-xl md:font-black md:uppercase md:tracking-widest md:mb-8 flex items-center gap-2">
                            <span className="h-1 w-4 hidden md:block" style={{ backgroundColor: primaryColor }}></span> Contact Us
                        </h3>
                        <ul className="space-y-4 md:space-y-6">
                            <li className="flex items-start gap-3 md:gap-5 group">
                                <div className="hidden md:flex h-12 w-12 rounded-xl bg-white/10 items-center justify-center text-white transition-all shrink-0 group-hover:opacity-90"><MapPin size={22} /></div>
                                <MapPin className="mt-1 shrink-0 md:hidden" size={18} style={{ color: primaryColor }} />
                                <span className="md:text-base text-white md:pt-1 font-medium">{settings?.address || '—'}</span>
                            </li>
                            <li className="flex items-center gap-3 md:gap-5 group">
                                <div className="hidden md:flex h-12 w-12 rounded-xl bg-white/10 items-center justify-center text-white transition-all shrink-0 group-hover:opacity-90"><Phone size={22} /></div>
                                <Phone className="shrink-0 md:hidden" size={18} style={{ color: primaryColor }} />
                                <span className="md:text-base text-white font-medium">{settings?.supportPhone || '—'}</span>
                            </li>
                            <li className="flex items-center gap-3 md:gap-5 group">
                                <div className="hidden md:flex h-12 w-12 rounded-xl bg-white/10 items-center justify-center text-white transition-all shrink-0 group-hover:opacity-90"><Mail size={22} /></div>
                                <Mail className="shrink-0 md:hidden" size={18} style={{ color: primaryColor }} />
                                <span className="md:text-base text-white font-medium">{settings?.supportEmail || '—'}</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Partner & Registration Portals Banner */}
                <div className="mt-12 md:mt-16 pt-8 border-t border-white/10">
                    <div className="text-center md:text-left mb-6 md:mb-8">
                        <h3 className="text-white font-bold text-lg md:text-xl uppercase tracking-wider flex items-center justify-center md:justify-start gap-2">
                            <span className="h-1.5 w-6 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                            Registration & Partner Portals
                        </h3>
                        <p className="text-xs md:text-sm text-white/70 mt-1">
                            Direct links to join our network as a partner, canteen, or care center operator.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                        {/* Service Partner Registration */}
                        <a
                            href="https://eannadata.in/Customer/PartnerRegistration"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/20 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-emerald-950/40 active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="h-10 w-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                                    <FaHandshake size={20} />
                                </div>
                                <div className="truncate">
                                    <span className="block text-white font-bold text-sm md:text-base group-hover:text-emerald-300 transition-colors truncate">
                                        Service Partner Registration
                                    </span>
                                    <span className="block text-[11px] text-emerald-200/70 font-medium">Click to register</span>
                                </div>
                            </div>
                            <ExternalLink size={16} className="text-emerald-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-2" />
                        </a>

                        {/* Canteen Registration */}
                        <a
                            href="https://eannadata.in/Customer/CanteenRegistration"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/20 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-amber-950/40 active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="h-10 w-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                                    <Store size={20} />
                                </div>
                                <div className="truncate">
                                    <span className="block text-white font-bold text-sm md:text-base group-hover:text-amber-300 transition-colors truncate">
                                        Canteen Registration
                                    </span>
                                    <span className="block text-[11px] text-amber-200/70 font-medium">Click to register</span>
                                </div>
                            </div>
                            <ExternalLink size={16} className="text-amber-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-2" />
                        </a>

                        {/* Care Center Registration */}
                        <a
                            href="https://eannadata.in/Customer/FhcRegistration"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-500/30 hover:border-rose-400 hover:bg-rose-500/20 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-rose-950/40 active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="h-10 w-10 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                                    <ShieldCheck size={20} />
                                </div>
                                <div className="truncate">
                                    <span className="block text-white font-bold text-sm md:text-base group-hover:text-rose-300 transition-colors truncate">
                                        Care Center Registration
                                    </span>
                                    <span className="block text-[11px] text-rose-200/70 font-medium">Click to register</span>
                                </div>
                            </div>
                            <ExternalLink size={16} className="text-rose-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-2" />
                        </a>

                        {/* eAnnadata Card Registration */}
                        <a
                            href="https://eannadata.in/Customer/FarmerReg"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 hover:border-blue-400 hover:bg-blue-500/20 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-blue-950/40 active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="h-10 w-10 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                                    <svg width="22" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="1" y="1" width="22" height="16" rx="3" stroke="currentColor" strokeWidth="2"/>
                                        <circle cx="7.5" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
                                        <path d="M4 14C4 11.8 5.6 11 7.5 11C9.4 11 11 11.8 11 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                        <line x1="14" y1="5.5" x2="20" y2="5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                        <line x1="13" y1="9" x2="20" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                        <line x1="13" y1="12.5" x2="18" y2="12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                    </svg>
                                </div>
                                <div className="truncate">
                                    <span className="block text-white font-bold text-sm md:text-base group-hover:text-blue-300 transition-colors truncate">
                                        eAnnadata Card Registration
                                    </span>
                                    <span className="block text-[11px] text-blue-200/70 font-medium">Click to register</span>
                                </div>
                            </div>
                            <ExternalLink size={16} className="text-blue-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-2" />
                        </a>
                    </div>
                </div>

                <div className="border-t border-white/10 mt-12 pt-8 text-center text-sm md:flex md:justify-between md:text-left md:mt-24 md:pt-12">
                    <p className="md:text-base text-white/60">&copy; {new Date().getFullYear()} {settings?.appName || 'eAnnadata canteen'}. All rights reserved.</p>
                    <div className="flex gap-6 justify-center md:justify-end mt-4 md:mt-0 md:gap-12">
                        <Link to="/privacy" className="hover:text-brand-300 md:text-base text-white/60 transition-all">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-brand-300 md:text-base text-white/60 transition-all">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;


