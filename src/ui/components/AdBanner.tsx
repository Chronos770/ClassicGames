import { useEffect, useRef } from 'react';

interface AdBannerProps {
  slot: string;          // Your ad unit slot ID from AdSense
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>;
  }
}

export default function AdBanner({ slot, format = 'auto', className = '' }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded or blocked
    }
  }, []);

  return (
    <div className={`ad-container flex items-center justify-center ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
