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
        Log.i(TAG, "multi onEnabled — first widget placed, kicking refresh")
        RefreshWorker.schedulePeriodic(context)
        RefreshWorker.refreshNow(context)
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        // CRITICAL: super.onUpdate triggers Glance's compose pipeline.
        // Do NOT also enqueue a refreshNow here — onUpdate is called
        // by Android on every periodic tick, by AppWidgetManager when
        // the widget host (launcher) requests a refresh, AND by our
        // own page-navigation broadcast. Running a network fetch on
        // every onUpdate compounds latency badly on each tap. Network
        // refreshes are handled by:
        //   - onEnabled (first install)
        //   - the periodic 15-min worker scheduled below
        //   - provideGlance's self-heal when the cache is empty
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        Log.i(TAG, "multi onUpdate: ${appWidgetIds.joinToString()}")
        RefreshWorker.schedulePeriodic(context)
    }

    companion object {
        private const val TAG = "WeatherMultiWidget"
    }
}
