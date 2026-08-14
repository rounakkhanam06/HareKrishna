import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    MapPin, Package, CreditCard, Wallet, ChevronRight, ChevronLeft,
    LogOut, ShieldCheck, Heart, HelpCircle, Info, Bell,
    Settings, BookOpen, Building2
} from 'lucide-react';
import { useAuth } from '@core/context/AuthContext';
import { useSettings } from '@core/context/SettingsContext';
import { customerApi } from '../services/customerApi';
import { toast } from 'sonner';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';
import {
    describePushSupport,
    ensureFcmTokenRegistered,
    startForegroundPushListener
} from '@core/firebase/pushClient';

const TEST_PUSH_STATUS_POLL_INTERVAL_MS = 1500;
const TEST_PUSH_STATUS_MAX_ATTEMPTS = 20;

const ProfilePage = () => {
    const navigate = useNavigate();
    const { user, role, logout } = useAuth();
    const { settings } = useSettings();
    const appName = settings?.appName || 'HareKrishna';
    const [isTestingPush, setIsTestingPush] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Profile State
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const formatIndiaPhone = (value) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        if (raw.startsWith('+91')) return raw.replace(/^\+91[\s-]*/, '');
        if (raw.startsWith('91') && raw.length >= 12) return raw.replace(/^91[\s-]*/, '');
        return raw;
    };

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const waitForTestPushResult = async (orderId) => {
        for (let attempt = 0; attempt < TEST_PUSH_STATUS_MAX_ATTEMPTS; attempt += 1) {
            const statusRes = await customerApi.getTestPushNotificationStatus(orderId);
            const result = statusRes?.data?.result || {};
            const status = String(result.status || '').trim().toLowerCase();
            if (status === 'sent' || status === 'failed') return result;
            if (attempt < TEST_PUSH_STATUS_MAX_ATTEMPTS - 1) await wait(TEST_PUSH_STATUS_POLL_INTERVAL_MS);
        }
        return null;
    };

    const handleTestPush = async () => {
        if (isTestingPush) return;
        setIsTestingPush(true);
        try {
            const support = describePushSupport();
            if (!support.supported) throw new Error(support.message || 'Push notifications are not supported.');
            await ensureFcmTokenRegistered({ role, platform: 'web' });
            await startForegroundPushListener();
            const res = await customerApi.testPushNotification();
            const orderId = res?.data?.result?.orderId || '';
            if (!orderId) { toast.success('Test push triggered'); return; }
            const statusResult = await waitForTestPushResult(orderId);
            if (!statusResult) { toast.message(`Test push processing (${orderId})`); return; }
            if (statusResult.status === 'sent') { toast.success(`Test push sent (${orderId})`); return; }
            toast.error(`Test push failed (${orderId})`, { description: String(statusResult.failureReason || 'Delivery failed.') });
        } catch (error) {
            toast.error('Failed to trigger test push', { description: error?.response?.data?.message || error?.message });
        } finally {
            setIsTestingPush(false);
        }
    };

    // Fetch dynamic profile on mount
    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                setLoading(true);
                const res = await customerApi.getProfile();
                if (res.data?.success) setProfile(res.data.result);
            } catch (err) {
                console.error('Error fetching profile details:', err);
                toast.error('Failed to sync profile data.');
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, []);

    const activeUser = profile || user;

    const name = activeUser?.['Farmer Name'] || activeUser?.name || 'Customer';
    const cardNo = activeUser?.['eAnnadata Card Number'] || activeUser?.eannadata_card_number || '—';
    const hasCard = !!(activeUser?.['eAnnadata Card Number'] || activeUser?.eannadata_card_number);
    const phone = formatIndiaPhone(activeUser?.['Mobile No'] || activeUser?.phone || '');
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}&backgroundColor=f1f5f9`;

    // Stats — use real data if available, fallback to 0
    const totalSubsidy = activeUser?.totalSubsidy ?? activeUser?.subsidyAmount ?? 0;
    const orderCount   = activeUser?.orderCount ?? activeUser?.totalOrders ?? 0;
    const dbtSubsidy   = activeUser?.dbtSubsidy ?? 0;
    const pendingSubsidy = activeUser?.pendingSubsidy ?? 0;

    const menuItems = [
        { icon: MapPin,    label: 'My Addresses',      path: '/addresses' },
        { icon: Wallet,    label: activeUser?.walletBalance !== undefined ? `Wallet (₹${activeUser.walletBalance})` : 'Wallet', path: '/wallet' },
        { icon: Package,   label: 'My Orders',         path: '/orders' },
        { icon: Heart,     label: 'Wishlist',          path: '/wishlist' },

        { icon: HelpCircle, label: 'Help & Support',   path: '/support' },
        { icon: Settings,  label: 'Profile Settings',  path: '/profile/edit' },
    ];

    return (
        <div className="min-h-screen bg-white pb-24 font-sans">
            <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 border-b border-slate-100/80 flex items-center justify-between px-4 pt-5 pb-3">
                <button
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 flex items-center justify-center"
                >
                    <ChevronLeft size={26} className="text-slate-800" />
                </button>
                <h1 className="text-[17px] font-bold text-slate-900">MY Profile</h1>
                <button
                    onClick={handleTestPush}
                    disabled={isTestingPush}
                    className="w-9 h-9 flex items-center justify-center relative"
                >
                    <Bell size={22} className="text-slate-800" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
                </button>
            </div>

            {/* User Identity Card */}
            <div className="mx-4 mt-2 mb-4 bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4 flex items-center gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 flex-shrink-0">
                    <img src={applyCloudinaryTransform(avatarUrl, "f_auto,q_auto,w_150,h_150,c_fill")} alt={name} className="w-full h-full object-cover" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h2 className="text-[16px] font-bold text-slate-900 leading-tight">{name}</h2>
                    {hasCard && (
                        <>
                            <p className="text-[12px] text-slate-500 font-medium mt-0.5">
                                eAnnadata Card No.
                            </p>
                            <p className="text-[13px] font-bold text-[#1a8a3c] tracking-wide mt-0.5">
                                {cardNo}
                            </p>
                        </>
                    )}
                    {phone && (
                        <p className="text-[12px] text-slate-600 font-medium mt-1 flex items-center gap-1">
                            <span className="text-slate-400">📱</span>
                            +91 {phone}
                        </p>
                    )}
                </div>
            </div>



            {/* My Activity */}
            <div className="mx-4 mt-6">
                <h2 className="text-[15px] font-bold text-slate-900 mb-3">My Activity</h2>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
                    {menuItems.map(({ icon: Icon, label, path }) => (
                        <Link
                            key={label}
                            to={path}
                            className="flex items-center justify-between px-4 py-4 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center bg-slate-50">
                                    <Icon size={18} className="text-slate-600" />
                                </div>
                                <span className="text-[14px] font-medium text-slate-800">{label}</span>
                            </div>
                            <ChevronRight size={18} className="text-slate-400" />
                        </Link>
                    ))}

                    {/* Logout */}
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="w-full flex items-center justify-between px-4 py-4 hover:bg-red-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center bg-slate-50">
                                <LogOut size={18} className="text-slate-600" />
                            </div>
                            <span className="text-[14px] font-medium text-slate-800">Logout</span>
                        </div>
                        <ChevronRight size={18} className="text-slate-400" />
                    </button>
                </div>
            </div>

            <div className="text-center mt-6 pb-4">
                <p className="text-[10px] text-slate-400">Version 2.4.0 · {appName}</p>
            </div>

            {/* Logout Confirmation Modal Overlay */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="w-full max-w-[320px] bg-white rounded-3xl p-6 shadow-2xl border border-slate-100/50 animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
                                <LogOut size={22} />
                            </div>
                            <h3 className="text-base font-black text-slate-900 mb-1">Confirm Logout</h3>
                            <p className="text-xs font-semibold text-slate-500 mb-6 leading-relaxed">
                                Are you sure you want to log out of your account?
                            </p>
                            <div className="flex w-full gap-3">
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={() => {
                                        setShowLogoutConfirm(false);
                                        logout();
                                    }}
                                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-rose-600/10"
                                >
                                    LOGOUT
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default ProfilePage;
