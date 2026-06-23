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
import androidx.glance.ImageProvider
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionRunCallback
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
import com.castleandcards.weather.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Multi-page weather widget. Same data as the regular widget but with
 * four selectable pages, navigable via tap-arrows on the bottom edge
 * (Glance doesn't expose swipe gestures, so left/right arrow buttons
 * are the standard substitute):
 *
 *   0  Current — temp, feels-like, alert, condition icon
 *   1  Forecast — 5-day strip
 *   2  Sun & Moon — sunrise/sunset (placeholder: shows observed_at)
 *   3  Clock — big time + small temp + condition
 *
 * Page index is stored in DataStore (KEY_MULTI_PAGE) so it persists
 * across widget restarts. Body taps anywhere in the page content area
 * still open the bundled MainActivity, same as the single-page widget.
 */

private val SIZE_LARGE = DpSize(320.dp, 110.dp)

class WeatherMultiWidget : GlanceAppWidget() {
    override val sizeMode: SizeMode = SizeMode.Responsive(setOf(SIZE_LARGE))

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val payload = WeatherRepo.cached(context)
        val error = if (payload == null) WeatherRepo.lastError(context) else null
        val lastAttempt = WeatherRepo.lastAttempt(context)
        val page = WeatherRepo.multiPage(context)
        val bgAlpha = WeatherRepo.widgetBgAlpha(context)

        val ageMs = System.currentTimeMillis() - lastAttempt
        if (payload == null && (lastAttempt == 0L || ageMs > 30_000L)) {
            RefreshWorker.refreshNow(context)
        }

        provideContent {
            GlanceTheme {
                MultiContent(payload, error, lastAttempt, page, bgAlpha)
            }
        }
    }
}

@Composable
private fun MultiContent(payload: WidgetPayload?, error: String?, lastAttempt: Long, page: Int, bgAlpha: Float) {
    val open = actionStartActivity<MainActivity>()
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(2.dp),
    ) {
        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(Color(0xFF101626).copy(alpha = bgAlpha)))
                .cornerRadius(28.dp)
                .padding(horizontal = 12.dp, vertical = 8.dp),
        ) {
            Column(modifier = GlanceModifier.fillMaxSize()) {
                // Page content (clickable area = opens app)
                Box(
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .defaultWeight()
                        .clickable(open),
                ) {
                    if (payload == null) {
                        LoadingPanel(error, lastAttempt)
                    } else {
                        when (page) {
                            0 -> CurrentPage(payload)
                            1 -> ForecastPage(payload)
                            2 -> SunMoonPage(payload)
                            else -> ClockPage(payload)
                        }
                    }
                }
                // Page indicator + arrows
                NavBar(page = page)
            }
        }
    }
}

@Composable
private fun NavBar(page: Int) {
    Row(
        modifier = GlanceModifier.fillMaxWidth().padding(top = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ArrowButton(label = "◀", delta = -1)
        Spacer(GlanceModifier.defaultWeight())
        PageDots(page)
        Spacer(GlanceModifier.defaultWeight())
        ArrowButton(label = "▶", delta = 1)
    }
}

@Composable
private fun ArrowButton(label: String, delta: Int) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = GlanceModifier
            .background(ColorProvider(Color(0xFF1F3554)))
            .cornerRadius(10.dp)
            .padding(horizontal = 10.dp, vertical = 4.dp)
            .clickable(actionRunCallback<MultiPageActionCallback>(pageActionParams(delta))),
    ) {
        Text(
            text = label,
            style = TextStyle(color = white(0.95f), fontSize = 12.sp, fontWeight = FontWeight.Bold),
        )
    }
}

@Composable
private fun PageDots(page: Int) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        for (i in 0 until 4) {
            Box(
                modifier = GlanceModifier
                    .width(6.dp)
                    .height(6.dp)
                    .padding(horizontal = 0.dp)
                    .background(
                        if (i == page) ColorProvider(Color(0xFFE0F2FE))
                        else ColorProvider(Color(0x33FFFFFF))
                    )
                    .cornerRadius(3.dp),
            ) {}
            if (i < 3) Spacer(GlanceModifier.width(4.dp))
        }
    }
}

// ── Pages ─────────────────────────────────────────────────────────────

@Composable
private fun CurrentPage(p: WidgetPayload) {
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
            Spacer(GlanceModifier.height(2.dp))
            Text(
                text = "Feels ${p.current.feels ?: "--"}°",
                style = TextStyle(color = white(0.6f), fontSize = 10.sp),
            )
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = iconGlyph(p.current.icon),
                style = TextStyle(fontSize = 26.sp),
            )
            Spacer(GlanceModifier.width(6.dp))
            Text(
                text = "${p.current.temp ?: "--"}°",
                style = TextStyle(color = white(1f), fontSize = 32.sp, fontWeight = FontWeight.Bold),
            )
        }
    }
}

