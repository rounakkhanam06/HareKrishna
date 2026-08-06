import React from 'react';
import { useAuth } from '@core/context/AuthContext';
import {
    HiOutlineLogout,
    HiOutlineUserCircle,
    HiOutlineBell,
    HiOutlineSearch,
    HiOutlineMenu
} from 'react-icons/hi';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { sellerApi } from '@/modules/seller/services/sellerApi';
import { adminApi } from '@/modules/admin/services/adminApi';
import { AnimatePresence, motion } from 'framer-motion';
import NotificationPopup from './NotificationPopup';
import LanguageSwitcher from '@/shared/components/LanguageSwitcher';
import { toast } from 'sonner';

import { useSettings } from '@core/context/SettingsContext';
import { onNotificationNew } from '@core/services/orderSocket';

const Topbar = ({ onMenuClick }) => {
    const { user, logout, role, token } = useAuth();
    const { settings } = useSettings();
    const navigate = useNavigate();
    const location = useLocation();

    const appName = settings?.appName || 'eAnnadata canteen';
    const logoUrl = settings?.logoUrl || '';

    const [searchQuery, setSearchQuery] = React.useState('');
    const [notifications, setNotifications] = React.useState([]);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [showNotifications, setShowNotifications] = React.useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
    const notificationRef = React.useRef(null);

    const isSeller = location.pathname.startsWith('/seller');
    const isAdmin = location.pathname.startsWith('/admin');

    const handleSearchSubmit = (e) => {
        e?.preventDefault();
        const q = (searchQuery || '').trim();
        if (!q) return;
        const query = q.toLowerCase();

        if (isSeller) {
            if (query === 'dashboard' || query === 'home' || query === 'overview') {
                navigate('/seller');
            } else if (query.includes('product') || query.includes('item')) {
                if (query.includes('add') || query.includes('new') || query.includes('create')) {
                    navigate('/seller/products/add');
                } else {
                    navigate('/seller/products');
                }
            } else if (query.includes('stock') || query.includes('inventory')) {
                navigate('/seller/inventory');
            } else if (query.includes('order')) {
                navigate('/seller/orders');
            } else if (query.includes('return')) {
                navigate('/seller/returns');
            } else if (query.includes('track') || query.includes('delivery')) {
                navigate('/seller/tracking');
            } else if (query.includes('report') || query.includes('sale') || query.includes('analytics')) {
                navigate('/seller/analytics');
            } else if (query.includes('withdraw') || query.includes('payout') || query.includes('money')) {
                navigate('/seller/withdrawals');
            } else if (query.includes('transaction') || query.includes('payment history')) {
                navigate('/seller/transactions');
            } else if (query.includes('earning') || query.includes('revenue') || query.includes('income')) {
                navigate('/seller/earnings');
            } else if (query.includes('profile') || query.includes('account') || query.includes('setting')) {
                navigate('/seller/profile');
            } else {
                navigate(`/seller/products?q=${encodeURIComponent(q)}`);
            }
        } else if (isAdmin) {
            const adminSearchRoutes = [
                { keys: ['dashboard', 'home', 'overview'], path: '/admin' },
                { keys: ['platform user', 'admin user'], path: '/admin/users' },
                { keys: ['header categor', 'top categor'], path: '/admin/categories/header' },
                { keys: ['main categor', 'level 2 categor'], path: '/admin/categories/level2' },
                { keys: ['sub-categor', 'sub categor'], path: '/admin/categories/sub' },
                { keys: ['category hierarchy', 'all categor', 'categor'], path: '/admin/categories/hierarchy' },
                { keys: ['product', 'item', 'food'], path: '/admin/products' },
                { keys: ['marketing tool', 'marketing'], path: '/admin/experience-studio' },
                { keys: ['experience studio', 'create section'], path: '/admin/experience-studio' },
                { keys: ['hero category', 'categories per page'], path: '/admin/hero-categories' },
                { keys: ['send notification', 'notification composer', 'notification'], path: '/admin/notifications' },
                { keys: ['coupon', 'promo', 'discount'], path: '/admin/coupons' },
                { keys: ['offer section'], path: '/admin/offer-sections' },
                { keys: ['customer support', 'support'], path: '/admin/support-tickets' },
                { keys: ['help ticket', 'ticket', 'support ticket'], path: '/admin/support-tickets' },
                { keys: ['review content', 'moderation', 'review'], path: '/admin/moderation' },
                { keys: ['active seller'], path: '/admin/sellers/active' },
                { keys: ['suspended seller'], path: '/admin/sellers/suspended' },
                { keys: ['pending seller', 'waiting for review seller'], path: '/admin/sellers/pending' },
                { keys: ['profile request'], path: '/admin/sellers/profile-requests' },
                { keys: ['seller location'], path: '/admin/seller-locations' },
                { keys: ['seller', 'shop', 'store', 'partner', 'vendor'], path: '/admin/sellers/active' },
                { keys: ['delivery driver', 'delivery boy'], path: '/admin/delivery-boys/active' },
                { keys: ['active driver', 'active delivery'], path: '/admin/delivery-boys/active' },
                { keys: ['pending driver', 'pending delivery'], path: '/admin/delivery-boys/pending' },
                { keys: ['track driver', 'tracking', 'fleet'], path: '/admin/tracking' },
                { keys: ['send money', 'delivery fund'], path: '/admin/delivery-funds' },
                { keys: ['driver', 'rider'], path: '/admin/delivery-boys/active' },
                { keys: ['money request', 'withdrawal', 'withdraw'], path: '/admin/withdrawals' },
                { keys: ['refund payout', 'refund'], path: '/admin/refund-payouts' },
                { keys: ['seller payment', 'seller transaction'], path: '/admin/seller-transactions' },
                { keys: ['collect cash', 'cash collection'], path: '/admin/cash-collection' },
                { keys: ['wallet', 'revenue', 'earning', 'payout', 'transaction', 'money', 'cash'], path: '/admin/wallet' },
                { keys: ['customer', 'farmer'], path: '/admin/customers' },
                { keys: ['faq', 'question'], path: '/admin/faqs' },
                { keys: ['return request', 'returns'], path: '/admin/returns' },
                { keys: ['new order', 'pending order'], path: '/admin/orders/pending' },
                { keys: ['preparing order', 'processed order', 'being prepared'], path: '/admin/orders/processed' },
                { keys: ['on the way order', 'out for delivery'], path: '/admin/orders/out-for-delivery' },
                { keys: ['delivered order'], path: '/admin/orders/delivered' },
                { keys: ['cancelled order'], path: '/admin/orders/cancelled' },
                { keys: ['returned order'], path: '/admin/orders/returned' },
                { keys: ['order', 'booking'], path: '/admin/orders/all' },
                { keys: ['fee', 'charge', 'billing'], path: '/admin/billing' },
                { keys: ['setting'], path: '/admin/settings' },
                { keys: ['profile', 'account'], path: '/admin/profile' }
            ];

            const matchedRoute = adminSearchRoutes.find(route => 
                route.keys.some(key => query.includes(key))
            );

            if (matchedRoute) {
                navigate(matchedRoute.path);
            } else {
                // Not a section name, perform standard page search
                if (location.pathname.startsWith('/admin/customers')) {
                    navigate(`/admin/customers?q=${encodeURIComponent(q)}`);
                } else if (location.pathname.startsWith('/admin/orders')) {
                    navigate(`${location.pathname}?q=${encodeURIComponent(q)}`);
                } else if (location.pathname.startsWith('/admin/sellers')) {
                    navigate(`${location.pathname}?q=${encodeURIComponent(q)}`);
                } else if (location.pathname.startsWith('/admin/products')) {
                    navigate(`/admin/products?q=${encodeURIComponent(q)}`);
                } else {
                    navigate(`/admin/customers?q=${encodeURIComponent(q)}`);
                }
            }
        }
    };

    // Stable refs so the socket / visibility listeners don't need to
    // re-bind whenever React re-renders the topbar for unrelated reasons.
    const isSellerRef = React.useRef(isSeller);
    const isAdminRef = React.useRef(isAdmin);
    React.useEffect(() => { isSellerRef.current = isSeller; }, [isSeller]);
    React.useEffect(() => { isAdminRef.current = isAdmin; }, [isAdmin]);

    const fetchNotifications = React.useCallback(async () => {
        try {
            const sellerMode = isSellerRef.current;
            const adminMode = isAdminRef.current;
            if (!sellerMode && !adminMode) return;
            const response = sellerMode
                ? await sellerApi.getNotifications()
                : await adminApi.getNotifications();
            if (response.data?.success) {
                setNotifications(response.data.result?.notifications || []);
                setUnreadCount(response.data.result?.unreadCount || 0);
            }
        } catch (error) {
            console.error("Notif Fetch Error:", error);
        }
    }, []);

    // Event-driven refresh: subscribe to `notification:new` for the
    // current admin/seller and refetch on any in-app delta. The 60s
    // poll below is now a degraded safety net for environments where
    // the socket can't connect (CSP, proxy, etc.) — primary path is
    // the socket. Tab focus also triggers an immediate refresh so a
    // user returning to a backgrounded tab sees a fresh badge.
    React.useEffect(() => {
        if (!isSeller && !isAdmin) return undefined;
        fetchNotifications();

        const getToken = () => token;
        let scheduled = null;
        const refresh = () => {
            if (scheduled) return;
            // Debounce: bursts of notifications (e.g. bulk order accept)
            // shouldn't trigger N concurrent refetches.
            scheduled = setTimeout(() => {
                scheduled = null;
                fetchNotifications();
            }, 200);
        };

        const offNotification = token ? onNotificationNew(getToken, refresh) : null;

        // Degraded fallback: 60s poll. The socket is the primary
        // path, this just covers offline-recovery / dropped connections.
        const FALLBACK_POLL_MS = 60_000;
        const poll = setInterval(() => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                return;
            }
            fetchNotifications();
        }, FALLBACK_POLL_MS);

        const onVisibility = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
                fetchNotifications();
            }
        };
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', onVisibility);
        }

        return () => {
            if (scheduled) clearTimeout(scheduled);
            clearInterval(poll);
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', onVisibility);
            }
            if (typeof offNotification === 'function') offNotification();
        };
    }, [isSeller, isAdmin, token, fetchNotifications]);

    // Handle Click Outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id) => {
        try {
            if (!id) return;
            setNotifications(prev => prev.map(n => (n._id === id || n.id === id) ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
            if (isSeller) await sellerApi.markNotificationRead(id);
            if (isAdmin) await adminApi.markNotificationRead(id);
            fetchNotifications();
        } catch (error) {
            toast.error("Failed to mark as read");
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            setNotifications([]);
            setUnreadCount(0);
            if (isSeller) await sellerApi.markAllNotificationsRead();
            if (isAdmin) await adminApi.markAllNotificationsRead();
            fetchNotifications();
            toast.success("Notifications cleared");
        } catch (error) {
            toast.error("Failed to mark all as read");
        }
    };

    const handleLogout = () => {
        if (isAdmin) {
            setShowLogoutConfirm(true);
        } else {
            logout();
        }
    };

    return (
        <>
            <header className={cn(
            "bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between shadow-sm transition-all duration-300",
            (role === 'admin' || role === 'seller')
                ? "fixed top-0 left-0 md:left-72 right-0 z-30 h-14 md:h-16 px-4 md:px-6"
                : "fixed top-0 left-72 right-0 h-16 px-6 z-30"
        )}>
            <div className="flex items-center flex-1 mr-4 overflow-hidden">
                <button
                    onClick={onMenuClick}
                    className="p-2.5 mr-3 bg-gray-100/80 hover:bg-white rounded-xl text-gray-600 hover:text-primary transition-all duration-300 md:hidden border border-transparent hover:border-primary/20 shadow-sm"
                >
                    <HiOutlineMenu className="h-5 w-5" />
                </button>

                {/* Mobile Logo */}
                <div className="flex items-center space-x-2 mr-4 md:hidden">
                    {logoUrl ? (
                        <div className="h-12 w-12 rounded-lg overflow-hidden shadow-md shadow-primary/10 border border-gray-100">
                            <img src={logoUrl} alt={appName} className="h-full w-full object-contain" />
                        </div>
                    ) : (
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-black text-sm shadow-md">
                            {appName.charAt(0)}
                        </div>
                    )}
                </div>

                <form onSubmit={handleSearchSubmit} className="relative w-full md:w-[380px] group hidden md:block">
                    <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-all duration-300" />
                    <input
                        type="text"
                        placeholder={isSeller ? "Search products by name or SKU..." : "Search anything..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                        className="w-full pl-10 pr-4 py-2 bg-slate-100/80 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all duration-300 outline-none shadow-sm"
                    />
                </form>
            </div>

            <div className="flex items-center space-x-4">
                <div className="relative" ref={notificationRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={cn(
                            "p-2 hover:bg-primary/5 text-gray-500 hover:text-primary rounded-xl transition-all duration-300 relative group",
                            showNotifications && "bg-primary/5 text-primary"
                        )}
                    >
                        <HiOutlineBell className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 h-2 w-2 bg-rose-500 rounded-full ring-2 ring-white shadow-sm"></span>
                        )}
                    </button>

                    <AnimatePresence>
                        {showNotifications && (
                            <NotificationPopup
                                notifications={notifications}
                                onMarkAsRead={handleMarkAsRead}
                                onMarkAllAsRead={handleMarkAllAsRead}
                                onClose={() => setShowNotifications(false)}
                            />
                        )}
                    </AnimatePresence>
                </div>

                <LanguageSwitcher />

                <div className="h-8 w-px bg-gray-100 mx-1"></div>
                <button
                    onClick={() => {
                        if (location.pathname.startsWith('/admin')) {
                            navigate('/admin/profile');
                        } else if (location.pathname.startsWith('/seller')) {
                            navigate('/seller/profile');
                        } else if (location.pathname.startsWith('/delivery')) {
                            navigate('/delivery/profile');
                        } else {
                            navigate('/profile');
                        }
                    }}
                    className="flex items-center space-x-2.5 p-1 pr-3 hover:bg-gray-50 rounded-xl transition-all duration-300 group ring-1 ring-transparent hover:ring-gray-100 shadow-sm hover:shadow-md"
                >
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs shadow-md group-hover:scale-105 transition-transform">
                        {user?.name?.[0] || 'A'}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-900 leading-tight">{user?.name || 'Demo User'}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{user?.role || 'Member'}</p>
                    </div>
                </button>
                <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-300 font-bold text-xs shadow-sm hover:shadow-rose-100/50"
                >
                    <HiOutlineLogout className="h-4 w-4" />
                    <span className="hidden lg:block">Sign Out</span>
                </button>
            </div>
        </header>

        <AnimatePresence>
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-5"
                    >
                        <div className="h-16 w-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center animate-bounce">
                            <HiOutlineLogout className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-black text-slate-900">Sign Out</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Are you sure you want to log out from the Admin Panel?</p>
                        </div>
                        <div className="flex w-full gap-3 pt-2">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowLogoutConfirm(false);
                                    logout();
                                }}
                                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-rose-600/20"
                            >
                                Sign Out
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
        </>
    );
};

export default Topbar;

