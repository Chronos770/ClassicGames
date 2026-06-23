package com.castleandcards.weather.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
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

    // Two parallel paths to nudge the launcher into repainting:
    //
    //  1. Glance's updateAll — this is the canonical path; recomposes
    //     and sends new RemoteViews to AppWidgetManager. But it goes
    //     through Glance's SessionManager which uses WorkManager
    //     internally, and some launchers / OEM battery managers
    //     defer that work by 10-30 seconds.
    //
    //  2. A direct APPWIDGET_UPDATE broadcast targeted at our own
    //     receiver. The system delivers it synchronously to onUpdate
    //     in the same process, which then triggers Glance's render
    //     path with normal-priority dispatching. On launchers that
    //     debounce updateAll, this kicks them harder to repaint now.
    runCatching {
        val awm = AppWidgetManager.getInstance(context)
        val component = ComponentName(context, WeatherMultiWidgetReceiver::class.java)
        val ids = awm.getAppWidgetIds(component)
        if (ids.isNotEmpty()) {
            val intent = Intent(context, WeatherMultiWidgetReceiver::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            }
            context.sendBroadcast(intent)
        }
    }.onFailure { Log.w(TAG, "broadcast update failed: ${it.message}") }

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
