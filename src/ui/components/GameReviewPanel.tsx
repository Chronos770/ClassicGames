import { useState } from 'react';
import { motion } from 'framer-motion';
import { ReviewedMove, GameReviewResult, QUALITY_COLORS, QUALITY_SYMBOLS, MoveQuality } from '../../games/chess/ChessReview';

interface GameReviewPanelProps {
  review: GameReviewResult;
  onSelectMove: (moveIndex: number) => void;
  currentMoveIndex: number;
}

export default function GameReviewPanel({ review, onSelectMove, currentMoveIndex }: GameReviewPanelProps) {
  const [showSummary, setShowSummary] = useState(true);

  const qualityOrder: MoveQuality[] = ['brilliant', 'great', 'good', 'book', 'inaccuracy', 'mistake', 'blunder'];

  return (
    <div className="glass-panel !p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/80">Game Review</h3>
        <div className="text-xs">
          <span className="text-white/40">Accuracy: </span>
          <span className={`font-mono font-bold ${
            review.averageAccuracy >= 80 ? 'text-green-400' :
            review.averageAccuracy >= 60 ? 'text-yellow-400' : 'text-red-400'
          }`}>{review.averageAccuracy}%</span>
        </div>
      </div>

      {/* Summary */}
      <button
        onClick={() => setShowSummary(!showSummary)}
        className="text-[10px] text-white/30 hover:text-white/50 transition-colors"
      >
        {showSummary ? 'Hide summary' : 'Show summary'}
      </button>

      {showSummary && (
        <div className="grid grid-cols-4 gap-1.5">
          {qualityOrder.filter((q) => review.summary[q] > 0).map((quality) => (
            <div key={quality} className="text-center p-1.5 rounded bg-white/[0.03]">
              <div
                className="text-sm font-mono font-bold"
                style={{ color: QUALITY_COLORS[quality] }}
              >
                {review.summary[quality]}
              </div>
              <div className="text-[9px] text-white/30 capitalize">{quality}</div>
            </div>
          ))}
        </div>
      )}

      {/* Eval bar */}
      <div className="h-4 bg-gray-800 rounded-full overflow-hidden flex">
        {(() => {
          const currentMove = review.moves[currentMoveIndex];
          const eval_ = currentMove?.evalAfter ?? 0;
          const whitePercent = Math.max(5, Math.min(95,
            50 + (eval_ / 100) * 25
          ));
          return (
            <>
              <div
                className="bg-white transition-all duration-300 rounded-l-full"
                style={{ width: `${whitePercent}%` }}
              />
              <div
                className="bg-gray-600 transition-all duration-300 rounded-r-full"
                style={{ width: `${100 - whitePercent}%` }}
              />
            </>
          );
        })()}
      </div>
      <div className="flex justify-between text-[10px] text-white/30">
        <span>White</span>
        <span className="font-mono">
          {(() => {
            const e = review.moves[currentMoveIndex]?.evalAfter ?? 0;
            return e >= 0 ? `+${(e / 100).toFixed(1)}` : (e / 100).toFixed(1);
          })()}
        </span>
        <span>Black</span>
      </div>

      {/* Move navigation */}
      <div className="flex gap-1 justify-center">
        <button
          onClick={() => onSelectMove(0)}
          disabled={currentMoveIndex === 0}
          className="px-2 py-1 text-xs bg-white/5 rounded hover:bg-white/10 disabled:opacity-30"
        >
          {'\u23EA'}
        </button>
        <button
          onClick={() => onSelectMove(Math.max(0, currentMoveIndex - 1))}
          disabled={currentMoveIndex === 0}
          className="px-2 py-1 text-xs bg-white/5 rounded hover:bg-white/10 disabled:opacity-30"
        >
          {'\u25C0'}
        </button>
        <button
          onClick={() => onSelectMove(Math.min(review.moves.length - 1, currentMoveIndex + 1))}
          disabled={currentMoveIndex >= review.moves.length - 1}
          className="px-2 py-1 text-xs bg-white/5 rounded hover:bg-white/10 disabled:opacity-30"
        >
          {'\u25B6'}
        </button>
        <button
          onClick={() => onSelectMove(review.moves.length - 1)}
          disabled={currentMoveIndex >= review.moves.length - 1}
          className="px-2 py-1 text-xs bg-white/5 rounded hover:bg-white/10 disabled:opacity-30"
        >
          {'\u23E9'}
        </button>
      </div>

      {/* Move list */}
      <div className="max-h-48 overflow-y-auto space-y-0.5">
        {review.moves.map((rm, i) => {
          const pairStart = i % 2 === 0;
          if (!pairStart) return null;
          const whiteMove = rm;
          const blackMove = review.moves[i + 1];

          return (
            <div key={i} className="grid grid-cols-[1.5rem_1fr_1fr] gap-x-1 text-xs">
              <span className="text-white/20 text-right font-mono">{rm.moveNumber}.</span>
              <button
                onClick={() => onSelectMove(i)}
                className={`text-left px-1 rounded transition-colors flex items-center gap-1 ${
                  currentMoveIndex === i ? 'bg-amber-500/20 text-white' : 'text-white/60 hover:bg-white/5'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: QUALITY_COLORS[whiteMove.quality] }}
                />
                <span className="font-mono">
                  {whiteMove.move.san}
                  {QUALITY_SYMBOLS[whiteMove.quality] && (
                    <span style={{ color: QUALITY_COLORS[whiteMove.quality] }}>
                      {QUALITY_SYMBOLS[whiteMove.quality]}
                    </span>
                  )}
                </span>
              </button>
              {blackMove && (
                <button
                  onClick={() => onSelectMove(i + 1)}
                  className={`text-left px-1 rounded transition-colors flex items-center gap-1 ${
                    currentMoveIndex === i + 1 ? 'bg-amber-500/20 text-white' : 'text-white/60 hover:bg-white/5'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: QUALITY_COLORS[blackMove.quality] }}
                  />
                  <span className="font-mono">
                    {blackMove.move.san}
                    {QUALITY_SYMBOLS[blackMove.quality] && (
                      <span style={{ color: QUALITY_COLORS[blackMove.quality] }}>
                        {QUALITY_SYMBOLS[blackMove.quality]}
                      </span>
                    )}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
