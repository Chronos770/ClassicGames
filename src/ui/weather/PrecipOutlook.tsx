import { useMemo } from 'react';
import { type NwsForecastPeriod } from '../../lib/nwsService';
import { useNwsHourly } from '../../lib/nwsCache';
import type { WeatherStation } from '../../lib/weatherService';

interface Props {
  station: WeatherStation | null;
  tick: number;
}

type Kind = 'thunder' | 'rain' | 'snow' | 'wintry' | 'shower';

interface Event {
  start: Date;
  end: Date;
  peakProb: number;
  kinds: Set<Kind>;
}

function classify(period: NwsForecastPeriod): Set<Kind> {
  const s = period.shortForecast.toLowerCase();
  const kinds = new Set<Kind>();
  if (/thunder/.test(s)) kinds.add('thunder');
  if (/snow|flurr|blizzard/.test(s)) kinds.add('snow');
  if (/sleet|ice|freezing/.test(s)) kinds.add('wintry');
  if (/shower/.test(s)) kinds.add('shower');
  if (/rain|drizzle/.test(s)) kinds.add('rain');
  return kinds;
}

// Severity ordering — used to pick the primary kind for color/icon and to
// order combined labels.
const SEVERITY: Kind[] = ['thunder', 'wintry', 'snow', 'rain', 'shower'];
function primaryKind(kinds: Set<Kind>): Kind {
  for (const k of SEVERITY) if (kinds.has(k)) return k;
  return 'rain';
}

function iconFor(kind: Kind): string {
  switch (kind) {
    case 'thunder': return '\u{26C8}\u{FE0F}';
    case 'snow':    return '\u{2744}\u{FE0F}';
    case 'wintry':  return '\u{1F328}\u{FE0F}';
    case 'shower':  return '\u{1F327}\u{FE0F}';
    case 'rain':    return '\u{1F327}\u{FE0F}';
  }
}

// Combine the kinds present in one event into a single human label.
function eventLabel(kinds: Set<Kind>): string {
  if (kinds.has('thunder')) {
    if (kinds.has('rain') || kinds.has('shower')) return 'Showers with thunderstorms';
    if (kinds.has('snow')) return 'Snow with thunderstorms';
    return 'Thunderstorms';
  }
  if (kinds.has('wintry')) {
    if (kinds.has('snow')) return 'Snow & wintry mix';
    if (kinds.has('rain') || kinds.has('shower')) return 'Wintry mix with rain';
    return 'Wintry mix';
  }
  if (kinds.has('snow')) {
    if (kinds.has('rain') || kinds.has('shower')) return 'Rain & snow';
    return 'Snow';
  }
  if (kinds.has('rain') && kinds.has('shower')) return 'Rain & showers';
  if (kinds.has('rain')) return 'Rain';
  if (kinds.has('shower')) return 'Showers';
  return 'Precipitation';
}

// Walk hourly periods and group any contiguous run with prob >= 15% into a
// single event, regardless of whether the kind switches mid-event (e.g.,
// showers → showers+thunder → showers). Adjacent periods within 30 min are
// considered contiguous.
function buildEvents(periods: NwsForecastPeriod[]): Event[] {
  const out: Event[] = [];
  let cur: Event | null = null;
  for (const p of periods) {
    const start = new Date(p.startTime);
    const end = new Date(p.endTime);
    const prob = p.probabilityOfPrecipitation.value ?? 0;
    const kinds = classify(p);
    const inEvent = kinds.size > 0 && prob >= 15;
    if (inEvent) {
      if (cur && Math.abs(start.getTime() - cur.end.getTime()) < 30 * 60_000) {
        cur.end = end;
        cur.peakProb = Math.max(cur.peakProb, prob);
        for (const k of kinds) cur.kinds.add(k);
      } else {
        if (cur) out.push(cur);
        cur = { start, end, peakProb: prob, kinds: new Set(kinds) };
      }
    } else if (cur) {
      out.push(cur);
      cur = null;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function fmtTime(d: Date): string {
  const mins = d.getMinutes();
  return d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: mins === 0 ? undefined : '2-digit',
  });
}

function fmtDayLabel(d: Date, now: Date): string {
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return '';
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return 'tomorrow';
  // Show weekday short name (Mon, Tue…). Beyond 6 days NWS won't return
  // hourly anyway, so we don't worry about week-after collisions.
  return d.toLocaleDateString([], { weekday: 'short' });
}

// Replaces the old "in ~2 days" — gives a precise wall-clock label that's
// still readable. Examples: "starting now", "in 35 min", "in 4 hr", "this
// evening at 7 PM", "tomorrow at 3 AM", "Sat at 4 PM".
function humanizeStart(start: Date, now: Date): string {
  const ms = start.getTime() - now.getTime();
  const mins = Math.round(ms / 60_000);
  if (mins <= 15) return 'starting now';
  if (mins < 60) return `in ${mins} min`;
  const hrs = ms / 3600_000;
  if (hrs < 6) {
    const h = Math.floor(hrs);
    const m = Math.round((hrs - h) * 4) * 15; // nearest 15
    if (m === 0) return `in ${h} hr`;
    if (m === 60) return `in ${h + 1} hr`;
    return `in ${h} hr ${m} min`;
  }
  // Switch to wall-clock for >6h out
  const time = fmtTime(start);
  const sameDay = start.toDateString() === now.toDateString();
  if (sameDay) {
    const h = start.getHours();
    const part = h < 5 ? 'tonight' : h < 12 ? 'this morning' : h < 17 ? 'this afternoon' : h < 21 ? 'this evening' : 'tonight';
    return `${part} at ${time}`;
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (start.toDateString() === tomorrow.toDateString()) return `tomorrow at ${time}`;
  const day = start.toLocaleDateString([], { weekday: 'short' });
  return `${day} at ${time}`;
}

// "until Sun 12 AM" / "until 9 PM" — used for the end-time tail.
function humanizeEnd(end: Date, now: Date): string {
  const day = fmtDayLabel(end, now);
  const time = fmtTime(end);
  if (!day) return `until ${time}`;
  return `until ${day} ${time}`;
}

function durationLabel(hrs: number): string {
  if (hrs < 1.25) return '~1 hr';
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
  const hourly = useNwsHourly(station?.latitude ?? null, station?.longitude ?? null, tick);
  const periods: NwsForecastPeriod[] | null = hourly.data
    ? hourly.data.properties.periods.slice(0, 96)
    : null;

  const events = useMemo(() => {
    if (!periods) return [];
    return buildEvents(periods).slice(0, 3);
  }, [periods]);

  if (hourly.loading && !periods) return null;
  if (hourly.error) return null;
  if (!periods || events.length === 0) return null;

  const now = new Date();

  return (
    <div className="space-y-2 mb-4">
      {events.map((e, i) => {
        const primary = primaryKind(e.kinds);
        const tone = toneFor(primary);
        const durHrs = (e.end.getTime() - e.start.getTime()) / 3600_000;
        const startStr = humanizeStart(e.start, now);
        const endStr = humanizeEnd(e.end, now);
        const label = eventLabel(e.kinds);
        return (
          <div
            key={i}
            className={`rounded-xl border p-3 ${tone.bg} ${tone.border} flex items-center gap-3`}
          >
            <span className="text-2xl flex-shrink-0">{iconFor(primary)}</span>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-semibold ${tone.accent}`}>
                {label} {startStr}
              </div>
              <div className="text-[11px] text-white/55 mt-0.5">
                {endStr} · {durationLabel(durHrs)} · peak {e.peakProb}%
                {e.kinds.has('thunder') && ' · potential for lightning'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
