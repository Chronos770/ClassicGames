import { useEffect, useMemo, useState } from 'react';
import LineChart, { type Series } from './LineChart';
import StormsList from './StormsList';
import StatsTable, { StatsSummary } from './StatsTable';
import { getReadingsRange, type WeatherReading } from '../../lib/weatherService';
import {
  convertPrecip,
  convertPressure,
  convertTemp,
  convertWind,
  useWeatherUnitsStore,
} from '../../lib/weatherUnits';

type View = 'chart' | 'table' | 'summary';

type Preset = '24h' | '7d' | '30d' | '90d' | '1y' | 'all' | 'custom';
type Metric =
  | 'temp' | 'hum' | 'wind' | 'rain' | 'bar' | 'solar'
  | 'storms' | 'dewpoint' | 'rainTotals' | 'signal' | 'battery' | 'indoor';

const PRESETS: { id: Preset; label: string; days: number | null }[] = [
  { id: '24h', label: '24 Hours', days: 1 },
  { id: '7d', label: '7 Days', days: 7 },
  { id: '30d', label: '30 Days', days: 30 },
  { id: '90d', label: '90 Days', days: 90 },
  { id: '1y', label: '1 Year', days: 365 },
  { id: 'all', label: 'All', days: null },
  { id: 'custom', label: 'Custom', days: null },
];

const METRICS: { id: Metric; label: string; group: string }[] = [
  { id: 'temp', label: 'Temperature', group: 'Primary' },
  { id: 'hum', label: 'Humidity', group: 'Primary' },
  { id: 'wind', label: 'Wind', group: 'Primary' },
  { id: 'rain', label: 'Rain Rate', group: 'Primary' },
  { id: 'bar', label: 'Pressure', group: 'Primary' },
  { id: 'storms', label: 'Storm Events', group: 'Derived' },
  { id: 'dewpoint', label: 'Dew / Wet Bulb', group: 'Derived' },
  { id: 'rainTotals', label: 'Rain Totals', group: 'Derived' },
  { id: 'indoor', label: 'Indoor vs Outdoor', group: 'Derived' },
  { id: 'signal', label: 'Signal Strength', group: 'Station' },
  { id: 'battery', label: 'Battery', group: 'Station' },
];

// Max number of rows we'll fetch before downsampling. Large ranges (1y+) would
// otherwise be far too many rows for an inline SVG chart.
const MAX_POINTS = 2000;

