import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import DashboardLayout from "@shared/layout/DashboardLayout";
import { useSupportUnread } from "@core/context/SupportUnreadContext";
import { setActiveRole, ROLES } from "@core/auth/activeRoleStore";
import { useAuth } from "@core/context/AuthContext";
import {
  LayoutDashboard,
  Tag,
  Box,
  Store,
  Truck,
  Wallet,
  Banknote,
  Receipt,
  CircleDollarSign,
  Users,
  HelpCircle,
  ClipboardList,
  RotateCcw,
  Settings,
  Terminal,
  Sparkles,
  User,
} from "lucide-react";

const Dashboard = React.lazy(() => import("../pages/Dashboard"));
const CategoryManagement = React.lazy(
  () => import("../pages/CategoryManagement"),
);
const HeaderCategories = React.lazy(
  () => import("../pages/categories/HeaderCategories"),
);
const Level2Categories = React.lazy(
  () => import("../pages/categories/Level2Categories"),
);
const SubCategories = React.lazy(
  () => import("../pages/categories/SubCategories"),
);
const CategoryHierarchy = React.lazy(
  () => import("../pages/categories/CategoryHierarchy"),
);
const ProductManagement = React.lazy(
  () => import("../pages/ProductManagement"),
);
const ActiveSellers = React.lazy(() => import("../pages/ActiveSellers"));
const SuspendedSellers = React.lazy(() => import("../pages/SuspendedSellers"));
const PendingSellers = React.lazy(() => import("../pages/PendingSellers"));
const SellerLocations = React.lazy(() => import("../pages/SellerLocations"));
const SellerProfileRequests = React.lazy(
  () => import("../pages/SellerProfileRequests"),
);
const ActiveDeliveryBoys = React.lazy(
  () => import("../pages/ActiveDeliveryBoys"),
);
const PendingDeliveryBoys = React.lazy(
  () => import("../pages/PendingDeliveryBoys"),
);
const DeliveryRatings = React.lazy(
  () => import("../pages/DeliveryRatings"),
);
const DeliveryFunds = React.lazy(() => import("../pages/DeliveryFunds"));
const AdminWallet = React.lazy(() => import("../pages/AdminWallet"));
const WithdrawalRequests = React.lazy(
  () => import("../pages/WithdrawalRequests"),
);
const SellerTransactions = React.lazy(
  () => import("../pages/SellerTransactions"),
);
const AdvancedAnalytics = React.lazy(
  () => import("../pages/AdvancedAnalytics"),
);
const CashCollection = React.lazy(() => import("../pages/CashCollection"));
const CustomerManagement = React.lazy(
  () => import("../pages/CustomerManagement"),
);
const CustomerDetail = React.lazy(() => import("../pages/CustomerDetail"));
const UserManagement = React.lazy(() => import("../pages/UserManagement"));
const Profile = React.lazy(() => import("@/pages/Profile"));
const FAQManagement = React.lazy(() => import("../pages/FAQManagement"));
const OrdersList = React.lazy(() => import("../pages/OrdersList"));
const OrderDetail = React.lazy(() => import("../pages/OrderDetail"));
const Returns = React.lazy(() => import("../pages/Returns"));
const SellerDetail = React.lazy(() => import("../pages/SellerDetail"));
const SupportTickets = React.lazy(() => import("../pages/SupportTickets"));
const ReviewModeration = React.lazy(() => import("../pages/ReviewModeration"));
const FleetTracking = React.lazy(() => import("../pages/FleetTracking"));
const CouponManagement = React.lazy(() => import("../pages/CouponManagement"));
const ContentManager = React.lazy(() => import("../pages/ContentManager"));
const HeroCategoriesPerPage = React.lazy(() => import("../pages/HeroCategoriesPerPage"));
const NotificationComposer = React.lazy(
  () => import("../pages/NotificationComposer"),
);
const OffersManagement = React.lazy(
  () => import("../pages/OffersManagement"),
);
const OfferSectionsManagement = React.lazy(
  () => import("../pages/OfferSectionsManagement"),
);
const ShopByStoreManagement = React.lazy(
  () => import("../pages/ShopByStoreManagement"),
);
const AdminSettings = React.lazy(() => import("../pages/AdminSettings"));
const EnvSettings = React.lazy(() => import("../pages/EnvSettings"));
const AdminProfile = React.lazy(() => import("../pages/AdminProfile"));
const RefundPayoutManagement = React.lazy(() => import("../pages/RefundPayoutManagement"));

