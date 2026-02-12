/**
 * Fun procedural character avatars for card games.
 * Each name deterministically generates a unique character with
 * distinct skin tone, hair, eyes, mouth, and accessories.
 */

const SKIN_TONES = ['#FDDBB4', '#F0C8A0', '#E0A878', '#C68642', '#8D5524', '#D4956A'];
const HAIR_COLORS = ['#1A1A2E', '#3D2B1F', '#8B4513', '#D4A853', '#C84B31', '#8E8E8E', '#F5E6CA', '#5C2D91'];

function nameHash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], hash: number, shift: number): T {
  return arr[((hash >> shift) >>> 0) % arr.length];
}

interface Props {
  name: string;
  size?: number;
  bgColor?: string;
}

export default function CharacterAvatar({ name, size = 36, bgColor }: Props) {
  const h = nameHash(name);
  const skin = pick(SKIN_TONES, h, 0);
  const hair = pick(HAIR_COLORS, h, 3);
  const hairStyle = ((h >> 6) >>> 0) % 6;   // 0-5
  const eyeStyle = ((h >> 9) >>> 0) % 4;    // 0-3
  const mouthStyle = ((h >> 11) >>> 0) % 4; // 0-3
  const hasGlasses = ((h >> 13) >>> 0) % 5 === 0;
  const hasBlush = ((h >> 15) >>> 0) % 3 === 0;
  const hasFreckles = ((h >> 17) >>> 0) % 6 === 0;
  const hasBrows = ((h >> 19) >>> 0) % 2 === 0;

  const bg = bgColor || '#4a5568';

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ borderRadius: '50%' }}>
      {/* Background */}
      <circle cx="20" cy="20" r="20" fill={bg} />

      {/* Ears */}
      <ellipse cx="7" cy="22" rx="3" ry="4" fill={skin} />
      <ellipse cx="33" cy="22" rx="3" ry="4" fill={skin} />

      {/* Face */}
      <ellipse cx="20" cy="23" rx="13" ry="14" fill={skin} />

      {/* Hair - drawn behind/over face */}
      {renderHair(hairStyle, hair)}

      {/* Eyebrows */}
      {hasBrows && renderBrows(eyeStyle)}

      {/* Eyes */}
      {renderEyes(eyeStyle)}

      {/* Glasses */}
      {hasGlasses && (
        <g>
          <circle cx="15" cy="21" r="4.5" fill="none" stroke="#333" strokeWidth="1.2" />
          <circle cx="25" cy="21" r="4.5" fill="none" stroke="#333" strokeWidth="1.2" />
          <line x1="19.5" y1="21" x2="20.5" y2="21" stroke="#333" strokeWidth="1" />
          <line x1="10.5" y1="21" x2="7" y2="19" stroke="#333" strokeWidth="0.8" />
          <line x1="29.5" y1="21" x2="33" y2="19" stroke="#333" strokeWidth="0.8" />
        </g>
      )}

      {/* Nose */}
      <ellipse cx="20" cy="25" rx="1.5" ry="1" fill={darken(skin, 15)} />

      {/* Mouth */}
      {renderMouth(mouthStyle)}

      {/* Blush */}
      {hasBlush && (
        <g>
          <ellipse cx="12" cy="27" rx="3" ry="1.5" fill="#ff9999" opacity="0.35" />
          <ellipse cx="28" cy="27" rx="3" ry="1.5" fill="#ff9999" opacity="0.35" />
        </g>
      )}

      {/* Freckles */}
      {hasFreckles && (
        <g opacity="0.3">
          <circle cx="13" cy="25" r="0.6" fill="#8B4513" />
          <circle cx="15" cy="26" r="0.6" fill="#8B4513" />
          <circle cx="14" cy="24" r="0.6" fill="#8B4513" />
          <circle cx="25" cy="25" r="0.6" fill="#8B4513" />
          <circle cx="27" cy="26" r="0.6" fill="#8B4513" />
          <circle cx="26" cy="24" r="0.6" fill="#8B4513" />
        </g>
      )}
    </svg>
  );
}

