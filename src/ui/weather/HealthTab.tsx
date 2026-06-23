import { useEffect, useMemo, useState } from 'react';
import LineChart from './LineChart';
import PushSettings from './PushSettings';
import WidgetInstallSection from './WidgetInstallSection';
import WidgetSettingsCard from './WidgetSettingsCard';
import ReleaseInfoCard from './ReleaseInfoCard';
import {
  getReadingsRange,
  timeAgo,
  type WeatherReading,
  type WeatherStation,
} from '../../lib/weatherService';
import { getDbStats, type DbStats } from '../../lib/adminService';

type Range = '24h' | '7d' | '30d';
const RANGES: { id: Range; label: string; ms: number }[] = [
  { id: '24h', label: '24h', ms: 24 * 3600_000 },
  { id: '7d', label: '7d', ms: 7 * 24 * 3600_000 },
  { id: '30d', label: '30d', ms: 30 * 24 * 3600_000 },
];

export default function HealthTab({
  reading,
  station,
  stationId,
  lastIngestTick,
}: {
  reading: WeatherReading;
  station: WeatherStation | null;
  stationId: number;
  lastIngestTick: number;
}) {
  const [range, setRange] = useState<Range>('7d');
  const [readings, setReadings] = useState<WeatherReading[]>([]);
  const [db, setDb] = useState<DbStats | null | undefined>(undefined);

  useEffect(() => {
    const r = RANGES.find((x) => x.id === range)!;
    getReadingsRange(stationId, new Date(Date.now() - r.ms).toISOString(), new Date().toISOString())
      .then(setReadings)
      .catch(() => setReadings([]));
  }, [stationId, range, lastIngestTick]);

  useEffect(() => {
    getDbStats().then((d) => setDb(d ?? null));
  }, []);

  const t = (r: WeatherReading) => new Date(r.observed_at).getTime();

  const signalSeries = useMemo(
    () => [
      { label: 'ISS RSSI (dBm)', color: '#60a5fa', points: readings.map((r) => ({ t: t(r), v: r.rssi_last })) },
      { label: 'WiFi RSSI (dBm)', color: '#34d399', points: readings.map((r) => ({ t: t(r), v: r.wifi_rssi })) },
    ],
    [readings],
  );

  const receptionSeries = useMemo(
    () => [
      { label: 'Reception %', color: '#fbbf24', points: readings.map((r) => ({ t: t(r), v: r.reception_day })) },
    ],
    [readings],
  );

  const batterySeries = useMemo(
    () => [
      { label: 'Trans Battery V', color: '#fbbf24', points: readings.map((r) => ({ t: t(r), v: r.trans_battery_volt })) },
    ],
    [readings],
  );

  const consoleBatterySeries = useMemo(
    () => [
      { label: 'Console %', color: '#34d399', points: readings.map((r) => ({ t: t(r), v: r.battery_percent })) },
    ],
    [readings],
  );

  const rssiMin = readings.length > 0 ? Math.min(...readings.map((r) => r.rssi_last ?? 0).filter((v) => v !== 0)) : null;
  const rssiMax = readings.length > 0 ? Math.max(...readings.map((r) => r.rssi_last ?? -999).filter((v) => v !== -999)) : null;
  const receptionAvg =
    readings.length > 0
      ? readings.map((r) => r.reception_day).filter((v): v is number => v !== null).reduce((a, b) => a + b, 0) /
        readings.filter((r) => r.reception_day !== null).length
      : null;

  return (
    <div className="space-y-4">
      {/* Current status panel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <HealthCard
          label="ISS Signal"
          value={reading.rssi_last !== null ? `${reading.rssi_last} dBm` : '--'}
          sub={
            reading.rssi_last === null
              ? 'no data'
              : reading.rssi_last > -60
              ? 'Excellent'
              : reading.rssi_last > -75
              ? 'Good'
              : reading.rssi_last > -85
              ? 'Fair'
              : 'Weak'
          }
          tone={
            reading.rssi_last === null
              ? 'neutral'
              : reading.rssi_last > -75
              ? 'good'
              : reading.rssi_last > -85
              ? 'warn'
              : 'bad'
          }
        />
        <HealthCard
          label="Reception (day)"
          value={reading.reception_day !== null ? `${reading.reception_day}%` : '--'}
          sub={
            reading.reception_day === null
              ? 'no data'
              : reading.reception_day >= 95
              ? 'Excellent'
              : reading.reception_day >= 85
              ? 'Good'
              : reading.reception_day >= 70
              ? 'Fair'
              : 'Poor'
          }
          tone={
            reading.reception_day === null
              ? 'neutral'
              : reading.reception_day >= 85
              ? 'good'
              : reading.reception_day >= 70
              ? 'warn'
              : 'bad'
          }
        />
        <HealthCard
          label="Trans Battery"
          value={reading.trans_battery_volt !== null ? `${reading.trans_battery_volt.toFixed(2)} V` : '--'}
          sub={
            reading.trans_battery_volt === null
              ? 'no data'
              : reading.trans_battery_volt > 2.8
              ? 'Full'
              : reading.trans_battery_volt > 2.6
              ? 'Good'
              : reading.trans_battery_volt > 2.4
              ? 'Low'
              : 'Replace'
          }
          tone={
            reading.trans_battery_flag === 0 && reading.trans_battery_volt && reading.trans_battery_volt > 2.6
              ? 'good'
              : reading.trans_battery_volt && reading.trans_battery_volt > 2.4
              ? 'warn'
              : 'bad'
          }
        />
        <HealthCard
          label="WiFi RSSI"
          value={reading.wifi_rssi !== null ? `${reading.wifi_rssi} dBm` : '--'}
          sub={
            reading.wifi_rssi === null
              ? 'no data'
              : reading.wifi_rssi > -60
              ? 'Excellent'
              : reading.wifi_rssi > -70
              ? 'Good'
              : reading.wifi_rssi > -80
              ? 'Fair'
              : 'Weak'
          }
          tone={
            reading.wifi_rssi === null
              ? 'neutral'
              : reading.wifi_rssi > -70
              ? 'good'
              : reading.wifi_rssi > -80
              ? 'warn'
              : 'bad'
          }
        />
      </div>

      {/* Console info */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
        <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">Console</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <KV k="Battery %" v={reading.battery_percent !== null ? `${reading.battery_percent}%` : '--'} />
          <KV k="Battery V" v={reading.battery_voltage !== null ? `${(reading.battery_voltage / 1000).toFixed(3)} V` : '--'} />
          <KV k="Firmware" v={reading.console_sw_version ?? station?.firmware_version ?? '--'} />
          <KV k="Station ID" v={String(station?.station_id ?? '--')} />
          <KV k="Gateway" v={station?.gateway_type ?? '--'} />
          <KV k="Subscription" v={station?.subscription_type ?? '--'} />
          <KV k="Recording Interval" v={station?.recording_interval ? `${station.recording_interval} min` : '--'} />
          <KV k="Last Ingest" v={station?.last_ingested_at ? timeAgo(station.last_ingested_at) : '--'} />
          <KV k="Last Observation" v={timeAgo(reading.observed_at)} />
        </div>
      </div>

      {/* Range toggle for charts */}
      <div className="flex justify-end">
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

      {/* Signal chart */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-xs uppercase tracking-wide text-white/40 font-semibold">Radio Signal (RSSI)</div>
          {rssiMin !== null && rssiMax !== null && (
            <div className="text-[10px] text-white/40">
              min {rssiMin} · max {rssiMax} dBm
            </div>
          )}
        </div>
        <LineChart series={signalSeries} height={180} />
      </div>

      {/* Reception chart */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-xs uppercase tracking-wide text-white/40 font-semibold">Packet Reception</div>
          {receptionAvg !== null && <div className="text-[10px] text-white/40">avg {receptionAvg.toFixed(1)}%</div>}
        </div>
        <LineChart series={receptionSeries} height={160} yDomain={[0, 100]} yUnit="%" />
      </div>

      {/* Transmitter battery */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
        <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">Transmitter Battery Voltage</div>
        <LineChart series={batterySeries} height={160} yUnit=" V" />
      </div>

      {/* Console battery */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
        <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">Console Battery %</div>
        <LineChart series={consoleBatterySeries} height={160} yDomain={[0, 100]} yUnit="%" />
      </div>

      {/* Supabase DB stats */}
      {db !== null && (
        <DbStatsPanel db={db} />
      )}

      {/* Notifications settings */}
      <div className="pt-4 mt-4 border-t border-white/5">
        <h2 className="text-base font-display font-semibold text-white mb-3">Notifications</h2>
        <PushSettings />
      </div>

      {/* Android widget install */}
      <div className="pt-4 mt-4 border-t border-white/5">
        <h2 className="text-base font-display font-semibold text-white mb-3">Mobile</h2>
        <WidgetInstallSection />
        <div className="mt-4">
          <WidgetSettingsCard />
        </div>
      </div>

      {/* Build / release info */}
      <div className="pt-4 mt-4 border-t border-white/5">
        <h2 className="text-base font-display font-semibold text-white mb-3">Release</h2>
        <ReleaseInfoCard />
      </div>
    </div>
  );
}

const DB_LIMIT_BYTES = 500 * 1_048_576; // 500 MB free-tier soft limit

function fmtBytes(bytes: number) {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024)     return `${(bytes / 1_024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function DbStatsPanel({ db }: { db: DbStats | undefined }) {
  if (db === undefined) {
    return (
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
        <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">Database Storage</div>
        <div className="space-y-2">
          {[80, 55, 65].map((w, i) => (
            <div key={i} className="h-3 bg-white/10 rounded animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const pctUsed = Math.min(100, (db.db_size_bytes / DB_LIMIT_BYTES) * 100);

  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
      <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">Database Storage</div>

      {/* Storage bar */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs text-white/50">Total size</span>
          <span className="text-sm font-mono font-semibold text-white">
            {fmtBytes(db.db_size_bytes)}
            <span className="text-white/30 font-normal"> / 500 MB</span>
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-700"
            style={{ width: `${pctUsed.toFixed(1)}%` }}
          />
        </div>
        <div className="text-right text-[10px] text-white/30 mt-0.5">{pctUsed.toFixed(1)}% of free-tier limit</div>
      </div>

      {/* Weather row counts */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-black/20 rounded-lg p-3">
          <div className="text-[10px] text-white/40 mb-0.5">Total readings</div>
          <div className="text-lg font-bold text-cyan-400">{db.weather_total.toLocaleString()}</div>
        </div>
        <div className="bg-black/20 rounded-lg p-3">
          <div className="text-[10px] text-white/40 mb-0.5">Today</div>
          <div className="text-lg font-bold text-teal-400">{db.weather_today.toLocaleString()}</div>
        </div>
        <div className="bg-black/20 rounded-lg p-3">
          <div className="text-[10px] text-white/40 mb-0.5">Last ingested</div>
          <div className="text-xs font-mono text-white/70 leading-snug pt-0.5">{fmtTime(db.weather_last_at)}</div>
        </div>
      </div>

      {/* Table breakdown */}
      {db.tables.length > 0 && (
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Tables</div>
          <div className="space-y-1.5">
            {db.tables.map((t) => {
              const pct = db.db_size_bytes > 0 ? (t.size_bytes / db.db_size_bytes) * 100 : 0;
              return (
                <div key={t.name} className="flex items-center gap-3">
                  <div className="w-32 truncate text-xs text-white/55 font-mono">{t.name}</div>
                  <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cyan-500/60"
                      style={{ width: `${Math.min(100, pct * 4).toFixed(1)}%` }}
                    />
                  </div>
                  <div className="w-14 text-right text-[11px] text-white/45 font-mono">{t.size_pretty}</div>
                  <div className="w-16 text-right text-[11px] text-white/30">{t.rows.toLocaleString()} rows</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function HealthCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: 'good' | 'warn' | 'bad' | 'neutral';
}) {
  const toneClass: Record<string, string> = {
    good: 'text-green-400',
    warn: 'text-amber-400',
    bad: 'text-red-400',
    neutral: 'text-white/50',
  };
  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-3">
      <div className="text-[10px] uppercase tracking-wide text-white/40 mb-1">{label}</div>
      <div className="text-lg font-mono text-white tabular-nums">{value}</div>
      <div className={`text-xs ${toneClass[tone]}`}>{sub}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-white/40">{k}</div>
      <div className="text-sm font-mono text-white/90">{v}</div>
    </div>
  );
}
