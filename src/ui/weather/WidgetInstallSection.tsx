const FULL_APP_URL = '/castle-and-cards.apk';
const WEATHER_APP_URL = '/weather-app.apk';
const WIDGET_URL = '/weather-widget.apk';

export default function WidgetInstallSection() {
  return (
    <div className="space-y-4">
      {/* Weather-only native app */}
      <div className="bg-gradient-to-br from-sky-500/15 to-sky-500/5 backdrop-blur-md rounded-xl border border-sky-500/30 p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="text-2xl flex-shrink-0">&#9928;&#65039;</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white">
              Castle &amp; Cards Weather (weather-only app)
              <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-sky-500/30 text-sky-200 rounded uppercase tracking-wide">
                Beta
              </span>
            </div>
            <div className="text-xs text-white/60 mt-0.5 leading-relaxed">
              Native APK focused on weather. Cloud + lightning bolt launcher icon, branded splash,
              dedicated &ldquo;Weather alerts&rdquo; notification channel. Opens straight to the
              dashboard &mdash; no Castle &amp; Cards header, no games hub. Same web bundle under
              the hood, just routed to weather-PWA mode on launch.
            </div>
          </div>
        </div>

        <a
          href={WEATHER_APP_URL}
          download="weather-app.apk"
          className="block w-full text-center text-sm px-3 py-2.5 bg-sky-500/40 hover:bg-sky-500/50 text-sky-50 font-medium rounded-lg transition-colors"
        >
          Download Weather App APK
        </a>

        {/* Push setup help — relevant for the weather app */}
        <details className="mt-3 group">
          <summary className="cursor-pointer text-xs text-sky-200/80 hover:text-sky-100 select-none">
            How do push notifications work in the app?
          </summary>
          <div className="mt-2 text-xs text-white/65 leading-relaxed space-y-2 border-l border-sky-500/30 pl-3">
            <p>
              <strong className="text-white/85">Web push (works today).</strong> Open the app, sign
              in, then go to Notifications above and tap <em>Enable</em>. Android asks for the OS
              permission; once granted, the same VAPID/Supabase pipeline that powers the website
              sends alerts to your phone via the system Chrome WebView. No Firebase setup required.
            </p>
            <p>
              <strong className="text-white/85">Native FCM (better, optional).</strong> For a fully
              native push channel with the weather icon in the status bar and lower latency, the
              app needs a <code className="text-white/85">google-services.json</code> from a
              Firebase project (package name{' '}
              <code className="text-white/85">com.castleandcards.weather</code>). Steps are in
              {' '}<code className="text-white/85">android-weather/README.md</code> in the repo &mdash;
              once it&apos;s wired, the existing Notifications card automatically registers an FCM
              token.
            </p>
            <p className="text-white/45">
              If you tap Enable inside the app and it errors out about &ldquo;no active Service
              Worker,&rdquo; close and reopen the app once &mdash; first launch can land before the
              SW has registered.
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
              ships inside the APK and runs offline. Native plugins for status bar, splash, back
              button, network, and push (push needs FCM setup &mdash; see
              <code className="text-white/80"> android-app/README.md</code>).
              ~55 MB because the DOSBox game is in there.
            </div>
          </div>
        </div>

        <a
          href={FULL_APP_URL}
          download="castle-and-cards.apk"
          className="block w-full text-center text-sm px-3 py-2.5 bg-amber-500/30 hover:bg-amber-500/40 text-amber-100 font-medium rounded-lg transition-colors"
        >
          Download Full App APK
        </a>
      </div>

      {/* Weather widget */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="text-2xl flex-shrink-0">&#128241;</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white">Android home-screen widget</div>
            <div className="text-xs text-white/60 mt-0.5 leading-relaxed">
              Resizable 2&times;2, 3&times;2, or 4&times;2 widget that mirrors this dashboard&apos;s
              hero. Refreshes every 15 minutes; tap it to open the PWA. Bigger sizes add a metrics
              column and a 5-day strip.
            </div>
          </div>
        </div>

        <a
          href={WIDGET_URL}
          download="weather-widget.apk"
          className="block w-full text-center text-sm px-3 py-2.5 bg-sky-500/30 hover:bg-sky-500/40 text-sky-100 font-medium rounded-lg transition-colors"
        >
          Download Widget APK
        </a>

        <ol className="mt-3 space-y-1.5 text-xs text-white/55 list-decimal list-inside">
          <li>
            Tap <span className="text-white/80">Download Widget APK</span> on your phone. Android
            will warn the first time about installing from an unknown source &mdash; allow Chrome
            (or your browser) to install apps, then open the APK.
          </li>
          <li>
            After install, long-press an empty spot on your home screen &rarr;{' '}
            <span className="text-white/80">Widgets</span> &rarr;{' '}
            <span className="text-white/80">Castle &amp; Cards Weather</span>.
          </li>
          <li>
            Drag the widget&apos;s edges to resize between 2&times;2, 3&times;2, and 4&times;2.
            The layout adapts: small shows just temp + alert, large shows the full forecast strip.
          </li>
        </ol>
      </div>

      <div className="text-[11px] text-white/35 text-center">
        Both APKs are hosted on this site &mdash; auto-rebuilt by CI on every push to the Android
        code.
      </div>
    </div>
  );
}
