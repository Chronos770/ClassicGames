package com.castleandcards.weather.widget

import android.content.Context
import androidx.glance.appwidget.updateAll
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
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
        // Don't keep retrying forever — surface stale data + try again next tick.
        Result.retry()
    }

    companion object {
        private const val PERIODIC_NAME = "weather-widget-refresh-15m"

        fun schedulePeriodic(context: Context) {
            val req = PeriodicWorkRequestBuilder<RefreshWorker>(15, TimeUnit.MINUTES)
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PERIODIC_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                req,
            )
        }

        fun refreshNow(context: Context) {
            val req = OneTimeWorkRequestBuilder<RefreshWorker>().build()
            WorkManager.getInstance(context).enqueue(req)
        }
    }
}
