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
        Result.success()
    } catch (e: Exception) {
        Log.e(TAG, "doWork failed: ${e.message}", e)
        // The error is already persisted to DataStore by WeatherRepo, so the
        // widget will paint a real message. Re-render so users see it now
        // instead of after the next refresh.
        runCatching { WeatherWidget().updateAll(applicationContext) }
        // success(), not retry() — retry's backoff hides the error from the
        // user for ~10s+, and WorkManager already has the periodic 15-min
        // tick to recover. The widget can also force-refresh on tap (TODO).
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
            // Expedited so the first paint after placement isn't blocked on
            // WorkManager's normal scheduling latency (which can be many
            // seconds on Android 14+ with strict background policies).
            val req = OneTimeWorkRequestBuilder<RefreshWorker>()
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build(),
                )
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                ONESHOT_NAME,
                ExistingWorkPolicy.REPLACE,
                req,
            )
        }
    }
}
