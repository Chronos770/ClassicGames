import { useEffect, useMemo, useState } from 'react';
import LineChart from './LineChart';
import PushSettings from './PushSettings';
import {
  getReadingsRange,
  timeAgo,
  type WeatherReading,
  type WeatherStation,
} from '../../lib/weatherService';

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

  useEffect(() => {
    const r = RANGES.find((x) => x.id === range)!;
    getReadingsRange(stationId, new Date(Date.now() - r.ms).toISOString(), new Date().toISOString())
      .then(setReadings)
      .catch(() => setReadings([]));
  }, [stationId, range, lastIngestTick]);

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
      <div className="bg-white/5 rounded-xl border border-white/10 p-4">
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
      <div className="bg-white/5 rounded-xl border border-white/10 p-4">
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
      <div className="bg-white/5 rounded-xl border border-white/10 p-4">
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-xs uppercase tracking-wide text-white/40 font-semibold">Packet Reception</div>
          {receptionAvg !== null && <div className="text-[10px] text-white/40">avg {receptionAvg.toFixed(1)}%</div>}
        </div>
        <LineChart series={receptionSeries} height={160} yDomain={[0, 100]} yUnit="%" />
      </div>

      {/* Transmitter battery */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-4">
        <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">Transmitter Battery Voltage</div>
        <LineChart series={batterySeries} height={160} yUnit=" V" />
      </div>

      {/* Console battery */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-4">
        <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">Console Battery %</div>
        <LineChart series={consoleBatterySeries} height={160} yDomain={[0, 100]} yUnit="%" />
      </div>

      {/* Notifications settings */}
      <div className="pt-4 mt-4 border-t border-white/5">
        <h2 className="text-base font-display font-semibold text-white mb-3">Notifications</h2>
        <PushSettings />
      </div>
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
    <div className="bg-white/5 rounded-xl border border-white/10 p-3">
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
