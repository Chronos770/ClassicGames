package com.castleandcards.weather.widget

import android.content.Context
import android.util.Log
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.updateAll

private const val NUM_PAGES = 4
private const val TAG = "WeatherMultiWidget"

private suspend fun advance(context: Context, delta: Int) {
    val current = WeatherRepo.multiPage(context)
    // Modulo math that handles negatives — Kotlin's % can return
    // negative values for negative operands.
    val next = ((current + delta) % NUM_PAGES + NUM_PAGES) % NUM_PAGES
    Log.i(TAG, "page nav: $current -> $next (delta=$delta)")
    WeatherRepo.setMultiPage(context, next)
    // Glance's updateAll is the canonical (and only sensible) repaint
    // path. The user-observed multi-second update latency comes from
    // OEM-level Background Activity restrictions / battery optimization,
    // NOT from anything we can fix here. Whitelisting the app in
    // Settings → Battery → Castle & Cards Weather → Don't optimize
    // gives normal-Latency updates.
    WeatherMultiWidget().updateAll(context)
}

/**
 * Tap action for the ◀ button. Two separate classes (PrevPage /
 * NextPage) instead of one with an ActionParameters delta — the
 * parameter-passing path through actionRunCallback can fail silently
 * with no error in Logcat when params don't round-trip. Two classes
 * dodges the question entirely.
 */
class PrevPageActionCallback : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        advance(context, -1)
    }
}

class NextPageActionCallback : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        advance(context, 1)
    }
}
