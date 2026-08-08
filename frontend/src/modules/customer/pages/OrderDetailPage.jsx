import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import InvoiceModal from "../components/order/InvoiceModal";
import HelpModal from "../components/order/HelpModal";
import LiveTrackingMap from "../components/order/LiveTrackingMap";
import DeliveryOtpDisplay from "../components/DeliveryOtpDisplay";
import OrderProgressTracker from "../components/order/OrderProgressTracker";
import ReturnProgressTracker from "../components/order/ReturnProgressTracker";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import {
  ChevronLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  CreditCard,
  Download,
  HelpCircle,
  Phone,
  MessageSquare,
  ArrowRight,
  User,
  Loader2,
  Store,
  Navigation2,
  Camera,
  X,
  Shield,
  Landmark,
  Smartphone,
  AlertCircle,
  Star,
} from "lucide-react";
import { customerApi } from "../services/customerApi";
import { toast } from "sonner";
import { subscribeToOrderLocation, subscribeToOrderTrail, subscribeToOrderRoute } from "@/core/services/trackingClient";
import {
  useOrderIdentifiers,
  resolveOrderIdentifiers,
} from "../hooks/useOrderIdentifiers";
import {
  getOrderSocket,
  joinOrderRoom,
  leaveOrderRoom,
  onOrderStatusUpdate,
  onCustomerOtp,
  onReturnPickupOtp,
  onReturnDropOtp,
} from "@/core/services/orderSocket";
import { getLegacyStatusFromOrder } from "@/shared/utils/orderStatus";
import { createSocketTokenReader } from "@core/utils/authStorage";
import { STORAGE_KEYS } from "@core/utils/storage";

const coordsToLatLng = (coords) => {
  if (!Array.isArray(coords) || coords.length < 2) return null;

  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
};

const hasValidLatLng = (location) =>
  location &&
  typeof location.lat === "number" &&
  typeof location.lng === "number" &&
  Number.isFinite(location.lat) &&
  Number.isFinite(location.lng);

const DEFAULT_CITY_SPEED_KMPH = 24;
const ROUTE_REFRESH_THRESHOLD_M = 150;
const ROUTE_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const toRadians = (value) => (value * Math.PI) / 180;

