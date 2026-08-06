import React from "react";
import { Check, Contact2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * CheckoutAddressSection
 *
 * Props:
 *   currentAddress       – the active delivery address object
 *   savedRecipient       – "order for someone else" recipient object or null
 *   savedAddresses       – array of saved addresses from LocationContext
 *   onSelectAddress      – () => void  — opens the address-selection modal
 *   onEditAddress        – () => void  — opens the edit-address modal
 *   onUseCurrentLocation – () => void  — triggers live-location detection
 *
 * Internal state for the "order for someone else" form is kept here because
 * it is purely presentational; the parent only needs the saved result.
 */
const CheckoutAddressSection = React.memo(function CheckoutAddressSection({
  currentAddress,
  savedRecipient,
  savedAddresses,
  onSelectAddress,
  onEditAddress,
  onUseCurrentLocation,
  // Extra props forwarded from CheckoutPage that the section needs
  isFetchingLocation,
  showRecipientForm,
  onToggleRecipientForm,
  recipientData,
  onRecipientDataChange,
  onSaveRecipient,
  onRemoveRecipient,
  displayName,
  displayPhone,
  displayAddress,
}) {
  const [errors, setErrors] = React.useState({});

  React.useEffect(() => {
    if (!showRecipientForm) {
      setErrors({});
    }
  }, [showRecipientForm]);

  const validateForm = () => {
    const newErrors = {};

    // Complete address: required, min 10 characters
    if (!recipientData.completeAddress || !recipientData.completeAddress.trim()) {
      newErrors.completeAddress = "Complete address is required.";
    } else if (recipientData.completeAddress.trim().length < 10) {
      newErrors.completeAddress = "Address must be at least 10 characters long.";
    }

    // Landmark: optional, if provided must be min 3 characters
    if (recipientData.landmark && recipientData.landmark.trim()) {
      if (recipientData.landmark.trim().length < 3) {
        newErrors.landmark = "Landmark must be at least 3 characters.";
      }
    }

    // Pincode: required, exactly 6 digits
    if (!recipientData.pincode || !recipientData.pincode.trim()) {
      newErrors.pincode = "Pin code is required.";
    } else {
      const pinRegex = /^\d{6}$/;
      if (!pinRegex.test(recipientData.pincode.trim())) {
        newErrors.pincode = "Pin code must be exactly 6 digits.";
      }
    }

    // Name: required, only letters/spaces, min 2 characters
    if (!recipientData.name || !recipientData.name.trim()) {
      newErrors.name = "Receiver's name is required.";
    } else if (recipientData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters.";
    } else if (!/^[A-Za-z\s]+$/.test(recipientData.name.trim())) {
      newErrors.name = "Name must contain only alphabets and spaces.";
    }

    // Phone: required, exactly 10 digits
    if (!recipientData.phone || !recipientData.phone.trim()) {
      newErrors.phone = "Receiver's phone number is required.";
    } else {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(recipientData.phone.trim())) {
        newErrors.phone = "Enter a valid 10-digit phone number.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field, value) => {
    let sanitizedValue = value;
    if (field === "name") {
      sanitizedValue = value.replace(/\d/g, "");
    } else if (field === "pincode") {
      sanitizedValue = value.replace(/\D/g, "").slice(0, 6);
    } else if (field === "phone") {
      sanitizedValue = value.replace(/\D/g, "").slice(0, 10);
    }
    onRecipientDataChange({ ...recipientData, [field]: sanitizedValue });
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSaveRecipient();
    }
  };

  return (
    <motion.div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      {/* "Order for someone else" toggle */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-slate-500 font-medium">
          Ordering for someone else?
        </span>
        <button
          onClick={onToggleRecipientForm}
          className="text-primary text-xs font-bold hover:underline">
          {showRecipientForm
            ? "Close"
            : savedRecipient
              ? "Change details"
              : "Add details"}
        </button>
      </div>

      {/* Saved recipient card */}
      {savedRecipient && !showRecipientForm && (
        <div className="mb-4 p-4 bg-brand-50 border border-brand-100 rounded-2xl flex items-start justify-between">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-primary flex-shrink-0">
              <Contact2 size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {savedRecipient.name}
              </p>
              <p className="text-xs text-primary font-bold mb-1">
                {savedRecipient.phone}
              </p>
              <p className="text-xs text-slate-500 leading-tight">
                {savedRecipient.completeAddress}
                {savedRecipient.landmark && `, ${savedRecipient.landmark}`}
                {savedRecipient.pincode && ` - ${savedRecipient.pincode}`}
              </p>
            </div>
          </div>
          <button
            onClick={onRemoveRecipient}
            className="text-red-500 text-xs font-bold hover:underline">
            Remove
          </button>
        </div>
      )}

      {/* Recipient form */}
      <AnimatePresence>
        {showRecipientForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden mb-4">
            <div className="bg-[#f8f9fb] rounded-2xl p-4 border border-slate-100 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3">
                  Enter delivery address details
                </h4>
                <div className="space-y-3">
                  <div>
                    <Input
                      placeholder="Enter complete address*"
                      value={recipientData.completeAddress}
                      onChange={(e) => handleFieldChange("completeAddress", e.target.value)}
                      className={`h-12 rounded-xl border-slate-200 focus:ring-primary focus:border-primary text-sm ${
                        errors.completeAddress ? "border-red-500 focus:ring-red-500 focus:border-red-500" : ""
                      }`}
                    />
                    {errors.completeAddress && (
                      <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.completeAddress}</p>
                    )}
                  </div>
                  <div>
                    <Input
                      placeholder="Find landmark (optional)"
                      value={recipientData.landmark}
                      onChange={(e) => handleFieldChange("landmark", e.target.value)}
                      className={`h-12 rounded-xl border-slate-200 focus:ring-primary focus:border-primary text-sm ${
                        errors.landmark ? "border-red-500 focus:ring-red-500 focus:border-red-500" : ""
                      }`}
                    />
                    {errors.landmark && (
                      <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.landmark}</p>
                    )}
                  </div>
                  <div>
                    <Input
                      placeholder="Enter pin code*"
                      value={recipientData.pincode}
                      onChange={(e) => handleFieldChange("pincode", e.target.value)}
                      className={`h-12 rounded-xl border-slate-200 focus:ring-primary focus:border-primary text-sm ${
                        errors.pincode ? "border-red-500 focus:ring-red-500 focus:border-red-500" : ""
                      }`}
                    />
                    {errors.pincode && (
                      <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.pincode}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Enter receiver details
                </h4>
                <p className="text-[10px] text-slate-400 mb-3 font-medium">
                  We&apos;ll contact receiver to get the exact delivery address
                </p>
                <div className="space-y-3">
                  <div>
                    <Input
                      placeholder="Receiver's name*"
                      value={recipientData.name}
                      onChange={(e) => handleFieldChange("name", e.target.value)}
                      className={`h-12 rounded-xl border-slate-200 focus:ring-primary focus:border-primary text-sm ${
                        errors.name ? "border-red-500 focus:ring-red-500 focus:border-red-500" : ""
                      }`}
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.name}</p>
                    )}
                  </div>
                  <div>
                    <div className="relative">
                      <Input
                        placeholder="Receiver's phone number*"
                        value={recipientData.phone}
                        onChange={(e) => handleFieldChange("phone", e.target.value)}
                        className={`h-12 rounded-xl border-slate-200 focus:ring-primary focus:border-primary text-sm pr-10 ${
                          errors.phone ? "border-red-500 focus:ring-red-500 focus:border-red-500" : ""
                        }`}
                      />
                      <Contact2
                        size={18}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.phone}</p>
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveClick}
                className="w-full h-12 bg-[var(--brand-700)] hover:bg-[var(--brand-600)] text-white font-bold rounded-xl">
                Save address
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delivery address heading */}
      <div className="mb-3">
        <h3 className="font-black text-slate-800 text-base">Delivery Address</h3>
        <p className="text-xs text-slate-500">Select or edit your saved address</p>
      </div>

      {/* Active address card */}
      <div className="border rounded-xl p-3 mb-3 relative cursor-pointer transition-all border-primary bg-brand-50/50">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
              <Check size={12} className="text-white stroke-[4]" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-slate-800 text-sm">{displayName}</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onEditAddress(); }}
                  className="text-slate-500 text-xs font-bold hover:underline">
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onSelectAddress(); }}
                  className="text-primary text-xs font-bold hover:underline">
                  Change
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{displayPhone}</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{displayAddress}</p>
          </div>
        </div>
      </div>

      {/* Use current location */}
      <button
        type="button"
        onClick={onUseCurrentLocation}
        disabled={isFetchingLocation}
        className="mt-3 w-full py-2.5 rounded-2xl border border-dashed border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
        {isFetchingLocation ? "Detecting live location..." : "Use current live location"}
      </button>

      {/* Confirmation banner */}
      <motion.div className="mt-3 rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="h-8 w-8 rounded-full bg-black  flex items-center justify-center shadow-brand-500/40 shadow-md">
          <Check size={16} className="text-white stroke-[3]" />
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-brand-900">
            Delivery address confirmed
          </p>
          <p className="text-[11px] font-medium text-brand-800/80">
            We&apos;ll deliver to the address you&apos;ve entered above.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
});

export default CheckoutAddressSection;
