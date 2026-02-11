import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';

interface GameOverModalProps {
  isOpen: boolean;
  won: boolean;
  title: string;
  stats?: { label: string; value: string }[];
  onPlayAgain?: () => void;
  gameId: string;
  extraButton?: ReactNode;
}

export default function GameOverModal({
  isOpen,
  won,
  title,
  stats,
  onPlayAgain,
  gameId,
  extraButton,
}: GameOverModalProps) {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25 }}
            className="glass-panel max-w-md w-full mx-4 text-center"
          >
            <div className="text-5xl mb-4">{won ? '\u{1F3C6}' : '\u{1F614}'}</div>

            <h2 className="text-2xl font-display font-bold text-white mb-2">{title}</h2>

            <p className="text-white/50 mb-6">
              {won ? 'Congratulations on your victory!' : 'Better luck next time!'}
            </p>

            {stats && stats.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {stats.map((stat) => (
                  <div key={stat.label} className="bg-white/5 rounded-lg p-3">
                    <div className="text-lg font-mono font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-white/40 uppercase">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => navigate(`/lobby/${gameId}`)} className="btn-secondary flex-1">
                Lobby
              </button>
              {extraButton}
              {onPlayAgain && (
                <button onClick={onPlayAgain} className="btn-primary flex-1">
                  Play Again
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
