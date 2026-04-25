import { useMemo, useState } from 'react';
import {
  forecastConditionKey,
  parseWindSpeed,
  type NwsForecastPeriod,
} from '../../lib/nwsService';
import { useNwsForecast, useNwsHourly } from '../../lib/nwsCache';
import type { WeatherStation } from '../../lib/weatherService';
import LineChart from './LineChart';
import AnimatedWeatherIcon from './AnimatedWeatherIcon';

export default function ForecastSection({
  station,
  tick = 0,
}: {
  station: WeatherStation | null;
  tick?: number;
}) {
  const lat = station?.latitude ?? null;
  const lon = station?.longitude ?? null;
  const forecastQ = useNwsForecast(lat, lon, tick);
  const hourlyQ = useNwsHourly(lat, lon, tick);

  const forecast = forecastQ.data;
  const hourly = hourlyQ.data;
  const loading = forecastQ.loading || hourlyQ.loading;
  const error = forecastQ.error ?? hourlyQ.error;

  if (!station || lat === null || lon === null) {
    return <div className="text-white/30 text-sm py-8 text-center">Station location missing; forecast unavailable.</div>;
  }

  if (loading && !forecast && !hourly) {
    return <div className="text-white/30 text-sm py-8 text-center">Loading forecast from National Weather Service...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-200/80 rounded-xl p-4 text-sm">
        Couldn't load NWS forecast: {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {hourly && <Next24Hours periods={hourly.properties.periods.slice(0, 24)} />}
      {forecast && (
        <DailyGrid
          periods={forecast.properties.periods}
          hourly={hourly?.properties.periods ?? []}
        />
      )}
      <div className="text-[10px] text-white/30 text-center">
        Forecast: National Weather Service (weather.gov)
        {forecast && ` · Updated ${new Date(forecast.properties.updateTime).toLocaleString()}`}
      </div>
    </div>
  );
}

