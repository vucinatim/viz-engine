'use client';

import { memo, useEffect, useRef, useState } from 'react';
import NodeNetworkPreview from './node-network-preview';

interface LazyNodeNetworkPreviewProps {
  parameterId: string;
  isHovered: boolean;
  width?: number;
  height?: number;
}

/**
 * Lazy-loading wrapper for NodeNetworkPreview that only renders when visible
 * Uses IntersectionObserver to detect when the preview scrolls into view
 */
const LazyNodeNetworkPreview = memo(
  ({
    parameterId,
    isHovered,
    width = 120,
    height = 68,
  }: LazyNodeNetworkPreviewProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const [hasRendered, setHasRendered] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              setHasRendered(true);
              // Once rendered, we can disconnect to save resources
              observer.disconnect();
            }
          });
        },
        {
          // Start loading slightly before it comes into view
          rootMargin: '50px',
          threshold: 0,
        },
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      return () => {
        observer.disconnect();
      };
    }, []);

    return (
      <div
        ref={containerRef}
        style={{ width: `${width}px`, height: `${height}px` }}
        className="shrink-0">
        {hasRendered ? (
          <NodeNetworkPreview
            parameterId={parameterId}
            isHovered={isHovered}
            width={width}
            height={height}
          />
        ) : (
          // Placeholder while not in view
          <div
            className="flex items-center justify-center rounded border border-zinc-700 bg-black/50"
            style={{ width: `${width}px`, height: `${height}px` }}>
            <div className="h-4 w-4 animate-pulse rounded-full bg-zinc-600" />
          </div>
        )}
      </div>
    );
  },
);

LazyNodeNetworkPreview.displayName = 'LazyNodeNetworkPreview';

export default LazyNodeNetworkPreview;
