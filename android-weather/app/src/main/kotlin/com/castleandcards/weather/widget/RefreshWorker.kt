package com.castleandcards.weather.widget

import android.content.Context
import android.util.Log
import androidx.glance.appwidget.updateAll
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

class RefreshWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = try {
        WeatherRepo.refresh(applicationContext)
        WeatherWidget().updateAll(applicationContext)
        WeatherClockWidget().updateAll(applicationContext)
        WeatherClockCompactWidget().updateAll(applicationContext)
        Result.success()
    } catch (e: Exception) {
        Log.e(TAG, "doWork failed: ${e.message}", e)
        runCatching { WeatherWidget().updateAll(applicationContext) }
        runCatching { WeatherClockWidget().updateAll(applicationContext) }
        runCatching { WeatherClockCompactWidget().updateAll(applicationContext) }
        Result.success()
    }

    companion object {
        private const val TAG = "WeatherWidget"
        private const val PERIODIC_NAME = "weather-widget-refresh-15m"
        private const val ONESHOT_NAME = "weather-widget-refresh-now"

        fun schedulePeriodic(context: Context) {
            val req = PeriodicWorkRequestBuilder<RefreshWorker>(15, TimeUnit.MINUTES)
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build(),
                )
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PERIODIC_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                req,
            )
        }

        fun refreshNow(context: Context) {
            // No network constraint here — if the device is briefly seen as
            // offline by WorkManager, we still want the worker to try; OkHttp
            // will surface a real error that the widget can display, instead
            // of WorkManager silently deferring forever.
            // Expedited so the first paint after placement / APK update isn't
            // blocked on WorkManager's normal scheduling latency.
            val req = OneTimeWorkRequestBuilder<RefreshWorker>()
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                ONESHOT_NAME,
                ExistingWorkPolicy.REPLACE,
                req,
            )
        }
    }
}
