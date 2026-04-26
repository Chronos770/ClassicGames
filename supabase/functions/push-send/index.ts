// Supabase Edge Function: push-send
//
// Generic Web Push sender. Accepts a payload + a user filter and delivers
// the notification to every active subscription for those users via the
// W3C Web Push protocol (VAPID-signed). Stale subscriptions (404/410)
// get auto-deleted.
//
// Required env vars (set via `supabase secrets set ...`):
//   VAPID_PUBLIC_KEY   - URL-safe base64 P-256 public key
//   VAPID_PRIVATE_KEY  - URL-safe base64 P-256 private key
//   VAPID_SUBJECT      - mailto: or https:// contact (default: mailto:admin@example.com)
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

// Map alert_kind → preference column name. Severe alerts always send.
const PREF_COL: Record<string, keyof PrefsRow | null> = {
  rain_incoming: 'rain_incoming',
  thunderstorms: 'thunderstorms',
  snow_wintry: 'snow_wintry',
  severe_alerts: 'severe_alerts',
  daily_forecast: 'daily_forecast',
  active_rain: 'active_rain',
  aurora_possible: 'aurora_possible',
  major_flare: 'major_flare',
  test: null, // bypass prefs, used by the test-notification button
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
  // Same-day window (e.g. 13–17): start ≤ hour < end
  if (start <= end) return hour >= start && hour < end;
  // Wrapping window (e.g. 22–7): hour ≥ start OR hour < end
  return hour >= start || hour < end;
}

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

    // Resolve target users: explicit list, or all opted-in users for this kind.
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

    // Pull preferences for those users.
    const { data: prefs } = await supabase
      .from('weather_push_preferences')
      .select('*')
      .in('user_id', candidateIds);
    const prefsByUser = new Map<string, PrefsRow>();
    for (const p of (prefs ?? []) as PrefsRow[]) prefsByUser.set(p.user_id, p);

    // Filter by per-user toggle + quiet hours.
    const sendIds: string[] = [];
    let skipped = 0;
    for (const uid of candidateIds) {
      const p = prefsByUser.get(uid);
      // No prefs row = treat as default-on for the on-by-default kinds; still
      // record the user so they get future toggles. Skip for off-by-default.
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

    // Idempotency check — skip users we've already sent this exact alert to.
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

    // Pull every subscription for the final user set.
    const { data: subs } = await supabase
      .from('weather_push_subscriptions')
      .select('*')
      .in('user_id', finalIds);

    const notifBody = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/weather',
      tag: payload.tag || payload.alert_kind,
      kind: payload.alert_kind,
    });

    let sent = 0;
    let removed = 0;
    const sentToUsers = new Set<string>();
    const errors: Array<{ statusCode: number; body: string; endpointHost: string }> = [];

    for (const sub of (subs ?? []) as any[]) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notifBody,
        );
        sent++;
        sentToUsers.add(sub.user_id);
        // Touch last_seen
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
        });
        // 404 = unknown endpoint, 410 = gone — clean up stale subs
        if (status === 404 || status === 410) {
          await supabase.from('weather_push_subscriptions').delete().eq('id', sub.id);
          removed++;
        }
        // Other errors: leave the sub alone, log and continue
      }
    }

    // Log idempotency for users we successfully reached.
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
        errors,
        // Tail of the VAPID public key so the caller can compare it to the
        // VITE_VAPID_PUBLIC_KEY their browser subscribed with — the most
        // common cause of "sent=0 with non-410 errors" is a key mismatch.
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