const distanceMeters = (from, to) => {
  if (!hasValidLatLng(from) || !hasValidLatLng(to)) return null;
  const r = 6371000;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatArrivalTime = (arrivalMs) =>
  new Date(arrivalMs).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

const formatArrivingIn = (minutes) => {
  if (!Number.isFinite(minutes) || minutes < 0) return "Soon";
  const rounded = Math.max(1, Math.round(minutes));
  return `${rounded} min${rounded === 1 ? "" : "s"}`;
};

const formatDistance = (meters) => {
  if (!Number.isFinite(meters) || meters <= 0) return "—";
  if (meters < 1000) {
    return `${Math.max(50, Math.round(meters / 10) * 10)} m`;
  }
  return `${(meters / 1000).toFixed(meters >= 10000 ? 1 : 2)} km`;
};

const estimateMinutesFromDistance = (meters) => {
  if (!Number.isFinite(meters) || meters <= 0) return null;
  return (meters * 60) / (DEFAULT_CITY_SPEED_KMPH * 1000);
};

const getTrackingRoutePhase = (order) => {
  if (!order) return "pickup";

  const workflowStatus = String(order.workflowStatus || "").toUpperCase();
  const legacyStatus = String(order.status || "").toLowerCase();
  const riderStep = Number(order.deliveryRiderStep) || 0;

  const isDeliveryPhase =
    workflowStatus === "OUT_FOR_DELIVERY" ||
    workflowStatus === "DELIVERED" ||
    legacyStatus === "out_for_delivery" ||
    legacyStatus === "delivered" ||
    riderStep >= 3 ||
    Boolean(order.pickupConfirmedAt);

  return isDeliveryPhase ? "delivery" : "pickup";
};

const matchesOrderIdentifier = (payloadOrderId, identifiers = []) => {
  const normalizedPayloadId = String(payloadOrderId || "").trim();
  if (!normalizedPayloadId) return false;
  return identifiers
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .includes(normalizedPayloadId);
};

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const [showInvoice, setShowInvoice] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [returnDetails, setReturnDetails] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [requestingReturn, setRequestingReturn] = useState(false);
  const [selectedReturnItems, setSelectedReturnItems] = useState({});
  const [returnReason, setReturnReason] = useState("");
  const [returnReasonDetail, setReturnReasonDetail] = useState("");
  const [returnConditionAssurance, setReturnConditionAssurance] = useState(false);
  const [returnImages, setReturnImages] = useState([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [trail, setTrail] = useState([]);
  const [routePolyline, setRoutePolyline] = useState(null);
  const [handoffOtp, setHandoffOtp] = useState(null);
  const [returnPickupOtp, setReturnPickupOtp] = useState(null);
  const [clockTick, setClockTick] = useState(Date.now());
  // Tracks if THIS session's order was cancelled due to seller timeout (for contextual banner)
  const [cancelledByTimeout, setCancelledByTimeout] = useState(false);

  // Delivery rating states
  const [deliveryRating, setDeliveryRating] = useState(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingHoverStars, setRatingHoverStars] = useState(0);
  const [ratingReview, setRatingReview] = useState("");
  const [ratingTags, setRatingTags] = useState([]);
  const [isRatingEditing, setIsRatingEditing] = useState(false);
  const [ratingSubmitLoading, setRatingSubmitLoading] = useState(false);

  // Return modal multi-step states
  const [returnModalStep, setReturnModalStep] = useState("RETURN_DETAILS"); // "RETURN_DETAILS" or "BANK_DETAILS"
  const [isReturnSubmitted, setIsReturnSubmitted] = useState(false);

  // Product review states
  const [productReviews, setProductReviews] = useState([]);
  const [showProductReviewModal, setShowProductReviewModal] = useState(false);
  const [selectedProductReviewItem, setSelectedProductReviewItem] = useState(null);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewTags, setReviewTags] = useState([]);
  const [reviewImages, setReviewImages] = useState([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isEditingProductReview, setIsEditingProductReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);

  // Predefined tags
  const positiveProductTags = [
    "Fresh",
    "Good Packaging",
    "Value for Money",
    "Premium Quality",
    "Good Taste",
    "Exactly as Expected"
  ];
  const negativeProductTags = [
    "Damaged",
    "Expired",
    "Wrong Item",
    "Poor Packaging",
    "Bad Quality",
    "Not Fresh"
  ];

  // Fetch product reviews for this order
  useEffect(() => {
    if (orderId && (order?.status === "delivered" || order?.workflowStatus === "DELIVERED")) {
      customerApi.getOrderProductReviews(orderId)
        .then((res) => {
          setProductReviews(res.data.result || []);
        })
        .catch((err) => console.error("Failed to fetch product reviews:", err));
    }
  }, [orderId, order]);

  // Lock body & html scroll when any modal is open to prevent background scrolling
  useEffect(() => {
    const isAnyModalOpen =
      showReturnModal ||
      showProductReviewModal ||
      showInvoice ||
      showHelp;

    if (isAnyModalOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [
    showReturnModal,
    showProductReviewModal,
    showInvoice,
    showHelp,
  ]);

  const handleProductReviewImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 5 - reviewImages.length;
    const toProcess = files.slice(0, remaining);
    setIsUploadingImage(true);
    const newImages = [];
    for (const file of toProcess) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const { default: axiosInstance } = await import("@core/api/axios");
        const uploadRes = await axiosInstance.post("/media/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const url = uploadRes.data?.result?.url || uploadRes.data?.data?.url || uploadRes.data?.url;
        if (url) newImages.push(url);
      } catch (err) {
        toast.error("Failed to process image.");
      }
    }
    setReviewImages((prev) => [...prev, ...newImages].slice(0, 5));
    setIsUploadingImage(false);
  };

  const handleProductReviewSubmit = async () => {
    if (reviewText.trim().length < 5 || reviewText.trim().length > 1000) {
      toast.error("Review comment must be between 5 and 1000 characters.");
      return;
    }
    if (reviewImages.length < 1) {
      toast.error("Please upload at least 1 image of the product.");
      return;
    }
    setIsSubmittingReview(true);
    try {
      if (isEditingProductReview) {
        const res = await customerApi.updateProductReview(editingReviewId, {
          stars: reviewStars,
          review: reviewText,
          tags: reviewTags,
          images: reviewImages
        });
        toast.success("Review updated successfully!");
        setProductReviews(prev => prev.map(r => r._id === editingReviewId ? res.data.result.review : r));
      } else {
        const res = await customerApi.submitProductReview({
          orderId,
          orderItemId: selectedProductReviewItem._id,
          productId: selectedProductReviewItem.product?._id || selectedProductReviewItem.product,
          stars: reviewStars,
          review: reviewText,
          tags: reviewTags,
          images: reviewImages
        });
        toast.success("Review submitted successfully!");
        setProductReviews(prev => [...prev, res.data.result.review]);
      }
      setShowProductReviewModal(false);
      const ordRes = await customerApi.getOrderDetails(orderId);
      setOrder(ordRes.data.result);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to submit review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const openReviewModal = (item, existingReview = null) => {
    setSelectedProductReviewItem(item);
    if (existingReview) {
      setIsEditingProductReview(true);
      setEditingReviewId(existingReview._id);
      setReviewStars(existingReview.stars);
      setReviewText(existingReview.review);
      setReviewTags(existingReview.tags || []);
      setReviewImages(existingReview.images || []);
    } else {
      setIsEditingProductReview(false);
      setEditingReviewId(null);
      setReviewStars(5);
      setReviewText("");
      setReviewTags([]);
      setReviewImages([]);
    }
    setShowProductReviewModal(true);
  };

  // Reset modal step when opened
  useEffect(() => {
    if (showReturnModal) {
      setReturnModalStep("RETURN_DETAILS");
      setIsReturnSubmitted(false);
      setShowPayoutAccountNumber(false);
      setPayoutIfscError("");
    }
  }, [showReturnModal]);

  // Lock body scroll when product review modal is open
  useEffect(() => {
    if (showProductReviewModal) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [showProductReviewModal]);

  const refreshRef = useRef({ inFlight: false, lastAt: 0 });
  const extraRoomRef = useRef("");

  // Single source of truth for the various ids that may refer to this
  // order (URL param vs canonical order.orderId vs checkoutGroupId). The
  // hook exposes:
  //   - canonicalOrderId : id to use for realtime fan-out (RTDB + sockets)
  //   - identifiersRef   : .current array kept in sync for socket callbacks
  //   - extraRoomId      : canonical id when it differs from the URL param
  // `lookupId` is also available from the hook for callers that need a
  // REST-friendly id; this page derives it ad hoc via `resolveOrderLookupId`
  // because the value is needed against freshly-fetched data before state
  // settles, which the pure helper handles directly.
  const {
    canonicalOrderId,
    identifiersRef,
    extraRoomId,
  } = useOrderIdentifiers(orderId, order);

  const navigate = useNavigate();
  // Pure helper for resolving the lookup id from a freshly-fetched order
  // before React state has settled (e.g. inside the initial fetch effect).
  const resolveOrderLookupId = (ord) =>
    resolveOrderIdentifiers(ord, orderId).lookupId || "";

  const handleBack = () => {
    const idx = window?.history?.state?.idx;
    if (typeof idx === "number" && idx > 0) {
      navigate(-1);
      return;
    }
    navigate("/orders");
  };

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const isInvalid = !orderId || orderId === "undefined" || orderId === "null";
    if (isInvalid) {
      console.warn(`[OrderDetailPage] Invalid orderId from URL: ${orderId}. Redirecting...`);
      navigate("/orders", { replace: true });
      return;
    }

    const fetchOrderDetails = async () => {
      try {
        refreshRef.current.inFlight = true;
        const response = await customerApi.getOrderDetails(orderId);
        const ord = response.data.result;
        setOrder(ord);

        try {
          const retRes = await customerApi.getReturnDetails(resolveOrderLookupId(ord));
          const ret = retRes.data.result;
          setReturnDetails(ret);
          if (ret?.returnPickupOtp) {
            setReturnPickupOtp(ret.returnPickupOtp);
          }
        } catch {
          setReturnDetails(null);
        }

        if (ord.deliveryRating?.isRated) {
          try {
            const ratingRes = await customerApi.getDeliveryRating(orderId);
            if (ratingRes.data.result?.isRated) {
              const rat = ratingRes.data.result.rating;
              setDeliveryRating(rat);
              setRatingStars(rat.stars);
              setRatingReview(rat.review || "");
              setRatingTags(rat.tags || []);
            }
          } catch (e) {
            console.error("Failed to load delivery rating details:", e);
          }
        }
      } catch (error) {
        console.error("Failed to fetch order details:", error);
        toast.error("Failed to load order details");
      } finally {
        refreshRef.current.inFlight = false;
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return undefined;
    const getToken = createSocketTokenReader(STORAGE_KEYS.AUTH_CUSTOMER);
    getOrderSocket(getToken);
    joinOrderRoom(orderId, getToken);

    // Also join using the canonical order.orderId once loaded (may differ from URL param)
    if (order?.orderId && order.orderId !== orderId) {
      joinOrderRoom(order.orderId, getToken);
    }

    const refresh = () => {
      const now = Date.now();
      if (refreshRef.current.inFlight) return;
      if (now - refreshRef.current.lastAt < 2000) return;
      refreshRef.current.lastAt = now;
      refreshRef.current.inFlight = true;
      customerApi
        .getOrderDetails(orderId)
        .then(async (r) => {
          const ord = r.data.result;
          setOrder(ord);
          try {
            const retRes = await customerApi.getReturnDetails(resolveOrderLookupId(ord));
            setReturnDetails(retRes.data.result);
          } catch {
            setReturnDetails(null);
          }
        })
        .catch(() => { })
        .finally(() => {
          refreshRef.current.inFlight = false;
        });
    };

    const offStatus = onOrderStatusUpdate(getToken, (payload) => {
      // Immediately update order state from socket payload — no waiting for API re-fetch
      const ws = String(payload?.workflowStatus || "").toUpperCase();
      if (ws) {
        setOrder((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            workflowStatus: ws,
            // Keep legacy status in sync for components that read order.status
            ...(ws === "DELIVERED" && { status: "delivered" }),
            ...(ws === "DELIVERY_SEARCH" && { status: "confirmed" }),
            ...(ws === "OUT_FOR_DELIVERY" && { status: "out_for_delivery" }),
            ...(ws === "CANCELLED" && { status: "cancelled" }),
          };
        });

        // Real-time cancellation: show toast + reveal banner without hard refresh
        if (ws === "CANCELLED") {
          setCancelledByTimeout(true);
          toast.error(
            "Order cancelled — Seller did not respond in time. Refund initiated (if applicable).",
            {
              duration: 7000,
              id: `order-cancel-${payload?.orderId || orderId}`, // dedup: one toast per order
            },
          );
        }
      }
      refresh();
    });
    const offOtp = onCustomerOtp(getToken, (payload) => {
      if (matchesOrderIdentifier(payload?.orderId, identifiersRef.current) && (payload?.code || payload?.otp)) {
        setHandoffOtp(payload.code || payload.otp);
        toast.info("Delivery OTP received — share with rider if asked.");
      }
    });
    const offReturnOtp = onReturnPickupOtp(getToken, (payload) => {
      if (matchesOrderIdentifier(payload?.orderId, identifiersRef.current) && payload?.otp) {
        setReturnPickupOtp(payload.otp);
        toast.info("Return pickup OTP received — share with rider.");
      }
    });

    return () => {
      offStatus();
      offOtp();
      offReturnOtp();
      leaveOrderRoom(orderId, getToken);
    };
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return undefined;
    const getToken = createSocketTokenReader(STORAGE_KEYS.AUTH_CUSTOMER);

    const nextExtraRoom = extraRoomId;

    if (extraRoomRef.current && extraRoomRef.current !== nextExtraRoom) {
      leaveOrderRoom(extraRoomRef.current, getToken);
      extraRoomRef.current = "";
    }

    if (nextExtraRoom && extraRoomRef.current !== nextExtraRoom) {
      joinOrderRoom(nextExtraRoom, getToken);
      extraRoomRef.current = nextExtraRoom;
    }

    return () => {
      if (extraRoomRef.current) {
        leaveOrderRoom(extraRoomRef.current, getToken);
        extraRoomRef.current = "";
      }
    };
  }, [orderId, extraRoomId]);

  // Subscribe to live tracking from Firebase (if available).
  //
  // Realtime DB writes from the rider/server are keyed on the canonical
  // `order.orderId`. The URL param may be a checkoutGroupId / alias / Mongo
  // _id, so subscribing on the raw URL produces zero updates for those
  // surfaces. We re-pin the subscriptions whenever the resolved canonical
  // id changes (i.e. once the order has loaded).
  useEffect(() => {
    const trackingId = canonicalOrderId;
    if (!trackingId) return;

    console.log(`[OrderDetailPage] Setting up Firebase subscriptions for order ${trackingId}`);
    const offLocation = subscribeToOrderLocation(trackingId, (loc) => {
      console.log(`[OrderDetailPage] Location update:`, loc);
      setLiveLocation(loc);
    });
    const offTrail = subscribeToOrderTrail(trackingId, (t) => {
      console.log(`[OrderDetailPage] Trail update: ${t.length} points`);
      setTrail(t);
    });
    const offRoute = subscribeToOrderRoute(trackingId, (route) => {
      console.log(`[OrderDetailPage] Route update:`, route);
      setRoutePolyline(route);
    });

    return () => {
      console.log(`[OrderDetailPage] Cleaning up Firebase subscriptions for order ${trackingId}`);
      offLocation && offLocation();
      offTrail && offTrail();
      offRoute && offRoute();
    };
  }, [canonicalOrderId]);

  useEffect(() => {
    const iv = setInterval(() => setClockTick(Date.now()), 30000);
    return () => clearInterval(iv);
  }, []);



  const handleOpenInMaps = () => {
    const loc = order?.address?.location;
    const dest =
      loc &&
        typeof loc.lat === "number" &&
        typeof loc.lng === "number" &&
        Number.isFinite(loc.lat) &&
        Number.isFinite(loc.lng)
        ? loc
        : null;

    const rider =
      liveLocation &&
        typeof liveLocation.lat === "number" &&
        typeof liveLocation.lng === "number"
        ? liveLocation
        : null;

    if (rider && dest) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${rider.lat},${rider.lng}&destination=${dest.lat},${dest.lng}`,
        "_blank",
      );
      return;
    }

    if (dest) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`,
        "_blank",
      );
      return;
    }

    window.open("https://maps.google.com", "_blank");
  };

  const status = order ? getLegacyStatusFromOrder(order) : null;
  const isAwaitingOnlinePayment =
    Boolean(order) &&
    order.paymentMode === "ONLINE" &&
    order.paymentStatus !== "PAID" &&
    status !== "cancelled";
  const sellerLocation = coordsToLatLng(order?.seller?.location?.coordinates);
  const routePhase = getTrackingRoutePhase(order);
  const routeMatchesPhase =
    routePhase === "pickup"
      ? routePolyline?.phase
        ? routePolyline.phase === routePhase
        : !!routePolyline?.polyline
      : routePolyline?.phase === routePhase;
  const activeRoutePolyline = routeMatchesPhase ? routePolyline : null;
  const estimatedArrival = useMemo(() => {
    if (!order) {
      return {
        arrivalTimeText: "--",
        arrivingInText: "--",
      };
    }

    if (status === "delivered") {
      return {
        arrivalTimeText: "Arrived",
        arrivingInText: "Delivered",
      };
    }

    const targetLocation =
      routePhase === "delivery" ? order?.address?.location : sellerLocation;

    let minutes = null;
    const routeDurationSeconds = Number(activeRoutePolyline?.duration);
    if (Number.isFinite(routeDurationSeconds) && routeDurationSeconds > 0) {
      minutes = routeDurationSeconds / 60;
    } else {
      const routeDistanceMeters = Number(activeRoutePolyline?.distanceMeters);
      minutes =
        estimateMinutesFromDistance(routeDistanceMeters) ??
        estimateMinutesFromDistance(distanceMeters(liveLocation, targetLocation));
    }

    if (!Number.isFinite(minutes) || minutes <= 0) {
      minutes = status === "confirmed" ? 12 : 8;
    }

    const arrivalMs = clockTick + minutes * 60 * 1000;
    const routeDistanceMeters = Number(
      activeRoutePolyline?.distanceMeters ?? activeRoutePolyline?.distance,
    );
    return {
      arrivalTimeText: formatArrivalTime(arrivalMs),
      arrivingInText: formatArrivingIn(minutes),
      totalDistanceText: formatDistance(
        routeDistanceMeters ||
        distanceMeters(liveLocation, targetLocation),
      ),
    };
  }, [
    activeRoutePolyline?.distanceMeters,
    activeRoutePolyline?.duration,
    liveLocation,
    order,
    routePhase,
    sellerLocation,
    status,
    clockTick,
  ]);

  useEffect(() => {
    if (!orderId || status === "delivered" || status === "cancelled") return;
    if (!hasValidLatLng(liveLocation)) return;

    const currentOrigin = {
      lat: liveLocation.lat,
      lng: liveLocation.lng,
    };
    const originDrift =
      routeOriginRef.current && hasValidLatLng(routeOriginRef.current)
        ? distanceMeters(routeOriginRef.current, currentOrigin)
        : null;
    const routeIsFresh =
      activeRoutePolyline?.polyline &&
      originDrift !== null &&
      originDrift < ROUTE_REFRESH_THRESHOLD_M &&
      routePhase === activeRoutePolyline?.phase;

    if (routeIsFresh) return;

    const now = Date.now();
    if (
      routeRequestRef.current.phase === routePhase &&
      now - routeRequestRef.current.startedAt < ROUTE_REFRESH_INTERVAL_MS &&
      (originDrift === null || originDrift < ROUTE_REFRESH_THRESHOLD_M)
    ) {
      return;
    }

    routeRequestRef.current = { phase: routePhase, startedAt: now };
    let ignore = false;

    customerApi
      .getOrderRoute(orderId, {
        phase: routePhase,
        originLat: liveLocation.lat,
        originLng: liveLocation.lng,
        _t: now,
      })
      .then((response) => {
        if (ignore) return;
        const nextRoute = response.data?.result;
        if (nextRoute?.polyline) {
          setRoutePolyline(nextRoute);
          routeOriginRef.current = currentOrigin;
        }
      })
      .catch(() => { });

    return () => {
      ignore = true;
    };
  }, [
    activeRoutePolyline?.polyline,
    liveLocation,
    orderId,
    routePhase,
    status,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  const isItemReturnEligible = (item) => {
    if (!order) return false;
    if (status === "cancelled") return false;
    if (status !== "delivered") return false;
    if (
      returnDetails &&
      returnDetails.returnStatus &&
      returnDetails.returnStatus !== "none" &&
      returnDetails.returnStatus !== null
    ) {
      return false;
    }

    if (!item?.product?.isReturnable) return false;

    const windowStart = new Date(order.deliveredAt || order.createdAt).getTime();
    const now = Date.now();
    const windowDays = item.product.returnWindowDays || 0;
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    return now - windowStart <= windowMs;
  };

  const canRequestReturn = () => {
    if (!order || !order.items) return false;
    return order.items.some(item => isItemReturnEligible(item));
  };

  const toggleItemSelection = (index) => {
    setSelectedReturnItems((prev) => {
      const next = { ...prev };
      if (next[index]) {
        delete next[index];
      } else {
        next[index] = { quantity: order.items[index].quantity };
      }
      return next;
    });
  };

  const validateReturnDetails = () => {
    if (!Object.keys(selectedReturnItems).length) {
      toast.error("Please select at least one item to return.");
      return false;
    }
    if (!returnReason.trim()) {
      toast.error("Please provide a reason for return.");
      return false;
    }
    if (returnImages.length === 0) {
      toast.error("Please upload at least 1 image of the product.");
      return false;
    }
    if (!returnConditionAssurance) {
      toast.error("Please confirm that the product is in good condition with accessories.");
      return false;
    }
    return true;
  };


  const handleCloseReturnModal = () => {
    if (requestingReturn) return;
    setShowReturnModal(false);
  };

  const handleReturnSubmit = async () => {
    if (!order) return;
    if (!validateReturnDetails()) return;

    const returnPayload = {
      items: Object.entries(selectedReturnItems).map(([idx, val]) => ({
        itemIndex: Number(idx),
        quantity: val.quantity,
      })),
      reason: returnReason,
      reasonDetail: returnReasonDetail,
      conditionAssurance: returnConditionAssurance,
      images: returnImages,
    };

    try {
      setRequestingReturn(true);
      let freshOrder = order;

      // 1. Submit return request first if not already done
      if (!isReturnSubmitted) {
        const res = await customerApi.requestReturn(order.orderId, returnPayload);
        if (res.data?.result) {
          freshOrder = res.data.result;
        }
        setIsReturnSubmitted(true);
      }

      toast.success("Return request submitted successfully.");
      setShowReturnModal(false);

      // Reset modal fields
      setSelectedReturnItems({});
      setReturnReason("");
      setReturnReasonDetail("");
      setReturnConditionAssurance(false);
      setReturnImages([]);

      const [orderRes, retRes] = await Promise.all([
        customerApi.getOrderDetails(orderId),
        customerApi.getReturnDetails(resolveOrderLookupId(freshOrder)),
      ]);
      setOrder(orderRes.data.result);
      setReturnDetails(retRes.data.result);
    } catch (error) {
      console.error("Failed to submit return request and payout details", error);
      const msg = error.response?.data?.message || "Failed to submit request";
      toast.error(msg);
    } finally {
      setRequestingReturn(false);
    }
  };

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = 5 - returnImages.length;
    const toProcess = files.slice(0, remaining);

    setIsUploadingImage(true);
    const newImages = [];

    for (const file of toProcess) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        let url;
        try {
          const { default: axiosInstance } = await import("@core/api/axios");
          const uploadRes = await axiosInstance.post("/media/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          url =
            uploadRes.data?.result?.url ||
            uploadRes.data?.data?.url ||
            uploadRes.data?.url;
        } catch {
          url = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
          });
        }
        if (url) newImages.push(url);
      } catch (err) {
        toast.error("Failed to process image.");
      }
    }

    setReturnImages((prev) => [...prev, ...newImages].slice(0, 5));
    setIsUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index) => {
    setReturnImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRetryPayment = async () => {
    try {
      if (!order) return;
      const paymentRef =
        Number(order.checkoutGroupSize || 1) > 1
          ? (order.checkoutGroupId || order.orderId)
          : order.orderId;
      const response = await customerApi.createPaymentOrder({
        orderRef: paymentRef,
      });
      if (response.data.success && response.data.result?.redirectUrl) {
        window.location.href = response.data.result.redirectUrl;
      } else {
        toast.error(response.data.message || "Failed to initiate payment");
      }
    } catch (err) {
      console.error("[OrderDetailPage] Retry payment error:", err);
      toast.error(
        err?.response?.data?.message ||
        err?.message ||
        "Unable to start payment. Please try again later.",
      );
    }
  };

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <Package size={64} className="text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-800">Order not found</h3>
        <Link to="/orders" className="text-brand-600 font-bold mt-4 hover:text-brand-700">
          Back to my orders
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24 font-sans">
      {/* Minimal Header */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b border-slate-100">
        <button
          type="button"
          onClick={handleBack}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft size={24} className="text-slate-800" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-base font-bold text-slate-800">Order</h1>
          <p className="text-xs text-slate-500 font-medium">#{order.orderId.slice(-8)}</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Payment Required Card - Only for Online Pending Orders */}
        {isAwaitingOnlinePayment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-brand-50 rounded-3xl p-5 shadow-sm border border-brand-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <CreditCard size={64} className="text-brand-600" />
            </div>
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                  <h3 className="text-sm font-black text-brand-900 uppercase tracking-tight">Payment Required</h3>
                </div>
                <p className="text-xs text-brand-700 font-medium leading-relaxed">
                  Complete your payment of <span className="font-bold">₹{order.pricing.total}</span> to proceed with this order.
                </p>
              </div>
              <button
                onClick={handleRetryPayment}
                className="bg-black  hover:bg-brand-700 text-primary-foreground px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-brand-200 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-wide shrink-0"
              >
                Pay Now <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Real-Time Cancellation Banner — appears instantly via socket, no refresh needed */}
        <AnimatePresence>
          {status === "cancelled" && cancelledByTimeout && (
            <motion.div
              key="cancel-banner"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm"
            >
              <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-800">Order Cancelled</p>
                <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
                  Seller did not respond in time. Your payment (if any) will be refunded automatically.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Map with Cleaner Design - Hide when delivered or cancelled */}
        {!isAwaitingOnlinePayment && status !== "delivered" && status !== "cancelled" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl overflow-hidden shadow-lg border border-slate-200/50"
          >
            <LiveTrackingMap
              status={order.workflowStatus || order.status}
              eta={estimatedArrival.arrivingInText}
              riderName={order.deliveryBoy?.name || "Delivery Partner"}
              riderLocation={liveLocation}
              sellerLocation={sellerLocation}
              destinationLocation={
                order.address?.location?.lat
                  ? order.address.location
                  : activeRoutePolyline?.destination || null
              }
              routePhase={routePhase}
              routePolyline={activeRoutePolyline}
              onOpenInMaps={handleOpenInMaps}
            />
          </motion.div>
        )}

        {/* Order Progress Tracker - New Component */}
        {!isAwaitingOnlinePayment && (
          <OrderProgressTracker
            order={order}
            estimatedArrivalText={estimatedArrival.arrivalTimeText}
            arrivingInText={estimatedArrival.arrivingInText}
            totalDistanceText={estimatedArrival.totalDistanceText}
          />
        )}

        {/* Proximity-based Delivery OTP Display */}
        {order?.workflowStatus !== "DELIVERED" && order?.workflowStatus !== "CANCELLED" && (
          <DeliveryOtpDisplay
            orderId={order?.orderId || orderId}
            checkoutGroupId={order?.checkoutGroupId || orderId}
            initialOtp={order?.deliveryOtp || handoffOtp}
            initialExpiresAt={order?.deliveryOtpExpiresAt}
            deliveryPersonNearby={order?.deliveryPersonNearby ?? true}
          />
        )}


        {/* Delivery Partner Card - Redesigned */}
        {order.deliveryBoy && status !== "delivered" && status !== "cancelled" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-3xl p-5 shadow-lg text-white"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm overflow-hidden border-2 border-white/40 shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&auto=format&fit=crop&q=60"
                    alt="Rider"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white text-brand-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-md">
                  4.8 ★
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">Your Courier</p>
                <h3 className="font-bold text-white text-lg">{order.deliveryBoy?.name || "Delivery Partner"}</h3>
                <p className="text-xs text-white/90 mt-0.5">On the way to you</p>
              </div>
              <div className="flex items-center gap-2">
                {order.deliveryBoy?.phone && (
                  <a
                    href={`tel:${order.deliveryBoy.phone}`}
                    className="h-11 w-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors border border-white/30"
                  >
                    <Phone size={20} className="text-white" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Pickup Location Card - Redesigned */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
              <Store size={24} className="text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Pickup Location</p>
              </div>
              <h4 className="font-bold text-slate-900 text-base mb-1">
                {order.seller?.shopName || order.seller?.name || "Store Location"}
              </h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                {order.seller?.address || "Address not available"}
              </p>
            </div>
            <button
              onClick={handleOpenInMaps}
              className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors flex-shrink-0"
            >
              <Navigation2 size={18} className="text-slate-700" />
            </button>
          </div>
        </motion.div>

        {/* Delivery Address Card - Redesigned */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-brand-50 flex items-center justify-center flex-shrink-0">
              <MapPin size={24} className="text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-bold text-brand-600 uppercase tracking-wider">Delivery Address</p>
                {order.address?.type && (
                  <span className="bg-brand-50 text-brand-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {order.address.type}
                  </span>
                )}
              </div>
              <h4 className="font-bold text-slate-900 text-base mb-1">{order.address?.name || "Delivery Location"}</h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                {order.address?.address ? `${order.address.address}${order.address.city ? `, ${order.address.city}` : ""}` : "Address not available"}
              </p>
              {order.address?.location &&
                typeof order.address.location.lat === "number" &&
                typeof order.address.location.lng === "number" && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-1 rounded-lg">
                    <CheckCircle size={14} className="text-brand-600" />
                    Precise location confirmed
                  </p>
                )}
              <p className="text-sm text-slate-800 font-semibold mt-3 flex items-center gap-2">
                <Phone size={16} className="text-slate-400" />
                {order.address?.phone || "—"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Delivery Partner Rating & Review Section */}
        {status === "delivered" && order.deliveryBoy && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
                  <Star className="h-5 w-5 fill-current" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {!deliveryRating || isRatingEditing
                      ? "Rate Delivery Partner"
                      : "Your Delivery Experience"}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    For Courier: {order.deliveryBoy?.name || "Delivery Partner"}
                  </p>
                </div>
              </div>
              {deliveryRating && !isRatingEditing && (
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                  Submitted
                </span>
              )}
            </div>

            {(!deliveryRating || isRatingEditing) ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-2 space-y-1">
                  <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                    How was your delivery?
                  </p>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isActive = ratingHoverStars ? star <= ratingHoverStars : star <= ratingStars;
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setRatingHoverStars(star)}
                          onMouseLeave={() => setRatingHoverStars(0)}
                          onClick={() => {
                            setRatingStars(star);
                            setRatingTags([]);
                          }}
                          className="focus:outline-none transition-transform active:scale-95"
                        >
                          <Star
                            className={`h-8 w-8 transition-colors ${
                              isActive
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-slate-200 fill-transparent hover:text-yellow-300"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {ratingStars > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4"
                  >
                    {/* Predefined Tag Chips */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Quick Feedback Tags
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(ratingStars >= 4
                          ? [
                              "Fast Delivery",
                              "Friendly",
                              "Helpful",
                              "Professional",
                              "Polite",
                              "Careful Handling",
                            ]
                          : ["Late Delivery", "Rude Behaviour", "Package Mishandled"]
                        ).map((tag) => {
                          const isSelected = ratingTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setRatingTags(ratingTags.filter((t) => t !== tag));
                                } else {
                                  setRatingTags([...ratingTags, tag]);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                                isSelected
                                  ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                                  : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Review Comment Textarea */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
                        <span>Write a Review (Optional)</span>
                        <span className={ratingReview.length > 1000 ? "text-rose-500" : ""}>
                          {ratingReview.length}/1000
                        </span>
                      </div>
                      <textarea
                        value={ratingReview}
                        onChange={(e) => setRatingReview(e.target.value)}
                        placeholder="Share your delivery experience..."
                        rows={3}
                        maxLength={1000}
                        className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-brand-500 focus:outline-none placeholder:text-slate-300 resize-none transition-colors"
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 justify-end pt-2">
                      {isRatingEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setRatingStars(deliveryRating?.stars || 0);
                            setRatingReview(deliveryRating?.review || "");
                            setRatingTags(deliveryRating?.tags || []);
                            setIsRatingEditing(false);
                          }}
                          disabled={ratingSubmitLoading}
                          className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          if (ratingStars < 1 || ratingStars > 5) {
                            toast.error("Please select a rating of 1 to 5 stars.");
                            return;
                          }
                          setRatingSubmitLoading(true);
                          try {
                            const res = await customerApi.rateDeliveryPartner(orderId, {
                              stars: ratingStars,
                              review: ratingReview,
                              tags: ratingTags,
                            });
                            toast.success(
                              isRatingEditing
                                ? "Rating updated successfully!"
                                : "Thank you for your feedback!"
                            );
                            const updatedRating = res.data.result;
                            setDeliveryRating(updatedRating);
                            setRatingStars(updatedRating.stars);
                            setRatingReview(updatedRating.review || "");
                            setRatingTags(updatedRating.tags || []);
                            setIsRatingEditing(false);
                            // Refresh order details to update rated state
                            const ordRes = await customerApi.getOrderDetails(orderId);
                            setOrder(ordRes.data.result);
                          } catch (e) {
                            toast.error(e.response?.data?.message || "Failed to submit rating.");
                          } finally {
                            setRatingSubmitLoading(false);
                          }
                        }}
                        disabled={ratingSubmitLoading || ratingStars === 0 || ratingReview.length > 1000}
                        className="px-5 py-2.5 bg-black hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50"
                      >
                        {ratingSubmitLoading ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          "Submit Feedback"
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= deliveryRating.stars
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-slate-200 fill-transparent"
                      }`}
                    />
                  ))}
                  <span className="text-xs font-bold text-slate-500 ml-2">
                    {deliveryRating.stars} out of 5
                  </span>
                </div>

                {deliveryRating.tags && deliveryRating.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {deliveryRating.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-100 rounded-full text-[10px] font-bold"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {deliveryRating.review && (
                  <p className="text-sm text-slate-600 bg-slate-50/50 border border-slate-100/50 rounded-2xl p-3 leading-relaxed">
                    {deliveryRating.review}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Submitted on: {new Date(deliveryRating.createdAt).toLocaleDateString()}
                  </p>
                  {new Date(deliveryRating.editableUntil) > new Date() && (
                    <button
                      type="button"
                      onClick={() => setIsRatingEditing(true)}
                      className="text-xs font-black text-brand-600 hover:text-brand-700 transition-colors uppercase tracking-wider"
                    >
                      Edit Feedback
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Order Items - Compact Design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100"
        >
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Package size={18} className="text-slate-400" />
            Order Items
          </h3>
          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-2 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100">
                    <img
                      src={applyCloudinaryTransform(item.image)}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm mb-0.5 truncate">
                      {item.name}
                    </h4>
                    <p className="text-slate-500 text-xs font-medium">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-slate-900">
                      ₹{item.price * item.quantity}
                    </p>
                  </div>
                </div>
                {isItemReturnEligible(item) && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setSelectedReturnItems({ [idx]: { quantity: item.quantity } });
                        setShowReturnModal(true);
                      }}
                      className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
                    >
                      Return Item
                    </button>
                  </div>
                )}
                {/* Rate Product / Review Details */}
                {(status === "delivered" || order?.workflowStatus === "DELIVERED") && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1.5 text-xs">
                    {(() => {
                      const itemReview = productReviews.find(
                        (r) => String(r.orderItemId) === String(item._id)
                      );
                      if (itemReview) {
                        const canEdit = new Date(itemReview.editableUntil) > new Date();
                        return (
                          <div className="bg-slate-50 rounded-xl p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-3 w-3 ${
                                      star <= itemReview.stars
                                        ? "text-yellow-400 fill-yellow-400"
                                        : "text-slate-200 fill-transparent"
                                    }`}
                                  />
                                ))}
                                <span className="text-[10px] text-slate-400 font-bold ml-1">
                                  Verified Purchase
                                </span>
                              </div>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => openReviewModal(item, itemReview)}
                                  className="text-[10px] text-brand-600 font-black hover:underline uppercase tracking-wider"
                                >
                                  Edit Review
                                </button>
                              )}
                            </div>
                            {itemReview.review && (
                              <p className="text-slate-600 mt-1 font-medium leading-relaxed">
                                {itemReview.review}
                              </p>
                            )}
                            {itemReview.tags && itemReview.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {itemReview.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="px-2 py-0.5 bg-white text-slate-500 border border-slate-100 rounded-md text-[9px] font-bold"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                            {itemReview.images && itemReview.images.length > 0 && (
                              <div className="flex gap-1.5 mt-2">
                                {itemReview.images.map((img, i) => (
                                  <img
                                    key={i}
                                    src={applyCloudinaryTransform(img)}
                                    alt="Review"
                                    className="h-10 w-10 object-cover rounded-lg border border-slate-200"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        return (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => openReviewModal(item)}
                              className="text-xs font-black text-white bg-brand-600 hover:bg-brand-700 px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1"
                            >
                              <Star size={12} className="fill-white" />
                              Rate & Review Product
                            </button>
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bill Summary - Cleaner Design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100"
        >
          <h3 className="text-base font-bold text-slate-800 mb-4">Bill Summary</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Item Total</span>
              <span className="font-semibold">₹{order.pricing.subtotal}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Delivery Fee</span>
              <span
                className={
                  order.pricing.deliveryFee === 0 ? "text-brand-600 font-bold" : "font-semibold"
                }>
                {order.pricing.deliveryFee === 0
                  ? "FREE"
                  : `₹${order.pricing.deliveryFee}`}
              </span>
            </div>
            {order.pricing.tip > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Tip</span>
                <span className="font-semibold">₹{order.pricing.tip}</span>
              </div>
            )}
            {/* Platform / Handling Fee */}
            {(order.pricing?.platformFee > 0 || order.paymentBreakdown?.handlingFeeCharged > 0) && (
              <div className="flex justify-between text-slate-600">
                <span>Platform/Handling Fee</span>
                <span className="font-semibold">₹{order.pricing?.platformFee || order.paymentBreakdown?.handlingFeeCharged}</span>
              </div>
            )}
            {/* GST / Tax */}
            {(order.pricing?.gst > 0 || order.paymentBreakdown?.taxTotal > 0) && (
              <div className="flex justify-between text-slate-600">
                <span>Tax/GST</span>
                <span className="font-semibold">₹{order.pricing?.gst || order.paymentBreakdown?.taxTotal}</span>
              </div>
            )}
            {/* Discount */}
            {(order.pricing?.discount > 0 || order.paymentBreakdown?.discountTotal > 0) && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Discount</span>
                <span>-₹{order.pricing?.discount || order.paymentBreakdown?.discountTotal}</span>
              </div>
            )}
            {/* Wallet Applied */}
            {(order.pricing?.walletAmount > 0 || order.paymentBreakdown?.walletAmount > 0) && (
              <div className="flex justify-between text-brand-600 font-medium">
                <span>Wallet Applied</span>
                <span>-₹{order.pricing?.walletAmount || order.paymentBreakdown?.walletAmount}</span>
              </div>
            )}
            <div className="border-t border-slate-100 mt-3 pt-3 flex justify-between items-center">
              <span className="text-base font-bold text-slate-900">
                Total Amount
              </span>
              <span className="text-xl font-black text-brand-600">
                ₹{order.pricing.total}
              </span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mt-4 bg-slate-50 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <CreditCard size={18} className="text-slate-700" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Payment
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {order.payment.method === "cash"
                    ? "Cash on Delivery"
                    : order.payment.method}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons - Redesigned */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-2 gap-3"
        >
          <button
            onClick={() => setShowInvoice(true)}
            className="py-3.5 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm shadow-sm hover:shadow-md active:scale-[0.98]">
            <Download size={18} /> Invoice
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="py-3.5 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm shadow-sm hover:shadow-md active:scale-[0.98]">
            <HelpCircle size={18} /> Help
          </button>
        </motion.div>

        {/* Return Section - Only if applicable */}
        {status !== "cancelled" && (canRequestReturn() || (returnDetails && returnDetails.returnStatus && returnDetails.returnStatus !== "none")) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Package size={18} className="text-brand-600" />
                Return & Refund
              </h3>
            </div>

            {returnDetails &&
              returnDetails.returnStatus &&
              returnDetails.returnStatus !== "none" ? (
              <div className="space-y-4 text-sm">
                <ReturnProgressTracker returnStatus={returnDetails.returnStatus} />

                {/* Return OTP Display for Customer if pickup is assigned */}
                {returnDetails.returnStatus === "return_pickup_assigned" && (
                  <div className="bg-brand-50 rounded-2xl p-4 border border-brand-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center">
                        <Truck size={16} className="text-brand-600" />
                      </div>
                      <p className="text-sm font-bold text-brand-900">Return Pickup Assigned</p>
                    </div>
                    <p className="text-xs text-brand-700 mb-3 ml-11">
                      A delivery partner is coming to collect your return. Please share this OTP when they arrive:
                    </p>
                    <div className="ml-11 flex items-center gap-2">
                      {returnPickupOtp ? (
                        <div className="flex gap-2">
                          {returnPickupOtp.split('').map((digit, i) => (
                            <div key={i} className="h-10 w-8 bg-white border-2 border-brand-200 rounded-lg flex items-center justify-center text-lg font-black text-brand-700 shadow-sm">
                              {digit}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-slate-400 italic">Waiting for rider to request OTP...</p>
                      )}
                    </div>
                  </div>
                )}

                {returnDetails.returnStatus === "return_rejected" && (
                  <p className="text-sm text-rose-600 font-medium bg-rose-50 p-3 rounded-xl border border-rose-100">
                    Return request rejected:{" "}
                    {returnDetails.returnRejectedReason || "No reason provided"}
                  </p>
                )}
                {returnDetails.returnRefundAmount > 0 &&
                  returnDetails.returnStatus === "refund_completed" && (
                    <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                      <p className="text-xs font-bold text-brand-800 uppercase tracking-wider mb-1">Refund Successful</p>
                      <p className="text-sm text-brand-700 font-medium">
                        ₹{returnDetails.returnRefundAmount} has been credited to your {order.paymentMethod === 'cod' ? 'hand (Cash)' : 'wallet'}.
                      </p>
                    </div>
                  )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                You can request a return for eligible items by clicking on 'Return Item' above.
              </p>
            )}

            {canRequestReturn() && (
              <button
                onClick={() => setShowReturnModal(true)}
                className="w-full py-4 rounded-2xl bg-slate-900 text-white text-sm font-bold shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-[0.98]">
                Request Return
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <InvoiceModal
        isOpen={showInvoice}
        onClose={() => setShowInvoice(false)}
        order={order}
      />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Return Request Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4 overscroll-contain">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleCloseReturnModal}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain"
          >
            {returnModalStep === "RETURN_DETAILS" ? (
              <>
                <h3 className="text-lg font-black text-slate-900">
                  Request Return
                </h3>
                <p className="text-xs text-slate-500">
                  Select the items you want to return and tell us why.
                </p>
                <div className="max-h-48 overflow-y-auto space-y-3">
                  {order.items.map((item, idx) => {
                    if (!isItemReturnEligible(item)) return null;
                    const checked = !!selectedReturnItems[idx];
                    return (
                      <label
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItemSelection(idx)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Qty: {item.quantity} • ₹{item.price * item.quantity}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600">
                      Reason for return
                    </label>
                    <select
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                    >
                      <option value="" disabled>Select a reason...</option>
                      <option value="Defective product">Defective product</option>
                      <option value="Wrong item delivered">Wrong item delivered</option>
                      <option value="Not as expected">Not as expected</option>
                      <option value="Size issue">Size issue</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600">
                      Detailed Issue Mention
                    </label>
                    <textarea
                      rows={2}
                      value={returnReasonDetail}
                      onChange={(e) => setReturnReasonDetail(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                      placeholder="Describe the issue with the product..."
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-600 uppercase">
                      Photos ({returnImages.length}/5) *
                    </p>
                    <p className="text-[11px] text-slate-400 -mt-1">Upload at least 1 photo and up to 5 photos of the product.</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {returnImages.map((img, index) => (
                        <div key={index} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                          <img src={img} alt="proof" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/80"
                          >
                            <X size={12} className="text-white" />
                          </button>
                        </div>
                      ))}
                      {returnImages.length < 5 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingImage}
                          className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors shrink-0"
                        >
                          {isUploadingImage ? (
                            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                          ) : (
                            <Camera className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>

                  <label className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={returnConditionAssurance}
                      onChange={(e) => setReturnConditionAssurance(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600"
                    />
                    <span className="text-xs font-semibold text-amber-900 leading-tight">
                      I confirm the product is returned with proper accessories and is in good condition.
                    </span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleCloseReturnModal}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    disabled={requestingReturn}>
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (validateReturnDetails()) {
                        setReturnModalStep("BANK_DETAILS");
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all flex items-center gap-1"
                    disabled={requestingReturn}>
                    Continue
                    <ArrowRight size={16} />
                  </button>
                </div>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleReturnSubmit();
                }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={20} className="text-brand-600" />
                  <h3 className="text-lg font-black text-slate-900">
                    Refund Payout Details
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Provide your transfer details. They are stored with secure 256-bit encryption.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Refund Payout Option
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPayoutMethod("UPI")}
                        className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 font-bold text-xs transition-all ${
                          payoutMethod === "UPI"
                            ? "border-brand-600 bg-brand-50/50 text-brand-700"
                            : "border-slate-200 hover:border-slate-300 text-slate-600"
                        }`}
                      >
                        <Smartphone size={14} />
                        UPI ID
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayoutMethod("BANK_ACCOUNT")}
                        className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 font-bold text-xs transition-all ${
                          payoutMethod === "BANK_ACCOUNT"
                            ? "border-brand-600 bg-brand-50/50 text-brand-700"
                            : "border-slate-200 hover:border-slate-300 text-slate-600"
                        }`}
                      >
                        <Landmark size={14} />
                        Bank Account
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto px-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Account Holder Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="As registered in bank/UPI profile"
                        value={payoutHolderName}
                        onChange={(e) => setPayoutHolderName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-slate-800 font-semibold"
                      />
                    </div>

                    {payoutMethod === "UPI" ? (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">
                          UPI ID *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. accountname@okaxis"
                          value={payoutUpiId}
                          onChange={(e) => setPayoutUpiId(e.target.value)}
                          onBlur={() => setPayoutUpiId(payoutUpiId.trim().toLowerCase())}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-slate-800 font-mono font-semibold"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            Bank Account Number *
                          </label>
                          <div className="relative">
                            <input
                              type={showPayoutAccountNumber ? "text" : "password"}
                              required
                              placeholder="Enter account number"
                              value={payoutAccountNumber}
                              onChange={(e) => setPayoutAccountNumber(e.target.value.replace(/\D/g, ""))}
                              maxLength={18}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-slate-800 font-mono font-semibold"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPayoutAccountNumber(!showPayoutAccountNumber)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-semibold"
                            >
                              {showPayoutAccountNumber ? "Hide" : "Show"}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            Confirm Bank Account Number *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Re-enter account number"
                            value={payoutConfirmAccountNumber}
                            onChange={(e) => setPayoutConfirmAccountNumber(e.target.value.replace(/\D/g, ""))}
                            maxLength={18}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-slate-800 font-mono font-semibold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">
                              IFSC Code *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="SBIN0001234"
                              value={payoutIfscCode}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                                setPayoutIfscCode(val);
                              }}
                              onBlur={(e) => {
                                const trimmed = e.target.value.trim();
                                setPayoutIfscCode(trimmed);
                                setPayoutIfscError(validateIfscCode(trimmed));
                              }}
                              maxLength={11}
                              pattern="^[A-Za-z]{4}0[A-Za-z0-9]{6}$"
                              title="IFSC code must be 11 characters (e.g. SBIN0001234), with 4 letters, followed by a 0, then 6 letters or digits."
                              className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-slate-800 font-mono uppercase font-semibold ${
                                payoutIfscError ? "border-rose-400 focus:ring-rose-200" : "border-slate-200"
                              }`}
                            />
                            {payoutIfscError && (
                              <p className="text-[10px] text-rose-500 mt-1 font-semibold leading-normal">
                                {payoutIfscError}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">
                              Bank Name (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. HDFC Bank"
                              value={payoutBankName}
                              onChange={(e) => setPayoutBankName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-slate-800 font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-2.5 mt-2">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">
                          Mobile for Alerts
                        </label>
                        <input
                          type="text"
                          placeholder="Phone number"
                          value={payoutMobile}
                          onChange={(e) => setPayoutMobile(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-[11px] focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">
                          Email for Alerts
                        </label>
                        <input
                          type="email"
                          placeholder="Email address"
                          value={payoutEmail}
                          onChange={(e) => setPayoutEmail(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-[11px] focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-150 rounded-2xl p-3 flex gap-2 text-amber-900 text-[10px] leading-relaxed">
                  <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p>
                    Verify all bank details are correct. Inaccurate details can lead to failed or delayed transfers.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReturnModalStep("RETURN_DETAILS")}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    disabled={requestingReturn}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-70 transition-all flex items-center justify-center gap-2"
                    disabled={requestingReturn}
                  >
                    {requestingReturn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Confirm & Submit"
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}


      {/* Product Review Submission Modal */}
      {showProductReviewModal && selectedProductReviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 max-w-md w-full relative max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={() => setShowProductReviewModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-black text-slate-900 mb-2">
              {isEditingProductReview ? "Edit Product Review" : "Rate & Review Product"}
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-semibold uppercase tracking-wide">
              {selectedProductReviewItem.name}
            </p>

            <div className="space-y-4">
              {/* Star Rating Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase">Your Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        setReviewStars(star);
                        setReviewTags([]);
                      }}
                      className="transition-transform active:scale-90"
                    >
                      <Star
                        size={32}
                        className={`${
                          star <= reviewStars
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-slate-200 fill-transparent"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-sm font-bold text-slate-500 ml-2">
                    {reviewStars} / 5
                  </span>
                </div>
              </div>

              {/* Tag Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {(reviewStars >= 4 ? positiveProductTags : negativeProductTags).map((tag) => {
                    const isSelected = reviewTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setReviewTags(reviewTags.filter((t) => t !== tag));
                          } else {
                            setReviewTags([...reviewTags, tag]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                          isSelected
                            ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                            : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Review Textarea */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-600 uppercase">
                  <span>Your Review</span>
                  <span className={reviewText.length > 1000 ? "text-rose-500" : ""}>
                    {reviewText.length}/1000
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-brand-500 focus:outline-none placeholder:text-slate-300 resize-none transition-colors"
                  placeholder="Share your experience with the product (min 5, max 1000 characters)..."
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase block">
                  Add Photos ({reviewImages.length}/5) * <span className="text-[10px] text-rose-500 font-semibold normal-case">(Minimum 1 photo required)</span>
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {reviewImages.map((img, index) => (
                    <div key={index} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                      <img src={img} alt="review-image" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setReviewImages(reviewImages.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/80"
                      >
                        <X size={12} className="text-white" />
                      </button>
                    </div>
                  ))}
                  {reviewImages.length < 5 && (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer">
                      {isUploadingImage ? (
                        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-slate-400" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleProductReviewImageUpload}
                        className="hidden"
                        disabled={isUploadingImage}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowProductReviewModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                disabled={isSubmittingReview}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProductReviewSubmit}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50"
                disabled={isSubmittingReview || isUploadingImage || reviewText.trim().length < 5 || reviewText.trim().length > 1000 || reviewImages.length < 1}
              >
                {isSubmittingReview ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Review"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;
