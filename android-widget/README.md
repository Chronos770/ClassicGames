# Castle & Cards — Weather Widget (Android)

A native Android home-screen widget that mirrors the in-app weather hero:
current temp + feels-like, three at-a-glance metrics (precip / wind / humidity),
an alert icon when NWS issues anything for the station's lat/lon, and a 5-day
forecast row. Tapping the widget opens the PWA.

## How it works

1. The widget reads JSON from the `widget` Supabase Edge Function.
   The function combines the latest station reading with NWS forecast +
   alerts and returns a compact payload — no chatty client logic here.
2. WorkManager refreshes the payload every 15 minutes (the widget itself
   pulls the cached value from DataStore so a manual update is instant).
3. The whole layout is Jetpack Glance composables — no XML widget layout.

## Build

Prerequisites: JDK 17 and Android SDK 34 (Android Studio Hedgehog or
newer is the easy path).

1. Open `android-widget/` as an Android Studio project.
2. Edit `app/src/main/res/values/widget_config.xml`:
   - `widget_endpoint` → your deployed Supabase URL,
     e.g. `https://YOURPROJECT.supabase.co/functions/v1/widget`
   - `widget_anon_key` → your Supabase anon key
     (the Edge Function call needs an `Authorization: Bearer <anon>` header)
   - `pwa_url` → your deployed PWA URL, e.g.
     `https://YOURDOMAIN.vercel.app/weather`
   - `station_id` → optional. Leave blank to let the function pick the
     first station.
3. Build a debug APK: `./gradlew :app:assembleDebug`
   APK lands at `app/build/outputs/apk/debug/app-debug.apk`.
4. Sideload (USB debugging on): `adb install -r app/build/outputs/apk/debug/app-debug.apk`.
5. Long-press your home screen → **Widgets** → **Castle & Cards Weather**.

## Notes

- Glance widgets have hard layout constraints — no animated icons, no
  custom drawing. Weather glyphs are Unicode emoji rendered in `Text`.
  Looks fine on every modern Android launcher.
- The first paint after install will say "Loading…" until the worker's
  initial run completes (usually <5 s).
- To force a refresh from another app, send broadcast
  `com.castleandcards.weather.widget.REFRESH`.
