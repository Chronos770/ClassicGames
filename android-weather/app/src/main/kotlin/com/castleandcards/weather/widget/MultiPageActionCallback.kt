package com.castleandcards.weather.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.updateAll

private const val NUM_PAGES = 4

val PAGE_DELTA = ActionParameters.Key<Int>("page_delta")

/**
 * Tap action used by the multi-page widget's < / > arrow buttons.
 * Increments / decrements the page index in DataStore (mod 4) then
 * re-renders the widget so the new page paints. No network call.
 */
class MultiPageActionCallback : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        val delta = parameters[PAGE_DELTA] ?: 0
        val current = WeatherRepo.multiPage(context)
        // Modulo math that handles negatives — Kotlin's % can return
        // negative values for negative operands.
        val next = ((current + delta) % NUM_PAGES + NUM_PAGES) % NUM_PAGES
        WeatherRepo.setMultiPage(context, next)
        WeatherMultiWidget().updateAll(context)
    }
}

fun pageActionParams(delta: Int): ActionParameters =
    actionParametersOf(PAGE_DELTA to delta)
