import { useMemo } from 'react';
import {
  getMoonPhase,
  getSunTimes,
  moonIllumination,
  moonPhaseEmoji,
  moonPhaseName,
} from '../../lib/astronomy';

interface Props {
  lat: number;
  lon: number;
  now?: Date;
}

// Arc showing sun's trajectory from sunrise to sunset, with a marker at the
// current position. Also displays moon phase info.
export default function SunArc({ lat, lon, now }: Props) {
  const data = useMemo(() => {
    const t = now ?? new Date();
    const sun = getSunTimes(t, lat, lon);
    const phase = getMoonPhase(t);
    const illum = moonIllumination(phase);
    return { sun, phase, illum };
  }, [lat, lon, now?.getTime()]);

  const width = 320;
  const height = 110;
  const cx = width / 2;
  const cy = 95;
  const r = 90;

  // Arc from sunrise (left) over the top to sunset (right). Points are computed
  // along a half-circle.
  const polar = (frac: number) => {
    const angle = Math.PI - frac * Math.PI; // pi at left (rise), 0 at right (set)
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  };

  const sunrise = data.sun.sunrise;
  const sunset = data.sun.sunset;
  let frac = data.sun.dayFraction;
  const isNight = !data.sun.isDay;
  if (frac === null) {
    // Before sunrise or after sunset — park sun just below horizon on the
    // correct side for visual cue.
    const t = (now ?? new Date()).getTime();
    if (sunrise && t < sunrise.getTime()) frac = -0.02;
    else frac = 1.02;
  }

  const sunPos = polar(Math.max(-0.05, Math.min(1.05, frac)));
  const startP = polar(0);
  const endP = polar(1);

  const fmt = (d: Date | null) => (d ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '--');

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">
            {isNight ? 'Tomorrow’s Sun' : 'Sun Path'}
          </div>
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-w-[320px]">
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
            {/* Horizon */}
            <line x1={8} x2={width - 8} y1={cy} y2={cy} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
            {/* Arc */}
            <path
              d={`M ${startP.x.toFixed(1)} ${startP.y.toFixed(1)} A ${r} ${r} 0 0 1 ${endP.x.toFixed(1)} ${endP.y.toFixed(1)}`}
              fill="none"
              stroke="url(#sunArc)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Rise / set dots */}
            <circle cx={startP.x} cy={startP.y} r={3} fill="rgba(255,255,255,0.3)" />
            <circle cx={endP.x} cy={endP.y} r={3} fill="rgba(255,255,255,0.3)" />
            {/* Sun marker */}
            {!isNight && (
              <>
                <circle cx={sunPos.x} cy={sunPos.y} r={12} fill="url(#sunBody)" opacity={0.25} />
                <circle cx={sunPos.x} cy={sunPos.y} r={6} fill="url(#sunBody)" />
              </>
            )}
            {isNight && (
              <text x={cx} y={cy - 40} textAnchor="middle" fontSize="28">
                {moonPhaseEmoji(data.phase)}
              </text>
            )}
            {/* Labels */}
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
        <div className="flex flex-col items-center text-center min-w-[100px]">
          <div className="text-xs uppercase tracking-wide text-white/40 mb-2 font-semibold">Moon</div>
          <div className="text-4xl mb-1">{moonPhaseEmoji(data.phase)}</div>
          <div className="text-xs text-white/70 font-medium">{moonPhaseName(data.phase)}</div>
          <div className="text-[10px] text-white/40 mt-0.5">{Math.round(data.illum * 100)}% illuminated</div>
        </div>
      </div>
    </div>
  );
}
