package com.castleandcards.weather.widget

import android.content.Context
import android.util.Log
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
private val KEY_LAST_ERROR = stringPreferencesKey("last_error")
private val KEY_LAST_ATTEMPT = longPreferencesKey("last_attempt")

object WeatherRepo {
    private const val TAG = "WeatherWidget"
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

    suspend fun lastError(context: Context): String? {
        return context.dataStore.data.first()[KEY_LAST_ERROR]
    }

    suspend fun lastAttempt(context: Context): Long {
        return context.dataStore.data.first()[KEY_LAST_ATTEMPT] ?: 0L
    }

    /**
     * Hits the `widget` Edge Function, decodes the payload, and persists it.
     * Also persists the last error string so the widget can show a real
     * message instead of hanging on "Loading…" forever when something breaks.
     */
    suspend fun refresh(context: Context): WidgetPayload {
        val endpoint = context.getString(R.string.widget_endpoint).trim()
        val anon = context.getString(R.string.widget_anon_key).trim()
        val stationId = context.getString(R.string.station_id).trim()
        val url = if (stationId.isEmpty()) endpoint else "$endpoint?station_id=$stationId"

        // Pre-flight: configured values look sane?
        if (!endpoint.startsWith("http")) {
            persistError(context, "Bad endpoint: $endpoint")
            error("Bad endpoint: $endpoint")
        }
        if (anon.isEmpty() || anon.startsWith("YOUR_")) {
            persistError(context, "Missing anon key")
            error("Missing anon key")
        }

        Log.i(TAG, "refresh start: $url")
        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $anon")
            .header("apikey", anon)
            .build()

        val raw = try {
            http.newCall(request).execute().use { resp ->
                if (!resp.isSuccessful) {
                    val body = resp.body?.string().orEmpty().take(200)
                    persistError(context, "HTTP ${resp.code}: $body")
                    error("HTTP ${resp.code}: $body")
                }
                resp.body?.string() ?: run {
                    persistError(context, "empty body")
                    error("empty body")
                }
            }
        } catch (e: Exception) {
            val msg = e.message ?: e.javaClass.simpleName
            Log.e(TAG, "fetch failed: $msg", e)
            persistError(context, "Fetch: $msg")
            throw e
        }

        val env = try {
            json.decodeFromString<WidgetEnvelope>(raw)
        } catch (e: Exception) {
            val msg = "JSON parse: ${e.message ?: e.javaClass.simpleName}"
            Log.e(TAG, msg, e)
            persistError(context, msg)
            throw e
        }
        val payload = env.data ?: run {
            persistError(context, "Server: ${env.error ?: "no data"}")
            error(env.error ?: "no data")
        }

        val payloadJson = json.encodeToString(WidgetPayload.serializer(), payload)
        context.dataStore.edit { prefs ->
            prefs[KEY_JSON] = payloadJson
            prefs[KEY_UPDATED_AT] = System.currentTimeMillis()
            prefs[KEY_LAST_ATTEMPT] = System.currentTimeMillis()
            prefs.remove(KEY_LAST_ERROR)
        }
        Log.i(TAG, "refresh ok: ${payload.location} ${payload.current.temp}°")
        return payload
    }

    private suspend fun persistError(context: Context, msg: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_LAST_ERROR] = msg
            prefs[KEY_LAST_ATTEMPT] = System.currentTimeMillis()
        }
    }
}
