import { useEffect } from 'react';
import type { ConditionKey } from '../../lib/weatherCondition';

/**
 * Wide illustrated weather scene shown above the dashboard hero. SVG
 * elements arranged across an 800x160 viewBox; the sky gradient + the
 * cast of clouds / sun / moon / rain / snow / fog / lightning / wind
 * streaks all swap based on the current ConditionKey + day/night flag.
 *
 * Designed to read at-a-glance from across the room — bigger and more
 * dramatic than the small AnimatedWeatherIcon next to the temperature.
 * Animations are all CSS keyframes; nothing here uses requestAnimationFrame
 * or canvas, so it's cheap to leave running.
 */
interface Props {
  conditionKey: ConditionKey;
  isDay?: boolean;
  tempF?: number | null;
  /**
   * When true, the component renders just the SVG without the card
   * wrapper (border / rounded corners / shadow). Parent owns the chrome.
   * Used when the scene is embedded inside an existing card (e.g. the
   * hero banner) so the corners line up.
   */
  embedded?: boolean;
}

const STYLE_ID = 'weather-scene-styles';
let injected = false;
function ensureStyles() {
  if (injected || typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) {
    injected = true;
    return;
  }
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = STYLES;
  document.head.appendChild(el);
  injected = true;
}

interface Palette {
  skyTop: string;
  skyBottom: string;
  groundTop: string;
  groundBottom: string;
}

function paletteFor(conditionKey: ConditionKey, isDay: boolean): Palette {
  if (!isDay) {
    return {
      skyTop: '#0b1635',
      skyBottom: '#1e293b',
      groundTop: '#0f172a',
      groundBottom: '#020617',
    };
  }
  switch (conditionKey) {
    case 'sunny':
    case 'hot':
      return { skyTop: '#0284c7', skyBottom: '#7dd3fc', groundTop: '#16a34a', groundBottom: '#15803d' };
    case 'clear':
      return { skyTop: '#0ea5e9', skyBottom: '#bae6fd', groundTop: '#22c55e', groundBottom: '#15803d' };
    case 'partlyCloudy':
      return { skyTop: '#0ea5e9', skyBottom: '#cbd5e1', groundTop: '#22c55e', groundBottom: '#166534' };
    case 'cloudy':
      return { skyTop: '#64748b', skyBottom: '#cbd5e1', groundTop: '#365314', groundBottom: '#1a2e05' };
    case 'rain':
    case 'drizzle':
      return { skyTop: '#475569', skyBottom: '#94a3b8', groundTop: '#365314', groundBottom: '#1a2e05' };
    case 'heavyRain':
    case 'thunderstorm':
      return { skyTop: '#1e293b', skyBottom: '#475569', groundTop: '#1a2e05', groundBottom: '#052e16' };
    case 'snow':
    case 'cold':
      return { skyTop: '#64748b', skyBottom: '#e2e8f0', groundTop: '#f1f5f9', groundBottom: '#cbd5e1' };
    case 'fog':
      return { skyTop: '#94a3b8', skyBottom: '#e2e8f0', groundTop: '#475569', groundBottom: '#334155' };
    case 'windy':
      return { skyTop: '#0ea5e9', skyBottom: '#cbd5e1', groundTop: '#16a34a', groundBottom: '#166534' };
    default:
      return { skyTop: '#0ea5e9', skyBottom: '#bae6fd', groundTop: '#22c55e', groundBottom: '#15803d' };
  }
}

