package com.castleandcards.weather.widget

import android.content.Context
import android.util.Log
import androidx.datastore.preferences.core.edit
import com.castleandcards.weather.R
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import java.net.UnknownHostException
import java.util.concurrent.TimeUnit

private val Context.dataStore by preferencesDataStore(name = "weather_widget")
private val KEY_JSON = stringPreferencesKey("payload_json")
private val KEY_UPDATED_AT = longPreferencesKey("updated_at")
private val KEY_LAST_ERROR = stringPreferencesKey("last_error")
private val KEY_LAST_ATTEMPT = longPreferencesKey("last_attempt")
private val KEY_MULTI_PAGE = intPreferencesKey("multi_page")
private val KEY_LAST_NAV_TAP = longPreferencesKey("last_nav_tap")

object WeatherRepo {
    private const val TAG = "WeatherWidget"
    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    /**
     * Build a fresh OkHttp client for each refresh. Long-lived clients
     * cache DNS + connection pools at the JVM/OkHttp layer, which bites
     * widget workers: they wake up after the network has changed (Wi-Fi
     * ↔ cellular) and the cached resolution is stale, producing
     * UnknownHostException even though the network is fine.
     */
    private fun newClient(): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

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

    suspend fun multiPage(context: Context): Int {
        return context.dataStore.data.first()[KEY_MULTI_PAGE] ?: 0
    }

    suspend fun setMultiPage(context: Context, page: Int) {
        context.dataStore.edit {
            it[KEY_MULTI_PAGE] = page
            it[KEY_LAST_NAV_TAP] = System.currentTimeMillis()
        }
    }

    suspend fun lastNavTap(context: Context): Long {
        return context.dataStore.data.first()[KEY_LAST_NAV_TAP] ?: 0L
    }

    /**
     * Widget background alpha, 0.0..1.0. Read from the same
     * SharedPreferences file Capacitor's @capacitor/preferences plugin
     * writes to, so the in-app settings UI and the widget agree on
     * the value with no IPC plumbing.
     *
     * Default 0.85 matches the original widget_background drawable.
     */
    fun widgetBgAlpha(context: Context): Float {
        val sp = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
        val raw = sp.getString("widget_bg_alpha", null) ?: return 0.85f
        return raw.toFloatOrNull()?.coerceIn(0f, 1f) ?: 0.85f
    }

    /**
     * Hits the `widget` Edge Function, decodes the payload, and persists it.
     * Also persists the last error string so the widget can show a real
     * message instead of hanging on "Loading…" forever when something breaks.
     *
     * DNS resolution can fail transiently when a widget worker wakes up
     * before the device's network stack has settled — retry on
     * UnknownHostException with backoff before giving up.
     */
    suspend fun refresh(context: Context): WidgetPayload {
        val endpoint = context.getString(R.string.widget_endpoint).trim()
        val anon = context.getString(R.string.widget_anon_key).trim()
        val stationId = context.getString(R.string.station_id).trim()
        val url = if (stationId.isEmpty()) endpoint else "$endpoint?station_id=$stationId"

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

        val raw = fetchWithRetries(context, request)

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

    /**
     * Three attempts, each on a freshly-built OkHttp client so DNS isn't
     * cached between tries. Delays: 0s, 1s, 3s. Total wall-clock <= ~5s
     * before we give up and persist whatever the last error was.
     */
    private suspend fun fetchWithRetries(context: Context, request: Request): String {
        val delaysMs = longArrayOf(0L, 1_000L, 3_000L)
        var lastError: Exception? = null

        for ((attempt, delayMs) in delaysMs.withIndex()) {
            if (delayMs > 0L) delay(delayMs)
            val client = newClient()
            try {
                return client.newCall(request).execute().use { resp ->
                    if (!resp.isSuccessful) {
                        val body = resp.body?.string().orEmpty().take(200)
                        val msg = "HTTP ${resp.code}: $body"
                        persistError(context, msg)
                        error(msg)
                    }
                    resp.body?.string() ?: run {
                        persistError(context, "empty body")
                        error("empty body")
                    }
                }
            } catch (e: UnknownHostException) {
                lastError = e
                Log.w(TAG, "DNS attempt ${attempt + 1}/${delaysMs.size} failed: ${e.message}")
                // Retry — could be a transient resolver wakeup issue.
            } catch (e: Exception) {
                val msg = e.message ?: e.javaClass.simpleName
                Log.e(TAG, "fetch failed (non-DNS): $msg", e)
                persistError(context, "Fetch: $msg")
                throw e
            }
        }

        // Out of attempts; surface the DNS error.
        val finalMsg = "DNS: ${lastError?.message ?: "host unreachable"}"
        Log.e(TAG, finalMsg, lastError)
        persistError(context, finalMsg)
        throw lastError ?: IllegalStateException(finalMsg)
    }

    private suspend fun persistError(context: Context, msg: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_LAST_ERROR] = msg
            prefs[KEY_LAST_ATTEMPT] = System.currentTimeMillis()
        }
    }
}
