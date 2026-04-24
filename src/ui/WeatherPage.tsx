import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import {
  discoverStations,
  getLatestReading,
  getStations,
  timeAgo,
  triggerIngest,
  type IngestResult,
  type WeatherReading,
  type WeatherStation,
} from '../lib/weatherService';
import OverviewTab from './weather/OverviewTab';
import HistoryTab from './weather/HistoryTab';
import RadarTab from './weather/RadarTab';
import HealthTab from './weather/HealthTab';
import RemoteStationsTab from './weather/RemoteStationsTab';
import { WeatherInstallButton, useWeatherManifest } from './weather/WeatherPwa';
import WeatherAlertsBanner from './weather/WeatherAlertsBanner';
import PrecipOutlook from './weather/PrecipOutlook';
import UnitsToggle from './weather/UnitsToggle';
import WeatherBackground from './weather/WeatherBackground';
import { classifyCondition } from '../lib/weatherCondition';

type Tab = 'overview' | 'history' | 'radar' | 'watching' | 'health';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '\u{1F4CA}' },
  { id: 'history', label: 'History', icon: '\u{1F4C8}' },
  { id: 'radar', label: 'Radar', icon: '\u{1F4E1}' },
  { id: 'watching', label: 'Watching', icon: '\u{1F441}\u{FE0F}' },
  { id: 'health', label: 'Station', icon: '\u{1F4CD}' },
];

// Poll fallback in case realtime drops; also covers the case when the cron
// tick happens while the tab is backgrounded.
const POLL_FALLBACK_MS = 120_000;

