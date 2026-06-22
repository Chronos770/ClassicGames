import { useEffect } from 'react';
import type { ConditionKey } from '../../lib/weatherCondition';

/**
 * Animated SVG frog mascot that sits next to the hero temperature on
 * the weather dashboard. Reacts to the current weather + temperature:
 *
 *   - rain / thunder         → tilts back, holds an umbrella, watches the sky
 *   - snow                   → wears a knit scarf, breath puff
 *   - cold     (≤ 40 °F)     → wraps a scarf, shivers
 *   - hot      (≥ 88 °F)     → tongue lolls out, sweat drop, fans itself
 *   - foggy / windy          → squints into the wind, looks unbothered
 *   - night                  → closed eyes, drifting Z's
 *   - everything else (nice) → smiles, gentle idle bob
 *
 * Drawn at viewBox 0 0 120 140 so the umbrella has room above the head
 * without clipping. Scales fluidly via the `size` prop. CSS keyframes
 * are injected once into the document head — same pattern as
 * AnimatedWeatherIcon.
 */
interface Props {
  conditionKey: ConditionKey;
  isDay?: boolean;
  tempF?: number | null;
  size?: number;
}

const STYLE_ID = 'weather-frog-styles';
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

type Mood =
  | 'happy'
  | 'rain'
  | 'thunder'
  | 'snow'
  | 'cold'
  | 'hot'
  | 'fog'
  | 'windy'
  | 'night'
  | 'sunbathing';

function deriveMood(conditionKey: ConditionKey, isDay: boolean, tempF: number | null): Mood {
  if (conditionKey === 'thunderstorm') return 'thunder';
  if (conditionKey === 'heavyRain' || conditionKey === 'rain' || conditionKey === 'drizzle') return 'rain';
  if (conditionKey === 'snow' || conditionKey === 'cold') return 'snow';
  if (conditionKey === 'fog') return 'fog';
  if (conditionKey === 'windy') return 'windy';
  if (tempF !== null && tempF <= 40) return 'cold';
  if (tempF !== null && tempF >= 88) return 'hot';
  if ((conditionKey === 'sunny' || conditionKey === 'hot') && tempF !== null && tempF >= 78) return 'sunbathing';
  if (!isDay && (conditionKey === 'clear' || conditionKey === 'sunny')) return 'night';
  return 'happy';
}

