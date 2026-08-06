import React, { useState, useEffect } from "react";
import Card from "@shared/components/ui/Card";
import Badge from "@shared/components/ui/Badge";
import Pagination from "@shared/components/ui/Pagination";
import { adminApi } from "../services/adminApi";
import {
  HiOutlineStar,
  HiOutlineTrash,
  HiOutlineShieldCheck,
  HiOutlineExclamationTriangle,
  HiOutlineChatBubbleBottomCenterText,
  HiOutlineMagnifyingGlass,
  HiOutlineEyeSlash,
  HiOutlineEye,
  HiOutlineChartBarSquare,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineClock
} from "react-icons/hi2";
import { useToast } from "@shared/components/ui/Toast";
import Modal from "@shared/components/ui/Modal";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";

const ReviewModeration = () => {
  const { showToast } = useToast();
  
  // Tabs
  const [activeTab, setActiveTab] = useState("logs"); // "logs" | "insights"
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "visible" | "hidden" | "deleted"
  
  // Data
  const [reviews, setReviews] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  
  // Pagination & Search
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Action Modal State
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [moderationAction, setModerationAction] = useState(""); // "hide" | "unhide" | "delete" | "restore"
  const [reasonText, setReasonText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReviews = async (requestedPage = 1) => {
    try {
      setLoading(true);
      const params = {
        page: requestedPage,
        limit: pageSize,
        search: searchTerm,
      };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const res = await adminApi.getAdminProductReviews(params);
      if (res.data.success) {
        const payload = res.data.result || {};
        setReviews(payload.items || []);
        setTotal(payload.total || 0);
        setPage(payload.page || requestedPage);
      }
    } catch (error) {
      console.error("Fetch Reviews Error:", error);
      showToast("Failed to load reviews", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const res = await adminApi.getAdminProductReviewsAnalytics();
      if (res.data.success) {
        setAnalytics(res.data.result);
      }
    } catch (error) {
      console.error("Fetch Analytics Error:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(1);
  }, [statusFilter, pageSize, searchTerm]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const openActionModal = (review, action) => {
    setSelectedReview(review);
    setModerationAction(action);
    setReasonText("");
    setIsActionModalOpen(true);
  };

  const handleModerationSubmit = async () => {
    if (!reasonText.trim()) {
      showToast("A reason is required for the audit trail", "error");
      return;
    }
    setActionLoading(true);
    try {
      const res = await adminApi.updateAdminProductReviewStatus(selectedReview._id, {
        action: moderationAction,
        reason: reasonText.trim(),
      });
      if (res.data.success) {
        showToast(`Action '${moderationAction}' applied successfully`, "success");
        setIsActionModalOpen(false);
        fetchReviews(page);
        fetchAnalytics(); // Refresh analytics as distributions change
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Action failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="ds-section-spacing animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Title Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1">
        <div>
          <h1 className="ds-h1">Product Review Suite</h1>
          <p className="ds-description mt-0.5">Moderate community content, flag sellers, and view catalog quality insights.</p>
        </div>
        
        {/* Tab switchers */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("logs")}
            className={cn(
              "px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5",
              activeTab === "logs" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <HiOutlineAdjustmentsHorizontal size={14} />
            Moderation Logs
          </button>
          <button
            onClick={() => setActiveTab("insights")}
            className={cn(
              "px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5",
              activeTab === "insights" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <HiOutlineChartBarSquare size={14} />
            Catalog Insights
          </button>
        </div>
      </div>

      {activeTab === "logs" ? (
        <div className="space-y-6">
          {/* Filter Bar & Search */}
          <Card className="border-none shadow-sm ring-1 ring-slate-100 p-3 bg-white/80 backdrop-blur-xl">
            <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
              {/* Status Filters */}
              <div className="flex gap-2 flex-wrap w-full lg:w-auto">
                {[
                  { label: "All Reviews", val: "all" },
                  { label: "Visible", val: "visible" },
                  { label: "Hidden / Flagged", val: "hidden" },
                  { label: "Soft Deleted", val: "deleted" },
                ].map((tab) => (
                  <button
                    key={tab.val}
                    onClick={() => setStatusFilter(tab.val)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                      statusFilter === tab.val
                        ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                        : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative group w-full lg:w-80">
                <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-brand-500 transition-all" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search reviews by comment or customer..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100/50 border-none rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/5 transition-all outline-none"
                />
              </div>
            </div>
          </Card>

          {/* Reviews List */}
          {loading ? (
            <div className="flex justify-center p-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            </div>
          ) : reviews.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {reviews.map((r) => (
                <Card key={r._id} className="p-5 border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-2xl group overflow-hidden relative">
                  <div className="flex flex-col lg:flex-row gap-6 relative z-10">
                    
                    {/* Customer & Product Information */}
                    <div className="lg:w-72 shrink-0 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center font-black text-brand-500 text-lg">
                          {r.customerName?.[0] || "?"}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800">{r.customerName}</h4>
                          <span className="text-[9px] font-bold text-slate-400 tracking-wider">
                            ID: {r._id.slice(-6)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <HiOutlineStar
                            key={star}
                            className={cn(
                              "h-4 w-4",
                              star <= r.stars
                                ? "text-amber-400 fill-amber-400"
                                : "text-slate-200 fill-transparent"
                            )}
                          />
                        ))}
                      </div>

                      <div className="space-y-1 bg-slate-50 p-3 rounded-xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Product</p>
                        <p className="text-xs font-bold text-slate-700 truncate">{r.productId?.name || "Deleted Product"}</p>
                        <p className="text-[9px] font-semibold text-slate-400">Seller ID: {r.sellerId || "N/A"}</p>
                      </div>
                    </div>

                    {/* Review text & tags */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                            r.status === "visible" ? "bg-emerald-50 text-emerald-600" :
                            r.status === "hidden" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                          )}>
                            {r.status}
                          </span>
                          {r.isVerifiedPurchase && (
                            <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              Verified Purchase
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          Submitted: {new Date(r.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <blockquote className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border-l-4 border-slate-200 italic">
                        "{r.review}"
                      </blockquote>

                      {/* Tags */}
                      {r.tags && r.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {r.tags.map((t, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[9px] font-bold px-2 py-0.5">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Review Images */}
                      {r.images && r.images.length > 0 && (
                        <div className="flex gap-2 pt-1.5 overflow-x-auto">
                          {r.images.map((img, i) => (
                            <a
                              key={i}
                              href={img}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 block hover:opacity-85"
                            >
                              <img src={applyCloudinaryTransform(img)} alt="review-proof" className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Audit Log reasons if any */}
                      {r.moderationHistory && r.moderationHistory.length > 0 && (
                        <div className="border-t border-slate-100 pt-3 mt-3">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <HiOutlineClock size={12} />
                            Moderation History Logs
                          </p>
                          <div className="space-y-1.5 mt-1.5">
                            {r.moderationHistory.map((log, idx) => (
                              <div key={idx} className="text-[11px] text-slate-500 font-semibold bg-slate-50 p-2 rounded-lg">
                                <span className="font-extrabold text-slate-700">{log.action.toUpperCase()}</span>: "{log.reason}" by Admin ({new Date(log.performedAt).toLocaleDateString()})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Moderation Actions Column */}
                    <div className="lg:w-44 flex lg:flex-col items-center justify-center gap-3">
                      {r.status === "visible" ? (
                        <button
                          onClick={() => openActionModal(r, "hide")}
                          className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-1.5"
                        >
                          <HiOutlineEyeSlash size={14} />
                          HIDE REVIEW
                        </button>
                      ) : (
                        <button
                          onClick={() => openActionModal(r, "unhide")}
                          className="w-full py-2.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-1.5"
                        >
                          <HiOutlineEye size={14} />
                          APPROVE / SHOW
                        </button>
                      )}

                      {r.status !== "deleted" ? (
                        <button
                          onClick={() => openActionModal(r, "delete")}
                          className="w-full py-2.5 bg-white text-rose-500 border border-rose-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-1.5"
                        >
                          <HiOutlineTrash size={14} />
                          SOFT DELETE
                        </button>
                      ) : (
                        <button
                          onClick={() => openActionModal(r, "restore")}
                          className="w-full py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5"
                        >
                          <HiOutlineShieldCheck size={14} />
                          RESTORE ACTIVE
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-20 text-center rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-black uppercase text-sm">No reviews found matching logs filter.</p>
            </div>
          )}

          {/* Pagination */}
          {total > pageSize && (
            <div className="mt-6 flex justify-center">
              <Pagination
                page={page}
                totalPages={Math.ceil(total / pageSize) || 1}
                total={total}
                pageSize={pageSize}
                onPageChange={(p) => fetchReviews(p)}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
                loading={loading}
              />
            </div>
          )}
        </div>
      ) : (
        /* INSIGHTS SUB-TAB */
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="flex justify-center p-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Highest Rated */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <HiOutlineStar className="text-emerald-500 fill-emerald-100" />
                  Top Rated Products
                </h3>
                <div className="space-y-3">
                  {analytics?.highestRated?.map((p, idx) => (
                    <div key={p._id || idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50">
                      <img src={applyCloudinaryTransform(p.mainImage)} alt="" className="w-10 h-10 object-cover rounded-lg border" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{p.totalRatings || 0} customer ratings</p>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        {p.averageRating.toFixed(1)}★
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lowest Rated */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <HiOutlineExclamationTriangle className="text-rose-500 fill-rose-100" />
                  Lowest Rated (Flag Sellers)
                </h3>
                <div className="space-y-3">
                  {analytics?.lowestRated?.map((p, idx) => (
                    <div key={p._id || idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50">
                      <img src={applyCloudinaryTransform(p.mainImage)} alt="" className="w-10 h-10 object-cover rounded-lg border" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{p.totalRatings || 0} customer ratings</p>
                      </div>
                      <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                        {p.averageRating.toFixed(1)}★
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Most Reviewed */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <HiOutlineChatBubbleBottomCenterText className="text-indigo-500 fill-indigo-100" />
                  Most Active Feedback
                </h3>
                <div className="space-y-3">
                  {analytics?.mostReviewed?.map((p, idx) => (
                    <div key={p._id || idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50">
                      <img src={applyCloudinaryTransform(p.mainImage)} alt="" className="w-10 h-10 object-cover rounded-lg border" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{p.averageRating.toFixed(1)}★ average</p>
                      </div>
                      <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {p.totalReviews || 0} reviews
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tag Cloud */}
              <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <h3 className="text-base font-black text-slate-800">Tag Distribution Trends</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Positive Tags */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Global Positive Tags</span>
                    <div className="flex flex-wrap gap-2">
                      {analytics?.positiveTags?.length > 0 ? (
                        analytics.positiveTags.map((t) => (
                          <span
                            key={t.tag}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-semibold"
                          >
                            {t.tag} ({t.count})
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 font-bold">No positive tags recorded</p>
                      )}
                    </div>
                  </div>

                  {/* Negative Tags */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Global Negative Tags</span>
                    <div className="flex flex-wrap gap-2">
                      {analytics?.negativeTags?.length > 0 ? (
                        analytics.negativeTags.map((t) => (
                          <span
                            key={t.tag}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-full text-xs font-semibold"
                          >
                            {t.tag} ({t.count})
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 font-bold">No negative tags recorded</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Moderation Action Modal */}
      <Modal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        title={`Audit Action: ${moderationAction?.toUpperCase()}`}
      >
        <div className="space-y-4">
          {selectedReview && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Review Details</p>
              <p className="text-xs font-bold text-slate-800">Customer: {selectedReview.customerName}</p>
              <p className="text-xs font-medium text-slate-500 italic mt-1">"{selectedReview.review}"</p>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase">Reason for action *</label>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Provide a detailed audit reason for this moderation decision..."
              className="w-full bg-slate-100 border-none rounded-2xl p-4 text-xs font-semibold min-h-[100px] outline-none ring-1 ring-transparent focus:ring-brand-500/20"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsActionModalOpen(false)}
              className="flex-1 py-3 bg-slate-150 text-slate-600 text-xs font-black uppercase rounded-2xl hover:bg-slate-200 transition-colors"
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleModerationSubmit}
              className="flex-1 py-3 bg-brand-500 text-white text-xs font-black uppercase rounded-2xl shadow-lg shadow-brand-200 hover:bg-slate-900 transition-all flex items-center justify-center gap-1.5"
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  SUBMITTING...
                </>
              ) : (
                "CONFIRM DECISION"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReviewModeration;
