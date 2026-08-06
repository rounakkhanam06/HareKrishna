import React, { useState, useEffect } from 'react';
import { applyCloudinaryTransform, isCloudinaryUrl } from '@/core/utils/imageUtils';

const LazyImage = ({ src, alt = '', className = '', width, height, ...rest }) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  const isCloudinary = isCloudinaryUrl(src);

  // High-res optimized source
  const optimizedSrc = isCloudinary
    ? applyCloudinaryTransform(src, `f_auto,q_auto,dpr_auto${width ? `,w_${width}` : ''}${height ? `,h_${height}` : ''}`)
    : src;

  // Low-res thumbnail for progressive loading (instantly fetched, <1KB)
  const lowResSrc = isCloudinary
    ? applyCloudinaryTransform(src, `f_auto,q_10,w_30,c_scale`)
    : '';

  // Apply blurry placeholder styling before full image is loaded
  const blurStyle = isCloudinary && !loaded && lowResSrc
    ? {
        backgroundImage: `url(${lowResSrc})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(10px)',
        transform: 'scale(1.05)', // Prevent edge blur-bleed
      }
    : {};

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      style={{
        ...blurStyle,
        transition: 'filter 0.5s ease-out, transform 0.5s ease-out, opacity 0.3s ease-out',
      }}
      className={`${className} ${loaded ? 'opacity-100' : 'opacity-90'}`}
      {...rest}
    />
  );
};

export default LazyImage;
