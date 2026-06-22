import { Browser } from '@capacitor/browser';
import { isNativeApp } from '../../lib/nativeApp';

const FULL_APP_URL = '/castle-and-cards.apk';
const WEATHER_APP_URL = '/weather-app.apk';

/**
 * APK download click handler that does the right thing in either
 * context:
 *
 * - On the website (browser): default <a download> behavior fetches
 *   the APK from the same origin. preventDefault is skipped.
 * - In the native app: a relative URL resolves against https://localhost
 *   (Capacitor's WebView origin), which has no APK. Build the absolute
 *   castleandcards.com URL and bounce to Chrome Custom Tab via
 *   Capacitor's Browser plugin so the download actually fetches from
 *   Vercel.
 */
function makeApkHandler(apkUrl: string) {
  return async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isNativeApp()) return; // web: let the link work as-is
    e.preventDefault();
    const absolute = `https://castleandcards.com${apkUrl}`;
    try {
      await Browser.open({ url: absolute });
    } catch {
      window.location.assign(absolute);
    }
  };
}

export default function WidgetInstallSection() {
  const handleWeather = makeApkHandler(WEATHER_APP_URL);
  const handleFull = makeApkHandler(FULL_APP_URL);

  return (
    <div className="space-y-4">
      {/* Weather-only native app (now bundles the widget) */}
      <div className="bg-gradient-to-br from-sky-500/15 to-sky-500/5 backdrop-blur-md rounded-xl border border-sky-500/30 p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="text-2xl flex-shrink-0">&#9928;&#65039;</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white">
              Castle &amp; Cards Weather
              <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-sky-500/30 text-sky-200 rounded uppercase tracking-wide">
                Beta
              </span>
            </div>
            <div className="text-xs text-white/60 mt-0.5 leading-relaxed">
              One download &mdash; the weather app <em>and</em> the home-screen widget. Cloud +
              lightning bolt launcher icon, branded splash, dedicated &ldquo;Weather alerts&rdquo;
              notification channel. Opens straight to the dashboard; tapping the widget on your home
              screen also opens the bundled app.
            </div>
          </div>
        </div>

        <a
          href={WEATHER_APP_URL}
          download="weather-app.apk"
          onClick={handleWeather}
          className="block w-full text-center text-sm px-3 py-2.5 bg-sky-500/40 hover:bg-sky-500/50 text-sky-50 font-medium rounded-lg transition-colors"
        >
          Download Weather App APK
        </a>

        <ol className="mt-3 space-y-1.5 text-xs text-white/55 list-decimal list-inside">
          <li>
            Tap <span className="text-white/80">Download Weather App APK</span> on your phone.
            Allow your browser to install from unknown sources the first time, then open the APK.
          </li>
          <li>
            Open the app once and sign in. The launcher icon shows in your app drawer as{' '}
            <span className="text-white/80">Castle &amp; Cards Weather</span>.
          </li>
          <li>
            For the widget: long-press an empty spot on your home screen &rarr;{' '}
            <span className="text-white/80">Widgets</span> &rarr;{' '}
            <span className="text-white/80">Castle &amp; Cards Weather</span>. Drag the widget edges
            to resize between 2&times;2, 3&times;2, and 4&times;2.
          </li>
        </ol>

        {/* Push setup help — relevant for the weather app */}
        <details className="mt-3 group">
          <summary className="cursor-pointer text-xs text-sky-200/80 hover:text-sky-100 select-none">
            How do push notifications work in the app?
          </summary>
          <div className="mt-2 text-xs text-white/65 leading-relaxed space-y-2 border-l border-sky-500/30 pl-3">
            <p>
              <strong className="text-white/85">Native FCM (active).</strong> The weather APK
              ships with Firebase wired up — when you tap <em>Enable</em> in Notifications below,
              Android asks for permission, registers an FCM token, and stores it. Pushes arrive
              with the cloud + lightning bolt icon in the status bar and &ldquo;Castle &amp; Cards
              Weather&rdquo; as the source app.
            </p>
            <p>
              <strong className="text-white/85">Web push (browser).</strong> On the website
              (mobile Chrome or Firefox), VAPID-based web push still works through the service
              worker. Same Enable button, different transport under the hood.
            </p>
          </div>
        </details>
      </div>

      {/* Full app — Capacitor-bundled native APK */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="text-2xl flex-shrink-0">&#129518;</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white">
              Castle &amp; Cards (full app)
              <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded uppercase tracking-wide">
                Beta
              </span>
            </div>
            <div className="text-xs text-white/60 mt-0.5 leading-relaxed">
              Native APK that bundles the entire site &mdash; every page, every game, every asset
              ships inside the APK and runs offline. Doesn&apos;t include the home-screen widget;
              install the Weather APK above for that.
            </div>
          </div>
        </div>

        <a
          href={FULL_APP_URL}
          download="castle-and-cards.apk"
          onClick={handleFull}
          className="block w-full text-center text-sm px-3 py-2.5 bg-amber-500/30 hover:bg-amber-500/40 text-amber-100 font-medium rounded-lg transition-colors"
        >
          Download Full App APK
        </a>
      </div>

      <div className="text-[11px] text-white/35 text-center">
        Hosted on this site &mdash; auto-rebuilt by CI on every push.
      </div>
    </div>
  );
}
