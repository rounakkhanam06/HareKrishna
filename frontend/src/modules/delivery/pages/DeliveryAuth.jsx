import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone,
  ArrowRight,
  CheckCircle,
  ShieldCheck,
  ChevronLeft,
  User,
  Bike,
  ChevronDown,
  Mail,
  MapPin,
  FileText,
  Upload,
  X,
  Camera,
  XCircle,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import deliveryRiding from "@/assets/Delivery Riding.json";
import { deliveryApi } from "../services/deliveryApi";
import { useAuth } from "@core/context/AuthContext";
import { useSettings } from "@core/context/SettingsContext";
import { toast } from "sonner";
import Tesseract from "tesseract.js";
import { captureFlutterCamera } from "@core/utils/deviceUtils";


const VEHICLE_TYPES = [
  { value: "bike", label: "Bike" },
  { value: "scooter", label: "Scooter" },
  { value: "cycle", label: "Cycle" },
];

const clearDeliveryAuthSession = () => {
  const keys = [
    "temp_delivery_login_phone",
    "temp_delivery_signup_phone",
    "temp_delivery_mode",
    "temp_delivery_step",
    "temp_delivery_signup_step",
    "temp_delivery_signup_name",
    "temp_delivery_signup_email",
    "temp_delivery_signup_address",
    "temp_delivery_signup_vehicle",
    "temp_delivery_signup_vehicle_number",
    "temp_delivery_signup_dl_number",
    "temp_delivery_signup_pan_number",
    "temp_delivery_signup_aadhar_number",
    "temp_delivery_signup_account_number",
    "temp_delivery_signup_ifsc",
    "temp_delivery_signup_account_holder",
    "temp_delivery_signup_emergency_contact_name",
    "temp_delivery_signup_emergency_contact_relation",
    "temp_delivery_signup_emergency_contact_phone",
    "temp_delivery_signup_vehicle_registration_number"
  ];
  keys.forEach(k => sessionStorage.removeItem(k));
};

