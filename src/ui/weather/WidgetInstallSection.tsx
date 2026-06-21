const FULL_APP_URL = '/castle-and-cards.apk';
const WIDGET_URL = '/weather-widget.apk';

export default function WidgetInstallSection() {
  return (
    <div className="space-y-4">
      {/* Full app — WebView wrapper around castleandcards.com */}
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
              Native APK that opens the whole site in a fullscreen Chromium shell &mdash; the same
              experience as &ldquo;Add to Home Screen&rdquo; but installs like a real app and shows up
              in the launcher. Initial iteration: this is a thin WebView wrapper; native push and
              offline are limited.
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