export default function WeatherScene({ conditionKey, isDay = true, tempF, embedded = false }: Props) {
  useEffect(() => {
    ensureStyles();
  }, []);

  const palette = paletteFor(conditionKey, isDay);
  const isPrecip =
    conditionKey === 'rain' ||
    conditionKey === 'heavyRain' ||
    conditionKey === 'drizzle' ||
    conditionKey === 'thunderstorm';
  const isSnow = conditionKey === 'snow' || (conditionKey === 'cold' && (tempF ?? 99) <= 32);

  const wrapperClass = embedded
    ? 'weather-scene-wrap'
    : 'weather-scene-wrap mb-4 rounded-2xl border border-white/10 overflow-hidden shadow-lg';
  const height = embedded ? 130 : 160;

  return (
    <div className={wrapperClass}>
      <svg
        viewBox="0 0 800 160"
        preserveAspectRatio="xMidYMid slice"
        className="w-full block"
        style={{ height }}
        aria-hidden
      >
        <defs>
          <linearGradient id="wsSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.skyTop} />
            <stop offset="100%" stopColor={palette.skyBottom} />
          </linearGradient>
          <linearGradient id="wsGround" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.groundTop} />
            <stop offset="100%" stopColor={palette.groundBottom} />
          </linearGradient>
          <radialGradient id="wsSun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="55%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
          <radialGradient id="wsSunCorona" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="wsMoon" cx="0.4" cy="0.4" r="0.6">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </radialGradient>
          <linearGradient id="wsCloud" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="wsCloudDark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="wsCloudStorm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="800" height="160" fill="url(#wsSky)" />

        {/* Stars — night only */}
        {!isDay && <Stars />}

        {/* Sun or moon */}
        {isDay && (conditionKey === 'sunny' || conditionKey === 'hot' || conditionKey === 'clear') && (
          <SunBig x={640} y={50} />
        )}
        {isDay && conditionKey === 'partlyCloudy' && <SunBig x={170} y={48} />}
        {isDay && conditionKey === 'fog' && <SunFaint x={400} y={60} />}
        {!isDay && (conditionKey === 'clear' || conditionKey === 'sunny' || conditionKey === 'partlyCloudy') && (
          <Moon x={640} y={50} />
        )}

        {/* Clouds */}
        {conditionKey === 'partlyCloudy' && (
          <>
            <SceneCloud x={350} y={50} scale={1.0} color="url(#wsCloud)" className="ws-cloud-fast" />
            <SceneCloud x={560} y={80} scale={0.8} color="url(#wsCloud)" className="ws-cloud-slow" />
          </>
        )}
        {conditionKey === 'cloudy' && (
          <>
            <SceneCloud x={120} y={60} scale={1.1} color="url(#wsCloud)" className="ws-cloud-slow" />
            <SceneCloud x={360} y={45} scale={1.3} color="url(#wsCloud)" className="ws-cloud-fast" />
            <SceneCloud x={620} y={70} scale={1.0} color="url(#wsCloud)" className="ws-cloud-slow" />
          </>
        )}
        {(conditionKey === 'rain' || conditionKey === 'drizzle') && (
          <>
            <SceneCloud x={150} y={55} scale={1.1} color="url(#wsCloudDark)" className="ws-cloud-slow" />
            <SceneCloud x={400} y={45} scale={1.4} color="url(#wsCloudDark)" className="ws-cloud-fast" />
            <SceneCloud x={650} y={62} scale={1.0} color="url(#wsCloudDark)" className="ws-cloud-slow" />
          </>
        )}
        {(conditionKey === 'heavyRain' || conditionKey === 'thunderstorm') && (
          <>
            <SceneCloud x={140} y={50} scale={1.2} color="url(#wsCloudStorm)" className="ws-cloud-slow" />
            <SceneCloud x={390} y={40} scale={1.5} color="url(#wsCloudStorm)" className="ws-cloud-fast" />
            <SceneCloud x={650} y={58} scale={1.1} color="url(#wsCloudStorm)" className="ws-cloud-slow" />
          </>
        )}
        {(conditionKey === 'snow' || conditionKey === 'cold') && (
          <>
            <SceneCloud x={180} y={55} scale={1.0} color="url(#wsCloud)" className="ws-cloud-slow" />
            <SceneCloud x={420} y={42} scale={1.2} color="url(#wsCloud)" className="ws-cloud-fast" />
            <SceneCloud x={650} y={62} scale={0.95} color="url(#wsCloud)" className="ws-cloud-slow" />
          </>
        )}
        {conditionKey === 'windy' && (
          <>
            <SceneCloud x={150} y={50} scale={0.9} color="url(#wsCloud)" className="ws-cloud-windy" />
            <SceneCloud x={420} y={62} scale={1.0} color="url(#wsCloud)" className="ws-cloud-windy2" />
            <SceneCloud x={680} y={45} scale={0.85} color="url(#wsCloud)" className="ws-cloud-windy" />
          </>
        )}

        {/* Rain */}
        {isPrecip && !isSnow && <Rain heavy={conditionKey === 'heavyRain' || conditionKey === 'thunderstorm'} drizzle={conditionKey === 'drizzle'} />}

        {/* Lightning bolt (thunder only) */}
        {conditionKey === 'thunderstorm' && (
          <g className="ws-bolt">
            <path
              d="M 405 50 L 380 95 L 405 95 L 388 135 L 430 80 L 405 80 L 420 50 Z"
              fill="#fde047"
              stroke="#a16207"
              strokeWidth="1.2"
            />
          </g>
        )}

        {/* Snow */}
        {isSnow && <Snow />}

        {/* Fog */}
        {conditionKey === 'fog' && <Fog />}

        {/* Wind streaks */}
        {conditionKey === 'windy' && <WindStreaks />}

        {/* Ground / horizon */}
        <Ground palette={palette} snowy={isSnow} />
      </svg>
    </div>
  );
}

