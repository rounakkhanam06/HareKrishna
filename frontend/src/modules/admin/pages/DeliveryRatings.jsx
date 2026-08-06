import React, { useEffect, useState, useRef } from "react";
import Card from "@shared/components/ui/Card";
import Badge from "@shared/components/ui/Badge";
import Pagination from "@shared/components/ui/Pagination";
import {
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlineCalendarDays,
  HiOutlineXMark,
  HiOutlineEye,
  HiOutlineCheckCircle,
  HiOutlineEyeSlash,
  HiOutlineTrash,
  HiOutlineChatBubbleLeftRight,
} from "react-icons/hi2";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { adminApi } from "../services/adminApi";

const DeliveryRatings = () => {
  const [ratings, setRatings] = useState([]);
  const [distribution, setDistribution] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [totalReviews, setTotalReviews] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [starsFilter, setStarsFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [selectedRating, setSelectedRating] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [starsFilter, statusFilter, sortBy]);

  const fetchRatings = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        sortBy,
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (starsFilter !== "all") {
        params.stars = starsFilter;
      }
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const response = await adminApi.getDeliveryRatings(params);
      if (response.data.success) {
        const { items, total: count, totalPages: pages, analytics } = response.data.result;
        setRatings(items || []);
        setTotal(count || 0);
        setTotalPages(pages || 1);

        if (analytics) {
          setDistribution(analytics.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
          setTotalReviews(analytics.totalReviews || 0);
        }
      }
    } catch (error) {
      console.error("Failed to load delivery ratings:", error);
      toast.error("Failed to load delivery ratings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [page, pageSize, debouncedSearch, starsFilter, statusFilter, sortBy]);

  const handleModerate = async (id, status) => {
    try {
      const response = await adminApi.moderateDeliveryRating(id, status);
      if (response.data.success) {
        toast.success(`Rating status updated to "${status}" successfully.`);
        fetchRatings();
        if (selectedRating && selectedRating._id === id) {
          setSelectedRating(null);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to moderate rating.");
    }
  };

  const calculatedAverage = (() => {
    let sum = 0;
    let count = 0;
    for (let i = 1; i <= 5; i++) {
      sum += i * (distribution[i] || 0);
      count += distribution[i] || 0;
    }
    return count > 0 ? (sum / count).toFixed(1) : "0.0";
  })();

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Delivery Ratings & Moderation
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Manage, moderate, and analyze delivery partner reviews and performance metrics.
          </p>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              Average Delivery Rating
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900">{calculatedAverage}</span>
              <span className="text-sm font-bold text-slate-400">/ 5.0</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-yellow-400 mt-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={cn(
                  "h-5 w-5 fill-current",
                  star <= Math.round(Number(calculatedAverage)) ? "text-yellow-400" : "text-slate-200"
                )}
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="text-xs font-bold text-slate-400 ml-1">
              ({totalReviews} total reviews)
            </span>
          </div>
        </Card>

        {/* Rating Distribution Chart */}
        <Card className="p-5 md:col-span-2 space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Rating Distribution
          </h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = distribution[stars] || 0;
              const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-xs">
                  <span className="w-10 font-bold text-slate-600 flex items-center gap-0.5">
                    {stars} ★
                  </span>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-slate-400 font-bold">
                    {count} ({percent}%)
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Filters and Datatable */}
      <Card className="p-0 overflow-hidden border border-slate-100 shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <HiOutlineMagnifyingGlass className="h-5 w-5 text-slate-400" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by rider or customer name..."
              className="block w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Stars Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase">Stars:</span>
              <select
                value={starsFilter}
                onChange={(e) => setStarsFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold focus:border-brand-500 focus:outline-none bg-white transition-colors"
              >
                <option value="all">All Stars</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold focus:border-brand-500 focus:outline-none bg-white transition-colors"
              >
                <option value="all">All States</option>
                <option value="visible">Visible</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>

            {/* Sorting */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold focus:border-brand-500 focus:outline-none bg-white transition-colors"
              >
                <option value="recent">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500" />
              <span className="text-sm font-semibold">Loading reviews...</span>
            </div>
          ) : ratings.length === 0 ? (
            <div className="py-24 text-center">
              <HiOutlineChatBubbleLeftRight className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-base font-bold text-slate-800 mb-1">No Delivery Ratings Found</h3>
              <p className="text-xs text-slate-400 max-w-[300px] mx-auto">
                Try loosening your filters or search terms to display results.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Rider / Partner</th>
                  <th className="px-6 py-4">Seller</th>
                  <th className="px-6 py-4 text-center">Rating</th>
                  <th className="px-6 py-4">Review & Tags</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                {ratings.map((rating) => (
                  <tr key={rating._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      #{rating.order?.orderId || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">
                          {rating.customer?.name || "N/A"}
                        </span>
                        <span className="text-xs text-slate-400">{rating.customer?.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {rating.deliveryPartner?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {rating.seller?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center bg-yellow-50 border border-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold text-xs">
                        {rating.stars} ★
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="space-y-1.5">
                        {rating.tags && rating.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {rating.tags.map((t) => (
                              <span
                                key={t}
                                className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {rating.review && (
                          <p className="text-xs text-slate-500 italic line-clamp-2">
                            "{rating.review}"
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(rating.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          rating.status === "visible"
                            ? "success"
                            : rating.status === "hidden"
                            ? "warning"
                            : "danger"
                        }
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
                      >
                        {rating.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedRating(rating)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 shadow-sm border border-slate-100"
                          title="View Details"
                        >
                          <HiOutlineEye className="h-4 w-4" />
                        </button>
                        {rating.status === "visible" ? (
                          <button
                            onClick={() => handleModerate(rating._id, "hidden")}
                            className="p-1.5 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors text-slate-600 shadow-sm border border-slate-100"
                            title="Hide Review"
                          >
                            <HiOutlineEyeSlash className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleModerate(rating._id, "visible")}
                            className="p-1.5 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors text-slate-600 shadow-sm border border-slate-100"
                            title="Unhide Review"
                          >
                            <HiOutlineCheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleModerate(rating._id, "deleted")}
                          className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors text-slate-600 shadow-sm border border-slate-100"
                          title="Soft Delete"
                        >
                          <HiOutlineTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-100 p-4">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* Details View Modal */}
      <AnimatePresence>
        {selectedRating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-100 relative"
            >
              <button
                onClick={() => setSelectedRating(null)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>

              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Rating Details</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Order: #{selectedRating.order?.orderId || "—"}
                </p>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="font-bold text-slate-400 uppercase tracking-wide">Rider Name</span>
                  <span className="font-semibold text-slate-800">{selectedRating.deliveryPartner?.name || "N/A"}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="font-bold text-slate-400 uppercase tracking-wide">Customer Name</span>
                  <span className="font-semibold text-slate-800">{selectedRating.customer?.name || "N/A"}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="font-bold text-slate-400 uppercase tracking-wide">Seller Store</span>
                  <span className="font-semibold text-slate-800">{selectedRating.seller?.name || "N/A"}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="font-bold text-slate-400 uppercase tracking-wide">Stars Submitted</span>
                  <div className="inline-flex items-center bg-yellow-50 border border-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-black">
                    {selectedRating.stars} ★
                  </div>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="font-bold text-slate-400 uppercase tracking-wide">Submit Date</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(selectedRating.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedRating.tags && selectedRating.tags.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Feedback Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRating.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-bold text-slate-600"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedRating.review && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Review Comment</span>
                  <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100/50 rounded-2xl p-3 leading-relaxed">
                    "{selectedRating.review}"
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-3">
                <button
                  onClick={() => setSelectedRating(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                {selectedRating.status === "visible" ? (
                  <button
                    onClick={() => handleModerate(selectedRating._id, "hidden")}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    Hide Review
                  </button>
                ) : (
                  <button
                    onClick={() => handleModerate(selectedRating._id, "visible")}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    Unhide Review
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeliveryRatings;
