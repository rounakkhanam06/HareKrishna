import React, { useEffect, useMemo, useRef, useState } from "react";
import Card from "@shared/components/ui/Card";
import Badge from "@shared/components/ui/Badge";
import Pagination from "@shared/components/ui/Pagination";
import {
  HiOutlineBuildingOffice2,
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineCalendarDays,
  HiOutlineArrowTrendingUp,
  HiOutlineMapPin,
  HiOutlineXMark,
  HiOutlineEye,
  HiOutlineClock,
  HiOutlineArrowPath,
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { adminApi } from "../services/adminApi";

const SORT_OPTIONS = [
  { value: "recent", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name_asc", label: "Shop name A-Z" },
  { value: "name_desc", label: "Shop name Z-A" },
];

const currency = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const statClass = {
  red: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600",
  slate: "bg-slate-50 text-slate-600",
  rose: "bg-rose-50 text-rose-600",
};

const emptyStats = {
  totalSuspendedSellers: 0,
  totalOrders: 0,
  totalRevenue: 0,
  suspendedThisMonth: 0,
};

const normalizeSeller = (seller) => {
  const joinedAt = seller.joinedAt || seller.createdAt || null;
  const suspendedAt = seller.suspendedAt || seller.updatedAt || null;

  return {
    ...seller,
    totalOrders: safeNumber(seller.totalOrders),
    deliveredOrders: safeNumber(seller.deliveredOrders),
    pendingOrders: safeNumber(seller.pendingOrders),
    totalRevenue: safeNumber(seller.totalRevenue),
    productCount: safeNumber(seller.productCount),
    avgOrderValue: safeNumber(seller.avgOrderValue),
    fulfillmentRate: safeNumber(seller.fulfillmentRate),
    serviceRadius: safeNumber(seller.serviceRadius) || 5,
    joinedDate: joinedAt
      ? new Date(joinedAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "N/A",
    suspendedDate: suspendedAt
      ? new Date(suspendedAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A",
    lastOrderLabel: seller.lastOrderAt
      ? new Date(seller.lastOrderAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "No orders yet",
    location: seller.location || "Location not set",
    avatar:
      seller.avatar ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        seller.shopName || seller.ownerName || seller.email || "seller",
      )}`,
  };
};

const SuspendedSellers = () => {
  const requestSeq = useRef(0);

  const [sellers, setSellers] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [sellerToUnsuspend, setSellerToUnsuspend] = useState(null);
  const [unsuspendReason, setUnsuspendReason] = useState("");
  const [unsuspending, setUnsuspending] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, sortBy, pageSize]);

  useEffect(() => {
    if (selectedSeller || sellerToUnsuspend) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedSeller, sellerToUnsuspend]);

  // Load audit log when a seller is selected
  useEffect(() => {
    if (selectedSeller) {
      const loadAudit = async () => {
        setLoadingAudit(true);
        try {
          const res = await adminApi.getSellerAuditLog(selectedSeller.id || selectedSeller._id);
          setAuditLog(res.data?.result?.items || []);
        } catch (err) {
          console.error("Failed to load seller audit log", err);
          toast.error("Failed to load suspension logs");
        } finally {
          setLoadingAudit(false);
        }
      };
      loadAudit();
    } else {
      setAuditLog([]);
    }
  }, [selectedSeller]);

  useEffect(() => {
    const currentSeq = ++requestSeq.current;

    const loadSellers = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await adminApi.getSuspendedSellers({
          q: debouncedSearch || undefined,
          category: categoryFilter !== "all" ? categoryFilter : undefined,
          sort: sortBy,
          page,
          limit: pageSize,
        });

        if (currentSeq !== requestSeq.current) return;

        const payload = response.data?.result || {};
        const items = Array.isArray(payload.items) ? payload.items : [];
        const normalizedItems = items.map(normalizeSeller);

        setSellers(normalizedItems);
        setStats({
          ...emptyStats,
          ...payload.stats,
        });
        setCategories(
          Array.isArray(payload.filters?.categories) ? payload.filters.categories : [],
        );
        setTotal(safeNumber(payload.total) || normalizedItems.length);
        setTotalPages(safeNumber(payload.totalPages) || 1);
        setLastSyncAt(new Date());

        if (safeNumber(payload.totalPages) > 0 && page > payload.totalPages) {
          setPage(payload.totalPages);
        }
      } catch (err) {
        if (currentSeq !== requestSeq.current) return;
        console.error("Failed to load suspended sellers", err);
        const message =
          err.response?.data?.message || "Failed to load suspended sellers";
        setError(message);
        toast.error(message);
      } finally {
        if (currentSeq === requestSeq.current) {
          setLoading(false);
        }
      }
    };

    loadSellers();
  }, [debouncedSearch, categoryFilter, sortBy, page, pageSize, refreshTick]);

  const handleUnsuspendSeller = async () => {
    if (!sellerToUnsuspend) return;
    try {
      setUnsuspending(true);
      await adminApi.unsuspendSeller(sellerToUnsuspend.id || sellerToUnsuspend._id, {
        reason: unsuspendReason,
      });
      toast.success("Seller unsuspended successfully");
      setSellerToUnsuspend(null);
      setUnsuspendReason("");
      setRefreshTick((t) => t + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to unsuspend seller");
    } finally {
      setUnsuspending(false);
    }
  };

  const summaryCards = useMemo(
    () => [
      {
        label: "Suspended Sellers",
        value: stats.totalSuspendedSellers.toLocaleString("en-IN"),
        icon: HiOutlineBuildingOffice2,
        color: "red",
        note: "Currently offline",
      },
      {
        label: "Suspended Revenue",
        value: currency(stats.totalRevenue),
        icon: HiOutlineArrowTrendingUp,
        color: "slate",
        note: "Revenue held offline",
      },
      {
        label: "Suspended Volume",
        value: stats.totalOrders.toLocaleString("en-IN"),
        icon: HiOutlineDocumentText,
        color: "amber",
        note: "Orders affected",
      },
      {
        label: "Suspended This Month",
        value: stats.suspendedThisMonth.toLocaleString("en-IN"),
        icon: HiOutlineCalendarDays,
        color: "rose",
        note: "Recent enforcement",
      },
    ],
    [stats],
  );

  return (
    <div className="ds-section-spacing animate-in fade-in slide-in-from-bottom-2 duration-700 pb-16">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="ds-h1 flex items-center gap-2">
            Suspended Sellers
            <Badge
              variant="danger"
              className="admin-tiny px-1.5 py-0 font-bold uppercase tracking-wider"
            >
              Suspended
            </Badge>
          </h1>
          <p className="ds-description mt-0.5">
            Manage suspended sellers, review enforcement reasons, and unsuspend vendor accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl ring-1 ring-slate-100">
            <HiOutlineClock className="h-4 w-4 text-slate-500" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              {lastSyncAt
                ? `Synced ${lastSyncAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Sync pending"}
            </span>
          </div>
          <button
            onClick={() => setRefreshTick((value) => value + 1)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xl hover:bg-slate-800 transition-all"
          >
            <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="border-none shadow-sm ring-1 ring-slate-100 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="ds-label">{card.label}</p>
                <h4 className="ds-stat-medium mt-1">{card.value}</h4>
                <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-widest">
                  {card.note}
                </p>
              </div>
              <div
                className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center",
                  statClass[card.color],
                )}
              >
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-xl ring-1 ring-slate-100 p-4 bg-white/80 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search suspended shops, owners, emails..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <HiOutlineFunnel className="h-4 w-4 text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Filter by
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-500 focus:bg-white transition-all cursor-pointer min-w-[140px]"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-500 focus:bg-white transition-all cursor-pointer min-w-[140px]"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-semibold text-rose-600 flex items-center gap-3">
            <HiOutlineExclamationTriangle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Shop & Seller Info
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Suspension Enforcement
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Catalog Details
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Account Status
                </th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-100 rounded-2xl" />
                        <div className="space-y-2">
                          <div className="h-3 w-32 bg-slate-100 rounded" />
                          <div className="h-2 w-24 bg-slate-100 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-2">
                        <div className="h-3 w-40 bg-slate-100 rounded" />
                        <div className="h-2 w-28 bg-slate-100 rounded" />
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="h-4 w-20 bg-slate-100 rounded" />
                    </td>
                    <td className="px-6 py-5">
                      <div className="h-4 w-16 bg-slate-100 rounded" />
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="h-8 w-24 bg-slate-100 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : sellers.length > 0 ? (
                sellers.map((seller) => (
                  <tr
                    key={seller.id || seller._id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={seller.avatar}
                          alt={seller.shopName}
                          className="h-10 w-10 rounded-2xl object-cover bg-slate-100 ring-4 ring-slate-50 flex-shrink-0"
                        />
                        <div className="max-w-[200px]">
                          <p className="text-xs font-extrabold text-slate-900 truncate">
                            {seller.shopName}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 truncate">
                            {seller.ownerName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                              {seller.category || "General"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-slate-500">
                          <HiOutlineCalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="text-[10px] font-bold">
                            Suspended: {seller.suspendedDate}
                          </span>
                        </div>
                        {seller.suspensionReason ? (
                          <p className="text-[10px] font-bold text-rose-600 bg-rose-50/50 px-2 py-1 rounded-lg border border-rose-100/50 max-w-[280px] break-words">
                            Reason: {seller.suspensionReason}
                          </p>
                        ) : (
                          <p className="text-[10px] font-semibold text-slate-400 italic">
                            No reason provided.
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-slate-700">
                          <HiOutlineDocumentText className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-[10px] font-bold">
                            {seller.productCount} products hidden
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <HiOutlineMapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-[10px] font-bold truncate max-w-[200px]">
                            {seller.location}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <Badge
                          variant="danger"
                          className="w-fit text-[8px] font-black uppercase tracking-widest"
                        >
                          Suspended
                        </Badge>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          Joined {seller.joinedDate}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedSeller(seller)}
                          className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-slate-800 transition-all shadow-md flex items-center gap-2"
                        >
                          <HiOutlineEye className="h-3.5 w-3.5" />
                          LOGS & DETAILS
                        </button>
                        <button
                          onClick={() => setSellerToUnsuspend(seller)}
                          className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-bold hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
                        >
                          <HiOutlineCheckCircle className="h-3.5 w-3.5" />
                          UNSUSPEND
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center">
                        <HiOutlineBuildingOffice2 className="h-8 w-8 text-slate-200" />
                      </div>
                      <p className="text-slate-500 font-bold text-sm">
                        No suspended sellers found.
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Clean history or no search matches.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex justify-between items-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Showing {(page - 1) * pageSize + 1} -{" "}
              {Math.min(page * pageSize, total)} of {total} sellers
            </p>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>

      <AnimatePresence>
        {/* Unsuspend confirmation modal */}
        {sellerToUnsuspend && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-hidden"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
              onClick={() => setSellerToUnsuspend(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 z-10"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                    <HiOutlineCheckCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-950">
                      Unsuspend Seller Account
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {sellerToUnsuspend.shopName}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                    This will reactivate the seller's account. They will be able to log in, access their dashboard, and all their active products will immediately be visible to customers again.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Unsuspension Reason / Notes (Optional)
                    </label>
                    <textarea
                      value={unsuspendReason}
                      onChange={(e) => setUnsuspendReason(e.target.value)}
                      placeholder="e.g. Issue resolved, verification cleared..."
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setSellerToUnsuspend(null);
                      setUnsuspendReason("");
                    }}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={unsuspending}
                    onClick={handleUnsuspendSeller}
                    className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {unsuspending ? "Unsuspending..." : "Confirm Unsuspend"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Seller details + audit log sheet */}
        {selectedSeller && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-hidden"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
              onClick={() => setSelectedSeller(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 z-10 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedSeller.avatar}
                    alt={selectedSeller.shopName}
                    className="h-14 w-14 rounded-2xl object-cover bg-slate-55 ring-4 ring-slate-100"
                  />
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      {selectedSeller.shopName}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {selectedSeller.ownerName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="danger" className="text-[8px] font-black uppercase">
                        Suspended
                      </Badge>
                      <span className="h-1 w-1 bg-slate-300 rounded-full" />
                      <span className="text-[10px] font-bold text-slate-500">
                        {selectedSeller.category || "General"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSeller(null)}
                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
                >
                  <HiOutlineXMark className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Store Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Contact & Location
                    </h4>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5 text-xs text-slate-700">
                        <HiOutlineEnvelope className="h-4 w-4 text-slate-400" />
                        <span className="font-semibold">{selectedSeller.email}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-slate-700">
                        <HiOutlinePhone className="h-4 w-4 text-slate-400" />
                        <span className="font-semibold">{selectedSeller.phone}</span>
                      </div>
                      <div className="flex items-start gap-2.5 text-xs text-slate-700">
                        <HiOutlineMapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                        <span className="font-semibold leading-relaxed">
                          {selectedSeller.location}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Suspension Summary
                    </h4>
                    <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 text-xs">
                      <p className="font-bold text-rose-800">
                        Suspended on {selectedSeller.suspendedDate}
                      </p>
                      <p className="text-[11px] text-rose-700 mt-2 font-medium break-words leading-relaxed">
                        Reason: {selectedSeller.suspensionReason || "No details provided."}
                      </p>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Suspension Audit Log History */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Suspension Audit Log
                  </h4>
                  {loadingAudit ? (
                    <div className="py-8 flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
                    </div>
                  ) : auditLog.length > 0 ? (
                    <div className="relative border-l border-slate-100 ml-3 pl-5 space-y-5">
                      {auditLog.map((log) => (
                        <div key={log._id} className="relative">
                          <span
                            className={cn(
                              "absolute -left-[27px] top-0 h-4 w-4 rounded-full border-2 border-white flex items-center justify-center shadow-sm",
                              log.action === "SUSPEND" ? "bg-rose-500" : "bg-emerald-500",
                            )}
                          />
                          <div className="space-y-1">
                            <p className="text-xs font-black text-slate-900">
                              {log.action === "SUSPEND" ? "Suspended" : "Unsuspended"}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              By: {log.adminName} ({new Date(log.createdAt).toLocaleString("en-GB")})
                            </p>
                            {log.reason && (
                              <p className="text-[11px] font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-w-md">
                                {log.reason}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400 font-bold">No historical suspension logs found.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Joined on {selectedSeller.joinedDate}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedSeller(null)}
                    className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuspendedSellers;
