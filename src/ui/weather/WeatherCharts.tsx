import { useEffect, useMemo, useState } from 'react';
import LineChart from './LineChart';
import { getReadingsRange, type WeatherReading } from '../../lib/weatherService';

type Range = '24h' | '7d' | '30d';
type Metric = 'temp' | 'hum' | 'wind' | 'rain' | 'bar' | 'solar';

const RANGES: { id: Range; label: string; ms: number }[] = [
  { id: '24h', label: '24 Hours', ms: 24 * 3600_000 },
  { id: '7d', label: '7 Days', ms: 7 * 24 * 3600_000 },
  { id: '30d', label: '30 Days', ms: 30 * 24 * 3600_000 },
];

const METRICS: { id: Metric; label: string }[] = [
  { id: 'temp', label: 'Temperature' },
  { id: 'hum', label: 'Humidity' },
  { id: 'wind', label: 'Wind' },
  { id: 'rain', label: 'Rain' },
  { id: 'bar', label: 'Pressure' },
  { id: 'solar', label: 'Solar / UV' },
];

export default function WeatherCharts({ stationId }: { stationId: number }) {
  const [range, setRange] = useState<Range>('24h');
  const [metric, setMetric] = useState<Metric>('temp');
  const [readings, setReadings] = useState<WeatherReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const rangeDef = RANGES.find((r) => r.id === range)!;
    const to = new Date();
    const from = new Date(Date.now() - rangeDef.ms);
    setLoading(true);
    getReadingsRange(stationId, from.toISOString(), to.toISOString())
      .then((data) => setReadings(data))
      .catch(() => setReadings([]))
      .finally(() => setLoading(false));
  }, [stationId, range]);

  const series = useMemo(() => {
    const t = (r: WeatherReading) => new Date(r.observed_at).getTime();
    switch (metric) {
      case 'temp':
        return [
          { label: 'Outdoor', color: '#fbbf24', points: readings.map((r) => ({ t: t(r), v: r.temp })) },
          { label: 'Dew Point', color: '#60a5fa', points: readings.map((r) => ({ t: t(r), v: r.dew_point })) },
          { label: 'Feels Like', color: '#f472b6', points: readings.map((r) => ({ t: t(r), v: r.thw_index ?? r.heat_index ?? r.wind_chill })) },
          { label: 'Indoor', color: '#a78bfa', points: readings.map((r) => ({ t: t(r), v: r.temp_in })) },
        ];
      case 'hum':
        return [
          { label: 'Outdoor %', color: '#34d399', points: readings.map((r) => ({ t: t(r), v: r.hum })) },
          { label: 'Indoor %', color: '#a78bfa', points: readings.map((r) => ({ t: t(r), v: r.hum_in })) },
        ];
      case 'wind':
        return [
          { label: 'Avg (10m)', color: '#60a5fa', points: readings.map((r) => ({ t: t(r), v: r.wind_speed_avg_last_10_min })) },
          { label: 'Gust (10m)', color: '#f87171', points: readings.map((r) => ({ t: t(r), v: r.wind_speed_hi_last_10_min })) },
        ];
      case 'rain':
        return [
          { label: 'Rate ("/hr)', color: '#60a5fa', points: readings.map((r) => ({ t: t(r), v: r.rain_rate_last_in })) },
          { label: 'Day Total (")', color: '#3b82f6', points: readings.map((r) => ({ t: t(r), v: r.rainfall_day_in })) },
        ];
      case 'bar':
        return [
          { label: 'Sea Level', color: '#c084fc', points: readings.map((r) => ({ t: t(r), v: r.bar_sea_level })) },
          { label: 'Absolute', color: '#a78bfa', points: readings.map((r) => ({ t: t(r), v: r.bar_absolute })) },
        ];
      case 'solar':
        return [
          { label: 'Solar (W/m²)', color: '#fbbf24', points: readings.map((r) => ({ t: t(r), v: r.solar_rad })) },
          { label: 'UV Index', color: '#f472b6', points: readings.map((r) => ({ t: t(r), v: r.uv_index })) },
        ];
    }
  }, [readings, metric]);

  const yUnit = useMemo(() => {
    switch (metric) {
      case 'temp': return '°F';
      case 'hum': return '%';
      case 'wind': return ' mph';
      case 'rain': return '"';
      case 'bar': return '';
      case 'solar': return '';
    }
  }, [metric]);

  const hasData = series.some((s) => s.points.some((p) => p.v !== null && p.v !== undefined));

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-1">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                metric === m.id
                  ? 'bg-amber-500/20 text-amber-400 font-medium'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 border border-white/10 rounded-lg p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`text-xs px-2.5 py-1 rounded transition-colors ${
                range === r.id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-white/40 mb-1">
        {readings.length} readings
      </div>

      {loading ? (
        <div className="h-[220px] flex items-center justify-center text-white/30 text-sm">Loading...</div>
      ) : !hasData ? (
        <div className="h-[220px] flex items-center justify-center text-white/30 text-sm">
          No data for this range yet. Data accumulates as ingestion runs.
        </div>
      ) : (
        <LineChart series={series} yUnit={yUnit} />
      )}
    </div>
  );
}
