import { motion } from 'framer-motion';
import { useUserStore } from '../stores/userStore';

const GAME_IDS = [
  { id: 'solitaire', name: 'Solitaire' },
  { id: 'chess', name: 'Chess' },
  { id: 'hearts', name: 'Hearts' },
  { id: 'checkers', name: 'Checkers' },
  { id: 'rummy', name: 'Gin Rummy' },
  { id: 'battleship', name: 'Battleship' },
];

export default function StatsPage() {
  const stats = useUserStore((s) => s.stats);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h2 className="text-3xl font-display font-bold text-white mb-2">Your Stats</h2>
        <p className="text-white/50">Track your progress across all games</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GAME_IDS.map(({ id, name }, i) => {
          const gs = stats[id] ?? { played: 0, won: 0, streak: 0, bestStreak: 0 };
          const winRate = gs.played > 0 ? Math.round((gs.won / gs.played) * 100) : 0;

          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel"
            >
              <h3 className="text-lg font-display font-bold text-white mb-4">{name}</h3>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Games Played</span>
                  <span className="text-white font-mono">{gs.played}</span>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/50">Win Rate</span>
                    <span className="text-amber-400 font-mono">{winRate}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${winRate}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Current Streak</span>
                  <span className="text-white font-mono">{gs.streak}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Best Streak</span>
                  <span className="text-green-400 font-mono">{gs.bestStreak}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