const DeliveryAuth = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const appName = settings?.appName || "eAnnadata canteen";
  const logoUrl = settings?.logoUrl || "";
  const { login } = useAuth();

  // mode: "login" | "signup"
  const [mode, _setMode] = useState(() => {
    return sessionStorage.getItem("temp_delivery_mode") || "login";
  });
  const setMode = (val) => {
    _setMode(val);
    sessionStorage.setItem("temp_delivery_mode", val);
  };

  const [step, _setStep] = useState(() => {
    return sessionStorage.getItem("temp_delivery_step") || "form";
  });
  const setStep = (val) => {
    _setStep(val);
    sessionStorage.setItem("temp_delivery_step", val);
  };

  // Login state
  const [loginPhone, setLoginPhone] = useState(() => {
    return sessionStorage.getItem("temp_delivery_login_phone") || "";
  });

  // Signup state
  const [signupStep, _setSignupStep] = useState(() => {
    return Number(sessionStorage.getItem("temp_delivery_signup_step")) || 1;
  });
  const setSignupStep = (val) => {
    _setSignupStep(val);
    sessionStorage.setItem("temp_delivery_signup_step", val);
  };
  const [signupName, _setSignupName] = useState(() => sessionStorage.getItem("temp_delivery_signup_name") || "");
  const setSignupName = (val) => {
    _setSignupName(val);
    sessionStorage.setItem("temp_delivery_signup_name", val);
  };
  const [signupPhone, setSignupPhone] = useState(() => {
    return sessionStorage.getItem("temp_delivery_signup_phone") || "";
  });
  const [signupEmail, _setSignupEmail] = useState(() => sessionStorage.getItem("temp_delivery_signup_email") || "");
  const setSignupEmail = (val) => {
    _setSignupEmail(val);
    sessionStorage.setItem("temp_delivery_signup_email", val);
  };
  const [signupAddress, _setSignupAddress] = useState(() => sessionStorage.getItem("temp_delivery_signup_address") || "");
  const setSignupAddress = (val) => {
    _setSignupAddress(val);
    sessionStorage.setItem("temp_delivery_signup_address", val);
  };
  const [signupVehicle, _setSignupVehicle] = useState(() => sessionStorage.getItem("temp_delivery_signup_vehicle") || "bike");
  const setSignupVehicle = (val) => {
    _setSignupVehicle(val);
    sessionStorage.setItem("temp_delivery_signup_vehicle", val);
  };
  const [signupVehicleNumber, _setSignupVehicleNumber] = useState(() => sessionStorage.getItem("temp_delivery_signup_vehicle_number") || "");
  const setSignupVehicleNumber = (val) => {
    _setSignupVehicleNumber(val);
    sessionStorage.setItem("temp_delivery_signup_vehicle_number", val);
  };
  const [signupDLNumber, _setSignupDLNumber] = useState(() => sessionStorage.getItem("temp_delivery_signup_dl_number") || "");
  const setSignupDLNumber = (val) => {
    _setSignupDLNumber(val);
    sessionStorage.setItem("temp_delivery_signup_dl_number", val);
  };
  const [signupPanNumber, _setSignupPanNumber] = useState(() => sessionStorage.getItem("temp_delivery_signup_pan_number") || "");
  const setSignupPanNumber = (val) => {
    _setSignupPanNumber(val);
    sessionStorage.setItem("temp_delivery_signup_pan_number", val);
  };
  const [signupAadharNumber, _setSignupAadharNumber] = useState(() => sessionStorage.getItem("temp_delivery_signup_aadhar_number") || "");
  const setSignupAadharNumber = (val) => {
    _setSignupAadharNumber(val);
    sessionStorage.setItem("temp_delivery_signup_aadhar_number", val);
  };
  const [signupAccountNumber, _setSignupAccountNumber] = useState(() => sessionStorage.getItem("temp_delivery_signup_account_number") || "");
  const setSignupAccountNumber = (val) => {
    _setSignupAccountNumber(val);
    sessionStorage.setItem("temp_delivery_signup_account_number", val);
  };
  const [signupIfsc, _setSignupIfsc] = useState(() => sessionStorage.getItem("temp_delivery_signup_ifsc") || "");
  const setSignupIfsc = (val) => {
    _setSignupIfsc(val);
    sessionStorage.setItem("temp_delivery_signup_ifsc", val);
  };
  const [signupAccountHolder, _setSignupAccountHolder] = useState(() => sessionStorage.getItem("temp_delivery_signup_account_holder") || "");
  const setSignupAccountHolder = (val) => {
    _setSignupAccountHolder(val);
    sessionStorage.setItem("temp_delivery_signup_account_holder", val);
  };
  const [signupEmergencyContactName, _setSignupEmergencyContactName] = useState(() => sessionStorage.getItem("temp_delivery_signup_emergency_contact_name") || "");
  const setSignupEmergencyContactName = (val) => {
    _setSignupEmergencyContactName(val);
    sessionStorage.setItem("temp_delivery_signup_emergency_contact_name", val);
  };
  const [signupEmergencyContactRelation, _setSignupEmergencyContactRelation] = useState(() => sessionStorage.getItem("temp_delivery_signup_emergency_contact_relation") || "");
  const setSignupEmergencyContactRelation = (val) => {
    _setSignupEmergencyContactRelation(val);
    sessionStorage.setItem("temp_delivery_signup_emergency_contact_relation", val);
  };
  const [signupEmergencyContactPhone, _setSignupEmergencyContactPhone] = useState(() => sessionStorage.getItem("temp_delivery_signup_emergency_contact_phone") || "");
  const setSignupEmergencyContactPhone = (val) => {
    _setSignupEmergencyContactPhone(val);
    sessionStorage.setItem("temp_delivery_signup_emergency_contact_phone", val);
  };
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");

  // Document states
  const [aadharFile, setAadharFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [dlFile, setDlFile] = useState(null);
  const [vehicleRegistrationFile, setVehicleRegistrationFile] = useState(null);

  // Upload Source Choice Modal State ({ docId, title })
  const [uploadChoiceModal, setUploadChoiceModal] = useState(null);


  // OTP state
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);

  // OCR States
  const [isScanning, setIsScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [dlVerified, setDlVerified] = useState(null);
  const [panVerified, setPanVerified] = useState(null);
  const [aadharVerified, setAadharVerified] = useState(null);
  const [vehicleRegistrationVerified, setVehicleRegistrationVerified] = useState(null);
  const [signupVehicleRegistrationNumber, _setSignupVehicleRegistrationNumber] = useState(() => sessionStorage.getItem("temp_delivery_signup_vehicle_registration_number") || "");
  const setSignupVehicleRegistrationNumber = (val) => {
    _setSignupVehicleRegistrationNumber(val);
    sessionStorage.setItem("temp_delivery_signup_vehicle_registration_number", val);
  };
  const [emailError, setEmailError] = useState("");
  const [vehicleRegistrationError, setVehicleRegistrationError] = useState("");

  useEffect(() => {
    let interval;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const performOCR = async (file, type) => {
    setIsScanning(true);
    setOcrProgress(0);

    // Reset specific verification state
    if (type === "dl") setDlVerified(null);
    if (type === "pan") setPanVerified(null);
    if (type === "aadhar") setAadharVerified(null);
    if (type === "vehicleRegistration") setVehicleRegistrationVerified(null);

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const rawText = result.data.text.toLowerCase();
      const cleanText = rawText.replace(/[^a-z0-9]/g, "");

      // Handle common OCR character substitutions for more robust matching
      // e.g., '0' read as 'o', '5' as 's', '1' as 'i' or 'l'
      const normalize = (str) => str.replace(/o/g, "0").replace(/s/g, "5").replace(/[il]/g, "1");
      const normalizedCleanText = normalize(cleanText);

      console.log(`OCR Raw [${type}]:`, rawText);
      console.log(`OCR Cleaned [${type}]:`, cleanText);

      let isMatch = false;
      let targetNumber = "";

      if (type === "dl") {
        targetNumber = signupDLNumber.toLowerCase().replace(/[^a-z0-9]/g, "");
        const normalizedTarget = normalize(targetNumber);

        // Match either exact cleaned text or normalized text (handles 0/O, 5/S etc)
        isMatch = (targetNumber && cleanText.includes(targetNumber)) ||
          (normalizedTarget && normalizedCleanText.includes(normalizedTarget));

        const dlKeywords = ["driving", "licence", "license", "india", "union", "government", "transport", "validity", "form", "rj"];
        const hasDlKeywords = dlKeywords.some(k => rawText.includes(k));

        if (isMatch) {
          setDlVerified(true);
          setDlFile(file);
          toast.success("Driving License Verified!");
        } else {
          setDlVerified(false);
          setDlFile(null);
          toast.error("DL Number mismatch. Make sure you typed the exact number from the photo.");
        }
      } else if (type === "pan") {
        targetNumber = signupPanNumber.toLowerCase().replace(/[^a-z0-9]/g, "");
        const normalizedTarget = normalize(targetNumber);

        const panKeywords = ["permanent", "account", "income", "tax", "department", "india", "signature", "card", "govt"];
        const hasPanKeywords = panKeywords.some(k => rawText.includes(k));

        isMatch = (targetNumber && cleanText.includes(targetNumber)) ||
          (normalizedTarget && normalizedCleanText.includes(normalizedTarget));

        if (isMatch || (hasPanKeywords && isMatch)) {
          setPanVerified(true);
          setPanFile(file);
          toast.success("PAN Card Verified!");
        } else {
          setPanVerified(false);
          setPanFile(null);
          toast.error("PAN mismatch. Photo must be clear and show the PAN number.");
        }
      } else if (type === "aadhar") {
        targetNumber = signupAadharNumber.toLowerCase().replace(/[^a-z0-9]/g, "");
        const normalizedTarget = normalize(targetNumber);

        const aadharKeywords = ["government", "india", "male", "female", "unique", "identification", "authority", "enrollment", "birth", "dob", "address", "आधार", "भारत"];
        const hasAadharKeywords = aadharKeywords.some(k => rawText.includes(k));

        isMatch = (targetNumber && cleanText.includes(targetNumber)) ||
          (normalizedTarget && normalizedCleanText.includes(normalizedTarget));

        if (isMatch || (hasAadharKeywords && isMatch)) {
          setAadharVerified(true);
          setAadharFile(file);
          toast.success("Aadhar Card Verified!");
        } else {
          setAadharVerified(false);
          setAadharFile(null);
          toast.error("Aadhar mismatch. 12-digit number should be clearly visible.");
        }
      } else if (type === "vehicleRegistration") {
        targetNumber = signupVehicleRegistrationNumber.toLowerCase().replace(/[^a-z0-9]/g, "");
        const normalizedTarget = normalize(targetNumber);

        const rcKeywords = ["registration", "certificate", "owner", "vehicle", "chassis", "engine", "maker", "model", "rto", "transport", "government", "ind"];
        const hasRcKeywords = rcKeywords.some(k => rawText.includes(k));

        isMatch = (targetNumber && cleanText.includes(targetNumber)) ||
          (normalizedTarget && normalizedCleanText.includes(normalizedTarget));

        if (isMatch || (hasRcKeywords && isMatch)) {
          setVehicleRegistrationVerified(true);
          setVehicleRegistrationFile(file);
          toast.success("Vehicle Registration Document (RC) Verified!");
        } else {
          setVehicleRegistrationVerified(false);
          setVehicleRegistrationFile(null);
          toast.error("RC Number mismatch. Photo must be clear and show the registration number.");
        }
      }
    } catch (error) {
      console.error("OCR Error:", error);
      toast.error("Failed to scan document. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleDLUpload = (file) => {
    setDlFile(file || null);
  };

  const handlePanUpload = (file) => {
    setPanFile(file || null);
  };

  const handleAadharUpload = (file) => {
    setAadharFile(file || null);
  };

  const handleVehicleRegistrationUpload = (file) => {
    setVehicleRegistrationFile(file || null);
  };

  const handleSendOtp = async () => {
    try {
      setLoading(true);
      if (mode === "login") {
        if (!loginPhone || loginPhone.length < 10) {
          toast.error("Please enter a valid 10-digit phone number");
          return;
        }
        const res = await deliveryApi.sendLoginOtp({ phone: loginPhone });
        toast.success(res.data?.message || "OTP sent!");
      } else {
        if (!signupName.trim()) { toast.error("Please enter your name"); return; }
        if (!signupPhone || signupPhone.length < 10) { toast.error("Please enter a valid 10-digit phone number"); return; }
        if (!profileImageFile) { toast.error("Please upload your profile photo"); return; }
        if (!signupEmergencyContactName.trim()) { toast.error("Please enter emergency contact name"); return; }
        if (!signupEmergencyContactRelation.trim()) { toast.error("Please enter emergency contact relation"); return; }
        if (!signupEmergencyContactPhone || signupEmergencyContactPhone.length !== 10) {
          toast.error("Please enter a valid 10-digit emergency contact phone number");
          return;
        }

        const formData = new FormData();
        formData.append("name", signupName.trim());
        formData.append("phone", signupPhone);
        formData.append("vehicleType", signupVehicle);
        formData.append("email", signupEmail);
        formData.append("address", signupAddress);
        formData.append("vehicleNumber", signupVehicleNumber || signupVehicleRegistrationNumber);
        formData.append("drivingLicenseNumber", signupDLNumber);
        formData.append("vehicleRegistrationNumber", signupVehicleRegistrationNumber);
        formData.append("accountHolder", signupAccountHolder);
        formData.append("accountNumber", signupAccountNumber);
        formData.append("ifsc", signupIfsc);
        formData.append("emergencyContactName", signupEmergencyContactName.trim());
        formData.append("emergencyContactRelation", signupEmergencyContactRelation.trim());
        formData.append("emergencyContactPhone", signupEmergencyContactPhone);

        if (profileImageFile) formData.append("profileImage", profileImageFile);
        if (aadharFile) formData.append("aadhar", aadharFile);
        if (panFile) formData.append("pan", panFile);
        if (dlFile) formData.append("dl", dlFile);
        if (vehicleRegistrationFile) formData.append("vehicleRegistration", vehicleRegistrationFile);

        const res = await deliveryApi.sendSignupOtp(formData);
        toast.success(res.data?.message || "OTP sent!");
      }
      setOtp(["", "", "", ""]);
      setTimer(30);
      setStep("otp");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.some((d) => d === "") || !agreed) return;
    setLoading(true);
    try {
      const phone = mode === "login" ? loginPhone : signupPhone;
      const otpString = otp.join("");
      const response = await deliveryApi.verifyOtp({ phone, otp: otpString });
      const { token, delivery } = response.data.result;

      login({ ...delivery, token, role: "delivery" });
      clearDeliveryAuthSession();

      if (!delivery?.isVerified) {
        toast.info("Account submitted! Pending admin review.");
        navigate("/delivery/pending-approval");
      } else {
        toast.success("Welcome! Redirecting to dashboard...");
        navigate("/delivery/dashboard");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const val = value.slice(-1);
    if (val && isNaN(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    if (val && index < 3) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newOtp = [...otp];
      if (!otp[index] && index > 0) {
        newOtp[index - 1] = "";
        setOtp(newOtp);
        document.getElementById(`otp-${index - 1}`)?.focus();
      } else {
        newOtp[index] = "";
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasteData.length === 4) {
      const newOtp = pasteData.split("");
      setOtp(newOtp);
      document.getElementById("otp-3")?.focus();
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setStep("form");
    setOtp(["", "", "", ""]);
  };

  const slideVariants = {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -30, transition: { duration: 0.2 } },
  };

  return (
    <div className="min-h-screen bg-[#F0F4FF] flex flex-col items-center justify-center p-5 font-['Outfit',_sans-serif]">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-brand-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Card */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_24px_60px_rgba(99,102,241,0.1)] border border-brand-50 overflow-hidden">

          {/* Header with Lottie */}
          <div className="bg-gradient-to-br from-brand-50 to-purple-50 p-8 flex flex-col items-center relative">
            <div className="z-10 mb-2">
              <div className="w-16 h-16 rounded-full bg-white border border-brand-100 shadow-sm flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`${appName} logo`}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <ShieldCheck className="w-6 h-6 text-brand-600" />
                )}
              </div>
            </div>
            <div className="w-40 h-40">
              <Lottie animationData={deliveryRiding} loop />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${mode}-${step}-title`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="text-center mt-3"
              >
                <h1 className="text-2xl font-black text-gray-900">
                  {step === "otp"
                    ? "Verify OTP"
                    : mode === "login"
                      ? "Partner Login"
                      : "Partner Registration"}
                </h1>
                <p className="text-gray-500 text-sm mt-1 max-w-[240px] mx-auto">
                  {step === "otp"
                    ? `Enter the 4-digit code sent to +91 ${mode === "login" ? loginPhone : signupPhone}`
                    : mode === "login"
                      ? "Login with your registered phone number"
                      : `Step ${signupStep} of 4: ${signupStep === 1 ? "Personal Info" : signupStep === 2 ? "Vehicle Info" : signupStep === 3 ? "Bank Info" : "Documents"}`}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Tab Switch */}
          {step === "form" && (
            <div className="flex mx-6 mt-6 bg-gray-100 rounded-2xl p-1">
              {["login", "signup"].map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-all duration-300 ${mode === m
                    ? "bg-white text-brand-600 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                    }`}
                >
                  {m === "login" ? "Login" : "Join Now"}
                </button>
              ))}
            </div>
          )}

          {/* Form Body */}
          <div className="p-6 pt-4">
            <AnimatePresence mode="wait">
              {step === "form" && (
                <motion.div
                  key={`form-${mode}`}
                  variants={slideVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-4"
                >
                  {/* ────────── SIGNUP MODE ────────── */}
                  {mode === "signup" && (
                    <div className="space-y-4">
                      {/* Step 1: Personal Information */}
                      {signupStep === 1 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          {/* Profile Photo Capture */}
                          <div className="flex flex-col items-center justify-center py-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 self-start ml-1">Profile Photo</label>
                            <div className="relative group">
                              <div
                                onClick={() => setUploadChoiceModal({ docId: "profile", title: "Profile Photo" })}
                                className="w-24 h-24 rounded-3xl bg-brand-50 border-2 border-dashed border-brand-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-400 cursor-pointer"
                              >
                                {profileImagePreview ? (
                                  <img src={profileImagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-10 h-10 text-brand-300" />
                                )}
                              </div>
                              {/* Hidden Camera Input */}
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                id="profile-camera"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    setProfileImageFile(file);
                                    setProfileImagePreview(URL.createObjectURL(file));
                                  }
                                  e.target.value = "";
                                }}
                              />
                              {/* Hidden Gallery Input */}
                              <input
                                type="file"
                                accept="image/png, image/jpeg, image/jpg, image/webp"
                                id="profile-gallery"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    setProfileImageFile(file);
                                    setProfileImagePreview(URL.createObjectURL(file));
                                  }
                                  e.target.value = "";
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setUploadChoiceModal({ docId: "profile", title: "Profile Photo" })}
                                className="absolute -bottom-2 -right-2 p-2.5 bg-black text-primary-foreground rounded-2xl shadow-lg shadow-brand-200 cursor-pointer hover:bg-brand-700 hover:scale-110 active:scale-95 transition-all"
                              >
                                <Camera className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold mt-3">Upload a clear photo of your face</p>
                          </div>

                           <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                            <div className="relative">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                              <input
                                type="text"
                                value={signupName}
                                onChange={(e) => {
                                  const cleaned = e.target.value.replace(/[^A-Za-z\s]/g, "").replace(/\s+/g, " ");
                                  if (cleaned === " ") return;
                                  setSignupName(cleaned.replace(/\b\w/g, (c) => c.toUpperCase()));
                                }}
                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 capitalize focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                                placeholder="Enter your full name"
                              />
                            </div>
                          </div>
 
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                            <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                              <span className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm border-r border-gray-200 pr-2.5">+91</span>
                              <input
                                type="tel"
                                value={signupPhone}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                  setSignupPhone(val);
                                  sessionStorage.setItem("temp_delivery_signup_phone", val);
                                }}
                                maxLength={10}
                                className="w-full pl-24 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                                placeholder="00000 00000"
                              />
                            </div>
                          </div>
 
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                              <input
                                type="email"
                                value={signupEmail}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSignupEmail(val);
                                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                  if (val && !emailRegex.test(val)) {
                                    setEmailError("Please enter a valid email address");
                                  } else {
                                    setEmailError("");
                                  }
                                }}
                                className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all ${
                                  emailError ? "border-rose-400 focus:border-rose-400" : "border-gray-100"
                                }`}
                                placeholder="example@gmail.com"
                              />
                            </div>
                            {emailError && (
                              <p className="text-xs text-rose-500 font-bold mt-1.5 ml-1">
                                {emailError}
                              </p>
                            )}
                          </div>
 
                            <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Permanent Address</label>
                            <div className="relative">
                              <MapPin className="absolute left-4 top-4 text-gray-300 w-4 h-4" />
                              <textarea
                                value={signupAddress}
                                onChange={(e) => setSignupAddress(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all resize-none h-24"
                                placeholder="Complete building address..."
                              />
                            </div>
                          </div>

                          <div className="border-t border-gray-100 my-4 pt-4 space-y-4">
                            <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Emergency Contact (Mandatory)</h4>
                            
                            <div className="space-y-1.5">
                              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Contact Name</label>
                              <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                                <input
                                  type="text"
                                  value={signupEmergencyContactName}
                                  onChange={(e) => setSignupEmergencyContactName(e.target.value.replace(/[^A-Za-z\s]/g, ""))}
                                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                                  placeholder="Emergency contact person name"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Relation</label>
                                <input
                                  type="text"
                                  value={signupEmergencyContactRelation}
                                  onChange={(e) => setSignupEmergencyContactRelation(e.target.value.replace(/[^A-Za-z\s]/g, ""))}
                                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                                  placeholder="e.g. Wife, Brother"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                                <div className="relative">
                                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                                  <input
                                    type="tel"
                                    value={signupEmergencyContactPhone}
                                    onChange={(e) => setSignupEmergencyContactPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                    maxLength={10}
                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                                    placeholder="10-digit number"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
 
                          <button
                            onClick={() => {
                              const trimmedName = signupName.trim();
                              const trimmedAddress = signupAddress.trim();
                              if (!trimmedName || !signupPhone || !signupEmail || !trimmedAddress || !profileImageFile || !signupEmergencyContactName.trim() || !signupEmergencyContactRelation.trim() || !signupEmergencyContactPhone) {
                                toast.error("Please fill all personal information fields, upload photo, and complete emergency contact details");
                                return;
                              }
                              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                              if (signupEmail && !emailRegex.test(signupEmail)) {
                                setEmailError("Please enter a valid email address");
                                toast.error("Please enter a valid email address");
                                return;
                              }
                              if (trimmedName.length < 2) {
                                toast.error("Full name must be at least 2 characters long");
                                return;
                              }
                              if (!/[a-zA-Z0-9]/.test(trimmedAddress)) {
                                toast.error("Please enter a valid permanent address containing alphanumeric characters");
                                return;
                              }
                              if (trimmedAddress.length < 5) {
                                toast.error("Permanent address must be at least 5 characters long");
                                return;
                              }
                              if (signupPhone.length !== 10) {
                                toast.error("Please enter a valid 10-digit phone number");
                                return;
                              }
                              if (signupEmergencyContactName.trim().length < 2) {
                                toast.error("Emergency contact name must be at least 2 characters long");
                                return;
                              }
                              if (signupEmergencyContactRelation.trim().length < 2) {
                                toast.error("Relation must be at least 2 characters long");
                                return;
                              }
                              if (signupEmergencyContactPhone.length !== 10) {
                                toast.error("Emergency contact phone number must be exactly 10 digits");
                                return;
                              }
                              setSignupStep(2);
                            }}
                            className="w-full py-4 bg-black  text-primary-foreground rounded-2xl text-sm font-black tracking-widest uppercase shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all flex items-center justify-center gap-2"
                          >
                            Next Step <ArrowRight className="w-4 h-4" />
                          </button>
                        </motion.div>
                      )}

                      {/* Step 2: Vehicle Information */}
                      {signupStep === 2 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Vehicle Type</label>
                            <div className="relative">
                              <Bike className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                              <button
                                type="button"
                                onClick={() => setShowVehicleDropdown(!showVehicleDropdown)}
                                className="w-full pl-11 pr-10 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none text-left"
                              >
                                {VEHICLE_TYPES.find((v) => v.value === signupVehicle)?.label}
                              </button>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <AnimatePresence>
                                {showVehicleDropdown && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="absolute top-full left-0 w-full bg-white border border-gray-100 rounded-2xl shadow-lg mt-2 overflow-hidden z-20"
                                  >
                                    {VEHICLE_TYPES.map((v) => (
                                      <button
                                        key={v.value}
                                        onClick={() => { setSignupVehicle(v.value); setShowVehicleDropdown(false); }}
                                        className="w-full px-4 py-3 text-sm font-bold text-left hover:bg-brand-50 transition-colors"
                                      >
                                        {v.label}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          {signupVehicle === "cycle" ? (
                            <div className="bg-brand-50 border border-brand-100 rounded-2xl p-5 flex flex-col items-center text-center gap-2 my-6">
                              <Bike className="h-8 w-8 text-brand-600 animate-bounce" />
                              <h4 className="text-sm font-black text-brand-900 uppercase tracking-tight">Cycle Selected</h4>
                              <p className="text-xs font-medium text-brand-700 leading-relaxed max-w-xs">
                                No driving license or vehicle registration (RC) is required to register as a cycle-based delivery partner. Click Next to continue.
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Driving License Number</label>
                                <div className="relative">
                                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                                  <input
                                    type="text"
                                    value={signupDLNumber}
                                    onChange={(e) => setSignupDLNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, ""))}
                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                                    placeholder="DL-1420110012345"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Vehicle Registration Number (RC)</label>
                                <div className="relative">
                                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                                  <input
                                    type="text"
                                    value={signupVehicleRegistrationNumber}
                                    onChange={(e) => {
                                      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
                                      setSignupVehicleRegistrationNumber(val);
                                      const vehicleRegex = /^(?:[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$/;
                                      if (val && !vehicleRegex.test(val)) {
                                        setVehicleRegistrationError("Please enter a valid RC Number (e.g. MH12AB1234)");
                                      } else {
                                        setVehicleRegistrationError("");
                                      }
                                    }}
                                    maxLength={11}
                                    className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all ${
                                      vehicleRegistrationError ? "border-rose-400 focus:border-rose-400" : "border-gray-100"
                                    }`}
                                    placeholder="e.g. MH12AB1234"
                                  />
                                </div>
                                {vehicleRegistrationError && (
                                  <p className="text-xs text-rose-500 font-bold mt-1.5 ml-1">
                                    {vehicleRegistrationError}
                                  </p>
                                )}
                              </div>
                            </>
                          )}

                          <div className="flex gap-4 pt-2">
                            <button
                              onClick={() => setSignupStep(1)}
                              className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                            >
                              Back
                            </button>
                            <button
                              onClick={() => {
                                if (signupVehicle !== "cycle") {
                                  if (!signupDLNumber) {
                                    toast.error("Please enter your driving license number");
                                    return;
                                  }
                                  const cleanDL = signupDLNumber.replace(/[^A-Z0-9]/g, "");
                                  const dlRegex = /^[A-Z]{2}[0-9]{11,14}$/;
                                  if (!dlRegex.test(cleanDL)) {
                                    toast.error("Please enter a valid Driving License Number (e.g. DL-1420110012345)");
                                    return;
                                  }
                                  if (!signupVehicleRegistrationNumber) {
                                    setVehicleRegistrationError("Please enter your vehicle registration number (RC)");
                                    toast.error("Please enter your vehicle registration number (RC)");
                                    return;
                                  }
                                  const cleanRC = signupVehicleRegistrationNumber.replace(/[^A-Z0-9]/g, "");
                                  const vehicleRegex = /^(?:[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$/;
                                  if (!vehicleRegex.test(cleanRC)) {
                                    setVehicleRegistrationError("Please enter a valid RC Number (e.g. MH12AB1234)");
                                    toast.error("Please enter a valid RC Number (e.g. MH12AB1234)");
                                    return;
                                  }
                                  setVehicleRegistrationError("");
                                }
                                setSignupStep(3);
                              }}
                              className="flex-[2] py-4 bg-black  text-primary-foreground rounded-2xl text-sm font-black tracking-widest uppercase shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all flex items-center justify-center gap-2"
                            >
                              Next Step <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 3: Bank Information */}
                      {signupStep === 3 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Aadhar Number</label>
                            <input
                              type="text"
                              value={signupAadharNumber}
                              onChange={(e) => setSignupAadharNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all font-mono"
                              placeholder="0000 0000 0000"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">PAN Card Number</label>
                            <input
                              type="text"
                              value={signupPanNumber}
                              onChange={(e) => setSignupPanNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
                              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all font-mono"
                              placeholder="ABCDE1234F"
                            />
                            {signupPanNumber.length > 0 && (signupPanNumber.length < 10 || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(signupPanNumber)) && (
                              <p className="text-[10px] font-bold text-red-500 mt-1 pl-1">
                                Invalid PAN format. Must be 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)
                              </p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Account Holder Name</label>
                            <input
                              type="text"
                              value={signupAccountHolder}
                              onChange={(e) => {
                                const cleaned = e.target.value.toUpperCase().replace(/[^A-Z\s]/g, "").replace(/\s+/g, " ");
                                if (cleaned === " ") return;
                                setSignupAccountHolder(cleaned);
                              }}
                              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                              placeholder="AS PER BANK RECORDS"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Account Number</label>
                            <input
                              type="text"
                              value={signupAccountNumber}
                              onChange={(e) => setSignupAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 18))}
                              className={`w-full px-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all font-mono ${
                                signupAccountNumber.length > 0 && /^0+$/.test(signupAccountNumber) ? "border-red-400 focus:border-red-400" : "border-gray-100"
                              }`}
                              placeholder="000000000000"
                            />
                            {signupAccountNumber.length > 0 && /^0+$/.test(signupAccountNumber) && (
                              <p className="text-[10px] font-bold text-red-500 mt-1 pl-1">
                                Account number cannot consist of only zeros
                              </p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">IFSC Code</label>
                            <input
                              type="text"
                              value={signupIfsc}
                              onChange={(e) => setSignupIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11))}
                              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all font-mono"
                              placeholder="HDFC0001234"
                            />
                            {signupIfsc.length > 0 && (signupIfsc.length < 11 || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(signupIfsc)) && (
                              <p className="text-[10px] font-bold text-red-500 mt-1 pl-1">
                                Invalid IFSC format. E.g. HDFC0001234 (4 letters, 0, 6 letters/digits)
                              </p>
                            )}
                          </div>
 
                          <div className="flex gap-4 pt-2">
                            <button
                              onClick={() => setSignupStep(2)}
                              className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                            >
                              Back
                            </button>
                            <button
                              onClick={() => {
                                const trimmedHolder = signupAccountHolder.trim();
                                if (!signupAadharNumber || !signupPanNumber || !trimmedHolder || !signupAccountNumber || !signupIfsc) {
                                  toast.error("Please fill all bank and identification fields");
                                  return;
                                }
                                if (signupAadharNumber.length !== 12) {
                                  toast.error("Aadhar number must be 12 digits");
                                  return;
                                }
                                const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
                                if (!panRegex.test(signupPanNumber)) {
                                  toast.error("Please enter a valid 10-character PAN Number (e.g. ABCDE1234F)");
                                  return;
                                }
                                if (!trimmedHolder) {
                                  toast.error("Account holder name cannot be empty or contain only spaces");
                                  return;
                                }
                                if (signupAccountNumber.length < 9 || signupAccountNumber.length > 18) {
                                  toast.error("Account number must be between 9 and 18 digits long");
                                  return;
                                }
                                if (/^0+$/.test(signupAccountNumber)) {
                                  toast.error("Account number cannot consist of only zeros");
                                  return;
                                }
                                const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
                                if (!ifscRegex.test(signupIfsc)) {
                                  toast.error("Please enter a valid 11-character IFSC Code (e.g. HDFC0001234)");
                                  return;
                                }
                                setSignupStep(4);
                              }}
                              className="flex-[2] py-4 bg-black  text-primary-foreground rounded-2xl text-sm font-black tracking-widest uppercase shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all flex items-center justify-center gap-2"
                            >
                              Next Step <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 4: Documents Upload */}
                      {signupStep === 4 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          <div className="space-y-3">
                            {[
                              { label: "Aadhar Card (Front/Back)", state: aadharFile, setter: setAadharFile, id: "aadhar" },
                              { label: "PAN Card", state: panFile, setter: setPanFile, id: "pan" },
                              ...(signupVehicle !== "cycle" ? [
                                { label: "Driving License", state: dlFile, setter: setDlFile, id: "dl" },
                                { label: "Vehicle Registration (RC)", state: vehicleRegistrationFile, setter: setVehicleRegistrationFile, id: "vehicleRegistration" }
                              ] : [])
                            ].map((doc) => (
                              <div key={doc.id} className="relative">
                                {/* Hidden Camera Input */}
                                <input
                                  type="file"
                                  id={`${doc.id}-camera`}
                                  className="hidden"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      if (doc.id === "dl") handleDLUpload(file);
                                      else if (doc.id === "pan") handlePanUpload(file);
                                      else if (doc.id === "aadhar") handleAadharUpload(file);
                                      else if (doc.id === "vehicleRegistration") handleVehicleRegistrationUpload(file);
                                      else doc.setter(file);
                                    }
                                    e.target.value = "";
                                  }}
                                />
                                {/* Hidden Gallery Input */}
                                <input
                                  type="file"
                                  id={`${doc.id}-gallery`}
                                  className="hidden"
                                  accept="image/png, image/jpeg, image/jpg, image/webp"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      if (doc.id === "dl") handleDLUpload(file);
                                      else if (doc.id === "pan") handlePanUpload(file);
                                      else if (doc.id === "aadhar") handleAadharUpload(file);
                                      else if (doc.id === "vehicleRegistration") handleVehicleRegistrationUpload(file);
                                      else doc.setter(file);
                                    }
                                    e.target.value = "";
                                  }}
                                />
                                <div
                                  onClick={() => setUploadChoiceModal({ docId: doc.id, title: doc.label })}
                                  className={`flex items-center justify-between p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${doc.state
                                    ? "border-brand-200 bg-brand-50/50"
                                    : "border-gray-100 bg-gray-50 hover:border-brand-200 hover:bg-brand-50/30"
                                    }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${doc.state ? "bg-brand-100 text-brand-600" : "bg-white text-gray-400 shadow-sm"}`}>
                                      {doc.state ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                                    </div>
                                    <div className="text-left">
                                      <p className={`text-xs font-black uppercase tracking-tight ${doc.state ? "text-brand-700" : "text-gray-500"}`}>
                                        {doc.label}
                                      </p>
                                      <p className="text-[10px] text-gray-400 font-bold truncate max-w-[180px]">
                                        {doc.state ? doc.state.name : "Tap to upload document"}
                                      </p>
                                    </div>
                                  </div>
                                  {doc.state && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        doc.setter(null);
                                      }}
                                      className="p-1.5 hover:bg-brand-100 rounded-lg text-brand-600 transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                            <p className="text-[10px] text-gray-400 italic px-1 flex items-center gap-1.5">
                              <ShieldCheck className="w-3 h-3 text-brand-300" />
                              Documents will be verified by our team after submission.
                            </p>
                          </div>
 
                          <div className="flex gap-3">
                            <button
                              onClick={() => setSignupStep(3)}
                              className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                            >
                              Back
                            </button>
                            <button
                              onClick={handleSendOtp}
                              disabled={
                                loading || 
                                !aadharFile || 
                                !panFile || 
                                (signupVehicle !== "cycle" && (!dlFile || !vehicleRegistrationFile))
                              }
                              className="flex-[2] py-4 bg-black  text-primary-foreground rounded-2xl text-sm font-black tracking-widest uppercase shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <>
                                  Register <ArrowRight className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}

                      <p className="text-center text-xs text-gray-400 font-semibold pt-1">
                        By joining, you agree to our{" "}
                        <span
                          onClick={() => navigate('/delivery/terms')}
                          className="text-brand-500 font-bold cursor-pointer hover:underline"
                        >
                          Terms
                        </span>{" "}
                        &amp;{" "}
                        <span
                          onClick={() => navigate('/delivery/privacy')}
                          className="text-brand-500 font-bold cursor-pointer hover:underline"
                        >
                          Privacy Policy
                        </span>
                      </p>
                    </div>
                  )}

                  {/* ────────── LOGIN MODE ────────── */}
                  {mode === "login" && (
                    <div className="space-y-4">
                      {/* Phone */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                          <span className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm border-r border-gray-200 pr-2.5">
                            +91
                          </span>
                          <input
                            type="tel"
                            value={loginPhone}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                              setLoginPhone(val);
                              sessionStorage.setItem("temp_delivery_login_phone", val);
                            }}
                            maxLength={10}
                            className="w-full pl-24 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all placeholder:text-gray-300"
                            placeholder="00000 00000"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleSendOtp}
                        disabled={loading}
                        className="w-full py-4 bg-black  text-primary-foreground rounded-2xl text-sm font-black tracking-widest uppercase shadow-lg shadow-brand-200 hover:bg-brand-700 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>Login Now <ArrowRight className="w-4 h-4" /></>
                        )}
                      </button>

                      <p className="text-center text-xs text-gray-400 font-semibold pt-1">
                        By logging in, you agree to our{" "}
                        <span
                          onClick={() => navigate('/delivery/terms')}
                          className="text-brand-500 font-bold cursor-pointer hover:underline"
                        >
                          Terms
                        </span>{" "}
                        &amp;{" "}
                        <span
                          onClick={() => navigate('/delivery/privacy')}
                          className="text-brand-500 font-bold cursor-pointer hover:underline"
                        >
                          Privacy Policy
                        </span>
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ─── OTP STEP ─── */}
              {step === "otp" && (
                <motion.div
                  key="otp"
                  variants={slideVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-5"
                >
                  {/* OTP Boxes */}
                  <div className="space-y-2 text-center">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                      Enter Security Code
                    </label>
                    <div className="flex justify-center gap-3 pt-1">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          id={`otp-${index}`}
                          type="tel"
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          onPaste={handlePaste}
                          className="w-14 h-14 text-center text-2xl font-black border-2 border-gray-100 rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none transition-all bg-gray-50 text-gray-900"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Timer / Resend */}
                  <div className="text-center">
                    {timer > 0 ? (
                      <p className="text-gray-400 text-sm font-medium">
                        Resend code in <span className="text-brand-600 font-bold">{timer}s</span>
                      </p>
                    ) : (
                      <button
                        onClick={handleSendOtp}
                        className="text-brand-600 font-black text-sm uppercase tracking-wide hover:underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>

                  {/* Terms checkbox */}
                  <div className="flex items-start gap-3 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <input
                      id="terms"
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-brand-600 cursor-pointer"
                    />
                    <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                      I confirm my phone number is correct and I agree to the{" "}
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate('/delivery/terms');
                        }}
                        className="text-brand-600 font-bold hover:underline cursor-pointer"
                      >
                        Terms of Service
                      </span> &amp;{" "}
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate('/delivery/privacy');
                        }}
                        className="text-brand-600 font-bold hover:underline cursor-pointer"
                      >
                        Privacy Policy
                      </span>.
                    </label>
                  </div>

                  {/* Verify Button */}
                  <button
                    onClick={handleVerifyOtp}
                    disabled={!agreed || otp.some((d) => !d) || loading}
                    className="w-full py-4 bg-black  text-primary-foreground rounded-2xl text-sm font-black tracking-widest uppercase shadow-lg shadow-brand-200 hover:bg-brand-700 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Verify &amp; Login <CheckCircle className="w-4 h-4" /></>
                    )}
                  </button>

                  {/* Back */}
                  <button
                    onClick={() => { setStep("form"); setOtp(["", "", "", ""]); }}
                    className="w-full flex items-center justify-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm font-bold transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Edit Phone Number
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-3 opacity-40">
          <span className="h-px w-8 bg-gray-400" />
          <ShieldCheck className="text-gray-500 w-4 h-4" />
          <span className="h-px w-8 bg-gray-400" />
        </div>
        <p className="text-center text-[10px] font-black text-slate-500 uppercase tracking-[4px] mt-2">
          {appName} Partner Ecosystem • v1.0
        </p>
      </motion.div>

      {/* Upload Source Choice Modal */}
      <AnimatePresence>
        {uploadChoiceModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-sm">Upload {uploadChoiceModal.title}</h3>
                <button
                  type="button"
                  onClick={() => setUploadChoiceModal(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const targetId = `${uploadChoiceModal.docId}-camera`;
                    setUploadChoiceModal(null);
                    setTimeout(() => {
                      document.getElementById(targetId)?.click();
                    }, 100);
                  }}
                  className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 hover:bg-brand-100/50 transition-all cursor-pointer text-center group"
                >
                  <div className="p-3 bg-brand-500 text-white rounded-xl mb-2 group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-gray-800">Take Photo</span>
                  <span className="text-[10px] text-gray-500">Use Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const targetId = `${uploadChoiceModal.docId}-gallery`;
                    setUploadChoiceModal(null);
                    setTimeout(() => {
                      document.getElementById(targetId)?.click();
                    }, 100);
                  }}
                  className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer text-center group"
                >
                  <div className="p-3 bg-gray-800 text-white rounded-xl mb-2 group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-gray-800">Gallery</span>
                  <span className="text-[10px] text-gray-500">Choose File</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeliveryAuth;
