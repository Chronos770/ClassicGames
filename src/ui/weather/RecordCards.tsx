import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllTimeRecords, type WeatherRecords } from '../../lib/weatherService';
import {
  convertPrecip,
  convertPressure,
  convertTemp,
  convertWind,
  useWeatherUnitsStore,
} from '../../lib/weatherUnits';

interface RecordCard {
  key: string;
  label: string;
  value: string;
  unit: string;
  when: string | null;
  accent: 'heat' | 'cold' | 'rain' | 'wind' | 'pressure-high' | 'pressure-low';
  icon: string;
}

const ACCENTS: Record<string, { from: string; to: string; text: string; ring: string }> = {
  heat: {
    from: 'from-orange-500/15',
    to: 'to-rose-500/5',
    text: 'text-orange-300',
    ring: 'ring-orange-500/20',
  },
  cold: {
    from: 'from-sky-500/15',
    to: 'to-indigo-500/5',
    text: 'text-sky-300',
    ring: 'ring-sky-500/20',
  },
  rain: {
    from: 'from-blue-500/15',
    to: 'to-cyan-500/5',
    text: 'text-blue-300',
    ring: 'ring-blue-500/20',
  },
  wind: {
    from: 'from-emerald-500/15',
    to: 'to-teal-500/5',
    text: 'text-emerald-300',
    ring: 'ring-emerald-500/20',
  },
  'pressure-high': {
    from: 'from-amber-500/15',
    to: 'to-yellow-500/5',
    text: 'text-amber-300',
    ring: 'ring-amber-500/20',
  },
  'pressure-low': {
    from: 'from-violet-500/15',
    to: 'to-purple-500/5',
    text: 'text-violet-300',
    ring: 'ring-violet-500/20',
  },
};

