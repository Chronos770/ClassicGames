package com.castleandcards.weather.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.util.Log
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

class WeatherClockWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = WeatherClockWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.i(TAG, "clock onEnabled — first widget placed, kicking refresh")
        RefreshWorker.schedulePeriodic(context)
        RefreshWorker.refreshNow(context)
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        // Don't kick refreshNow here — onUpdate fires on every periodic
        // tick + every paint, and a network fetch per paint stacks up
        // latency. The periodic worker (scheduled below) + onEnabled +
        // provideGlance's self-heal cover the actual refresh needs.
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        Log.i(TAG, "clock onUpdate: ${appWidgetIds.joinToString()}")
        RefreshWorker.schedulePeriodic(context)
    }

    companion object {
        private const val TAG = "WeatherClockWidget"
    }
}
