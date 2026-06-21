package com.castleandcards.weather.widget

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

private val Context.dataStore by preferencesDataStore(name = "weather_widget")
private val KEY_JSON = stringPreferencesKey("payload_json")
private val KEY_UPDATED_AT = longPreferencesKey("updated_at")

object WeatherRepo {
    private val json = Json { ignoreUnknownKeys = true; isLenient = true }
    private val http: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()
    }

    suspend fun cached(context: Context): WidgetPayload? {
        val raw = context.dataStore.data.first()[KEY_JSON] ?: return null
        return runCatching { json.decodeFromString<WidgetPayload>(raw) }.getOrNull()
    }

    suspend fun cachedUpdatedAt(context: Context): Long {
        return context.dataStore.data.first()[KEY_UPDATED_AT] ?: 0L
    }

    /**
     * Hits the `widget` Edge Function, decodes the payload, and persists it.
     * Throws on any failure so the caller can decide whether to keep showing
     * stale-but-cached data.
     */
    suspend fun refresh(context: Context): WidgetPayload {
        val endpoint = context.getString(R.string.widget_endpoint)
        val anon = context.getString(R.string.widget_anon_key)
        val stationId = context.getString(R.string.station_id).trim()
        val url = if (stationId.isEmpty()) endpoint else "$endpoint?station_id=$stationId"

        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $anon")
            .header("apikey", anon)
            .build()
        val raw = http.newCall(request).execute().use { resp ->
            if (!resp.isSuccessful) error("HTTP ${resp.code}")
            resp.body?.string() ?: error("empty body")
        }
        val env = json.decodeFromString<WidgetEnvelope>(raw)
        val payload = env.data ?: error(env.error ?: "no data")
        val payloadJson = json.encodeToString(WidgetPayload.serializer(), payload)
        context.dataStore.edit { prefs ->
            prefs[KEY_JSON] = payloadJson
            prefs[KEY_UPDATED_AT] = System.currentTimeMillis()
        }
        return payload
    }
}
