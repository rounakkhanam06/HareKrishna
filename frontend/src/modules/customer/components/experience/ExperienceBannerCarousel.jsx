import React from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, useMotionValue } from "framer-motion";
import {
  applyCloudinaryTransform,
  buildCloudinarySrcSet,
  isCloudinaryUrl,
} from "@/core/utils/imageUtils";

import { isMobileOrWebView } from "@/core/utils/deviceUtils";

const BANNER_CHUNK_SIZE = 20;

const ExperienceBannerCarousel = ({ section, items, fullWidth = false, slideGap = 0, edgeToEdge = false }) => {
  const navigate = useNavigate();
  if (!items.length) return null;

  const [activeIndex, setActiveIndex] = React.useState(0);
  const [visibleCount, setVisibleCount] = React.useState(() =>
    Math.min(items.length, BANNER_CHUNK_SIZE)
  );
  const visibleItems = items.slice(0, visibleCount);
  const totalItems = visibleItems.length;
  const x = useMotionValue(0);
  const containerRef = React.useRef(null);
  const hasMore = visibleCount < items.length;

  const loadMore = React.useCallback(() => {
    setVisibleCount((prev) => Math.min(items.length, prev + BANNER_CHUNK_SIZE));
  }, [items.length]);

  React.useEffect(() => {
    setVisibleCount(Math.min(items.length, BANNER_CHUNK_SIZE));
    setActiveIndex(0);
  }, [items.length]);

  // Auto-play logic
  React.useEffect(() => {
    if (totalItems <= 1) return;

    const intervalId = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalItems);
    }, 4500);

    return () => clearInterval(intervalId);
  }, [totalItems]);

  React.useEffect(() => {
    if (!hasMore) return;
    if (activeIndex >= totalItems - 2) {
      loadMore();
    }
  }, [activeIndex, totalItems, hasMore, loadMore]);

  const touchStartX = React.useRef(0);
  const touchEndX = React.useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (diff > threshold) {
      // Swipe left -> Next (wrap around to first banner)
      setActiveIndex((prev) => (prev + 1) % totalItems);
    } else if (diff < -threshold) {
      // Swipe right -> Prev (wrap around to last banner)
      setActiveIndex((prev) => (prev - 1 + totalItems) % totalItems);
    }
  };

  const getBannerOptimizedSrc = React.useCallback((url) => {
    if (!url) return url;
    if (!isCloudinaryUrl(url)) return url;
    return applyCloudinaryTransform(url, "f_auto,q_auto,c_fill,g_auto,w_824,h_380");
  }, []);

  const handleBannerClick = React.useCallback((banner) => {
    if (!banner || banner.linkType === 'none' || !banner.linkValue) return;

    switch (banner.linkType) {
      case 'product':
        navigate(`/product/${banner.linkValue}`);
        break;
      case 'category':
      case 'header':
        navigate(`/category/${banner.linkValue}`);
        break;
      case 'subcategory':
        navigate(`/category/all?sub=${banner.linkValue}`);
        break;
      case 'url':
        if (banner.linkValue.startsWith('http://') || banner.linkValue.startsWith('https://')) {
          window.open(banner.linkValue, '_blank', 'noopener,noreferrer');
        } else {
          window.open(`https://${banner.linkValue}`, '_blank', 'noopener,noreferrer');
        }
        break;
      default:
        break;
    }
  }, [navigate]);

  return (
    <div className={cn("relative touch-pan-y w-full")}>
      <div className="overflow-hidden w-full">
        <motion.div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          animate={{ x: `-${(activeIndex / totalItems) * 100}%` }}
          transition={isMobileOrWebView() ? { type: "tween", ease: "easeInOut", duration: 0.3 } : { type: "spring", stiffness: 300, damping: 30 }}
          className="flex animate-none"
          style={{ width: `${totalItems * 100}%` }}
        >
        {visibleItems.map((banner, idx) => {
          const hasLink = banner.linkType && banner.linkType !== 'none' && banner.linkValue;
          return (
            <div
              key={idx}
              className={cn(
                "relative shrink-0 overflow-hidden bg-slate-100 flex items-center justify-center box-border",
                hasLink && "cursor-pointer hover:opacity-95 transition-opacity",
                fullWidth ? "h-[190px] md:h-[380px] px-0" : "h-[190px] md:h-[380px] px-4 md:px-8"
              )}
              style={{ width: `${100 / totalItems}%` }}
              onClick={hasLink ? () => handleBannerClick(banner) : undefined}
            >
            {fullWidth ? (
              <img
                src={getBannerOptimizedSrc(banner.imageUrl)}
                srcSet={
                  isCloudinaryUrl(banner.imageUrl)
                    ? buildCloudinarySrcSet(banner.imageUrl, [
                        { w: 412, h: 190 },
                        { w: 824, h: 380 },
                        { w: 1248, h: 570 },
                      ])
                    : undefined
                }
                sizes="100vw"
                alt={banner.title || section?.title || "Banner"}
                className="w-full h-full object-cover object-center pointer-events-none"
                width={412}
                height={190}
                loading={idx === 0 ? "eager" : "lazy"}
                fetchPriority={idx === 0 ? "high" : "low"}
                decoding="async"
              />
            ) : (
              <div className="h-full w-full max-w-[560px] overflow-hidden rounded-3xl bg-slate-100 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                <img
                  src={getBannerOptimizedSrc(banner.imageUrl)}
                  srcSet={
                    isCloudinaryUrl(banner.imageUrl)
                      ? buildCloudinarySrcSet(banner.imageUrl, [
                          { w: 560, h: 190 },
                          { w: 1120, h: 380 },
                        ])
                      : undefined
                  }
                  sizes="(max-width: 768px) 100vw, 560px"
                  alt={banner.title || section?.title || "Banner"}
                  className="w-full h-full object-cover object-center pointer-events-none"
                  width={560}
                  height={190}
                  loading={idx === 0 ? "eager" : "lazy"}
                  fetchPriority={idx === 0 ? "high" : "low"}
                  decoding="async"
                />
              </div>
            )}
          </div>
        );
        })}
        </motion.div>
      </div>

      {/* Dots Indicator */}
      {totalItems > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
          <div className="flex items-center gap-1.5 bg-black/10 backdrop-blur-[2px] px-2.5 py-1.5 rounded-full shadow-sm">
            {visibleItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  idx === activeIndex
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/50 hover:bg-white/80"
                )}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExperienceBannerCarousel;