function darken(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

function renderHair(style: number, color: string) {
  switch (style) {
    case 0: // Short neat
      return (
        <g>
          <path d="M7 20 Q7 8 20 7 Q33 8 33 20 L33 16 Q33 6 20 5 Q7 6 7 16 Z" fill={color} />
        </g>
      );
    case 1: // Long flowing
      return (
        <g>
          <path d="M7 20 Q7 8 20 7 Q33 8 33 20 L33 16 Q33 6 20 5 Q7 6 7 16 Z" fill={color} />
          <path d="M7 20 Q5 28 6 35 Q7 33 8 28 L8 20 Z" fill={color} />
          <path d="M33 20 Q35 28 34 35 Q33 33 32 28 L32 20 Z" fill={color} />
        </g>
      );
    case 2: // Curly
      return (
        <g>
          <circle cx="11" cy="12" r="4" fill={color} />
          <circle cx="20" cy="9" r="4.5" fill={color} />
          <circle cx="29" cy="12" r="4" fill={color} />
          <circle cx="8" cy="18" r="3.5" fill={color} />
          <circle cx="32" cy="18" r="3.5" fill={color} />
          <circle cx="15" cy="8" r="3" fill={color} />
          <circle cx="25" cy="8" r="3" fill={color} />
        </g>
      );
    case 3: // Spiky
      return (
        <g>
          <polygon points="12,14 15,2 18,14" fill={color} />
          <polygon points="17,12 20,0 23,12" fill={color} />
          <polygon points="22,14 25,2 28,14" fill={color} />
          <polygon points="8,18 9,7 14,16" fill={color} />
          <polygon points="26,16 31,7 32,18" fill={color} />
          <path d="M8 18 Q8 10 14 8 L20 6 L26 8 Q32 10 32 18" fill={color} />
        </g>
      );
    case 4: // Bob/bowl cut
      return (
        <g>
          <path d="M6 22 Q6 6 20 5 Q34 6 34 22 L32 22 Q32 9 20 8 Q8 9 8 22 Z" fill={color} />
          <rect x="6" y="18" width="5" height="6" rx="2" fill={color} />
          <rect x="29" y="18" width="5" height="6" rx="2" fill={color} />
        </g>
      );
    case 5: // Bald (just a shine)
      return (
        <g>
          <ellipse cx="16" cy="14" rx="4" ry="2" fill="white" opacity="0.15" />
        </g>
      );
    default:
      return null;
  }
}

function renderEyes(style: number) {
  switch (style) {
    case 0: // Dot eyes
      return (
        <g>
          <circle cx="15" cy="21" r="2" fill="#1A1A2E" />
          <circle cx="25" cy="21" r="2" fill="#1A1A2E" />
          <circle cx="15.7" cy="20.3" r="0.6" fill="white" />
          <circle cx="25.7" cy="20.3" r="0.6" fill="white" />
        </g>
      );
    case 1: // Big round eyes
      return (
        <g>
          <ellipse cx="15" cy="21" rx="3" ry="3.2" fill="white" />
          <ellipse cx="25" cy="21" rx="3" ry="3.2" fill="white" />
          <circle cx="15.5" cy="21.5" r="1.8" fill="#2C5F2D" />
          <circle cx="25.5" cy="21.5" r="1.8" fill="#2C5F2D" />
          <circle cx="15.5" cy="21.5" r="1" fill="#1A1A2E" />
          <circle cx="25.5" cy="21.5" r="1" fill="#1A1A2E" />
          <circle cx="16.2" cy="20.5" r="0.7" fill="white" />
          <circle cx="26.2" cy="20.5" r="0.7" fill="white" />
        </g>
      );
    case 2: // Sleepy / half-closed
      return (
        <g>
          <path d="M12 21 Q15 19 18 21" stroke="#1A1A2E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M22 21 Q25 19 28 21" stroke="#1A1A2E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>
      );
    case 3: // Cheerful squint
      return (
        <g>
          <path d="M12 21 Q15 23 18 21" stroke="#1A1A2E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M22 21 Q25 23 28 21" stroke="#1A1A2E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>
      );
    default:
      return null;
  }
}

function renderBrows(eyeStyle: number) {
  const y = eyeStyle === 2 ? 17 : 17.5; // Higher for sleepy eyes
  return (
    <g>
      <path d={`M12 ${y} Q15 ${y - 2} 18 ${y}`} stroke="#333" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <path d={`M22 ${y} Q25 ${y - 2} 28 ${y}`} stroke="#333" strokeWidth="0.9" fill="none" strokeLinecap="round" />
    </g>
  );
}

function renderMouth(style: number) {
  switch (style) {
    case 0: // Gentle smile
      return <path d="M16 29 Q20 32 24 29" stroke="#C0392B" strokeWidth="1.2" fill="none" strokeLinecap="round" />;
    case 1: // Big grin
      return (
        <g>
          <path d="M14 28 Q20 34 26 28" stroke="#C0392B" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M15 29 Q20 33 25 29" fill="white" opacity="0.7" />
        </g>
      );
    case 2: // Neutral
      return <line x1="17" y1="29" x2="23" y2="29" stroke="#C0392B" strokeWidth="1.2" strokeLinecap="round" />;
    case 3: // Small 'o'
      return <ellipse cx="20" cy="29.5" rx="2" ry="2.5" fill="#C0392B" opacity="0.8" />;
    default:
      return null;
  }
}
