package com.castleandcards.weather.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.util.Log
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

class WeatherMultiWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = WeatherMultiWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.i(TAG, "multi onEnabled")
        RefreshWorker.schedulePeriodic(context)
        RefreshWorker.refreshNow(context)
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        Log.i(TAG, "multi onUpdate: ${appWidgetIds.joinToString()}")
        RefreshWorker.schedulePeriodic(context)
        RefreshWorker.refreshNow(context)
    }

    companion object {
        private const val TAG = "WeatherMultiWidget"
    }
}
