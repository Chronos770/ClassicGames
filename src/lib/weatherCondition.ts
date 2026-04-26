import type { WeatherReading } from './weatherService';
import { getSunTimes } from './astronomy';

export type ConditionKey =
  | 'thunderstorm'
  | 'heavyRain'
  | 'rain'
  | 'drizzle'
  | 'snow'
  | 'fog'
  | 'windy'
  | 'hot'
  | 'cold'
  | 'sunny'
  | 'clear'
  | 'partlyCloudy'
  | 'cloudy'
  | 'space'
  | 'unknown';

// Synthetic "Space" condition used when the user is on the Space tab.
// Doesn't depend on the live weather reading — it's a vibe override that
// swaps the canvas background to a starfield + nebula + comets and the
// page gradient to a deep-space wash.
export const SPACE_CONDITION: Condition = {
  key: 'space',
  label: 'Space',
  emoji: '\u{1F30C}',
  gradient: { from: 'from-indigo-500/15', via: 'via-purple-600/10', to: 'to-transparent' },
  pageBg: 'from-slate-950 via-indigo-950 to-purple-950',
  isDay: false,
};

export interface Condition {
  key: ConditionKey;
  label: string;
  emoji: string;
  // Tailwind-ready gradient stops (4 colors: outer tint, mid, accent, transparent endpoint)
  gradient: { from: string; via: string; to: string };
  // Ambient background gradient css (for page-level bg)
  pageBg: string;
  isDay: boolean;
}

function gradient(from: string, via: string, to: string) {
  return { from, via, to };
}

