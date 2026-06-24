package com.castleandcards.weather.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.castleandcards.weather.MainActivity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Compact 4x2 clock + today widget. Same horizontal layout as
 * [WeatherClockWidget] (clock on the left, current conditions on the
 * right) but with no 5-day forecast strip — for users who want the
 * time + today's stats without giving up half their home screen.
 *
 * Cache + refresh come from the shared [WeatherRepo] / [RefreshWorker]
 * — every widget variant reads the same DataStore-persisted payload,
 * so the worker only fires once per tick regardless of how many
 * widget kinds are placed.
 */

private val SIZE_COMPACT_DEFAULT = DpSize(280.dp, 110.dp)

class WeatherClockCompactWidget : GlanceAppWidget() {
    override val sizeMode: SizeMode = SizeMode.Responsive(setOf(SIZE_COMPACT_DEFAULT))

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val payload = WeatherRepo.cached(context)
        val error = if (payload == null) WeatherRepo.lastError(context) else null
        val lastAttempt = WeatherRepo.lastAttempt(context)
        val bgAlpha = WeatherRepo.widgetBgAlpha(context)

        val ageMs = System.currentTimeMillis() - lastAttempt
        if (payload == null && (lastAttempt == 0L || ageMs > 30_000L)) {
            RefreshWorker.refreshNow(context)
        }

        provideContent {
            GlanceTheme {
                CompactContent(payload, error, lastAttempt, bgAlpha)
            }
        }
    }
}

@Composable
private fun CompactContent(payload: WidgetPayload?, error: String?, lastAttempt: Long, bgAlpha: Float) {
    val open = actionStartActivity<MainActivity>()
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(2.dp)
            .clickable(open),
    ) {
        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(Color(0xFF101626).copy(alpha = bgAlpha)))
                .cornerRadius(28.dp)
                .padding(horizontal = 16.dp, vertical = 12.dp),
        ) {
            if (payload == null) {
                CompactLoading(error, lastAttempt)
            } else {
                CompactBody(payload)
            }
        }
    }
}

@Composable
private fun CompactBody(p: WidgetPayload) {
    val now = Date()
    val time = SimpleDateFormat("h:mm", Locale.getDefault()).format(now)
    val mer = SimpleDateFormat("a", Locale.getDefault()).format(now)
    val date = SimpleDateFormat("EEE, MMM d", Locale.getDefault()).format(now)

    Row(
        modifier = GlanceModifier.fillMaxSize(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // LEFT — time + meridiem + short date
        Column(modifier = GlanceModifier.defaultWeight()) {
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    text = time,
                    style = TextStyle(
                        color = white(1f),
                        fontSize = 44.sp,
                        fontWeight = FontWeight.Bold,
                    ),
                )
                Spacer(GlanceModifier.width(4.dp))
                Text(
                    text = mer,
                    style = TextStyle(
                        color = white(0.65f),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                    ),
                )
            }
            Text(
                text = date,
                style = TextStyle(
                    color = white(0.65f),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                ),
                maxLines = 1,
            )
        }

        Spacer(GlanceModifier.width(8.dp))

        // RIGHT — icon + temp + feels/precip
        Column(horizontalAlignment = Alignment.End) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = iconGlyph(p.current.icon),
                    style = TextStyle(fontSize = 26.sp),
                )
                Spacer(GlanceModifier.width(4.dp))
                Text(
                    text = "${p.current.temp ?: "--"}°",
                    style = TextStyle(
                        color = white(1f),
                        fontSize = 30.sp,
                        fontWeight = FontWeight.Bold,
                    ),
                )
                if (p.current.alert != null) {
                    Spacer(GlanceModifier.width(4.dp))
                    Text(
                        text = ALERT_GLYPH,
                        style = TextStyle(
                            color = ColorProvider(Color(0xFFE03B3B)),
                            fontSize = 14.sp,
                        ),
                    )
                }
            }
            val precip = p.current.precipPct
            val precipPart = if (precip != null) " · ${precip}%" else ""
            Text(
                text = "Feels ${p.current.feels ?: "--"}°$precipPart",
                style = TextStyle(color = white(0.6f), fontSize = 11.sp),
                maxLines = 1,
            )
            Text(
                text = p.location,
                style = TextStyle(color = white(0.5f), fontSize = 10.sp),
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun CompactLoading(error: String?, lastAttempt: Long) {
    Column(
        modifier = GlanceModifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(GlanceModifier.defaultWeight())
        val now = Date()
        Text(
            text = SimpleDateFormat("h:mm a", Locale.getDefault()).format(now),
            style = TextStyle(color = white(0.85f), fontSize = 30.sp, fontWeight = FontWeight.Bold),
        )
        Text(
            text = if (error == null) "Loading weather…" else "Couldn't load weather",
            style = TextStyle(color = white(0.7f), fontSize = 12.sp, fontWeight = FontWeight.Medium),
        )
        if (error != null) {
            Text(
                text = error,
                style = TextStyle(color = white(0.5f), fontSize = 10.sp),
                maxLines = 2,
            )
        }
        Spacer(GlanceModifier.defaultWeight())
    }
}

private fun white(alpha: Float): ColorProvider = ColorProvider(Color(1f, 1f, 1f, alpha))
