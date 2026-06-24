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
 * Big 4x4 clock + weather widget. Time + date dominate, with a
 * condensed weather summary + 5-day forecast underneath. Designed
 * to be the centerpiece of a home screen — the regular weather
 * widget is for at-a-glance weather only.
 *
 * Time refreshes on the same 15-min cadence as the weather data —
 * minute precision would require AlarmManager pings (battery
 * tradeoff).
 */

private val SIZE_CLOCK_DEFAULT = DpSize(280.dp, 280.dp)

class WeatherClockWidget : GlanceAppWidget() {
    override val sizeMode: SizeMode = SizeMode.Responsive(setOf(SIZE_CLOCK_DEFAULT))

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
                ClockContent(payload, error, lastAttempt, bgAlpha)
            }
        }
    }
}

@Composable
private fun ClockContent(payload: WidgetPayload?, error: String?, lastAttempt: Long, bgAlpha: Float) {
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
                .cornerRadius(32.dp)
                .padding(horizontal = 18.dp, vertical = 16.dp),
        ) {
            if (payload == null) {
                LoadingState(error, lastAttempt)
            } else {
                ClockBody(payload)
            }
        }
    }
}

@Composable
private fun ClockBody(p: WidgetPayload) {
    val now = Date()
    val time = SimpleDateFormat("h:mm", Locale.getDefault()).format(now)
    val mer = SimpleDateFormat("a", Locale.getDefault()).format(now)
    val date = SimpleDateFormat("EEEE, MMMM d", Locale.getDefault()).format(now)

    Column(
        modifier = GlanceModifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // TOP ROW: clock on the left, current weather on the right.
        // Stacking time + summary vertically made the body too tall and
        // pushed the 5-day strip out of the default cell height — going
        // horizontal keeps everything visible without the user resizing.
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // LEFT — clock + date
            Column(modifier = GlanceModifier.defaultWeight()) {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        text = time,
                        style = TextStyle(
                            color = white(1f),
                            fontSize = 56.sp,
                            fontWeight = FontWeight.Bold,
                        ),
                    )
                    Spacer(GlanceModifier.width(4.dp))
                    Text(
                        text = mer,
                        style = TextStyle(
                            color = white(0.65f),
                            fontSize = 16.sp,
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

            // RIGHT — icon + temp + feels/precip stacked tight
            Column(horizontalAlignment = Alignment.End) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = iconGlyph(p.current.icon),
                        style = TextStyle(fontSize = 28.sp),
                    )
                    Spacer(GlanceModifier.width(4.dp))
                    Text(
                        text = "${p.current.temp ?: "--"}°",
                        style = TextStyle(
                            color = white(1f),
                            fontSize = 32.sp,
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

        if (p.current.alert != null) {
            Spacer(GlanceModifier.height(6.dp))
            Text(
                text = p.current.alert!!,
                style = TextStyle(
                    color = ColorProvider(Color(0xFFE03B3B)),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                ),
                maxLines = 1,
            )
        }

        Spacer(GlanceModifier.defaultWeight())

        // 5-DAY FORECAST FOOTER
        Row(modifier = GlanceModifier.fillMaxWidth()) {
            p.forecast.take(5).forEach { day ->
                Column(
                    modifier = GlanceModifier.defaultWeight(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = day.day,
                        style = TextStyle(color = white(0.55f), fontSize = 11.sp, fontWeight = FontWeight.Medium),
                    )
                    Spacer(GlanceModifier.height(2.dp))
                    Text(
                        text = iconGlyph(day.icon),
                        style = TextStyle(fontSize = 18.sp),
                    )
                    Spacer(GlanceModifier.height(2.dp))
                    Text(
                        text = "${day.hi}°",
                        style = TextStyle(color = white(0.95f), fontSize = 12.sp, fontWeight = FontWeight.Bold),
                    )
                    Text(
                        text = "${day.lo}°",
                        style = TextStyle(color = white(0.5f), fontSize = 11.sp),
                    )
                    if ((day.precipPct ?: 0) > 0) {
                        Text(
                            text = "${day.precipPct}%",
                            style = TextStyle(
                                color = ColorProvider(Color(0xFF7DD3FC)),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium,
                            ),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun LoadingState(error: String?, lastAttempt: Long) {
    Column(
        modifier = GlanceModifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(GlanceModifier.defaultWeight())
        val now = Date()
        Text(
            text = SimpleDateFormat("h:mm a", Locale.getDefault()).format(now),
            style = TextStyle(color = white(0.85f), fontSize = 36.sp, fontWeight = FontWeight.Bold),
        )
        Text(
            text = SimpleDateFormat("EEEE, MMMM d", Locale.getDefault()).format(now),
            style = TextStyle(color = white(0.6f), fontSize = 14.sp),
        )
        Spacer(GlanceModifier.height(16.dp))
        Text(
            text = if (error == null) "Loading weather…" else "Couldn't load weather",
            style = TextStyle(color = white(0.7f), fontSize = 14.sp, fontWeight = FontWeight.Medium),
        )
        if (error != null) {
            Spacer(GlanceModifier.height(4.dp))
            Text(
                text = error,
                style = TextStyle(color = white(0.5f), fontSize = 11.sp),
                maxLines = 3,
            )
        }
        if (lastAttempt > 0L) {
            Spacer(GlanceModifier.height(4.dp))
            Text(
                text = "Last try ${ageLabelClock(lastAttempt)} ago",
                style = TextStyle(color = white(0.4f), fontSize = 10.sp),
            )
        }
        Spacer(GlanceModifier.defaultWeight())
    }
}

private fun white(alpha: Float): ColorProvider = ColorProvider(Color(1f, 1f, 1f, alpha))

private fun ageLabelClock(ts: Long): String {
    val s = (System.currentTimeMillis() - ts) / 1000
    return when {
        s < 60 -> "${s}s"
        s < 3600 -> "${s / 60}m"
        else -> "${s / 3600}h"
    }
}
