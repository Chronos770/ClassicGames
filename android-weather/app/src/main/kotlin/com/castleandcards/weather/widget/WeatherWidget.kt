package com.castleandcards.weather.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.LocalSize
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.background
import androidx.glance.appwidget.cornerRadius
import androidx.glance.ImageProvider
import androidx.glance.appwidget.provideContent
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.castleandcards.weather.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private val SIZE_SMALL = DpSize(140.dp, 110.dp)   // ~2x2 cells
private val SIZE_MEDIUM = DpSize(220.dp, 110.dp)  // ~3x2 cells
private val SIZE_LARGE = DpSize(320.dp, 110.dp)   // ~4x2 cells, default

class WeatherWidget : GlanceAppWidget() {
    override val sizeMode: SizeMode = SizeMode.Responsive(
        setOf(SIZE_SMALL, SIZE_MEDIUM, SIZE_LARGE),
    )

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val payload = WeatherRepo.cached(context)
        val error = if (payload == null) WeatherRepo.lastError(context) else null
        val lastAttempt = WeatherRepo.lastAttempt(context)
        val bgAlpha = WeatherRepo.widgetBgAlpha(context)

        // Self-heal: when the cache is empty and nothing's been tried in
        // the last 30s, kick the worker now. This covers two cases the
        // receiver hooks miss: APK reinstall (Android sometimes skips
        // onEnabled/onUpdate on the first paint after update) and the
        // periodic worker being deferred by Doze for the first 15 min.
        val ageMs = System.currentTimeMillis() - lastAttempt
        if (payload == null && (lastAttempt == 0L || ageMs > 30_000L)) {
            android.util.Log.i("WeatherWidget", "provideGlance: self-heal kick (age=${ageMs}ms)")
            RefreshWorker.refreshNow(context)
        }

        provideContent {
            GlanceTheme {
                WidgetContent(payload = payload, error = error, lastAttempt = lastAttempt, bgAlpha = bgAlpha)
            }
        }
    }
}

@Composable
private fun WidgetContent(payload: WidgetPayload?, error: String?, lastAttempt: Long, bgAlpha: Float) {
    // Tap opens the bundled Capacitor MainActivity, which is the
    // weather app's own launcher activity. (When the widget shipped
    // as a standalone APK it bounced through LaunchActivity to an
    // ACTION_VIEW intent; now that we're packaged together we just
    // launch the activity directly.)
    val openApp = actionStartActivity<com.castleandcards.weather.MainActivity>()
    val size = LocalSize.current

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(2.dp)
            .clickable(openApp),
    ) {
        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(Color(0xFF101626).copy(alpha = bgAlpha)))
                .cornerRadius(28.dp)
                .padding(horizontal = sidePadding(size), vertical = 10.dp),
        ) {
            if (payload == null) {
                LoadingBlock(error = error, lastAttempt = lastAttempt)
            } else {
                // Layout above + clock footer below in a Column. The
                // footer is omitted at the smallest size where there's
                // no vertical room for it.
                Column(modifier = GlanceModifier.fillMaxSize()) {
                    Box(modifier = GlanceModifier.fillMaxWidth().defaultWeight()) {
                        when {
                            size.width < SIZE_MEDIUM.width -> SmallLayout(payload)
                            size.width < SIZE_LARGE.width -> MediumLayout(payload)
                            else -> LargeLayout(payload)
                        }
                    }
                    if (size.width >= SIZE_MEDIUM.width) {
                        ClockFooter()
                    }
                }
            }
        }
    }
}

private fun sidePadding(size: DpSize) =
    if (size.width < SIZE_MEDIUM.width) 8.dp else 14.dp

@Composable
private fun LoadingBlock(error: String?, lastAttempt: Long) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = GlanceModifier.fillMaxSize().padding(8.dp),
    ) {
        Spacer(GlanceModifier.defaultWeight())
        Text(
            text = if (error == null) "Loading weather…" else "Couldn't load weather",
            style = TextStyle(color = white(0.85f), fontSize = 13.sp, fontWeight = FontWeight.Medium),
        )
        if (error != null) {
            Spacer(GlanceModifier.height(4.dp))
            Text(
                text = error,
                style = TextStyle(color = white(0.55f), fontSize = 10.sp),
                maxLines = 3,
            )
        }
        if (lastAttempt > 0L) {
            Spacer(GlanceModifier.height(2.dp))
            Text(
                text = "Last try ${ageLabel(lastAttempt)} ago",
                style = TextStyle(color = white(0.45f), fontSize = 9.sp),
            )
        } else if (error == null) {
            Spacer(GlanceModifier.height(2.dp))
            Text(
                text = "Worker hasn't run yet",
                style = TextStyle(color = white(0.45f), fontSize = 9.sp),
            )
        }
        // Retry pill — visually distinct, gets its own click-handler so the
        // tap doesn't bubble up to the outer "open PWA" action.
        Spacer(GlanceModifier.height(6.dp))
        Box(
            contentAlignment = Alignment.Center,
            modifier = GlanceModifier
                .background(ColorProvider(Color(0xFF1F3554)))
                .cornerRadius(8.dp)
                .padding(horizontal = 12.dp, vertical = 6.dp)
                .clickable(actionRunCallback<RetryActionCallback>()),
        ) {
            Text(
                text = "Retry",
                style = TextStyle(color = white(0.95f), fontSize = 11.sp, fontWeight = FontWeight.Medium),
            )
        }
        Spacer(GlanceModifier.defaultWeight())
    }
}