function Next24Hours({ periods }: { periods: NwsForecastPeriod[] }) {
  const [view, setView] = useState<'strip' | 'list'>('strip');

  const tempSeries = useMemo(
    () => [
      {
        label: 'Temp',
        color: '#fbbf24',
        points: periods.map((p) => ({
          t: new Date(p.startTime).getTime(),
          v: p.temperature,
        })),
      },
      {
        label: 'Precip %',
        color: '#60a5fa',
        points: periods.map((p) => ({
          t: new Date(p.startTime).getTime(),
          v: p.probabilityOfPrecipitation.value,
        })),
      },
    ],
    [periods],
  );

  // Summary stats
  const temps = periods.map((p) => p.temperature);
  const hiTemp = Math.max(...temps);
  const loTemp = Math.min(...temps);
  const maxPrecip = Math.max(
    ...periods.map((p) => p.probabilityOfPrecipitation.value ?? 0),
  );
  const maxWind = Math.max(...periods.map((p) => parseWindSpeed(p.windSpeed) ?? 0));

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-xs uppercase tracking-wide text-white/40 font-semibold">Next 24 Hours</div>
        <div className="flex gap-1 border border-white/10 rounded-lg p-0.5">
          <button
            onClick={() => setView('strip')}
            className={`text-xs px-2.5 py-1 rounded transition-colors ${
              view === 'strip' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            Quick
          </button>
          <button
            onClick={() => setView('list')}
            className={`text-xs px-2.5 py-1 rounded transition-colors ${
              view === 'list' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            Detailed
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 pb-4 border-b border-white/5">
        <SummaryStat label="High" value={`${hiTemp}°`} tone="amber" />
        <SummaryStat label="Low" value={`${loTemp}°`} tone="blue" />
        <SummaryStat label="Max Precip" value={`${maxPrecip}%`} tone={maxPrecip > 30 ? 'blue' : 'dim'} />
        <SummaryStat label="Peak Wind" value={`${Math.round(maxWind)} mph`} tone={maxWind > 15 ? 'amber' : 'dim'} />
      </div>

      {/* Temp chart (always visible for at-a-glance) */}
      <div className="mb-4">
        <LineChart series={tempSeries} height={140} />
      </div>

      {view === 'strip' ? (
        <div className="overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-1">
            {periods.map((p) => {
              const hour = new Date(p.startTime);
              return (
                <div
                  key={p.number}
                  className="flex flex-col items-center bg-white/5 rounded-lg p-2 min-w-[70px] text-center border border-white/5"
                >
                  <div className="text-[10px] text-white/50">
                    {hour.toLocaleTimeString([], { hour: 'numeric' })}
                  </div>
                  <div className="my-1">
                    <AnimatedWeatherIcon
                      conditionKey={forecastConditionKey(p.shortForecast, p.isDaytime)}
                      isDay={p.isDaytime}
                      size={36}
                    />
                  </div>
                  <div className="text-sm font-semibold text-white tabular-nums">
                    {p.temperature}°
                  </div>
                  {p.probabilityOfPrecipitation.value !== null &&
                    p.probabilityOfPrecipitation.value > 0 && (
                      <div className="text-[10px] text-blue-300 mt-0.5">
                        {p.probabilityOfPrecipitation.value}%
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {periods.map((p) => {
            const hour = new Date(p.startTime);
            const wind = parseWindSpeed(p.windSpeed);
            return (
              <div
                key={p.number}
                className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-sm"
              >
                <div className="w-16 sm:w-20 text-xs text-white/50 tabular-nums flex-shrink-0">
                  {hour.toLocaleTimeString([], { hour: 'numeric', hour12: true })}
                </div>
                <div className="w-8 flex-shrink-0 flex justify-center">
                  <AnimatedWeatherIcon
                    conditionKey={forecastConditionKey(p.shortForecast, p.isDaytime)}
                    isDay={p.isDaytime}
                    size={30}
                  />
                </div>
                <div className="w-12 text-base font-semibold text-white tabular-nums flex-shrink-0">
                  {p.temperature}°
                </div>
                <div className="flex-1 min-w-0 text-xs text-white/60 truncate">
                  {p.shortForecast}
                </div>
                <div className="hidden sm:flex items-center gap-1 text-xs text-white/50 w-24 justify-end tabular-nums">
                  <span className="text-white/30">💨</span>
                  <span>{wind !== null ? `${Math.round(wind)}` : '--'}</span>
                  <span className="text-white/30">{p.windDirection}</span>
                </div>
                <div className="w-14 text-xs text-right tabular-nums flex-shrink-0">
                  {p.probabilityOfPrecipitation.value !== null &&
                  p.probabilityOfPrecipitation.value > 0 ? (
                    <span className="text-blue-300">{p.probabilityOfPrecipitation.value}%</span>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'amber' | 'blue' | 'dim';
}) {
  const toneClass: Record<string, string> = {
    amber: 'text-amber-400',
    blue: 'text-blue-300',
    dim: 'text-white/60',
  };
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-white/40">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${toneClass[tone]}`}>{value}</div>
    </div>
  );
}

function DailyGrid({
  periods,
  hourly,
}: {
  periods: NwsForecastPeriod[];
  hourly: NwsForecastPeriod[];
}) {
  // Pair up day/night periods
  const days: { day?: NwsForecastPeriod; night?: NwsForecastPeriod; key: string }[] = [];
  let current: { day?: NwsForecastPeriod; night?: NwsForecastPeriod; key: string } | null = null;
  for (const p of periods) {
    const dateKey = new Date(p.startTime).toDateString();
    if (!current || current.key !== dateKey) {
      if (current) days.push(current);
      current = { key: dateKey };
    }
    if (p.isDaytime) current.day = p;
    else current.night = p;
  }
  if (current) days.push(current);

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">7-Day Forecast</div>
      <div className="space-y-2">
        {days
          .filter((d) => d.day || d.night)
          .map((d) => {
          const primary = d.day ?? d.night!;
          const hiPeriod = d.day ?? null;
          const loPeriod = d.night ?? null;
          const dayHourly = hourly.filter(
            (p) => new Date(p.startTime).toDateString() === d.key,
          );
          return (
            <details key={d.key} className="bg-white/5 rounded-lg border border-white/5 overflow-hidden group">
              <summary className="cursor-pointer list-none flex items-center gap-3 p-3 hover:bg-white/5 transition-colors">
                <AnimatedWeatherIcon
                  conditionKey={forecastConditionKey(primary.shortForecast, primary.isDaytime)}
                  isDay={primary.isDaytime}
                  size={40}
                />

                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium">{d.day?.name ?? d.night?.name}</div>
                  <div className="text-xs text-white/50 truncate">{primary.shortForecast}</div>
                </div>
                <div className="flex items-baseline gap-2 text-sm tabular-nums">
                  {hiPeriod && <span className="text-white font-semibold">{hiPeriod.temperature}°</span>}
                  {loPeriod && <span className="text-white/40">{loPeriod.temperature}°</span>}
                </div>
                {primary.probabilityOfPrecipitation.value !== null && primary.probabilityOfPrecipitation.value > 0 && (
                  <div className="text-xs text-blue-300 tabular-nums w-10 text-right">
                    {primary.probabilityOfPrecipitation.value}%
                  </div>
                )}
                <span
                  className="text-white/40 text-[10px] flex-shrink-0 transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                >
                  ▼
                </span>
              </summary>
              <div className="px-3 pb-3 pt-1 border-t border-white/5 text-xs text-white/60 space-y-3">
                {d.day && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-amber-400/80 mb-0.5">{d.day.name}</div>
                    <div>{d.day.detailedForecast}</div>
                  </div>
                )}
                {d.night && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-indigo-400/80 mb-0.5">{d.night.name}</div>
                    <div>{d.night.detailedForecast}</div>
                  </div>
                )}
                {dayHourly.length > 0 && <TimeOfDayStrip dayHourly={dayHourly} />}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

// Bucket a day's hourly periods into morning / afternoon / evening / late-night
// and render a 2x2 (or 1x4) grid of mini animated icons + hi/lo temps + max
// precip% — same layout as the expanded TomorrowBanner.
function TimeOfDayStrip({ dayHourly }: { dayHourly: NwsForecastPeriod[] }) {
  type Bucket = { label: string; periods: NwsForecastPeriod[] };
  const buckets: Bucket[] = [
    { label: 'Morning (6–12)', periods: [] },
    { label: 'Afternoon (12–18)', periods: [] },
    { label: 'Evening (18–24)', periods: [] },
    { label: 'Late night (0–6)', periods: [] },
  ];
  for (const p of dayHourly) {
    const h = new Date(p.startTime).getHours();
    if (h >= 6 && h < 12) buckets[0].periods.push(p);
    else if (h >= 12 && h < 18) buckets[1].periods.push(p);
    else if (h >= 18) buckets[2].periods.push(p);
    else buckets[3].periods.push(p);
  }
  const visible = buckets.filter((b) => b.periods.length > 0);
  if (visible.length === 0) return null;
  return (
    <div className="pt-2 border-t border-white/5">
      <div className="text-[10px] uppercase tracking-wide text-white/40 font-semibold mb-2">
        By time of day
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {visible.map((b) => {
          const temps = b.periods.map((p) => p.temperature);
          const hi = Math.max(...temps);
          const lo = Math.min(...temps);
          const maxRain = Math.max(
            ...b.periods.map((p) => p.probabilityOfPrecipitation.value ?? 0),
          );
          const mid = b.periods[Math.floor(b.periods.length / 2)];
          return (
            <div key={b.label} className="bg-black/20 rounded-lg p-2 flex items-center gap-2">
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
  );
}