export default function WeatherFrog({ conditionKey, isDay = true, tempF, size = 120 }: Props) {
  useEffect(() => {
    ensureStyles();
  }, []);
  const mood = deriveMood(conditionKey, isDay, tempF ?? null);

  // Body sway class — varies per mood to give the character a sense
  // of life without redrawing the whole frog every render.
  const bodyClass = (() => {
    switch (mood) {
      case 'cold':
        return 'frog-shiver';
      case 'hot':
        return 'frog-pant';
      case 'thunder':
        return 'frog-startled';
      case 'snow':
        return 'frog-shiver-slow';
      default:
        return 'frog-bob';
    }
  })();

  return (
    <svg
      width={size}
      height={size * (140 / 120)}
      viewBox="0 0 120 140"
      aria-hidden
      className="frog-root flex-shrink-0"
    >
      <defs>
        <radialGradient id="frogBody" cx="0.45" cy="0.35" r="0.75">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="60%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </radialGradient>
        <linearGradient id="frogBelly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dcfce7" />
          <stop offset="100%" stopColor="#bbf7d0" />
        </linearGradient>
        <radialGradient id="cheek" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fda4af" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fda4af" stopOpacity="0" />
        </radialGradient>
        {/* used for night sky vibe behind the frog */}
        <filter id="frogShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
          <feOffset dx="0" dy="2" />
          <feComponentTransfer><feFuncA type="linear" slope="0.35" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Sky accessory layer (above the frog) — rain droplets, snow, lightning,
          night Z's. Drawn first so the frog/umbrella overlap them naturally. */}
      <AmbientFx mood={mood} />

      {/* Body. The translateY animation lives on this group via the
          bodyClass — the umbrella sits in a fixed group above so it
          tracks the frog's head but not the shiver wiggle. */}
      <g className={bodyClass} filter="url(#frogShadow)">
        {/* Shadow under feet */}
        <ellipse cx="60" cy="128" rx="38" ry="3" fill="#000" opacity="0.18" />

        {/* Back legs */}
        <ellipse cx="28" cy="118" rx="14" ry="8" fill="url(#frogBody)" />
        <ellipse cx="92" cy="118" rx="14" ry="8" fill="url(#frogBody)" />
        {/* Toes */}
        <Toes cx={18} cy={122} />
        <Toes cx={102} cy={122} flip />

        {/* Body */}
        <ellipse cx="60" cy="90" rx="44" ry="32" fill="url(#frogBody)" />
        {/* Belly */}
        <ellipse cx="60" cy="98" rx="30" ry="22" fill="url(#frogBelly)" />

        {/* Front arms — only show when needed (umbrella holding, fanning) */}
        {mood === 'rain' || mood === 'thunder' ? (
          <g>
            {/* Left arm raised toward umbrella handle */}
            <ellipse cx="78" cy="78" rx="6" ry="14" fill="url(#frogBody)" transform="rotate(35 78 78)" />
            <circle cx="86" cy="64" r="5" fill="#4ade80" />
          </g>
        ) : mood === 'hot' ? (
          <g className="frog-fan">
            {/* Right arm fanning */}
            <ellipse cx="92" cy="88" rx="5" ry="12" fill="url(#frogBody)" transform="rotate(20 92 88)" />
            {/* Tiny leaf fan */}
            <ellipse cx="100" cy="72" rx="8" ry="11" fill="#84cc16" transform="rotate(20 100 72)" />
            <path d="M 96 78 L 102 66" stroke="#365314" strokeWidth="1.2" />
          </g>
        ) : null}

        {/* Eye bulges */}
        <ellipse cx="42" cy="58" rx="15" ry="15" fill="url(#frogBody)" />
        <ellipse cx="78" cy="58" rx="15" ry="15" fill="url(#frogBody)" />

        {/* Eyes */}
        <Eyes mood={mood} />

        {/* Cheeks — show subtly when warm or happy */}
        {(mood === 'hot' || mood === 'happy' || mood === 'sunbathing') && (
          <>
            <ellipse cx="36" cy="78" rx="6" ry="3.5" fill="url(#cheek)" />
            <ellipse cx="84" cy="78" rx="6" ry="3.5" fill="url(#cheek)" />
          </>
        )}

        {/* Mouth */}
        <Mouth mood={mood} />

        {/* Cold/snow scarf */}
        {(mood === 'cold' || mood === 'snow') && <Scarf />}

        {/* Sweat drop for hot */}
        {mood === 'hot' && (
          <g className="frog-sweat">
            <path d="M 24 50 q -3 6 0 9 q 3 -3 0 -9 Z" fill="#7dd3fc" stroke="#0284c7" strokeWidth="0.6" />
          </g>
        )}
      </g>

      {/* Umbrella — pinned above the head independent of body animation
          so its rain catchment looks intentional. */}
      {(mood === 'rain' || mood === 'thunder') && <Umbrella />}
    </svg>
  );
}

function Toes({ cx, cy, flip = false }: { cx: number; cy: number; flip?: boolean }) {
  const sign = flip ? -1 : 1;
  return (
    <g fill="#4ade80">
      <circle cx={cx + sign * -3} cy={cy} r="2.5" />
      <circle cx={cx} cy={cy + 1} r="2.5" />
      <circle cx={cx + sign * 3} cy={cy} r="2.5" />
    </g>
  );
}

