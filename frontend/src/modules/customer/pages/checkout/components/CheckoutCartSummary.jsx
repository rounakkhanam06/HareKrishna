import React from "react";
import { Plus, Minus } from "lucide-react";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import { useAuth } from "@core/context/AuthContext";

/**
 * CheckoutCartSummary
 *
 * Props:
 *   cart              – array of cart items
 *   onUpdateQuantity  – (id, delta, variantSku) => void
 *   onRemoveFromCart  – (id, variantSku) => void
 *   onMoveToWishlist  – (item) => void
 *   showAll           – boolean (currently unused — all items shown)
 *   onToggleShowAll   – () => void
 */
const CheckoutCartSummary = React.memo(function CheckoutCartSummary({
  cart,
  onUpdateQuantity,
  onRemoveFromCart,
  onMoveToWishlist,
  subsidyDiscountPercent,
}) {
  const { user } = useAuth();
  const isSubsidyUser = !!user;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
      {cart.map((item) => {
        const mrp = Number(item.price || 0);
        const sale = Number(item.salePrice || 0);
        const qty = Math.max(0, Number(item.quantity || 0));
        const hasDiscount =
          Number.isFinite(mrp) &&
          Number.isFinite(sale) &&
          sale > 0 &&
          sale < mrp;
        const unit = hasDiscount ? sale : mrp;
        const total = Math.round(unit * qty);
        const totalMrp = Math.round(mrp * qty);

        return (
          <div
            key={`${item.id}::${String(item.variantSku || "").trim()}`}
            className="flex items-start gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
            <div className="h-20 w-20 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0">
              <img
                src={applyCloudinaryTransform(item.image)}
                alt={item.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 mb-1">{item.name}</h4>
              {(item.variantName || item.variantSku) && (
                <p className="text-xs text-slate-500 mb-1">
                  Variant: {item.variantName || item.variantSku}
                </p>
              )}
              {(hasDiscount || isSubsidyUser) && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {hasDiscount && (
                    <span className="inline-block text-[9px] bg-[#153628]/10 text-[#153628] border border-[#153628]/20 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                      🌾 Instant Subsidy
                    </span>
                  )}
                  {isSubsidyUser && (
                    <span className="inline-block text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                      🌾 DBT ({subsidyDiscountPercent || 0}% Wallet Credit)
                    </span>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => onMoveToWishlist(item)}
                className="text-xs text-slate-500 underline hover:text-primary transition-colors whitespace-nowrap">
                Move to wishlist
              </button>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-primary rounded-lg px-2 py-1">
                <button
                  onClick={() =>
                    item.quantity > 1
                      ? onUpdateQuantity(item.id, -1, item.variantSku)
                      : onRemoveFromCart(item.id, item.variantSku)
                  }
                  className="text-white p-1 hover:bg-white/20 rounded transition-colors">
                  <Minus size={14} strokeWidth={3} />
                </button>
                <span className="text-white font-bold min-w-[20px] text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, 1, item.variantSku)}
                  className="text-white p-1 hover:bg-white/20 rounded transition-colors">
                  <Plus size={14} strokeWidth={3} />
                </button>
              </div>
              <div className="text-right leading-tight">
                <p className="text-base font-black text-slate-800">₹{total}</p>
                {hasDiscount && (
                  <p className="text-[11px] font-bold text-slate-400 line-through">
                    ₹{totalMrp}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default CheckoutCartSummary;
