/**
 * Utility to detect if the app is running on a mobile device or within the Flutter WebView.
 */
export const isMobileOrWebView = () => {
  if (typeof window === "undefined") return false;
  
  return (
    window.innerWidth < 768 || 
    !!window.Flutter || 
    !!window.flutter_inappwebview ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
};

/**
 * Helper to capture an image using the Flutter inAppWebView JavaScript handler if available.
 * Returns a File object if captured via Flutter bridge, or null if Flutter bridge is not present/failed.
 */
export const captureFlutterCamera = async (fileNamePrefix = "camera_capture") => {
  if (typeof window === "undefined") return null;
  
  const flutterHandler = window.flutter_inappwebview?.callHandler;
  if (!flutterHandler) return null;

  try {
    const res = await flutterHandler('openCamera');
    if (res && res.success && res.base64) {
      const mimeType = res.mimeType || 'image/jpeg';
      const fileName = res.fileName || `${fileNamePrefix}_${Date.now()}.jpg`;

      // Convert Base64 string to Uint8Array / Blob / File
      const byteCharacters = atob(res.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      return new File([blob], fileName, { type: mimeType });
    }
  } catch (err) {
    console.error("Flutter openCamera bridge error:", err);
  }
  return null;
};