function Eyes({ mood }: { mood: Mood }) {
  // Closed/sleepy eyes for night
  if (mood === 'night') {
    return (
      <g stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" fill="none">
        <path d="M 35 58 Q 42 62 49 58" />
        <path d="M 71 58 Q 78 62 85 58" />
      </g>
    );
  }
  // Squint for fog/windy
  if (mood === 'fog' || mood === 'windy') {
    return (
      <g>
        <ellipse cx="42" cy="58" rx="9" ry="3" fill="white" />
        <ellipse cx="78" cy="58" rx="9" ry="3" fill="white" />
        <circle cx="42" cy="58" r="2.5" fill="#1e293b" />
        <circle cx="78" cy="58" r="2.5" fill="#1e293b" />
      </g>
    );
  }
  // Frightened wide eyes for thunder
  if (mood === 'thunder') {
    return (
      <g>
        <circle cx="42" cy="56" r="11" fill="white" />
        <circle cx="78" cy="56" r="11" fill="white" />
        <circle cx="42" cy="56" r="5" fill="#1e293b" />
        <circle cx="78" cy="56" r="5" fill="#1e293b" />
        <circle cx="40" cy="54" r="1.5" fill="white" />
        <circle cx="76" cy="54" r="1.5" fill="white" />
      </g>
    );
  }
  // Looking-up pupils when raining (watching the umbrella drip)
  const pupilY = mood === 'rain' ? 54 : 60;
  return (
    <g>
      <circle cx="42" cy="56" r="10" fill="white" />
      <circle cx="78" cy="56" r="10" fill="white" />
      <circle cx="42" cy={pupilY} r="4.5" fill="#1e293b" className="frog-pupil" />
      <circle cx="78" cy={pupilY} r="4.5" fill="#1e293b" className="frog-pupil" />
      {/* Eye highlights — small white dot for liveliness */}
      <circle cx="40" cy={pupilY - 2} r="1.4" fill="white" />
      <circle cx="76" cy={pupilY - 2} r="1.4" fill="white" />
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'happy':
    case 'sunbathing':
      return (
        <path
          d="M 46 82 Q 60 92 74 82"
          stroke="#14532d"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
      );
    case 'cold':
    case 'snow':
      return (
        <path d="M 50 84 Q 60 80 70 84" stroke="#14532d" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      );
    case 'hot':
      // Open mouth + tongue lolled out
      return (
        <g>
          <path d="M 48 84 Q 60 92 72 84 Q 60 88 48 84 Z" fill="#7f1d1d" stroke="#14532d" strokeWidth="1.5" />
          <ellipse cx="60" cy="92" rx="5" ry="7" fill="#f472b6" className="frog-tongue" />
        </g>
      );
    case 'thunder':
      // Tiny worried 'o'
      return <ellipse cx="60" cy="84" rx="3" ry="4" fill="#14532d" />;
    case 'rain':
      // Closed mouth, slight smile (taking shelter, content)
      return (
        <path d="M 50 84 Q 60 88 70 84" stroke="#14532d" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      );
    case 'fog':
    case 'windy':
      return (
        <path d="M 50 84 H 70" stroke="#14532d" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      );
    case 'night':
      // Tiny smile, sleeping
      return (
        <path d="M 50 84 Q 60 88 70 84" stroke="#14532d" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      );
  }
}

function Scarf() {
  return (
    <g>
      {/* Main wrap */}
      <path
        d="M 22 76 Q 60 88 98 76 L 100 84 Q 60 96 20 84 Z"
        fill="#dc2626"
        stroke="#991b1b"
        strokeWidth="1.2"
      />
      {/* Hanging tail */}
      <path
        d="M 20 84 L 16 100 L 22 102 L 26 86 Z"
        fill="#dc2626"
        stroke="#991b1b"
        strokeWidth="1"
      />
      {/* Stripe accents */}
      <path d="M 30 79 L 33 87" stroke="#fecaca" strokeWidth="1" />
      <path d="M 88 79 L 91 87" stroke="#fecaca" strokeWidth="1" />
    </g>
  );
}

function Umbrella() {
  return (
    <g className="frog-umbrella">
      {/* Canopy */}
      <path
        d="M 28 38 Q 60 -2 92 38 Z"
        fill="#ef4444"
        stroke="#7f1d1d"
        strokeWidth="1.2"
      />
      {/* Canopy panels */}
      <path d="M 60 8 L 60 38" stroke="#7f1d1d" strokeWidth="1" />
      <path d="M 44 16 Q 50 30 52 38" stroke="#7f1d1d" strokeWidth="0.8" fill="none" />
      <path d="M 76 16 Q 70 30 68 38" stroke="#7f1d1d" strokeWidth="0.8" fill="none" />
      <path d="M 28 38 Q 36 32 44 36" stroke="#7f1d1d" strokeWidth="0.8" fill="none" />
      <path d="M 92 38 Q 84 32 76 36" stroke="#7f1d1d" strokeWidth="0.8" fill="none" />
      {/* Pole */}
      <line x1="60" y1="36" x2="86" y2="62" stroke="#78350f" strokeWidth="2.4" strokeLinecap="round" />
      {/* Handle */}
      <path d="M 86 62 Q 91 67 88 72" stroke="#78350f" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </g>
  );
}

