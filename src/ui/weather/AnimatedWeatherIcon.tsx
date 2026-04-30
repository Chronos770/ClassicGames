import { useEffect } from 'react';
import type { ConditionKey } from '../../lib/weatherCondition';

interface Props {
  conditionKey: ConditionKey;
  isDay: boolean;
  size?: number;
}

const STYLE_ID = 'wx-animated-icon-styles';
let injected = false;
function ensureStyles() {
  if (injected || typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) {
    injected = true;
    return;
  }
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = styles;
  document.head.appendChild(el);
  injected = true;
}

// Crisp SVG weather icon animated with CSS. Used next to the hero temperature
// and throughout the forecast. Styles are injected once on the document.
export default function AnimatedWeatherIcon({ conditionKey, isDay, size = 96 }: Props) {
  useEffect(() => {
    ensureStyles();
  }, []);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden
      className="wx-icon flex-shrink-0"
    >
      {renderIcon(conditionKey, isDay)}
    </svg>
  );
}

function renderIcon(key: ConditionKey, isDay: boolean) {
  switch (key) {
    case 'sunny':
    case 'hot':
      return <Sun big />;
    case 'clear':
      return isDay ? <Sun /> : <Moon />;
    case 'partlyCloudy':
      return isDay ? <SunCloud /> : <MoonCloud />;
    case 'cloudy':
      return <Clouds />;
    case 'rain':
      return <RainCloud drops={3} />;
    case 'heavyRain':
      return <RainCloud drops={5} heavy />;
    case 'drizzle':
      return <RainCloud drops={2} light />;
    case 'thunderstorm':
      return <ThunderCloud />;
    case 'snow':
      return <SnowCloud />;
    case 'fog':
      return <Fog />;
    case 'windy':
      return <Wind />;
    case 'cold':
      return <Snowflake />;
    case 'unknown':
    default:
      return isDay ? <Sun /> : <Moon />;
  }
}

function Sun({ big = false }: { big?: boolean }) {
  const r = big ? 18 : 16;
  return (
    <g className="wx-sun-grp">
      <g className="wx-sun-rays">
        {Array.from({ length: 8 }, (_, i) => (
          <rect
            key={i}
            x={49}
            y={big ? 8 : 12}
            width={2}
            height={big ? 10 : 8}
            rx={1}
            fill="#fbbf24"
            transform={`rotate(${i * 45} 50 50)`}
          />
        ))}
      </g>
      <circle cx={50} cy={50} r={r} fill="url(#wxSunGrad)" className="wx-sun-body" />
      <defs>
        <radialGradient id="wxSunGrad">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="70%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
      </defs>
    </g>
  );
}

function Moon() {
  return (
    <g>
      {/* Soft halo behind everything that pulses noticeably */}
      <circle
        cx={54}
        cy={48}
        r={28}
        fill="url(#wxMoonHalo)"
        className="wx-moon-halo"
      />
      {/* Crescent (light disk + dark mask wrapped together so they pulse as a unit) */}
      <g className="wx-moon-body">
        <circle cx={54} cy={48} r={20} fill="#f1f5f9" />
        <circle cx={62} cy={43} r={18} fill="#0b0b0d" />
      </g>
      {/* Twinkling stars */}
      <g className="wx-stars">
        <circle cx={20} cy={26} r={1.8} fill="#e2e8f0" className="wx-star-a" />
        <circle cx={82} cy={20} r={1.5} fill="#e2e8f0" className="wx-star-b" />
        <circle cx={28} cy={74} r={1.6} fill="#e2e8f0" className="wx-star-c" />
        <circle cx={16} cy={56} r={1.2} fill="#e2e8f0" className="wx-star-a" />
        <circle cx={86} cy={62} r={1.3} fill="#e2e8f0" className="wx-star-c" />
      </g>
      <defs>
        <radialGradient id="wxMoonHalo">
          <stop offset="0%" stopColor="rgba(241, 245, 249, 0.55)" />
          <stop offset="55%" stopColor="rgba(241, 245, 249, 0.15)" />
          <stop offset="100%" stopColor="rgba(241, 245, 249, 0)" />
        </radialGradient>
      </defs>
    </g>
  );
}

function Cloud({ x = 50, y = 58, scale = 1, color = '#e2e8f0', className = '' }: { x?: number; y?: number; scale?: number; color?: string; className?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className={className}>
      <ellipse cx={0} cy={0} rx={22} ry={10} fill={color} />
      <ellipse cx={-14} cy={3} rx={14} ry={9} fill={color} />
      <ellipse cx={14} cy={3} rx={16} ry={9} fill={color} />
      <ellipse cx={-4} cy={-8} rx={12} ry={8} fill={color} />
      <ellipse cx={8} cy={-7} rx={10} ry={7} fill={color} />
    </g>
  );
}

