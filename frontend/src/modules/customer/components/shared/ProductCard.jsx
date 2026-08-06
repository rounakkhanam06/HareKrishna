import React from "react";
import { Heart, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "@shared/components/ui/Toast";
import { useCartAnimation } from "../../context/CartAnimationContext";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";
import { useProductDetail } from "../../context/ProductDetailContext";
import { useAuth } from "@core/context/AuthContext";
import { useSettings } from "@core/context/SettingsContext";
import { customerApi } from "../../services/customerApi";
import { Bell } from "lucide-react";

const ProductCard = React.memo(
  ({ product, badge, className, compact = false, neutralBg = false }) => {
    const { user } = useAuth();
    const { settings } = useSettings();
    const { toggleWishlist: toggleWishlistGlobal, isInWishlist } = useWishlist();
    const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
    const { showToast } = useToast();
    const { animateAddToCart, animateRemoveFromCart } = useCartAnimation();
    const { openProduct } = useProductDetail();
    const [showHeartPopup, setShowHeartPopup] = React.useState(false);
    const [isNotified, setIsNotified] = React.useState(false);
    const [isNotifying, setIsNotifying] = React.useState(false);
    const imageRef = React.useRef(null);

    // ── Variant resolution (unchanged logic) ──────────────────────────────
    const defaultVariant = React.useMemo(() => {
      const variants = Array.isArray(product?.variants) ? product.variants : [];
      if (variants.length === 0) return null;
      const displayed = Number(product?.price || 0);
      const displayedOriginal = Number(product?.originalPrice || 0);
      const matchesDisplayedPrice = (variant) => {
        const mrp = Number(variant?.price || 0);
        const sale = Number(variant?.salePrice || 0);
        const effective = sale > 0 && sale < mrp ? sale : mrp;
        if (Number.isFinite(displayedOriginal) && displayedOriginal > displayed) {
          if (effective === displayed && (mrp === displayedOriginal || displayedOriginal === 0)) return true;
        }
        return effective === displayed || mrp === displayed;
      };
      const picked = variants.find(matchesDisplayedPrice) || variants[0];
      const key = String(picked?.sku || picked?.name || "").trim();
      return { key, name: String(picked?.name || "").trim() };
    }, [product]);

    const displayWeight = defaultVariant && defaultVariant.name && defaultVariant.name !== "Default"
      ? defaultVariant.name
      : (product.weight || "1 unit");

    const productId = product.id || product._id;
    const variantKey = String(defaultVariant?.key || "").trim();
    const cartKey = `${productId}::${variantKey || ""}`;

    const cartItem = React.useMemo(
      () => cart.find((item) => `${item.id || item._id}::${String(item.variantSku || "").trim()}` === cartKey),
      [cart, cartKey],
    );
    const quantity = cartItem ? cartItem.quantity : 0;
    const isWishlisted = isInWishlist(product.id || product._id);

    // ── Handlers (unchanged logic) ─────────────────────────────────────────
    const handleProductClick = React.useCallback(
      (e) => { if (openProduct) { e.preventDefault(); openProduct(product); } },
      [openProduct, product],
    );

    const toggleWishlist = React.useCallback(
      (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!isWishlisted) { setShowHeartPopup(true); setTimeout(() => setShowHeartPopup(false), 1000); }
        toggleWishlistGlobal(product);
        showToast(isWishlisted ? `${product.name} removed from wishlist` : `${product.name} added to wishlist`, isWishlisted ? "info" : "success");
      },
      [isWishlisted, toggleWishlistGlobal, product, showToast],
    );

    const handleAddToCart = React.useCallback(
      (e) => {
        e.preventDefault(); e.stopPropagation();
        if (imageRef.current) animateAddToCart(imageRef.current.getBoundingClientRect(), product.image);
        addToCart({ ...product, variantSku: variantKey, variantName: defaultVariant?.name || "" });
        showToast(`${product.name} added to cart!`, "success");
      },
      [animateAddToCart, product, addToCart, variantKey, defaultVariant?.name, showToast],
    );

    const handleIncrement = React.useCallback(
      (e) => { e.preventDefault(); e.stopPropagation(); updateQuantity(productId, 1, variantKey); },
      [updateQuantity, productId, variantKey],
    );

    const handleDecrement = React.useCallback(
      (e) => {
        e.preventDefault(); e.stopPropagation();
        if (quantity === 1) { animateRemoveFromCart(product.image); removeFromCart(productId, variantKey); }
        else updateQuantity(productId, -1, variantKey);
      },
      [quantity, animateRemoveFromCart, product.image, removeFromCart, productId, updateQuantity],
    );

    // ── Pricing calculations ───────────────────────────────────────────────
    const isSubsidyUser = false;
    const subsidyRate = 0;

    const mrpPrice = Number(product.originalPrice || product.price || 0);
    const payNowPrice = Number(product.price || 0);
    const hasInstantDiscount = mrpPrice > payNowPrice;
    const instantSavings = hasInstantDiscount ? Math.round(mrpPrice - payNowPrice) : 0;
    const instantDiscountPct = hasInstantDiscount && mrpPrice > 0
      ? Math.round(((mrpPrice - payNowPrice) / mrpPrice) * 100) : 0;
    const dbtSavings = isSubsidyUser && subsidyRate > 0 ? Math.round(payNowPrice * subsidyRate / 100) : 0;
    const netEffectivePrice = payNowPrice - dbtSavings;
    const totalSubsidyPct = instantDiscountPct + (isSubsidyUser && subsidyRate > 0 ? subsidyRate : 0);

    const t1RateConfig = Number(settings?.dbtTier1Rate ?? settings?.eAnnadataDiscount1Year ?? 10);
    const t2RateConfig = Number(settings?.dbtTier2Rate ?? settings?.eAnnadataDiscount2Years ?? 20);
    const maxDbtRate = Math.max(t1RateConfig, t2RateConfig);
    const displayDbtRate = (isSubsidyUser && subsidyRate > 0) ? subsidyRate : maxDbtRate;
    const displayDbtSavings = Math.round(payNowPrice * displayDbtRate / 100);

    const isOutOfStock = product.stock === 0 || (product.stock !== undefined && product.stock <= 0);

    // Show breakdown for ALL card sizes and users (including guests)
    const showBreakdown = false;

    const handleNotifyMe = React.useCallback(
      async (e) => {
        e.preventDefault(); e.stopPropagation();
        if (isNotified || isNotifying) return;
        setIsNotifying(true);
        try {
          await customerApi.notifyMe(productId, { variantSku: variantKey });
          setIsNotified(true);
          showToast("We will notify you when back in stock!", "success");
        } catch (err) {
          showToast(err.response?.data?.message || "Failed to subscribe to alerts", "error");
        } finally {
          setIsNotifying(false);
        }
      },
      [productId, variantKey, isNotified, isNotifying, showToast]
    );

    const NotifyControl = () => (
      <button
        onClick={handleNotifyMe}
        disabled={isNotified || isNotifying}
        className={cn(
          "border-[1.5px] rounded-lg font-black shadow-sm transition-all uppercase tracking-wide leading-none active:scale-95 flex items-center justify-center gap-1",
          compact
            ? "px-2.5 py-1.5 text-[9px]"
            : "px-4 py-2 text-[10px] sm:px-6 sm:py-2 sm:text-[11px]",
          isNotified
            ? "bg-emerald-50 border-emerald-300 text-emerald-600 cursor-default"
            : "bg-white border-primary text-primary hover:bg-primary/5 cursor-pointer"
        )}>
        <Bell size={compact ? 10 : 12} />
        {isNotifying ? "..." : isNotified ? "Requested" : "Notify Me"}
      </button>
    );

    // ── Quantity control (shared snippet) ─────────────────────────────────
    const QtyControl = ({ full = false }) =>
      quantity > 0 ? (
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "flex items-center bg-white border-[1.5px] border-primary rounded-lg p-0.5 justify-between",
            full ? "w-full" : compact ? "min-w-[60px]" : "min-w-[68px] sm:min-w-[90px]",
          )}>
          <button onClick={handleDecrement} className="p-0.5 px-1 text-primary active:scale-90 transition-transform">
            <Minus size={compact ? 10 : 12} strokeWidth={3.5} />
          </button>
          <span className={cn("font-black text-primary", compact ? "text-[10px]" : "text-[11px] sm:text-[13px]")}>{quantity}</span>
          <button onClick={handleIncrement} className="p-0.5 px-1 text-primary active:scale-90 transition-transform">
            <Plus size={compact ? 10 : 12} strokeWidth={3.5} />
          </button>
        </div>
      ) : (
        <button
          onClick={handleAddToCart}
          className={cn(
            "bg-white border-[1.5px] border-primary text-primary rounded-lg font-black shadow-sm hover:bg-primary/5 transition-all uppercase tracking-wide leading-none active:scale-95",
            full ? "w-full py-2 text-[11px] sm:text-[13px]" : compact
              ? "px-2.5 py-1 text-[10px]"
              : "px-3.5 py-1.5 text-[11px] sm:px-7 sm:py-2 sm:text-[13px]",
          )}>
          ADD
        </button>
      );

    return (
      <div
        className={cn(
          "flex-shrink-0 w-full rounded-xl sm:rounded-2xl overflow-hidden flex flex-col h-full shadow-sm cursor-pointer transition-all duration-300",
          "bg-white border border-slate-100 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.08)]",
          className,
        )}
        onClick={handleProductClick}>

        {/* ── Image section ── */}
        <div className="relative">
          {/* Top badge */}
          {instantDiscountPct > 0 ? (
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
              <span className={cn(
                "bg-red-500 text-white font-black rounded-lg shadow-md uppercase tracking-wide flex items-center justify-center border-[1.5px] border-white/20",
                compact ? "text-[8px] px-1.5 py-0.5" : "text-[10px] px-2 py-1"
              )}>
              ⚡ {instantDiscountPct}% off
              </span>
            </div>
          ) : (badge || product.discount || product.originalPrice > product.price) ? (
              <div className={cn(
                "absolute z-10 bg-primary text-primary-foreground font-[900] rounded-md shadow-sm uppercase tracking-wider flex items-center justify-center",
                compact ? "top-2 left-2 px-1.5 py-0.5 text-[7px]" : "top-2 left-2 px-1 py-0.5 text-[7px] sm:top-3 sm:left-3 sm:px-2 sm:py-1 sm:text-[9px]",
              )}>
                {badge || product.discount || `${instantDiscountPct}% OFF`}
              </div>
          ) : null}

          {/* Wishlist button */}
          <button
            onClick={toggleWishlist}
            className={cn(
              "absolute z-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:bg-white transition-all active:scale-90",
              compact ? "top-2 right-2 h-7 w-7" : "top-2 right-2 h-6.5 w-6.5 sm:top-3 sm:right-3 sm:h-8 sm:w-8",
            )}>
            <motion.div whileTap={{ scale: 0.8 }} animate={isWishlisted ? { scale: [1, 1.2, 1] } : {}}>
              <Heart size={compact ? 12 : 14} className={cn(isWishlisted ? "text-red-500 fill-current" : "text-neutral-400")} />
            </motion.div>
          </button>

          <AnimatePresence>
            {showHeartPopup && (
              <motion.div
                initial={{ scale: 0.5, opacity: 1, y: 0 }}
                animate={{ scale: 2, opacity: 0, y: -40 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute top-3 right-3 z-50 pointer-events-none text-red-500">
                <Heart size={24} fill="currentColor" />
              </motion.div>
            )}
          </AnimatePresence>
          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[0.5px] z-10 flex items-center justify-center">
              <span className="bg-red-500 text-white font-black rounded px-2 py-0.5 shadow-sm uppercase tracking-wider text-[8px] sm:text-[9px]">
                Out Of Stock
              </span>
            </div>
          )}

          {/* Product image */}
          <div className={cn(
            "block w-full overflow-hidden flex items-center justify-center aspect-square",
            "bg-white/70",
          )}>
            <img
              ref={imageRef}
              src={applyCloudinaryTransform(product.image)}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover mix-blend-multiply"
            />
          </div>
        </div>

        {/* ── Info section ── */}
        <div className={cn(
          "flex flex-col flex-1",
          "p-1.5 pt-2 sm:p-3 sm:pt-3 gap-1",
        )}>
          {/* Unit badge + name */}
          <div className={cn("flex items-center gap-1", compact ? "mb-0" : "mb-0.5")}>
            <div className={cn("border-2 border-primary rounded-full flex items-center justify-center", compact ? "h-2.5 w-2.5" : "h-2.5 w-2.5 sm:h-3.5 sm:w-3.5")}>
              <div className={cn("bg-primary rounded-full", compact ? "h-0.5 w-0.5" : "h-1 w-1")} />
            </div>
            <div className={cn("bg-brand-50 text-[#153628] font-bold rounded px-1.5 py-0 tracking-wide", compact ? "text-[8px]" : "text-[8px] sm:text-[9px]")}>
              {displayWeight}
            </div>
          </div>

          <h4 className={cn("font-[600] text-[#1A1A1A] leading-tight line-clamp-1", compact ? "text-[10px]" : "text-[12px] sm:text-[13px]")}>
            {product.name}
          </h4>
          
          {product.isReturnable ? (
            <span className={cn("text-[#153628] font-medium", compact ? "text-[8px]" : "text-[9px] sm:text-[10px]")}>
               {product.returnWindowDays || 0} Days Return
            </span>
          ) : (
            <span className={cn("text-rose-500 font-medium", compact ? "text-[8px]" : "text-[9px] sm:text-[10px]")}>
              Non-Returnable
            </span>
          )}

          {/* ── Subsidy breakdown card (all card sizes, shown when discount or DBT exists) ── */}
          {showBreakdown ? (
            <div className={cn("rounded-xl overflow-hidden border border-gray-100 bg-white/80 mt-1")}>
              {/* MRP row */}
              <div className={cn("flex items-center justify-between pb-0", compact ? "px-1.5 pt-0.5" : "px-2.5 pt-2")}>
                <span className={cn("text-gray-400 font-semibold uppercase tracking-wide", compact ? "text-[9px]" : "text-[9px]")}>MRP</span>
                <span className={cn("text-gray-400 font-semibold line-through", compact ? "text-[9px]" : "text-[9px]")}>₹{mrpPrice}</span>
              </div>

              {/* Instant Subsidy row */}
              {hasInstantDiscount && (
                <div className={cn("flex items-center justify-between gap-1", compact ? "px-2 py-0.5" : "px-2.5 py-0.5")}>
                  <span className={cn("text-[#153628] font-black whitespace-nowrap", compact ? "text-[9px]" : "text-[9px]")}>⚡ Instant Subsidy</span>
                  <span className={cn("text-[#153628] font-black whitespace-nowrap", compact ? "text-[9px]" : "text-[9px]")}>-₹{instantSavings}</span>
                </div>
              )}

              {/* Pay Now row */}
              <div
                className={cn("flex items-center justify-between bg-[#153628]/10 border-t border-[#153628]/15", compact ? "px-1.5 py-0" : "px-2.5 py-1.5")}
                onClick={(e) => e.stopPropagation()}>
                <div>
                  <p className={cn("text-gray-500 font-bold uppercase tracking-wide leading-none mb-0.5", compact ? "text-[9px]" : "text-[8px]")}>Pay Now</p>
                  <p className={cn("font-[1000] text-gray-900", compact ? "text-[12px]" : "text-[13px] sm:text-sm")}>₹{payNowPrice}</p>
                </div>
                {/* Cart button in pay-now row */}
                <div>
                  {isOutOfStock ? (
                    <button
                      onClick={handleNotifyMe}
                      disabled={isNotified || isNotifying}
                      className={cn(
                        "rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all",
                        compact ? "w-6 h-6" : "w-8 h-8",
                        isNotified
                          ? "bg-[#153628]/10 border border-[#153628]/30 text-[#153628] cursor-default"
                          : "bg-[#153628] text-white hover:bg-[#153628]/90 cursor-pointer"
                      )}>
                      <Bell size={compact ? 11 : 14} />
                    </button>
                  ) : quantity > 0 ? (
                    <div className={cn("flex items-center bg-white border-[1.5px] border-[#153628] rounded-lg p-0.5 justify-between", compact ? "min-w-[60px]" : "min-w-[70px]")}>
                      <button onClick={handleDecrement} className="p-0.5 px-1 text-[#153628] active:scale-90 transition-transform">
                        <Minus size={compact ? 9 : 11} strokeWidth={3.5} />
                      </button>
                      <span className={cn("font-black text-[#153628]", compact ? "text-[9px]" : "text-[11px]")}>{quantity}</span>
                      <button onClick={handleIncrement} className="p-0.5 px-1 text-[#153628] active:scale-90 transition-transform">
                        <Plus size={compact ? 9 : 11} strokeWidth={3.5} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleAddToCart}
                      className={cn(
                        "bg-[#153628] text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all hover:bg-[#153628]/90",
                        compact ? "w-6 h-6" : "w-8 h-8"
                      )}>
                      <Plus size={compact ? 11 : 15} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>



              {/* Net Effective Price row */}
              {dbtSavings > 0 && (
                <div className={cn("flex items-center justify-between gap-1 bg-[#153628]/10 border-t border-[#153628]/15", compact ? "px-1.5 py-0" : "px-2.5 py-1.5")}>
                  <span className={cn("text-[#153628] font-black uppercase tracking-wide whitespace-nowrap", compact ? "text-[9px]" : "text-[9px]")}>Net Effective Price</span>
                  <span className={cn("text-[#153628] font-[1000] whitespace-nowrap", compact ? "text-[11px]" : "text-[11px] sm:text-[12px]")}>₹{netEffectivePrice}</span>
                </div>
              )}
            </div>
          ) : (
            /* ── Simple price row (compact or no discount) ── */
            <div className="mt-auto flex items-center justify-between gap-1 pt-1">
              <div className="flex flex-col">
                <span className={cn("font-[1000] text-[#1A1A1A]", compact ? "text-[11px]" : "text-[13px] sm:text-sm")}>
                  ₹{payNowPrice}
                </span>
                {mrpPrice > payNowPrice && (
                  <span className={cn("font-medium text-gray-400 line-through leading-none", compact ? "text-[8px]" : "text-[9px] sm:text-[10px]")}>
                    ₹{mrpPrice}
                  </span>
                )}
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                {isOutOfStock ? <NotifyControl /> : <QtyControl />}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

export default ProductCard;
