import { useEffect, useRef, useState } from 'react';

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

/**
 * Install button for the weather PWA. Shows on mobile only, when not already
 * installed, and dismisses persistently when X'd.
 */
export function WeatherInstallButton() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosMode, setIosMode] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isInstalled()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (!isMobile()) return;

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
    setInstalling(true);
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setInstalling(false);
    if (outcome === 'accepted') setShow(false);
    deferredPrompt.current = null;
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  if (!show) return null;

  return (
    <div className="bg-gradient-to-r from-sky-500/15 to-blue-500/10 border border-sky-500/30 rounded-xl p-3 sm:p-4 mb-4">
      <div className="flex items-center gap-3">
        <div className="text-3xl flex-shrink-0">⛈️</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">Install as a Weather App</div>
          <div className="text-xs text-white/60 mt-0.5 leading-relaxed">
            {iosMode ? (
              <>Tap <strong>Share</strong> then <strong>Add to Home Screen</strong> for a standalone weather app — no Castle &amp; Cards header, just your station.</>
            ) : (
              <>Save just the weather to your home screen as its own app — no Castle &amp; Cards header, just your station.</>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!iosMode && (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="text-xs sm:text-sm px-3 py-1.5 bg-sky-500/30 hover:bg-sky-500/40 text-sky-200 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {installing ? 'Installing…' : 'Install'}
            </button>
          )}
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
