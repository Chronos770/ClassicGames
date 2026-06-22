// Supabase Edge Function: push-send
//
// Dual-transport push sender:
//   - Web Push (VAPID-signed) for browser subscriptions (the historical path)
//   - FCM HTTP v1 for native Android subscriptions (Capacitor weather app)
//
// Routing is based on the `endpoint` column on weather_push_subscriptions:
//   - `fcm:<token>` → FCM HTTP v1
//   - anything else → Web Push
//
// Stale subscriptions (404/410 for Web Push; UNREGISTERED/INVALID for FCM)
// get auto-deleted on the next send attempt.
//
// Required env vars (set via `supabase secrets set ...`):
//   VAPID_PUBLIC_KEY     - URL-safe base64 P-256 public key (web push)
//   VAPID_PRIVATE_KEY    - URL-safe base64 P-256 private key (web push)
//   VAPID_SUBJECT        - mailto: or https:// contact (default: mailto:admin@example.com)
//   FCM_SERVICE_ACCOUNT  - the full JSON contents of a Firebase service-account key
//                          (optional — if absent, FCM rows just get logged as errors,
//                           Web Push subscribers still get notified)
//
// Request body:
//   { user_ids?: string[],          // if omitted, broadcasts to all subscribers
//     alert_kind: string,           // e.g. 'rain_incoming', 'daily_forecast'
//     alert_key: string,            // idempotency key — won't double-send same key per user
//     title: string,
//     body: string,
//     url?: string,                 // path to open when notification is clicked
//     tag?: string,                 // OS-level group key
//     bypass_quiet_hours?: boolean  // set true for severe alerts
//   }

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import webpush from 'npm:web-push@3.6.7';
import { GoogleAuth } from 'npm:google-auth-library@9.14.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface PushPayload {
  user_ids?: string[];
  alert_kind: string;
  alert_key: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  bypass_quiet_hours?: boolean;
}