const navItems = [
  {
    label: "Dashboard",
    path: "/admin",
    icon: LayoutDashboard,
    color: "indigo",
    end: true,
    permissionKey: "dashboard",
  },
  {
    label: "Platform Users",
    path: "/admin/users",
    icon: Users,
    color: "violet",
    // Filtered out dynamically for non-superadmins
  },
  {
    label: "Categories",
    icon: Tag,
    color: "rose",
    permissionKey: "categories",
    children: [
      { label: "All Categories", path: "/admin/categories/hierarchy" },
      { label: "Header Categories", path: "/admin/categories/header" },
      { label: "Main Categories", path: "/admin/categories/level2" },
      { label: "Sub-Categories", path: "/admin/categories/sub" },
    ],
  },
  { label: "Products", path: "/admin/products", icon: Box, color: "amber", permissionKey: "products" },
  {
    label: "Marketing Tools",
    icon: Sparkles,
    color: "amber",
    permissionKey: "marketing",
    children: [
      { label: "Create Sections", path: "/admin/experience-studio" },
      { label: "Hero & categories per page", path: "/admin/hero-categories" },
      { label: "Send Notifications", path: "/admin/notifications" },
      { label: "Coupons & Promos", path: "/admin/coupons" },
      { label: "Offer Sections", path: "/admin/offer-sections" },
    ],
  },
  {
    label: "Customer Support",
    icon: Receipt,
    color: "emerald",
    permissionKey: "support",
    children: [
      { label: "Help Tickets", path: "/admin/support-tickets" },
      { label: "Review Content", path: "/admin/moderation" },
    ],
  },
  {
    label: "Sellers",
    icon: Store,
    color: "blue",
    permissionKey: "sellers",
    children: [
      { label: "Active Sellers", path: "/admin/sellers/active" },
      { label: "Suspended Sellers", path: "/admin/sellers/suspended" },
      { label: "Waiting for Review", path: "/admin/sellers/pending" },
      { label: "Profile Requests", path: "/admin/sellers/profile-requests" },
      { label: "Seller Locations", path: "/admin/seller-locations" },
    ],
  },
  {
    label: "Delivery Drivers",
    icon: Truck,
    color: "emerald",
    permissionKey: "delivery",
    children: [
      { label: "Active Drivers", path: "/admin/delivery-boys/active" },
      { label: "Waiting for Review", path: "/admin/delivery-boys/pending" },
      { label: "Track Drivers", path: "/admin/tracking" },
      { label: "Send Money", path: "/admin/delivery-funds" },
      { label: "Delivery Ratings", path: "/admin/delivery-ratings" },
    ],
  },
  { label: "Wallet", path: "/admin/wallet", icon: Wallet, color: "violet", permissionKey: "wallet" },
  {
    label: "Money Requests",
    path: "/admin/withdrawals",
    icon: Banknote,
    color: "cyan",
    permissionKey: "withdrawals",
  },
  {
    label: "Refund Payouts",
    path: "/admin/refund-payouts",
    icon: RotateCcw,
    color: "rose",
    permissionKey: "refunds",
  },
  {
    label: "Seller Payments",
    path: "/admin/seller-transactions",
    icon: Receipt,
    color: "orange",
    permissionKey: "sellerPayments",
  },
  {
    label: "Collect Cash",
    path: "/admin/cash-collection",
    icon: CircleDollarSign,
    color: "green",
    permissionKey: "cashCollection",
  },
  {
    label: "Customers",
    path: "/admin/customers/all",
    icon: Users,
    color: "sky",
    permissionKey: "customers",
  },
  { label: "FAQs", path: "/admin/faqs", icon: HelpCircle, color: "pink", permissionKey: "faqs" },
  {
    label: "Orders",
    icon: ClipboardList,
    color: "fuchsia",
    permissionKey: "orders",
    children: [
      { label: "All Orders", path: "/admin/orders/all" },
      { label: "New Orders", path: "/admin/orders/pending" },
      { label: "Being Prepared", path: "/admin/orders/processed" },
      { label: "On the Way", path: "/admin/orders/out-for-delivery" },
      { label: "Delivered", path: "/admin/orders/delivered" },
      { label: "Cancelled", path: "/admin/orders/cancelled" },
      { label: "Returned", path: "/admin/orders/returned" },
      { label: "Return Requests", path: "/admin/returns" },
    ],
  },
  {
    label: "Fees & Charges",
    path: "/admin/billing",
    icon: RotateCcw,
    color: "red",
    permissionKey: "billing",
  },
  {
    label: "Settings",
    path: "/admin/settings",
    icon: Settings,
    color: "slate",
    permissionKey: "settings",
  },
  { label: "My Profile", path: "/admin/profile", icon: User, color: "indigo" },
];