// Downsample by bucketing consecutive rows. Most metrics are averaged, but
// cumulative-counter fields (which reset at day/month/year boundaries) are
// *sampled* — we take the last value in the bucket so the chart preserves the
// step-up/reset pattern instead of smearing it into a meaningless mean.
function downsample(rows: WeatherReading[], maxPoints: number): WeatherReading[] {
  if (rows.length <= maxPoints) return rows;
  const bucketSize = Math.ceil(rows.length / maxPoints);
  const out: WeatherReading[] = [];
  for (let i = 0; i < rows.length; i += bucketSize) {
    const slice = rows.slice(i, i + bucketSize);
    const avg = (k: keyof WeatherReading): number | null => {
      const vals = slice.map((r) => r[k]).filter((v) => typeof v === 'number') as number[];
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const last = (k: keyof WeatherReading): number | null => {
      for (let j = slice.length - 1; j >= 0; j--) {
        const v = slice[j][k];
        if (typeof v === 'number' && Number.isFinite(v)) return v;
      }
      return null;
    };
    const mid = slice[Math.floor(slice.length / 2)];
    out.push({
      ...mid,
      temp: avg('temp'),
      hum: avg('hum'),
      dew_point: avg('dew_point'),
      wet_bulb: avg('wet_bulb'),
      heat_index: avg('heat_index'),
      wind_chill: avg('wind_chill'),
      thw_index: avg('thw_index'),
      thsw_index: avg('thsw_index'),
      wind_speed_last: avg('wind_speed_last'),
      wind_speed_avg_last_10_min: avg('wind_speed_avg_last_10_min'),
      wind_speed_hi_last_10_min: avg('wind_speed_hi_last_10_min'),
      rain_rate_last_in: avg('rain_rate_last_in'),
      // Cumulative counters — sample rather than average.
      rainfall_day_in: last('rainfall_day_in'),
      rainfall_month_in: last('rainfall_month_in'),
      rainfall_year_in: last('rainfall_year_in'),
      bar_sea_level: avg('bar_sea_level'),
      bar_absolute: avg('bar_absolute'),
      solar_rad: avg('solar_rad'),
      uv_index: avg('uv_index'),
      temp_in: avg('temp_in'),
      hum_in: avg('hum_in'),
      rssi_last: avg('rssi_last'),
      reception_day: last('reception_day'),
      trans_battery_volt: avg('trans_battery_volt'),
      battery_percent: avg('battery_percent'),
    });
  }
  return out;
}

export default function HistoryTab({ stationId, lastIngestTick }: { stationId: number; lastIngestTick: number }) {
  const [preset, setPreset] = useState<Preset>('7d');
  const [metric, setMetric] = useState<Metric>('temp');
  const [view, setView] = useState<View>('chart');
  const [customStart, setCustomStart] = useState<string>(new Date(Date.now() - 14 * 86400_000).toISOString().slice(0, 10));
  const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().slice(0, 10));

  // For table/summary view we want raw rows (un-downsampled). For chart view
  // we keep the downsampled readings to keep SVG perf reasonable.
  const [readings, setReadings] = useState<WeatherReading[]>([]);
  const [rawReadings, setRawReadings] = useState<WeatherReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);

  useEffect(() => {
    let from: Date;
    let to: Date = new Date();
    if (preset === 'custom') {
      from = new Date(customStart + 'T00:00:00');
      to = new Date(customEnd + 'T23:59:59');
    } else if (preset === 'all') {
      from = new Date('2000-01-01');
    } else {
      const days = PRESETS.find((p) => p.id === preset)?.days ?? 7;
      from = new Date(Date.now() - days * 86400_000);
    }

    setLoading(true);
    getReadingsRange(stationId, from.toISOString(), to.toISOString())
      .then((data) => {
        setTotalRows(data.length);
        setRawReadings(data);
        setReadings(downsample(data, MAX_POINTS));
      })
      .catch(() => {
        setReadings([]);
        setRawReadings([]);
        setTotalRows(0);
      })
      .finally(() => setLoading(false));
  }, [stationId, preset, customStart, customEnd, lastIngestTick]);

  const tempU = useWeatherUnitsStore((s) => s.temp);
  const windU = useWeatherUnitsStore((s) => s.wind);
  const pressU = useWeatherUnitsStore((s) => s.pressure);
  const precU = useWeatherUnitsStore((s) => s.precip);
  const windLabel = windU === 'ms' ? ' m/s' : ` ${windU}`;
  const precLabel = precU === 'in' ? '"' : ' mm';
  const rateLabel = precU === 'in' ? '"/hr' : ' mm/hr';

  const { series, yUnit, yDomain } = useMemo(() => {
    const t = (r: WeatherReading) => new Date(r.observed_at).getTime();
    const tC = (v: number | null) => convertTemp(v, tempU);
    const wC = (v: number | null) => convertWind(v, windU);
    const pC = (v: number | null) => convertPressure(v, pressU);
    const rC = (v: number | null) => convertPrecip(v, precU);
    switch (metric) {
      case 'temp':
        return {
          series: [
            { label: 'Outdoor', color: '#fbbf24', points: readings.map((r) => ({ t: t(r), v: tC(r.temp) })) },
            { label: 'Dew Point', color: '#60a5fa', points: readings.map((r) => ({ t: t(r), v: tC(r.dew_point) })) },
            { label: 'Feels Like', color: '#f472b6', points: readings.map((r) => ({ t: t(r), v: tC(r.thw_index ?? r.heat_index ?? r.wind_chill) })) },
            { label: 'Indoor', color: '#a78bfa', points: readings.map((r) => ({ t: t(r), v: tC(r.temp_in) })) },
          ] as Series[],
          yUnit: `°${tempU}`,
          yDomain: undefined,
        };
      case 'hum':
        return {
          series: [
            { label: 'Outdoor %', color: '#34d399', points: readings.map((r) => ({ t: t(r), v: r.hum })) },
            { label: 'Indoor %', color: '#a78bfa', points: readings.map((r) => ({ t: t(r), v: r.hum_in })) },
          ] as Series[],
          yUnit: '%',
          yDomain: [0, 100] as [number, number],
        };
      case 'wind':
        return {
          series: [
            { label: 'Avg (10m)', color: '#60a5fa', points: readings.map((r) => ({ t: t(r), v: wC(r.wind_speed_avg_last_10_min) })) },
            { label: 'Gust (10m)', color: '#f87171', points: readings.map((r) => ({ t: t(r), v: wC(r.wind_speed_hi_last_10_min) })) },
            { label: 'Current', color: '#fbbf24', points: readings.map((r) => ({ t: t(r), v: wC(r.wind_speed_last) })) },
          ] as Series[],
          yUnit: windLabel,
          yDomain: undefined,
        };
      case 'rain':
        return {
          series: [
            {
              label: `Rate (${rateLabel})`,
              color: '#60a5fa',
              points: readings.map((r) => ({
                t: t(r),
                v: rC(r.rain_rate_last_in ?? r.rain_rate_hi_in),
              })),
            },
            {
              label: 'Period Rainfall',
              color: '#3b82f6',
              points: readings.map((r) => ({ t: t(r), v: rC(r.rainfall_last_15_min_in) })),
            },
          ] as Series[],
          yUnit: precLabel,
          yDomain: undefined,
        };
      case 'rainTotals':
        return {
          series: [
            { label: 'Day Total', color: '#3b82f6', points: readings.map((r) => ({ t: t(r), v: rC(r.rainfall_day_in) })) },
            { label: 'Month Total', color: '#60a5fa', points: readings.map((r) => ({ t: t(r), v: rC(r.rainfall_month_in) })) },
            { label: 'Year Total', color: '#93c5fd', points: readings.map((r) => ({ t: t(r), v: rC(r.rainfall_year_in) })) },
          ] as Series[],
          yUnit: precLabel,
          yDomain: undefined,
        };
      case 'bar':
        return {
          series: [
            { label: 'Sea Level', color: '#c084fc', points: readings.map((r) => ({ t: t(r), v: pC(r.bar_sea_level) })) },
            { label: 'Absolute', color: '#a78bfa', points: readings.map((r) => ({ t: t(r), v: pC(r.bar_absolute) })) },
          ] as Series[],
          yUnit: ` ${pressU}`,
          yDomain: undefined,
        };
      case 'dewpoint':
        return {
          series: [
            { label: 'Dew Point', color: '#60a5fa', points: readings.map((r) => ({ t: t(r), v: tC(r.dew_point) })) },
            { label: 'Wet Bulb', color: '#34d399', points: readings.map((r) => ({ t: t(r), v: tC(r.wet_bulb) })) },
          ] as Series[],
          yUnit: `°${tempU}`,
          yDomain: undefined,
        };
      case 'indoor':
        return {
          series: [
            { label: 'Temp Out', color: '#fbbf24', points: readings.map((r) => ({ t: t(r), v: tC(r.temp) })) },
            { label: 'Temp In', color: '#f472b6', points: readings.map((r) => ({ t: t(r), v: tC(r.temp_in) })) },
            { label: 'Hum Out', color: '#34d399', points: readings.map((r) => ({ t: t(r), v: r.hum })) },
            { label: 'Hum In', color: '#a78bfa', points: readings.map((r) => ({ t: t(r), v: r.hum_in })) },
          ] as Series[],
          yUnit: '',
          yDomain: undefined,
        };
      case 'signal':
        return {
          series: [
            { label: 'ISS RSSI (dBm)', color: '#60a5fa', points: readings.map((r) => ({ t: t(r), v: r.rssi_last })) },
            { label: 'WiFi RSSI (dBm)', color: '#34d399', points: readings.map((r) => ({ t: t(r), v: r.wifi_rssi })) },
            { label: 'Reception %', color: '#fbbf24', points: readings.map((r) => ({ t: t(r), v: r.reception_day })) },
          ] as Series[],
          yUnit: '',
          yDomain: undefined,
        };
      case 'battery':
        return {
          series: [
            { label: 'Trans Battery (V)', color: '#fbbf24', points: readings.map((r) => ({ t: t(r), v: r.trans_battery_volt })) },
            { label: 'Console %', color: '#34d399', points: readings.map((r) => ({ t: t(r), v: r.battery_percent })) },
          ] as Series[],
          yUnit: '',
          yDomain: undefined,
        };
      default:
        return { series: [] as Series[], yUnit: '', yDomain: undefined };
    }
  }, [readings, metric, tempU, windU, pressU, precU, windLabel, precLabel, rateLabel]);

  const grouped = useMemo(() => {
    const byGroup: Record<string, typeof METRICS> = {};
    for (const m of METRICS) {
      if (!byGroup[m.group]) byGroup[m.group] = [];
      byGroup[m.group].push(m);
    }
    return byGroup;
  }, []);

  const fromIso =
    preset === 'custom'
      ? new Date(customStart + 'T00:00:00').toISOString()
      : preset === 'all'
      ? new Date('2000-01-01').toISOString()
      : new Date(Date.now() - (PRESETS.find((p) => p.id === preset)?.days ?? 7) * 86400_000).toISOString();
  const toIso =
    preset === 'custom' ? new Date(customEnd + 'T23:59:59').toISOString() : new Date().toISOString();

  const hasData = series.some((s) => s.points.some((p) => p.v !== null && p.v !== undefined));

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/70 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        {/* Preset + custom range + view toggle */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex gap-1 border border-white/10 rounded-lg p-0.5 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={`text-xs px-2.5 py-1 rounded transition-colors ${
                  preset === p.id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                max={customEnd}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-amber-500/50 focus:outline-none"
              />
              <span className="text-white/40 text-xs">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                min={customStart}
                max={new Date().toISOString().slice(0, 10)}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-amber-500/50 focus:outline-none"
              />
            </div>
          )}
          <div className="flex-1" />
          <div className="flex gap-1 border border-white/10 rounded-lg p-0.5">
            {(['chart', 'table', 'summary'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-xs px-2.5 py-1 rounded transition-colors capitalize ${
                  view === v ? 'bg-amber-500/20 text-amber-400 font-medium' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {v === 'chart' ? '📈 Chart' : v === 'table' ? '🗂 Table' : '📊 Summary'}
              </button>
            ))}
          </div>
        </div>

        {/* Metric tabs (only for chart view) */}
        {view === 'chart' && (
          <div className="flex flex-wrap gap-3 mb-4">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="flex flex-col gap-1">
                <div className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">{group}</div>
                <div className="flex flex-wrap gap-1">
                  {items.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMetric(m.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                        metric === m.id
                          ? 'bg-amber-500/20 text-amber-400 font-medium'
                          : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-white/40 mb-3 flex items-center justify-between">
          <span>
            {totalRows.toLocaleString()} readings
            {view === 'chart' && totalRows > readings.length && ` · downsampled to ${readings.length.toLocaleString()}`}
          </span>
          <span>
            {new Date(fromIso).toLocaleDateString()} — {new Date(toIso).toLocaleDateString()}
          </span>
        </div>

        {loading ? (
          <div className="h-[260px] flex items-center justify-center text-white/30 text-sm">Loading...</div>
        ) : view === 'chart' ? (
          metric === 'storms' ? (
            <StormsList stationId={stationId} fromIso={fromIso} toIso={toIso} lastIngestTick={lastIngestTick} />
          ) : !hasData ? (
            <div className="h-[260px] flex items-center justify-center text-white/30 text-sm">
              No data for this range yet.
            </div>
          ) : (
            <LineChart series={series} yUnit={yUnit} yDomain={yDomain} height={260} />
          )
        ) : view === 'table' ? (
          <StatsTable readings={rawReadings} />
        ) : (
          <StatsSummary readings={rawReadings} />
        )}
      </div>
    </div>
  );
}
