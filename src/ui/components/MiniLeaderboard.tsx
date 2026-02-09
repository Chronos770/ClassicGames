import { useEffect, useState } from 'react';
import { getLeaderboard, LeaderboardEntry } from '../../lib/eloService';

interface MiniLeaderboardProps {
  gameId: string;
}

export default function MiniLeaderboard({ gameId }: MiniLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getLeaderboard(gameId, 5);
      if (!cancelled) {
        setEntries(data);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [gameId]);

  if (loading) {
    return (
      <div className="glass-panel !p-4">
        <h3 className="text-sm font-medium text-white/60 mb-3">Top Players</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="glass-panel !p-4">
        <h3 className="text-sm font-medium text-white/60 mb-3">Top Players</h3>
        <p className="text-xs text-white/30 text-center py-4">
          No ranked players yet. Be the first!
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel !p-4">
      <h3 className="text-sm font-medium text-white/60 mb-3">Top Players</h3>
      <div className="space-y-1.5">
        {entries.map((entry, i) => (
          <div
            key={entry.user_id}
            className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-white/[0.02]"
          >
            <span className={`text-xs font-mono font-bold w-5 text-center ${
              i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-700' : 'text-white/30'
            }`}>
              {i + 1}
            </span>
            <span className="text-sm">{entry.avatar_emoji}</span>
            <span className="text-xs text-white/70 flex-1 truncate">{entry.display_name}</span>
            <span className="text-xs font-mono text-amber-400">{entry.rating}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