function SunCloud() {
  return (
    <g>
      <g transform="translate(-14 -12)">
        <Sun />
      </g>
      <Cloud x={58} y={65} scale={1} />
    </g>
  );
}

function MoonCloud() {
  return (
    <g>
      <g transform="translate(-14 -12) scale(0.8) translate(20 20)">
        <Moon />
      </g>
      <Cloud x={58} y={65} scale={1} color="#cbd5e1" />
    </g>
  );
}

function Clouds() {
  // Pushed both clouds toward the vertical center of the viewBox so the
  // rendered icon doesn't have a tall empty band above it. Previously
  // the upper cloud sat at y=40, which on the 96px hero icon let the
  // top edge ride up into the "CLOUDY" label's row.
  return (
    <g>
      <Cloud x={32} y={56} scale={0.65} color="#94a3b8" className="wx-cloud-slow" />
      <Cloud x={62} y={62} scale={0.95} color="#e2e8f0" className="wx-cloud-fast" />
    </g>
  );
}

function RainCloud({ drops = 3, heavy = false, light = false }: { drops?: number; heavy?: boolean; light?: boolean }) {
  const color = heavy ? '#64748b' : '#cbd5e1';
  const dropColor = light ? 'rgba(147,197,253,0.7)' : '#60a5fa';
  const positions = Array.from({ length: drops }, (_, i) => 30 + i * (40 / Math.max(1, drops - 1)));
  return (
    <g>
      <Cloud x={50} y={40} scale={1.1} color={color} />
      <g className="wx-rain">
        {positions.map((x, i) => (
          <line
            key={i}
            x1={x}
            x2={x - 4}
            y1={60}
            y2={72}
            stroke={dropColor}
            strokeWidth={heavy ? 2.2 : 1.6}
            strokeLinecap="round"
            className={`wx-drop wx-drop-${i % 3}`}
          />
        ))}
      </g>
    </g>
  );
}

function ThunderCloud() {
  return (
    <g>
      <Cloud x={50} y={38} scale={1.15} color="#475569" />
      <g className="wx-rain">
        {[34, 46, 58, 70].map((x, i) => (
          <line
            key={i}
            x1={x}
            x2={x - 4}
            y1={58}
            y2={70}
            stroke="#60a5fa"
            strokeWidth={1.6}
            strokeLinecap="round"
            className={`wx-drop wx-drop-${i % 3}`}
          />
        ))}
      </g>
      <polygon
        points="48,52 54,52 50,64 58,64 42,84 48,70 42,70"
        fill="#fbbf24"
        stroke="#f59e0b"
        strokeWidth="0.5"
        className="wx-bolt"
      />
    </g>
  );
}

function SnowCloud() {
  return (
    <g>
      <Cloud x={50} y={40} scale={1.1} color="#e2e8f0" />
      <g className="wx-snow">
        {[30, 42, 54, 66].map((x, i) => (
          <g key={i} className={`wx-flake wx-flake-${i % 3}`}>
            <circle cx={x} cy={62 + (i % 2) * 4} r={1.8} fill="#f8fafc" />
          </g>
        ))}
      </g>
    </g>
  );
}

function Fog() {
  return (
    <g>
      <Cloud x={50} y={35} scale={0.9} color="#94a3b8" />
      <g className="wx-fog">
        <line x1={18} x2={82} y1={55} y2={55} stroke="#cbd5e1" strokeWidth={3} strokeLinecap="round" className="wx-fog-a" />
        <line x1={12} x2={76} y1={65} y2={65} stroke="#94a3b8" strokeWidth={3} strokeLinecap="round" className="wx-fog-b" />
        <line x1={22} x2={88} y1={75} y2={75} stroke="#cbd5e1" strokeWidth={3} strokeLinecap="round" className="wx-fog-c" />
      </g>
    </g>
  );
}

function Wind() {
  return (
    <g className="wx-wind">
      <path
        d="M 10 32 Q 45 28 60 32 Q 75 38 70 48"
        fill="none"
        stroke="#94a3b8"
        strokeWidth={3}
        strokeLinecap="round"
        className="wx-wind-a"
      />
      <path
        d="M 15 55 Q 55 50 80 60"
        fill="none"
        stroke="#cbd5e1"
        strokeWidth={3}
        strokeLinecap="round"
        className="wx-wind-b"
      />
      <path
        d="M 10 76 Q 40 72 65 78"
        fill="none"
        stroke="#94a3b8"
        strokeWidth={3}
        strokeLinecap="round"
        className="wx-wind-c"
      />
    </g>
  );
}

