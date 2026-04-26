import { useEffect, useState } from 'react';
import {
  DEFAULT_PREFS,
  isPushSupported,
  isSubscribed,
  loadPreferences,
  savePreferences,
  sendTestNotification,
  subscribePush,
  unsubscribePush,
  VAPID_PUBLIC_KEY,
  type PushPreferences,
} from '../../lib/pushService';

const TOGGLES: { key: keyof PushPreferences; label: string; help: string; defaultOn: boolean }[] = [
  { key: 'rain_incoming', label: 'Rain incoming', help: 'Rain ≥ 50% likely in the next 24 hours.', defaultOn: true },
  { key: 'thunderstorms', label: 'Thunderstorms', help: 'Storms in the forecast within 24 hours.', defaultOn: true },
  { key: 'snow_wintry', label: 'Snow / wintry mix', help: 'Snow, sleet, freezing rain in the forecast.', defaultOn: true },
  { key: 'severe_alerts', label: 'Severe NWS alerts', help: 'Severe or Extreme NWS alerts. Bypasses quiet hours.', defaultOn: true },
  { key: 'daily_forecast', label: 'Daily forecast at 5 AM', help: 'Quick summary of today every morning.', defaultOn: true },
  { key: 'active_rain', label: 'Rain at your station', help: 'Pings when your sensor detects rain.', defaultOn: false },
  { key: 'aurora_possible', label: 'Aurora possible', help: 'Kp index ≥ 5 — auroras may be visible.', defaultOn: false },
  { key: 'major_flare', label: 'Major solar flare', help: 'M-class or stronger X-ray flare.', defaultOn: false },
];

export default function PushSettings() {
  const [supported] = useState(isPushSupported);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [prefs, setPrefs] = useState<PushPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setSubscribed(await isSubscribed());
    setPermission(typeof Notification !== 'undefined' ? Notification.permission : 'denied');
    setPrefs(await loadPreferences());
    setLoading(false);
  };
  useEffect(() => {
    refresh();
  }, []);

  const flash = (m: string) => {
    setMsg(m);
    // No auto-dismiss — error messages were vanishing before they could
    // be read on mobile. The user can clear them with the × button.
  };

  const handleEnable = async () => {
    setBusy(true);
    setMsg(null);
    const r = await subscribePush();
    setBusy(false);
    if (r.ok) {
      flash('Notifications enabled.');
      await refresh();
    } else {
      flash(r.error ?? 'Enable failed.');
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    const r = await unsubscribePush();
    setBusy(false);
    if (r.ok) {
      flash('Notifications disabled.');
      await refresh();
    } else {
      flash(r.error ?? 'Disable failed.');
    }
  };

  const handleTest = async () => {
    setBusy(true);
    // Re-check OS-level permission first — Android sometimes silently revokes
    // notification permission for an installed PWA without changing the push
    // subscription, so the server send "succeeds" but nothing ever fires.
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      setBusy(false);
      flash(`Permission is "${Notification.permission}". Re-enable notifications in browser/OS settings.`);
      return;
    }
    const r = await sendTestNotification();
    setBusy(false);
    if (r.ok) {
      flash(
        `Sent — ${r.sent} push${r.sent === 1 ? '' : 'es'} delivered. If nothing appears, check the OS notification settings for this app.`,
      );
    } else {
      flash(`Test failed: ${r.error}`);
    }
  };

  const togglePref = async (key: keyof PushPreferences, value: boolean | number | null) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await savePreferences({ [key]: value } as Partial<PushPreferences>);
  };

  if (!supported) {
    return (
      <div className="bg-slate-900/70 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-sm text-white/60">
        This browser doesn't support push notifications.
        {typeof window !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent) && (
          <p className="text-[11px] text-white/40 mt-2">
            On iOS, push works only when this site is installed via "Add to Home Screen"
            (iOS 16.4+).
          </p>
        )}
      </div>
    );
  }

  if (!VAPID_PUBLIC_KEY) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200/80 rounded-xl p-4 text-sm">
        VAPID_PUBLIC_KEY isn't configured. Set <code className="font-mono">VITE_VAPID_PUBLIC_KEY</code> in the
        Vercel environment and redeploy.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/70 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-semibold text-white">Push notifications</div>
            <div className="text-[11px] text-white/50 mt-0.5">
              {loading
                ? 'Checking…'
                : subscribed
                ? 'Enabled on this device'
                : permission === 'denied'
                ? 'Permission denied — enable in your browser settings'
                : 'Disabled'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {subscribed ? (
              <>
                <button
                  onClick={handleTest}
                  disabled={busy}
                  className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg border border-white/10 transition-colors disabled:opacity-40"
                >
                  Send test
                </button>
                <button
                  onClick={handleDisable}
                  disabled={busy}
                  className="text-xs px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 rounded-lg transition-colors disabled:opacity-40"
                >
                  Disable
                </button>
              </>
            ) : (
              <button
                onClick={handleEnable}
                disabled={busy || permission === 'denied'}
                className="text-sm px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors disabled:opacity-40"
              >
                {busy ? 'Enabling…' : 'Enable notifications'}
              </button>
            )}
          </div>
        </div>
        {msg && (
          <div className="mt-3 flex items-start gap-2 text-xs text-white/80 bg-white/5 rounded-lg p-2.5 border border-white/10">
            <div className="flex-1 break-words">{msg}</div>
            <button
              onClick={() => setMsg(null)}
              className="text-white/40 hover:text-white/80 leading-none px-1 -mt-0.5 text-base"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {subscribed && (
        <>
          <div className="bg-slate-900/70 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">
              What to alert me about
            </div>
            <div className="space-y-2">
              {TOGGLES.map((t) => {
                const on = !!prefs[t.key];
                return (
                  <label
                    key={t.key}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => togglePref(t.key, e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-amber-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white">{t.label}</div>
                      <div className="text-[11px] text-white/45 mt-0.5">{t.help}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900/70 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">
              Quiet hours
            </div>
            <p className="text-[11px] text-white/50 mb-3">
              Don't ping me between these hours. Severe alerts always send.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-xs text-white/70">
                From
                <select
                  value={prefs.quiet_start_hour ?? ''}
                  onChange={(e) =>
                    togglePref('quiet_start_hour', e.target.value === '' ? null : Number(e.target.value))
                  }
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-white text-xs"
                >
                  <option value="">— off —</option>
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {h}:00
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-white/70">
                Until
                <select
                  value={prefs.quiet_end_hour ?? ''}
                  onChange={(e) =>
                    togglePref('quiet_end_hour', e.target.value === '' ? null : Number(e.target.value))
                  }
                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-white text-xs"
                >
                  <option value="">— off —</option>
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {h}:00
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
