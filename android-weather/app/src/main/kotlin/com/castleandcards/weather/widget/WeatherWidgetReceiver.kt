package com.castleandcards.weather.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

class WeatherWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = WeatherWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.i(TAG, "onEnabled: scheduling periodic + immediate refresh")
        RefreshWorker.schedulePeriodic(context)
        RefreshWorker.refreshNow(context)
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        // onUpdate fires on APK upgrades AND first widget placement (when
        // onEnabled fires). Re-scheduling is idempotent (KEEP policy), and
        // the immediate refresh is what makes the widget self-heal after
        // an in-place APK update — onEnabled is NOT called on update, so
        // without this hook the widget just sits on stale state from the
        // previous install.
        Log.i(TAG, "onUpdate: ids=${appWidgetIds.joinToString()}")
        RefreshWorker.schedulePeriodic(context)
        RefreshWorker.refreshNow(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == "com.castleandcards.weather.widget.REFRESH") {
            Log.i(TAG, "onReceive REFRESH broadcast")
            RefreshWorker.refreshNow(context)
        }
    }

    companion object {
        private const val TAG = "WeatherWidget"
    }
}