function AmbientFx({ mood }: { mood: Mood }) {
  if (mood === 'rain') {
    return (
      <g className="frog-rain">
        {[14, 32, 50, 68, 86, 104].map((x, i) => (
          <line
            key={i}
            x1={x}
            y1={8}
            x2={x - 2}
            y2={18}
            stroke="#60a5fa"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{ animationDelay: `${i * 0.15}s` }}
            className="frog-raindrop"
          />
        ))}
      </g>
    );
  }
  if (mood === 'thunder') {
    return (
      <g>
        <g className="frog-rain">
          {[14, 32, 50, 68, 86, 104].map((x, i) => (
            <line
              key={i}
              x1={x}
              y1={8}
              x2={x - 2}
              y2={18}
              stroke="#60a5fa"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{ animationDelay: `${i * 0.15}s` }}
              className="frog-raindrop"
            />
          ))}
        </g>
        <path
          className="frog-bolt"
          d="M 100 4 L 92 22 L 100 22 L 96 36 L 110 18 L 102 18 L 106 4 Z"
          fill="#facc15"
          stroke="#a16207"
          strokeWidth="0.6"
        />
      </g>
    );
  }
  if (mood === 'snow') {
    return (
      <g className="frog-snow">
        {[18, 36, 54, 72, 90, 108].map((x, i) => (
          <circle
            key={i}
            cx={x}
            cy={10}
            r="2"
            fill="white"
            style={{ animationDelay: `${i * 0.4}s` }}
            className="frog-snowflake"
          />
        ))}
      </g>
    );
  }
  if (mood === 'night') {
    return (
      <g className="frog-zzz">
        <text x="96" y="34" fontSize="14" fontWeight="600" fill="#cbd5e1" className="frog-z1">z</text>
        <text x="102" y="22" fontSize="11" fontWeight="600" fill="#cbd5e1" className="frog-z2">z</text>
        <text x="108" y="14" fontSize="9" fontWeight="600" fill="#cbd5e1" className="frog-z3">z</text>
      </g>
    );
  }
  if (mood === 'fog') {
    return (
      <g className="frog-fog">
        <ellipse cx="40" cy="36" rx="22" ry="4" fill="white" opacity="0.45" />
        <ellipse cx="80" cy="44" rx="20" ry="3" fill="white" opacity="0.35" />
      </g>
    );
  }
  if (mood === 'windy') {
    return (
      <g className="frog-wind">
        <path d="M 4 50 Q 30 46 50 52" stroke="#cbd5e1" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M 4 64 Q 28 60 48 66" stroke="#cbd5e1" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.5" />
      </g>
    );
  }
  if (mood === 'sunbathing') {
    return (
      <g>
        <circle cx="100" cy="20" r="10" fill="#fbbf24" />
        <g stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round">
          <line x1="100" y1="4" x2="100" y2="2" />
          <line x1="84" y1="20" x2="82" y2="20" />
          <line x1="116" y1="20" x2="118" y2="20" />
          <line x1="89" y1="9" x2="87" y2="7" />
          <line x1="111" y1="9" x2="113" y2="7" />
        </g>
      </g>
    );
  }
  return null;
}

