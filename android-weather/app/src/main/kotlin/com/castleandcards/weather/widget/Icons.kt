package com.castleandcards.weather.widget

// Tiny mapping from the JSON's icon vocabulary to Unicode glyphs.
// Glance Text() renders these as the system emoji font, which is more
// than good enough for a phone widget and dodges the drawable wiring.
internal fun iconGlyph(key: String): String = when (key) {
    "sunny" -> "☀️"          // ☀️
    "clear" -> "🌛"          // 🌛
    "partly" -> "⛅"               // ⛅
    "partlyNight" -> "☁️"    // ☁️ (cloud, night)
    "cloudy" -> "☁️"         // ☁️
    "rain" -> "🌧️"     // 🌧️
    "thunder" -> "⛈️"        // ⛈️
    "snow" -> "❄️"           // ❄️
    "fog" -> "≋"             // ≋ (U+224B triple tilde) — three wavy lines read as mist/fog. The proper 🌫️ tofu-renders on many Android emoji fonts and a plain cloud doesn't distinguish fog from cloudy.
    else -> "☁️"
}

// Show a triangle warning when there's any active NWS alert. We don't
// branch on the event name — a single accent keeps the widget calm.
internal const val ALERT_GLYPH = "⚠️" // ⚠️
