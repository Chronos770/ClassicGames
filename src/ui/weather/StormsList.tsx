import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { fmtIn } from '../../lib/weatherService';

interface StormRow {
  start_at: string;
  end_at: string | null;
  total_in: number;
  duration_hrs: number | null;
  ongoing: boolean;
}

export default function StormsList({
  stationId,
  fromIso,
  toIso,
  lastIngestTick,
}: {
  stationId: number;
  fromIso: string;
  toIso: string;
  lastIngestTick: number;
}) {
  const [storms, setStorms] = useState<StormRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        // Completed storms: distinct rain_storm_last_start_at within range.
        // WeatherLink reports start/end timestamps that drift by 1-3 seconds
        // between successive readings of the same storm, so a naive
        // dedup-by-exact-timestamp leaves N near-duplicates per storm. We
        // bucket by start_at rounded to the nearest 5 minutes — far smaller
        // than any real storm gap (storms must be > 24hr apart by Davis
        // definition).
        const { data: lastData } = await supabase
          .from('weather_readings')
          .select('rain_storm_last_start_at, rain_storm_last_end_at, rain_storm_last_in')
          .eq('station_id', stationId)
          .not('rain_storm_last_start_at', 'is', null)
          .gte('rain_storm_last_start_at', fromIso)
          .lte('rain_storm_last_start_at', toIso)
          .order('rain_storm_last_start_at', { ascending: false });

        const bucketKey = (iso: string) => {
          const ms = new Date(iso).getTime();
          // 5-minute bucket
          return String(Math.round(ms / (5 * 60_000)));
        };

        const byBucket: Record<string, StormRow> = {};
        for (const row of (lastData as any[]) ?? []) {
          const start = row.rain_storm_last_start_at as string | null;
          if (!start) continue;
          const key = bucketKey(start);
          const end = row.rain_storm_last_end_at as string | null;
          const total = Number(row.rain_storm_last_in ?? 0);
          const dur = end
            ? (new Date(end).getTime() - new Date(start).getTime()) / 3600_000
            : null;
          const existing = byBucket[key];
          // Keep the entry with the largest total (and a real end_at if available).
          // Use the EARLIEST start and LATEST end so the displayed range covers
          // the full span observed across the duplicate readings.
          if (!existing) {
            byBucket[key] = { start_at: start, end_at: end, total_in: total, duration_hrs: dur, ongoing: false };
          } else {
            const newStart = new Date(start).getTime() < new Date(existing.start_at).getTime() ? start : existing.start_at;
            const newEnd = end && (!existing.end_at || new Date(end).getTime() > new Date(existing.end_at).getTime())
              ? end : existing.end_at;
            const newTotal = Math.max(total, existing.total_in);
            const newDur = newEnd
              ? (new Date(newEnd).getTime() - new Date(newStart).getTime()) / 3600_000
              : null;
            byBucket[key] = { start_at: newStart, end_at: newEnd, total_in: newTotal, duration_hrs: newDur, ongoing: false };
          }
        }

        // Current (ongoing) storm: check most recent reading. Replace any
        // bucketed entry that matches by start time so we don't double-count
        // the active storm.
        const { data: current } = await supabase
          .from('weather_readings')
          .select('rain_storm_current_start_at, rain_storm_current_in, observed_at')
          .eq('station_id', stationId)
          .not('rain_storm_current_start_at', 'is', null)
          .order('observed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (current && (current as any).rain_storm_current_start_at) {
          const start = (current as any).rain_storm_current_start_at as string;
          const key = bucketKey(start);
          const total = Number((current as any).rain_storm_current_in ?? 0);
          const dur = (Date.now() - new Date(start).getTime()) / 3600_000;
          byBucket[key] = {
            start_at: start,
            end_at: null,
            total_in: total,
            duration_hrs: dur,
            ongoing: true,
          };
        }

        const arr = Object.values(byBucket)
          .filter((s) => s.total_in > 0)
          .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());
        if (!cancelled) setStorms(arr);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [stationId, fromIso, toIso, lastIngestTick]);

  if (loading) {
    return <div className="h-[200px] flex items-center justify-center text-white/30 text-sm">Loading storms...</div>;
  }

  if (storms.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-white/30 text-sm">
        No rain storms recorded in this range.
      </div>
    );
  }

  const maxTotal = Math.max(...storms.map((s) => s.total_in));

  return (
    <div className="space-y-2">
      <div className="text-xs text-white/40 mb-2">{storms.length} storms · {storms.filter(s => s.ongoing).length > 0 ? '1 ongoing' : 'all completed'}</div>
      {storms.map((s) => {
        const pct = (s.total_in / maxTotal) * 100;
        return (
          <div key={s.start_at} className="bg-white/5 rounded-lg border border-white/10 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                {s.ongoing && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium uppercase tracking-wide flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    Ongoing
                  </span>
                )}
                <span className="text-sm text-white font-medium">
                  {new Date(s.start_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="text-xs text-white/40">
                  {new Date(s.start_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  {s.end_at && ` → ${new Date(s.end_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                </span>
              </div>
              <div className="flex items-baseline gap-3 text-xs">
                <span className="text-blue-400 font-mono font-semibold text-sm">{fmtIn(s.total_in)}</span>
                {s.duration_hrs !== null && (
                  <span className="text-white/50 font-mono">
                    {s.duration_hrs < 1
                      ? `${Math.round(s.duration_hrs * 60)}m`
                      : s.duration_hrs < 24
                      ? `${s.duration_hrs.toFixed(1)}h`
                      : `${(s.duration_hrs / 24).toFixed(1)}d`}
                  </span>
                )}
              </div>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${s.ongoing ? 'bg-blue-500/70' : 'bg-blue-500/50'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
