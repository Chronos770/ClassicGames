package com.castleandcards.weather.widget

import android.content.Context
import android.util.Log
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback

/**
 * Action invoked from the widget's Retry button. Just enqueues an
 * immediate refresh — the worker handles the actual fetch and the
 * widget will re-render through GlanceAppWidget.updateAll on completion.
 */
class RetryActionCallback : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        Log.i("WeatherWidget", "Retry tapped")
        RefreshWorker.refreshNow(context)
    }
}
