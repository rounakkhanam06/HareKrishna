import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import { useInViewAnimation } from "@/core/hooks/useInViewAnimation";
import { useCart } from "../context/CartContext";
import { useAuth } from "../../../core/context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { customerApi } from "../services/customerApi";
import { useLocation as useAppLocation } from "../context/LocationContext";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import {
  MapPin,
  Clock,
  CreditCard,
  Banknote,
  ChevronRight,
  ChevronLeft,
  Share2,
  Gift,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Heart,
  Truck,
  Tag,
  Sparkles,
  Plus,
  Minus,
  Search,
  X,
  Clipboard,
  Check,
  Contact2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@shared/components/ui/Toast";
import { useSettings } from "@core/context/SettingsContext";
import SlideToPay from "../components/shared/SlideToPay";
import { getCachedGeocode, setCachedGeocode } from "@/core/utils/geocodeCache";
import { getJSON, setJSON, rawRemove, STORAGE_KEYS } from "@core/utils/storage";
import { createSocketTokenReader } from "@core/utils/authStorage";
import {
  getOrderSocket,
  joinOrderRoom,
  leaveOrderRoom,
  onOrderStatusUpdate,
} from "@/core/services/orderSocket";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


// Sub-components
import CheckoutAddressSection from "./checkout/components/CheckoutAddressSection";

import CheckoutCartSummary from "./checkout/components/CheckoutCartSummary";
import CheckoutPricingBreakdown from "./checkout/components/CheckoutPricingBreakdown";
import CheckoutPaymentSelector from "./checkout/components/CheckoutPaymentSelector";
import CheckoutCouponSection from "./checkout/components/CheckoutCouponSection";
import CheckoutRecommendedProducts from "./checkout/components/CheckoutRecommendedProducts";
import CheckoutWishlistSection from "./checkout/components/CheckoutWishlistSection";
import CheckoutOrderSuccess from "./checkout/components/CheckoutOrderSuccess";

const CheckoutPage = () => {
  const {
    cart,
    addToCart,
    cartTotal,
    cartCount,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const { wishlist, addToWishlist, fetchFullWishlist, isFullDataFetched } =
    useWishlist();
  const { showToast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { settings } = useSettings();

  const wishlistSectionRef = useRef(null);
  const wishlistFetchedRef = useRef(false);

  // useInViewAnimation for floating/particle animation containers
  const { ref: emptyCartAnimRef, isVisible: emptyCartVisible } = useInViewAnimation();

  // Lazy-load wishlist via IntersectionObserver
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!("IntersectionObserver" in window)) {
      if (!wishlistFetchedRef.current) {
        wishlistFetchedRef.current = true;
        fetchFullWishlist();
      }
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !wishlistFetchedRef.current) {
          wishlistFetchedRef.current = true;
          fetchFullWishlist();
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    if (wishlistSectionRef.current) observer.observe(wishlistSectionRef.current);
    return () => observer.disconnect();
  }, [isAuthenticated]);

  const appName = settings?.appName || "HareKrishna";
  const {
    savedAddresses: locationSavedAddresses,
    currentLocation,
    refreshLocation,
    isFetchingLocation,
    updateLocation,
  } = useAppLocation();
  const navigate = useNavigate();

  // State management
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("now");
  const [selectedPayment, setSelectedPayment] = useState("cash");
  const [selectedTip, setSelectedTip] = useState(0);
  const [showAllCartItems, setShowAllCartItems] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isResolvingAddressCoords, setIsResolvingAddressCoords] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const [walletAmountToUse, setWalletAmountToUse] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareText, setShareText] = useState("");
  const [orderId, setOrderId] = useState(null);
  const [pricingPreview, setPricingPreview] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const postOrderNavigateRef = useRef(null);
  const previewDebounceRef = useRef(null);
  const [currentAddress, setCurrentAddress] = useState({
    type: "Home",
    name: "",
    address: "",
    landmark: "",
    city: "",
    phone: "",
  });
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [editAddressForm, setEditAddressForm] = useState({
    type: "Home",
    name: "",
    address: "",
    landmark: "",
    city: "",
    phone: "",
  });
  const [showRecipientForm, setShowRecipientForm] = useState(false);
  const [recipientData, setRecipientData] = useState({
    completeAddress: "",
    landmark: "",
    pincode: "",
    name: "",
    phone: "",
  });
  const [savedRecipient, setSavedRecipient] = useState(null);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [manualCode, setManualCode] = useState("");
  const [emptyBoxData, setEmptyBoxData] = useState(null);

  // Sync current address and form with logged-in user details on load
  useEffect(() => {
    if (user) {
      const name = user.name || user["Farmer Name"] || "";
      const phone = user.phone || user["Mobile No"] || "";
      const primaryAddr = locationSavedAddresses?.find((addr) => addr.isCurrent) || locationSavedAddresses?.[0];

      setCurrentAddress((prev) => {
        if (!prev.name || prev.name === "Harshvardhan Panchal" || !prev.phone || prev.phone === "6268423925") {
          return {
            ...prev,
            name,
            phone,
            ...(primaryAddr
              ? {
                  type: primaryAddr.label || "Home",
                  address: primaryAddr.address || prev.address,
                  city: "",
                  location: primaryAddr.location || prev.location,
                  placeId: primaryAddr.placeId || prev.placeId,
                }
              : {}),
          };
        }
        return prev;
      });

      setEditAddressForm((prev) => {
        if (!prev.name || prev.name === "Harshvardhan Panchal" || !prev.phone || prev.phone === "6268423925") {
          return {
            ...prev,
            name,
            phone,
            ...(primaryAddr
              ? {
                  type: primaryAddr.label || "Home",
                  address: primaryAddr.address || prev.address,
                  city: "",
                  location: primaryAddr.location || prev.location,
                  placeId: primaryAddr.placeId || prev.placeId,
                }
              : {}),
          };
        }
        return prev;
      });
    }
  }, [user, locationSavedAddresses]);

  // Dynamically load empty-box Lottie only when cart is empty
  useEffect(() => {
    if (cart.length === 0) {
      import("../../../assets/lottie/Empty box.json")
        .then((m) => setEmptyBoxData(m.default))
        .catch(() => {});
    }
  }, [cart.length === 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const paymentMethods = [
    ...(settings?.onlineEnabled === false
      ? []
      : [
          {
            id: "online",
            label: "Pay Online",
            icon: CreditCard,
            sublabel: "UPI / Cards / NetBanking",
          },
        ]),
    ...(settings?.codEnabled === false
      ? []
      : [
          {
            id: "cash",
            label: "Cash on Delivery",
            icon: Banknote,
            sublabel: "Pay after delivery",
          },
        ]),
  ];

  const tipAmounts = [
    { value: 0, label: "No Tip" },
    { value: 10, label: "Rs.10" },
    { value: 20, label: "Rs.20" },
    { value: 30, label: "Rs.30" },
  ];

  const discountAmount = selectedCoupon
    ? selectedCoupon.discountAmount || selectedCoupon.discount || 0
    : 0;

  const RECIPIENT_STORAGE_KEY = STORAGE_KEYS.RECIPIENT_ADDRESS;

  // Derived display values for primary delivery card
  const displayName = savedRecipient?.name || currentAddress.name;
  const displayPhone =
    savedRecipient?.phone || currentAddress.phone || "";
  const displayAddress = savedRecipient
    ? `${savedRecipient.completeAddress}${savedRecipient.landmark ? `, ${savedRecipient.landmark}` : ""}${savedRecipient.pincode ? ` - ${savedRecipient.pincode}` : ""}`
    : `${currentAddress.address}${currentAddress.landmark ? `, ${currentAddress.landmark}` : ""}${currentAddress.city ? `, ${currentAddress.city}` : ""}`;

  useEffect(() => {
    if (!paymentMethods.length) return;
    const exists = paymentMethods.some((method) => method.id === selectedPayment);
    if (!exists) {
      setSelectedPayment(paymentMethods[0].id);
    }
  }, [paymentMethods, selectedPayment]);

  useEffect(() => {
    if (useWallet && user?.walletBalance && pricingPreview?.grandTotal) {
      const maxAvailable = Number(user.walletBalance || 0);
      const totalToPay = Number(pricingPreview.grandTotal || 0);
      setWalletAmountToUse(Math.min(maxAvailable, totalToPay));
    } else {
      setWalletAmountToUse(0);
    }
  }, [useWallet, user?.walletBalance, pricingPreview?.grandTotal]);

  const finalAmountToPay = Math.max(0, (pricingPreview?.grandTotal || 0) - walletAmountToUse);

  const buildAddressForOrder = () => {
    if (savedRecipient) {
      return {
        type: "Other",
        name: savedRecipient.name,
        address: savedRecipient.completeAddress,
        landmark: savedRecipient.landmark || "",
        city: savedRecipient.pincode ? `${savedRecipient.pincode}` : "",
        phone: savedRecipient.phone,
        location:
          currentLocation?.latitude && currentLocation?.longitude
            ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
            : undefined,
      };
    }

    const addrLoc = currentAddress?.location;
    const hasAddrLoc =
      addrLoc &&
      typeof addrLoc.lat === "number" &&
      typeof addrLoc.lng === "number" &&
      Number.isFinite(addrLoc.lat) &&
      Number.isFinite(addrLoc.lng);

    return {
      ...currentAddress,
      location: hasAddrLoc ? { lat: addrLoc.lat, lng: addrLoc.lng } : undefined,
    };
  };

  const handleSaveRecipient = () => {
    if (
      !recipientData.completeAddress ||
      !recipientData.name ||
      recipientData.phone.length !== 10
    ) {
      showToast("Please fill all required fields", "error");
      return;
    }
    setSavedRecipient(recipientData);
    setShowRecipientForm(false);
    setJSON(RECIPIENT_STORAGE_KEY, recipientData);
    showToast("Recipient details saved!", "success");
  };

  const handleMoveToWishlist = (item) => {
    addToWishlist(item);
    removeFromCart(item.id, item.variantSku);
    showToast(`${item.name} moved to wishlist`, "success");
  };

  const handleOpenEditAddress = () => {
    setEditAddressForm(currentAddress);
    setIsEditAddressOpen(true);
  };

  const isValidLatLng = (loc) =>
    loc &&
    typeof loc.lat === "number" &&
    typeof loc.lng === "number" &&
    Number.isFinite(loc.lat) &&
    Number.isFinite(loc.lng);

  const resolveAddressCoords = async (addressText) => {
    const q = String(addressText || "").trim();
    if (!q) return null;

    const cacheKey = `addr:${q}`;
    const cached = getCachedGeocode(cacheKey);
    if (cached?.location?.lat && cached?.location?.lng) {
      return cached.location;
    }

    try {
      const resp = await customerApi.geocodeAddress(q);
      const loc = resp.data?.result?.location;
      if (isValidLatLng(loc)) {
        setCachedGeocode(cacheKey, { location: { lat: loc.lat, lng: loc.lng } });
        return { lat: loc.lat, lng: loc.lng };
      }
    } catch (e) {
      const serverMsg =
        e?.response?.data?.message ||
        e?.response?.data?.error?.message ||
        e?.message ||
        null;
      const err = new Error(serverMsg || "Could not geocode address");
      err.__serverMsg = serverMsg;
      throw err;
    }

    return null;
  };

  const handleSelectSavedAddress = async (addr) => {
    const rawText = addr?.address || "";
    const addrLoc = addr?.location;
    const hasLoc = isValidLatLng(addrLoc);
    const pid = typeof addr?.placeId === "string" ? addr.placeId.trim() : "";

    setIsResolvingAddressCoords(true);
    try {
      let resolvedLoc = null;
      try {
        if (hasLoc) {
          resolvedLoc = addrLoc;
        } else if (pid) {
          const cacheKey = `pid:${pid}`;
          const cached = getCachedGeocode(cacheKey);
          if (cached?.location?.lat && cached?.location?.lng) {
            resolvedLoc = cached.location;
          } else {
            const resp = await customerApi.geocodePlaceId(pid);
            const loc = resp.data?.result?.location;
            if (isValidLatLng(loc)) {
              resolvedLoc = { lat: loc.lat, lng: loc.lng };
              setCachedGeocode(cacheKey, { location: resolvedLoc });
            }
          }
        } else {
          resolvedLoc = await resolveAddressCoords(rawText);
        }
      } catch (e) {
        showToast(
          e?.__serverMsg ||
            e?.message ||
            "Could not fetch coordinates for this address. Delivery charges may not update.",
          "error",
        );
      }

      if (!resolvedLoc) {
        showToast(
          "Could not fetch coordinates for this address. Please edit the address or choose a different one.",
          "error",
        );
        return;
      }

      setCurrentAddress({
        type: addr.label,
        name: user?.name || currentAddress.name,
        address: rawText,
        city: "",
        phone: addr.phone || currentAddress.phone,
        landmark: "",
        ...(pid ? { placeId: pid } : {}),
        ...(resolvedLoc ? { location: resolvedLoc } : {}),
      });

      if (resolvedLoc) {
        updateLocation(
          {
            name: rawText,
            time: currentLocation?.time || "12-15 mins",
            city: currentLocation?.city,
            state: currentLocation?.state,
            pincode: currentLocation?.pincode,
            latitude: resolvedLoc.lat,
            longitude: resolvedLoc.lng,
          },
          { persist: true, updateSavedHome: false },
        );
      }

      setIsAddressModalOpen(false);
    } finally {
      setIsResolvingAddressCoords(false);
    }
  };

  const handleSaveEditedAddress = async () => {
    if (
      !editAddressForm.name.trim() ||
      !editAddressForm.address.trim() ||
      !editAddressForm.city.trim()
    ) {
      showToast("Please fill name, address and city", "error");
      return;
    }

    let location = null;
    let placeId = null;
    let formattedAddress = null;
    try {
      const query = [
        editAddressForm.address,
        editAddressForm.landmark,
        editAddressForm.city,
      ]
        .filter(Boolean)
        .join(", ");
      const resp = await customerApi.geocodeAddress(query);
      const loc = resp.data?.result?.location;
      if (
        loc &&
        typeof loc.lat === "number" &&
        typeof loc.lng === "number" &&
        Number.isFinite(loc.lat) &&
        Number.isFinite(loc.lng)
      ) {
        location = { lat: loc.lat, lng: loc.lng };
        placeId = resp.data?.result?.placeId || null;
        formattedAddress = resp.data?.result?.formattedAddress || null;
        updateLocation(
          {
            name: resp.data?.result?.formattedAddress || query,
            time: currentLocation?.time || "12-15 mins",
            city: currentLocation?.city,
            state: currentLocation?.state,
            pincode: currentLocation?.pincode,
            latitude: loc.lat,
            longitude: loc.lng,
          },
          { persist: true, updateSavedHome: false },
        );
      }
    } catch (e) {
      showToast(
        e.response?.data?.message ||
          "Could not fetch coordinates for this address. Delivery charges may be inaccurate.",
        "error",
      );
    }

    setCurrentAddress({
      ...editAddressForm,
      ...(location ? { location } : {}),
      ...(placeId ? { placeId } : {}),
      ...(formattedAddress ? { formattedAddress } : {}),
    });
    setIsEditAddressOpen(false);
    showToast("Delivery address updated", "success");
  };

  const handleUseCurrentLiveLocation = async (isManualClick = false) => {
    const result = await refreshLocation();

    if (result?.ok && result.location) {
      const liveLocation = result.location;
      setCurrentAddress((prev) => ({
        ...prev,
        address: liveLocation.name,
        landmark: "",
        city: [liveLocation.city, liveLocation.state, liveLocation.pincode]
          .filter(Boolean)
          .join(", "),
        ...(typeof liveLocation.latitude === "number" &&
        typeof liveLocation.longitude === "number"
          ? { location: { lat: liveLocation.latitude, lng: liveLocation.longitude } }
          : {}),
      }));
      if (isManualClick) {
        showToast("Using your current live location", "success");
      }
      return;
    }

    if (currentLocation?.name) {
      setCurrentAddress((prev) => ({
        ...prev,
        address: currentLocation.name,
        landmark: "",
        city: [currentLocation.city, currentLocation.state, currentLocation.pincode]
          .filter(Boolean)
          .join(", "),
        ...(typeof currentLocation.latitude === "number" &&
        typeof currentLocation.longitude === "number"
          ? { location: { lat: currentLocation.latitude, lng: currentLocation.longitude } }
          : {}),
      }));
      if (isManualClick) {
        showToast("Using your last detected location", "success");
      }
      return;
    }

    if (isManualClick) {
      showToast(result?.error || "Unable to detect current location", "error");
    }
  };

  const hasAutoDetectedLocationRef = useRef(false);

  useEffect(() => {
    if (!currentAddress.address && !hasAutoDetectedLocationRef.current) {
      hasAutoDetectedLocationRef.current = true;
      handleUseCurrentLiveLocation(false);
    }
  }, [currentAddress.address]);

  const handleShare = async () => {
    const itemsSummary = cart
      .map((item) => {
        const itemWeight = item.variantName && item.variantName !== "Default"
          ? item.variantName
          : (item.weight || '1 unit');
        return `• ${item.name} (${itemWeight}) x ${item.quantity}`;
      })
      .join("\n");
    
    const formattedText = `🛒 *Order Summary from ${appName}*\n\n${itemsSummary}\n\n💰 *Total Pay Now Amount*: ₹${finalAmountToPay}\n\nSent via ${appName}`;
    setShareText(formattedText);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Order from ${appName}`,
          text: formattedText,
        });
        return;
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error sharing:", err);
        } else {
          return;
        }
      }
    }

    setIsShareModalOpen(true);
  };

  const handleApplyCoupon = async (coupon) => {
    try {
      const payload = {
        code: coupon.code,
        cartTotal,
        items: cart,
        customerId: user?._id,
      };
      const res = await customerApi.validateCoupon(payload);
      if (res.data.success) {
        const data = res.data.result;
        setSelectedCoupon({
          ...coupon,
          ...data,
        });
        setIsCouponModalOpen(false);
        showToast(`Coupon ${coupon.code} applied!`, "success");
      } else {
        showToast(res.data.message || "Unable to apply coupon", "error");
      }
    } catch (error) {
      showToast(
        error.response?.data?.message || "Unable to apply coupon",
        "error",
      );
    }
  };

  const handleApplyManualCode = async () => {
    if (!manualCode.trim()) {
      showToast("Please enter a coupon code", "error");
      return;
    }
    try {
      const res = await customerApi.validateCoupon({
        code: manualCode.trim(),
        cartTotal,
        items: cart,
        customerId: user?._id,
      });
      if (res.data.success) {
        const data = res.data.result;
        setSelectedCoupon({
          code: manualCode.trim(),
          description: "Applied manually",
          ...data,
        });
        showToast(`Coupon ${manualCode.trim()} applied!`, "success");
      } else {
        showToast(res.data.message || "Invalid coupon", "error");
      }
    } catch (error) {
      showToast(
        error.response?.data?.message || "Invalid coupon",
        "error",
      );
    }
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    showToast(`${product.name} added to cart!`, "success");
  };

  const getCartItem = (productId) => cart.find((item) => item.id === productId);

  // Stable key for recommended products effect — only changes when product IDs change
  const cartProductIdKey = useMemo(
    () =>
      cart
        .map((i) => i.id || i._id)
        .sort()
        .join(","),
    [cart]
  );

  // Load recipient from localStorage + fetch coupons on mount
  useEffect(() => {
    const parsed = getJSON(RECIPIENT_STORAGE_KEY, null);
    if (parsed && parsed.completeAddress && parsed.name && parsed.phone) {
      setRecipientData(parsed);
      setSavedRecipient(parsed);
    }

    const fetchCoupons = async () => {
      try {
        const res = await customerApi.getActiveCoupons();
        if (res.data.success) {
          const list = res.data.result || res.data.results || [];
          setCoupons(list);
        }
      } catch {
        // silently ignore
      }
    };
    fetchCoupons();
  }, []);

  // Debounced checkoutPreview — fires 400 ms after last dependency change
  useEffect(() => {
    if (!isAuthenticated || cart.length === 0) {
      setPricingPreview(null);
      return;
    }

    const buildPreviewPayload = () => ({
      items: cart.map((item) => ({
        product: item.id || item._id,
        name: item.name,
        variantSku: String(item.variantSku || "").trim(),
        quantity: item.quantity,
        price: item.price,
        image: item.image,
      })),
      address: buildAddressForOrder(),
      discountTotal: discountAmount,
      taxTotal: 0,
      tipAmount: selectedTip,
      paymentMode: selectedPayment === "online" ? "ONLINE" : "COD",
      timeSlot: selectedTimeSlot,
      couponCode: selectedCoupon?.code || null,
      couponId: selectedCoupon?.couponId || selectedCoupon?._id || null,
    });

    const fetchPreview = async () => {
      try {
        setIsPreviewLoading(true);
        const res = await customerApi.checkoutPreview(buildPreviewPayload());
        if (res.data?.success) {
          setPricingPreview(res.data.result?.breakdown ?? null);
        }
      } catch (error) {
        console.error("Checkout preview failed", error);
      } finally {
        setIsPreviewLoading(false);
      }
    };

    clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = setTimeout(fetchPreview, 400);

    return () => clearTimeout(previewDebounceRef.current);
  }, [
    isAuthenticated,
    cart,
    selectedPayment,
    selectedTip,
    selectedTimeSlot,
    discountAmount,
    savedRecipient,
    currentAddress,
    currentLocation,
  ]);

  // Recommended products — only re-fetches when the set of product IDs changes
  useEffect(() => {
    if (cart.length === 0) {
      setRecommendedProducts([]);
      return;
    }
    const categoryId = cart[0]?.categoryId?._id || cart[0]?.categoryId;
    if (!categoryId) return;

    const cartIds = new Set(cart.map((i) => i.id || i._id));
    customerApi
      .getProducts({ categoryId, limit: 10 })
      .then((res) => {
        if (res.data?.success) {
          const items = (res.data.result?.items || [])
            .map((p) => ({ ...p, id: p._id }))
            .filter((p) => !cartIds.has(p.id));
          setRecommendedProducts(items.slice(0, 8));
        }
      })
      .catch(() => {});
  }, [cartProductIdKey]);

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    try {
      const taxAmount = pricingPreview?.taxTotal || 0;
      const orderData = {
        address: buildAddressForOrder(),
        paymentMode: selectedPayment === "online" ? "ONLINE" : "COD",
        discountTotal: discountAmount,
        taxTotal: taxAmount,
        tipAmount: selectedTip,
        timeSlot: selectedTimeSlot,
        walletAmount: walletAmountToUse,
        couponCode: selectedCoupon?.code || null,
        couponId: selectedCoupon?.couponId || selectedCoupon?._id || null,
        items: cart.map((item) => ({
          product: item.id || item._id,
          name: item.name,
          variantSku: String(item.variantSku || "").trim(),
          quantity: item.quantity,
          price: item.price,
          image: item.image,
        })),
      };

      const response = await customerApi.createOrder(orderData);

      if (response.data.success) {
        const result = response.data.result;
        const mainOrder =
          result.order ||
          (Array.isArray(result.orders) ? result.orders[0] : null);
        const mainOrderId = mainOrder?.orderId || result.orderId;
        const paymentRef =
          result.paymentRef || result.checkoutGroupId || mainOrderId;

        if (!mainOrderId) {
          setIsPlacingOrder(false);
          showToast(
            "Order placed but ID not received. Checking order history...",
            "warning"
          );
          navigate("/orders");
          return;
        }

        if (selectedPayment === "online") {
          try {
            const paymentRes = await customerApi.createPaymentOrder({
              orderRef: paymentRef,
              orderId: mainOrderId,
            });
            if (paymentRes.data.success && paymentRes.data.result?.redirectUrl) {
              clearCart();
              window.location.href = paymentRes.data.result.redirectUrl;
              return;
            } else {
              throw new Error(
                paymentRes.data.message || "Failed to initiate payment gateway"
              );
            }
          } catch (payError) {
            setIsPlacingOrder(false);
            showToast(
              payError.message ||
                "Order created but payment gateway failed. Please pay from order details.",
              "error"
            );
            navigate(`/orders/${mainOrderId}`);
            return;
          }
        }

        // COD flow
        clearCart();
        showToast("Order placed — waiting for seller to accept.", "success");
        setOrderId(mainOrderId);
        setShowSuccess(true);

        if (postOrderNavigateRef.current) {
          clearTimeout(postOrderNavigateRef.current);
        }
        postOrderNavigateRef.current = setTimeout(() => {
          postOrderNavigateRef.current = null;
          setIsPlacingOrder(false);
          navigate(`/orders/${mainOrderId}`);
        }, 3000);
      } else {
        setIsPlacingOrder(false);
        showToast(response.data.message || "Could not place order.", "error");
      }
    } catch (error) {
      setIsPlacingOrder(false);
      showToast(
        error.response?.data?.message ||
          "Failed to place order. Please try again.",
        "error"
      );
    }
  };

  // After order placement: WebSocket listener + single fallback fetch
  useEffect(() => {
    if (!orderId || !showSuccess) return undefined;

    const getToken = createSocketTokenReader(STORAGE_KEYS.AUTH_CUSTOMER);
    getOrderSocket(getToken);
    joinOrderRoom(orderId, getToken);

    const applyCancelled = (order) => {
      if (order.workflowStatus === "CANCELLED" || order.status === "cancelled") {
        if (postOrderNavigateRef.current) {
          clearTimeout(postOrderNavigateRef.current);
          postOrderNavigateRef.current = null;
        }
        setShowSuccess(false);
        showToast("Order cancelled — seller did not accept in time.", "error");
        navigate(`/orders/${orderId}`, { replace: true });
        return true;
      }
      return false;
    };

    // Single immediate check (covers WebSocket-unavailable case)
    customerApi
      .getOrderDetails(orderId)
      .then((r) => {
        if (r.data?.result) applyCancelled(r.data.result);
      })
      .catch(() => {});

    const off = onOrderStatusUpdate(getToken, (order) => applyCancelled(order));

    return () => {
      off();
      leaveOrderRoom(orderId, getToken);
    };
  }, [orderId, showSuccess]);

  // ─── Empty cart state ────────────────────────────────────────────────────────
  if (cart.length === 0 && !showSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 p-3 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center border border-slate-200 shadow-sm z-50"
          aria-label="Go Back"
        >
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-50/50 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-brand-100/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute top-40 -left-20 w-60 h-60 bg-yellow-100/40 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-sm mx-auto">
          <div ref={emptyCartAnimRef} className="relative w-56 h-56 md:w-64 md:h-64 mb-8 flex items-center justify-center">
            <motion.div
              animate={emptyCartVisible ? { y: [-8, 8, -8] } : { y: 0 }}
              transition={emptyCartVisible ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
              className="relative z-10 rounded-[2rem] bg-white/90 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-brand-100">
              {emptyBoxData ? (
                <Lottie animationData={emptyBoxData} loop className="h-36 w-36 md:h-44 md:w-44" />
              ) : (
                <div className="w-56 h-56" />
              )}
            </motion.div>
            <motion.div
              animate={emptyCartVisible ? { rotate: 360 } : { rotate: 0 }}
              transition={emptyCartVisible ? { duration: 20, repeat: Infinity, ease: "linear" } : { duration: 0 }}
              className="absolute inset-0 border-2 border-dashed border-slate-200 rounded-full"
            />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Your Cart is Empty</h2>
          <p className="text-slate-500 mb-8 leading-relaxed font-medium">
            It feels lighter than air! <br />
            Explore our aisles and fill it with goodies.
          </p>
          <Link
            to="/"
            className="group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-primary to-[var(--brand-400)] text-white font-bold rounded-2xl overflow-hidden shadow-xl shadow-brand-600/20 transition-all hover:scale-[1.02] active:scale-95 w-full sm:w-auto">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative flex items-center gap-2 text-lg">
              Start Shopping <ChevronRight size={20} />
            </span>
          </Link>
          <div className="mt-8 flex gap-6 text-slate-400">
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-slate-50 rounded-2xl"><Clock size={20} /></div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Fast Delivery</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-slate-50 rounded-2xl"><Tag size={20} /></div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Daily Deals</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-slate-50 rounded-2xl"><Sparkles size={20} /></div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Fresh Items</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main checkout return ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f1e8] pb-32 font-sans">
      {/* Order Success Overlay */}
      <CheckoutOrderSuccess orderId={orderId} show={showSuccess} />

      {/* Premium Header */}
      <div className="bg-gradient-to-br from-[var(--brand-700)] via-[var(--brand-600)] to-[var(--brand-400)] pt-6 pb-12 md:pb-24 relative z-10 shadow-lg md:rounded-b-[4rem] rounded-b-[2rem] overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] -mr-32 -mt-64 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-brand-400/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all active:scale-95">
              <ChevronLeft size={28} className="text-white" />
            </button>
            <div className="flex flex-col items-center">
              <h1 className="text-xl md:text-3xl font-[1000] text-white tracking-tight uppercase">Checkout</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="h-1.5 w-1.5 bg-brand-400 rounded-full animate-pulse" />
                <p className="text-brand-100/90 text-[10px] md:text-xs font-black tracking-[0.2em] uppercase">
                  {cartCount} {cartCount === 1 ? "Item" : "Items"} in cart
                </p>
              </div>
            </div>
            <button
              onClick={handleShare}
              className="h-12 px-4 flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all active:scale-95">
              <Share2 size={20} className="text-white" />
              <span className="text-xs font-black text-white uppercase tracking-widest hidden sm:block">Share</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-12 md:-mt-16 lg:-mt-20 relative z-20">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">

          {/* Left Column */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6 pb-8">
            {/* Delivery Time Banner */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mt-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <Clock size={24} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg">Delivery in 12-15 mins</h3>
                  <p className="text-sm text-slate-500">Shipment of {cartCount} items</p>
                </div>
              </div>
            </div>

            {/* Address Section */}
            <CheckoutAddressSection
              currentAddress={currentAddress}
              savedRecipient={savedRecipient}
              savedAddresses={locationSavedAddresses}
              onSelectAddress={() => setIsAddressModalOpen(true)}
              onEditAddress={handleOpenEditAddress}
              onUseCurrentLocation={handleUseCurrentLiveLocation}
              isFetchingLocation={isFetchingLocation}
              showRecipientForm={showRecipientForm}
              onToggleRecipientForm={() => setShowRecipientForm((v) => !v)}
              recipientData={recipientData}
              onRecipientDataChange={setRecipientData}
              onSaveRecipient={handleSaveRecipient}
              onRemoveRecipient={() => {
                setSavedRecipient(null);
                rawRemove(RECIPIENT_STORAGE_KEY);
              }}
              displayName={displayName}
              displayPhone={displayPhone}
              displayAddress={displayAddress}
            />

            {/* Cart Summary */}
            <CheckoutCartSummary
              cart={cart}
              onUpdateQuantity={updateQuantity}
              onRemoveFromCart={removeFromCart}
              onMoveToWishlist={handleMoveToWishlist}
              showAll={showAllCartItems}
              onToggleShowAll={() => setShowAllCartItems((v) => !v)}
              subsidyDiscountPercent={pricingPreview?.subsidyDiscountPercent}
            />

            {/* Wishlist Section */}
            <CheckoutWishlistSection
              wishlist={wishlist}
              sectionRef={wishlistSectionRef}
            />

            {/* Recommended Products */}
            <CheckoutRecommendedProducts
              products={recommendedProducts}
              cart={cart}
              onAddToCart={handleAddToCart}
              onGetCartItem={getCartItem}
            />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-8 pb-32 lg:pb-8">
            {/* Coupon Section */}
            <CheckoutCouponSection
              coupons={coupons}
              selectedCoupon={selectedCoupon}
              manualCode={manualCode}
              onApplyCoupon={handleApplyCoupon}
              onRemoveCoupon={() => setSelectedCoupon(null)}
              onManualCodeChange={setManualCode}
              isOpen={isCouponModalOpen}
              onOpenChange={setIsCouponModalOpen}
              onApplyManualCode={handleApplyManualCode}
            />

            {/* Pricing Breakdown */}
            <CheckoutPricingBreakdown
              pricingPreview={pricingPreview}
              isPreviewLoading={isPreviewLoading}
              selectedTip={selectedTip}
              onSelectTip={setSelectedTip}
              tipAmounts={tipAmounts}
              walletAmountToUse={walletAmountToUse}
              finalAmountToPay={finalAmountToPay}
              cartTotal={cartTotal}
              selectedCoupon={selectedCoupon}
              discountAmount={discountAmount}
            />

            {/* Payment Selector */}
            {paymentMethods.length === 0 ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-center shadow-sm">
                <p className="text-sm font-black text-rose-800 uppercase tracking-wider">
                  Checkout Currently Unavailable
                </p>
                <p className="text-xs font-bold text-rose-600 mt-1">
                  No payment methods are currently enabled. Please contact support.
                </p>
              </div>
            ) : (
              <>
                <CheckoutPaymentSelector
                  paymentMethods={paymentMethods}
                  selectedPayment={selectedPayment}
                  onSelectPayment={setSelectedPayment}
                  useWallet={useWallet}
                  onToggleWallet={() => setUseWallet((v) => !v)}
                  walletBalance={user?.walletBalance || 0}
                  walletAmountToUse={walletAmountToUse}
                />

                {/* Desktop Slide to Pay */}
                <div className="hidden lg:block">
                  <SlideToPay
                    amount={finalAmountToPay}
                    onSuccess={handlePlaceOrder}
                    isLoading={isPlacingOrder || isPreviewLoading || !pricingPreview}
                    text={finalAmountToPay === 0 ? "Place Free Order" : "Order Now"}
                  />
                  <p className="text-center text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-[0.1em]">
                    🔒 SSL encrypted secure checkout
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Footer — Mobile Only */}
      {paymentMethods.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 rounded-t-3xl">
          <div className="max-w-4xl mx-auto">
            <SlideToPay
              amount={finalAmountToPay}
              onSuccess={handlePlaceOrder}
              isLoading={isPlacingOrder || isPreviewLoading || !pricingPreview}
              text={finalAmountToPay === 0 ? "Place Free Order" : "Slide to Pay"}
            />
          </div>
        </div>
      )}

      {/* Address Selection Modal */}
      <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Delivery Address</DialogTitle>
            <DialogDescription>Choose where you want your order delivered.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {locationSavedAddresses.map((addr) => (
              <button
                key={addr.id}
                onClick={() => handleSelectSavedAddress(addr)}
                disabled={isResolvingAddressCoords}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                  currentAddress.id === addr.id
                    ? "border-primary bg-brand-50 shadow-sm"
                    : "border-slate-100 bg-white hover:border-slate-200"
                }`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-full ${currentAddress.id === addr.id ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-500"}`}>
                    <MapPin size={16} />
                  </div>
                  <span className="font-black text-slate-800 uppercase tracking-widest text-[10px]">{addr.label}</span>
                </div>
                <p className="text-sm font-bold text-slate-800">{user?.name || currentAddress.name}</p>
                <p className="text-xs text-slate-500 leading-relaxed mb-1">{addr.address}</p>
                {addr.phone && (
                  <p className="text-[11px] text-slate-400 font-medium">Phone: {addr.phone}</p>
                )}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full border-brand-600 text-brand-600 hover:bg-brand-50"
              onClick={() => navigate("/addresses")}>
              <Plus size={16} className="mr-2" /> Add New Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Current Address Modal */}
      <Dialog open={isEditAddressOpen} onOpenChange={setIsEditAddressOpen}>
        <DialogContent className="sm:max-w-[425px] overflow-hidden p-0">
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 25 }}
            className="p-6">
            <DialogHeader>
              <DialogTitle>Edit Delivery Address</DialogTitle>
              <DialogDescription>Update the details of your current delivery address.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-address" className="text-xs font-semibold text-slate-700">Address</Label>
                <Input
                  id="edit-address"
                  value={editAddressForm.address}
                  onChange={(e) => setEditAddressForm((prev) => ({ ...prev, address: e.target.value }))}
                  className="h-10"
                  placeholder="House, street, area"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-landmark" className="text-xs font-semibold text-slate-700">Nearest Landmark (optional)</Label>
                <Input
                  id="edit-landmark"
                  value={editAddressForm.landmark || ""}
                  onChange={(e) => setEditAddressForm((prev) => ({ ...prev, landmark: e.target.value }))}
                  className="h-10"
                  placeholder="e.g. Near City Mall, Opp. Temple"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-city" className="text-xs font-semibold text-slate-700">City / Pincode</Label>
                <Input
                  id="edit-city"
                  value={editAddressForm.city}
                  onChange={(e) => setEditAddressForm((prev) => ({ ...prev, city: e.target.value }))}
                  className="h-10"
                  placeholder="City - Pincode"
                />
              </div>
            </div>
            <DialogFooter className="mt-2">
              <Button
                variant="outline"
                onClick={() => setIsEditAddressOpen(false)}
                className="border-slate-200 text-slate-600 hover:bg-slate-50">
                Cancel
              </Button>
              <Button
                onClick={handleSaveEditedAddress}
                className="bg-primary hover:bg-[#0d231a] text-white font-bold">
                Save changes
              </Button>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Fallback Share Dialog (WhatsApp, Telegram, Copy) */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-6 overflow-hidden">
          <DialogHeader className="items-center text-center">
            <div className="h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center mb-2">
              <Share2 size={24} className="text-primary" />
            </div>
            <DialogTitle className="text-lg font-black text-slate-800">Share Order Summary</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select an app to share your checkout items list.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4">
            {/* WhatsApp Share Option */}
            <button
              onClick={() => {
                const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
                window.open(whatsappUrl, "_blank");
                setIsShareModalOpen(false);
              }}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 text-left transition-all active:scale-98 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-emerald-500 text-white group-hover:scale-105 transition-transform flex items-center justify-center">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.63-1.019-5.101-2.875-6.958C16.604 1.926 14.129.905 11.5.905c-5.438 0-9.863 4.425-9.867 9.87-.001 1.91.503 3.775 1.464 5.378l-.946 3.456 3.546-.93l.36.214zM16.521 13.56c-.29-.145-1.72-.848-1.986-.944-.266-.096-.46-.145-.654.145-.193.291-.749.944-.919 1.138-.17.193-.341.218-.632.073-.29-.145-1.229-.453-2.34-1.444-.863-.77-1.447-1.721-1.617-2.012-.17-.29-.018-.447.127-.591.13-.13.29-.34.436-.51.145-.17.193-.291.29-.485.097-.194.048-.364-.025-.51-.072-.145-.654-1.577-.896-2.158-.236-.569-.475-.491-.654-.5h-.56c-.193 0-.509.072-.776.364-.266.291-1.019.995-1.019 2.427 0 1.431 1.043 2.814 1.188 3.008.145.194 2.053 3.135 4.973 4.397.695.3 1.237.479 1.661.614.698.222 1.334.191 1.838.116.56-.083 1.72-.703 1.962-1.382.242-.678.242-1.261.17-1.382-.073-.12-.266-.193-.556-.339z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">WhatsApp</p>
                  <p className="text-[11px] text-slate-500">Share directly to contacts or status</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Telegram Share Option */}
            <button
              onClick={() => {
                const telegramUrl = `https://t.me/share/url?url=&text=${encodeURIComponent(shareText)}`;
                window.open(telegramUrl, "_blank");
                setIsShareModalOpen(false);
              }}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-sky-50 hover:bg-sky-100/80 border border-sky-100 text-left transition-all active:scale-98 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-sky-500 text-white group-hover:scale-105 transition-transform flex items-center justify-center">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.24-5.54 3.65-.52.36-.99.54-1.41.53-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.36-.49.99-.75 3.87-1.68 6.45-2.79 7.74-3.32 3.69-1.52 4.45-1.78 4.95-1.79.11 0 .36.03.52.16.14.12.18.28.2.4.02.07.02.21.01.29z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">Telegram</p>
                  <p className="text-[11px] text-slate-500">Share to your Telegram chats or groups</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Copy Clipboard Option */}
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareText);
                  showToast("Order summary copied to clipboard!", "success");
                } catch (clipErr) {
                  console.error("Clipboard copy failed:", clipErr);
                  showToast("Failed to copy order summary.", "error");
                }
                setIsShareModalOpen(false);
              }}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-left transition-all active:scale-98 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-slate-500 text-white group-hover:scale-105 transition-transform flex items-center justify-center">
                  <Clipboard size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">Copy Summary</p>
                  <p className="text-[11px] text-slate-500">Copy text to paste in other apps</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `,
        }}
      />
    </div>
  );
};

export default CheckoutPage;
