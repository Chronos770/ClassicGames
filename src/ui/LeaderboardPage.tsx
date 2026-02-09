import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getLeaderboard, LeaderboardEntry } from '../lib/eloService';
import { useAuthStore } from '../stores/authStore';

const GAME_TABS = [
  { id: 'chess', name: 'Chess' },
  { id: 'checkers', name: 'Checkers' },
  { id: 'hearts', name: 'Hearts' },
  { id: 'rummy', name: 'Gin Rummy' },
  { id: 'battleship', name: 'Battleship' },
];

export default function LeaderboardPage() {
  const [activeGame, setActiveGame] = useState('chess');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLeaderboard(activeGame).then((data) => {
      if (!cancelled) {
        setEntries(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [activeGame]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-display font-bold text-white mb-2">Leaderboard</h2>
        <p className="text-white/50">Top players ranked by ELO rating</p>
      </motion.div>

      {/* Game tabs */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {GAME_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveGame(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeGame === tab.id
                ? 'bg-amber-500 text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-panel"
      >
        {loading ? (
          <div className="text-center py-8 text-white/40">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-white/40">
            No rankings yet. Play some games to get on the leaderboard!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/10">
                  <th className="text-left py-3 px-2 w-12">#</th>
                  <th className="text-left py-3 px-2">Player</th>
                  <th className="text-right py-3 px-2">ELO</th>
                  <th className="text-right py-3 px-2">Peak</th>
                  <th className="text-right py-3 px-2">Games</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => {
                  const isCurrentUser = user && entry.user_id === user.id;
                  return (
                    <tr
                      key={entry.user_id}
                      className={`border-b border-white/5 ${
                        isCurrentUser ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      <td className="py-3 px-2 text-white/40 font-mono">
                        {i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : i === 2 ? '\u{1F949}' : `${i + 1}`}
                      </td>
                      <td className="py-3 px-2">
                        <span className="mr-2">{entry.avatar_emoji}</span>
                        <span className={isCurrentUser ? 'text-amber-400 font-medium' : 'text-white'}>
                          {entry.display_name}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right text-white font-mono font-bold">
                        {entry.rating}
                      </td>
                      <td className="py-3 px-2 text-right text-white/50 font-mono">
                        {entry.peak_rating}
                      </td>
                      <td className="py-3 px-2 text-right text-white/50 font-mono">
                        {entry.games_rated}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