const STYLES = `
.frog-root { overflow: visible; }

/* Body movement */
@keyframes frog-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
@keyframes frog-shiver {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-0.8px) rotate(-0.3deg); }
  40% { transform: translateX(0.8px) rotate(0.3deg); }
  60% { transform: translateX(-0.7px) rotate(-0.2deg); }
  80% { transform: translateX(0.7px) rotate(0.2deg); }
}
@keyframes frog-shiver-slow {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(-1px); }
}
@keyframes frog-pant {
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(1px); }
  60% { transform: translateY(-1px); }
}
@keyframes frog-startled {
  0%, 100% { transform: translateY(0) translateX(0); }
  10%, 30% { transform: translateY(-2px) translateX(1px); }
  20% { transform: translateY(-3px); }
}
.frog-bob { animation: frog-bob 2.4s ease-in-out infinite; transform-origin: 60px 90px; }
.frog-shiver { animation: frog-shiver 0.22s linear infinite; transform-origin: 60px 90px; }
.frog-shiver-slow { animation: frog-shiver-slow 1.6s ease-in-out infinite; transform-origin: 60px 90px; }
.frog-pant { animation: frog-pant 0.9s ease-in-out infinite; transform-origin: 60px 90px; }
.frog-startled { animation: frog-startled 2.4s ease-in-out infinite; transform-origin: 60px 90px; }

/* Pupils slow drift when idle — looks alive */
@keyframes frog-pupil-drift {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-1px); }
  75% { transform: translateX(1px); }
}
.frog-pupil { animation: frog-pupil-drift 5s ease-in-out infinite; }

/* Hot — tongue + sweat + fan */
@keyframes frog-tongue {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(1.5px); }
}
.frog-tongue { animation: frog-tongue 1s ease-in-out infinite; transform-origin: 60px 88px; }
@keyframes frog-sweat {
  0% { transform: translateY(-2px); opacity: 0; }
  20%, 70% { opacity: 1; }
  100% { transform: translateY(8px); opacity: 0; }
}
.frog-sweat { animation: frog-sweat 2.2s ease-in 0.4s infinite; }
@keyframes frog-fan {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-15deg); }
}
.frog-fan { animation: frog-fan 0.6s ease-in-out infinite; transform-origin: 92px 92px; }

/* Umbrella — gentle sway */
@keyframes frog-umbrella-sway {
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
}
.frog-umbrella { animation: frog-umbrella-sway 3s ease-in-out infinite; transform-origin: 60px 38px; }

/* Rain drops falling */
@keyframes frog-raindrop {
  0% { transform: translateY(-6px); opacity: 0; }
  20% { opacity: 0.8; }
  100% { transform: translateY(24px); opacity: 0; }
}
.frog-raindrop { animation: frog-raindrop 1.1s linear infinite; }

/* Lightning flash */
@keyframes frog-bolt {
  0%, 92%, 100% { opacity: 0; }
  93%, 96% { opacity: 1; }
  94% { opacity: 0.3; }
}
.frog-bolt { animation: frog-bolt 3.4s linear infinite; transform-origin: 100px 20px; }

/* Snowflake fall */
@keyframes frog-snowflake {
  0% { transform: translateY(-4px); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translateY(24px); opacity: 0; }
}
.frog-snowflake { animation: frog-snowflake 3s linear infinite; }

/* Sleeping Z's */
@keyframes frog-z {
  0% { transform: translateY(4px); opacity: 0; }
  30%, 70% { opacity: 1; }
  100% { transform: translateY(-10px); opacity: 0; }
}
.frog-z1 { animation: frog-z 3s ease-in-out infinite; }
.frog-z2 { animation: frog-z 3s ease-in-out 1s infinite; }
.frog-z3 { animation: frog-z 3s ease-in-out 2s infinite; }

/* Fog drift */
@keyframes frog-fog-drift {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(6px); }
}
.frog-fog { animation: frog-fog-drift 4s ease-in-out infinite; }

/* Wind streaks */
@keyframes frog-wind {
  0%, 100% { transform: translateX(0); opacity: 0.6; }
  50% { transform: translateX(4px); opacity: 0.9; }
}
.frog-wind { animation: frog-wind 1.6s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .frog-bob, .frog-shiver, .frog-shiver-slow, .frog-pant, .frog-startled,
  .frog-pupil, .frog-tongue, .frog-sweat, .frog-fan, .frog-umbrella,
  .frog-raindrop, .frog-bolt, .frog-snowflake,
  .frog-z1, .frog-z2, .frog-z3, .frog-fog, .frog-wind {
    animation: none !important;
  }
}
`;