function fmtWhen(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Format an ISO timestamp as YYYY-MM-DD in LOCAL time (so a 7pm reading
 *  routes to today's day page, not tomorrow's UTC day). */
function dayParam(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Props {
  stationId: number;
  /** Bumped whenever a new ingest tick fires — re-fetch to keep records fresh. */
  lastIngestTick?: number;
}

export default function RecordCards({ stationId, lastIngestTick }: Props) {
  const tempU = useWeatherUnitsStore((s) => s.temp);
  const windU = useWeatherUnitsStore((s) => s.wind);
  const pressU = useWeatherUnitsStore((s) => s.pressure);
  const precU = useWeatherUnitsStore((s) => s.precip);

  const tU = `°${tempU}`;
  const wU = windU === 'ms' ? 'm/s' : windU;
  const rU = precU === 'in' ? '"' : 'mm';
  const pU = pressU;

  const [recs, setRecs] = useState<WeatherRecords | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAllTimeRecords(stationId)
      .then((r) => {
        if (!cancelled) setRecs(r);
      })
      .catch(() => {
        if (!cancelled) setRecs(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stationId, lastIngestTick]);

  const records = useMemo<RecordCard[]>(() => {
    if (!recs) return [];
    const out: RecordCard[] = [];

    if (recs.hottest) {
      out.push({
        key: 'hottest',
        label: 'Hottest',
        value: (convertTemp(recs.hottest.v, tempU) ?? recs.hottest.v).toFixed(1),
        unit: tU,
        when: recs.hottest.observed_at,
        accent: 'heat',
        icon: '🔥',
      });
    }
    if (recs.coldest) {
      out.push({
        key: 'coldest',
        label: 'Coldest',
        value: (convertTemp(recs.coldest.v, tempU) ?? recs.coldest.v).toFixed(1),
        unit: tU,
        when: recs.coldest.observed_at,
        accent: 'cold',
        icon: '❄️',
      });
    }
    if (recs.wettestDay && recs.wettestDay.v > 0) {
      out.push({
        key: 'wettest-day',
        label: 'Wettest Day',
        value: (convertPrecip(recs.wettestDay.v, precU) ?? recs.wettestDay.v).toFixed(2),
        unit: rU,
        when: recs.wettestDay.observed_at,
        accent: 'rain',
        icon: '🌧️',
      });
    }
    if (recs.biggestStorm && recs.biggestStorm.v > 0) {
      out.push({
        key: 'biggest-storm',
        label: 'Biggest Storm',
        value: (convertPrecip(recs.biggestStorm.v, precU) ?? recs.biggestStorm.v).toFixed(2),
        unit: rU,
        when: recs.biggestStorm.start_at ?? recs.biggestStorm.observed_at,
        accent: 'rain',
        icon: '⛈️',
      });
    }
    if (recs.strongestGust && recs.strongestGust.v > 0) {
      out.push({
        key: 'gust',
        label: 'Strongest Gust',
        value: (convertWind(recs.strongestGust.v, windU) ?? recs.strongestGust.v).toFixed(1),
        unit: ` ${wU}`,
        when: recs.strongestGust.observed_at,
        accent: 'wind',
        icon: '💨',
      });
    }
    if (recs.mostYearlyRain && recs.mostYearlyRain.v > 0) {
      out.push({
        key: 'year-rain',
        label: 'Most Rain (Year)',
        value: (convertPrecip(recs.mostYearlyRain.v, precU) ?? recs.mostYearlyRain.v).toFixed(1),
        unit: rU,
        when: recs.mostYearlyRain.observed_at,
        accent: 'rain',
        icon: '📅',
      });
    }
    if (recs.highestPressure) {
      out.push({
        key: 'high-pressure',
        label: 'Highest Pressure',
        value: (convertPressure(recs.highestPressure.v, pressU) ?? recs.highestPressure.v).toFixed(pressU === 'inHg' ? 2 : 1),
        unit: ` ${pU}`,
        when: recs.highestPressure.observed_at,
        accent: 'pressure-high',
        icon: '☀️',
      });
    }
    if (recs.lowestPressure) {
      out.push({
        key: 'low-pressure',
        label: 'Lowest Pressure',
        value: (convertPressure(recs.lowestPressure.v, pressU) ?? recs.lowestPressure.v).toFixed(pressU === 'inHg' ? 2 : 1),
        unit: ` ${pU}`,
        when: recs.lowestPressure.observed_at,
        accent: 'pressure-low',
        icon: '🌪️',
      });
    }
    if (recs.peakRainRate && recs.peakRainRate.v > 0) {
      out.push({
        key: 'peak-rain-rate',
        label: 'Peak Rain Rate',
        value: (convertPrecip(recs.peakRainRate.v, precU) ?? recs.peakRainRate.v).toFixed(2),
        unit: `${rU}/hr`,
        when: recs.peakRainRate.observed_at,
        accent: 'rain',
        icon: '🌊',
      });
    }
    return out;
  }, [recs, tempU, windU, pressU, precU, tU, wU, rU, pU]);

  if (loading && !recs) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2 px-1">
          All-time records
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-3 h-[88px] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (records.length === 0) return null;

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2 px-1">
        All-time records
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {records.map((r) => {
          const a = ACCENTS[r.accent];
          const dp = dayParam(r.when);
          const inner = (
            <>
              <div className="flex items-start justify-between mb-1">
                <div className="text-[10px] uppercase tracking-wider text-white/55 font-semibold">
                  {r.label}
                </div>
                <span className="text-base leading-none opacity-80" aria-hidden>
                  {r.icon}
                </span>
              </div>
              <div className={`text-2xl font-bold tabular-nums ${a.text} leading-tight`}>
                {r.value}
                <span className="text-sm font-medium text-white/50 ml-0.5">{r.unit}</span>
              </div>
              <div className="text-[10px] text-white/40 mt-1 flex items-center justify-between">
                <span>{fmtWhen(r.when)}</span>
                {dp && <span className="text-white/30 group-hover:text-white/55 transition-colors">→</span>}
              </div>
            </>
          );
          const cls = `group relative overflow-hidden rounded-xl border border-white/10 ring-1 ${a.ring} bg-gradient-to-br ${a.from} ${a.to} backdrop-blur-sm p-3 text-left transition-transform hover:scale-[1.02] active:scale-[0.99]`;
          return dp ? (
            <Link key={r.key} to={`/weather/day/${dp}`} className={cls}>
              {inner}
            </Link>
          ) : (
            <div key={r.key} className={cls.replace(' transition-transform hover:scale-[1.02] active:scale-[0.99]', '')}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