// Classify current conditions. Uses solar_rad + rain rate + wind +
// sunrise/sunset as heuristic inputs.
//
// Optional `nwsShortForecast` (e.g. "Mostly Cloudy", "Showers", "Sunny")
// from the NWS hourly forecast for *this* hour acts as a tie-breaker
// against the station's instantaneous snapshot. The station can mis-call
// "Sunny" when solar momentarily spikes through a break in clouds, or
// when its reading is 15+ minutes stale; NWS data is human-curated and
// catches those misses.
export function classifyCondition(
  reading: WeatherReading,
  lat: number | null,
  lon: number | null,
  nwsShortForecast?: string | null,
): Condition {
  const now = new Date(reading.observed_at);
  let isDay = true;
  if (lat !== null && lon !== null) {
    const st = getSunTimes(now, lat, lon);
    if (st.sunrise && st.sunset) {
      const t = now.getTime();
      isDay = t >= st.sunrise.getTime() && t <= st.sunset.getTime();
    }
  } else {
    const h = now.getHours();
    isDay = h >= 6 && h <= 19;
  }

  const rate = reading.rain_rate_last_in ?? 0;
  const rain15 = reading.rainfall_last_15_min_in ?? 0;
  const rain60 = reading.rainfall_last_60_min_in ?? 0;
  const rainDay = reading.rainfall_day_in ?? 0;
  const wind = reading.wind_speed_avg_last_10_min ?? reading.wind_speed_last ?? 0;
  const gust = reading.wind_speed_hi_last_10_min ?? 0;
  const temp = reading.temp ?? 60;
  const hum = reading.hum ?? 50;
  const dew = reading.dew_point ?? 0;
  const solar = reading.solar_rad;
  const baro = reading.bar_sea_level ?? 30;
  const nws = (nwsShortForecast || '').toLowerCase();
  // NWS is used ONLY as a sunny-vs-cloudy tie-breaker (because the
  // station's solar reading can spike during a brief sun-break and
  // mis-call sunny). Rain intensity is driven entirely by what the
  // WeatherLink station is actually measuring — we don't render rain
  // visuals just because NWS says "rain in forecast" or "chance of
  // rain later today".
  const nwsFog = /fog|mist|haze/.test(nws);
  const nwsCloudy = /cloudy|overcast/.test(nws);
  // If NWS mentions ANY precipitation in the current-hour short
  // forecast, the sky cannot be clear — block "Sunny" even if the
  // station's solar radiation is reading high during a temporary
  // gap in the clouds. This catches phrases like "Slight Chance
  // Showers" that don't literally contain "cloudy".
  const nwsPrecipMention = /rain|shower|drizzle|thunder|snow|sleet|wintry|hail|flurr/.test(nws);

  // Thunderstorm heuristic: heavy rain + low pressure + gusty winds.
  // Pressure + wind tell us this is electrified weather, not just rain.
  if (rate > 0.5 || (rain15 > 0.15 && baro < 29.8 && gust > 25)) {
    return {
      key: 'thunderstorm',
      label: 'Thunderstorm',
      emoji: '\u{26C8}\u{FE0F}',
      gradient: gradient('from-indigo-500/20', 'via-purple-500/10', 'to-transparent'),
      pageBg: 'from-indigo-950 via-purple-950 to-slate-950',
      isDay,
    };
  }

  if (rate > 0.2 || rain15 > 0.1) {
    return {
      key: 'heavyRain',
      label: 'Heavy Rain',
      emoji: '\u{1F327}\u{FE0F}',
      gradient: gradient('from-blue-600/20', 'via-slate-500/10', 'to-transparent'),
      pageBg: 'from-blue-950 via-slate-900 to-blue-950',
      isDay,
    };
  }

  if (rate > 0.02 || rain60 > 0.05) {
    return {
      key: 'rain',
      label: 'Rain',
      emoji: '\u{1F327}\u{FE0F}',
      gradient: gradient('from-blue-500/15', 'via-slate-500/10', 'to-transparent'),
      pageBg: 'from-slate-900 via-blue-950 to-slate-900',
      isDay,
    };
  }

  if (rate > 0 || rain60 > 0.01) {
    return {
      key: 'drizzle',
      label: 'Drizzle',
      emoji: '\u{1F326}\u{FE0F}',
      gradient: gradient('from-sky-500/15', 'via-slate-500/5', 'to-transparent'),
      pageBg: 'from-slate-900 via-sky-950 to-slate-800',
      isDay,
    };
  }

  if (temp <= 32 && (rate > 0 || rain15 > 0)) {
    return {
      key: 'snow',
      label: 'Snow',
      emoji: '\u{2744}\u{FE0F}',
      gradient: gradient('from-sky-300/15', 'via-slate-300/10', 'to-transparent'),
      pageBg: 'from-slate-700 via-slate-600 to-slate-800',
      isDay,
    };
  }

  // Fog heuristic: near dew point, high humidity, low wind, or NWS says fog.
  if ((hum >= 95 && temp - dew <= 2 && wind < 3) || nwsFog) {
    return {
      key: 'fog',
      label: 'Fog',
      emoji: '\u{1F32B}\u{FE0F}',
      gradient: gradient('from-slate-400/15', 'via-slate-500/5', 'to-transparent'),
      pageBg: 'from-slate-600 via-slate-500 to-slate-700',
      isDay,
    };
  }

  if (wind >= 20 || gust >= 35) {
    return {
      key: 'windy',
      label: 'Windy',
      emoji: '\u{1F4A8}',
      gradient: gradient('from-teal-500/15', 'via-slate-500/5', 'to-transparent'),
      pageBg: 'from-teal-950 via-slate-900 to-teal-900',
      isDay,
    };
  }

  if (isDay && temp >= 90) {
    return {
      key: 'hot',
      label: 'Hot & Clear',
      emoji: '\u{1F525}',
      gradient: gradient('from-orange-500/20', 'via-amber-500/10', 'to-transparent'),
      pageBg: 'from-orange-900 via-amber-900 to-red-950',
      isDay,
    };
  }
  if (temp <= 20) {
    return {
      key: 'cold',
      label: 'Frigid',
      emoji: '\u{1F976}',
      gradient: gradient('from-sky-400/15', 'via-indigo-500/10', 'to-transparent'),
      pageBg: 'from-indigo-950 via-sky-950 to-slate-900',
      isDay,
    };
  }

  // Cloud cover estimate via solar compared to clear-sky max.
  // Rough clear-sky ceiling as function of time of day (watts/m²).
  // We need to differentiate "we know it's clear" from "we don't have a
  // solar reading at all" — previously cloudiness defaulted to 0 (clear)
  // when solar was null, which made the classifier return Sunny on every
  // station that lacks a solar sensor or that reported a null reading.
  let cloudiness = 0;
  let cloudinessKnown = false;
  if (isDay && solar !== null) {
    const st = lat !== null && lon !== null ? getSunTimes(now, lat, lon) : null;
    const frac = st?.dayFraction ?? 0.5;
    const arc = Math.sin(frac * Math.PI); // 0..1..0 across day
    const ceiling = Math.max(120, 950 * arc);
    cloudiness = Math.max(0, Math.min(1, 1 - solar / ceiling));
    cloudinessKnown = true;
  }

  if (!isDay) {
    return {
      key: 'clear',
      label: 'Clear Night',
      emoji: '\u{1F319}',
      gradient: gradient('from-indigo-600/20', 'via-slate-600/10', 'to-transparent'),
      pageBg: 'from-indigo-950 via-slate-950 to-slate-950',
      isDay,
    };
  }

  // Block "Sunny" when:
  //  - NWS says cloudy / overcast for this hour
  //  - NWS mentions any precip in this hour's forecast (showers, thunder,
  //    drizzle, snow, etc.) — sky can't be clear if rain is in the picture
  //  - rain has fallen today (≥ 0.05" — a clearly wet day isn't "sunny"
  //    even if a temporary break in clouds spikes solar radiation)
  //  - we have no solar reading and no NWS hint at all (no info → don't
  //    commit to either extreme; default to partly cloudy)
  const blockSunny = nwsCloudy || nwsPrecipMention || rainDay >= 0.05 || !cloudinessKnown;
  const forceCloudy = nwsCloudy;

  if (cloudinessKnown && cloudiness < 0.10 && !blockSunny) {
    return {
      key: 'sunny',
      label: 'Sunny',
      emoji: '\u{2600}\u{FE0F}',
      gradient: gradient('from-amber-400/20', 'via-sky-400/10', 'to-transparent'),
      pageBg: 'from-sky-700 via-sky-800 to-blue-900',
      isDay,
    };
  }
  // Partly cloudy when we have a solar reading that's modest and NWS
  // isn't firmly overcast. If we have no solar reading, we land here too
  // (instead of crashing through to "Sunny") unless NWS forces cloudy.
  if (!forceCloudy && (!cloudinessKnown || cloudiness < 0.45)) {
    return {
      key: 'partlyCloudy',
      label: 'Partly Cloudy',
      emoji: '\u{26C5}',
      gradient: gradient('from-sky-400/15', 'via-slate-400/10', 'to-transparent'),
      pageBg: 'from-sky-800 via-slate-700 to-sky-900',
      isDay,
    };
  }
  return {
    key: 'cloudy',
    label: 'Cloudy',
    emoji: '\u{2601}\u{FE0F}',
    gradient: gradient('from-slate-400/15', 'via-slate-500/5', 'to-transparent'),
    pageBg: 'from-slate-700 via-slate-600 to-slate-800',
    isDay,
  };
}
