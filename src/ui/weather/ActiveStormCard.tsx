import type { WeatherReading } from '../../lib/weatherService';
import { useUnitFormatters } from '../../lib/weatherUnits';

interface Props {
  reading: WeatherReading;
}

function durationLabel(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m === 0 ? `${h} hr` : `${h}h ${m}m`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh === 0 ? `${d}d` : `${d}d ${rh}h`;
}

export default function ActiveStormCard({ reading }: Props) {
  const { fmtPrecip, fmtPrecipRate } = useUnitFormatters();
  const current = reading.rain_storm_current_in;
  const startIso = reading.rain_storm_current_start_at;
  if (!current || current <= 0 || !startIso) return null;

  const start = new Date(startIso);
  const now = new Date(reading.observed_at);
  const duration = now.getTime() - start.getTime();
  const hours = Math.max(duration / 3600000, 1 / 60);
  const avgRate = current / hours;

  return (
    <div className="bg-gradient-to-br from-blue-600/20 via-indigo-500/10 to-transparent rounded-xl border border-blue-400/20 p-4 sm:p-5 mb-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-blue-200/80 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400/60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-300" />
            </span>
            Active Storm
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display font-bold text-white tabular-nums">
              {fmtPrecip(current)}
            </span>
            <span className="text-sm text-white/60">accumulated</span>
          </div>
          <div className="text-xs text-white/50 mt-1">
            Started {start.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </div>
        </div>
        <div className="text-xs text-white/70 space-y-1 text-right">
          <div>
            <span className="text-white/40">Duration:</span> <span className="font-mono">{durationLabel(duration)}</span>
          </div>
          <div>
            <span className="text-white/40">Avg Rate:</span> <span className="font-mono">{fmtPrecipRate(avgRate)}</span>
          </div>
          <div>
            <span className="text-white/40">Current:</span> <span className="font-mono">{fmtPrecipRate(reading.rain_rate_last_in)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
