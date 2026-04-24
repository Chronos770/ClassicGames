import {
  barTrendLabel,
  compassFromDegrees,
  timeAgo,
  type WeatherReading,
  type WeatherStation,
} from '../../lib/weatherService';
import { useUnitFormatters } from '../../lib/weatherUnits';
import { classifyCondition } from '../../lib/weatherCondition';
import { useRecentReadings, extremes, trendPerHour, todaysRows } from '../../lib/weatherTrends';
import WindCompass from './WindCompass';
import RainGauge from './RainGauge';
import ForecastSection from './ForecastSection';
import ActiveStormCard from './ActiveStormCard';
import PressureSparkline from './PressureSparkline';
import SunArc from './SunArc';
import SolarDayArc from './SolarDayArc';
import WindRose from './WindRose';
import ETContextCard from './ETContextCard';
import DegreeDayChart from './DegreeDayChart';

interface Props {
  reading: WeatherReading;
  station: WeatherStation | null;
  stationId: number | null;
  tick: number;
}

export default function OverviewTab({ reading, station, stationId, tick }: Props) {
  const recent = useRecentReadings(stationId, 24, tick);
  const history30d = useRecentReadings(
    stationId,
    30 * 24,
    tick,
    'observed_at,wind_speed_avg_last_10_min,wind_dir_scalar_avg_last_10_min,wind_speed_last,wind_dir_last',
  );

  return (
    <>
      <HeroBanner reading={reading} station={station} recentRows={recent.rows} />
      {reading.rain_storm_current_in !== null &&
        reading.rain_storm_current_in > 0 &&
        reading.rain_storm_current_start_at && <ActiveStormCard reading={reading} />}
      <ConditionsGrid reading={reading} recentRows={recent.rows} stationId={stationId} tick={tick} />
      {station?.latitude !== null && station?.longitude !== null && station && (
        <div className="mt-4">
          <SunArc lat={station.latitude!} lon={station.longitude!} now={new Date(reading.observed_at)} />
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mt-4">
        <SolarDayArc
          rows={recent.rows.filter((r) => {
            const d = new Date(r.observed_at);
            const now = new Date();
            return (
              d.getFullYear() === now.getFullYear() &&
              d.getMonth() === now.getMonth() &&
              d.getDate() === now.getDate()
            );
          })}
          lat={station?.latitude ?? null}
          lon={station?.longitude ?? null}
        />
        <WindRose rows={history30d.rows.filter((r) => {
          const age = Date.now() - new Date(r.observed_at).getTime();
          return age <= 24 * 3600_000;
        })} />
      </div>
      <div className="mt-4">
        <DegreeDayChart stationId={stationId} tick={tick} />
      </div>
      <div className="mt-6">
        <h2 className="text-sm text-white/60 mb-3 uppercase tracking-wide font-semibold">Forecast</h2>
        <ForecastSection station={station} />
      </div>
    </>
  );
}

function HeroBanner({
  reading,
  station,
  recentRows,
}: {
  reading: WeatherReading;
  station: WeatherStation | null;
  recentRows: WeatherReading[];
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

  const condition = classifyCondition(
    reading,
    station?.latitude ?? null,
    station?.longitude ?? null,
  );

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
      className={`bg-gradient-to-br ${condition.gradient.from} ${condition.gradient.via} ${condition.gradient.to} rounded-2xl border border-white/10 p-5 sm:p-6 mb-4 transition-all duration-700`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/50 mb-1">
            <span className="text-xl leading-none">{condition.emoji}</span>
            <span>{condition.label}</span>
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
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
        <div className="text-right">
          <div className="text-xs text-white/40 uppercase tracking-wide mb-2">Today</div>
          <div className="text-xs text-white/40">Heating Deg Days</div>
          <div className="text-sm font-mono text-white/80">{reading.hdd_day?.toFixed(2) ?? '--'}</div>
          <div className="text-xs text-white/40 mt-1">Cooling Deg Days</div>
          <div className="text-sm font-mono text-white/80">{reading.cdd_day?.toFixed(2) ?? '--'}</div>
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
        <DataRow label="Heat Index" value={fmt.fmtTemp(reading.heat_index)} />
        <DataRow label="Wind Chill" value={fmt.fmtTemp(reading.wind_chill)} />
        <DataRow label="THW Index" value={fmt.fmtTemp(reading.thw_index)} />
        <DataRow label="THSW Index" value={fmt.fmtTemp(reading.thsw_index)} />
        <DataRow label="Wet Bulb" value={fmt.fmtTemp(reading.wet_bulb)} />
        <DataRow label="Dew Point" value={fmt.fmtTemp(reading.dew_point)} />
      </Card>

      <Card title="Humidity">
        <div className="flex items-center gap-4">
          <HumidityArc pct={reading.hum} />
          <div className="flex-1 space-y-1.5">
            <DataRow label="Outdoor" value={reading.hum !== null ? `${reading.hum.toFixed(1)}%` : '--'} mono />
            <DataRow label="Indoor" value={reading.hum_in !== null ? `${reading.hum_in.toFixed(1)}%` : '--'} mono />
            <DataRow label="Dew Point" value={fmt.fmtTemp(reading.dew_point)} mono />
            <DataRow label="Indoor Dew" value={fmt.fmtTemp(reading.dew_point_in)} mono />
          </div>
        </div>
      </Card>

      <Card title="Wind">
        <div className="flex items-center gap-2">
          <WindCompass
            dirCurrent={reading.wind_dir_last}
            dirAvg={reading.wind_dir_scalar_avg_last_10_min}
            speed={reading.wind_speed_last}
            gust={reading.wind_speed_hi_last_10_min}
            size={150}
          />
          <div className="flex-1 text-xs space-y-1">
            <DataRow label="Direction" value={`${compassFromDegrees(reading.wind_dir_last)} · ${reading.wind_dir_last ?? '--'}°`} mono />
            <DataRow label="Avg 2m" value={fmt.fmtWind(reading.wind_speed_avg_last_2_min)} mono />
            <DataRow label="Avg 10m" value={fmt.fmtWind(reading.wind_speed_avg_last_10_min)} mono />
            <DataRow label="Gust 2m" value={fmt.fmtWind(reading.wind_speed_hi_last_2_min)} mono />
            <DataRow label="Gust 10m" value={fmt.fmtWind(reading.wind_speed_hi_last_10_min)} mono />
            <DataRow label="Run (day)" value={fmt.fmtDistance(reading.wind_run_day)} mono />
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
      </Card>

      <Card title="Solar & UV">
        {reading.solar_rad !== null || reading.uv_index !== null ? (
          <>
            <DataRow label="Solar Radiation" value={reading.solar_rad !== null ? `${reading.solar_rad.toFixed(0)} W/m²` : '--'} mono />
            <DataRow label="Solar Energy (day)" value={reading.solar_energy_day !== null ? `${reading.solar_energy_day.toFixed(2)} Ly` : '--'} mono />
            <DataRow label="UV Index" value={reading.uv_index !== null ? reading.uv_index.toFixed(1) : '--'} mono />
            <DataRow label="UV Dose (day)" value={reading.uv_dose_day !== null ? `${reading.uv_dose_day.toFixed(2)} MEDs` : '--'} mono />
          </>
        ) : (
          <div className="text-sm text-white/30 italic">
            No solar/UV sensor on this station.
            <div className="text-xs text-white/30 mt-1">(Vantage Pro2 with solar/UV sensors required.)</div>
          </div>
        )}
      </Card>

      <Card title="Indoor (Console)">
        <DataRow label="Temperature" value={fmt.fmtTemp(reading.temp_in)} mono />
        <DataRow label="Humidity" value={reading.hum_in !== null ? `${reading.hum_in.toFixed(1)}%` : '--'} mono />
        <DataRow label="Dew Point" value={fmt.fmtTemp(reading.dew_point_in)} mono />
        <DataRow label="Heat Index" value={fmt.fmtTemp(reading.heat_index_in)} mono />
        <DataRow label="Wet Bulb" value={fmt.fmtTemp(reading.wet_bulb_in)} mono />
      </Card>

      <ETContextCard stationId={stationId} reading={reading} tick={tick} />

      <Card title="ISS Signal">
        <DataRow label="RSSI" value={reading.rssi_last !== null ? `${reading.rssi_last} dBm` : '--'} mono />
        <DataRow label="Reception (day)" value={reading.reception_day !== null ? `${reading.reception_day}%` : '--'} mono />
        <DataRow label="Trans Battery" value={reading.trans_battery_volt !== null ? `${reading.trans_battery_volt.toFixed(2)} V` : '--'} mono />
        <DataRow
          label="Battery Flag"
          value={reading.trans_battery_flag === 0 ? 'OK' : reading.trans_battery_flag !== null ? `Low (${reading.trans_battery_flag})` : '--'}
          valueClass={reading.trans_battery_flag === 0 ? 'text-green-400' : reading.trans_battery_flag ? 'text-red-400' : ''}
          mono
        />
      </Card>
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
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DataRow({ label, value, mono = false, valueClass = '' }: { label: string; value: string; mono?: boolean; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between text-xs">
      <span className="text-white/50">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} text-white/90 ${valueClass}`}>{value}</span>
    </div>
  );
}
