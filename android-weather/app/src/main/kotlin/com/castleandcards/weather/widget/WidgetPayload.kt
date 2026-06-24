package com.castleandcards.weather.widget

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class WidgetEnvelope(val ok: Boolean, val data: WidgetPayload? = null, val error: String? = null)

@Serializable
data class WidgetPayload(
    val location: String,
    @SerialName("observed_at") val observedAt: String? = null,
    @SerialName("updated_at") val updatedAt: String,
    val current: CurrentBlock,
    val forecast: List<ForecastDay> = emptyList(),
)

@Serializable
data class CurrentBlock(
    val temp: Int? = null,
    val feels: Int? = null,
    @SerialName("precip_pct") val precipPct: Int? = null,
    @SerialName("wind_mph") val windMph: Int? = null,
    val humidity: Int? = null,
    val icon: String = "cloudy",
    val alert: String? = null,
)

@Serializable
data class ForecastDay(
    val day: String,
    val icon: String,
    val hi: Int,
    val lo: Int,
    @SerialName("precipPct") val precipPct: Int? = null,
)
