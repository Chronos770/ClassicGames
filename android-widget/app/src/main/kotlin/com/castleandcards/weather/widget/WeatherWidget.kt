package com.castleandcards.weather.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class WeatherWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val payload = WeatherRepo.cached(context)
        val error = if (payload == null) WeatherRepo.lastError(context) else null
        provideContent {
            GlanceTheme {
                WidgetContent(context = context, payload = payload, error = error)
            }
        }
    }
}

@Composable
private fun WidgetContent(context: Context, payload: WidgetPayload?, error: String?) {
    // Tap bounces through LaunchActivity, which fires the ACTION_VIEW
    // intent at the configured PWA URL. Glance's actionStartActivity
    // only accepts an activity class or ComponentName, not a raw Intent.
    val openApp = actionStartActivity<LaunchActivity>()

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(2.dp)
            .clickable(openApp),
    ) {
        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ImageProvider(R.drawable.widget_background))
                .cornerRadius(28.dp)
                .padding(horizontal = 14.dp, vertical = 12.dp),
        ) {
            if (payload == null) LoadingBlock(error) else FilledLayout(payload)
        }
    }
}

@Composable
private fun LoadingBlock(error: String?) {
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
            Spacer(GlanceModifier.height(4.dp))
            Text(
                text = "Tap to open the dashboard",
                style = TextStyle(color = white(0.4f), fontSize = 9.sp),
            )
        }
        Spacer(GlanceModifier.defaultWeight())
    }
}

@Composable
private fun FilledLayout(p: WidgetPayload) {
    Column(modifier = GlanceModifier.fillMaxSize()) {
        // Header row: location (with optional alert glyph) ··· big temp + feels-like ··· metrics column
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Left column: location + (maybe) alert glyph
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

            // Middle: big temp + feels-like + icon glyph
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

            // Right metrics column
            Column(horizontalAlignment = Alignment.End) {
                Metric(label = "↓", value = p.current.precipPct?.let { "$it%" } ?: "--")
                Spacer(GlanceModifier.height(2.dp))
                Metric(label = "≋", value = p.current.windMph?.let { "$it MPH" } ?: "--")
                Spacer(GlanceModifier.height(2.dp))
                Metric(label = "◐", value = p.current.humidity?.let { "$it%" } ?: "--")
            }
        }

        Spacer(GlanceModifier.height(10.dp))

        // Forecast row — up to 5 days, evenly distributed.
        Row(modifier = GlanceModifier.fillMaxWidth()) {
            p.forecast.take(5).forEach { day ->
                ForecastCell(day = day, modifier = GlanceModifier.defaultWeight())
            }
        }
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
