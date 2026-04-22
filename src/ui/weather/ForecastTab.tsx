import { useEffect, useState } from 'react';
import {
  forecastEmoji,
  getAlerts,
  getForecast,
  getHourlyForecast,
  type NwsAlert,
  type NwsForecast,
  type NwsForecastPeriod,
} from '../../lib/nwsService';
import type { WeatherStation } from '../../lib/weatherService';

export default function ForecastTab({ station }: { station: WeatherStation | null }) {
  const [forecast, setForecast] = useState<NwsForecast | null>(null);
  const [hourly, setHourly] = useState<NwsForecast | null>(null);
  const [alerts, setAlerts] = useState<NwsAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!station || station.latitude === null || station.longitude === null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      getForecast(station.latitude, station.longitude),
      getHourlyForecast(station.latitude, station.longitude),
      getAlerts(station.latitude, station.longitude),
    ])
      .then(([f, h, a]) => {
        if (cancelled) return;
        setForecast(f);
        setHourly(h);
        setAlerts(a);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e?.message ?? e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [station?.latitude, station?.longitude]);

  if (!station || station.latitude === null || station.longitude === null) {
    return <div className="text-white/30 text-sm py-8 text-center">Station location missing; forecast unavailable.</div>;
  }

  if (loading) {
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
      {alerts.length > 0 && <AlertsBanner alerts={alerts} />}
      {forecast && <CurrentPeriod period={forecast.properties.periods[0]} />}
      {hourly && <HourlyStrip periods={hourly.properties.periods.slice(0, 24)} />}
      {forecast && <DailyGrid periods={forecast.properties.periods} />}
      <div className="text-[10px] text-white/30 text-center">
        Forecast: National Weather Service (weather.gov)
        {forecast && ` · Updated ${new Date(forecast.properties.updateTime).toLocaleString()}`}
      </div>
    </div>
  );
}

function AlertsBanner({ alerts }: { alerts: NwsAlert[] }) {
  const severityColor: Record<string, string> = {
    Extreme: 'bg-red-500/20 border-red-500/40 text-red-200',
    Severe: 'bg-orange-500/15 border-orange-500/30 text-orange-200',
    Moderate: 'bg-amber-500/15 border-amber-500/30 text-amber-200',
    Minor: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-200',
    Unknown: 'bg-white/10 border-white/20 text-white/80',
  };

  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <details
          key={a.id}
          className={`rounded-xl border p-3 ${severityColor[a.properties.severity] ?? severityColor.Unknown}`}
        >
          <summary className="cursor-pointer flex items-start gap-2 list-none">
            <span className="text-lg leading-none">&#9888;&#65039;</span>
            <div className="flex-1">
              <div className="font-semibold text-sm">
                {a.properties.event}
                <span className="text-xs font-normal opacity-75 ml-2">
                  [{a.properties.severity} / {a.properties.urgency}]
                </span>
              </div>
              <div className="text-xs opacity-80 mt-0.5">{a.properties.headline}</div>
              <div className="text-[10px] opacity-60 mt-1">{a.properties.areaDesc}</div>
            </div>
          </summary>
          <div className="mt-2 pt-2 border-t border-current/20 text-xs whitespace-pre-wrap opacity-90">
            {a.properties.description}
            {a.properties.instruction && (
              <div className="mt-2 pt-2 border-t border-current/20">
                <strong>Instruction:</strong> {a.properties.instruction}
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

function CurrentPeriod({ period }: { period: NwsForecastPeriod }) {
  return (
    <div className="bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-transparent rounded-2xl border border-white/10 p-5">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/40 mb-1">{period.name}</div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl">{forecastEmoji(period.shortForecast, period.isDaytime)}</span>
            <span className="text-5xl font-display font-bold text-white tabular-nums">
              {period.temperature}°{period.temperatureUnit}
            </span>
          </div>
          <div className="text-sm text-white/70 mt-1">{period.shortForecast}</div>
        </div>
        <div className="text-right text-xs text-white/60 space-y-0.5">
          <div>
            <span className="text-white/40">Wind:</span> {period.windSpeed} {period.windDirection}
          </div>
          {period.probabilityOfPrecipitation.value !== null && (
            <div>
              <span className="text-white/40">Precip:</span> {period.probabilityOfPrecipitation.value}%
            </div>
          )}
        </div>
      </div>
      <div className="text-sm text-white/60 leading-relaxed">{period.detailedForecast}</div>
    </div>
  );
}

function HourlyStrip({ periods }: { periods: NwsForecastPeriod[] }) {
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">Next 24 Hours</div>
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
                <div className="text-xl my-1">{forecastEmoji(p.shortForecast, p.isDaytime)}</div>
                <div className="text-sm font-semibold text-white tabular-nums">
                  {p.temperature}°
                </div>
                {p.probabilityOfPrecipitation.value !== null && p.probabilityOfPrecipitation.value > 0 && (
                  <div className="text-[10px] text-blue-300 mt-0.5">
                    {p.probabilityOfPrecipitation.value}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DailyGrid({ periods }: { periods: NwsForecastPeriod[] }) {
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
        {days.map((d) => {
          const primary = d.day ?? d.night!;
          const hiPeriod = d.day ?? null;
          const loPeriod = d.night ?? null;
          return (
            <details key={d.key} className="bg-white/5 rounded-lg border border-white/5 overflow-hidden">
              <summary className="cursor-pointer list-none flex items-center gap-3 p-3 hover:bg-white/5 transition-colors">
                <span className="text-2xl">{forecastEmoji(primary.shortForecast, primary.isDaytime)}</span>
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
              </summary>
              <div className="px-3 pb-3 pt-1 border-t border-white/5 text-xs text-white/60 space-y-2">
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
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
