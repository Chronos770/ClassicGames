import { Browser } from '@capacitor/browser';
import { useIsWeatherPwa } from './WeatherPwa';
import { useUpdateCheck, formatMB } from '../../lib/updateCheck';
import { RELEASE } from '../../lib/releaseInfo';
import { isNativeApp } from '../../lib/nativeApp';

/**
 * "Update available" banner shown on the weather dashboard when the
 * /current-release.json manifest reports a newer SHA than the build-
 * time __BUILD_SHA__ baked into this bundle.
 *
 * Sized for the top of the weather page, just below the install
 * affordances. Picks the right APK download based on whether we're
 * running in the weather PWA variant or somewhere else.
 *
 * "Update" tap → opens the APK URL via a same-origin download link.
 * On Android, Chrome's WebView (and the system browser) will trigger
 * the standard install flow once the user allows "Install unknown
 * apps" for the source — same as the original install.
 */
export default function UpdateAvailableBanner() {
  const isWeatherPwa = useIsWeatherPwa();
  const { available, dismiss } = useUpdateCheck();
  // Only show inside the installed app — in a mobile browser tab the
  // user just refreshes the page; there's no APK to "update" in that
  // context. The banner was always meant for the native shell.
  if (!isNativeApp()) return null;
  if (!available) return null;

  // Pick the APK by variant. The weather APK is the right call when
  // running in weather-PWA mode (the dedicated app); otherwise the
  // full-app APK is the broader catch.
  const apkUrl = isWeatherPwa ? '/weather-app.apk' : '/castle-and-cards.apk';
  const apkName = isWeatherPwa ? 'weather-app.apk' : 'castle-and-cards.apk';
  const apkSize = isWeatherPwa ? available.weatherApkBytes : available.fullApkBytes;

  const handleUpdate = async (e: React.MouseEvent) => {
    // In the native app, Capacitor's WebView doesn't reliably hand off
    // .apk downloads — bounce through Capacitor's Browser plugin which
    // opens a Chrome Custom Tab where the download flow works the same
    // as if you'd opened castleandcards.com in Chrome directly.
    if (isNativeApp()) {
      e.preventDefault();
      const absolute = new URL(apkUrl, window.location.origin).toString();
      try {
        await Browser.open({ url: absolute });
      } catch {
        // Fallback: navigate the WebView itself. Worst case the user
        // sees a download prompt.
        window.location.assign(apkUrl);
      }
    }
    // Web: let the <a href download> default behavior run.
  };

  return (
    <div className="mb-4 bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 border border-emerald-500/40 rounded-xl p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <div className="text-2xl flex-shrink-0" aria-hidden>
          &#128640;
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">App update available</div>
          <div className="text-xs text-white/65 mt-0.5 leading-relaxed">
            You&apos;re on <code className="text-white/85">{RELEASE.sha}</code>; latest is{' '}
            <code className="text-white/85">{available.sha}</code>
            {apkSize ? <> &middot; {formatMB(apkSize)}</> : null}. Tap Update to download and
            reinstall &mdash; Android will ask once to allow installs from your browser.
          </div>
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          <a
            href={apkUrl}
            download={apkName}
            onClick={handleUpdate}
            className="text-xs sm:text-sm px-3 py-1.5 bg-emerald-500/50 hover:bg-emerald-500/65 text-emerald-50 font-medium rounded-lg transition-colors text-center"
          >
            Update
          </a>
          <button
            onClick={dismiss}
            className="text-xs text-white/45 hover:text-white/70 transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
