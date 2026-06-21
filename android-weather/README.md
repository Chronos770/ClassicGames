# Castle & Cards Weather — Native Android app

Weather-only Capacitor app, sibling to `android-app/` (the full site).
Same web bundle, same plugins, but a different `applicationId`, icon,
splash, theme, and a forced redirect to `/weather?pwa=weather` on
launch so React Router lands on the dashboard and the existing
`useIsWeatherPwa()` hook hides the Castle & Cards header.

## What's different from `android-app/`

| | full app (`com.castleandcards.app`) | weather app (`com.castleandcards.weather`) |
|---|---|---|
| Start path | `/` (home) | `/weather?pwa=weather` |
| Launcher icon | Capacitor default | Cloud + lightning bolt vector |
| Splash | Slate background, default Capacitor logo | Slate background, animated weather icon (Android 12+) |
| Theme accent | Amber `#F59E0B` | Sky `#0EA5E9` |
| Notification channel | inherits FCM default | Dedicated `weather` channel + matching small icon |
| Deep links | All of `castleandcards.com` | `castleandcards.com/weather*` only |

## How CI builds it

`.github/workflows/widget-apk.yml` runs `npx cap sync android` against
`android-app/` (the single source of truth for the web bundle and
plugin config), then mirrors `app/src/main/assets/` and the cordova
plugin shim into `android-weather/` before invoking
`./gradlew :app:assembleDebug` here. The two APKs are built from the
same Vite output but with different Android wrappers.

## Notification icon

Drawable `ic_stat_notify` is the flat-white silhouette FCM uses for
status-bar notifications. The `<meta-data>` entries in the manifest
tell Firebase to use it + the sky-blue accent color when push messages
don't include their own icon.

## Native push (TODO)

Same Firebase setup as `android-app/README.md`, but the package name to
register in Firebase is `com.castleandcards.weather`. Drop
`google-services.json` into `android-weather/app/`.

## Build locally

```bash
npm ci
npm run build
npx cap sync android

# Mirror to weather variant — CI does this automatically.
cp -r android-app/app/src/main/assets/public android-weather/app/src/main/assets/public
cp android-app/app/src/main/assets/capacitor.config.json android-weather/app/src/main/assets/
cp android-app/app/src/main/assets/capacitor.plugins.json android-weather/app/src/main/assets/

cd android-weather
./gradlew :app:assembleDebug
```

Output at `app/build/outputs/apk/debug/app-debug.apk`.