// ── Building blocks ────────────────────────────────────────────────────

function Stars() {
  const positions = [
    [40, 30, 1.2], [85, 60, 0.9], [130, 22, 1.4], [200, 70, 0.7], [255, 35, 1.0],
    [310, 80, 1.3], [380, 25, 0.8], [440, 55, 1.1], [510, 30, 1.4], [570, 70, 0.9],
    [620, 40, 1.0], [700, 20, 1.2], [750, 60, 0.9],
  ];
  return (
    <g>
      {positions.map(([x, y, r], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={r}
          fill="#f8fafc"
          opacity={0.85}
          className="ws-star"
          style={{ animationDelay: `${(i * 0.27) % 3}s` }}
        />
      ))}
    </g>
  );
}

function SunBig({ x, y }: { x: number; y: number }) {
  return (
    <g className="ws-sun">
      <circle cx={x} cy={y} r="60" fill="url(#wsSunCorona)" />
      <circle cx={x} cy={y} r="32" fill="url(#wsSun)" />
      <g className="ws-sun-rays" style={{ transformOrigin: `${x}px ${y}px` }}>
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i * Math.PI * 2) / 12;
          const r1 = 40;
          const r2 = 50;
          const cx1 = x + Math.cos(angle) * r1;
          const cy1 = y + Math.sin(angle) * r1;
          const cx2 = x + Math.cos(angle) * r2;
          const cy2 = y + Math.sin(angle) * r2;
          return (
            <line
              key={i}
              x1={cx1}
              y1={cy1}
              x2={cx2}
              y2={cy2}
              stroke="#fde68a"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          );
        })}
      </g>
    </g>
  );
}

function SunFaint({ x, y }: { x: number; y: number }) {
  return (
    <g opacity="0.55">
      <circle cx={x} cy={y} r="80" fill="url(#wsSunCorona)" opacity="0.5" />
      <circle cx={x} cy={y} r="30" fill="#fef3c7" />
    </g>
  );
}

function Moon({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Soft halo */}
      <circle cx={x} cy={y} r="42" fill="#e2e8f0" opacity="0.15" />
      <circle cx={x} cy={y} r="28" fill="url(#wsMoon)" />
      {/* Crater detail */}
      <circle cx={x - 8} cy={y - 4} r="5" fill="#94a3b8" opacity="0.4" />
      <circle cx={x + 7} cy={y + 5} r="3" fill="#94a3b8" opacity="0.35" />
      <circle cx={x + 3} cy={y - 9} r="2" fill="#94a3b8" opacity="0.3" />
    </g>
  );
}

