package com.castleandcards.weather.widget

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity

/**
 * Single-purpose activity: bounce immediately to the PWA URL configured
 * in widget_config.xml. We exist mostly so the launcher has something
 * to show in the app drawer — taps on the widget surface itself use
 * the same intent without going through this activity.
 */
class LaunchActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val url = getString(R.string.pwa_url)
        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        })
        finish()
    }
}
