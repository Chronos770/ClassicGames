import { useEffect, useRef } from 'react';

type AdSize = 'leaderboard' | 'medium-rectangle' | 'banner';

interface AdPlacementProps {
  size: AdSize;
  className?: string;
}

const AD_DIMENSIONS: Record<AdSize, { width: number; height: number; label: string }> = {
  'leaderboard': { width: 728, height: 90, label: '728x90 Leaderboard' },
  'medium-rectangle': { width: 300, height: 250, label: '300x250 Medium Rectangle' },
  'banner': { width: 468, height: 60, label: '468x60 Banner' },
};

const IS_PRODUCTION = import.meta.env.PROD;
const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || '';
const ADSENSE_SLOT = import.meta.env.VITE_ADSENSE_SLOT || '';

export default function AdPlacement({ size, className = '' }: AdPlacementProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const { width, height, label } = AD_DIMENSIONS[size];

  useEffect(() => {
    // In production with AdSense configured, push the ad
    if (IS_PRODUCTION && ADSENSE_CLIENT && ADSENSE_SLOT && adRef.current) {
      try {
        // @ts-expect-error adsbygoogle is injected by the AdSense script
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // AdSense not loaded, fail silently
      }
    }
  }, []);

  // Don't render ads if no AdSense is configured in production
  if (IS_PRODUCTION && !ADSENSE_CLIENT) {
    return null;
  }

  // Dev mode: show placeholder
  if (!IS_PRODUCTION) {
    return (
      <div
        className={`flex items-center justify-center border border-dashed border-white/20 rounded-lg bg-white/[0.02] ${className}`}
        style={{ width, height, maxWidth: '100%' }}
      >
        <div className="text-center">
          <div className="text-xs text-white/20 uppercase tracking-wider">Ad Placeholder</div>
          <div className="text-xs text-white/15">{label}</div>
        </div>
      </div>
    );
  }

  // Production mode with AdSense
  return (
    <div ref={adRef} className={className} style={{ maxWidth: '100%' }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'inline-block', width, height }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
      />
    </div>
  );
}