function SceneCloud({
  x,
  y,
  scale,
  color,
  className,
}: {
  x: number;
  y: number;
  scale: number;
  color: string;
  className?: string;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      className={className}
    >
      <ellipse cx="-30" cy="6" rx="28" ry="14" fill={color} />
      <ellipse cx="30" cy="6" rx="32" ry="14" fill={color} />
      <ellipse cx="-8" cy="-8" rx="22" ry="18" fill={color} />
      <ellipse cx="16" cy="-12" rx="24" ry="18" fill={color} />
      <ellipse cx="0" cy="4" rx="40" ry="14" fill={color} />
    </g>
  );
}

function Rain({ heavy, drizzle }: { heavy?: boolean; drizzle?: boolean }) {
  const density = heavy ? 70 : drizzle ? 24 : 42;
  const drops = Array.from({ length: density }, (_, i) => {
    // Deterministic-ish placement to avoid SSR mismatch + so layout
    // looks even, not clumpy.
    const x = ((i * 73) % 800);
    const len = heavy ? 12 + ((i * 5) % 6) : drizzle ? 5 : 8 + ((i * 3) % 4);
    const delay = ((i * 0.07) % 1).toFixed(2);
    const dur = heavy ? 0.55 : drizzle ? 1.1 : 0.8;
    return { x, len, delay, dur, i };
  });
  return (
    <g className="ws-rain-grp">
      {drops.map(({ x, len, delay, dur, i }) => (
        <line
          key={i}
          x1={x}
          y1={-20}
          x2={x - 6}
          y2={-20 + len}
          stroke={drizzle ? '#93c5fd' : '#60a5fa'}
          strokeWidth={heavy ? 2 : 1.4}
          strokeLinecap="round"
          className="ws-drop"
          style={{ animationDelay: `${delay}s`, animationDuration: `${dur}s` }}
          opacity={drizzle ? 0.6 : 0.85}
        />
      ))}
    </g>
  );
}

function Snow() {
  const flakes = Array.from({ length: 38 }, (_, i) => {
    const x = (i * 41) % 800;
    const r = 1.4 + ((i * 7) % 3);
    const delay = ((i * 0.13) % 3).toFixed(2);
    const dur = 5 + ((i * 1.3) % 3);
    return { x, r, delay, dur, i };
  });
  return (
    <g>
      {flakes.map(({ x, r, delay, dur, i }) => (
        <circle
          key={i}
          cx={x}
          cy={-10}
          r={r}
          fill="#f8fafc"
          opacity="0.9"
          className="ws-flake"
          style={{ animationDelay: `${delay}s`, animationDuration: `${dur}s` }}
        />
      ))}
    </g>
  );
}

function Fog() {
  return (
    <g>
      <ellipse cx="180" cy="100" rx="160" ry="14" fill="#f1f5f9" opacity="0.4" className="ws-fog-1" />
      <ellipse cx="500" cy="85" rx="200" ry="12" fill="#f1f5f9" opacity="0.35" className="ws-fog-2" />
      <ellipse cx="640" cy="115" rx="180" ry="16" fill="#f1f5f9" opacity="0.45" className="ws-fog-1" />
    </g>
  );
}

function WindStreaks() {
  const streaks = [
    { y: 40, len: 220, x: 20, delay: 0, dur: 2.2 },
    { y: 75, len: 280, x: 60, delay: 0.4, dur: 2.6 },
    { y: 105, len: 200, x: 0, delay: 0.9, dur: 2.0 },
    { y: 130, len: 240, x: 100, delay: 1.4, dur: 2.4 },
  ];
  return (
    <g>
      {streaks.map((s, i) => (
        <path
          key={i}
          d={`M ${s.x} ${s.y} Q ${s.x + s.len / 2} ${s.y - 6}, ${s.x + s.len} ${s.y}`}
          stroke="#e2e8f0"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          opacity="0.7"
          className="ws-streak"
          style={{ animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }}
        />
      ))}
    </g>
  );
}

