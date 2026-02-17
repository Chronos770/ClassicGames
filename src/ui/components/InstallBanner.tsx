import { useState, useEffect, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export default function InstallBanner() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  useEffect(() => {
    // Already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // @ts-expect-error — Safari standalone check
    if (window.navigator.standalone === true) return;
    // User previously dismissed
    if (localStorage.getItem(DISMISS_KEY)) return;
    // Only show on mobile/tablet devices
    if (!('ontouchstart' in window) && !matchMedia('(pointer: coarse)').matches) return;

    // iOS doesn't fire beforeinstallprompt — show manual instruction
    if (isIOS()) {
      setIosMode(true);
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    deferredPrompt.current = null;
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  if (!show) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2">
        <p className="text-xs sm:text-sm text-amber-200/80">
          {iosMode ? (
            <>Tap <strong>Share</strong> then <strong>"Add to Home Screen"</strong> to install Castle &amp; Cards</>
          ) : (
            <>
              Install Castle &amp; Cards for quick access —{' '}
              <button
                onClick={handleInstall}
                className="text-amber-400 font-semibold hover:text-amber-300 underline underline-offset-2 transition-colors"
              >
                Add to Home Screen
              </button>
            </>
          )}
        </p>
        <button
          onClick={handleDismiss}
          className="text-white/40 hover:text-white/60 transition-colors text-lg leading-none flex-shrink-0"
          aria-label="Dismiss install banner"
        >
          &#10005;
        </button>
      </div>
    </div>
  );
}
