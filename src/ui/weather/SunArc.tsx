import { useMemo } from 'react';
import { getSunTimes } from '../../lib/astronomy';

interface Props {
  lat: number;
  lon: number;
  now?: Date;
}

// Arc showing the sun's trajectory from sunrise to sunset, with a marker at
// the current position. Moon phase is rendered separately in MoonCard.
export default function SunArc({ lat, lon, now }: Props) {
  const sun = useMemo(() => getSunTimes(now ?? new Date(), lat, lon), [lat, lon, now?.getTime()]);

  const width = 320;
  const height = 110;
  const cx = width / 2;
  const cy = 95;
  const r = 90;

  const polar = (frac: number) => {
    const angle = Math.PI - frac * Math.PI;
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  };

  const sunrise = sun.sunrise;
  const sunset = sun.sunset;
  let frac = sun.dayFraction;
  const isNight = !sun.isDay;
  if (frac === null) {
    const t = (now ?? new Date()).getTime();
    if (sunrise && t < sunrise.getTime()) frac = -0.02;
    else frac = 1.02;
  }

  const sunPos = polar(Math.max(-0.05, Math.min(1.05, frac)));
  const startP = polar(0);
  const endP = polar(1);

  const fmt = (d: Date | null) => (d ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '--');

  // Daylight remaining (or until sunrise)
  const remaining = (() => {
    const t = (now ?? new Date()).getTime();
    if (sun.isDay && sunset) {
      const ms = sunset.getTime() - t;
      const h = Math.floor(ms / 3600_000);
      const m = Math.floor((ms % 3600_000) / 60_000);
      return `${h}h ${m}m of daylight left`;
    }
    if (!sun.isDay && sunrise) {
      const target = t < sunrise.getTime() ? sunrise.getTime() : sunrise.getTime() + 86400_000;
      const ms = target - t;
      const h = Math.floor(ms / 3600_000);
      const m = Math.floor((ms % 3600_000) / 60_000);
      return `Sunrise in ${h}h ${m}m`;
    }
    return null;
  })();

  return (
    <div className="bg-slate-900/70 backdrop-blur-sm rounded-xl border border-white/10 p-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div className="text-xs uppercase tracking-wide text-white/40 font-semibold">
          {isNight ? 'Tomorrow’s Sun' : 'Sun Path'}
        </div>
        {remaining && <div className="text-[10px] text-white/40">{remaining}</div>}
      </div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-w-[320px] mx-auto block">
        <defs>
          <linearGradient id="sunArc" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(251,191,36,0.05)" />
            <stop offset="50%" stopColor="rgba(251,191,36,0.4)" />
            <stop offset="100%" stopColor="rgba(244,114,182,0.1)" />
          </linearGradient>
          <radialGradient id="sunBody">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="60%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
        </defs>
        <line x1={8} x2={width - 8} y1={cy} y2={cy} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
        <path
          d={`M ${startP.x.toFixed(1)} ${startP.y.toFixed(1)} A ${r} ${r} 0 0 1 ${endP.x.toFixed(1)} ${endP.y.toFixed(1)}`}
          fill="none"
          stroke="url(#sunArc)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx={startP.x} cy={startP.y} r={3} fill="rgba(255,255,255,0.3)" />
        <circle cx={endP.x} cy={endP.y} r={3} fill="rgba(255,255,255,0.3)" />
        {!isNight && (
          <>
            <circle cx={sunPos.x} cy={sunPos.y} r={12} fill="url(#sunBody)" opacity={0.25} />
            <circle cx={sunPos.x} cy={sunPos.y} r={6} fill="url(#sunBody)" />
          </>
        )}
        <text x={startP.x} y={cy + 12} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.5)">
          {fmt(sunrise)}
        </text>
        <text x={endP.x} y={cy + 12} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.5)">
          {fmt(sunset)}
        </text>
        <text x={startP.x} y={cy + 22} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.3)">
          Sunrise
        </text>
        <text x={endP.x} y={cy + 22} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.3)">
          Sunset
        </text>
      </svg>
    </div>
  );
}
