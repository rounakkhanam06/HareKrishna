import React, { useEffect } from "react";

/**
 * GoogleTranslateLoader
 * Injects Google Translate element script dynamically into the application,
 * suppresses default top banner / iframe styling, and applies an automated
 * custom translation dictionary to correct awkward machine translations (e.g. 'आदेश' -> 'ऑर्डर्स').
 */
const GoogleTranslateLoader = () => {
  useEffect(() => {
    // 1. Define callback window function expected by Google Translate script
    window.googleTranslateElementInit = () => {
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            autoDisplay: false,
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          "google_translate_element"
        );
      }
    };

    // 2. Check if script is already present
    const existingScript = document.getElementById("google-translate-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.type = "text/javascript";
      script.src =
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google && window.google.translate) {
      window.googleTranslateElementInit();
    }

    // 3. Custom Translation Dictionary Corrector (Fixes 'आदेश' -> 'ऑर्डर्स', 'वर्ग' -> 'कैटेगरीज़')
    const replacements = [
      { from: /آدیش/g, to: "ऑर्डर्स" },
      { from: /आदेशों/g, to: "ऑर्डर्स" },
      { from: /आदेश/g, to: "ऑर्डर्स" },
      { from: /^वर्ग$/g, to: "कैटेगरीज़" },
    ];

    const correctTranslationText = () => {
      const isHindi =
        localStorage.getItem("app_language") === "hi" ||
        document.cookie.includes("googtrans=/en/hi") ||
        document.documentElement.classList.contains("translated-ltr");

      if (!isHindi) return;

      const walk = (node) => {
        if (!node) return;

        // Skip elements marked with 'notranslate' or scripts/styles
        if (
          node.nodeType === Node.ELEMENT_NODE &&
          (node.classList?.contains("notranslate") ||
            node.tagName === "SCRIPT" ||
            node.tagName === "STYLE" ||
            node.tagName === "INPUT" ||
            node.tagName === "TEXTAREA")
        ) {
          return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
          let text = node.nodeValue;
          if (text && text.trim()) {
            let updated = text;
            replacements.forEach(({ from, to }) => {
              if (from.test(updated)) {
                updated = updated.replace(from, to);
              }
            });
            if (updated !== text) {
              node.nodeValue = updated;
            }
          }
        } else {
          for (let child of node.childNodes) {
            walk(child);
          }
        }
      };

      walk(document.body);
    };

    // Run dictionary corrector on interval and DOM mutations
    const interval = setInterval(correctTranslationText, 400);

    const observer = new MutationObserver(() => {
      correctTranslationText();
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <style>{`
        .goog-te-banner-frame,
        .goog-te-banner-frame.skiptranslate,
        iframe.skiptranslate,
        .goog-te-balloon-frame,
        #goog-gt-tt,
        .goog-te-spinner-pos {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          height: 0 !important;
          width: 0 !important;
          pointer-events: none !important;
        }
        html, body {
          top: 0px !important;
          position: static !important;
        }
        body > .skiptranslate {
          display: none !important;
        }
        .goog-te-gadget {
          display: none !important;
        }
        .goog-text-highlight {
          background-color: transparent !important;
          box-shadow: none !important;
        }
      `}</style>
      <div
        id="google_translate_element"
        className="hidden"
        style={{ display: "none", visibility: "hidden" }}
      />
    </>
  );
};

export default GoogleTranslateLoader;
