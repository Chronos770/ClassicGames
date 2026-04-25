# push-send — deploy steps

Edge function that delivers Web Push notifications to subscribed devices.
Used by `push-tick` (cron) and the in-app "Send test" button.

## Status

- [x] Source committed: `supabase/functions/push-send/index.ts`
- [x] Migration ran: `supabase/migrations/010_weather_push.sql`
- [ ] **VAPID keys generated and set as secrets**
- [ ] **Function deployed**

## VAPID keys (one-time)

The function authenticates pushes with a VAPID key pair (public + private,
P-256 ECDSA). Generate once and store as Supabase secrets.

### Generate

Easiest options:
1. **Online generator**: https://vapidkeys.com (zero-install, you get both keys instantly)
2. **CLI** (if you have node): `npx web-push generate-vapid-keys`
3. **OpenSSL** (advanced): see https://www.npmjs.com/package/web-push#command-line

You'll get:
- A **public key** (URL-safe base64, ~88 chars) — goes in the browser bundle
- A **private key** (URL-safe base64, ~43 chars) — never leaves the server

### Store on Supabase

Project Settings → Edge Functions → Secrets, or via CLI:

```sh
supabase secrets set \
  VAPID_PUBLIC_KEY=<paste public key> \
  VAPID_PRIVATE_KEY=<paste private key> \
  VAPID_SUBJECT="mailto:you@example.com"
```

### Store on Vercel

Vercel Project Settings → Environment Variables (Production + Preview):

```
VITE_VAPID_PUBLIC_KEY=<same public key>
```

The public key needs the `VITE_` prefix so it's bundled with the client.

## Deploy

### Dashboard (recommended for first deploy)
1. Edge Functions → "Deploy a new function"
2. Name: `push-send`
3. Paste the entire contents of `supabase/functions/push-send/index.ts`
4. **Verify JWT: OFF** (matches the other proxies; the function does its own auth via service role for upserts)
5. Deploy

### Supabase MCP
Use the deploy tool with name `push-send`, source from this file, `verify_jwt: false`.

### CLI
```sh
supabase functions deploy push-send --project-ref <ref>
```

## Verify

In the app, go to Station tab → Notifications → Enable. Once subscribed,
click "Send test". You should receive a notification immediately. If not,
check Functions → push-send → Logs.

## Rollback

`supabase functions delete push-send` and remove the VAPID secrets.
