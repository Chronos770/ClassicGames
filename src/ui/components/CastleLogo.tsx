/**
 * Castle & Cards logo — a playing card silhouette with castle battlements on top
 * and a spade suit symbol in the center.
 */
export default function CastleLogo({ size = 40 }: { size?: number }) {
  const h = size * 1.15;
  return (
    <svg width={size} height={h} viewBox="0 0 40 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cc-gold" x1="0" y1="0" x2="40" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="cc-shine" x1="0" y1="0" x2="0" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="0.3" />
          <stop offset="40%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Card body with castle battlements */}
      <path
        d="M3 12 L3 8 L7 8 L7 2 L13 2 L13 8 L17 8 L17 2 L23 2 L23 8 L27 8 L27 2 L33 2 L33 8 L37 8 L37 12 L37 42 Q37 45 34 45 L6 45 Q3 45 3 42 Z"
        fill="url(#cc-gold)"
      />

      {/* Shine overlay */}
      <path
        d="M3 12 L3 8 L7 8 L7 2 L13 2 L13 8 L17 8 L17 2 L23 2 L23 8 L27 8 L27 2 L33 2 L33 8 L37 8 L37 12 L37 42 Q37 45 34 45 L6 45 Q3 45 3 42 Z"
        fill="url(#cc-shine)"
      />

      {/* Subtle border */}
      <path
        d="M3 12 L3 8 L7 8 L7 2 L13 2 L13 8 L17 8 L17 2 L23 2 L23 8 L27 8 L27 2 L33 2 L33 8 L37 8 L37 12 L37 42 Q37 45 34 45 L6 45 Q3 45 3 42 Z"
        stroke="#92400e"
        strokeWidth="0.7"
        fill="none"
        opacity="0.5"
      />

      {/* Spade symbol */}
      <path
        d="M20 15 C20 15 11 22 11 27 C11 30.5 14 32 17 30 C15.5 33 14 36 13 37 L27 37 C26 36 24.5 33 23 30 C26 32 29 30.5 29 27 C29 22 20 15 20 15 Z"
        fill="#1c1917"
        opacity="0.85"
      />

      {/* Corner suit marks */}
      <text x="7" y="17" textAnchor="middle" fontSize="6" fontFamily="Georgia, serif" fill="#1c1917" opacity="0.5">&#9824;</text>
      <text x="33" y="42" textAnchor="middle" fontSize="6" fontFamily="Georgia, serif" fill="#1c1917" opacity="0.5" transform="rotate(180 33 39)">&#9824;</text>
    </svg>
  );
}
