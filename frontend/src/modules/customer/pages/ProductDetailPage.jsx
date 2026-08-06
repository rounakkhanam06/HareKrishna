import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Heart, Plus, Minus, Star, ShieldCheck, Clock, ArrowLeft, MessageSquare, ShieldAlert } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '@shared/components/ui/Toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { customerApi } from '../services/customerApi';
import { useLocation as useAppLocation } from '../context/LocationContext';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';
import { useSettings } from '@core/context/SettingsContext';
import Lottie from 'lottie-react';

const ProductDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
    const { toggleWishlist: toggleWishlistGlobal, isInWishlist } = useWishlist();
    const { showToast } = useToast();
    const { currentLocation } = useAppLocation();
    const { settings } = useSettings();

    const [product, setProduct] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeImage, setActiveImage] = useState('');
    const [reviews, setReviews] = useState([]);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewSummary, setReviewSummary] = useState(null);
    const [mostUsedTags, setMostUsedTags] = useState([]);
    const [reviewPage, setReviewPage] = useState(1);
    const [reviewTotalPages, setReviewTotalPages] = useState(1);
    const [filterStars, setFilterStars] = useState("");
    const [reviewSortBy, setReviewSortBy] = useState("newest");
    const [noServiceData, setNoServiceData] = useState(null);

    // Dynamically load no-service Lottie on mount
    useEffect(() => {
        import('@/assets/lottie/animation.json')
            .then((m) => setNoServiceData(m.default))
            .catch(() => {});
    }, []);

    const fetchData = async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        setError(null);
        try {
            const hasValidLocation =
                Number.isFinite(currentLocation?.latitude) &&
                Number.isFinite(currentLocation?.longitude);

            const params = hasValidLocation ? {
                lat: currentLocation.latitude,
                lng: currentLocation.longitude
            } : {};

            const res = await customerApi.getProductById(id, params);
            if (res.data.success) {
                const p = res.data.result;
                const formatted = {
                    ...p,
                    id: p._id,
                    images: [p.mainImage, ...(p.galleryImages || [])].filter(Boolean)
                };
                setProduct(formatted);
                setActiveImage(formatted.images[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600&auto=format&fit=crop');
                if (p.variants && p.variants.length > 0) {
                    setSelectedVariant(p.variants[0]);
                } else {
                    setSelectedVariant(null);
                }
                fetchReviews();
            }
        } catch (err) {
            console.error("Fetch product error:", err);
            setError(err.response?.data?.message || "Failed to load product");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchReviews = async (page = 1) => {
        try {
            setReviewLoading(true);
            const params = {
                page,
                limit: 10,
                sortBy: reviewSortBy
            };
            if (filterStars) {
                params.stars = filterStars;
            }
            const [reviewsRes, summaryRes] = await Promise.all([
                customerApi.getProductReviews(id, params),
                customerApi.getProductReviewSummary(id)
            ]);

            if (reviewsRes.data.success) {
                setReviews(reviewsRes.data.result?.items || []);
                setReviewPage(reviewsRes.data.result?.page || 1);
                setReviewTotalPages(reviewsRes.data.result?.totalPages || 1);
            }
            if (summaryRes.data.success) {
                setReviewSummary(summaryRes.data.result?.ratingSummary);
                setMostUsedTags(summaryRes.data.result?.mostUsedTags || []);
            }
        } catch (error) {
            console.error("Fetch reviews error:", error);
        } finally {
            setReviewLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchReviews(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, reviewSortBy, filterStars]);

    useEffect(() => {
        if (id && product) {
            fetchData(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentLocation?.latitude, currentLocation?.longitude]);

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!newReview.comment.trim()) return;

        try {
            setIsSubmittingReview(true);
            const res = await customerApi.submitReview({
                productId: id,
                rating: newReview.rating,
                comment: newReview.comment
            });
            if (res.data.success) {
                showToast("Review submitted for moderation", "success");
                const submittedData = res.data.result || {};
                const createdReview = {
                    _id: submittedData._id || Date.now().toString(),
                    customerName: user?.name || "You",
                    stars: Number(submittedData.rating ?? newReview.rating),
                    rating: Number(submittedData.rating ?? newReview.rating),
                    comment: submittedData.comment || newReview.comment,
                    review: submittedData.comment || newReview.comment,
                    createdAt: submittedData.createdAt || new Date().toISOString()
                };
                setReviews((prev) => [createdReview, ...prev]);
                setNewReview({ rating: 5, comment: '' });
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to submit review", "error");
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleToggleWishlist = () => {
        if (!product) return;
        toggleWishlistGlobal(product);
        const isWishlisted = isInWishlist(product.id);
        showToast(
            isWishlisted ? `${product.name} removed from wishlist` : `${product.name} added to wishlist`,
            isWishlisted ? 'info' : 'success'
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen bg-white py-20 px-8 flex flex-col items-center justify-center text-center">
                <div className="w-64 h-64 mb-6">
                    {noServiceData ? (
                        <Lottie animationData={noServiceData} loop={true} />
                    ) : (
                        <div className="w-64 h-64" />
                    )}
                </div>
                <h3 className="text-3xl font-[1000] text-slate-800 tracking-tighter mb-4 uppercase">
                    Item <span className="text-primary">Unavailable</span>
                </h3>
                <p className="text-slate-500 font-bold text-sm max-w-[280px] mb-8 leading-relaxed">
                    {error === "Product not available in your area" 
                        ? "This item is not available at your current location yet." 
                        : "We couldn't load this product details. Try again later!"}
                </p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button 
                        onClick={() => navigate('/')}
                        className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-black/10"
                    >
                        Go to Home
                    </button>
                    <button 
                        onClick={() => navigate(-1)}
                        className="px-10 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const variantSku = String(selectedVariant?.sku || selectedVariant?.name || "").trim();
    const cartItem = cart.find(
        (item) =>
            item.id === product.id &&
            String(item.variantSku || "").trim() === variantSku
    );
    const quantity = cartItem ? cartItem.quantity : 0;
    const isWishlisted = isInWishlist(product.id);

    const activePrice = selectedVariant ? (selectedVariant.salePrice || selectedVariant.price) : (product.salePrice || product.price);
    const mrpPrice = selectedVariant ? selectedVariant.price : product.price;

    const displayWeight = selectedVariant && selectedVariant.name && selectedVariant.name !== "Default"
        ? selectedVariant.name
        : (product.weight || '1 unit');

    return (
        <div className="relative z-10 py-8 w-full max-w-[1920px] mx-auto px-4 md:px-[50px] animate-in fade-in duration-700 mt-24">
            <Link to={-1} className="inline-flex items-center gap-2 text-slate-500 hover:text-primary font-bold mb-6 transition-colors group">
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Back
            </Link>

            <div className="flex flex-col lg:flex-row gap-10 xl:gap-16">
                <div className="lg:w-[45%] xl:w-[40%] space-y-4">
                    <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-white border border-slate-100 shadow-sm transition-all hover:shadow-xl group">
                        <img
                            src={applyCloudinaryTransform(activeImage, "f_auto,q_auto,w_800")}
                            alt={product.name}
                            loading="lazy"
                            className="w-full h-full object-contain p-2 md:p-4 transition-transform duration-700 group-hover:scale-105"
                        />
                        <button
                            onClick={handleToggleWishlist}
                            className={cn(
                                "absolute top-5 right-5 p-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-110",
                                isWishlisted ? "bg-red-50 text-red-500" : "bg-white text-slate-400"
                            )}
                        >
                            <Heart size={20} className={cn(isWishlisted && "fill-current")} />
                        </button>
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {product.images.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveImage(img)}
                                className={cn(
                                    "relative h-20 w-20 md:h-24 md:w-24 rounded-2xl overflow-hidden flex-shrink-0 transition-all border-2",
                                    activeImage === img ? "border-primary shadow-lg scale-95" : "border-transparent opacity-70 hover:opacity-100"
                                )}
                            >
                                <img src={applyCloudinaryTransform(img, "f_auto,q_auto,w_150")} alt={`Angle ${idx}`} loading="lazy" className="w-full h-full object-contain p-1" />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="lg:w-[55%] xl:w-[60%] space-y-6 md:space-y-8">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-primary/20">
                                {product.categoryId?.name || 'Essential'}
                            </span>
                            <div className="flex items-center gap-1 text-orange-500 font-bold bg-orange-50 px-3 py-0.5 rounded-full text-xs">
                                <Star size={12} fill="currentColor" /> {reviewSummary?.averageRating ? reviewSummary.averageRating.toFixed(1) : (reviews.length > 0 ? (reviews.reduce((acc, r) => acc + (r.stars ?? r.rating ?? 0), 0) / reviews.length).toFixed(1) : '0.0')} ({reviewSummary?.totalReviews ?? reviews.length})
                            </div>
                        </div>

                        <h1 className="text-3xl md:text-4xl font-black text-slate-800 leading-tight mb-3">
                            {product.name}
                        </h1>

                        <div className="flex items-baseline gap-4 mb-5">
                            <span className="text-4xl font-black text-primary">₹{activePrice}</span>
                            {(activePrice && activePrice < mrpPrice) && (
                                <span className="text-lg text-slate-400 line-through font-bold">₹{mrpPrice}</span>
                            )}
                            {activePrice && activePrice < mrpPrice && (
                                <span className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded-lg font-black uppercase">
                                    {Math.round(((mrpPrice - activePrice) / mrpPrice) * 100)}% OFF
                                </span>
                            )}
                        </div>
 
                        <p className="text-slate-600 text-lg leading-relaxed mb-6 font-medium max-w-2xl">
                            {product.description || "Fresh and premium quality product sourced directly from local vendors."}
                        </p>

                        {/* Variants Selector */}
                        {product.variants && product.variants.length > 0 && (
                            <div className="mt-5 border-t border-slate-100 pt-5">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Select Variant</h4>
                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                    {product.variants.map((v, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedVariant(v)}
                                            className={cn(
                                                "flex-shrink-0 px-5 py-2.5 font-bold rounded-xl text-sm transition-all relative border-2",
                                                selectedVariant?.sku === v.sku
                                                    ? "bg-[#153628]/10 border-primary text-primary shadow-sm shadow-brand-100"
                                                    : "bg-slate-50 border-slate-100 text-slate-500"
                                            )}
                                        >
                                            {v.name}
                                            {selectedVariant?.sku === v.sku && (
                                                <div className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-bl-lg" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
 
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                        {quantity > 0 ? (
                            <div className="flex items-center bg-primary text-primary-foreground rounded-2xl h-16 w-full sm:w-auto px-2 shadow-xl shadow-brand-100">
                                <button
                                    onClick={() => {
                                        if (quantity === 1) {
                                            removeFromCart(product.id, String(selectedVariant?.sku || selectedVariant?.name || "").trim());
                                        } else {
                                            updateQuantity(product.id, -1, String(selectedVariant?.sku || selectedVariant?.name || "").trim());
                                        }
                                    }}
                                    className="w-12 h-12 flex items-center justify-center hover:bg-white/20 rounded-xl transition-all"
                                >
                                    <Minus size={24} strokeWidth={3} />
                                </button>
                                <span className="w-16 text-center font-black text-xl">{quantity}</span>
                                <button
                                    onClick={() => updateQuantity(product.id, 1, String(selectedVariant?.sku || selectedVariant?.name || "").trim())}
                                    className="w-12 h-12 flex items-center justify-center hover:bg-white/20 rounded-xl transition-all"
                                >
                                    <Plus size={24} strokeWidth={3} />
                                </button>
                            </div>
                        ) : (
                            <Button
                                onClick={() => {
                                    addToCart({
                                        ...product,
                                        variantSku: String(selectedVariant?.sku || selectedVariant?.name || "").trim(),
                                    });
                                    showToast(`${product.name} added to cart`, 'success');
                                }}
                                className="h-16 w-full sm:w-64 bg-primary hover:bg-[var(--brand-400)] text-white text-lg font-black rounded-2xl shadow-xl transition-all hover:-translate-y-1"
                            >
                                <Plus className="mr-2" size={24} strokeWidth={3} /> ADD TO CART
                            </Button>
                        )}

                        <div className="flex flex-col gap-1 text-center sm:text-left">
                            <span className="text-xs font-black text-primary uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1">
                                <ShieldCheck size={14} /> Quality Guaranteed
                            </span>
                            <span className="text-sm font-bold text-slate-400 flex items-center justify-center sm:justify-start gap-1">
                                <Clock size={14} /> Delivered in 10-15 mins
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Weight</p>
                            <p className="text-sm font-black text-slate-800">{displayWeight}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Stock</p>
                            <p className="text-sm font-black text-slate-800">{product.stock > 0 ? 'In Stock' : 'Out of Stock'}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Brand</p>
                            <p className="text-sm font-black text-slate-800">{product.brand || 'Premium'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-20 border-t border-slate-100 pt-16">
                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Left: Summary and Distribution */}
                    <div className="lg:w-[35%]">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-24 space-y-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 mb-2">Ratings & Reviews</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-slate-900">
                                        {(reviewSummary?.averageRating ?? product?.averageRating ?? 0).toFixed(1)}
                                    </span>
                                    <span className="text-sm font-bold text-slate-400">/ 5</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={cn(
                                                "h-5 w-5",
                                                star <= (reviewSummary?.averageRating ?? product?.averageRating ?? 0)
                                                    ? "text-yellow-400 fill-yellow-400"
                                                    : "text-slate-200 fill-transparent"
                                            )}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                                    {(reviewSummary?.totalRatings ?? product?.totalRatings ?? 0)} Ratings & {(reviewSummary?.totalReviews ?? product?.totalReviews ?? 0)} Reviews
                                </p>
                            </div>

                            {/* Rating Distribution */}
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Rating Distribution</p>
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = reviewSummary?.ratingDistribution?.[`star${star}`] ?? 0;
                                    const total = reviewSummary?.totalRatings ?? 0;
                                    const percentage = total > 0 ? (count / total) * 100 : 0;
                                    const isFilterActive = String(filterStars) === String(star);

                                    return (
                                        <button
                                            key={star}
                                            onClick={() => {
                                                if (isFilterActive) {
                                                    setFilterStars("");
                                                } else {
                                                    setFilterStars(String(star));
                                                }
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-3 text-left p-1.5 rounded-xl transition-all",
                                                isFilterActive ? "bg-slate-50 ring-1 ring-slate-200" : "hover:bg-slate-50/50"
                                            )}
                                        >
                                            <span className="text-xs font-black text-slate-700 w-5">{star}★</span>
                                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-brand-500 rounded-full transition-all"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-semibold text-slate-400 w-10 text-right">
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                                {filterStars && (
                                    <button
                                        onClick={() => setFilterStars("")}
                                        className="text-xs font-bold text-brand-600 hover:text-brand-700 underline block pt-1"
                                    >
                                        Clear Star Filter
                                    </button>
                                )}
                            </div>

                            {/* Top Tags */}
                            {mostUsedTags.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-slate-100">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Most Mentioned Tags</p>
                                    <div className="flex flex-wrap gap-2">
                                        {mostUsedTags.map((tagObj) => (
                                            <span
                                                key={tagObj.tag}
                                                className="px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-100 rounded-full text-xs font-semibold"
                                            >
                                                {tagObj.tag} ({tagObj.count})
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Info Box */}
                            <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 text-center">
                                <p className="text-xs text-slate-500 font-bold leading-relaxed">
                                    Only verified buyers can rate and review this product from their Order Details page after delivery.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Reviews List */}
                    <div className="lg:w-[65%] space-y-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">Customer Reviews</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Showing {reviews.length} reviews
                                </p>
                            </div>

                            {/* Sort Dropdown */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sort By:</span>
                                <select
                                    value={reviewSortBy}
                                    onChange={(e) => setReviewSortBy(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
                                >
                                    <option value="newest">Latest First</option>
                                    <option value="highest">Highest Rating</option>
                                    <option value="lowest">Lowest Rating</option>
                                    <option value="helpful">Most Helpful</option>
                                </select>
                            </div>
                        </div>

                        {reviewLoading ? (
                            <div className="flex justify-center p-20">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : reviews.length > 0 ? (
                            <div className="space-y-6">
                                {reviews.map((r) => (
                                    <div key={r._id} className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center font-black text-brand-500 text-lg">
                                                    {r.customerName?.[0] || "?"}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">{r.customerName}</h4>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <div className="flex items-center">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <Star
                                                                    key={star}
                                                                    size={10}
                                                                    className={cn(
                                                                        star <= r.stars
                                                                            ? "text-yellow-400 fill-yellow-400"
                                                                            : "text-slate-200 fill-transparent"
                                                                    )}
                                                                />
                                                            ))}
                                                        </div>
                                                        {r.isVerifiedPurchase && (
                                                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                                Verified Purchase
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {new Date(r.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <p className="text-slate-600 text-sm leading-relaxed font-medium">
                                            {r.review}
                                        </p>

                                        {/* Tags */}
                                        {r.tags && r.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {r.tags.map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="px-2.5 py-1 bg-slate-50 border border-slate-100 text-slate-500 rounded-md text-[10px] font-bold"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Review Images */}
                                        {r.images && r.images.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {r.images.map((img, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={img}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 block hover:opacity-90 transition-opacity"
                                                    >
                                                        <img src={applyCloudinaryTransform(img)} alt="Review attachment" className="w-full h-full object-cover" />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Pagination Controls */}
                                {reviewTotalPages > 1 && (
                                    <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                                        <Button
                                            disabled={reviewPage === 1}
                                            onClick={() => fetchReviews(reviewPage - 1)}
                                            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 bg-white"
                                        >
                                            Previous
                                        </Button>
                                        <span className="text-xs font-bold text-slate-400 uppercase">
                                            Page {reviewPage} of {reviewTotalPages}
                                        </span>
                                        <Button
                                            disabled={reviewPage === reviewTotalPages}
                                            onClick={() => fetchReviews(reviewPage + 1)}
                                            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 bg-white"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-20 text-center rounded-[3rem] bg-slate-50 border-2 border-dashed border-slate-200">
                                <p className="text-slate-400 font-black uppercase text-sm">No reviews found matching filters.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailPage;