private fun ageLabel(timestamp: Long): String {
    val seconds = (System.currentTimeMillis() - timestamp) / 1000
    return when {
        seconds < 60 -> "${seconds}s"
        seconds < 3600 -> "${seconds / 60}m"
        else -> "${seconds / 3600}h"
    }
}

// 2x2 — temp + icon, location label, optional alert glyph. No metrics
// column, no forecast strip. Tap still opens the PWA.
@Composable
private fun SmallLayout(p: WidgetPayload) {
    Column(modifier = GlanceModifier.fillMaxSize()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = p.location,
                style = TextStyle(color = white(0.85f), fontSize = 11.sp, fontWeight = FontWeight.Medium),
                maxLines = 1,
            )
            if (p.current.alert != null) {
                Spacer(GlanceModifier.width(4.dp))
                Text(
                    text = ALERT_GLYPH,
                    style = TextStyle(color = ColorProvider(Color(0xFFE03B3B)), fontSize = 11.sp),
                )
            }
        }
        Spacer(GlanceModifier.defaultWeight())
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = iconGlyph(p.current.icon),
                style = TextStyle(fontSize = 26.sp),
            )
            Spacer(GlanceModifier.width(6.dp))
            Text(
                text = "${p.current.temp ?: "--"}°",
                style = TextStyle(color = white(1f), fontSize = 34.sp, fontWeight = FontWeight.Bold),
            )
        }
        Text(
            text = "Feels ${p.current.feels ?: "--"}°",
            style = TextStyle(color = white(0.6f), fontSize = 10.sp),
        )
        Spacer(GlanceModifier.defaultWeight())
    }
}

// 3x2 — current block on the left, a compact 3-day forecast on the right.
@Composable
private fun MediumLayout(p: WidgetPayload) {
    Row(
        modifier = GlanceModifier.fillMaxSize(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = GlanceModifier.defaultWeight()) {
            Text(
                text = p.location,
                style = TextStyle(color = white(0.9f), fontSize = 12.sp, fontWeight = FontWeight.Medium),
                maxLines = 1,
            )
            if (p.current.alert != null) {
                Spacer(GlanceModifier.height(2.dp))
                Text(
                    text = "$ALERT_GLYPH ${p.current.alert}",
                    style = TextStyle(color = ColorProvider(Color(0xFFE03B3B)), fontSize = 10.sp, fontWeight = FontWeight.Bold),
                    maxLines = 1,
                )
            }
            Spacer(GlanceModifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = iconGlyph(p.current.icon),
                    style = TextStyle(fontSize = 20.sp),
                )
                Spacer(GlanceModifier.width(4.dp))
                Text(
                    text = "${p.current.temp ?: "--"}°",
                    style = TextStyle(color = white(1f), fontSize = 26.sp, fontWeight = FontWeight.Bold),
                )
            }
            Text(
                text = "Feels ${p.current.feels ?: "--"}°",
                style = TextStyle(color = white(0.6f), fontSize = 10.sp),
            )
        }
        Spacer(GlanceModifier.width(4.dp))
        // 3-day mini-forecast stacked vertically — fits a 3-cell-tall widget
        // without overflowing.
        Column(horizontalAlignment = Alignment.End) {
            p.forecast.take(3).forEach { day ->
                MiniDay(day = day)
            }
        }
    }
}

