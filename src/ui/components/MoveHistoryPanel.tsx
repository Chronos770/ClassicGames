import { useEffect, useRef } from 'react';

interface MoveInfo {
  san: string;
  from?: string;
  to?: string;
  captured?: string;
  color?: string;
  piece?: string;
  flags?: string;
}

interface MoveHistoryPanelProps {
  moves: MoveInfo[];
}

const PIECE_ICONS: Record<string, Record<string, string>> = {
  w: { k: '\u2654', q: '\u2655', r: '\u2656', b: '\u2657', n: '\u2658', p: '' },
  b: { k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '' },
};

function formatMove(move: MoveInfo): { icon: string; text: string; isCapture: boolean; isCheck: boolean; isCastle: boolean } {
  const color = move.color ?? 'w';
  const piece = move.piece ?? 'p';
  const icon = PIECE_ICONS[color]?.[piece] ?? '';
  const isCapture = !!move.captured;
  const isCheck = move.san.includes('+');
  const isCheckmate = move.san.includes('#');
  const isCastle = move.san.startsWith('O-');

  let text = move.san;
  // Make SAN more readable
  if (isCastle) {
    text = move.san === 'O-O' ? 'O-O' : 'O-O-O';
  }

  return { icon, text, isCapture, isCheck: isCheck || isCheckmate, isCastle };
}

export default function MoveHistoryPanel({ moves }: MoveHistoryPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves.length]);

  if (moves.length === 0) {
    return (
      <div className="glass-panel p-3">
        <h3 className="text-xs text-white/40 uppercase tracking-wider mb-2">Moves</h3>
        <p className="text-xs text-white/20 text-center py-4">No moves yet</p>
      </div>
    );
  }

  // Group moves into pairs (white, black)
  const pairs: { num: number; white: MoveInfo; black?: MoveInfo }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      num: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  const lastMoveIdx = moves.length - 1;

  const renderMove = (move: MoveInfo, idx: number) => {
    const { icon, text, isCapture, isCheck, isCastle } = formatMove(move);
    const isLast = idx === lastMoveIdx;

    return (
      <span
        className={`cursor-pointer transition-colors px-1 rounded ${
          isLast
            ? 'bg-amber-500/20 text-amber-400'
            : 'text-white/70 hover:text-amber-400 hover:bg-white/5'
        } ${isCheck ? 'font-bold' : ''}`}
      >
        {icon && <span className="mr-0.5">{icon}</span>}
        <span className={isCapture ? 'text-red-400' : ''}>{text}</span>
      </span>
    );
  };

  return (
    <div className="glass-panel p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs text-white/40 uppercase tracking-wider">Moves</h3>
        <span className="text-xs text-white/30">{moves.length} moves</span>
      </div>
      <div ref={scrollRef} className="max-h-52 overflow-y-auto scrollbar-thin">
        <div className="grid grid-cols-[2rem_1fr_1fr] gap-x-1 gap-y-0.5 text-sm font-mono">
          {pairs.map((pair, i) => (
            <div key={pair.num} className="contents">
              <span className="text-white/25 text-right text-xs leading-6">{pair.num}.</span>
              {renderMove(pair.white, i * 2)}
              {pair.black ? renderMove(pair.black, i * 2 + 1) : <span />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
