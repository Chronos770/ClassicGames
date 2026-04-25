import { useEffect, useMemo } from 'react';
import { getMoonPhase, moonIllumination, moonPhaseName } from '../../lib/astronomy';

// Inject moon CSS once. Same pattern as AnimatedWeatherIcon — also avoids
// the prefers-reduced-motion override so Brave / iOS-Low-Power-Mode still
// see the gentle glow / drift.
const MOON_STYLE_ID = 'wx-moon-styles';
const MOON_STYLES = `
@keyframes wx-moon-glow { 0%,100% { opacity: 0.45; } 50% { opacity: 0.85; } }
@keyframes wx-moon-bob  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes wx-moon-shimmer { 0%,100% { opacity: 0.10; } 50% { opacity: 0.22; } }
.wx-moon-disk  { animation: wx-moon-bob 6s ease-in-out infinite; transform-origin: center; }
.wx-moon-glow  { animation: wx-moon-glow 4s ease-in-out infinite; transform-origin: center; }
.wx-moon-craters { animation: wx-moon-shimmer 5s ease-in-out infinite; }
`;
let moonInjected = false;
function ensureMoonStyles() {
  if (moonInjected || typeof document === 'undefined') return;
  if (document.getElementById(MOON_STYLE_ID)) { moonInjected = true; return; }
  const el = document.createElement('style');
  el.id = MOON_STYLE_ID;
  el.textContent = MOON_STYLES;
  document.head.appendChild(el);
  moonInjected = true;
}

interface Props {
  now?: Date;
}

const SYNODIC_MONTH_DAYS = 29.53058867;

// Render the moon with a proper SVG terminator (ellipse boundary between lit
// and dark hemispheres) instead of just an emoji.
//
// Geometry: the terminator on the moon disk is a half-ellipse with
//   rx = R * |cos(2π * phase)|
//   ry = R
// For phases < 0.5 the lit side is on the right (waxing); for > 0.5 on the
// left (waning). For crescent phases (lit < half), the terminator bulges into
// the lit side; for gibbous (lit > half) it bulges into the dark side.
function moonShadowPath(phase: number, cx: number, cy: number, r: number): string {
  // Edge cases: full disk shadow (new moon) / no shadow (full moon)
  if (phase < 0.005 || phase > 0.995) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r}`;
  }
  if (Math.abs(phase - 0.5) < 0.005) return '';

  const isWaxing = phase < 0.5;
  const isCrescent = phase < 0.25 || phase > 0.75;
  const rx = r * Math.abs(Math.cos(2 * Math.PI * phase));

  // Outer arc: half-circle on the dark side of the moon disk.
  //   waxing → dark on left  → top→bot via left  → SVG sweep 0 (CCW)
  //   waning → dark on right → top→bot via right → SVG sweep 1 (CW)
  const outerSweep = isWaxing ? 0 : 1;
  // Terminator arc: bot→top across the middle, bulging into the right region
  // for waxing-crescent / waning-gibbous, or the left region for the inverse.
  const termSweep = (isWaxing && isCrescent) || (!isWaxing && !isCrescent) ? 1 : 0;

  return (
    `M ${cx} ${cy - r} ` +
    `A ${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r} ` +
    `A ${rx} ${r} 0 0 ${termSweep} ${cx} ${cy - r}`
  );
}

export default function MoonCard({ now }: Props) {
  useEffect(() => { ensureMoonStyles(); }, []);
  const data = useMemo(() => {
    const t = now ?? new Date();
    const phase = getMoonPhase(t);
    const illum = moonIllumination(phase);
    const name = moonPhaseName(phase);

    // Days until next new and full moon.
    const daysToNext = (target: number) => {
      const diff = (target - phase + 1) % 1;
      return diff * SYNODIC_MONTH_DAYS;
    };
    const nextNew = daysToNext(0);
    const nextFull = daysToNext(0.5);

    // Age: days since last new moon.
    const age = phase * SYNODIC_MONTH_DAYS;

    return { phase, illum, name, nextNew, nextFull, age };
  }, [now?.getTime()]);

  // SVG dimensions
  const size = 110;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;

  const shadow = moonShadowPath(data.phase, cx, cy, r);

  const fmtDays = (d: number) => {
    if (d < 1) {
      const hrs = Math.round(d * 24);
      return `${hrs}h`;
    }
    return `${d.toFixed(1)} days`;
  };

  return (
    <div className="bg-slate-900/70 backdrop-blur-sm rounded-xl border border-white/10 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="text-xs uppercase tracking-wide text-white/40 font-semibold">Moon</div>
        <div className="text-[10px] text-white/40">Day {data.age.toFixed(1)} of {SYNODIC_MONTH_DAYS.toFixed(1)}</div>
      </div>

      <div className="flex items-center gap-4">
        {/* Moon SVG */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
          <defs>
            <radialGradient id="moonLit" cx="0.4" cy="0.4">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="60%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#d4d4d8" />
            </radialGradient>
            <radialGradient id="moonShadow">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0a0a1a" />
            </radialGradient>
            <filter id="moonGlow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Soft pulsing aura */}
          <circle className="wx-moon-glow" cx={cx} cy={cy} r={r + 6} fill="rgba(254,243,199,0.18)" />

          {/* The moon itself, gently bobbing */}
          <g className="wx-moon-disk">
            <circle cx={cx} cy={cy} r={r} fill="url(#moonLit)" filter="url(#moonGlow)" />
            <g className="wx-moon-craters" fill="#71717a">
              <circle cx={cx - r * 0.25} cy={cy - r * 0.15} r={r * 0.12} />
              <circle cx={cx + r * 0.18} cy={cy + r * 0.22} r={r * 0.08} />
              <circle cx={cx - r * 0.05} cy={cy + r * 0.35} r={r * 0.06} />
              <circle cx={cx + r * 0.32} cy={cy - r * 0.28} r={r * 0.05} />
            </g>
            {shadow && (
              <path d={shadow} fill="url(#moonShadow)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
            )}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          </g>
        </svg>

        {/* Stats */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-sm text-white font-semibold">{data.name}</div>
          <div className="text-xs text-white/60">
            <span className="text-amber-300 font-mono">{Math.round(data.illum * 100)}%</span>{' '}
            <span className="text-white/40">illuminated</span>
          </div>
          <div className="pt-2 border-t border-white/5 space-y-0.5 text-[10px] text-white/50">
            <div className="flex items-center justify-between gap-2">
              <span>Next full</span>
              <span className="font-mono text-white/80">{fmtDays(data.nextFull)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Next new</span>
              <span className="font-mono text-white/80">{fmtDays(data.nextNew)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