// 4x2 — the original "full" layout: header row + metrics column + 5-day strip.
@Composable
private fun LargeLayout(p: WidgetPayload) {
    Column(modifier = GlanceModifier.fillMaxSize()) {
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = GlanceModifier.defaultWeight()) {
                Text(
                    text = p.location,
                    style = TextStyle(color = white(0.9f), fontSize = 14.sp, fontWeight = FontWeight.Medium),
                )
                if (p.current.alert != null) {
                    Spacer(GlanceModifier.height(4.dp))
                    Text(
                        text = "$ALERT_GLYPH ${p.current.alert}",
                        style = TextStyle(color = ColorProvider(Color(0xFFE03B3B)), fontSize = 11.sp, fontWeight = FontWeight.Bold),
                        maxLines = 1,
                    )
                }
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = iconGlyph(p.current.icon),
                        style = TextStyle(color = white(1f), fontSize = 22.sp),
                    )
                    Spacer(GlanceModifier.width(6.dp))
                    Text(
                        text = "${p.current.temp ?: "--"}°",
                        style = TextStyle(color = white(1f), fontSize = 30.sp, fontWeight = FontWeight.Bold),
                    )
                }
                Text(
                    text = "Feels ${p.current.feels ?: "--"}°",
                    style = TextStyle(color = white(0.65f), fontSize = 11.sp),
                )
            }

            Spacer(GlanceModifier.defaultWeight())

            Column(horizontalAlignment = Alignment.End) {
                Metric(label = "↓", value = p.current.precipPct?.let { "$it%" } ?: "--")
                Spacer(GlanceModifier.height(2.dp))
                Metric(label = "≋", value = p.current.windMph?.let { "$it MPH" } ?: "--")
                Spacer(GlanceModifier.height(2.dp))
                Metric(label = "◐", value = p.current.humidity?.let { "$it%" } ?: "--")
            }
        }

        Spacer(GlanceModifier.height(10.dp))

        Row(modifier = GlanceModifier.fillMaxWidth()) {
            p.forecast.take(5).forEach { day ->
                ForecastCell(day = day, modifier = GlanceModifier.defaultWeight())
            }
        }
    }
}

@Composable
private fun MiniDay(day: ForecastDay) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
            text = day.day,
            style = TextStyle(color = white(0.55f), fontSize = 10.sp, fontWeight = FontWeight.Medium),
        )
        Spacer(GlanceModifier.width(4.dp))
        Text(
            text = iconGlyph(day.icon),
            style = TextStyle(fontSize = 12.sp),
        )
        Spacer(GlanceModifier.width(4.dp))
        Text(
            text = "${day.hi}°",
            style = TextStyle(color = white(0.9f), fontSize = 10.sp, fontWeight = FontWeight.Medium),
        )
    }
}

@Composable
private fun Metric(label: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
            text = label,
            style = TextStyle(color = white(0.55f), fontSize = 11.sp),
        )
        Spacer(GlanceModifier.width(4.dp))
        Text(
            text = value,
            style = TextStyle(color = white(0.9f), fontSize = 11.sp, fontWeight = FontWeight.Medium),
        )
    }
}

@Composable
private fun ForecastCell(day: ForecastDay, modifier: GlanceModifier) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = day.day,
            style = TextStyle(color = white(0.55f), fontSize = 10.sp, fontWeight = FontWeight.Medium),
        )
        Spacer(GlanceModifier.height(2.dp))
        Text(
            text = iconGlyph(day.icon),
            style = TextStyle(fontSize = 16.sp),
        )
        Spacer(GlanceModifier.height(2.dp))
        Text(
            text = "${day.hi}° ${day.lo}°",
            style = TextStyle(color = white(0.9f), fontSize = 11.sp),
        )
    }
}

private fun white(alpha: Float): ColorProvider = ColorProvider(Color(1f, 1f, 1f, alpha))

// Footer clock rendered below the weather content on Medium / Large
// sizes. Time formatted as "h:mm AM" and refreshes whenever the
// widget repaints — that's the 15-min periodic worker tick + any
// manual interaction (open app, retry, etc.), so worst case the
// time can lag by up to 15 minutes. True minute-precision would
// need AlarmManager pings, which trade battery for accuracy that's
// only marginal in a weather widget.
@Composable
private fun ClockFooter() {
    val now = Date()
    val time = SimpleDateFormat("h:mm", Locale.getDefault()).format(now)
    val mer = SimpleDateFormat("a", Locale.getDefault()).format(now)
    val date = SimpleDateFormat("EEE MMM d", Locale.getDefault()).format(now)
    Row(
        modifier = GlanceModifier
            .fillMaxWidth()
            .padding(top = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = date,
            style = TextStyle(color = white(0.5f), fontSize = 10.sp, fontWeight = FontWeight.Medium),
        )
        Spacer(GlanceModifier.defaultWeight())
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                text = time,
                style = TextStyle(color = white(0.85f), fontSize = 13.sp, fontWeight = FontWeight.Bold),
            )
            Spacer(GlanceModifier.width(2.dp))
            Text(
                text = mer,
                style = TextStyle(color = white(0.55f), fontSize = 10.sp, fontWeight = FontWeight.Medium),
            )
        }
    }
}
