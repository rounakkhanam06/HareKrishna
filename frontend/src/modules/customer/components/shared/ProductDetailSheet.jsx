import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation, useDragControls } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, ChevronDown, Share2, Heart, Search, Clock, Minus, Plus, ShoppingBag, Star, MessageSquare, ArrowLeft, ChevronRight, Bell, Info, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '@core/context/AuthContext';
import { useProductDetail } from '../../context/ProductDetailContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '@shared/components/ui/Toast';
import { useSettings } from '@core/context/SettingsContext';
import { cn } from '@/lib/utils';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';
import { customerApi } from '../../services/customerApi';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useLocation as useAppLocation } from '../../context/LocationContext';

const AccordionItem = ({ title, children, id, icon, expandedSections, toggleSection }) => {
    const isOpen = expandedSections.includes(id);
    return (
        <div className="border-b border-slate-100 last:border-0">
            <button
                onClick={() => toggleSection(id)}
                className="w-full py-4 flex items-center justify-between transition-all hover:bg-slate-50/50 rounded-lg group px-2"
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                        isOpen ? "bg-brand-50 text-primary" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                    )}>
                        {icon}
                    </div>
                    <span className={cn(
                        "font-bold text-[13px] uppercase tracking-wider",
                        isOpen ? "text-[#1A1A1A]" : "text-slate-500"
                    )}>{title}</span>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    className={cn("transition-colors", isOpen ? "text-primary" : "text-slate-300")}
                >
                    <ChevronDown size={18} strokeWidth={3} />
                </motion.div>
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="pt-2 pb-6 px-2">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ProductDetailSheet = () => {
    const { selectedProduct, isOpen, closeProduct } = useProductDetail();
    const { cart, cartCount, addToCart, updateQuantity, removeFromCart } = useCart();
    const { toggleWishlist: toggleWishlistGlobal, isInWishlist } = useWishlist();
    const { showToast } = useToast();
    const { settings } = useSettings();
    const { user } = useAuth();
    const { currentLocation } = useAppLocation();
    const supportEmail = settings?.supportEmail || 'support@example.com';

    // Controls for sheet animation
    const controls = useAnimation();
    const [isExpanded, setIsExpanded] = useState(true);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isNotified, setIsNotified] = useState(false);
    const [isNotifying, setIsNotifying] = useState(false);

    const [reviews, setReviews] = useState([]);
    const [reviewLoading, setReviewLoading] = useState(true);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [hasPurchased, setHasPurchased] = useState(false);
    const [dbProduct, setDbProduct] = useState(null);
    const [expandedSections, setExpandedSections] = useState(['description']); // Start with description open

    const toggleSection = (section) => {
        setExpandedSections(prev => 
            prev.includes(section) 
                ? prev.filter(s => s !== section) 
                : [...prev, section]
        );
    };

    const scrollRef = useRef(null);
    const desktopRightScrollRef = useRef(null);

    const allImages = useMemo(() => {
        if (!selectedProduct) return [];
        const images = [];
        if (selectedProduct.mainImage) images.push(selectedProduct.mainImage);
        else if (selectedProduct.image) images.push(selectedProduct.image);

        if (selectedProduct.galleryImages && Array.isArray(selectedProduct.galleryImages)) {
            images.push(...selectedProduct.galleryImages);
        }
        return images.length > 0
          ? images
          : [
              "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400&h=400",
            ];
    }, [selectedProduct]);

    // Update variant when product changes
    useEffect(() => {
        if (selectedProduct && selectedProduct.variants && selectedProduct.variants.length > 0) {
            setSelectedVariant(selectedProduct.variants[0]);
        } else {
            setSelectedVariant(null);
        }
        setActiveImageIndex(0);
        setDbProduct(null);

        const prodId = selectedProduct?.id || selectedProduct?._id;
        if (prodId) {
            fetchReviews(prodId);
            // Fetch full product rating summary from backend
            customerApi.getProductReviewSummary(prodId)
                .then(res => {
                    if (res.data?.success) {
                        setDbProduct(res.data.result?.ratingSummary || null);
                    }
                })
                .catch(() => {});
            // Check if customer has purchased (lat/lng params needed — skip silently if unavailable)
            const hasValidLocation =
                Number.isFinite(currentLocation?.latitude) &&
                Number.isFinite(currentLocation?.longitude);
            const params = hasValidLocation
                ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
                : null;
            if (params) {
                customerApi.getProductById(prodId, params)
                    .then(res => {
                        if (res.data?.success) {
                            setHasPurchased(res.data.result?.hasPurchased || false);
                        }
                    })
                    .catch(() => setHasPurchased(false));
            } else {
                setHasPurchased(false);
            }
        } else {
            setHasPurchased(false);
        }
        setIsNotified(false);
        setIsNotifying(false);
        setNewReview({ rating: 5, comment: '' });
    }, [selectedProduct]);

    // Reset notification status when variant changes
    useEffect(() => {
        setIsNotified(false);
    }, [selectedVariant]);

    const handleNotifyMe = async (e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        if (isNotified || isNotifying) return;
        setIsNotifying(true);
        try {
            const variantSku = String(selectedVariant?.sku || selectedVariant?.name || "").trim();
            await customerApi.notifyMe(selectedProduct.id || selectedProduct._id, { variantSku });
            setIsNotified(true);
            showToast("We will notify you when back in stock!", "success");
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to subscribe to alerts", "error");
        } finally {
            setIsNotifying(false);
        }
    };

    const isOutOfStock = selectedVariant 
        ? selectedVariant.stock === 0 || (selectedVariant.stock !== undefined && selectedVariant.stock <= 0)
        : selectedProduct?.stock === 0 || (selectedProduct?.stock !== undefined && selectedProduct?.stock <= 0);

    const fetchReviews = async (productId) => {
        try {
            setReviewLoading(true);
            const res = await customerApi.getProductReviews(productId);
            if (res.data.success) {
                setReviews(res.data.result?.items || res.data.results || []);
            }
        } catch (error) {
            console.error("Fetch reviews error:", error);
        } finally {
            setReviewLoading(false);
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!newReview.comment.trim()) return;

        try {
            setIsSubmittingReview(true);
            const res = await customerApi.submitReview({
                productId: selectedProduct.id || selectedProduct._id,
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

    // If no product selected, don't render anything (well, Context handles isOpen, but still good check)
    // Removed early return to satisfy Rules of Hooks (hooks must be called in same order)
    // if (!selectedProduct && !isOpen) return null;

    // Strip raw RTF/RTF-like codes from description strings from the backend
    const cleanDescription = (text) => {
        if (!text) return null;
        // Detect RTF format
        if (text.trim().startsWith('{\\rtf') || text.includes('\\par')) {
            // Extract readable text: remove RTF control words and braces
            return text
                .replace(/\{\\[^}]*\}/g, '') // Remove groups like {\rtf1 ...}
                .replace(/\\[a-z]+\d*\s?/gi, '') // Remove control words like \par \b \fs22
                .replace(/[{}]/g, '') // Remove remaining braces
                .replace(/\\'/g, "'") // Replace escaped apostrophes
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();
        }
        return text;
    };

    const variantKey = String(selectedVariant?.sku || selectedVariant?.name || "").trim();
    const cartItem = selectedProduct
        ? cart.find(
            (item) =>
                `${item.id || item._id}::${String(item.variantSku || "").trim()}` ===
                `${selectedProduct.id || selectedProduct._id}::${variantKey || ""}`,
        )
        : null;
    const quantity = cartItem ? cartItem.quantity : 0;
    const isWishlisted = selectedProduct ? isInWishlist(selectedProduct.id || selectedProduct._id) : false;

    useEffect(() => {
        if (isOpen) {
            controls.start("visible");
            setIsExpanded(true);
            document.body.style.overflow = "hidden"; // Prevent background scroll
            document.body.style.touchAction = "none"; // Disable swipe background panning
            document.documentElement.style.overflow = "hidden";
        } else {
            controls.start("hidden");
            document.body.style.overflow = "unset";
            document.body.style.touchAction = "auto";
            document.documentElement.style.overflow = "unset";
            setIsExpanded(false);
        }

        // Cleanup function to ensure scroll is restored if component unmounts
        return () => {
            document.body.style.overflow = "unset";
            document.body.style.touchAction = "auto";
            document.documentElement.style.overflow = "unset";
        }
    }, [isOpen, controls]);

    const handleDragEnd = (event, info) => {
        const offset = info.offset.y;
        const velocity = info.velocity.y;

        if (offset > 150 || velocity > 200) {
            // Dragged down significantly -> Close
            closeProduct();
        } else if (offset < -20 || velocity < -200) {
            // Dragged up -> Expand
            setIsExpanded(true);
        } else {
            // Snap back to current state (expanded or initial)
        }
    };

    const toggleWishlist = (e) => {
        e.stopPropagation();
        toggleWishlistGlobal(selectedProduct);
        showToast(
            isWishlisted ? `${selectedProduct.name} removed from wishlist` : `${selectedProduct.name} added to wishlist`,
            isWishlisted ? 'info' : 'success'
        );
    };

    const handleAddToCart = () => {
        addToCart({
            ...selectedProduct,
            variantSku: String(selectedVariant?.sku || selectedVariant?.name || "").trim(),
        });
        showToast(`${selectedProduct.name} added to cart`, 'success');
    };

    const handleIncrement = () =>
        updateQuantity(selectedProduct.id || selectedProduct._id, 1, String(selectedVariant?.sku || selectedVariant?.name || "").trim());

    const handleDecrement = () => {
        if (quantity === 1) {
            removeFromCart(selectedProduct.id || selectedProduct._id, String(selectedVariant?.sku || selectedVariant?.name || "").trim());
        } else {
            updateQuantity(selectedProduct.id || selectedProduct._id, -1, String(selectedVariant?.sku || selectedVariant?.name || "").trim());
        }
    };

    // Scroll handler to expand on scroll
    const handleScroll = (e) => {
        if (!isExpanded && e.currentTarget.scrollTop > 5) {
            setIsExpanded(true);
        }
    };

    // Wheel handler for expansion
    const handleWheel = (e) => {
        if (!isExpanded && e.deltaY > 0) {
            setIsExpanded(true);
            e.stopPropagation();
        } else if (isExpanded) {
            // Allow normal scroll but stop propagation to background
            e.stopPropagation();
        }
    };

    if (!selectedProduct) return null;

    const cleanDesc = cleanDescription(selectedProduct?.description);

    // ── Subsidy / pricing calculations (same logic as ProductCard) ──────────
    const isSubsidyUser = false;
    const subsidyRate = 0;
    const mrpPrice = selectedVariant
        ? Number(selectedVariant.price || 0)
        : Number(selectedProduct.originalPrice || selectedProduct.price || 0);
    const payNowPrice = selectedVariant
        ? Number(selectedVariant.salePrice > 0 ? selectedVariant.salePrice : selectedVariant.price || 0)
        : Number(selectedProduct.price || 0);
    const hasInstantDiscount = mrpPrice > payNowPrice;
    const instantSavings = hasInstantDiscount ? Math.round(mrpPrice - payNowPrice) : 0;
    const instantDiscountPct = hasInstantDiscount && mrpPrice > 0
        ? Math.round(((mrpPrice - payNowPrice) / mrpPrice) * 100) : 0;
    const dbtSavings = isSubsidyUser && subsidyRate > 0 ? Math.round(payNowPrice * subsidyRate / 100) : 0;
    const netEffectivePrice = payNowPrice - dbtSavings;
    const totalSubsidyPct = instantDiscountPct + (isSubsidyUser && subsidyRate > 0 ? subsidyRate : 0);
    const showSubsidy = false;
    const displayWeight = selectedVariant && selectedVariant.name && selectedVariant.name !== "Default"
        ? selectedVariant.name
        : selectedProduct.weight;

    const t1RateConfig = Number(settings?.dbtTier1Rate ?? settings?.eAnnadataDiscount1Year ?? 10);
    const t2RateConfig = Number(settings?.dbtTier2Rate ?? settings?.eAnnadataDiscount2Years ?? 20);
    const maxDbtRate = Math.max(t1RateConfig, t2RateConfig);
    const displayDbtRate = (isSubsidyUser && subsidyRate > 0) ? subsidyRate : maxDbtRate;
    const displayDbtSavings = Math.round(payNowPrice * displayDbtRate / 100);


    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop - sits above header */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeProduct}
                        className="fixed inset-0 bg-black/60 z-[220] backdrop-blur-sm"
                    />

                    {/* ============================================================ */}
                    {/* DESKTOP LAYOUT: Wide 2-column modal (hidden on mobile) */}
                    {/* ============================================================ */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 30 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                        className="hidden md:block fixed z-[230] top-[72px] bottom-[16px] left-[3%] right-[3%] lg:left-[6%] lg:right-[6%] xl:left-[12%] xl:right-[12%] bg-white rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.25)] overflow-hidden"
                    >
                        {/* Parent flex container that holds both sides together so the whole modal scrolls */}
                        <div className="flex w-full h-full min-h-0">
                                {/* Left: Image Gallery — sticky to window so it doesn't scroll out of view if you want */}
                                <div
                                    onWheel={(e) => {
                                        e.stopPropagation();
                                        if (desktopRightScrollRef.current) {
                                            desktopRightScrollRef.current.scrollTop += e.deltaY;
                                        }
                                    }}
                                    className="relative w-[42%] lg:w-[44%] flex-shrink-0 flex flex-col h-full sticky top-0"
                                    style={{ background: 'linear-gradient(145deg, #f9fafb 0%, #f1f8f2 50%, #fafbfc 100%)' }}
                                >
                                    {/* Top bar with back + wishlist */}
                                    <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-5 z-20">
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={closeProduct}
                                            className="w-10 h-10 bg-white/95 backdrop-blur-md rounded-xl shadow-md shadow-black/5 flex items-center justify-center hover:shadow-lg transition-all border border-gray-100/80"
                                        >
                                            <ArrowLeft size={18} className="text-gray-700" strokeWidth={2.5} />
                                        </motion.button>

                                        {/* Discount Badge (center) */}
                                        {(mrpPrice > payNowPrice) && (
                                            <motion.div
                                                initial={{ scale: 0, rotate: -10 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                transition={{ type: 'spring', delay: 0.2 }}
                                                className="bg-gradient-to-r from-primary to-[var(--brand-400)] text-white text-[10px] font-[800] px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-md shadow-brand-200/40"
                                            >
                                                {instantDiscountPct}% OFF
                                            </motion.div>
                                        )}

                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={toggleWishlist}
                                            className={cn(
                                                "w-10 h-10 backdrop-blur-md rounded-xl shadow-md shadow-black/5 flex items-center justify-center hover:shadow-lg transition-all border",
                                                isWishlisted ? "bg-red-50/95 border-red-100" : "bg-white/95 border-gray-100/80"
                                            )}
                                        >
                                            <Heart size={18} className={cn(
                                                "transition-all",
                                                isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-400'
                                            )} />
                                        </motion.button>
                                    </div>

                                    {/* Main content area: vertical thumbnails + main image */}
                                    <div className="flex-1 flex mt-[64px] mb-3 overflow-hidden">
                                        {/* Vertical thumbnail strip (left side) */}
                                        {allImages.length > 1 && (
                                            <div className="flex flex-col gap-2 px-3 py-2 overflow-y-auto no-scrollbar">
                                                {allImages.slice(0, 5).map((img, i) => (
                                                    <motion.button
                                                        key={i}
                                                        whileHover={{ scale: 1.08 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => setActiveImageIndex(i)}
                                                        className={cn(
                                                            'w-[52px] h-[52px] lg:w-14 lg:h-14 rounded-xl overflow-hidden flex-shrink-0 transition-all duration-300 border-2',
                                                            i === activeImageIndex
                                                                ? 'border-primary shadow-lg shadow-brand-100/60 ring-2 ring-brand-100 bg-white'
                                                                : 'border-gray-200/60 opacity-50 hover:opacity-90 bg-white/60'
                                                        )}
                                                    >
                                                        <img src={applyCloudinaryTransform(img, "f_auto,q_auto:best,w_160,dpr_auto")} alt="" loading="lazy" className="w-full h-full object-contain p-1.5" />
                                                    </motion.button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Main image viewer */}
                                        <div className="flex-1 flex items-center justify-center p-6 lg:p-8 relative min-h-[350px]">
                                            <AnimatePresence mode="wait">
                                                <motion.img
                                                    key={activeImageIndex}
                                                    initial={{ scale: 0.93, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0.93, opacity: 0 }}
                                                    transition={{ duration: 0.15 }}
                                                    src={applyCloudinaryTransform(allImages[activeImageIndex], "f_auto,q_auto:best,w_1200,dpr_auto")}
                                                    alt={`${selectedProduct.name} ${activeImageIndex + 1}`}
                                                    className="w-full h-full object-contain mix-blend-multiply drop-shadow-2xl absolute inset-0 m-auto p-12"
                                                />
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* Carousel dot indicators */}
                                    {allImages.length > 1 && (
                                        <div className="flex justify-center gap-2 pb-5">
                                            {allImages.map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setActiveImageIndex(i)}
                                                    className={cn(
                                                        'rounded-full transition-all duration-400',
                                                        i === activeImageIndex ? 'w-8 h-2 bg-primary' : 'w-2 h-2 bg-gray-300/60 hover:bg-gray-400'
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Right: Product Info (scrollable naturally) */}
                                <div
                                    ref={desktopRightScrollRef}
                                    className="flex-1 bg-white overflow-y-auto h-full min-h-0"
                                    onWheel={(e) => {
                                        e.stopPropagation();
                                    }}
                                >
                                    <div className="px-7 py-6 lg:px-8 lg:py-7 space-y-3">

                                        {/* Top badges row */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 }}
                                                className="inline-flex items-center gap-1.5 bg-[#153628]/10 border border-brand-200/50 text-primary px-3 py-1.5 rounded-lg text-[10px] font-[700] uppercase tracking-wider"
                                            >
                                                <Clock size={12} strokeWidth={2.5} className="text-primary" />
                                                {selectedProduct.deliveryTime || '8-15 MINS'}
                                            </motion.div>
                                            {mrpPrice > payNowPrice && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.15 }}
                                                    className="text-[10px] font-[700] text-primary bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-200/50 uppercase tracking-wider"
                                                >
                                                    💰 Save ₹{instantSavings}
                                                </motion.div>
                                            )}
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.2 }}
                                                className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-[700] border border-orange-100/50"
                                            >
                                                <Star size={10} fill="currentColor" />
                                                {dbProduct?.averageRating ? dbProduct.averageRating.toFixed(1) : (reviews.length > 0 ? (reviews.reduce((acc, r) => acc + (r.stars ?? r.rating ?? 0), 0) / reviews.length).toFixed(1) : '0.0')}
                                                <span className="text-orange-400 font-medium">({dbProduct?.totalReviews ?? reviews.length})</span>
                                            </motion.div>
                                        </div>

                                        {/* Product Name */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.15 }}
                                        >
                                            <h1 className="text-[19px] lg:text-[22px] font-black text-[#111827] leading-[1.2] tracking-tight mb-1">
                                                {selectedProduct.name}
                                            </h1>
                                            {displayWeight && (
                                                <span className="text-[13px] text-gray-400 font-bold uppercase tracking-wider">{displayWeight}</span>
                                            )}
                                        </motion.div>

                                        {/* ── Subsidy Pricing Breakdown (Desktop) – shown just below product name ── */}
                                        {showSubsidy && (
                                            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                                                {/* Price row */}
                                                <div className="flex items-center gap-3 px-4 pt-3 pb-2 border-b border-slate-100">
                                                    <div className="flex items-baseline gap-2">
                                                        {hasInstantDiscount && (
                                                            <span className="text-sm font-medium text-gray-400 line-through">₹{mrpPrice}</span>
                                                        )}
                                                        {hasInstantDiscount && (
                                                            <span className="text-xs font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">{instantDiscountPct}% Instant Discount</span>
                                                        )}
                                                        <span className="text-2xl font-semibold text-[#1A1A1A]">₹{payNowPrice}</span>
                                                    </div>
                                                    <span className="text-xs font-normal text-slate-400">eAnnadata Price</span>
                                                </div>

                                                {/* DBT info box */}
                                                {isSubsidyUser && subsidyRate > 0 ? (
                                                    <div className="flex items-start gap-3 border-b p-3 bg-[#153628]/10 border-[#153628]/15">
                                                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-[#153628]/20">
                                                            <ShieldCheck size={14} className="text-[#153628]" strokeWidth={2.5} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold leading-tight text-[#153628]">
                                                                Earned ₹{dbtSavings} DBT Subsidy ({subsidyRate}%)
                                                            </p>
                                                            <p className="text-[11px] font-medium mt-0.5 leading-snug text-[#153628]/80">
                                                                This subsidy amount will be transferred to your bank account via DBT after delivery.
                                                            </p>
                                                        </div>
                                                        <Info size={15} className="text-[#153628] flex-shrink-0 mt-0.5" />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-start gap-3 border-b p-3 bg-blue-50/60 border-blue-100">
                                                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-blue-100">
                                                            <ShieldCheck size={14} className="text-blue-600" strokeWidth={2.5} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold leading-tight text-blue-900">
                                                                🌾 eAnnadata Card Benefit: Upto ₹{displayDbtSavings} ({displayDbtRate}%) DBT Cashback
                                                            </p>
                                                            <p className="text-[11px] font-medium mt-0.5 leading-snug text-blue-700">
                                                                Verified cardholders receive up to {displayDbtRate}% DBT Cashback transferred to bank after delivery.
                                                            </p>
                                                        </div>
                                                        <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                                    </div>
                                                )}

                                                {/* Pricing table header */}
                                                <div className="flex items-center bg-slate-50 border-b border-slate-100 px-3 py-2 gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wide">MRP</span>
                                                    </div>
                                                    {hasInstantDiscount && (
                                                        <>
                                                            <span className="text-[9px] text-slate-300 px-1.5">-</span>
                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-[9px] font-medium text-emerald-600 whitespace-nowrap">Instant ({instantDiscountPct}%)</span>
                                                            </div>
                                                        </>
                                                    )}
                                                    <span className="text-[9px] text-slate-600 font-semibold px-1.5">=</span>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-[9px] font-medium text-primary whitespace-nowrap">Pay Now</span>
                                                    </div>
                                                    {isSubsidyUser && subsidyRate > 0 && (
                                                        <>
                                                            <span className="text-[9px] text-slate-300 px-1.5">-</span>
                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-[9px] font-medium text-blue-600 whitespace-nowrap">DBT ({subsidyRate}%)</span>
                                                            </div>
                                                            <span className="text-[9px] text-slate-600 font-semibold px-1.5">=</span>
                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-[9px] font-medium text-[#153628] whitespace-nowrap">Net Cost</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                {/* Pricing table values */}
                                                <div className="flex items-baseline px-3 py-2 gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-[13px] font-medium text-slate-600 line-through">&#8377;{mrpPrice}</span>
                                                    </div>
                                                    {hasInstantDiscount && (
                                                        <>
                                                            <span className="text-[13px] text-slate-600 font-semibold px-1.5">-</span>
                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-[13px] font-medium text-emerald-600">&#8377;{instantSavings}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                    <span className="text-[13px] text-slate-600 font-semibold px-1.5">=</span>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-[14px] font-semibold text-primary">&#8377;{payNowPrice}</span>
                                                    </div>
                                                    {isSubsidyUser && subsidyRate > 0 && (
                                                        <>
                                                            <span className="text-[13px] text-slate-600 font-semibold px-1.5">-</span>
                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-[13px] font-medium text-blue-600">&#8377;{dbtSavings}</span>
                                                            </div>
                                                            <span className="text-[13px] text-slate-600 font-semibold px-1.5">=</span>
                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-[14px] font-semibold text-[#153628]">&#8377;{netEffectivePrice}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* DBT note */}
                                                <div className="flex items-start gap-2 bg-blue-50/60 border-t border-blue-100 px-3 py-2.5">
                                                    <Info size={12} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                                    <p className="text-[10px] font-medium text-blue-700 leading-relaxed">
                                                        {isSubsidyUser && subsidyRate > 0 ? (
                                                            <>
                                                                <span className="font-black">Note:</span> You have to pay the <span className="font-black text-primary">Pay Now</span> amount (₹{payNowPrice}) now. The earned subsidy (₹{dbtSavings}) will be transferred to your bank account via DBT.
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="font-black">Note:</span> Pay the <span className="font-black text-primary">Pay Now</span> amount (₹{payNowPrice}) at checkout. Verified eAnnadata cardholders receive up to {displayDbtRate}% (₹{displayDbtSavings}) DBT Cashback in wallet after delivery.
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Price + Add-to-Cart Card */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="relative overflow-hidden rounded-[20px] border border-brand-200/60 shadow-sm"
                                            style={{ background: 'linear-gradient(135deg, #f4fcfe 0%, #eefbfb 100%)' }}
                                        >
                                            {/* Decorative subtle patterns */}
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl" />
                                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl" />

                                            <div className="relative flex items-center justify-between py-4 px-5">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-[28px] lg:text-[32px] font-[800] text-primary tracking-tight leading-none">
                                                            ₹{payNowPrice}
                                                        </span>
                                                        {mrpPrice > payNowPrice && (
                                                            <span className="text-[14px] text-gray-400 line-through font-[600]">₹{mrpPrice}</span>
                                                        )}
                                                    </div>
                                                    {mrpPrice > payNowPrice && (
                                                        <span className="inline-flex w-fit items-center text-[10px] font-[800] text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md uppercase tracking-wide">
                                                            {instantDiscountPct}% off
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    {isOutOfStock ? (
                                                        <motion.button
                                                            whileHover={isNotified ? {} : { scale: 1.02, y: -2 }}
                                                            whileTap={isNotified ? {} : { scale: 0.98 }}
                                                            onClick={handleNotifyMe}
                                                            disabled={isNotified || isNotifying}
                                                            className={cn(
                                                                "h-12 px-8 rounded-xl font-black text-[13px] flex items-center gap-2 transition-all uppercase tracking-widest border",
                                                                isNotified 
                                                                    ? "bg-emerald-50 border-emerald-300 text-emerald-600 cursor-default"
                                                                    : "bg-gradient-to-r from-primary to-[var(--brand-400)] text-white shadow-lg shadow-brand-100 hover:shadow-brand-200 border-white/20 cursor-pointer"
                                                            )}
                                                        >
                                                            <Bell size={16} strokeWidth={3} />
                                                            {isNotifying ? "..." : isNotified ? "Requested" : "Notify Me"}
                                                        </motion.button>
                                                    ) : quantity > 0 ? (
                                                        <div className="flex items-center gap-1 bg-white border border-brand-200 rounded-xl p-1 shadow-sm">
                                                            <motion.button whileTap={{ scale: 0.85 }} onClick={handleDecrement} className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center text-brand-700 hover:bg-brand-100 transition-colors">
                                                                <Minus size={16} strokeWidth={2.5} />
                                                            </motion.button>
                                                            <span className="font-[800] text-base text-gray-800 w-8 text-center">{quantity}</span>
                                                            <motion.button whileTap={{ scale: 0.85 }} onClick={handleIncrement} className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-white hover:bg-[var(--brand-400)] transition-colors shadow-sm">
                                                                <Plus size={16} strokeWidth={2.5} />
                                                            </motion.button>
                                                        </div>
                                                    ) : (
                                                    <motion.button
                                                        whileHover={{ scale: 1.02, y: -2 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={handleAddToCart}
                                                        className="bg-gradient-to-r from-primary to-[var(--brand-400)] text-white h-12 px-8 rounded-xl font-black text-[13px] flex items-center gap-2 shadow-lg shadow-brand-100 hover:shadow-brand-200 transition-all uppercase tracking-widest border border-white/20"
                                                    >
                                                        <ShoppingBag size={16} strokeWidth={3} />
                                                        Add to Cart
                                                    </motion.button>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* View Cart */}
                                        {cartCount > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.98 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="flex justify-center -mt-1"
                                            >
                                                <Link
                                                    to="/checkout"
                                                    onClick={closeProduct}
                                                    className="w-[80%] bg-gradient-to-r from-primary to-[var(--brand-500)] text-white h-[40px] rounded-xl flex items-center justify-between px-4 shadow-md shadow-brand-200/40 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <ShoppingBag size={14} strokeWidth={2.0} />
                                                        <span className="text-[12px] font-[700] uppercase tracking-wider">View Cart</span>
                                                    </div>
                                                    <div className="flex items-center justify-center gap-1.5 bg-white/10 px-2 py-1 rounded-lg">
                                                        <span className="text-[13px] font-[800] tracking-tight">₹{cart.reduce((total, item) => {
                                                            const mrp = Number(item.price || 0);
                                                            const sale = Number(item.salePrice || 0);
                                                            const unit = sale > 0 && sale < mrp ? sale : mrp;
                                                            return total + (unit * Number(item.quantity || 0));
                                                        }, 0)}</span>
                                                        <ChevronRight size={14} strokeWidth={2.5} />
                                                    </div>
                                                </Link>
                                            </motion.div>
                                        )}

                                        {/* Variants Selection (Desktop) */}
                                        {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                                            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50 mt-4">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Select Variant</h4>
                                                <div className="flex gap-2.5 flex-wrap">
                                                    {selectedProduct.variants.map((v, idx) => (
                                                        <motion.button
                                                            key={idx}
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            onClick={() => setSelectedVariant(v)}
                                                            className={cn(
                                                                'px-4 py-2 font-black rounded-xl text-xs transition-all border-2',
                                                                selectedVariant?.sku === v.sku
                                                                    ? 'bg-white border-primary text-primary shadow-sm shadow-brand-100'
                                                                    : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                                                            )}
                                                        >
                                                            {v.name}
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Product Information Accordion (Desktop) */}
                                        <div className="mt-8 border-t border-slate-100">
                                            {/* Description */}
                                            {cleanDesc && (
                                                <AccordionItem 
                                                    id="description" 
                                                    title="Product Description" 
                                                    icon={<Clock size={16} />}
                                                    expandedSections={expandedSections}
                                                    toggleSection={toggleSection}
                                                >
                                                    <div
                                                        className="text-[13px] text-slate-500 font-medium leading-relaxed whitespace-pre-line"
                                                        dangerouslySetInnerHTML={{ __html: cleanDesc }}
                                                    />
                                                </AccordionItem>
                                            )}

                                            {/* Product Details */}
                                            <AccordionItem 
                                                id="details" 
                                                title="Product Details" 
                                                icon={<Search size={16} />}
                                                expandedSections={expandedSections}
                                                toggleSection={toggleSection}
                                            >
                                                <div className="grid grid-cols-2 gap-3 mt-1">
                                                    {[
                                                        { label: 'Shelf Life', value: selectedProduct.shelfLife || '3 Days', emoji: '📅' },
                                                        { label: 'Country of Origin', value: selectedProduct.countryOfOrigin || 'India', emoji: '🇮🇳' },
                                                        { label: 'FSSAI License', value: selectedProduct.fssaiLicense || '1001234567890', emoji: '🛡️' },
                                                        { label: 'Customer Care', value: supportEmail, emoji: '📧' },
                                                        ...(selectedProduct.isReturnable 
                                                            ? [{ label: 'Return Policy', value: `${selectedProduct.returnWindowDays || 0} Days Return`, emoji: '🔄' }] 
                                                            : [{ label: 'Return Policy', value: 'Non-Returnable', emoji: '⛔' }])
                                                    ].map((d) => (
                                                        <div key={d.label} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 group hover:bg-white hover:shadow-sm transition-all overflow-hidden">
                                                            <span className="text-[10px] text-slate-400 block mb-0.5 font-bold uppercase tracking-wider">{d.label}</span>
                                                            <span className="font-black text-slate-800 text-[12px] break-all">{d.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </AccordionItem>

                                            {/* Customer Reviews */}
                                            <AccordionItem 
                                                id="reviews" 
                                                title={`Customer Reviews (${dbProduct?.totalReviews ?? selectedProduct?.totalReviews ?? reviews.length})`}
                                                icon={<Star size={18} strokeWidth={2.5} />}
                                                expandedSections={expandedSections}
                                                toggleSection={toggleSection}
                                            >
                                                <div className="space-y-6 mt-2">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-primary rounded-xl text-xs font-black border border-brand-100">
                                                            <Star size={16} fill="currentColor" />
                                                            {dbProduct?.averageRating ? dbProduct.averageRating.toFixed(1) : (reviews.length > 0 ? (reviews.reduce((acc, r) => acc + (r.stars ?? r.rating ?? 0), 0) / reviews.length).toFixed(1) : '0.0')}
                                                        </div>
                                                    </div>

                                                    {/* Review Form */}
                                                    {hasPurchased ? (
                                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                                                            <h4 className="font-black text-slate-800 text-xs mb-3 flex items-center gap-2">
                                                                <MessageSquare size={13} className="text-primary" />
                                                                Rate this product
                                                            </h4>
                                                            <form onSubmit={handleReviewSubmit} className="space-y-3">
                                                                <div className="flex gap-1.5">
                                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                                        <motion.button
                                                                            key={s}
                                                                            type="button"
                                                                            whileHover={{ scale: 1.1 }}
                                                                            whileTap={{ scale: 0.9 }}
                                                                            onClick={() => setNewReview({ ...newReview, rating: s })}
                                                                            className={cn(
                                                                                'h-9 w-9 rounded-xl flex items-center justify-center transition-all shadow-sm',
                                                                                newReview.rating >= s ? 'bg-brand-50 text-primary border border-brand-100' : 'bg-white text-slate-300 border border-slate-100'
                                                                            )}
                                                                        >
                                                                            <Star size={15} className={cn(newReview.rating >= s && 'fill-current')} />
                                                                        </motion.button>
                                                                    ))}
                                                                </div>
                                                                <textarea value={newReview.comment} onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })} placeholder="Share your experience..." className="w-full bg-white border border-slate-100 rounded-xl p-3 text-xs font-medium min-h-[80px] outline-none focus:border-primary transition-all resize-none shadow-sm" />
                                                                <Button type="submit" disabled={isSubmittingReview} className="w-full h-10 bg-primary hover:opacity-90 text-white font-black rounded-xl text-[11px] uppercase tracking-[0.1em] transition-all shadow-lg shadow-brand-100">
                                                                    {isSubmittingReview ? 'Submitting...' : 'Post Review'}
                                                                </Button>
                                                            </form>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 text-center mb-6">
                                                            <p className="text-xs text-slate-500 font-bold leading-relaxed">
                                                                Only customers who have purchased this product can write a review.
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Reviews List */}
                                                    <div className="space-y-3">
                                                        {reviewLoading ? (
                                                            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-primary" size={20} /></div>
                                                        ) : reviews.length > 0 ? (
                                                            reviews.map((r, rIdx) => (
                                                                <div key={r._id} className="p-4 rounded-xl border border-slate-100 bg-white hover:shadow-md hover:translate-x-1 transition-all group">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="h-8 w-8 rounded-full bg-brand-50 flex items-center justify-center text-[11px] font-black text-primary border border-brand-100">{(r.customerName || r.userId?.name)?.[0] || 'A'}</div>
                                                                            <div>
                                                                                <p className="text-[12px] font-black text-slate-800">{r.customerName || r.userId?.name || 'Anonymous'}</p>
                                                                                <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} size={9} className={cn(i < (r.stars ?? r.rating ?? 0) ? 'text-primary fill-primary' : 'text-slate-200')} />)}</div>
                                                                            </div>
                                                                        </div>
                                                                        <span className="text-[10px] font-bold text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                                                                    </div>
                                                                    <p className="text-[12px] text-slate-600 font-medium leading-relaxed pl-10">{r.review || r.comment}</p>
                                                                    {r.images && r.images.length > 0 && (
                                                                        <div className="flex gap-1.5 mt-2 pl-10">
                                                                            {r.images.map((img, i) => (
                                                                                <img key={i} src={applyCloudinaryTransform(img)} alt="Review" className="h-8 w-8 object-cover rounded-lg border border-slate-200" />
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="py-10 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                                                <MessageSquare size={20} className="text-slate-300 mx-auto mb-2" />
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No reviews yet — be the first!</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                 </div>
                                            </AccordionItem>
                                        </div>

                                        {/* Bottom spacer */}
                                        <div className="h-6" />
                                    </div>
                                </div>
                            </div>
                    </motion.div>

                    {/* ============================================================ */}
                    {/* MOBILE LAYOUT: Bottom sheet (hidden on desktop md+) */}
                    {/* ============================================================ */}
                    <motion.div
                        drag={isExpanded ? false : "y"}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.7}
                        onDragEnd={handleDragEnd}
                        initial={{
                            opacity: 0,
                            scale: 0.9,
                            y: "100vh",
                            top: "10%",
                            bottom: "10%",
                            left: "50%",
                            x: "-50%",
                            width: "min(90%, 400px)",
                            borderRadius: "24px"
                        }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            top: isExpanded ? 0 : "10%",
                            bottom: isExpanded ? 0 : "10%",
                            left: isExpanded ? 0 : "50%",
                            x: isExpanded ? 0 : "-50%",
                            width: isExpanded ? "100%" : "min(90%, 400px)",
                            borderRadius: isExpanded ? 0 : "24px"
                        }}
                        exit={{ opacity: 0, scale: 0.9, y: "100vh", transition: { duration: 0.3 } }}
                        transition={{
                            type: "spring",
                            damping: 25,
                            stiffness: 400,
                            mass: 0.8
                        }}
                        className={cn(
                            "md:hidden fixed z-[230] bg-white shadow-2xl overflow-hidden flex flex-col",
                        )}
                        style={{ willChange: "transform, top, bottom, left, width, border-radius" }}
                    >
                        {/* Drag Handle (Visible only when not fully expanded) */}
                        {!isExpanded && (
                            <div className="absolute top-0 left-0 right-0 h-8 flex justify-center items-center z-50 pointer-events-none">
                                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                            </div>
                        )}

                        {/* Header Actions (Absolute & Sticky) */}
                        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-40 pointer-events-none">
                            <motion.button
                                onClick={closeProduct}
                                whileTap={{ scale: 0.9 }}
                                className="w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center border border-gray-100 pointer-events-auto"
                            >
                                <ArrowLeft size={24} className="text-primary" strokeWidth={3} />
                            </motion.button>
                            <div className="flex gap-3 pointer-events-auto invisible">
                                {/* Hidden as per request to simplify the view */}
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div
                            className={cn(
                                "flex-1 overflow-x-hidden no-scrollbar pb-24 bg-white",
                                isExpanded ? "overflow-y-auto" : "overflow-y-hidden"
                            )}
                            onScroll={handleScroll}
                            onWheel={handleWheel}
                        >
                            {/* Product Image Carousel */}
                            <div className="relative w-full bg-gradient-to-b from-[#F5F7F8] to-white pt-0 pb-0 h-[52vh] min-h-[320px] max-h-[560px]">
                                <div
                                    ref={scrollRef}
                                    className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar h-full w-full"
                                    onScroll={(e) => {
                                        const index = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth);
                                        setActiveImageIndex(index);
                                    }}
                                >
                                    {allImages.map((img, i) => (
                                        <div key={i} className="flex-shrink-0 w-full h-full snap-center snap-always flex items-center justify-center px-0 sm:px-4">
                                            <motion.img
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ duration: 0.4 }}
                                                src={applyCloudinaryTransform(img, "f_auto,q_auto:best,w_1200,dpr_auto")}
                                                alt={`${selectedProduct.name} ${i + 1}`}
                                                className="w-full h-full object-contain mix-blend-multiply drop-shadow-xl"
                                                style={{ objectPosition: 'center calc(50% - 40px)' }}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Carousel Dots */}
                                {allImages.length > 1 && (
                                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                                        {allImages.map((_, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "h-1.5 rounded-full transition-all duration-300",
                                                    i === activeImageIndex ? "w-6 bg-primary" : "w-1.5 bg-gray-300"
                                                )}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Delivery Time + Product Name + Variants – shown just below image */}
                            <div className="px-5 pt-1 pb-0">
                                {/* Delivery Time Badge */}
                                <div className="inline-flex items-center gap-1.5 bg-[#F0FDF4] border border-brand-100 text-primary px-2.5 py-1 rounded-lg text-[10px] font-black uppercase mb-3">
                                    <Clock size={12} strokeWidth={3} />
                                    {selectedProduct.deliveryTime || "8 Mins"}
                                </div>

                                <h2 className="text-xl font-black text-[#1A1A1A] leading-tight mb-2">
                                    {selectedProduct.name}
                                </h2>

                                {/* Variants Selection (Mobile) */}
                                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                                    <div className="mt-3 mb-2">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Select Variant</h4>
                                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                            {selectedProduct.variants.map((v, idx) => (
                                                <motion.button
                                                    key={idx}
                                                    whileTap={{ scale: 0.95 }}
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
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Product Info Container – accordions only */}
                            <div className="px-5 pt-0 pb-0">

                                {/* Product Information Accordion (Mobile) */}
                                <div className="mt-4 border-t border-slate-100">
                                    {/* Description */}
                                    {cleanDesc && (
                                        <AccordionItem 
                                            id="description" 
                                            title="Product Description" 
                                            icon={<Clock size={18} strokeWidth={2.5} />}
                                            expandedSections={expandedSections}
                                            toggleSection={toggleSection}
                                        >
                                            <div
                                                className="text-sm text-slate-500 font-medium leading-relaxed whitespace-pre-line"
                                                dangerouslySetInnerHTML={{ __html: cleanDesc }}
                                            />
                                        </AccordionItem>
                                    )}

                                    {/* Product Details */}
                                    <AccordionItem 
                                        id="details" 
                                        title="Product Details" 
                                        icon={<Search size={18} strokeWidth={2.5} />}
                                        expandedSections={expandedSections}
                                        toggleSection={toggleSection}
                                    >
                                        <div className="grid grid-cols-2 gap-3 mt-1">
                                            {[
                                                { label: 'Shelf Life', value: selectedProduct.shelfLife || '3 Days' },
                                                { label: 'Country of Origin', value: selectedProduct.countryOfOrigin || 'India' },
                                                { label: 'FSSAI License', value: selectedProduct.fssaiLicense || '1001234567890' },
                                                { label: 'Customer Care', value: supportEmail },
                                                ...(selectedProduct.isReturnable 
                                                    ? [{ label: 'Return Policy', value: `${selectedProduct.returnWindowDays || 0} Days Return` }] 
                                                    : [{ label: 'Return Policy', value: 'Non-Returnable' }])
                                            ].map((d) => (
                                                <div key={d.label} className="bg-slate-50 p-3 rounded-xl border border-slate-100 overflow-hidden">
                                                    <span className="text-gray-400 block mb-0.5 text-[10px] font-bold uppercase tracking-wider">{d.label}</span>
                                                    <span className="font-black text-slate-800 text-xs break-all">{d.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionItem>

                                    {/* ── Subsidy Pricing Breakdown – between Product Details & Customer Reviews ── */}
                                    {showSubsidy && (
                                        <div className="py-4 border-t border-slate-100">
                                            {/* Price + DBT box side by side */}
                                            <div className="flex items-start gap-3 mb-3">
                                                {/* Left: price stack */}
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        {hasInstantDiscount && (
                                                            <span className="text-sm font-medium text-gray-400 line-through">₹{mrpPrice}</span>
                                                        )}
                                                        {totalSubsidyPct > 0 && (
                                                            <span className="text-xs font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">{totalSubsidyPct}% Subsidy</span>
                                                        )}
                                                    </div>
                                                    <span className="text-2xl font-semibold text-[#1A1A1A] leading-none">₹{payNowPrice}</span>
                                                    <span className="text-[11px] font-normal text-slate-400 mt-0.5">eAnnadata Price</span>
                                                </div>

                                                {/* Right: DBT info box */}
                                                {dbtSavings > 0 && (
                                                    <div className="flex-1 flex items-start gap-2 bg-[#153628]/10 border border-[#153628]/20 rounded-2xl p-3">
                                                        <div className="w-7 h-7 rounded-full bg-[#153628]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                            <ShieldCheck size={14} className="text-[#153628]" strokeWidth={2.5} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold text-[#153628] leading-tight">Upto ₹{dbtSavings} Subsidy</p>
                                                            <p className="text-[11px] font-medium text-[#153628]/80 mt-0.5 leading-snug">
                                                                This subsidy amount will be transferred to your bank account via DBT.
                                                            </p>
                                                        </div>
                                                        <Info size={15} className="text-[#153628] flex-shrink-0 mt-0.5" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Pricing table – clean responsive grid */}
                                             <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs">
                                                 {/* Header row */}
                                                 <div className={`grid ${isSubsidyUser && subsidyRate > 0 ? (hasInstantDiscount ? 'grid-cols-5' : 'grid-cols-3') : (hasInstantDiscount ? 'grid-cols-3' : 'grid-cols-2')} bg-slate-50 border-b border-slate-100 px-2 py-1.5 text-center text-[10px] font-bold text-slate-500`}>
                                                     <div>MRP</div>
                                                     {hasInstantDiscount && <div className="text-emerald-600">Instant</div>}
                                                     <div className="text-primary font-black">Pay Now</div>
                                                     {isSubsidyUser && subsidyRate > 0 && <div className="text-blue-600">DBT</div>}
                                                     {isSubsidyUser && subsidyRate > 0 && <div className="text-emerald-700 font-black">Net Cost</div>}
                                                 </div>

                                                 {/* Values row */}
                                                 <div className={`grid ${isSubsidyUser && subsidyRate > 0 ? (hasInstantDiscount ? 'grid-cols-5' : 'grid-cols-3') : (hasInstantDiscount ? 'grid-cols-3' : 'grid-cols-2')} px-2 py-2.5 text-center items-center gap-1`}>
                                                     <div>
                                                         <span className="text-xs font-semibold text-slate-400 line-through">&#8377;{mrpPrice}</span>
                                                     </div>
                                                     {hasInstantDiscount && (
                                                         <div>
                                                             <span className="text-xs font-bold text-emerald-600">-&#8377;{instantSavings}</span>
                                                             <span className="block text-[8px] text-emerald-500 font-medium">({instantDiscountPct}%)</span>
                                                         </div>
                                                     )}
                                                     <div>
                                                         <span className="text-sm font-black text-primary">&#8377;{payNowPrice}</span>
                                                     </div>
                                                     {isSubsidyUser && subsidyRate > 0 && (
                                                         <div>
                                                             <span className="text-xs font-bold text-blue-600">-&#8377;{dbtSavings}</span>
                                                             <span className="block text-[8px] text-blue-500 font-medium">({subsidyRate}%)</span>
                                                         </div>
                                                     )}
                                                     {isSubsidyUser && subsidyRate > 0 && (
                                                         <div>
                                                             <span className="text-sm font-black text-emerald-700">&#8377;{netEffectivePrice}</span>
                                                         </div>
                                                     )}
                                                 </div>
                                             </div>

                                            {/* DBT note */}
                                            {dbtSavings > 0 && (
                                                <div className="flex items-start gap-2 mt-3 bg-blue-50/60 border border-blue-100 rounded-xl px-3 py-2.5">
                                                    <Info size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                                    <p className="text-[10px] font-medium text-blue-700 leading-relaxed">
                                                        <span className="font-black">Note:</span> You have to pay the <span className="font-black text-primary">Pay Now</span> amount (₹{payNowPrice}) now. The subsidy (Upto ₹{dbtSavings}) will be transferred to your bank account by DBT.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Customer Reviews */}
                                    <AccordionItem 
                                        id="reviews" 
                                        title={`Customer Reviews (${dbProduct?.totalReviews ?? selectedProduct?.totalReviews ?? reviews.length})`}
                                        icon={<Star size={18} strokeWidth={2.5} />}
                                        expandedSections={expandedSections}
                                        toggleSection={toggleSection}
                                    >
                                        <div className="space-y-6 mt-2">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-primary rounded-xl text-xs font-black border border-brand-100">
                                                    <Star size={16} fill="currentColor" />
                                                    {dbProduct?.averageRating ? dbProduct.averageRating.toFixed(1) : (reviews.length > 0 ? (reviews.reduce((acc, r) => acc + (r.stars ?? r.rating ?? 0), 0) / reviews.length).toFixed(1) : '0.0')}
                                                </div>
                                            </div>

                                            {/* Review Form */}
                                            {hasPurchased ? (
                                                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 mb-6">
                                                    <h4 className="font-black text-slate-800 text-sm mb-1">Rate this product</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-4">Reviews are moderated</p>
                                                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                                                        <div className="flex gap-2">
                                                            {[1, 2, 3, 4, 5].map((s) => (
                                                                <button
                                                                    key={s}
                                                                    type="button"
                                                                    onClick={() => setNewReview({ ...newReview, rating: s })}
                                                                    className={cn(
                                                                        "h-10 w-10 rounded-xl flex items-center justify-center transition-all shadow-sm",
                                                                        newReview.rating >= s ? "bg-brand-50 text-primary border border-brand-100" : "bg-white text-slate-300 border border-slate-100"
                                                                    )}
                                                                >
                                                                    <Star size={18} className={cn(newReview.rating >= s && "fill-current")} />
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <textarea value={newReview.comment} onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })} placeholder="Write your experience..." className="w-full bg-white border border-slate-100 rounded-2xl p-4 text-sm font-medium min-h-[100px] outline-none focus:border-primary transition-all resize-none shadow-sm" />
                                                        <Button type="submit" disabled={isSubmittingReview} className="w-full h-12 bg-primary hover:opacity-90 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-brand-100">
                                                            {isSubmittingReview ? "Submitting..." : "Post Review"}
                                                        </Button>
                                                    </form>
                                                </div>
                                            ) : (
                                                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 text-center mb-6">
                                                    <p className="text-xs text-slate-500 font-bold leading-relaxed">
                                                        Only customers who have purchased this product can write a review.
                                                    </p>
                                                </div>
                                            )}

                                            {/* Reviews List */}
                                            <div className="space-y-4">
                                                {reviewLoading ? (
                                                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
                                                ) : reviews.length > 0 ? (
                                                    reviews.map((r, rIdx) => (
                                                        <div key={r._id} className="p-5 rounded-2xl border border-slate-100 bg-white hover:shadow-md transition-all">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-8 w-8 rounded-full bg-brand-50 flex items-center justify-center text-[10px] font-black text-primary border border-brand-100">{(r.customerName || r.userId?.name)?.[0] || 'A'}</div>
                                                                    <div>
                                                                        <p className="text-xs font-black text-slate-800">{r.customerName || r.userId?.name || 'Anonymous'}</p>
                                                                        <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} size={10} className={cn(i < (r.stars ?? r.rating ?? 0) ? 'text-primary fill-primary' : 'text-slate-200')} />)}</div>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[10px] font-bold text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-600 font-medium leading-relaxed pl-10">{r.review || r.comment}</p>
                                                            {r.images && r.images.length > 0 && (
                                                                <div className="flex gap-1.5 mt-2 pl-10">
                                                                    {r.images.map((img, i) => (
                                                                        <img key={i} src={applyCloudinaryTransform(img)} alt="Review" className="h-8 w-8 object-cover rounded-lg border border-slate-200" />
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="py-12 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                                        <MessageSquare size={24} className="text-slate-300 mx-auto mb-3" />
                                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No reviews yet — be the first!</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </AccordionItem>
                                </div>

                                <div className="h-4" /> {/* Bottom spacer for sticky bar */}
                            </div>
                        </div>

                        {/* Sticky Bottom Action Bar */}
                        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-4">

                                    {isOutOfStock ? (
                                        <motion.button
                                            whileHover={isNotified ? {} : { scale: 1.02 }}
                                            whileTap={isNotified ? {} : { scale: 0.95 }}
                                            onClick={handleNotifyMe}
                                            disabled={isNotified || isNotifying}
                                            className={cn(
                                                "flex-1 h-[56px] rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all border uppercase tracking-[0.05em] whitespace-nowrap px-4",
                                                isNotified
                                                    ? "bg-emerald-50 border-emerald-300 text-emerald-600 cursor-default"
                                                    : "bg-gradient-to-r from-primary to-[var(--brand-400)] text-white shadow-xl shadow-brand-100 border-white/20 cursor-pointer"
                                            )}
                                        >
                                            <Bell size={18} strokeWidth={3} />
                                            {isNotifying ? "..." : isNotified ? "Requested" : "Notify Me"}
                                        </motion.button>
                                    ) : quantity > 0 ? (
                                        <div className="flex items-center gap-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-1.5 shadow-inner flex-1 justify-between max-w-[170px]">
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={handleDecrement}
                                                className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white shadow-sm border border-slate-100 transition-all"
                                            >
                                                <Minus size={18} strokeWidth={3.5} />
                                            </motion.button>
                                            <span className="font-black text-xl text-slate-800 w-8 text-center tabular-nums">{quantity}</span>
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={handleIncrement}
                                                className="w-10 h-10 bg-gradient-to-br from-primary to-[var(--brand-400)] rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-100/50 hover:shadow-brand-200 transition-all border border-white/20"
                                            >
                                                <Plus size={18} strokeWidth={3.5} />
                                            </motion.button>
                                        </div>
                                    ) : (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleAddToCart}
                                            className="flex-1 bg-gradient-to-r from-primary to-[var(--brand-400)] text-white h-[56px] rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-brand-100 transition-all border border-white/20 uppercase tracking-[0.05em] whitespace-nowrap px-4"
                                        >
                                            <ShoppingBag size={18} strokeWidth={3} />
                                            ADD TO CART
                                        </motion.button>
                                    )}
                                </div>

                                {/* View Cart Button */}
                                {cartCount > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="mt-2"
                                    >
                                        <Link
                                            to="/checkout"
                                            onClick={closeProduct}
                                            className="w-full bg-gradient-to-r from-primary to-[var(--brand-400)] text-white h-[64px] rounded-2xl flex items-center justify-between px-5 shadow-xl shadow-brand-200/50 hover:shadow-brand-300 transition-all active:scale-[0.98] border border-white/20 relative overflow-hidden group"
                                        >
                                            <div className="flex flex-col items-start leading-none">
                                                <span className="text-[13px] font-[1000] uppercase tracking-wide">View cart</span>
                                                <span className="text-[11px] font-bold opacity-90 mt-1">{cartCount} {cartCount === 1 ? 'item' : 'items'} in cart</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[16px] font-[1000] tracking-tight">₹{cart.reduce((total, item) => total + ((item.salePrice || item.price) * item.quantity), 0)}</span>
                                                <ChevronRight size={18} strokeWidth={4} />
                                            </div>
                                        </Link>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ProductDetailSheet;