@Composable
private fun ForecastPage(p: WidgetPayload) {
    Column(modifier = GlanceModifier.fillMaxSize()) {
        Text(
            text = "${p.location} — 5-day",
            style = TextStyle(color = white(0.8f), fontSize = 11.sp, fontWeight = FontWeight.Medium),
            maxLines = 1,
        )
        Spacer(GlanceModifier.defaultWeight())
        Row(modifier = GlanceModifier.fillMaxWidth()) {
            p.forecast.take(5).forEach { d ->
                Column(
                    modifier = GlanceModifier.defaultWeight(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = d.day,
                        style = TextStyle(color = white(0.55f), fontSize = 10.sp, fontWeight = FontWeight.Medium),
                    )
                    Spacer(GlanceModifier.height(2.dp))
                    Text(
                        text = iconGlyph(d.icon),
                        style = TextStyle(fontSize = 18.sp),
                    )
                    Spacer(GlanceModifier.height(2.dp))
                    Text(
                        text = "${d.hi}°",
                        style = TextStyle(color = white(0.95f), fontSize = 11.sp, fontWeight = FontWeight.Bold),
                    )
                    Text(
                        text = "${d.lo}°",
                        style = TextStyle(color = white(0.55f), fontSize = 10.sp),
                    )
                }
            }
        }
        Spacer(GlanceModifier.defaultWeight())
    }
}

@Composable
private fun SunMoonPage(p: WidgetPayload) {
    // Without sun/moon ephemeris in the payload, surface the observation
    // freshness + the alert (which is the most weather-y signal we have
    // here). When we add solar fields to /widget endpoint, swap this
    // out for actual sunrise/sunset.
    Column(
        modifier = GlanceModifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(GlanceModifier.defaultWeight())
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(text = "☀️ ↑", style = TextStyle(color = white(0.85f), fontSize = 13.sp))
            Spacer(GlanceModifier.width(6.dp))
            Text(text = "—", style = TextStyle(color = white(0.6f), fontSize = 13.sp))
            Spacer(GlanceModifier.width(14.dp))
            Text(text = "🌙 ↓", style = TextStyle(color = white(0.85f), fontSize = 13.sp))
            Spacer(GlanceModifier.width(6.dp))
            Text(text = "—", style = TextStyle(color = white(0.6f), fontSize = 13.sp))
        }
        Spacer(GlanceModifier.height(6.dp))
        Text(
            text = "Sun & moon coming soon",
            style = TextStyle(color = white(0.45f), fontSize = 10.sp),
        )
        Spacer(GlanceModifier.defaultWeight())
    }
}

@Composable
private fun ClockPage(p: WidgetPayload) {
    // Time renders at widget-update time. Refreshes every 15 min along
    // with the rest of the widget — accurate within that window.
    val fmt = SimpleDateFormat("h:mm", Locale.getDefault())
    val ampm = SimpleDateFormat("a", Locale.getDefault())
    val time = fmt.format(Date())
    val mer = ampm.format(Date())
    Row(
        modifier = GlanceModifier.fillMaxSize(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = GlanceModifier.defaultWeight()) {
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    text = time,
                    style = TextStyle(color = white(1f), fontSize = 36.sp, fontWeight = FontWeight.Bold),
                )
                Spacer(GlanceModifier.width(3.dp))
                Text(
                    text = mer,
                    style = TextStyle(color = white(0.6f), fontSize = 14.sp, fontWeight = FontWeight.Medium),
                )
            }
            Text(
                text = p.location,
                style = TextStyle(color = white(0.55f), fontSize = 10.sp),
                maxLines = 1,
            )
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(
                text = iconGlyph(p.current.icon),
                style = TextStyle(fontSize = 22.sp),
            )
            Text(
                text = "${p.current.temp ?: "--"}°",
                style = TextStyle(color = white(0.95f), fontSize = 18.sp, fontWeight = FontWeight.Bold),
            )
        }
    }
}

// ── Shared helpers ────────────────────────────────────────────────────

@Composable
private fun LoadingPanel(error: String?, lastAttempt: Long) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = GlanceModifier.fillMaxSize().padding(8.dp),
    ) {
        Spacer(GlanceModifier.defaultWeight())
        Text(
            text = if (error == null) "Loading…" else "Couldn't load",
            style = TextStyle(color = white(0.85f), fontSize = 12.sp, fontWeight = FontWeight.Medium),
        )
        if (error != null) {
            Spacer(GlanceModifier.height(2.dp))
            Text(
                text = error,
                style = TextStyle(color = white(0.55f), fontSize = 9.sp),
                maxLines = 2,
            )
        }
        if (lastAttempt > 0L) {
            Spacer(GlanceModifier.height(2.dp))
            Text(
                text = "Last try ${ageLabel(lastAttempt)} ago",
                style = TextStyle(color = white(0.45f), fontSize = 9.sp),
            )
        }
        Spacer(GlanceModifier.defaultWeight())
    }
}

private fun white(alpha: Float): ColorProvider = ColorProvider(Color(1f, 1f, 1f, alpha))

private fun ageLabel(timestamp: Long): String {
    val seconds = (System.currentTimeMillis() - timestamp) / 1000
    return when {
        seconds < 60 -> "${seconds}s"
        seconds < 3600 -> "${seconds / 60}m"
        else -> "${seconds / 3600}h"
    }
}
