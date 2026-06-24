package com.castleandcards.weather.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.util.Log
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

class WeatherClockCompactWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = WeatherClockCompactWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.i(TAG, "compact onEnabled — first widget placed, kicking refresh")
        RefreshWorker.schedulePeriodic(context)
        RefreshWorker.refreshNow(context)
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        Log.i(TAG, "compact onUpdate: ${appWidgetIds.joinToString()}")
        RefreshWorker.schedulePeriodic(context)
    }

    companion object {
        private const val TAG = "WeatherClockCompactWidget"
    }
}
