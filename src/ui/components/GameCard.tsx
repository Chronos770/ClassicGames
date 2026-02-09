import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
  towerdefense: '\u{1F3F0}',
};

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
          <span className="text-6xl mb-3 drop-shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-300">
            {GAME_ICONS[game.id] ?? '\u2660'}
          </span>

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
