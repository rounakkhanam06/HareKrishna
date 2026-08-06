import React, { lazy, useMemo, useEffect, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom';
import ProtectedRoute from '../guards/ProtectedRoute';
import RoleGuard from '../guards/RoleGuard';
import { UserRole } from '../constants/roles';
import RootErrorBoundary from '../../shared/components/RootErrorBoundary';
import { setActiveRole, ROLES } from '../auth/activeRoleStore';
import { useAuth } from '@core/context/AuthContext';
import { getStoredAuthToken } from '../utils/authStorage';
import { STORAGE_KEYS } from '../utils/storageKeys';
import SkeletonPage from '../../shared/components/ui/Skeleton';

// Providers for Customer Module
import { WishlistProvider } from '../../modules/customer/context/WishlistContext';
import { CartProvider } from '../../modules/customer/context/CartContext';
import { CartAnimationProvider } from '../../modules/customer/context/CartAnimationContext';
import { ProductDetailProvider } from '../../modules/customer/context/ProductDetailContext';
import { LocationProvider } from '../../modules/customer/context/LocationContext';
import ScrollToTop from '../../modules/customer/components/shared/ScrollToTop';

// Public Pages
import Auth from '../../modules/seller/pages/Auth';
import ApplicationPending from '../../modules/seller/pages/ApplicationPending';
import ForgotPassword from '../../modules/seller/pages/ForgotPassword';
import ResetPassword from '../../modules/seller/pages/ResetPassword';
import AdminAuth from '../../modules/admin/pages/AdminAuth';
import DeliveryAuth from '../../modules/delivery/pages/DeliveryAuth';
import CustomerAuth from '../../modules/customer/pages/CustomerAuth';

// Customer Pages (lazy-loaded)
const Home = lazy(() => import('../../modules/customer/pages/Home'));
const CategoriesPage = lazy(() => import('../../modules/customer/pages/CategoriesPage'));
const CategoryProductsPage = lazy(() => import('../../modules/customer/pages/CategoryProductsPage'));
const WishlistPage = lazy(() => import('../../modules/customer/pages/WishlistPage'));
const OffersPage = lazy(() => import('../../modules/customer/pages/OffersPage'));
const ShopByStorePage = lazy(() => import('../../modules/customer/pages/ShopByStorePage'));
const ProfilePage = lazy(() => import('../../modules/customer/pages/ProfilePage'));
const OrdersPage = lazy(() => import('../../modules/customer/pages/OrdersPage'));
const OrderTransactionsPage = lazy(() => import('../../modules/customer/pages/OrderTransactionsPage'));
const AddressesPage = lazy(() => import('../../modules/customer/pages/AddressesPage'));
const SettingsPage = lazy(() => import('../../modules/customer/pages/SettingsPage'));
const SupportPage = lazy(() => import('../../modules/customer/pages/SupportPage'));
const ChatPage = lazy(() => import('../../modules/customer/pages/ChatPage'));
const TermsPage = lazy(() => import('../../modules/customer/pages/TermsPage'));
const PrivacyPage = lazy(() => import('../../modules/customer/pages/PrivacyPage'));
const AboutPage = lazy(() => import('../../modules/customer/pages/AboutPage'));
const EditProfilePage = lazy(() => import('../../modules/customer/pages/EditProfilePage'));
const OrderDetailPage = lazy(() => import('../../modules/customer/pages/OrderDetailPage'));
const ProductDetailPage = lazy(() => import('../../modules/customer/pages/ProductDetailPage'));
const CheckoutPage = lazy(() => import('../../modules/customer/pages/CheckoutPage'));
const PaymentStatusPage = lazy(() => import('../../modules/customer/pages/PaymentStatusPage'));
const SearchPage = lazy(() => import('../../modules/customer/pages/SearchPage'));
const WalletPage = lazy(() => import('../../modules/customer/pages/WalletPage'));

// Lazy load heavy modules
const SellerModule = lazy(() => import('../../modules/seller/routes/index'));
const SellerTermsPage = lazy(() => import('../../modules/seller/pages/TermsPage'));
const SellerPrivacyPage = lazy(() => import('../../modules/seller/pages/PrivacyPage'));
const DeliveryTermsPage = lazy(() => import('../../modules/delivery/pages/TermsPage'));
const DeliveryPrivacyPage = lazy(() => import('../../modules/delivery/pages/PrivacyPage'));
const AdminModule = lazy(() => import('../../modules/admin/routes/index'));
const DeliveryModule = lazy(() => import('../../modules/delivery/routes/index'));

import CustomerLayout from '../../modules/customer/components/layout/CustomerLayout';

const CustomerLayoutWrapper = () => {
    useEffect(() => {
        setActiveRole(ROLES.CUSTOMER);
    }, []);

    return (
        <LocationProvider>
            <WishlistProvider>
                <CartProvider>
                    <CartAnimationProvider>
                        <ProductDetailProvider>
                            <ScrollToTop />
                            <CustomerLayout>
                                <Suspense fallback={<SkeletonPage />}>
                                    <Outlet />
                                </Suspense>
                            </CustomerLayout>
                        </ProductDetailProvider>
                    </CartAnimationProvider>
                </CartProvider>
            </WishlistProvider>
        </LocationProvider>
    );
};

const PublicRoute = ({ children, redirectTo }) => {
    const { isAuthenticated, isLoading } = useAuth();

    // Check if token exists synchronously to bypass loading spinner on reload / fresh load
    const path = window.location.pathname;
    let hasToken = false;
    try {
        if (path.startsWith('/admin') && getStoredAuthToken(STORAGE_KEYS.AUTH_ADMIN)) {
            hasToken = true;
        } else if (path.startsWith('/seller') && getStoredAuthToken(STORAGE_KEYS.AUTH_SELLER)) {
            hasToken = true;
        } else if (path.startsWith('/delivery') && getStoredAuthToken(STORAGE_KEYS.AUTH_DELIVERY)) {
            hasToken = true;
        } else if (!path.startsWith('/admin') && !path.startsWith('/seller') && !path.startsWith('/delivery') && getStoredAuthToken(STORAGE_KEYS.AUTH_CUSTOMER)) {
            hasToken = true;
        }
    } catch (e) {
        console.error("Synchronous token check error in PublicRoute:", e);
    }

    if (hasToken || isAuthenticated) {
        return <Navigate to={redirectTo} replace />;
    }

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center font-outfit">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    return children;
};

const AppRouter = () => {
    const router = useMemo(() => createBrowserRouter([
        {
            path: '/',
            element: <Outlet />,
            errorElement: <RootErrorBoundary />,
            children: [
                {
                    path: 'login',
                    element: (
                        <PublicRoute redirectTo="/">
                            <CustomerAuth />
                        </PublicRoute>
                    ),
                },
                {
                    path: 'signup',
                    element: (
                        <PublicRoute redirectTo="/">
                            <CustomerAuth />
                        </PublicRoute>
                    ),
                },
                {
                    path: 'seller/auth',
                    element: (
                        <PublicRoute redirectTo="/seller">
                            <Auth />
                        </PublicRoute>
                    ),
                },
                {
                    path: 'seller/login',
                    element: <Navigate to="/seller/auth" replace />,
                },
                {
                    path: 'seller/pending-approval',
                    element: <ApplicationPending />,
                },
                {
                    path: 'seller/forgot-password',
                    element: <ForgotPassword />,
                },
                {
                    path: 'seller/reset-password',
                    element: <ResetPassword />,
                },
                {
                    path: 'seller/terms',
                    element: <SellerTermsPage />,
                },
                {
                    path: 'seller/privacy',
                    element: <SellerPrivacyPage />,
                },
                {
                    path: 'delivery/terms',
                    element: <DeliveryTermsPage />,
                },
                {
                    path: 'delivery/privacy',
                    element: <DeliveryPrivacyPage />,
                },
                {
                    path: 'admin/auth',
                    element: (
                        <PublicRoute redirectTo="/admin">
                            <AdminAuth />
                        </PublicRoute>
                    ),
                },
                {
                    path: 'admin/login',
                    element: <Navigate to="/admin/auth" replace />,
                },
                {
                    path: 'delivery/auth',
                    element: (
                        <PublicRoute redirectTo="/delivery">
                            <DeliveryAuth />
                        </PublicRoute>
                    ),
                },
                {
                    path: 'delivery/login',
                    element: <Navigate to="/delivery/auth" replace />,
                },
                {
                    path: 'seller/*',
                    element: (
                        <ProtectedRoute>
                            <RoleGuard allowedRoles={[UserRole.SELLER]}>
                                <SellerModule />
                            </RoleGuard>
                        </ProtectedRoute>
                    ),
                },
                {
                    path: 'admin/*',
                    element: (
                        <ProtectedRoute>
                            <RoleGuard allowedRoles={[UserRole.ADMIN]}>
                                <AdminModule />
                            </RoleGuard>
                        </ProtectedRoute>
                    ),
                },
                {
                    path: 'delivery/*',
                    element: (
                        <ProtectedRoute>
                            <RoleGuard allowedRoles={[UserRole.DELIVERY]}>
                                <DeliveryModule />
                            </RoleGuard>
                        </ProtectedRoute>
                    ),
                },
                {
                    path: 'unauthorized',
                    element: <div className="flex h-screen items-center justify-center font-outfit">Unauthorized Access</div>,
                },
                {
                    element: <CustomerLayoutWrapper />,
                    children: [
                        { index: true, element: <Home /> },
                        { path: 'categories', element: <CategoriesPage /> },
                        { path: 'category/:categoryName', element: <CategoryProductsPage /> },
                        { path: 'product/:id', element: <ProductDetailPage /> },
                        { path: 'terms', element: <TermsPage /> },
                        { path: 'privacy', element: <PrivacyPage /> },
                        { path: 'about', element: <AboutPage /> },
                        { path: 'offers', element: <OffersPage /> },
                        { path: 'shop-by-store', element: <ShopByStorePage /> },
                        { path: 'wishlist', element: <ProtectedRoute><WishlistPage /></ProtectedRoute> },
                        { path: 'orders', element: <ProtectedRoute><OrdersPage /></ProtectedRoute> },
                        { path: 'orders/:orderId', element: <ProtectedRoute><OrderDetailPage /></ProtectedRoute> },
                        { path: 'transactions', element: <ProtectedRoute><OrderTransactionsPage /></ProtectedRoute> },
                        { path: 'addresses', element: <ProtectedRoute><AddressesPage /></ProtectedRoute> },
                        { path: 'settings', element: <ProtectedRoute><SettingsPage /></ProtectedRoute> },
                        { path: 'support', element: <ProtectedRoute><SupportPage /></ProtectedRoute> },
                        { path: 'chat', element: <ProtectedRoute><ChatPage /></ProtectedRoute> },
                        { path: 'checkout', element: <ProtectedRoute><CheckoutPage /></ProtectedRoute> },
                        { path: 'payment-status', element: <PaymentStatusPage /> },
                        { path: 'profile', element: <ProtectedRoute><ProfilePage /></ProtectedRoute> },
                        { path: 'profile/edit', element: <ProtectedRoute><EditProfilePage /></ProtectedRoute> },
                        { path: 'wallet', element: <ProtectedRoute><WalletPage /></ProtectedRoute> },
                        { path: 'search', element: <SearchPage /> },
                    ]
                },
                {
                    path: '*',
                    element: <Navigate to="/" replace />
                }
            ]
        }
    ]), []);

    return <RouterProvider router={router} />;
};

export default AppRouter;
