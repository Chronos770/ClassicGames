import { useState } from 'react';
import { useNwsAlerts } from '../../lib/nwsCache';
import type { WeatherStation } from '../../lib/weatherService';

interface Props {
  station: WeatherStation | null;
  tick: number;
}

const SEVERITY_STYLE: Record<string, { bg: string; border: string; text: string; pulse: string }> = {
  Extreme: {
    bg: 'bg-slate-900/85 backdrop-blur-sm',
    border: 'border-red-500/40',
    text: 'text-red-100',
    pulse: 'bg-red-400',
  },
  Severe: {
    bg: 'bg-slate-900/85 backdrop-blur-sm',
    border: 'border-orange-500/40',
    text: 'text-orange-100',
    pulse: 'bg-orange-400',
  },
  Moderate: {
    bg: 'bg-slate-900/85 backdrop-blur-sm',
    border: 'border-amber-500/35',
    text: 'text-amber-100',
    pulse: 'bg-amber-400',
  },
  Minor: {
    bg: 'bg-slate-900/85 backdrop-blur-sm',
    border: 'border-yellow-500/30',
    text: 'text-yellow-100',
    pulse: 'bg-yellow-400',
  },
  Unknown: {
    bg: 'bg-slate-900/85 backdrop-blur-sm',
    border: 'border-white/20',
    text: 'text-white/80',
    pulse: 'bg-white/60',
  },
};

export default function WeatherAlertsBanner({ station, tick }: Props) {
  const { data: alerts } = useNwsAlerts(
    station?.latitude ?? null,
    station?.longitude ?? null,
    tick,
  );
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('weather-alerts-dismissed');
      if (!raw) return new Set();
      return new Set(JSON.parse(raw) as string[]);
    } catch {
      return new Set();
    }
  });

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try {
      localStorage.setItem('weather-alerts-dismissed', JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  };

  const active = (alerts ?? []).filter((a) => !dismissed.has(a.id));
  if (active.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {active.map((a) => {
        const style = SEVERITY_STYLE[a.properties.severity] ?? SEVERITY_STYLE.Unknown;
        const expires = a.properties.ends ?? a.properties.expires;
        return (
          <details
            key={a.id}
            className={`rounded-xl border p-3 ${style.bg} ${style.border} ${style.text}`}
          >
            <summary className="cursor-pointer list-none flex items-start gap-3">
              <span className="relative mt-1 flex h-2.5 w-2.5 flex-shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${style.pulse} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${style.pulse}`} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                  <span>{a.properties.event}</span>
                  <span className="text-[10px] font-normal uppercase tracking-wide opacity-75">
                    {a.properties.severity} · {a.properties.urgency}
                  </span>
                </div>
                <div className="text-xs opacity-85 mt-0.5">{a.properties.headline}</div>
                <div className="text-[10px] opacity-60 mt-1">
                  {a.properties.areaDesc}
                  {expires && ` · Until ${new Date(expires).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dismiss(a.id);
                }}
                className="text-xs opacity-60 hover:opacity-100 flex-shrink-0 px-1.5 py-0.5"
                aria-label="Dismiss alert"
              >
                ✕
              </button>
            </summary>
            <div className="mt-2 pt-2 border-t border-current/20 text-xs whitespace-pre-wrap opacity-90">
              {a.properties.description}
              {a.properties.instruction && (
                <div className="mt-2 pt-2 border-t border-current/20">
                  <strong>Instruction:</strong> {a.properties.instruction}
                </div>
              )}
              <div className="mt-2 text-[10px] opacity-60">{a.properties.senderName}</div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
