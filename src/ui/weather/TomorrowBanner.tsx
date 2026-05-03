import { useMemo } from 'react';
import { forecastConditionKey, type NwsForecastPeriod } from '../../lib/nwsService';
import { useNwsForecast } from '../../lib/nwsCache';
import type { WeatherStation } from '../../lib/weatherService';
import AnimatedWeatherIcon from './AnimatedWeatherIcon';

interface Props {
  station: WeatherStation | null;
  tick: number;
  onOpen?: () => void;
}

interface DaySummary {
  // Best-effort "headline" period — the next daytime period that hasn't
  // ended yet for "today", or tomorrow's daytime period for "tomorrow".
  // Falls back to a nighttime period when daytime is unavailable.
  primary: NwsForecastPeriod | null;
  // Companion period — the night that follows the primary day, used to
  // surface the overnight low temp.
  companion: NwsForecastPeriod | null;
  label: string;
}

// Pick the period that should headline "Today" right now.
// Morning/afternoon: today's daytime period (e.g. "This Afternoon", "Today").
// Evening/night: tonight's nighttime period.
function findToday(periods: NwsForecastPeriod[]): DaySummary {
  const now = new Date();
  const todayKey = now.toDateString();
  let day: NwsForecastPeriod | null = null;
  let night: NwsForecastPeriod | null = null;
  for (const p of periods) {
    const startKey = new Date(p.startTime).toDateString();
    const endTime = new Date(p.endTime).getTime();
    if (endTime <= now.getTime()) continue; // already over
    if (startKey === todayKey) {
      if (p.isDaytime && !day) day = p;
      if (!p.isDaytime && !night) night = p;
    } else if (startKey === new Date(now.getTime() + 86400_000).toDateString()) {
      // Spillover for the night that's "tonight" but technically wraps midnight
      if (!p.isDaytime && !night && new Date(p.startTime).getTime() < now.getTime() + 12 * 3600_000)
        night = p;
    }
    if (day && night) break;
  }
  // Headline is whichever is most current/upcoming.
  let primary: NwsForecastPeriod | null;
  if (day && new Date(day.startTime).getTime() <= now.getTime() + 6 * 3600_000) {
    primary = day;
  } else if (night) {
    primary = night;
  } else {
    primary = day ?? null;
  }
  return {
    primary,
    companion: primary === day ? night : null,
    label: primary?.name ?? 'Today',
  };
}

function findTomorrow(periods: NwsForecastPeriod[]): DaySummary {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowKey = tomorrow.toDateString();
  let day: NwsForecastPeriod | null = null;
  let night: NwsForecastPeriod | null = null;
  for (const p of periods) {
    const startKey = new Date(p.startTime).toDateString();
    if (startKey === tomorrowKey) {
      if (p.isDaytime && !day) day = p;
      if (!p.isDaytime && !night) night = p;
    }
  }
  if (!day) {
    for (const p of periods) {
      if (p.isDaytime && new Date(p.startTime).getTime() > now.getTime()) {
        day = p;
        break;
      }
    }
  }
  return {
    primary: day,
    companion: night,
    label: day?.name ?? night?.name ?? 'Tomorrow',
  };
}

function toneFor(period: NwsForecastPeriod | null): { bg: string; border: string; accent: string } {
  // Opaque slate base so the canvas can't bleed through; only the border
  // and accent text carry the per-condition color cue (paired with the
  // icon already shown in the banner).
  const bg = 'bg-slate-900/85 backdrop-blur-sm';
  if (!period) return { bg, border: 'border-white/10', accent: 'text-white/80' };
  const s = period.shortForecast.toLowerCase();
  if (/thunder/.test(s)) return { bg, border: 'border-purple-500/30', accent: 'text-purple-200' };
  if (/snow|wintry|sleet|ice|freezing|flurr|blizzard/.test(s))
    return { bg, border: 'border-sky-400/30', accent: 'text-sky-200' };
  if (/rain|shower|drizzle/.test(s)) return { bg, border: 'border-blue-500/30', accent: 'text-blue-200' };
  if (/sunny|clear|fair/.test(s)) return { bg, border: 'border-amber-500/30', accent: 'text-amber-200' };
  return { bg, border: 'border-white/10', accent: 'text-white/80' };
}

function Banner({
  summary,
  onOpen,
}: {
  summary: DaySummary;
  onOpen?: () => void;
}) {
  const primary = summary.primary;
  if (!primary) return null;
  const companion = summary.companion;
  const tone = toneFor(primary);
  const conditionKey = forecastConditionKey(primary.shortForecast, primary.isDaytime);
  const rainPct = primary.probabilityOfPrecipitation.value ?? 0;
  const showRain = rainPct >= 10;

  const bits: string[] = [];
  if (primary.isDaytime) {
    bits.push(`High ${primary.temperature}°${primary.temperatureUnit}`);
    if (companion && companion.temperature !== null && companion.temperature !== undefined) {
      bits.push(`Low ${companion.temperature}°${companion.temperatureUnit}`);
    }
  } else {
    bits.push(`Low ${primary.temperature}°${primary.temperatureUnit}`);
  }
  if (showRain) bits.push(`Rain ${rainPct}%`);
  if (primary.windSpeed) {
    const wd = primary.windDirection ? ` ${primary.windDirection}` : '';
    bits.push(`Wind${wd} ${primary.windSpeed}`);
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-xl border p-3 ${tone.bg} ${tone.border} flex items-center gap-3 hover:bg-slate-800/70 transition-colors text-left`}
    >
      <div className="flex-shrink-0">
        <AnimatedWeatherIcon conditionKey={conditionKey} isDay={primary.isDaytime} size={44} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${tone.accent}`}>
          {summary.label}: {primary.shortForecast}
        </div>
        <div className="text-[11px] text-white/60 mt-0.5 truncate">{bits.join(' · ')}</div>
      </div>
      <span className="text-white/40 text-xs flex-shrink-0" aria-hidden>›</span>
    </button>
  );
}

export default function TomorrowBanner({ station, tick, onOpen }: Props) {
  const forecast = useNwsForecast(station?.latitude ?? null, station?.longitude ?? null, tick);
  const periods = forecast.data?.properties.periods ?? null;
  const today = useMemo(() => (periods ? findToday(periods) : null), [periods]);
  const tomorrow = useMemo(() => (periods ? findTomorrow(periods) : null), [periods]);

  if (forecast.loading && !today && !tomorrow) return null;
  if (forecast.error) return null;
  if (!today?.primary && !tomorrow?.primary) return null;

  return (
    <div className="space-y-2 mb-4">
      {today?.primary && <Banner summary={today} onOpen={onOpen} />}
      {tomorrow?.primary && <Banner summary={tomorrow} onOpen={onOpen} />}
    </div>
  );
}