interface PrefsRow {
  user_id: string;
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

const PREF_COL: Record<string, keyof PrefsRow | null> = {
  rain_incoming: 'rain_incoming',
  thunderstorms: 'thunderstorms',
  snow_wintry: 'snow_wintry',
  severe_alerts: 'severe_alerts',
  daily_forecast: 'daily_forecast',
  active_rain: 'active_rain',
  aurora_possible: 'aurora_possible',
  major_flare: 'major_flare',
  test: null,
};

function inQuietHours(prefs: PrefsRow): boolean {
  if (prefs.quiet_start_hour === null || prefs.quiet_end_hour === null) return false;
  let hour: number;
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: prefs.timezone || 'America/Chicago',
      hour: 'numeric',
      hour12: false,
    });
    hour = Number(fmt.format(new Date()));
  } catch {
    hour = new Date().getHours();
  }
  const start = prefs.quiet_start_hour;
  const end = prefs.quiet_end_hour;
  if (start <= end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

// ── FCM HTTP v1 plumbing ──────────────────────────────────────────────
// Cached so a single function instance can fan out many notifications
// without re-signing the service-account JWT for each one.
let fcmAccessTokenCache: { token: string; expiresAt: number } | null = null;
let fcmProjectIdCache: string | null = null;

async function getFcmAccessToken(): Promise<{ token: string; projectId: string } | null> {
  const raw = Deno.env.get('FCM_SERVICE_ACCOUNT');
  if (!raw) return null;
  if (
    fcmAccessTokenCache &&
    fcmProjectIdCache &&
    fcmAccessTokenCache.expiresAt > Date.now() + 30_000
  ) {
    return { token: fcmAccessTokenCache.token, projectId: fcmProjectIdCache };
  }
  let credentials: any;
  try {
    credentials = JSON.parse(raw);
  } catch (e) {
    console.error('FCM_SERVICE_ACCOUNT is not valid JSON:', (e as Error).message);
    return null;
  }
  if (!credentials.project_id || !credentials.private_key || !credentials.client_email) {
    console.error('FCM_SERVICE_ACCOUNT missing required fields');
    return null;
  }
  try {
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    const client = await auth.getClient();
    const res = await client.getAccessToken();
    if (!res?.token) {
      console.error('FCM token mint returned empty token');
      return null;
    }
    fcmAccessTokenCache = {
      token: res.token,
      // google-auth-library populates res.res with the raw response; fall back to a safe TTL.
      expiresAt: Date.now() + 50 * 60_000, // 50 min — tokens last 1h
    };
    fcmProjectIdCache = credentials.project_id;
    return { token: res.token, projectId: credentials.project_id };
  } catch (e) {
    console.error('FCM auth failed:', (e as Error).message);
    return null;
  }
}

interface FcmSendResult {
  ok: boolean;
  status: number;
  body: string;
  errorCode?: string;
}

async function fcmSend(
  token: string,
  fcmAccessToken: string,
  projectId: string,
  notif: { title: string; body: string; url: string; tag: string; kind: string },
): Promise<FcmSendResult> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const payload = {
    message: {
      token,
      notification: { title: notif.title, body: notif.body },
      // String values only in `data` — FCM stringifies everything anyway.
      data: { url: notif.url, tag: notif.tag, kind: notif.kind },
      android: {
        priority: 'HIGH',
        notification: {
          channel_id: 'weather',
          icon: 'ic_stat_notify',
          color: '#0EA5E9',
          tag: notif.tag,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
    },
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${fcmAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  if (resp.ok) return { ok: true, status: resp.status, body: text };
  let errorCode: string | undefined;
  try {
    const parsed = JSON.parse(text);
    errorCode = parsed?.error?.details?.[0]?.errorCode ?? parsed?.error?.status;
  } catch {
    /* ignore */
  }
  return { ok: false, status: resp.status, body: text.slice(0, 400), errorCode };
}

// ── Web Push plumbing ─────────────────────────────────────────────────

function isFcmEndpoint(endpoint: string): boolean {
  return typeof endpoint === 'string' && endpoint.startsWith('fcm:');
}

function fcmTokenFromEndpoint(endpoint: string): string {
  return endpoint.slice('fcm:'.length);
}

// ── Handler ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const vapidPub = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPriv = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';

    if (!supabaseUrl || !serviceKey || !vapidPub || !vapidPriv) {
      return new Response(
        JSON.stringify({ error: 'Missing required env vars (SUPABASE_*, VAPID_*)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPub, vapidPriv);

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const payload = (await req.json()) as PushPayload;
    if (!payload?.alert_kind || !payload?.alert_key || !payload?.title) {
      return new Response(
        JSON.stringify({ error: 'alert_kind, alert_key, and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const prefCol = PREF_COL[payload.alert_kind];

    let candidateIds: string[] = [];
    if (payload.user_ids && payload.user_ids.length) {
      candidateIds = payload.user_ids;
    } else {
      const { data: prefRows, error: prefErr } = await supabase
        .from('weather_push_preferences')
        .select('user_id');
      if (prefErr) throw prefErr;
      candidateIds = (prefRows ?? []).map((r: any) => r.user_id);
    }
    if (candidateIds.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, skipped: 0, removed: 0, reason: 'no users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: prefs } = await supabase
      .from('weather_push_preferences')
      .select('*')
      .in('user_id', candidateIds);
    const prefsByUser = new Map<string, PrefsRow>();
    for (const p of (prefs ?? []) as PrefsRow[]) prefsByUser.set(p.user_id, p);

    const sendIds: string[] = [];
    let skipped = 0;
    for (const uid of candidateIds) {
      const p = prefsByUser.get(uid);
      const defaultsOn = ['rain_incoming', 'thunderstorms', 'snow_wintry', 'severe_alerts', 'daily_forecast'];
      if (!p) {
        if (!defaultsOn.includes(payload.alert_kind) && payload.alert_kind !== 'test') {
          skipped++;
          continue;
        }
      } else if (prefCol && !p[prefCol]) {
        skipped++;
        continue;
      }
      if (p && !payload.bypass_quiet_hours && inQuietHours(p)) {
        skipped++;
        continue;
      }
      sendIds.push(uid);
    }

    if (sendIds.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, skipped, removed: 0, reason: 'all skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: alreadySent } = await supabase
      .from('weather_push_log')
      .select('user_id')
      .eq('alert_kind', payload.alert_kind)
      .eq('alert_key', payload.alert_key)
      .in('user_id', sendIds);
    const alreadySentSet = new Set((alreadySent ?? []).map((r: any) => r.user_id));
    const finalIds = sendIds.filter((id) => !alreadySentSet.has(id));

    if (finalIds.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, skipped, removed: 0, reason: 'all already sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: subs } = await supabase
      .from('weather_push_subscriptions')
      .select('*')
      .in('user_id', finalIds);

    const notif = {
      title: payload.title,
      body: payload.body,
      url: payload.url || '/weather',
      tag: payload.tag || payload.alert_kind,
      kind: payload.alert_kind,
    };
    const webNotifBody = JSON.stringify(notif);

    // Mint an FCM access token up front if any of the subscriptions
    // use the fcm: transport. Skipped (with a clear log line) if
    // FCM_SERVICE_ACCOUNT isn't configured.
    const hasFcmSubs = (subs ?? []).some((s: any) => isFcmEndpoint(s.endpoint));
    let fcmAuth: { token: string; projectId: string } | null = null;
    if (hasFcmSubs) {
      fcmAuth = await getFcmAccessToken();
      if (!fcmAuth) {
        console.warn('Have FCM subscriptions but no FCM_SERVICE_ACCOUNT secret; skipping FCM fanout');
      }
    }

    let sent = 0;
    let removed = 0;
    const sentToUsers = new Set<string>();
    const errors: Array<{ statusCode: number; body: string; endpointHost: string; transport: string }> = [];

    for (const sub of (subs ?? []) as any[]) {
      // FCM transport
      if (isFcmEndpoint(sub.endpoint)) {
        if (!fcmAuth) {
          errors.push({
            statusCode: 0,
            body: 'FCM_SERVICE_ACCOUNT not configured',
            endpointHost: 'fcm',
            transport: 'fcm',
          });
          continue;
        }
        const token = fcmTokenFromEndpoint(sub.endpoint);
        const r = await fcmSend(token, fcmAuth.token, fcmAuth.projectId, notif);
        if (r.ok) {
          sent++;
          sentToUsers.add(sub.user_id);
          await supabase
            .from('weather_push_subscriptions')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', sub.id);
        } else {
          errors.push({
            statusCode: r.status,
            body: r.body,
            endpointHost: 'fcm',
            transport: 'fcm',
          });
          // FCM v1 returns 404 with code UNREGISTERED when the token
          // has been retired (app uninstalled, FCM rotated, etc.).
          // 400 INVALID_ARGUMENT covers malformed tokens. Both safe to delete.
          const dead =
            r.status === 404 ||
            r.errorCode === 'UNREGISTERED' ||
            r.errorCode === 'INVALID_ARGUMENT';
          if (dead) {
            await supabase.from('weather_push_subscriptions').delete().eq('id', sub.id);
            removed++;
          }
        }
        continue;
      }

      // Web Push transport (original path)
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          webNotifBody,
        );
        sent++;
        sentToUsers.add(sub.user_id);
        await supabase
          .from('weather_push_subscriptions')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', sub.id);
      } catch (err: any) {
        const status = err?.statusCode ?? 0;
        let endpointHost = '';
        try {
          endpointHost = new URL(sub.endpoint).host;
        } catch {
          /* ignore */
        }
        errors.push({
          statusCode: status,
          body: String(err?.body ?? err?.message ?? err).slice(0, 400),
          endpointHost,
          transport: 'webpush',
        });
        const isDeadHost = endpointHost === 'permanently-removed.invalid';
        if (status === 404 || status === 410 || isDeadHost) {
          await supabase.from('weather_push_subscriptions').delete().eq('id', sub.id);
          removed++;
        }
      }
    }

    if (sentToUsers.size > 0) {
      const logRows = [...sentToUsers].map((uid) => ({
        user_id: uid,
        alert_kind: payload.alert_kind,
        alert_key: payload.alert_key,
      }));
      await supabase.from('weather_push_log').upsert(logRows, {
        onConflict: 'user_id,alert_kind,alert_key',
        ignoreDuplicates: true,
      });
    }

    return new Response(
      JSON.stringify({
        sent,
        skipped,
        removed,
        users_targeted: finalIds.length,
        users_reached: sentToUsers.size,
        subs_found: (subs ?? []).length,
        fcm_subs: (subs ?? []).filter((s: any) => isFcmEndpoint(s.endpoint)).length,
        web_subs: (subs ?? []).filter((s: any) => !isFcmEndpoint(s.endpoint)).length,
        fcm_configured: !!fcmAuth,
        errors,
        vapid_pub_tail: vapidPub.slice(-12),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: String(err),
        stack: err instanceof Error ? err.stack : null,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
