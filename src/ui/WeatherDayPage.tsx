import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  getReadingsRange,
  getStations,
  getStationDateRange,
  type WeatherReading,
  type WeatherStation,
} from '../lib/weatherService';
import LineChart, { type Series } from './weather/LineChart';
import {
  convertPrecip,
  convertPressure,
  convertTemp,
  convertWind,
  useWeatherUnitsStore,
} from '../lib/weatherUnits';

// Chart-friendly minimal columns we always need for the day view.
// Keeping the projection narrow keeps the round-trip small.
const COLS =
  'id,station_id,observed_at,temp,hum,dew_point,wind_speed_avg_last_10_min,wind_speed_hi_last_10_min,wind_dir_last,rain_rate_last_in,rain_rate_hi_in,rainfall_last_15_min_in,rainfall_day_in,bar_sea_level,solar_rad,uv_index,heat_index,wind_chill';

interface DayStat {
  label: string;
  value: string;
  unit: string;
  tone: string;
}

function parseDate(date: string): Date | null {
  // Expecting YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export default function WeatherDayPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const day = useMemo(() => (date ? parseDate(date) : null), [date]);
  const [stations, setStations] = useState<WeatherStation[]>([]);
  const [readings, setReadings] = useState<WeatherReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateBounds, setDateBounds] = useState<{ earliest: string | null; latest: string | null }>({
    earliest: null,
    latest: null,
  });
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const tempU = useWeatherUnitsStore((s) => s.temp);
  const windU = useWeatherUnitsStore((s) => s.wind);
  const pressU = useWeatherUnitsStore((s) => s.pressure);
  const precU = useWeatherUnitsStore((s) => s.precip);
  const tU = `°${tempU}`;
  const wU = windU === 'ms' ? 'm/s' : windU;
  const rU = precU === 'in' ? '"' : 'mm';
  const pU = pressU;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getStations()
      .then((s) => {
        if (cancelled) return;
        setStations(s);
        const stationId = s[0]?.station_id;
        if (!day || !stationId) {
          setReadings([]);
          setLoading(false);
          return;
        }
        // Fetch the date bounds in parallel so the picker constrains
        // immediately, even before this day's readings finish loading.
        getStationDateRange(stationId).then((b) => {
          if (!cancelled) setDateBounds(b);
        });
        const from = new Date(day);
        from.setHours(0, 0, 0, 0);
        const to = new Date(day);
        to.setHours(23, 59, 59, 999);
        return getReadingsRange(stationId, from.toISOString(), to.toISOString(), COLS).then(
          (rows) => {
            if (cancelled) return;
            setReadings(rows);
          },
        );
      })
      .catch(() => {
        if (!cancelled) setReadings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [day]);

  const station = stations[0] ?? null;

  const stats = useMemo<DayStat[]>(() => {
    if (readings.length === 0) return [];
    const vals = (get: (r: WeatherReading) => number | null) =>
      readings.map(get).filter((v): v is number => v !== null && Number.isFinite(v));

    const out: DayStat[] = [];
    const t = vals((r) => r.temp);
    if (t.length) {
      const max = Math.max(...t);
      const min = Math.min(...t);
      out.push({
        label: 'High',
        value: (convertTemp(max, tempU) ?? max).toFixed(1),
        unit: tU,
        tone: 'text-orange-300',
      });
      out.push({
        label: 'Low',
        value: (convertTemp(min, tempU) ?? min).toFixed(1),
        unit: tU,
        tone: 'text-sky-300',
      });
    }
    // Total rainfall for the day — peak rainfall_day_in (cumulative within day)
    const dayRain = vals((r) => r.rainfall_day_in);
    if (dayRain.length) {
      const maxRain = Math.max(...dayRain);
      out.push({
        label: 'Rainfall',
        value: (convertPrecip(maxRain, precU) ?? maxRain).toFixed(2),
        unit: rU,
        tone: 'text-blue-300',
      });
    }
    const gusts = vals((r) => r.wind_speed_hi_last_10_min);
    if (gusts.length) {
      const maxG = Math.max(...gusts);
      out.push({
        label: 'Top Gust',
        value: (convertWind(maxG, windU) ?? maxG).toFixed(1),
        unit: ` ${wU}`,
        tone: 'text-emerald-300',
      });
    }
    const hum = vals((r) => r.hum);
    if (hum.length) {
      out.push({
        label: 'Avg Humidity',
        value: (hum.reduce((a, b) => a + b, 0) / hum.length).toFixed(0),
        unit: '%',
        tone: 'text-cyan-300',
      });
    }
    const press = vals((r) => r.bar_sea_level);
    if (press.length) {
      const min = Math.min(...press);
      const max = Math.max(...press);
      out.push({
        label: 'Pressure Range',
        value: `${(convertPressure(min, pressU) ?? min).toFixed(2)}–${(convertPressure(max, pressU) ?? max).toFixed(2)}`,
        unit: ` ${pU}`,
        tone: 'text-amber-300',
      });
    }
    const solar = vals((r) => r.solar_rad);
    if (solar.length) {
      out.push({
        label: 'Peak Solar',
        value: Math.max(...solar).toFixed(0),
        unit: ' W/m²',
        tone: 'text-yellow-300',
      });
    }
    const uv = vals((r) => r.uv_index);
    if (uv.length) {
      out.push({
        label: 'Peak UV',
        value: Math.max(...uv).toFixed(1),
        unit: '',
        tone: 'text-fuchsia-300',
      });
    }
    return out;
  }, [readings, tempU, windU, pressU, precU, tU, wU, rU, pU]);

  const t = (r: WeatherReading) => new Date(r.observed_at).getTime();
  const tC = (v: number | null) => convertTemp(v, tempU);
  const wC = (v: number | null) => convertWind(v, windU);
  const rC = (v: number | null) => convertPrecip(v, precU);
  const pC = (v: number | null) => convertPressure(v, pressU);

  const tempSeries: Series[] = [
    { label: 'Temp', color: '#f97316', points: readings.map((r) => ({ t: t(r), v: tC(r.temp) })) },
    { label: 'Dew Pt', color: '#34d399', points: readings.map((r) => ({ t: t(r), v: tC(r.dew_point) })) },
  ];
  const windSeries: Series[] = [
    { label: 'Avg', color: '#06b6d4', points: readings.map((r) => ({ t: t(r), v: wC(r.wind_speed_avg_last_10_min) })) },
    { label: 'Gust', color: '#a78bfa', points: readings.map((r) => ({ t: t(r), v: wC(r.wind_speed_hi_last_10_min) })) },
  ];
  const rainSeries: Series[] = [
    { label: 'Rate', color: '#60a5fa', points: readings.map((r) => ({ t: t(r), v: rC(r.rain_rate_last_in ?? r.rain_rate_hi_in) })) },
    { label: 'Period (15m)', color: '#3b82f6', points: readings.map((r) => ({ t: t(r), v: rC(r.rainfall_last_15_min_in) })) },
  ];
  const pressureSeries: Series[] = [
    { label: 'Sea-level', color: '#fbbf24', points: readings.map((r) => ({ t: t(r), v: pC(r.bar_sea_level) })) },
  ];
  const solarSeries: Series[] = [
    { label: 'Solar', color: '#facc15', points: readings.map((r) => ({ t: t(r), v: r.solar_rad })) },
    { label: 'UV', color: '#e879f9', points: readings.map((r) => ({ t: t(r), v: r.uv_index })) },
  ];

  if (!day) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center text-white/50">
        <div className="text-lg mb-2">Invalid date</div>
        <Link to="/weather" className="text-amber-400 hover:underline">
          ← Back to weather
        </Link>
      </div>
    );
  }

  const dayLabel = day.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Yesterday / tomorrow nav
  const prev = new Date(day);
  prev.setDate(prev.getDate() - 1);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);
  const fmtParam = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const isToday = day.toDateString() === new Date().toDateString();

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3"
      >
        <Link
          to="/weather"
          className="text-xs sm:text-sm text-white/55 hover:text-white/85 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg whitespace-nowrap"
        >
          ← Weather
        </Link>
        <div className="text-center min-w-0 relative">
          <button
            type="button"
            onClick={() => {
              const el = dateInputRef.current;
              if (!el) return;
              // showPicker() is the modern way to programmatically open a
              // native date picker. Fall back to focusing + clicking on
              // browsers that don't support it yet (older Safari).
              if (typeof (el as any).showPicker === 'function') {
                (el as any).showPicker();
              } else {
                el.focus();
                el.click();
              }
            }}
            title="Pick a different day"
            className="text-base sm:text-xl font-display font-bold text-white hover:text-amber-200 transition-colors truncate inline-flex items-center gap-1.5 group"
          >
            <span className="truncate">{dayLabel}</span>
            <span className="text-xs text-white/40 group-hover:text-amber-300 transition-colors" aria-hidden>
              📅
            </span>
          </button>
          {station && (
            <div className="text-[10px] sm:text-xs text-white/40 truncate">{station.station_name}</div>
          )}
          {/* Hidden native date input — opened by the title button above */}
          <input
            ref={dateInputRef}
            type="date"
            value={fmtParam(day)}
            onChange={(e) => {
              if (e.target.value) navigate(`/weather/day/${e.target.value}`);
            }}
            min={dateBounds.earliest ?? undefined}
            max={dateBounds.latest ?? fmtParam(new Date())}
            className="absolute left-1/2 top-full -translate-x-1/2 opacity-0 pointer-events-none w-0 h-0"
            aria-label="Pick a day"
          />
        </div>
        <div className="flex gap-1">
          <Link
            to={`/weather/day/${fmtParam(prev)}`}
            title="Previous day"
            className="text-xs text-white/55 hover:text-white/85 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg"
          >
            ‹
          </Link>
          <Link
            to={isToday ? '/weather' : `/weather/day/${fmtParam(next)}`}
            title={isToday ? 'Today (back to live)' : 'Next day'}
            className={`text-xs px-2.5 py-1.5 rounded-lg ${
              isToday
                ? 'text-white/30 bg-white/[0.02] cursor-default pointer-events-none'
                : 'text-white/55 hover:text-white/85 bg-white/5 hover:bg-white/10'
            }`}
          >
            ›
          </Link>
        </div>
      </motion.div>

      {loading ? (
        <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-12 text-center text-white/40 text-sm">
          <div className="inline-flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-white/20 border-t-amber-400 animate-spin" />
            Loading day…
          </div>
        </div>
      ) : readings.length === 0 ? (
        <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-12 text-center text-white/40 text-sm">
          No readings recorded on {dayLabel}.
        </div>
      ) : (
        <>
          {/* Stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-white/10 bg-black/30 backdrop-blur-md p-3"
              >
                <div className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-1">
                  {s.label}
                </div>
                <div className={`text-xl font-bold tabular-nums ${s.tone} leading-tight`}>
                  {s.value}
                  <span className="text-xs font-medium text-white/50 ml-0.5">{s.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <ChartCard title="Temperature & Dew Point" yUnit={tU} series={tempSeries} />
          <ChartCard title="Wind" yUnit={` ${wU}`} series={windSeries} />
          <ChartCard title="Rainfall" yUnit={rU} series={rainSeries} />
          <ChartCard title="Pressure" yUnit={` ${pU}`} series={pressureSeries} />
          <ChartCard title="Solar & UV" yUnit="" series={solarSeries} />

          <div className="text-[11px] text-white/40 text-center pt-2">
            {readings.length.toLocaleString()} readings recorded on this day
          </div>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, series, yUnit }: { title: string; series: Series[]; yUnit: string }) {
  // Skip rendering if every point is null (sensor dropped that day)
  const hasData = series.some((s) => s.points.some((p) => p.v !== null));
  if (!hasData) return null;
  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-3 sm:p-4">
      <div className="text-[11px] uppercase tracking-wider text-white/55 font-semibold mb-2">
        {title}
      </div>
      <LineChart series={series} yUnit={yUnit} height={200} />
    </div>
  );
}
