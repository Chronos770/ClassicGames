import { Chess } from 'chess.js';
import { Difficulty } from '../../engine/types';
import { Square } from './rules';

// ─── Web Worker for off-thread search ───────────────────────────────────────

let worker: Worker | null = null;
let requestId = 0;
const pendingRequests = new Map<number, (result: any) => void>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./chessWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent) => {
      const { id, result } = e.data;
      const resolve = pendingRequests.get(id);
      if (resolve) {
        pendingRequests.delete(id);
        resolve(result);
      }
    };
    worker.onerror = () => {
      // Worker crashed — resolve all pending requests with null so the game doesn't freeze
      for (const [, resolve] of pendingRequests) {
        resolve(null);
      }
      pendingRequests.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

export async function getBestMove(
  fen: string,
  difficulty: Difficulty,
  remainingTimeMs?: number
): Promise<{ from: Square; to: Square; eval?: number } | null> {
  const id = ++requestId;

  return new Promise((resolve) => {
    let settled = false;
    const settle = (result: any) => {
      if (settled) return;
      settled = true;
      pendingRequests.delete(id);
      if (!result) {
        resolve(null);
      } else {
        resolve({
          from: result.from as Square,
          to: result.to as Square,
          eval: result.eval,
        });
      }
    };

    pendingRequests.set(id, settle);

    // Safety timeout: if worker doesn't respond in 15s, resolve null so game doesn't freeze
    setTimeout(() => settle(null), 15000);

    getWorker().postMessage({ id, fen, difficulty, remainingTimeMs });
  });
}

// ─── Evaluation (kept here for ChessReview.ts which runs on main thread) ───

const PIECE_VALUES: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

const PAWN_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_TABLE = [
 -50,-40,-30,-30,-30,-30,-40,-50,
 -40,-20,  0,  0,  0,  0,-20,-40,
 -30,  0, 10, 15, 15, 10,  0,-30,
 -30,  5, 15, 20, 20, 15,  5,-30,
 -30,  0, 15, 20, 20, 15,  0,-30,
 -30,  5, 10, 15, 15, 10,  5,-30,
 -40,-20,  0,  5,  5,  0,-20,-40,
 -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_TABLE = [
 -20,-10,-10,-10,-10,-10,-10,-20,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -10,  0, 10, 10, 10, 10,  0,-10,
 -10,  5,  5, 10, 10,  5,  5,-10,
 -10,  0, 10, 10, 10, 10,  0,-10,
 -10, 10, 10, 10, 10, 10, 10,-10,
 -10,  5,  0,  0,  0,  0,  5,-10,
 -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];

const QUEEN_TABLE = [
 -20,-10,-10, -5, -5,-10,-10,-20,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
   0,  0,  5,  5,  5,  5,  0, -5,
 -10,  5,  5,  5,  5,  5,  0,-10,
 -10,  0,  5,  0,  0,  0,  0,-10,
 -20,-10,-10, -5, -5,-10,-10,-20,
];

const KING_MIDGAME_TABLE = [
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -20,-30,-30,-40,-40,-30,-30,-20,
 -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20,
];

const KING_ENDGAME_TABLE = [
 -50,-40,-30,-20,-20,-30,-40,-50,
 -30,-20,-10,  0,  0,-10,-20,-30,
 -30,-10, 20, 30, 30, 20,-10,-30,
 -30,-10, 30, 40, 40, 30,-10,-30,
 -30,-10, 30, 40, 40, 30,-10,-30,
 -30,-10, 20, 30, 30, 20,-10,-30,
 -30,-30,  0,  0,  0,  0,-30,-30,
 -50,-30,-30,-30,-30,-30,-30,-50,
];

const PST: Record<string, number[]> = {
  p: PAWN_TABLE, n: KNIGHT_TABLE, b: BISHOP_TABLE, r: ROOK_TABLE, q: QUEEN_TABLE,
};

export function evaluateBoard(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -99999 : 99999;
  }
  if (chess.isDraw() || chess.isStalemate()) return 0;

  const board = chess.board();
  let totalQueens = 0, totalMinors = 0;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      if (p.type === 'q') totalQueens++;
      if (p.type === 'n' || p.type === 'b') totalMinors++;
    }

  const endgame = totalQueens === 0 || (totalQueens <= 2 && totalMinors <= 2);
  const kingTable = endgame ? KING_ENDGAME_TABLE : KING_MIDGAME_TABLE;
  let score = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      let value = PIECE_VALUES[piece.type] ?? 0;
      const idx = piece.color === 'w' ? row * 8 + col : (7 - row) * 8 + col;

      if (piece.type === 'k') {
        value += kingTable[idx];
      } else {
        const table = PST[piece.type];
        if (table) value += table[idx];
      }

      score += piece.color === 'w' ? value : -value;
    }
  }

  return score;
}
