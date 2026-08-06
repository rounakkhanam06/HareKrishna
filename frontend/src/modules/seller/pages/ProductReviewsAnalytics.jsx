import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  MessageSquare,
  TrendingUp,
  Loader2,
  Calendar,
  Filter,
} from "lucide-react";
import { sellerApi } from "../services/sellerApi";
import { toast } from "sonner";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import { getOrderSocket } from "@/core/services/orderSocket";
import { STORAGE_KEYS } from "@core/utils/storage";

const ProductReviewsAnalytics = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [starsFilter, setStarsFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const fetchProduct = async () => {
    try {
      const res = await sellerApi.getProductById(id);
      if (res.data.success) {
        setProduct(res.data.result);
      }
    } catch (error) {
      console.error("Failed to fetch product details:", error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await sellerApi.getProductReviewAnalytics(id);
      if (res.data.success) {
        setAnalytics(res.data.result);
      }
    } catch (error) {
      console.error("Failed to fetch review analytics:", error);
    }
  };

  const fetchReviews = async (pageNum = 1) => {
    try {
      setReviewsLoading(true);
      const params = {
        page: pageNum,
        limit: 10,
      };
      if (starsFilter) {
        params.stars = starsFilter;
      }
      const res = await sellerApi.getProductReviews(id, params);
      if (res.data.success) {
        setReviews(res.data.result?.items || []);
        setPage(res.data.result?.page || 1);
        setTotalPages(res.data.result?.totalPages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch product reviews:", error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchProduct(), fetchAnalytics(), fetchReviews(1)]);
    setLoading(false);
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, starsFilter]);

  // Real-time socket listener
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS?.AUTH_SELLER || "auth_token_seller");
    if (!token) return;
    const socket = getOrderSocket(token);
    if (socket) {
      const handleNewReview = () => {
        toast.info("A new review was submitted for this product!");
        fetchAnalytics();
        fetchReviews(1);
      };
      socket.on("product:review:new", handleNewReview);
      return () => {
        socket.off("product:review:new", handleNewReview);
      };
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const ratingSummary = analytics?.ratingSummary || {
    averageRating: 0,
    totalRatings: 0,
    totalReviews: 0,
    ratingDistribution: { star1: 0, star2: 0, star3: 0, star4: 0, star5: 0 },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/seller/products")}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800">
              {product?.name || "Product"} Reviews
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Review Analytics & Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Analytics */}
        <div className="lg:col-span-1 space-y-6">
          {/* Average rating card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-800">Overall Rating</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-slate-900">
                {Number(ratingSummary.averageRating || 0).toFixed(1)}
              </span>
              <span className="text-sm font-bold text-slate-400">/ 5</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-6 w-6 ${
                    star <= (ratingSummary.averageRating || 0)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-slate-200 fill-transparent"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Based on {ratingSummary.totalRatings || 0} customer ratings
            </p>
          </div>

          {/* Rating Distribution */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
            <h3 className="text-base font-black text-slate-800">Rating Distribution</h3>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingSummary.ratingDistribution?.[`star${star}`] || 0;
              const total = ratingSummary.totalRatings || 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              const isActive = String(starsFilter) === String(star);

              return (
                <button
                  key={star}
                  onClick={() => setStarsFilter(isActive ? "" : String(star))}
                  className={`w-full flex items-center gap-3 p-1.5 rounded-xl transition-all text-left ${
                    isActive ? "bg-slate-50 ring-1 ring-slate-200" : "hover:bg-slate-50/50"
                  }`}
                >
                  <span className="text-xs font-black text-slate-700 w-6">{star} ★</span>
                  <div className="flex-grow h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-400 w-8 text-right">
                    {count}
                  </span>
                </button>
              );
            })}
            {starsFilter && (
              <button
                onClick={() => setStarsFilter("")}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 underline block mt-2"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Tag Cloud */}
          {(analytics?.positiveTags?.length > 0 || analytics?.negativeTags?.length > 0) && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-800">Tag Feedback Insights</h3>
              
              {/* Positive Tags */}
              {analytics.positiveTags.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Positive Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {analytics.positiveTags.map((t) => (
                      <span
                        key={t.tag}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-semibold"
                      >
                        {t.tag} ({t.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Negative Tags */}
              {analytics.negativeTags.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Negative Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {analytics.negativeTags.map((t) => (
                      <span
                        key={t.tag}
                        className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-full text-xs font-semibold"
                      >
                        {t.tag} ({t.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Monthly Trend */}
          {analytics?.monthlyRatingTrend?.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-800">Monthly Rating Trend</h3>
              <div className="space-y-3">
                {analytics.monthlyRatingTrend.map((t) => (
                  <div key={t.period} className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-slate-400" />
                      {t.period}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${(t.averageRating / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-slate-900 font-extrabold w-8 text-right">
                        {t.averageRating.toFixed(1)}★
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Reviews List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <MessageSquare size={18} className="text-slate-400" />
                Customer Review Logs
              </h3>
              {starsFilter && (
                <span className="px-2 py-0.5 bg-brand-50 text-brand-600 rounded-md text-[10px] font-bold">
                  Filtered: {starsFilter} ★
                </span>
              )}
            </div>

            {reviewsLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-6">
                {reviews.map((r) => (
                  <div key={r.id} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-xl">
                          {r.customerName}
                        </span>
                        {r.isVerifiedPurchase && (
                          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Verified Purchase
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={12}
                          className={`${
                            star <= r.stars
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-slate-200 fill-transparent"
                          }`}
                        />
                      ))}
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                      {r.review}
                    </p>

                    {/* Tags */}
                    {r.tags && r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {r.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 bg-white text-slate-500 border border-slate-100 rounded-md text-[9px] font-bold"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Images */}
                    {r.images && r.images.length > 0 && (
                      <div className="flex gap-1.5 overflow-x-auto pt-1">
                        {r.images.map((img, i) => (
                          <a
                            key={i}
                            href={img}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 block hover:opacity-85"
                          >
                            <img src={applyCloudinaryTransform(img)} alt="attached" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      disabled={page === 1}
                      onClick={() => fetchReviews(page - 1)}
                      className="px-4.5 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-xs font-bold text-slate-400">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      disabled={page === totalPages}
                      onClick={() => fetchReviews(page + 1)}
                      className="px-4.5 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                No customer reviews logged yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductReviewsAnalytics;
