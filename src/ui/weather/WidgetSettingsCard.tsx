import { useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';

const KEY_BG_ALPHA = 'widget_bg_alpha';
const DEFAULT_BG_ALPHA = 0.85;

/**
 * Settings card for the bundled Android home-screen widget. Currently
 * exposes transparency; structured to grow into a fuller settings
 * surface (theme, default page, refresh interval) later.
 *
 * Storage: @capacitor/preferences (SharedPreferences-backed on Android).
 * The widget's Kotlin code reads the same SharedPreferences file
 * ("CapacitorStorage") via WeatherRepo.widgetBgAlpha — no custom
 * bridge plugin needed.
 *
 * Shown to everyone (the website too) since the settings are
 * actionable as soon as someone installs the app. The page just shows
 * them what the widget would look like at that opacity.
 */
export default function WidgetSettingsCard() {
  const [alpha, setAlpha] = useState<number>(DEFAULT_BG_ALPHA);
  const [loaded, setLoaded] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    (async () => {
      const { value } = await Preferences.get({ key: KEY_BG_ALPHA });
      const parsed = value ? Number(value) : NaN;
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
        setAlpha(parsed);
      }
      setLoaded(true);
    })();
  }, []);

  const persist = async (next: number) => {
    setAlpha(next);
    await Preferences.set({ key: KEY_BG_ALPHA, value: String(next) });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1500);
  };

  const pct = Math.round(alpha * 100);

  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="text-2xl flex-shrink-0">&#9881;&#65039;</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">Widget settings</div>
          <div className="text-xs text-white/55 mt-0.5 leading-relaxed">
            Tweak how the home-screen widget renders. Changes apply on the next widget refresh
            (within 15 min, or when you reopen the app).
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Background transparency */}
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <label htmlFor="widget-alpha" className="text-xs text-white/80 font-medium">
              Background transparency
            </label>
            <div className="text-xs text-white/55 font-mono">{pct}% opaque</div>
          </div>

          {/* Live preview chip */}
          <div className="relative h-12 rounded-lg mb-2 overflow-hidden border border-white/10 bg-gradient-to-br from-sky-500/40 to-emerald-500/30">
            <div
              className="absolute inset-2 rounded-md flex items-center px-3 text-xs text-white/90 font-mono"
              style={{ backgroundColor: `rgba(16, 22, 38, ${alpha})` }}
            >
              72° &middot; Sample widget chrome
            </div>
          </div>

          <input
            id="widget-alpha"
            type="range"
            min={0}
            max={100}
            step={5}
            value={pct}
            onChange={(e) => setAlpha(Number(e.target.value) / 100)}
            onMouseUp={() => persist(alpha)}
            onTouchEnd={() => persist(alpha)}
            disabled={!loaded}
            className="w-full accent-sky-400 disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] text-white/40 mt-0.5">
            <span>Transparent</span>
            <span>Solid</span>
          </div>
        </div>

        {savedFlash && (
          <div className="text-xs text-emerald-300/85">
            Saved &mdash; new value picks up at next widget refresh.
          </div>
        )}
      </div>

      <div className="mt-3 text-[11px] text-white/40">
        Stored locally on this device via Capacitor Preferences. The widget&apos;s Kotlin code
        reads the same SharedPreferences file at render time.
      </div>

      {/* Battery-saver call-out. Many Android OEMs (Samsung One UI,
          MIUI, OxygenOS, Huawei EMUI) put apps in a Restricted/Background
          Activity mode by default which batches widget updates into
          multi-minute windows. Symptom: changes to settings here can
          take many minutes to apply to the widget. */}
      <details className="mt-3 group">
        <summary className="cursor-pointer text-xs text-amber-200/80 hover:text-amber-100 select-none">
          Widget taps feel slow? (battery optimization)
        </summary>
        <div className="mt-2 text-xs text-white/65 leading-relaxed space-y-2 border-l border-amber-500/30 pl-3">
          <p>
            By default Android puts most apps in a battery-saver mode that batches widget updates
            into windows of several minutes. The arrow taps still register instantly &mdash; the
            visual repaint just gets deferred.
          </p>
          <p>
            <strong className="text-white/85">Fix:</strong> Settings &rarr; Apps &rarr;{' '}
            <em>Castle &amp; Cards Weather</em> &rarr; Battery &rarr; switch from{' '}
            <em>Optimized</em> / <em>Restricted</em> to <em>Unrestricted</em> (Samsung calls this
            &ldquo;Never sleeping apps&rdquo;; Xiaomi calls it &ldquo;No restrictions&rdquo;; some
            OEMs add an extra &ldquo;Autostart&rdquo; toggle in App info).
          </p>
          <p className="text-white/45">
            Tradeoff: marginally more battery use. With a 15-min widget refresh interval the
            difference is negligible (&lt;1%/day in our testing).
          </p>
        </div>
      </details>
    </div>
  );
}
