import { supabase } from './supabase';

// VAPID public key (URL-safe base64). Set in Vite env so it's bundled.
// The matching private key lives only on the Supabase edge function.
export const VAPID_PUBLIC_KEY = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY ?? '';

export interface PushPreferences {
  rain_incoming: boolean;
  thunderstorms: boolean;
  snow_wintry: boolean;
  severe_alerts: boolean;
  daily_forecast: boolean;
  active_rain: boolean;
  aurora_possible: boolean;
  major_flare: boolean;
  quiet_start_hour: number | null;
  quiet_end_hour: number | null;
  timezone: string;
}

export const DEFAULT_PREFS: PushPreferences = {
  rain_incoming: true,
  thunderstorms: true,
  snow_wintry: true,
  severe_alerts: true,
  daily_forecast: true,
  active_rain: false,
  aurora_possible: false,
  major_flare: false,
  quiet_start_hour: null,
  quiet_end_hour: null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago',
};

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
}

// Subscribe the device to push and persist the subscription on Supabase.
export async function subscribePush(): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: 'Push not supported on this device.' };
  if (!VAPID_PUBLIC_KEY)
    return { ok: false, error: 'VITE_VAPID_PUBLIC_KEY env var not set in the build.' };

  try {
    const reg = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, error: `Permission ${permission}.` };
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const json = sub.toJSON();
    const endpoint = json.endpoint!;
    const p256dh = (json.keys as any)?.p256dh;
    const auth = (json.keys as any)?.auth;
    const ua = navigator.userAgent.slice(0, 200);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return { ok: false, error: 'Not signed in.' };

    const { error } = await supabase
      .from('weather_push_subscriptions')
      .upsert(
        {
          user_id: userData.user.id,
          endpoint,
          p256dh,
          auth,
          user_agent: ua,
          last_seen: new Date().toISOString(),
        },
        { onConflict: 'endpoint' },
      );
    if (error) return { ok: false, error: error.message };

    // Ensure prefs row exists.
    await ensurePreferences();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

export async function unsubscribePush(): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: 'Not supported' };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await supabase.from('weather_push_subscriptions').delete().eq('endpoint', endpoint);
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

export async function loadPreferences(): Promise<PushPreferences> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return DEFAULT_PREFS;
  const { data } = await supabase
    .from('weather_push_preferences')
    .select('*')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (!data) return DEFAULT_PREFS;
  return {
    rain_incoming: data.rain_incoming,
    thunderstorms: data.thunderstorms,
    snow_wintry: data.snow_wintry,
    severe_alerts: data.severe_alerts,
    daily_forecast: data.daily_forecast,
    active_rain: data.active_rain,
    aurora_possible: data.aurora_possible,
    major_flare: data.major_flare,
    quiet_start_hour: data.quiet_start_hour,
    quiet_end_hour: data.quiet_end_hour,
    timezone: data.timezone,
  };
}

export async function ensurePreferences(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  await supabase
    .from('weather_push_preferences')
    .upsert(
      { user_id: userData.user.id, ...DEFAULT_PREFS },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );
}

export async function savePreferences(prefs: Partial<PushPreferences>): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  await supabase
    .from('weather_push_preferences')
    .upsert(
      { user_id: userData.user.id, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
}

// Sends a one-off "test" notification to your own subscriptions through
// push-send, so you can confirm everything is wired up without waiting for
// the cron.
export async function sendTestNotification(): Promise<{ ok: boolean; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: 'Not signed in' };
  const { error } = await supabase.functions.invoke('push-send', {
    body: {
      user_ids: [userData.user.id],
      alert_kind: 'test',
      alert_key: `test-${Date.now()}`,
      title: '🔔 Test notification',
      body: 'Push notifications are working.',
      url: '/weather',
      tag: 'test',
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