export default function WeatherPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const authLoading = useAuthStore((s) => s.isLoading);
  const isAdmin = profile?.role === 'admin';

  const [stations, setStations] = useState<WeatherStation[]>([]);
  const [stationId, setStationId] = useState<number | null>(null);
  const [reading, setReading] = useState<WeatherReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [ingestBusy, setIngestBusy] = useState(false);
  const [ingestMsg, setIngestMsg] = useState<string | null>(null);
  const [discoverBusy, setDiscoverBusy] = useState(false);

  // lastIngestTick is bumped whenever we receive a realtime event or manual refresh —
  // child tabs listen to this to re-fetch their data.
  const [lastIngestTick, setLastIngestTick] = useState(0);
  const [realtimeOk, setRealtimeOk] = useState(false);
  const stationIdRef = useRef<number | null>(null);

  // Redirect non-admins (only after auth has finished loading and we've had a
  // chance to fetch the profile — otherwise a fresh page load races the
  // session restore and bounces you to / before your role is known).
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/');
      return;
    }
    // user is loaded but profile may still be fetching — wait one tick
    if (profile && !isAdmin) navigate('/');
  }, [authLoading, user, profile, isAdmin, navigate]);

  // Swap manifest, apple-touch-icon, theme-color, and title to weather branding
  // while on this page so "Add to Home Screen" installs the Weather app.
  useWeatherManifest();

  // Load stations once
  useEffect(() => {
    if (!isAdmin) return;
    getStations()
      .then((list) => {
        setStations(list);
        if (list.length > 0 && stationId === null) setStationId(list[0].station_id);
      })
      .catch(() => setStations([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const loadLatest = useCallback(async (id: number) => {
    try {
      const r = await getLatestReading(id);
      setReading(r);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial + station-change load
  useEffect(() => {
    if (stationId === null) return;
    stationIdRef.current = stationId;
    setLoading(true);
    loadLatest(stationId);
  }, [stationId, loadLatest]);

  // Realtime subscription — fires when ingest inserts a new row
  useEffect(() => {
    if (stationId === null) return;
    const channel = supabase
      .channel(`weather_readings:${stationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'weather_readings',
          filter: `station_id=eq.${stationId}`,
        },
        (payload) => {
          const row = payload.new as WeatherReading;
          // Only replace the displayed reading if this is NEWER than what we
          // have — backfills insert historical rows that would otherwise
          // clobber the current reading with stale/null data.
          setReading((prev) => {
            if (!prev) return row;
            return new Date(row.observed_at).getTime() >
              new Date(prev.observed_at).getTime()
              ? row
              : prev;
          });
          setLastIngestTick((t) => t + 1);
        },
      )
      .subscribe((status) => {
        setRealtimeOk(status === 'SUBSCRIBED');
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [stationId]);

  // Polling fallback
  useEffect(() => {
    if (stationId === null) return;
    const t = setInterval(() => {
      if (stationIdRef.current !== null) {
        loadLatest(stationIdRef.current).then(() => setLastIngestTick((t) => t + 1));
      }
    }, POLL_FALLBACK_MS);
    return () => clearInterval(t);
  }, [stationId, loadLatest]);

  const handleDiscover = async () => {
    if (discoverBusy) return;
    setDiscoverBusy(true);
    setIngestMsg(null);
    try {
      const res = await discoverStations();
      const list = await getStations();
      setStations(list);
      setIngestMsg(
        res.new_count > 0
          ? `Discovered ${res.new_count} new station${res.new_count === 1 ? '' : 's'} (${res.total} total)`
          : `No new stations (${res.total} known)`,
      );
    } catch (e: any) {
      setIngestMsg(`Discover error: ${String(e?.message ?? e).slice(0, 120)}`);
    } finally {
      setDiscoverBusy(false);
      setTimeout(() => setIngestMsg(null), 5000);
    }
  };

  const handleRefresh = async () => {
    if (ingestBusy) return;
    setIngestBusy(true);
    setIngestMsg(null);
    try {
      const res = await triggerIngest();
      const ok = res.results.every((r: IngestResult) => r.ok);
      setIngestMsg(ok ? 'Refreshed from WeatherLink' : `Partial: ${res.results.filter((r) => !r.ok).length} failed`);
      if (stationId !== null) await loadLatest(stationId);
      setLastIngestTick((t) => t + 1);
    } catch (e: any) {
      setIngestMsg(`Error: ${String(e?.message ?? e).slice(0, 120)}`);
    } finally {
      setIngestBusy(false);
      setTimeout(() => setIngestMsg(null), 4000);
    }
  };

  const station = useMemo(
    () => stations.find((s) => s.station_id === stationId) ?? null,
    [stations, stationId],
  );

  if (!isAdmin) return null;

  // Derive page background gradient from current reading's condition.
  const condition = reading && station ? classifyCondition(reading, station.latitude, station.longitude) : null;
  const bgClass = condition ? condition.pageBg : 'from-slate-950 via-slate-900 to-slate-950';

  const windForBg = reading?.wind_speed_avg_last_10_min ?? reading?.wind_speed_last ?? 0;

  return (
    <div className={`relative min-h-screen bg-gradient-to-br ${bgClass} transition-all duration-[1500ms] overflow-hidden`}>
      {condition && (
        <WeatherBackground condition={condition} windMph={windForBg ?? 0} />
      )}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-sky-500/30 to-blue-500/20 flex items-center justify-center text-xl">
              &#9729;
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">
                {station ? station.station_name : 'Weather'}
              </h1>
              <p className="text-xs text-white/40">
                {station
                  ? `${station.city ?? ''}${station.city ? ', ' : ''}${station.region ?? ''} ${station.country ? '· ' + station.country : ''}`
                  : 'Weather station dashboard'}
                {station && station.latitude !== null && station.longitude !== null && (
                  <span className="ml-2 text-white/30">
                    {station.latitude.toFixed(4)}°, {station.longitude.toFixed(4)}°
                    {station.elevation !== null && ` · ${Math.round(station.elevation)}ft`}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Realtime pill */}
            <FreshnessPill reading={reading} realtimeOk={realtimeOk} lastIngestTick={lastIngestTick} />
            <UnitsToggle />
            {stations.length > 1 && (
              <select
                value={stationId ?? ''}
                onChange={(e) => setStationId(Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500/50 focus:outline-none"
              >
                {stations.map((s) => (
                  <option key={s.station_id} value={s.station_id}>
                    {s.station_name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleDiscover}
              disabled={discoverBusy}
              title="Pull station list from your WeatherLink account and add any new ones"
              className="text-sm px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5 border border-white/10"
            >
              <span className={discoverBusy ? 'animate-spin inline-block' : 'inline-block'}>&#128225;</span>
              {discoverBusy ? 'Discovering' : 'Discover'}
            </button>
            <button
              onClick={handleRefresh}
              disabled={ingestBusy}
              className="text-sm px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              <span className={ingestBusy ? 'animate-spin inline-block' : 'inline-block'}>&#8635;</span>
              {ingestBusy ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </div>

        {ingestMsg && (
          <div className="mb-4 text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            {ingestMsg}
          </div>
        )}

        <WeatherInstallButton />

        {/* Alerts + precip outlook above the tabs so they're visible on every tab */}
        <WeatherAlertsBanner station={station} tick={lastIngestTick} />
        <PrecipOutlook station={station} tick={lastIngestTick} />

        {/* Tab bar */}
        <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 sm:px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                tab === t.id
                  ? 'bg-amber-500/20 text-amber-400 font-medium'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading && !reading ? (
          <div className="text-white/40 text-sm py-20 text-center">Loading current conditions...</div>
        ) : !reading && stationId !== null ? (
          <EmptyState onRefresh={handleRefresh} busy={ingestBusy} />
        ) : stationId === null ? (
          <div className="text-white/40 text-sm py-20 text-center">No stations configured.</div>
        ) : (
          <>
            {tab === 'overview' && reading && (
              <OverviewTab
                reading={reading}
                station={station}
                stationId={stationId}
                tick={lastIngestTick}
              />
            )}
            {tab === 'history' && <HistoryTab stationId={stationId} lastIngestTick={lastIngestTick} />}
            {tab === 'radar' && <RadarTab station={station} />}
            {tab === 'watching' && <RemoteStationsTab tick={lastIngestTick} />}
            {tab === 'health' && reading && (
              <HealthTab reading={reading} station={station} stationId={stationId} lastIngestTick={lastIngestTick} />
            )}
          </>
        )}
      </motion.div>
      </div>
    </div>
  );
}

function FreshnessPill({
  reading,
  realtimeOk,
  lastIngestTick,
}: {
  reading: WeatherReading | null;
  realtimeOk: boolean;
  lastIngestTick: number;
}) {
  const [flash, setFlash] = useState(false);
  const prevTick = useRef(lastIngestTick);
  useEffect(() => {
    if (lastIngestTick !== prevTick.current) {
      prevTick.current = lastIngestTick;
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 1200);
      return () => clearTimeout(id);
    }
  }, [lastIngestTick]);
  return (
    <div
      className={`flex items-center gap-1.5 text-[10px] text-white/40 border rounded-full px-2 py-1 transition-colors ${
        flash ? 'border-green-400/60 bg-green-400/10' : 'border-white/10'
      }`}
    >
      <span className="relative flex w-1.5 h-1.5">
        {realtimeOk && (
          <span
            className={`absolute inline-flex w-full h-full rounded-full bg-green-400 ${
              flash ? 'animate-ping' : 'animate-pulse'
            }`}
          />
        )}
        <span
          className={`relative inline-flex w-1.5 h-1.5 rounded-full ${
            realtimeOk ? 'bg-green-400' : 'bg-white/30'
          }`}
        />
      </span>
      {realtimeOk ? 'Live' : 'Polling'}
      {reading && <span className="ml-1 text-white/50">· {timeAgo(reading.observed_at)}</span>}
    </div>
  );
}

function EmptyState({ onRefresh, busy }: { onRefresh: () => void; busy: boolean }) {
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-8 text-center">
      <div className="text-white/60 text-lg mb-2">No readings yet</div>
      <div className="text-white/40 text-sm mb-4">
        Trigger the first ingestion to pull current conditions from WeatherLink.
      </div>
      <button
        onClick={onRefresh}
        disabled={busy}
        className="text-sm px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors disabled:opacity-40"
      >
        {busy ? 'Fetching...' : 'Fetch Current Conditions'}
      </button>
    </div>
  );
}
