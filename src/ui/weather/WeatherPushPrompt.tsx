import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { isPushSupported, isSubscribed, subscribePush } from '../../lib/pushService';

const DISMISS_KEY = 'weather-push-prompt-dismissed';

/**
 * One-tap "Enable weather alerts" banner shown at the top of the
 * weather dashboard the first time a signed-in user lands here
 * after install. Handles permission + VAPID subscribe + Supabase
 * persist all in one click via the existing pushService helpers.
 *
 * Dismissed forever once the user taps Enable or Not now.
 * Skipped when:
 *  - push isn't supported on this surface
 *  - user is already subscribed
 *  - user has tapped Not now before
 *  - user isn't signed in yet
 */
export default function WeatherPushPrompt() {
  const user = useAuthStore((s) => s.user);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      if (!isPushSupported()) return;
      if (typeof localStorage !== 'undefined' && localStorage.getItem(DISMISS_KEY)) return;
      try {
        const already = await isSubscribed();
        if (!cancelled && !already) setShow(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleEnable = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const r = await subscribePush();
      if (r.ok) {
        if (typeof localStorage !== 'undefined') localStorage.setItem(DISMISS_KEY, '1');
        setStatus('ok');
        setTimeout(() => setShow(false), 1200);
      } else {
        setStatus(r.error ?? 'Failed');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(DISMISS_KEY, '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="mb-4 bg-gradient-to-r from-sky-500/20 to-sky-500/5 border border-sky-500/40 rounded-xl p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <div className="text-2xl flex-shrink-0" aria-hidden>
          &#128276;
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">Get weather alerts on your phone</div>
          <div className="text-xs text-white/65 mt-0.5 leading-relaxed">
            {status && status !== 'ok'
              ? <span className="text-red-300">{status}</span>
              : status === 'ok'
                ? <span className="text-emerald-300">Subscribed — you&apos;ll get alerts now.</span>
                : 'One tap: severe weather, rain incoming, daily forecast, aurora alerts. You can change which categories from the Notifications panel anytime.'}
          </div>
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={handleEnable}
            disabled={busy || status === 'ok'}
            className="text-xs sm:text-sm px-3 py-1.5 bg-sky-500/50 hover:bg-sky-500/65 text-sky-50 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {busy ? '…' : status === 'ok' ? 'Enabled' : 'Enable'}
          </button>
          <button
            onClick={handleDismiss}
            disabled={busy}
            className="text-xs text-white/45 hover:text-white/70 transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
