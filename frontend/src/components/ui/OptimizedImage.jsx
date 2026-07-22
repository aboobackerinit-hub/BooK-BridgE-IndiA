import React, { useState } from 'react';
import { BookOpen, Image as ImageIcon } from 'lucide-react';

/**
 * Optimizes Cloudinary URLs to include f_auto,q_auto and handles fallback rendering.
 */
export function OptimizedImage({ src, alt = "", fallbackType = "book", className = "", ...props }) {
  const [error, setError] = useState(false);

  // Determine fallback icon based on type
  const FallbackIcon = fallbackType === "book" ? BookOpen : ImageIcon;

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`} {...props}>
        <FallbackIcon className="w-1/3 h-1/3 opacity-50" />
      </div>
    );
  }

  // Optimize Cloudinary URLs
  let optimizedSrc = src;
  if (src.includes("res.cloudinary.com") && src.includes("/upload/")) {
    if (!src.includes("f_auto") && !src.includes("q_auto")) {
      optimizedSrc = src.replace("/upload/", "/upload/f_auto,q_auto/");
    }
  }

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
      {...props}
    />
  );
}
