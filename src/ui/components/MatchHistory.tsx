import { MatchRecord } from '../../stores/userStore';

interface MatchHistoryProps {
  matches: MatchRecord[];
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function MatchHistory({ matches }: MatchHistoryProps) {
  if (matches.length === 0) {
    return (
      <div className="glass-panel !p-4">
        <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Recent Games</h3>
        <p className="text-xs text-white/20 text-center py-3">No games played yet</p>
      </div>
    );
  }

  return (
    <div className="glass-panel !p-4">
      <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Recent Games</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {matches.slice(0, 10).map((match, i) => (
          <div
            key={i}
            className={`flex items-center justify-between py-1.5 px-2 rounded text-xs ${
              match.won ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`font-bold ${match.won ? 'text-green-400' : 'text-red-400'}`}>
                {match.won ? 'W' : 'L'}
              </span>
              <span className="text-white/60">vs {match.opponent}</span>
            </div>
            <div className="flex items-center gap-2">
              {match.details && (
                <span className="text-white/30 hidden sm:inline">{match.details}</span>
              )}
              <span className="text-white/20">{timeAgo(match.date)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
