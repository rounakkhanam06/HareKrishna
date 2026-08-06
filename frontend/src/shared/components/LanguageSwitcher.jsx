import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, ChevronDown, Search, Check } from "lucide-react";

// Curated list of Indian Regional & Major International Languages
const LANGUAGES = [
  // Pinned / Popular Indian Languages
  { code: "en", name: "English", nativeName: "Eng", flag: "🇬🇧", pinned: true },
  { code: "hi", name: "Hindi", nativeName: "हिंदी", flag: "🇮🇳", pinned: true },
  { code: "mr", name: "Marathi", nativeName: "मराठी", flag: "🇮🇳", pinned: true },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", flag: "🇮🇳", pinned: true },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇮🇳", pinned: true },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳", pinned: true },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳", pinned: true },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", flag: "🇮🇳", pinned: true },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳", pinned: true },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", flag: "🇮🇳", pinned: true },
  { code: "ur", name: "Urdu", nativeName: "اردو", flag: "🇮🇳", pinned: true },

  // Global Languages
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "中文", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "th", name: "Thai", nativeName: "ไทย", flag: "🇹🇭" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
];

const LanguageSwitcher = ({ className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentLang, setCurrentLang] = useState(() => {
    const saved = localStorage.getItem("app_language");
    if (saved) return saved;

    const value = `; ${document.cookie}`;
    const parts = value.split(`; googtrans=`);
    if (parts.length === 2) {
      const val = parts.pop().split(";").shift();
      if (val) {
        const langCode = val.split("/").pop();
        if (langCode && langCode !== "en") return langCode;
      }
    }
    return "en";
  });

  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        buttonRef.current && !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Recalculate dropdown position whenever it opens
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  // Sync active language state with cookies & DOM
  useEffect(() => {
    const checkActiveLanguage = () => {
      const savedLang = localStorage.getItem("app_language");
      if (savedLang) {
        setCurrentLang(savedLang);
        return;
      }

      const cookieVal = `; ${document.cookie}`;
      const parts = cookieVal.split(`; googtrans=`);
      if (parts.length === 2) {
        const val = parts.pop().split(";").shift();
        if (val) {
          const langCode = val.split("/").pop();
          if (langCode) {
            setCurrentLang(langCode);
          }
        }
      }
    };

    checkActiveLanguage();
  }, []);

  const changeLanguage = (langCode) => {
    setCurrentLang(langCode);
    const host = window.location.hostname;

    if (langCode === "en") {
      // Restore to original English — clear all Google Translate state
      localStorage.removeItem("app_language");
      // Expire the googtrans cookie
      document.cookie = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
      document.cookie = `googtrans=; domain=.${host}; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC`;

      // Try to restore via the Google Translate combo element
      const selectElem = document.querySelector(".goog-te-combo");
      if (selectElem) {
        selectElem.value = "";
        selectElem.dispatchEvent(new Event("change"));
      }
      // Reload to fully restore original content
      window.location.reload();
    } else {
      localStorage.setItem("app_language", langCode);
      const targetPath = `/en/${langCode}`;

      // Set cookie across root and domain
      document.cookie = `googtrans=${targetPath}; path=/; expires=Thu, 01 Jan 2099 00:00:00 UTC`;
      document.cookie = `googtrans=${targetPath}; domain=.${host}; path=/; expires=Thu, 01 Jan 2099 00:00:00 UTC`;

      // Trigger Google Translate select element if initialized
      const selectElem = document.querySelector(".goog-te-combo");
      if (selectElem) {
        selectElem.value = langCode;
        selectElem.dispatchEvent(new Event("change"));
      } else {
        window.location.reload();
      }
    }

    setIsOpen(false);
    setSearchQuery("");
  };

  const activeLangObj =
    LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  const filteredLanguages = LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedLanguages = filteredLanguages.filter((l) => l.pinned);
  const otherLanguages = filteredLanguages.filter((l) => !l.pinned);

  return (
    <div className={`relative notranslate ${className}`} ref={buttonRef} data-lenis-prevent>
      {/* Trigger Button */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/30 text-white px-2.5 py-1.5 rounded-full shadow-sm transition-all duration-200 cursor-pointer text-xs font-semibold"
        title="Select Language"
      >
        <Globe className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
        <span className="max-w-[75px] sm:max-w-[100px] truncate leading-snug">
          {activeLangObj.nativeName || activeLangObj.name}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-white/80 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </motion.button>

      {/* Dropdown Menu — rendered via portal to escape header stacking context */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "fixed",
                top: dropdownPos.top,
                right: dropdownPos.right,
              }}
              className="w-64 max-h-80 bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[999999] overflow-hidden flex flex-col notranslate"
            >
            {/* Search Header */}
            <div className="p-2.5 border-b border-slate-800 bg-slate-950/60 sticky top-0 z-10">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
                <input
                  type="text"
                  placeholder="Search language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Language Items List */}
            <div className="overflow-y-auto p-1.5 space-y-1 custom-scrollbar text-xs">
              {/* Pinned Indian Languages */}
              {pinnedLanguages.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    🇮🇳 Indian Languages
                  </div>
                  {pinnedLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => changeLanguage(lang.code)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                        currentLang === lang.code
                          ? "bg-emerald-600/90 text-white font-bold shadow-sm"
                          : "text-slate-200 hover:bg-slate-800/80 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span>{lang.flag}</span>
                        <span className="font-semibold">{lang.nativeName}</span>
                        {lang.nativeName !== lang.name && (
                          <span className="text-[10px] text-slate-400 font-normal truncate">
                            ({lang.name})
                          </span>
                        )}
                      </div>
                      {currentLang === lang.code && (
                        <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Other Global Languages */}
              {otherLanguages.length > 0 && (
                <div className="mt-2">
                  <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    🌐 Global Languages
                  </div>
                  {otherLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => changeLanguage(lang.code)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                        currentLang === lang.code
                          ? "bg-emerald-600/90 text-white font-bold shadow-sm"
                          : "text-slate-200 hover:bg-slate-800/80 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span>{lang.flag}</span>
                        <span className="font-semibold">{lang.nativeName}</span>
                        {lang.nativeName !== lang.name && (
                          <span className="text-[10px] text-slate-400 font-normal truncate">
                            ({lang.name})
                          </span>
                        )}
                      </div>
                      {currentLang === lang.code && (
                        <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {filteredLanguages.length === 0 && (
                <div className="p-4 text-center text-slate-400 text-xs">
                  No language found for "{searchQuery}"
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </div>
  );
};

export default LanguageSwitcher;
