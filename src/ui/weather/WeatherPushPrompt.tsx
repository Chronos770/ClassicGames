import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { isPushSupported, isSubscribed, subscribePush } from '../../lib/pushService';
import { isNativeApp, registerNativePush } from '../../lib/nativeApp';

const DISMISS_KEY = 'weather-push-prompt-dismissed';

type Reason =
  | 'subscribed'
  | 'no-user'
  | 'unsupported-sw'
  | 'unsupported-pm'
  | 'unsupported-n'
  | 'dismissed'
  | 'ready';

function inspect(): Reason {
  if (typeof window === 'undefined') return 'unsupported-sw';
  // Native (Capacitor) goes through FCM, not Web Push — none of these
  // browser APIs need to exist for native push to work.
  if (isNativeApp()) return 'ready';
  if (!('serviceWorker' in navigator)) return 'unsupported-sw';
  if (!('PushManager' in window)) return 'unsupported-pm';
  if (!('Notification' in window)) return 'unsupported-n';
  return 'ready';
}

/**
 * "Enable weather alerts" banner shown on the weather dashboard. The
 * earlier version of this hid itself when isPushSupported() returned
 * false; that meant when the Capacitor WebView reported no PushManager
 * the user just saw nothing and couldn't tell why. Now we surface a
 * specific message in every case so they at least know what's going on.
 */
export default function WeatherPushPrompt() {
  const user = useAuthStore((s) => s.user);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [reason, setReason] = useState<Reason>('no-user');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setReason('no-user');
        setShow(false);
        return;
      }
      if (typeof localStorage !== 'undefined' && localStorage.getItem(DISMISS_KEY)) {
        setReason('dismissed');
        setShow(false);
        return;
      }
      const env = inspect();
      if (env !== 'ready') {
        // Show the banner anyway so the user gets diagnostic feedback
        // instead of mysteriously seeing nothing.
        if (!cancelled) {
          setReason(env);
          setShow(true);
        }
        return;
      }
      try {
        // Native: there's no PushManager.getSubscription equivalent we
        // can cheaply consult; show the banner once per device and let
        // the user decide. The localStorage dismiss key prevents nags.
        if (isNativeApp()) {
          if (!cancelled) {
            setReason('ready');
            setShow(true);
          }
          return;
        }
        const already = await isSubscribed();
        if (cancelled) return;
        if (already) {
          setReason('subscribed');
          setShow(false);
          return;
        }
        setReason('ready');
        setShow(true);
      } catch {
        setReason('ready');
        setShow(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleEnable = async () => {
    if (reason !== 'ready') return;
    setBusy(true);
    setStatus(null);
    try {
      // Native: register with FCM and persist the token. Web: VAPID
      // subscribe through the service worker.
      const r = isNativeApp() ? await registerNativePush() : await subscribePush();
      if (r.ok) {
        if (typeof localStorage !== 'undefined') localStorage.setItem(DISMISS_KEY, '1');
        setStatus('ok');
        setTimeout(() => setShow(false), 1500);
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

  const supported = reason === 'ready';
  const body =
    status && status !== 'ok'
      ? status
      : status === 'ok'
        ? "Subscribed — you'll get alerts now."
        : reason === 'unsupported-sw'
          ? "This WebView doesn't expose Service Workers, so web push can't subscribe here. Open the site in Chrome on this phone and enable from there, or set up native push (FCM)."
          : reason === 'unsupported-pm'
            ? "This WebView is missing the Push API. Update Android System WebView from the Play Store, or use native push (FCM)."
            : reason === 'unsupported-n'
              ? 'This device does not expose the Notification API.'
              : 'One tap: severe weather, rain incoming, daily forecast, aurora alerts. Change categories anytime in the Notifications panel.';

  const bodyClass =
    status && status !== 'ok'
      ? 'text-red-300'
      : status === 'ok'
        ? 'text-emerald-300'
        : !supported
          ? 'text-amber-200'
          : 'text-white/65';

  return (
    <div className="mb-4 bg-gradient-to-r from-sky-500/20 to-sky-500/5 border border-sky-500/40 rounded-xl p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <div className="text-2xl flex-shrink-0" aria-hidden>
          &#128276;
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">
            {supported ? 'Get weather alerts on your phone' : 'Push notifications unavailable'}
          </div>
          <div className={`text-xs mt-0.5 leading-relaxed ${bodyClass}`}>{body}</div>
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          {supported && (
            <button
              onClick={handleEnable}
              disabled={busy || status === 'ok'}
              className="text-xs sm:text-sm px-3 py-1.5 bg-sky-500/50 hover:bg-sky-500/65 text-sky-50 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {busy ? '…' : status === 'ok' ? 'Enabled' : 'Enable'}
            </button>
          )}
          <button
            onClick={handleDismiss}
            disabled={busy}
            className="text-xs text-white/45 hover:text-white/70 transition-colors"
          >
            {supported ? 'Not now' : 'Dismiss'}
          </button>
        </div>
      </div>
      {!supported && (
        <div className="mt-2 text-[10px] text-white/40">
          Debug: reason=<code>{reason}</code>, SW=
          {typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? '✓' : '✗'}, PM=
          {typeof window !== 'undefined' && 'PushManager' in window ? '✓' : '✗'}, N=
          {typeof window !== 'undefined' && 'Notification' in window ? '✓' : '✗'}
        </div>
      )}
    </div>
  );
}

// Helper for any other code that wants to surface "are we able to push from
// this surface" without re-implementing the checks.
export { isPushSupported };
