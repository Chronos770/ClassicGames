# Castle & Cards — Native Android app (Capacitor)

A Capacitor-based Android shell that bundles the entire web app and
loads it from local assets, so it works offline and feels like a real
installed app rather than a browser tab.

## What's wired up

- **Full app bundle**. `npm run build` produces `dist/`, then
  `npx cap sync android` copies it into
  `app/src/main/assets/public/`. The APK ships with every page,
  game, asset, and the service worker.
- **Native back button** routes through React Router (`history.back()`
  if there's a stack, else exits).
- **Dark status bar + nav bar** matched to the slate-950 brand color.
- **Splash screen** with the brand background, auto-hidden once the
  JS bundle boots (`SplashScreen.hide()` from `src/lib/nativeApp.ts`).
- **Deep links** via `<intent-filter android:autoVerify="true">` for
  `https://castleandcards.com`. (For the auto-verification to succeed
  in production you also need `/.well-known/assetlinks.json` on the
  domain — TODO before promoting beta.)
- **Network listener** logs Wi-Fi/cellular changes via Capacitor's
  Network plugin.
- **Push plugin scaffolded.** See "Native push (TODO)" below.

## Build locally

```bash
npm ci
npm run build
npx cap sync android
cd android-app
./gradlew :app:assembleDebug
```

APK lands at `app/build/outputs/apk/debug/app-debug.apk`.

## Build in CI

`.github/workflows/widget-apk.yml` does exactly the above and copies
the result to `public/castle-and-cards.apk`, which Vercel then serves
from `https://castleandcards.com/castle-and-cards.apk`. The in-app
install button (Weather → Station) points there.

## Web push vs native push

The web bundle's existing Web Push (VAPID + Supabase) flow continues to
work *inside the WebView* on most Android System WebView versions, with
two caveats:

1. WebView push routes through Chrome's FCM — meaning if Chrome itself
   is uninstalled or disabled, push notifications fail in the WebView.
2. Some OEM WebViews (older Samsung Internet builds) silently drop push
   subscriptions.

Web push from the browser tab on castleandcards.com is unaffected.

### Native push (TODO)

`src/lib/nativeApp.ts` already calls
`PushNotifications.register()` and persists the resulting FCM token as
`fcm:<token>` in `weather_push_subscriptions`. This is a no-op until
Firebase is wired up:

1. Create a Firebase project at https://console.firebase.google.com
2. Add an Android app with package name `com.castleandcards.app`
3. Download `google-services.json` and drop it at
   `android-app/app/google-services.json` (it's in the gitignore by
   default; see commented line in `app/.gitignore`)
4. Add the Google Services Gradle plugin to `app/build.gradle`:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```
5. Add the FCM Admin SDK to `supabase/functions/push-send` so it can
   send to `fcm:` endpoints in addition to Web Push endpoints
6. Add `FCM_SERVER_KEY` (or the modern HTTP-v1 service-account JSON) to
   Supabase secrets

After that, `PushNotifications.register()` produces a real FCM token
on first run, the app gets registered to the user's profile, and
push-send can fan out to both web and native subscriptions.

## Versioning

`app/build.gradle` → `versionCode` / `versionName`. Bump these by hand
for now; CI publishes a debug APK so there's no Play Store version
collision to worry about.
