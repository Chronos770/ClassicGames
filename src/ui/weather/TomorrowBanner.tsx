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

interface TomorrowSummary {
  day: NwsForecastPeriod | null;
  night: NwsForecastPeriod | null;
  label: string;
}

function findTomorrow(periods: NwsForecastPeriod[]): TomorrowSummary {
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
    day,
    night,
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

export default function TomorrowBanner({ station, tick, onOpen }: Props) {
  const forecast = useNwsForecast(station?.latitude ?? null, station?.longitude ?? null, tick);
  const periods = forecast.data?.properties.periods ?? null;
  const summary = useMemo(() => (periods ? findTomorrow(periods) : null), [periods]);

  if (forecast.loading && !summary) return null;
  if (forecast.error) return null;
  if (!summary || !summary.day) return null;

  const day = summary.day;
  const night = summary.night;
  const tone = toneFor(day);
  const conditionKey = forecastConditionKey(day.shortForecast, day.isDaytime);

  const rainPct = day.probabilityOfPrecipitation.value ?? 0;
  const showRain = rainPct >= 10;

  const bits: string[] = [];
  bits.push(`High ${day.temperature}°${day.temperatureUnit}`);
  if (night && night.temperature !== null && night.temperature !== undefined) {
    bits.push(`Low ${night.temperature}°${night.temperatureUnit}`);
  }
  if (showRain) bits.push(`Rain ${rainPct}%`);
  if (day.windSpeed) {
    const wd = day.windDirection ? ` ${day.windDirection}` : '';
    bits.push(`Wind${wd} ${day.windSpeed}`);
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-xl border p-3 ${tone.bg} ${tone.border} flex items-center gap-3 mb-4 hover:bg-slate-800/70 transition-colors text-left`}
    >
      <div className="flex-shrink-0">
        <AnimatedWeatherIcon conditionKey={conditionKey} isDay={day.isDaytime} size={44} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${tone.accent}`}>
          {summary.label}: {day.shortForecast}
        </div>
        <div className="text-[11px] text-white/60 mt-0.5 truncate">{bits.join(' · ')}</div>
      </div>
      <span className="text-white/40 text-xs flex-shrink-0" aria-hidden>›</span>
    </button>
  );
}
