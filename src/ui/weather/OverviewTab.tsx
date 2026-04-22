import {
  barTrendLabel,
  compassFromDegrees,
  fmtIn,
  fmtInHg,
  fmtMph,
  fmtPct,
  fmtTemp,
  timeAgo,
  type WeatherReading,
  type WeatherStation,
} from '../../lib/weatherService';
import WindCompass from './WindCompass';
import RainGauge from './RainGauge';

export default function OverviewTab({ reading, station }: { reading: WeatherReading; station: WeatherStation | null }) {
  return (
    <>
      <HeroBanner reading={reading} />
      <ConditionsGrid reading={reading} />
      <ConsoleBar reading={reading} station={station} />
    </>
  );
}

function HeroBanner({ reading }: { reading: WeatherReading }) {
  const feelsLike = reading.thw_index ?? reading.heat_index ?? reading.wind_chill ?? reading.temp;
  const delta = feelsLike !== null && reading.temp !== null ? feelsLike - reading.temp : null;
  const deltaLabel = delta === null ? null : Math.abs(delta) < 1 ? 'matches temp' : delta > 0 ? 'feels warmer' : 'feels cooler';

  return (
    <div className="bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-transparent rounded-2xl border border-white/10 p-5 sm:p-6 mb-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/40 mb-1">Current Temperature</div>
          <div className="flex items-baseline gap-3">
            <span className="text-6xl sm:text-7xl font-display font-bold text-white tabular-nums">
              {reading.temp !== null ? reading.temp.toFixed(1) : '--'}
            </span>
            <span className="text-2xl text-white/50 font-semibold">°F</span>
          </div>
          {feelsLike !== null && (
            <div className="text-sm text-white/60 mt-1">
              Feels like <span className="text-white font-semibold">{fmtTemp(feelsLike)}</span>
              {deltaLabel && <span className="text-white/40"> · {deltaLabel}</span>}
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

function ConditionsGrid({ reading }: { reading: WeatherReading }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      <Card title="Feels Like & Derived">
        <DataRow label="Heat Index" value={fmtTemp(reading.heat_index)} />
        <DataRow label="Wind Chill" value={fmtTemp(reading.wind_chill)} />
        <DataRow label="THW Index" value={fmtTemp(reading.thw_index)} />
        <DataRow label="THSW Index" value={fmtTemp(reading.thsw_index)} />
        <DataRow label="Wet Bulb" value={fmtTemp(reading.wet_bulb)} />
        <DataRow label="Dew Point" value={fmtTemp(reading.dew_point)} />
      </Card>

      <Card title="Humidity">
        <div className="flex items-center gap-4">
          <HumidityArc pct={reading.hum} />
          <div className="flex-1 space-y-1.5">
            <DataRow label="Outdoor" value={fmtPct(reading.hum, 1)} mono />
            <DataRow label="Indoor" value={fmtPct(reading.hum_in, 1)} mono />
            <DataRow label="Dew Point" value={fmtTemp(reading.dew_point)} mono />
            <DataRow label="Indoor Dew" value={fmtTemp(reading.dew_point_in)} mono />
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
            <DataRow label="Avg 2m" value={fmtMph(reading.wind_speed_avg_last_2_min)} mono />
            <DataRow label="Avg 10m" value={fmtMph(reading.wind_speed_avg_last_10_min)} mono />
            <DataRow label="Gust 2m" value={fmtMph(reading.wind_speed_hi_last_2_min)} mono />
            <DataRow label="Gust 10m" value={fmtMph(reading.wind_speed_hi_last_10_min)} mono />
            <DataRow label="Run (day)" value={reading.wind_run_day !== null ? `${reading.wind_run_day.toFixed(1)} mi` : '--'} mono />
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
          <DataRow label="15 min" value={fmtIn(reading.rainfall_last_15_min_in)} mono />
          <DataRow label="60 min" value={fmtIn(reading.rainfall_last_60_min_in)} mono />
          <DataRow label="Peak Rate (15m)" value={reading.rain_rate_hi_last_15_min_in !== null ? `${reading.rain_rate_hi_last_15_min_in.toFixed(2)} "/hr` : '--'} mono />
          {reading.rain_storm_last_start_at && (
            <DataRow
              label="Last Storm"
              value={`${fmtIn(reading.rain_storm_last_in)} · ${new Date(reading.rain_storm_last_start_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
              mono
            />
          )}
        </div>
      </Card>

      <Card title="Barometric Pressure">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-display font-bold text-white tabular-nums">
            {reading.bar_sea_level !== null ? reading.bar_sea_level.toFixed(3) : '--'}
          </span>
          <span className="text-sm text-white/50">inHg</span>
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
        <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
          <DataRow label="Absolute" value={fmtInHg(reading.bar_absolute)} mono />
          <DataRow label="Sea Level" value={fmtInHg(reading.bar_sea_level)} mono />
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
        <DataRow label="Temperature" value={fmtTemp(reading.temp_in)} mono />
        <DataRow label="Humidity" value={fmtPct(reading.hum_in, 1)} mono />
        <DataRow label="Dew Point" value={fmtTemp(reading.dew_point_in)} mono />
        <DataRow label="Heat Index" value={fmtTemp(reading.heat_index_in)} mono />
        <DataRow label="Wet Bulb" value={fmtTemp(reading.wet_bulb_in)} mono />
      </Card>

      <Card title="Evapotranspiration">
        <DataRow label="Day" value={reading.et_day !== null ? `${reading.et_day.toFixed(3)} in` : '--'} mono />
        <DataRow label="Month" value={reading.et_month !== null ? `${reading.et_month.toFixed(2)} in` : '--'} mono />
        <DataRow label="Year" value={reading.et_year !== null ? `${reading.et_year.toFixed(2)} in` : '--'} mono />
      </Card>

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

function ConsoleBar({ reading, station }: { reading: WeatherReading; station: WeatherStation | null }) {
  return (
    <div className="mt-6 bg-white/5 rounded-xl border border-white/10 p-4">
      <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">Console Health</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <Stat label="Battery" value={reading.battery_percent !== null ? `${reading.battery_percent}%` : '--'} />
        <Stat label="Battery V" value={reading.battery_voltage !== null ? `${(reading.battery_voltage / 1000).toFixed(3)} V` : '--'} />
        <Stat label="WiFi RSSI" value={reading.wifi_rssi !== null ? `${reading.wifi_rssi} dBm` : '--'} />
        <Stat label="Firmware" value={reading.console_sw_version ?? station?.firmware_version ?? '--'} />
      </div>
      {station && (
        <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-white/30 flex flex-wrap gap-x-4 gap-y-1">
          <span>Station ID: {station.station_id}</span>
          {station.gateway_type && <span>Gateway: {station.gateway_type}</span>}
          {station.subscription_type && <span>Plan: {station.subscription_type}</span>}
          {station.recording_interval && <span>Interval: {station.recording_interval}m</span>}
          {station.last_ingested_at && <span>Last ingest: {timeAgo(station.last_ingested_at)}</span>}
        </div>
      )}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-white/40 uppercase tracking-wide text-[10px] mb-0.5">{label}</div>
      <div className="text-white/90 font-mono text-sm">{value}</div>
    </div>
  );
}