const BillingCharges = React.lazy(() => import("../pages/BillingCharges"));

const AdminRoutes = () => {
  const { user, isLoading } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setActiveRole(ROLES.ADMIN);
  }, []);

  const { totalUnread } = useSupportUnread();

  const navItemsWithBadges = React.useMemo(() => {
    const count = Number.isFinite(totalUnread) ? totalUnread : 0;
    if (count <= 0) return navItems;
    return navItems.map((item) => {
      if (item?.label !== "Customer Support") return item;
      return { ...item, badgeCount: count };
    });
  }, [totalUnread]);

  const filteredNavItems = React.useMemo(() => {
    if (!user) return [];
    if (user.isSuperAdmin) return navItemsWithBadges;
    const permissions = user.permissions || [];
    return navItemsWithBadges.filter(item => {
      if (item.path === "/admin/users") return false; // Superadmin only
      return !item.permissionKey || permissions.includes(item.permissionKey);
    });
  }, [user, navItemsWithBadges]);

  const hasAccess = (permissionKey) => {
    return user?.isSuperAdmin || (user?.permissions && user.permissions.includes(permissionKey));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout navItems={filteredNavItems} title="Admin Center">
      <Routes>
        <Route path="/" element={hasAccess("dashboard") ? <Dashboard /> : <Navigate to="/admin/profile" replace />} />
        <Route path="/users" element={user?.isSuperAdmin ? <UserManagement /> : <Navigate to="/admin" replace />} />
        <Route path="/profile" element={<AdminProfile />} />
        {/* Lazy routes for new sections */}
        <Route
          path="/categories"
          element={hasAccess("categories") ? <Navigate to="/admin/categories/header" replace /> : <Navigate to="/admin" replace />}
        />
        <Route path="/categories/header" element={hasAccess("categories") ? <HeaderCategories /> : <Navigate to="/admin" replace />} />
        <Route path="/categories/level2" element={hasAccess("categories") ? <Level2Categories /> : <Navigate to="/admin" replace />} />
        <Route path="/categories/sub" element={hasAccess("categories") ? <SubCategories /> : <Navigate to="/admin" replace />} />
        <Route path="/categories/hierarchy" element={hasAccess("categories") ? <CategoryHierarchy /> : <Navigate to="/admin" replace />} />
        <Route path="/products" element={hasAccess("products") ? <ProductManagement /> : <Navigate to="/admin" replace />} />
        <Route path="/sellers/active" element={hasAccess("sellers") ? <ActiveSellers /> : <Navigate to="/admin" replace />} />
        <Route path="/sellers/suspended" element={hasAccess("sellers") ? <SuspendedSellers /> : <Navigate to="/admin" replace />} />
        <Route path="/sellers/active/:id" element={hasAccess("sellers") ? <SellerDetail /> : <Navigate to="/admin" replace />} />
        <Route path="/support-tickets" element={hasAccess("support") ? <SupportTickets /> : <Navigate to="/admin" replace />} />
        <Route path="/moderation" element={hasAccess("support") ? <ReviewModeration /> : <Navigate to="/admin" replace />} />
        <Route path="/experience-studio" element={hasAccess("marketing") ? <ContentManager /> : <Navigate to="/admin" replace />} />
        <Route path="/hero-categories" element={hasAccess("marketing") ? <HeroCategoriesPerPage /> : <Navigate to="/admin" replace />} />
        <Route path="/notifications" element={hasAccess("marketing") ? <NotificationComposer /> : <Navigate to="/admin" replace />} />
        <Route path="/offers" element={hasAccess("marketing") ? <OffersManagement /> : <Navigate to="/admin" replace />} />
        <Route path="/offer-sections" element={hasAccess("marketing") ? <OfferSectionsManagement /> : <Navigate to="/admin" replace />} />
        <Route path="/shop-by-store" element={hasAccess("marketing") ? <ShopByStoreManagement /> : <Navigate to="/admin" replace />} />
        <Route path="/coupons" element={hasAccess("marketing") ? <CouponManagement /> : <Navigate to="/admin" replace />} />
        <Route path="/sellers/pending" element={hasAccess("sellers") ? <PendingSellers /> : <Navigate to="/admin" replace />} />
        <Route path="/sellers/profile-requests" element={hasAccess("sellers") ? <SellerProfileRequests /> : <Navigate to="/admin" replace />} />
        <Route path="/seller-locations" element={hasAccess("sellers") ? <SellerLocations /> : <Navigate to="/admin" replace />} />
        <Route path="/delivery-boys/active" element={hasAccess("delivery") ? <ActiveDeliveryBoys /> : <Navigate to="/admin" replace />} />
        <Route
          path="/delivery-boys/pending"
          element={hasAccess("delivery") ? <PendingDeliveryBoys /> : <Navigate to="/admin" replace />}
        />
        <Route path="/tracking" element={hasAccess("delivery") ? <FleetTracking /> : <Navigate to="/admin" replace />} />
        <Route path="/delivery-funds" element={hasAccess("delivery") ? <DeliveryFunds /> : <Navigate to="/admin" replace />} />
        <Route path="/delivery-ratings" element={hasAccess("delivery") ? <DeliveryRatings /> : <Navigate to="/admin" replace />} />
        <Route path="/wallet" element={hasAccess("wallet") ? <AdminWallet /> : <Navigate to="/admin" replace />} />
        <Route path="/withdrawals" element={hasAccess("withdrawals") ? <WithdrawalRequests /> : <Navigate to="/admin" replace />} />
        <Route path="/refund-payouts" element={hasAccess("refunds") ? <RefundPayoutManagement /> : <Navigate to="/admin" replace />} />
        <Route path="/seller-transactions" element={hasAccess("sellerPayments") ? <SellerTransactions /> : <Navigate to="/admin" replace />} />
        <Route path="/analytics" element={hasAccess("sellerPayments") ? <AdvancedAnalytics /> : <Navigate to="/admin" replace />} />
        <Route path="/cash-collection" element={hasAccess("cashCollection") ? <CashCollection /> : <Navigate to="/admin" replace />} />
        <Route path="/customers" element={<Navigate to="/admin/customers/all" replace />} />
        <Route path="/customers/all" element={hasAccess("customers") ? <CustomerManagement mode="all" /> : <Navigate to="/admin" replace />} />
        <Route path="/customers/:id" element={hasAccess("customers") ? <CustomerDetail /> : <Navigate to="/admin" replace />} />
        <Route path="/faqs" element={hasAccess("faqs") ? <FAQManagement /> : <Navigate to="/admin" replace />} />
        <Route path="/orders/:status" element={hasAccess("orders") ? <OrdersList /> : <Navigate to="/admin" replace />} />
        <Route path="/orders/view/:orderId" element={hasAccess("orders") ? <OrderDetail /> : <Navigate to="/admin" replace />} />
        <Route path="/returns" element={hasAccess("orders") ? <Returns /> : <Navigate to="/admin" replace />} />
        <Route path="/billing" element={hasAccess("billing") ? <BillingCharges /> : <Navigate to="/admin" replace />} />
        <Route path="/settings" element={hasAccess("settings") ? <AdminSettings /> : <Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default AdminRoutes;
