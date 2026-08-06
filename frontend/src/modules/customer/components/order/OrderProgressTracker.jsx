import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, Circle, Package, ShoppingBag, User, Home, ClipboardList } from "lucide-react";

const getOrderStatusKey = (order) => {
  if (!order) return "SELLER_PENDING";
  if (order.status === "cancelled") return "CANCELLED";
  
  if (order.workflowStatus) {
    const ws = String(order.workflowStatus).toUpperCase();
    if (ws === "PICKUP_READY") return "DELIVERY_ASSIGNED";
    return ws;
  }
  
  // Legacy fallback
  const s = String(order.status || "pending").toLowerCase();
  if (s === "pending") return "SELLER_PENDING";
  if (s === "confirmed") return "SELLER_ACCEPTED";
  if (s === "packed") return "DELIVERY_SEARCH";
  if (s === "out_for_delivery") return "OUT_FOR_DELIVERY";
  if (s === "delivered") return "DELIVERED";
  return "SELLER_PENDING";
};

const getStepDate = (stepId, order) => {
  if (!order) return null;
  switch (stepId) {
    case "placed":
      return order.createdAt;
    case "confirmed":
      return order.sellerAcceptedAt;
    case "packed":
      return order.pickupReadyAt;
    case "pickup":
      return order.assignedAt;
    case "picked_up":
      return order.outForDeliveryAt || order.pickupConfirmedAt;
    case "delivered":
      return order.deliveredAt;
    default:
      return null;
  }
};

const formatStepTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  }) + ", " + date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const OrderProgressTracker = ({ order }) => {
  const currentKey = getOrderStatusKey(order);

  if (currentKey === "CANCELLED") {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5">
        <p className="text-center text-rose-700 font-semibold">Order Cancelled</p>
      </div>
    );
  }

  const steps = [
    {
      id: "placed",
      label: "Order Placed",
      description: "Your order has been placed.",
      icon: ClipboardList,
      matchStatuses: ["SELLER_PENDING"],
    },
    {
      id: "confirmed",
      label: "Order Confirmed",
      description: "Your order has been confirmed.",
      icon: CheckCircle,
      matchStatuses: ["SELLER_ACCEPTED"],
    },
    {
      id: "packed",
      label: "Packed",
      description: "Your order has been packed.",
      icon: Package,
      matchStatuses: ["DELIVERY_SEARCH"],
    },
    {
      id: "pickup",
      label: "Ready for Pickup",
      description: "Your order is ready for pickup by courier partner.",
      icon: ShoppingBag,
      matchStatuses: ["DELIVERY_ASSIGNED"],
    },
    {
      id: "picked_up",
      label: "Picked up",
      description: "Your order has been picked up.",
      icon: User,
      matchStatuses: ["OUT_FOR_DELIVERY"],
    },
    {
      id: "delivered",
      label: "Delivered",
      description: "Your order has been delivered.",
      icon: Home,
      matchStatuses: ["DELIVERED"],
    },
  ];

  const activeIndex = steps.findIndex((step) => step.matchStatuses.includes(currentKey));

  const getStepStatus = (index) => {
    if (activeIndex === -1) {
      return index === 0 ? "active" : "pending";
    }
    if (index < activeIndex) return "completed";
    if (index === activeIndex) return "active";
    return "pending";
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 font-sans">
      <h3 className="text-base font-bold text-slate-800 mb-6">Order Tracking</h3>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6">
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(index);
          const Icon = step.icon;
          const isCompleted = stepStatus === "completed";
          const isActive = stepStatus === "active";
          const dateVal = getStepDate(step.id, order);

          return (
            <div key={step.id} className="relative">
              <div className="flex items-start gap-4">
                {/* Icon Circle */}
                <div
                  className={`relative z-10 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isCompleted
                      ? "bg-[#1a8a3c] text-white shadow-md shadow-green-100"
                      : isActive
                      ? "bg-amber-100 text-amber-600 border-2 border-amber-400"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <Icon size={20} className="stroke-[2.5]" />
                  ) : isActive ? (
                    <div className="animate-pulse">
                      <Icon size={18} className="stroke-[2.5]" />
                    </div>
                  ) : (
                    <Circle size={18} className="stroke-[2]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-2">
                  <p
                    className={`text-xs sm:text-sm font-bold leading-tight ${
                      isCompleted ? "text-[#1a8a3c]" : isActive ? "text-amber-700" : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-normal font-medium">
                    {step.description}
                  </p>
                </div>

                {/* Timestamp */}
                {dateVal && (
                  <div className="text-[10px] sm:text-xs text-slate-500 font-semibold shrink-0 pt-0.5">
                    {formatStepTime(dateVal)}
                  </div>
                )}
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-5 top-10 bottom-0 w-0.5 -mb-6">
                  <div
                    className={`h-full w-full ${
                      isCompleted ? "bg-[#1a8a3c]" : "bg-slate-200"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default OrderProgressTracker;
