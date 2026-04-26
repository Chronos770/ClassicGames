import { useState } from 'react';
import {
  barTrendLabel,
  timeAgo,
  type WeatherReading,
  type WeatherStation,
} from '../../lib/weatherService';
import { useUnitFormatters } from '../../lib/weatherUnits';
import { classifyCondition } from '../../lib/weatherCondition';
import { useRecentReadings, extremes, trendPerHour, todaysRows } from '../../lib/weatherTrends';
import WindCompass from './WindCompass';
import RainGauge from './RainGauge';
import ActiveStormCard from './ActiveStormCard';
import PressureSparkline from './PressureSparkline';
import SunArc from './SunArc';
import MoonCard from './MoonCard';
import WindRose from './WindRose';
import ETContextCard from './ETContextCard';
import AnimatedWeatherIcon from './AnimatedWeatherIcon';

interface Props {
  reading: WeatherReading;
  station: WeatherStation | null;
  stationId: number | null;
  tick: number;
  // Optional pre-classified condition from WeatherPage. When provided we
  // use it instead of re-classifying here, so the hero label always
  // matches what the canvas + page gradient are showing. WeatherPage has
  // the NWS hourly tie-breaker; without it the local re-classify can
  // disagree (e.g. station says solar=high "Sunny" while NWS says rain).
  condition?: ReturnType<typeof classifyCondition>;
}

