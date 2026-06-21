const FULL_APP_URL = '/castle-and-cards.apk';
const WEATHER_APP_URL = '/weather-app.apk';

export default function WidgetInstallSection() {
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
              ships inside the APK and runs offline. Doesn&apos;t include the home-screen widget;
              install the Weather APK above for that.
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

      <div className="text-[11px] text-white/35 text-center">
        Hosted on this site &mdash; auto-rebuilt by CI on every push.
      </div>
    </div>
  );
}
