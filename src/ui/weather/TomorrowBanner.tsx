import { useMemo, useState } from 'react';
import { forecastConditionKey, type NwsForecastPeriod } from '../../lib/nwsService';
import { useNwsForecast, useNwsHourly } from '../../lib/nwsCache';
import type { WeatherStation } from '../../lib/weatherService';
import AnimatedWeatherIcon from './AnimatedWeatherIcon';

interface Props {
  station: WeatherStation | null;
  tick: number;
}

interface TomorrowSummary {
  day: NwsForecastPeriod | null;
  night: NwsForecastPeriod | null;
  label: string; // "Tomorrow" or NWS day name
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
  // Fallback: if today is so late that NWS already dropped today's daytime
  // period, use the next available daytime period.
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
  if (!period) return { bg: 'bg-white/5', border: 'border-white/10', accent: 'text-white/80' };
  const s = period.shortForecast.toLowerCase();
  if (/thunder/.test(s)) return { bg: 'bg-purple-500/12', border: 'border-purple-500/25', accent: 'text-purple-200' };
  if (/snow|wintry|sleet|ice|freezing|flurr|blizzard/.test(s))
    return { bg: 'bg-sky-400/10', border: 'border-sky-400/20', accent: 'text-sky-200' };
  if (/rain|shower|drizzle/.test(s))
    return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', accent: 'text-blue-200' };
  if (/sunny|clear|fair/.test(s))
    return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', accent: 'text-amber-200' };
  return { bg: 'bg-white/5', border: 'border-white/10', accent: 'text-white/80' };
}

export default function TomorrowBanner({ station, tick }: Props) {
  const [expanded, setExpanded] = useState(false);
  const forecast = useNwsForecast(station?.latitude ?? null, station?.longitude ?? null, tick);
  const hourly = useNwsHourly(station?.latitude ?? null, station?.longitude ?? null, tick);
  const periods = forecast.data?.properties.periods ?? null;

  const summary = useMemo(() => (periods ? findTomorrow(periods) : null), [periods]);

  // Hourly periods that fall on tomorrow's calendar date — used for the
  // expanded strip. Falls back to the next 12 hourly periods if NWS hasn't
  // delivered tomorrow yet.
  const tomorrowHourly = useMemo(() => {
    if (!hourly.data || !summary?.day) return [];
    const dateKey = new Date(summary.day.startTime).toDateString();
    const all = hourly.data.properties.periods;
    const onDay = all.filter((p) => new Date(p.startTime).toDateString() === dateKey);
    return onDay.length > 0 ? onDay : all.slice(0, 12);
  }, [hourly.data, summary]);

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

  // Bucket hourly periods into morning / afternoon / evening / night so the
  // expanded view summarizes by time-of-day instead of dumping 24 rows.
  type Bucket = { label: string; periods: NwsForecastPeriod[] };
  const buckets: Bucket[] = [
    { label: 'Morning (6–12)', periods: [] },
    { label: 'Afternoon (12–18)', periods: [] },
    { label: 'Evening (18–24)', periods: [] },
    { label: 'Late night (0–6)', periods: [] },
  ];
  for (const p of tomorrowHourly) {
    const h = new Date(p.startTime).getHours();
    if (h >= 6 && h < 12) buckets[0].periods.push(p);
    else if (h >= 12 && h < 18) buckets[1].periods.push(p);
    else if (h >= 18) buckets[2].periods.push(p);
    else buckets[3].periods.push(p);
  }

  return (
    <div className={`rounded-xl border ${tone.bg} ${tone.border} mb-4`}>
      {/* Header row — always visible, click to toggle */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 rounded-xl transition-colors"
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
        <span
          className="text-white/40 text-xs flex-shrink-0 transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-3 text-xs text-white/75">
          {/* Day & Night detailed paragraphs */}
          <div>
            <div className={`text-[10px] uppercase tracking-wide font-semibold ${tone.accent} mb-1`}>
              {day.name}
            </div>
            <div className="leading-relaxed">{day.detailedForecast}</div>
          </div>
          {night && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-indigo-300/80 font-semibold mb-1">
                {night.name}
              </div>
              <div className="leading-relaxed">{night.detailedForecast}</div>
            </div>
          )}

          {/* Time-of-day strip with mini icons */}
          {tomorrowHourly.length > 0 && (
            <div className="pt-2 border-t border-white/5">
              <div className="text-[10px] uppercase tracking-wide text-white/40 font-semibold mb-2">
                By time of day
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {buckets
                  .filter((b) => b.periods.length > 0)
                  .map((b) => {
                    const temps = b.periods.map((p) => p.temperature);
                    const hi = Math.max(...temps);
                    const lo = Math.min(...temps);
                    const maxRain = Math.max(
                      ...b.periods.map((p) => p.probabilityOfPrecipitation.value ?? 0),
                    );
                    const mid = b.periods[Math.floor(b.periods.length / 2)];
                    return (
                      <div
                        key={b.label}
                        className="bg-black/20 rounded-lg p-2 flex items-center gap-2"
                      >
                        <div className="flex-shrink-0">
                          <AnimatedWeatherIcon
                            conditionKey={forecastConditionKey(mid.shortForecast, mid.isDaytime)}
                            isDay={mid.isDaytime}
                            size={28}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-white/50">{b.label}</div>
                          <div className="text-xs font-mono">
                            <span className="text-amber-300">{hi}°</span>
                            <span className="text-white/30 mx-1">/</span>
                            <span className="text-sky-300">{lo}°</span>
                            {maxRain > 0 && (
                              <span className="text-blue-300 ml-1.5">{maxRain}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