export default function OverviewTab({ reading, station, stationId, tick, condition: conditionProp }: Props) {
  const recent = useRecentReadings(stationId, 24, tick);
  const history30d = useRecentReadings(
    stationId,
    30 * 24,
    tick,
    'observed_at,wind_speed_avg_last_10_min,wind_dir_scalar_avg_last_10_min,wind_speed_last,wind_dir_last',
  );

  return (
    <>
      <HeroBanner
        reading={reading}
        station={station}
        recentRows={recent.rows}
        condition={conditionProp}
      />
      {reading.rain_storm_current_in !== null &&
        reading.rain_storm_current_in > 0 &&
        reading.rain_storm_current_start_at && <ActiveStormCard reading={reading} />}
      <ConditionsGrid reading={reading} recentRows={recent.rows} stationId={stationId} tick={tick} />

      {/* Sun + Moon side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mt-4">
        {station?.latitude !== null && station?.longitude !== null && station ? (
          <SunArc lat={station.latitude!} lon={station.longitude!} now={new Date(reading.observed_at)} />
        ) : (
          <div />
        )}
        <MoonCard now={new Date(reading.observed_at)} />
      </div>

      {/* Wind direction components together: live compass + 24h wind rose */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mt-4">
        <Card title="Wind">
          <WindFromToHeader dir={reading.wind_dir_last} speed={reading.wind_speed_last} />
          <div className="flex justify-center py-2">
            <WindCompass
              dirCurrent={reading.wind_dir_last}
              dirAvg={reading.wind_dir_scalar_avg_last_10_min}
              speed={reading.wind_speed_last}
              gust={reading.wind_speed_hi_last_10_min}
              size={240}
            />
          </div>
        </Card>
        <WindRose
          rows={history30d.rows.filter((r) => {
            const age = Date.now() - new Date(r.observed_at).getTime();
            return age <= 24 * 3600_000;
          })}
        />
      </div>

    </>
  );
}

function HeroBanner({
  reading,
  station,
  recentRows,
  condition: conditionProp,
}: {
  reading: WeatherReading;
  station: WeatherStation | null;
  recentRows: WeatherReading[];
  condition?: ReturnType<typeof classifyCondition>;
}) {
  const fmt = useUnitFormatters();
  const feelsLike = reading.thw_index ?? reading.heat_index ?? reading.wind_chill ?? reading.temp;
  const delta = feelsLike !== null && reading.temp !== null ? feelsLike - reading.temp : null;
  const deltaLabel =
    delta === null
      ? null
      : Math.abs(delta) < 1
        ? 'matches temp'
        : delta > 0
          ? 'feels warmer'
          : 'feels cooler';
  const feelsLikeTone =
    delta === null
      ? 'text-white'
      : delta > 6
        ? 'text-red-300'
        : delta > 2
          ? 'text-amber-300'
          : delta < -6
            ? 'text-sky-300'
            : delta < -2
              ? 'text-blue-300'
              : 'text-white';

  const condition =
    conditionProp ??
    classifyCondition(reading, station?.latitude ?? null, station?.longitude ?? null);

  // Today's high/low (from 24h window, filtered to today)
  const todayExt = (() => {
    const today = todaysRows(recentRows);
    return extremes(today, 'temp');
  })();
  // 3-hour trend
  const trendF = trendPerHour(
    recentRows.filter((r) => Date.now() - new Date(r.observed_at).getTime() <= 3 * 3600_000),
    'temp',
  );
  const trendConv = fmt.toTemp(trendF === null ? null : trendF);
  const trendLabel =
    trendConv === null
      ? null
      : Math.abs(trendConv) < 0.5
        ? 'Steady'
        : trendConv > 0
          ? `+${trendConv.toFixed(1)}${fmt.tempUnitLabel}/hr`
          : `${trendConv.toFixed(1)}${fmt.tempUnitLabel}/hr`;

  return (
    <div
      className={`relative overflow-hidden bg-slate-900/85 backdrop-blur-sm rounded-2xl border border-white/10 p-5 sm:p-6 mb-4 transition-all duration-700`}
    >
      <div className="relative">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/50 mb-1">
            <span>{condition.label}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <AnimatedWeatherIcon conditionKey={condition.key} isDay={condition.isDay} size={96} />
            <span className="text-6xl sm:text-7xl font-display font-bold text-white tabular-nums leading-none">
              {fmt.fmtTempNum(reading.temp)}
            </span>
            <span className="text-2xl text-white/50 font-semibold">{fmt.tempUnitLabel}</span>
            {trendLabel && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-mono ${
                  trendConv !== null && Math.abs(trendConv) >= 0.5
                    ? trendConv > 0
                      ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
                      : 'text-sky-300 border-sky-500/30 bg-sky-500/10'
                    : 'text-white/50 border-white/10'
                }`}
              >
                {trendConv !== null && Math.abs(trendConv) >= 0.5 ? (trendConv > 0 ? '↑ ' : '↓ ') : ''}
                {trendLabel}
              </span>
            )}
          </div>
          {feelsLike !== null && (
            <div className="text-sm text-white/60 mt-2">
              Feels like{' '}
              <span className={`font-semibold ${feelsLikeTone}`}>{fmt.fmtTemp(feelsLike)}</span>
              {deltaLabel && <span className="text-white/40"> · {deltaLabel}</span>}
            </div>
          )}
          {(todayExt.max !== null || todayExt.min !== null) && (
            <div className="text-xs text-white/50 mt-1 flex gap-4 flex-wrap font-mono">
              {todayExt.max !== null && (
                <span>
                  <span className="text-white/40">High </span>
                  <span className="text-amber-300">{fmt.fmtTemp(todayExt.max)}</span>
                  {todayExt.maxAt && (
                    <span className="text-white/30 ml-1">
                      {new Date(todayExt.maxAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                </span>
              )}
              {todayExt.min !== null && (
                <span>
                  <span className="text-white/40">Low </span>
                  <span className="text-sky-300">{fmt.fmtTemp(todayExt.min)}</span>
                  {todayExt.minAt && (
                    <span className="text-white/30 ml-1">
                      {new Date(todayExt.minAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                </span>
              )}
            </div>
          )}
          <div className="text-xs text-white/30 mt-2">
            Observed {timeAgo(reading.observed_at)} · {new Date(reading.observed_at).toLocaleString()}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function ConditionsGrid({
  reading,
  recentRows,
  stationId,
  tick,
}: {
  reading: WeatherReading;
  recentRows: WeatherReading[];
  stationId: number | null;
  tick: number;
}) {
  const fmt = useUnitFormatters();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      <Card title="Feels Like & Derived">
        <DataRow
          label="Heat Index"
          tip="How hot it feels combining temp + humidity. NWS standard, only relevant when warm + humid."
          value={fmt.fmtTemp(reading.heat_index)}
        />
        <DataRow
          label="Wind Chill"
          tip="How cold it feels combining temp + wind speed. Only meaningful below ~50°F with wind."
          value={fmt.fmtTemp(reading.wind_chill)}
        />
        <DataRow
          label="THW Index"
          tip="Temperature–Humidity–Wind. Davis's all-in-one feels-like that blends heat index and wind chill year-round."
          value={fmt.fmtTemp(reading.thw_index)}
        />
        <DataRow
          label="Wet Bulb"
          tip="Coolest temp you can achieve by evaporation — what a wet thermometer would read. Used for swamp coolers, athletic heat safety."
          value={fmt.fmtTemp(reading.wet_bulb)}
        />
        <DataRow
          label="Dew Point"
          tip="Temp at which the air would saturate with water vapor. Below 55°F = dry, 60s = comfortable, 70s = sticky, 75°+ = oppressive."
          value={fmt.fmtTemp(reading.dew_point)}
        />
      </Card>

      <Card title="Humidity">
        <div className="flex items-center gap-4">
          <HumidityArc pct={reading.hum} />
          <div className="flex-1 space-y-1.5">
            <DataRow label="Outdoor" value={reading.hum !== null ? `${reading.hum.toFixed(1)}%` : '--'} mono />
            <DataRow label="Indoor" value={reading.hum_in !== null ? `${reading.hum_in.toFixed(1)}%` : '--'} mono />
            <DataRow
              label="Dew Point"
              tip="Temp at which air saturates with water. Lower = drier; 60s comfortable, 70s+ humid."
              value={fmt.fmtTemp(reading.dew_point)}
              mono
            />
            <DataRow
              label="Indoor Dew"
              tip="Indoor air's dew point — useful for window-condensation risk in winter."
              value={fmt.fmtTemp(reading.dew_point_in)}
              mono
            />
          </div>
        </div>
      </Card>

      <Card title="Rain">
        <RainGauge
          dayIn={reading.rainfall_day_in}
          monthIn={reading.rainfall_month_in}
          yearIn={reading.rainfall_year_in}
          rateIn={reading.rain_rate_last_in}
          storm={reading.rain_storm_current_in ?? reading.rain_storm_last_in}
          last24hIn={reading.rainfall_last_24_hr_in}
        />
        <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
          <DataRow label="15 min" value={fmt.fmtPrecip(reading.rainfall_last_15_min_in)} mono />
          <DataRow label="60 min" value={fmt.fmtPrecip(reading.rainfall_last_60_min_in)} mono />
          <DataRow label="Peak Rate (15m)" value={fmt.fmtPrecipRate(reading.rain_rate_hi_last_15_min_in)} mono />
          {reading.rain_storm_last_start_at && (
            <DataRow
              label="Last Storm"
              value={`${fmt.fmtPrecip(reading.rain_storm_last_in)} · ${new Date(reading.rain_storm_last_start_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
              mono
            />
          )}
        </div>
      </Card>

      <Card title="Barometric Pressure">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-display font-bold text-white tabular-nums">
            {fmt.fmtPressure(reading.bar_sea_level).split(' ')[0]}
          </span>
          <span className="text-sm text-white/50">{fmt.pressureUnitLabel}</span>
        </div>
        <div className="text-xs text-white/50 mt-1">
          {barTrendLabel(reading.bar_trend)}
          {reading.bar_trend !== null && (
            <span className="text-white/30 ml-2">
              ({reading.bar_trend > 0 ? '+' : ''}
              {reading.bar_trend.toFixed(3)}/3hr)
            </span>
          )}
        </div>
        <div className="mt-2">
          <PressureSparkline rows={recentRows} />
        </div>
        <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
          <DataRow label="Absolute" value={fmt.fmtPressure(reading.bar_absolute)} mono />
          <DataRow label="Sea Level" value={fmt.fmtPressure(reading.bar_sea_level)} mono />
          <DataRow label="Trend (3hr)" value={reading.bar_trend !== null ? (reading.bar_trend > 0 ? '+' : '') + reading.bar_trend.toFixed(3) : '--'} mono />
        </div>
        <BarometerExplainer pressureInHg={reading.bar_sea_level} trendInHg={reading.bar_trend} />
      </Card>

      <Card title="Indoor (Console)">
        <DataRow label="Temperature" value={fmt.fmtTemp(reading.temp_in)} mono />
        <DataRow label="Humidity" value={reading.hum_in !== null ? `${reading.hum_in.toFixed(1)}%` : '--'} mono />
        <DataRow label="Dew Point" value={fmt.fmtTemp(reading.dew_point_in)} mono />
        <DataRow label="Heat Index" value={fmt.fmtTemp(reading.heat_index_in)} mono />
        <DataRow label="Wet Bulb" value={fmt.fmtTemp(reading.wet_bulb_in)} mono />
      </Card>

      <ETContextCard stationId={stationId} reading={reading} tick={tick} />
    </div>
  );
}

function BarometerExplainer({
  pressureInHg,
  trendInHg,
}: {
  pressureInHg: number | null;
  trendInHg: number | null;
}) {
  // Plain-English meaning of the current pressure level + 3hr trend.
  const level = (() => {
    if (pressureInHg === null) return null;
    if (pressureInHg >= 30.20) return { label: 'High', tone: 'text-amber-300', meaning: 'fair, dry weather' };
    if (pressureInHg >= 29.80) return { label: 'Normal', tone: 'text-white/80', meaning: 'changeable conditions' };
    return { label: 'Low', tone: 'text-blue-300', meaning: 'stormy / wet weather possible' };
  })();
  const trend = (() => {
    if (trendInHg === null) return null;
    if (trendInHg > 0.06) return { label: 'rising rapidly', meaning: 'fair weather coming soon' };
    if (trendInHg > 0.02) return { label: 'rising', meaning: 'improving conditions' };
    if (trendInHg < -0.06) return { label: 'falling rapidly', meaning: 'storm or front approaching' };
    if (trendInHg < -0.02) return { label: 'falling', meaning: 'unsettled weather coming' };
    return { label: 'steady', meaning: 'no major change expected' };
  })();
  if (!level && !trend) return null;
  return (
    <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-white/50 leading-relaxed">
      {level && (
        <div>
          <span className={`font-semibold ${level.tone}`}>{level.label}</span>
          <span className="text-white/40"> · {level.meaning}</span>
        </div>
      )}
      {trend && (
        <div className="mt-0.5">
          Pressure is <span className="text-white/70 font-medium">{trend.label}</span>
          <span className="text-white/40"> — {trend.meaning}</span>
        </div>
      )}
    </div>
  );
}

function WindFromToHeader({ dir, speed }: { dir: number | null; speed: number | null }) {
  if (dir === null || dir === undefined || (speed !== null && speed < 0.5)) {
    return (
      <div className="text-center text-sm text-white/60 mb-1">Calm</div>
    );
  }
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round((dir % 360) / 22.5) % 16;
  const from = dirs[idx];
  const to = dirs[(idx + 8) % 16];
  return (
    <div className="text-center text-sm text-white/80 mb-1">
      from <span className="text-sky-300 font-semibold">{from}</span>
      <span className="text-white/40 mx-1.5">to</span>
      <span className="text-white/80 font-semibold">{to}</span>
    </div>
  );
}

function HumidityArc({ pct, size = 80 }: { pct: number | null; size?: number }) {
  const v = pct ?? 0;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (v / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
      {pct !== null && (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="#34d399"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
        />
      )}
      <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize="16" fontWeight="700">
        {pct !== null ? `${Math.round(v)}` : '--'}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">
        %
      </text>
    </svg>
  );
}

function Card({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/70 backdrop-blur-sm rounded-xl border border-white/10 p-4">
      <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DataRow({
  label,
  value,
  tip,
  mono = false,
  valueClass = '',
}: {
  label: string;
  value: string;
  tip?: string;
  mono?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline justify-between text-xs gap-2">
      <span className="text-white/50 flex items-center gap-1 min-w-0">
        <span>{label}</span>
        {tip && <InfoTip label={label}>{tip}</InfoTip>}
      </span>
      <span className={`${mono ? 'font-mono' : ''} text-white/90 ${valueClass} flex-shrink-0`}>{value}</span>
    </div>
  );
}

function InfoTip({ children, label }: { children: React.ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={`What is ${label}?`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-white/25 hover:text-white/60 text-[11px] leading-none align-middle cursor-help"
      >
        &#9432;
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-30 left-0 top-full mt-1 bg-black/95 border border-white/15 rounded-lg p-2 text-[10px] text-white/80 leading-snug w-56 shadow-xl pointer-events-none normal-case"
        >
          {children}
        </span>
      )}
    </span>
  );
}
