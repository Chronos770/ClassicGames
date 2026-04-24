import { useEffect, useMemo, useState } from 'react';
import {
  forecastEmoji,
  getHourlyForecast,
  type NwsForecastPeriod,
} from '../../lib/nwsService';
import type { WeatherStation } from '../../lib/weatherService';

interface Props {
  station: WeatherStation | null;
  tick: number;
}

type Kind = 'thunder' | 'rain' | 'snow' | 'wintry' | 'shower';
interface Window {
  kind: Kind;
  startsIn: number; // minutes from now
  durationHrs: number;
  peakProb: number;
  label: string;
  icon: string;
}

function classify(period: NwsForecastPeriod): Kind | null {
  const s = period.shortForecast.toLowerCase();
  if (/thunder/.test(s)) return 'thunder';
  if (/snow|flurr|blizzard/.test(s)) return 'snow';
  if (/sleet|ice|freezing/.test(s)) return 'wintry';
  if (/shower/.test(s)) return 'shower';
  if (/rain|drizzle/.test(s)) return 'rain';
  return null;
}

function labelFor(kind: Kind): { label: string; icon: string } {
  switch (kind) {
    case 'thunder': return { label: 'Thunderstorms', icon: '\u{26C8}\u{FE0F}' };
    case 'snow':    return { label: 'Snow', icon: '\u{2744}\u{FE0F}' };
    case 'wintry':  return { label: 'Wintry mix', icon: '\u{1F328}\u{FE0F}' };
    case 'shower':  return { label: 'Showers', icon: '\u{1F327}\u{FE0F}' };
    case 'rain':    return { label: 'Rain', icon: '\u{1F327}\u{FE0F}' };
  }
}

// Collapse consecutive hourly periods matching the same precip kind into windows.
function buildWindows(periods: NwsForecastPeriod[], now: Date): Window[] {
  const out: Window[] = [];
  let current: { kind: Kind; start: Date; end: Date; peakProb: number } | null = null;
  for (const p of periods) {
    const kind = classify(p);
    const start = new Date(p.startTime);
    const end = new Date(p.endTime);
    const prob = p.probabilityOfPrecipitation.value ?? 0;
    if (kind && prob >= 15) {
      if (current && current.kind === kind && Math.abs(start.getTime() - current.end.getTime()) < 30 * 60_000) {
        current.end = end;
        current.peakProb = Math.max(current.peakProb, prob);
      } else {
        if (current) {
          const info = labelFor(current.kind);
          out.push({
            kind: current.kind,
            startsIn: Math.max(0, Math.round((current.start.getTime() - now.getTime()) / 60_000)),
            durationHrs: (current.end.getTime() - current.start.getTime()) / 3600_000,
            peakProb: current.peakProb,
            label: info.label,
            icon: info.icon,
          });
        }
        current = { kind, start, end, peakProb: prob };
      }
    } else {
      if (current) {
        const info = labelFor(current.kind);
        out.push({
          kind: current.kind,
          startsIn: Math.max(0, Math.round((current.start.getTime() - now.getTime()) / 60_000)),
          durationHrs: (current.end.getTime() - current.start.getTime()) / 3600_000,
          peakProb: current.peakProb,
          label: info.label,
          icon: info.icon,
        });
        current = null;
      }
    }
  }
  if (current) {
    const info = labelFor(current.kind);
    out.push({
      kind: current.kind,
      startsIn: Math.max(0, Math.round((current.start.getTime() - now.getTime()) / 60_000)),
      durationHrs: (current.end.getTime() - current.start.getTime()) / 3600_000,
      peakProb: current.peakProb,
      label: info.label,
      icon: info.icon,
    });
  }
  return out;
}

function humanizeDelay(mins: number): string {
  if (mins <= 15) return 'starting now';
  if (mins < 60) return `in ${mins} min`;
  const hrs = Math.round(mins / 30) / 2;
  if (hrs < 12) return `in ~${hrs} hr`;
  const days = Math.round(hrs / 24);
  return days <= 1 ? 'tomorrow' : `in ~${days} days`;
}

function humanizeDuration(hrs: number): string {
  if (hrs < 1.5) return 'about 1 hr';
  if (hrs < 24) return `~${Math.round(hrs)} hr`;
  const days = Math.round(hrs / 24);
  return `~${days} day${days > 1 ? 's' : ''}`;
}

function toneFor(kind: Kind): { bg: string; border: string; accent: string } {
  switch (kind) {
    case 'thunder':
      return { bg: 'bg-purple-500/15', border: 'border-purple-500/30', accent: 'text-purple-200' };
    case 'snow':
    case 'wintry':
      return { bg: 'bg-sky-400/10', border: 'border-sky-400/20', accent: 'text-sky-200' };
    case 'shower':
    case 'rain':
    default:
      return { bg: 'bg-blue-500/10', border: 'border-blue-500/25', accent: 'text-blue-200' };
  }
}

export default function PrecipOutlook({ station, tick }: Props) {
  const [periods, setPeriods] = useState<NwsForecastPeriod[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!station || station.latitude === null || station.longitude === null) {
      setPeriods(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getHourlyForecast(station.latitude, station.longitude)
      .then((f) => {
        if (!cancelled) setPeriods(f.properties.periods.slice(0, 48));
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [station?.latitude, station?.longitude, tick]);

  const windows = useMemo(() => {
    if (!periods) return [];
    return buildWindows(periods, new Date()).slice(0, 3);
  }, [periods]);

  if (loading && !periods) return null;
  if (error) return null;
  if (!periods || windows.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {windows.map((w, i) => {
        const tone = toneFor(w.kind);
        const starting = w.startsIn <= 15;
        return (
          <div
            key={i}
            className={`rounded-xl border p-3 ${tone.bg} ${tone.border} flex items-center gap-3`}
          >
            <span className="text-2xl flex-shrink-0">{w.icon}</span>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-semibold ${tone.accent}`}>
                {w.label} {humanizeDelay(w.startsIn)}
                <span className="text-white/40 font-normal"> · lasting {humanizeDuration(w.durationHrs)}</span>
              </div>
              <div className="text-[11px] text-white/50 mt-0.5">
                Peak chance {w.peakProb}%
                {!starting && w.durationHrs >= 6 && ' · prolonged event'}
                {w.kind === 'thunder' && ' · potential for lightning'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
