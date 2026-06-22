import { useEffect, useRef, useState } from 'react';
import { isNativeApp } from '../../lib/nativeApp';

const SS_KEY = 'weather-pwa-mode';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // @ts-expect-error — iOS Safari
  window.navigator.standalone === true;

const isMobile = () =>
  ('ontouchstart' in window) || matchMedia('(pointer: coarse)').matches;

/**
 * Returns true if we're currently running as the installed Weather PWA.
 * Detection: ?pwa=weather in URL (set by manifest start_url) OR sticky
 * sessionStorage flag from a prior detection in this session.
 */
export function useIsWeatherPwa(): boolean {
  const [isWeatherPwa, setIsWeatherPwa] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (sessionStorage.getItem(SS_KEY) === '1') return true;
    const params = new URLSearchParams(window.location.search);
    if (params.get('pwa') === 'weather') {
      sessionStorage.setItem(SS_KEY, '1');
      return true;
    }
    return false;
  });

  // Re-check if URL changes (rare — start_url is hit only on launch)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pwa') === 'weather' && !isWeatherPwa) {
      sessionStorage.setItem(SS_KEY, '1');
      setIsWeatherPwa(true);
    }
  }, [isWeatherPwa]);

  return isWeatherPwa;
}

/**
 * Hook that swaps the manifest, apple-touch-icon, and theme-color to weather
 * branding while the user is on the weather page. Restores originals on unmount
 * so other pages keep the Castle & Cards branding.
 */
export function useWeatherManifest() {
  useEffect(() => {
    const swaps: Array<() => void> = [];

    // Manifest
    const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (manifestLink) {
      const original = manifestLink.href;
      manifestLink.href = '/manifest-weather.json';
      swaps.push(() => { manifestLink.href = original; });
    }

    // Apple touch icon (iOS reads this for "Add to Home Screen")
    const appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (appleIcon) {
      const original = appleIcon.href;
      appleIcon.href = '/icons/weather-icon-192.svg';
      swaps.push(() => { appleIcon.href = original; });
    }

    // Apple web app title
    let appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    let createdAppleTitle = false;
    if (!appleTitle) {
      appleTitle = document.createElement('meta');
      appleTitle.name = 'apple-mobile-web-app-title';
      document.head.appendChild(appleTitle);
      createdAppleTitle = true;
    }
    const originalAppleTitle = appleTitle.content;
    appleTitle.content = 'Weather';
    swaps.push(() => {
      if (createdAppleTitle) appleTitle?.remove();
      else if (appleTitle) appleTitle.content = originalAppleTitle;
    });

    // Theme color
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColor) {
      const original = themeColor.content;
      themeColor.content = '#0ea5e9';
      swaps.push(() => { themeColor.content = original; });
    }

    // Document title
    const originalTitle = document.title;
    document.title = 'Walnut Farms Weather';
    swaps.push(() => { document.title = originalTitle; });

    return () => {
      for (const undo of swaps) undo();
    };
  }, []);
}

const DISMISS_KEY = 'weather-install-dismissed';

const isAndroid = () =>
  typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

/**
 * "Download the app" prompt shown to mobile browser visitors. Replaces
 * the older Add-to-Home-Screen / PWA-install flow:
 *
 * - Android browsers: direct download link to /weather-app.apk
 * - iOS: keep the "Share → Add to Home Screen" hint (no APK option)
 * - Desktop: nothing
 * - Already installed (display-mode: standalone) or running in the
 *   native app: nothing
 * - Dismissed persistently on X click
 */
export function WeatherInstallButton() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Already running natively (Capacitor APK)? Don't suggest the user
    // "download the app" — they're literally inside it. isInstalled()
    // doesn't catch this because the Capacitor WebView's display-mode
    // isn't 'standalone' the way a PWA's is.
    if (isNativeApp()) return;
    if (isInstalled()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (!isMobile()) return;

    if (isIOS()) {
      setIosMode(true);
      setShow(true);
      return;
    }

    // Android (and anything else mobile that isn't iOS): always show
    // the APK download — no longer wait for beforeinstallprompt. Still
    // capture the deferred prompt so a future "Add to Home Screen"
    // option could be brought back, but the primary CTA is now the
    // native APK download.
    setShow(true);
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  if (!show) return null;

  // iOS: keep the Share → Add to Home Screen hint (no APK option)
  if (iosMode) {
    return (
      <div className="bg-gradient-to-r from-sky-500/15 to-blue-500/10 border border-sky-500/30 rounded-xl p-3 sm:p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl flex-shrink-0">⛈️</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white">Get the weather app</div>
            <div className="text-xs text-white/60 mt-0.5 leading-relaxed">
              Tap <strong>Share</strong> then <strong>Add to Home Screen</strong> for a standalone
              weather app — no Castle &amp; Cards header, just your station.
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/40 hover:text-white/60 transition-colors text-lg leading-none px-1 flex-shrink-0"
            aria-label="Dismiss"
          >
            &#10005;
          </button>
        </div>
      </div>
    );
  }

  // Android (and other mobile): direct APK download
  return (
    <div className="bg-gradient-to-r from-sky-500/15 to-blue-500/10 border border-sky-500/30 rounded-xl p-3 sm:p-4 mb-4">
      <div className="flex items-center gap-3">
        <div className="text-3xl flex-shrink-0">⛈️</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">Download the weather app</div>
          <div className="text-xs text-white/60 mt-0.5 leading-relaxed">
            Native Android app — your station&apos;s dashboard, push notifications, home-screen
            widget. {isAndroid() ? 'Tap Download to install.' : 'Open this on an Android phone to install.'}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <a
            href="/weather-app.apk"
            download="weather-app.apk"
            className="text-xs sm:text-sm px-3 py-1.5 bg-sky-500/30 hover:bg-sky-500/40 text-sky-200 font-medium rounded-lg transition-colors"
          >
            Download
          </a>
          <button
            onClick={handleDismiss}
            className="text-white/40 hover:text-white/60 transition-colors text-lg leading-none px-1"
            aria-label="Dismiss"
          >
            &#10005;
          </button>
        </div>
      </div>
    </div>
  );
}