function Snowflake() {
  return (
    <g className="wx-flake-spin">
      {Array.from({ length: 6 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 60} 50 50)`}>
          <line x1={50} y1={22} x2={50} y2={78} stroke="#bae6fd" strokeWidth={2.5} strokeLinecap="round" />
          <line x1={46} y1={30} x2={50} y2={36} stroke="#bae6fd" strokeWidth={2} strokeLinecap="round" />
          <line x1={54} y1={30} x2={50} y2={36} stroke="#bae6fd" strokeWidth={2} strokeLinecap="round" />
        </g>
      ))}
      <circle cx={50} cy={50} r={3} fill="#e0f2fe" />
    </g>
  );
}

const styles = `
.wx-icon { overflow: visible; }
@keyframes wx-rotate { to { transform: rotate(360deg); } }
@keyframes wx-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
@keyframes wx-drift-x { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(4px); } }
@keyframes wx-drop { 0% { transform: translateY(-6px); opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { transform: translateY(10px); opacity: 0; } }
@keyframes wx-flake-fall { 0% { transform: translateY(-4px) rotate(0deg); opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { transform: translateY(14px) rotate(90deg); opacity: 0; } }
@keyframes wx-twinkle { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
@keyframes wx-bolt-flash { 0%, 90%, 100% { opacity: 0; } 93% { opacity: 1; } 96% { opacity: 0.2; } 98% { opacity: 1; } }
@keyframes wx-fog-drift { 0%, 100% { transform: translateX(0); opacity: 0.75; } 50% { transform: translateX(6px); opacity: 1; } }
@keyframes wx-wind-sweep { 0% { stroke-dasharray: 0 120; opacity: 0; } 30% { opacity: 1; } 80% { opacity: 1; } 100% { stroke-dasharray: 120 0; opacity: 0; } }
@keyframes wx-spin { to { transform: rotate(360deg); } }

.wx-sun-rays { transform-origin: 50px 50px; animation: wx-rotate 20s linear infinite; }
.wx-sun-body { transform-origin: 50px 50px; animation: wx-pulse 3s ease-in-out infinite; }

.wx-moon-halo { transform-origin: 54px 48px; animation: wx-halo-pulse 2.4s ease-in-out infinite; }
.wx-moon-body { transform-origin: 54px 48px; animation: wx-pulse 4s ease-in-out infinite; }
@keyframes wx-halo-pulse { 0%, 100% { transform: scale(0.8); opacity: 0.4; } 50% { transform: scale(1.2); opacity: 1; } }

.wx-star-a { animation: wx-twinkle 2.4s ease-in-out infinite; }
.wx-star-b { animation: wx-twinkle 3.1s ease-in-out 0.6s infinite; }
.wx-star-c { animation: wx-twinkle 2.8s ease-in-out 1.2s infinite; }

.wx-cloud-slow { animation: wx-drift-x 6s ease-in-out infinite; }
.wx-cloud-fast { animation: wx-drift-x 4s ease-in-out 0.5s infinite; }

.wx-drop { transform-origin: center; animation: wx-drop 1.1s ease-in infinite; }
.wx-drop-0 { animation-delay: 0s; }
.wx-drop-1 { animation-delay: 0.35s; }
.wx-drop-2 { animation-delay: 0.7s; }

.wx-flake { transform-origin: center; animation: wx-flake-fall 2.4s ease-in infinite; }
.wx-flake-0 { animation-delay: 0s; }
.wx-flake-1 { animation-delay: 0.6s; }
.wx-flake-2 { animation-delay: 1.2s; }

.wx-bolt { animation: wx-bolt-flash 3s ease-in-out infinite; }

.wx-fog-a { animation: wx-fog-drift 4s ease-in-out infinite; }
.wx-fog-b { animation: wx-fog-drift 5s ease-in-out 0.6s infinite; }
.wx-fog-c { animation: wx-fog-drift 4.6s ease-in-out 1.1s infinite; }

.wx-wind-a { stroke-dasharray: 0 120; animation: wx-wind-sweep 2.8s ease-in-out infinite; }
.wx-wind-b { stroke-dasharray: 0 120; animation: wx-wind-sweep 2.4s ease-in-out 0.4s infinite; }
.wx-wind-c { stroke-dasharray: 0 120; animation: wx-wind-sweep 3.2s ease-in-out 0.9s infinite; }

.wx-flake-spin { transform-origin: 50px 50px; animation: wx-spin 12s linear infinite; }

/*
 * Intentionally NO prefers-reduced-motion override here. Brave (and Safari in
 * Low Power Mode) report 'reduce' by default on mobile to deter fingerprinting
 * / save battery, which previously killed every icon animation on those
 * browsers. The icons are tiny + decorative; if you're motion-sensitive,
 * iOS/Android system "reduce motion" will still slow whole-app transitions.
 */
`;
