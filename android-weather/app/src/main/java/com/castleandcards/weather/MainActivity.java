package com.castleandcards.weather;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/**
 * Weather-only variant of the Castle & Cards Android app. Same web
 * bundle as the full app — different applicationId and a forced
 * navigation to /weather?pwa=weather on launch, which both:
 *   1. Lands React Router directly on the Weather dashboard.
 *   2. Trips useIsWeatherPwa() so the Castle & Cards chrome
 *      (top nav, sign-in widgets) is hidden — the user sees a
 *      pure weather app, not the games hub with a weather tab.
 */
public class MainActivity extends BridgeActivity {

    private static final String WEATHER_CHANNEL_ID = "weather";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Register the notification channel up front so FCM pushes
        // route to it instead of an "Other" / Misc bucket.
        ensureWeatherChannel();

        // Reroute the WebView to weather-PWA mode. Capacitor's default
        // load points at "/" with no query string; this replaces it
        // with "/weather?pwa=weather" before the first paint.
        getBridge().getWebView().loadUrl("https://localhost/weather?pwa=weather");
    }

    private void ensureWeatherChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm =
            (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(
            WEATHER_CHANNEL_ID,
            getString(R.string.notification_channel_weather),
            NotificationManager.IMPORTANCE_DEFAULT
        );
        ch.setDescription(getString(R.string.notification_channel_weather_description));
        ch.enableLights(true);
        ch.setLightColor(Color.parseColor("#0EA5E9"));
        ch.enableVibration(true);
        nm.createNotificationChannel(ch);
    }
}
