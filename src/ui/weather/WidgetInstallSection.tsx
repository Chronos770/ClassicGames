const APK_URL = '/weather-widget.apk';

export default function WidgetInstallSection() {
  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="text-2xl flex-shrink-0">&#128241;</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">Android home-screen widget</div>
          <div className="text-xs text-white/60 mt-0.5 leading-relaxed">
            A 4&times;2 widget that mirrors this dashboard&apos;s hero: current temp, feels-like,
            a 5-day strip, and an alert glyph when NWS issues anything. Refreshes every 15 minutes
            in the background; tap it to open this PWA.
          </div>
        </div>
      </div>

      <a
        href={APK_URL}
        download="weather-widget.apk"
        className="block w-full text-center text-sm px-3 py-2.5 bg-sky-500/30 hover:bg-sky-500/40 text-sky-100 font-medium rounded-lg transition-colors"
      >
        Download APK
      </a>

      <ol className="mt-3 space-y-1.5 text-xs text-white/55 list-decimal list-inside">
        <li>
          Tap <span className="text-white/80">Download APK</span> on your phone.
          Android will warn the first time about installing from an unknown source &mdash; allow Chrome
          (or your browser) to install apps, then open the APK.
        </li>
        <li>
          After install, long-press an empty spot on your home screen &rarr;{' '}
          <span className="text-white/80">Widgets</span> &rarr;{' '}
          <span className="text-white/80">Castle &amp; Cards Weather</span>.
        </li>
        <li>
          First paint says &ldquo;Loading&hellip;&rdquo; for a few seconds while the background worker fetches.
        </li>
      </ol>

      <div className="mt-3 text-[11px] text-white/35">
        Hosted on this site &mdash; auto-rebuilt by CI on every widget code change.
      </div>
    </div>
  );
}
