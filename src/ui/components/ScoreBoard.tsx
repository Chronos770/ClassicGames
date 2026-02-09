import { Player } from '../../engine/types';

interface ScoreBoardProps {
  players: Player[];
  currentPlayerIndex: number;
}

export default function ScoreBoard({ players, currentPlayerIndex }: ScoreBoardProps) {
  return (
    <div className="glass-panel">
      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Scores</h3>
      <div className="space-y-2">
        {players.map((player, i) => (
          <div
            key={player.id}
            className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
              i === currentPlayerIndex ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  i === currentPlayerIndex ? 'bg-amber-400 animate-pulse' : 'bg-white/20'
                }`}
              />
              <span className="text-sm text-white/80">{player.name}</span>
              {!player.isHuman && (
                <span className="text-[10px] text-white/30 uppercase">AI</span>
              )}
            </div>
            <span className="text-sm font-mono font-semibold text-white">{player.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
