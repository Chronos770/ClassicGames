import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { GameConfig } from '../../engine/types';

interface GameCardProps {
  game: GameConfig;
  index: number;
}

const GAME_ICONS: Record<string, string> = {
  solitaire: '\u2660',
  hearts: '\u2665',
  rummy: '\u2666',
  chess: '\u265A',
  checkers: '\u26C0',
  battleship: '\u2693',
  backgammon: '\u2680',
  gp2: '\u{1F3CE}\u{FE0F}',
};

// Tiny pixel art for the 3 bonks characters (8x10 each, side by side)
const BONKS_CHARS: { pixels: string[]; colors: Record<string, string> }[] = [
  { // BooBonks (girl, golden hair, pink dress)
    pixels: [
      '..bbbb..',
      '.bbbbbbb',
      '.bssssbb',
      '.skwskwb',
      '..ssns..',
      '.oooooo.',
      'oooooooo',
      'oooooooo',
      '..ss.ss.',
      '..rr.rr.',
    ],
    colors: { b: '#FFAA33', s: '#FFCC99', k: '#222', w: '#FFF', n: '#C44', o: '#FFAACC', r: '#D22' },
  },
  { // BoJangles (boy, brown hair, blue overalls)
    pixels: [
      '..bbbb..',
      '.bbbbbb.',
      '.bssssb.',
      '.skwskw.',
      '..ssns..',
      '..oooo..',
      '.oooooo.',
      '.oooooo.',
      '..oo.oo.',
      '..rr.rr.',
    ],
    colors: { b: '#554422', s: '#FFCC99', k: '#222', w: '#FFF', n: '#C44', o: '#2244CC', r: '#852' },
  },
  { // Chonk (white dog, red collar)
    pixels: [
      '.ee..ee.',
      'efffffef',
      'fwpffwpf',
      '.ffkkff.',
      '.ffttff.',
      '.cccccc.',
      '.ffffff.',
      '.ffffff.',
      '..ff.ff.',
      '..ff.ff.',
    ],
    colors: { f: '#FFF', F: '#DDD', e: '#FBCE', k: '#333', w: '#FFF', p: '#222', t: '#F69', c: '#D33' },
  },
];

function BonksIcon() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    const px = 3;
    ctx.clearRect(0, 0, cv.width, cv.height);
    BONKS_CHARS.forEach((char, ci) => {
      const ox = ci * 9 * px + (ci === 1 ? px : 0);
      char.pixels.forEach((row, ry) => {
        for (let cx = 0; cx < row.length; cx++) {
          const ch = row[cx];
          if (ch === '.') continue;
          const color = char.colors[ch];
          if (!color) continue;
          ctx.fillStyle = color;
          ctx.fillRect(ox + cx * px, ry * px, px, px);
        }
      });
    });
  }, []);
  return <canvas ref={canvasRef} width={84} height={30} className="drop-shadow-lg" style={{ imageRendering: 'pixelated' }} />;
}

export default function GameCard({ game, index }: GameCardProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      onClick={() => navigate(`/lobby/${game.id}`)}
      className="group cursor-pointer"
    >
      <div className="relative overflow-hidden rounded-xl transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-2xl">
        {/* Card background with gradient */}
        <div
          className="aspect-[4/3] flex flex-col items-center justify-center p-6 relative"
          style={{
            background: `linear-gradient(135deg, ${game.color}dd, ${game.color}88)`,
          }}
        >
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)',
            }}
          />

          {/* Game icon */}
          {game.id === 'bonks' ? (
            <div className="mb-3 relative z-10 group-hover:scale-110 transition-transform duration-300" style={{ transform: 'scale(2)' }}>
              <BonksIcon />
            </div>
          ) : (
            <span className="text-6xl mb-3 drop-shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-300">
              {GAME_ICONS[game.id] ?? '\u2660'}
            </span>
          )}

          {/* Game name */}
          <h3 className="text-xl font-display font-bold text-white relative z-10 drop-shadow-md">
            {game.name}
          </h3>

          {/* Player count */}
          <p className="text-sm text-white/70 mt-1 relative z-10">
            {game.minPlayers === game.maxPlayers
              ? `${game.minPlayers} Player`
              : `${game.minPlayers}-${game.maxPlayers} Players`}
          </p>
        </div>

        {/* Description bar */}
        <div className="bg-white/5 backdrop-blur-sm px-4 py-3 border-t border-white/10">
          <p className="text-sm text-white/60 leading-relaxed">{game.description}</p>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300 rounded-xl" />
      </div>
    </motion.div>
  );
}