function Ground({ palette, snowy }: { palette: Palette; snowy: boolean }) {
  return (
    <g>
      {/* Distant hill silhouette behind */}
      <path
        d="M 0 130 Q 120 95 240 120 T 480 115 T 720 120 T 800 125 L 800 160 L 0 160 Z"
        fill={palette.groundTop}
        opacity={snowy ? 0.95 : 0.9}
      />
      {/* Closer ridge */}
      <path
        d="M 0 145 Q 180 125 360 142 T 720 138 L 800 140 L 800 160 L 0 160 Z"
        fill="url(#wsGround)"
      />
      {snowy && (
        <>
          {/* Snow accumulation on ridges */}
          <path
            d="M 0 130 Q 120 95 240 120 T 480 115 T 720 120 T 800 125 L 800 128 Q 720 122 480 118 T 240 122 T 0 132 Z"
            fill="#f8fafc"
            opacity="0.6"
          />
        </>
      )}
    </g>
  );
}

const STYLES = `
.weather-scene-wrap { line-height: 0; }

/* Sun rays spin slowly */
@keyframes ws-sun-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.ws-sun-rays { animation: ws-sun-rotate 60s linear infinite; }

@keyframes ws-sun-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}
.ws-sun { animation: ws-sun-pulse 4s ease-in-out infinite; }

/* Cloud drift */
@keyframes ws-cloud-slow {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(-6px); }
}
@keyframes ws-cloud-fast {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(8px); }
}
@keyframes ws-cloud-windy {
  0% { transform: translateX(-30px); }
  100% { transform: translateX(900px); }
}
.ws-cloud-slow { animation: ws-cloud-slow 9s ease-in-out infinite; }
.ws-cloud-fast { animation: ws-cloud-fast 7s ease-in-out infinite; }
.ws-cloud-windy { animation: ws-cloud-windy 14s linear infinite; }
.ws-cloud-windy2 { animation: ws-cloud-windy 17s linear infinite 3s; }

/* Stars twinkle */
@keyframes ws-star {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 0.35; }
}
.ws-star { animation: ws-star 3s ease-in-out infinite; }

/* Rain drops fall */
@keyframes ws-drop {
  0% { transform: translateY(0); opacity: 0; }
  15% { opacity: 1; }
  100% { transform: translateY(180px); opacity: 0.5; }
}
.ws-drop { animation-name: ws-drop; animation-timing-function: linear; animation-iteration-count: infinite; }

/* Snow drift */
@keyframes ws-flake {
  0% { transform: translate(0, 0); opacity: 0; }
  15% { opacity: 0.95; }
  100% { transform: translate(20px, 180px); opacity: 0.4; }
}
.ws-flake { animation-name: ws-flake; animation-timing-function: linear; animation-iteration-count: infinite; }

/* Lightning bolt flash */
@keyframes ws-bolt {
  0%, 90%, 100% { opacity: 0; }
  91%, 94% { opacity: 1; }
  92% { opacity: 0.3; }
}
.ws-bolt { animation: ws-bolt 3.5s linear infinite; transform-origin: 405px 90px; }

/* Fog drift */
@keyframes ws-fog-1 {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(40px); }
}
@keyframes ws-fog-2 {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(-40px); }
}
.ws-fog-1 { animation: ws-fog-1 16s ease-in-out infinite; }
.ws-fog-2 { animation: ws-fog-2 18s ease-in-out infinite; }

/* Wind streaks */
@keyframes ws-streak {
  0% { transform: translateX(-30px); opacity: 0; }
  20%, 80% { opacity: 0.8; }
  100% { transform: translateX(80px); opacity: 0; }
}
.ws-streak { animation-name: ws-streak; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }

@media (prefers-reduced-motion: reduce) {
  .ws-sun-rays, .ws-sun, .ws-cloud-slow, .ws-cloud-fast,
  .ws-cloud-windy, .ws-cloud-windy2, .ws-star, .ws-drop,
  .ws-flake, .ws-bolt, .ws-fog-1, .ws-fog-2, .ws-streak {
    animation: none !important;
  }
}
`;
