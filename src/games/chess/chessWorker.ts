import { Chess, Move } from 'chess.js';

// ─── Piece values (centipawns) ──────────────────────────────────────────────
const PIECE_VALUES: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

// ─── Piece-square tables (from white's perspective, row 0 = rank 8) ─────────

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
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
  b: BISHOP_TABLE,
  r: ROOK_TABLE,
  q: QUEEN_TABLE,
};

// ─── Evaluation ─────────────────────────────────────────────────────────────

function evaluateBoard(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -99999 : 99999;
  }
  if (chess.isDraw() || chess.isStalemate()) return 0;

  const board = chess.board();

  // Count material for endgame detection
  let whiteQueens = 0, blackQueens = 0, whiteMinors = 0, blackMinors = 0;
  let whiteRooks = 0, blackRooks = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      if (p.type === 'q') { if (p.color === 'w') whiteQueens++; else blackQueens++; }
      if (p.type === 'r') { if (p.color === 'w') whiteRooks++; else blackRooks++; }
      if (p.type === 'n' || p.type === 'b') { if (p.color === 'w') whiteMinors++; else blackMinors++; }
    }
  }

  const totalQueens = whiteQueens + blackQueens;
  const totalMinors = whiteMinors + blackMinors;
  const endgame = totalQueens === 0 || (totalQueens <= 2 && totalMinors <= 2);
  const kingTable = endgame ? KING_ENDGAME_TABLE : KING_MIDGAME_TABLE;

  let score = 0;

  // Track pawn files for structure analysis
  const whitePawnFiles = new Set<number>();
  const blackPawnFiles = new Set<number>();
  const whitePawnCount = new Array(8).fill(0);
  const blackPawnCount = new Array(8).fill(0);

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

      // Track pawns
      if (piece.type === 'p') {
        if (piece.color === 'w') {
          whitePawnFiles.add(col);
          whitePawnCount[col]++;
        } else {
          blackPawnFiles.add(col);
          blackPawnCount[col]++;
        }
      }

      score += piece.color === 'w' ? value : -value;
    }
  }

  // Bishop pair bonus (+30 cp)
  if (whiteMinors >= 2) {
    let wb = 0;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'b' && p.color === 'w') wb++;
      }
    if (wb >= 2) score += 30;
  }
  if (blackMinors >= 2) {
    let bb = 0;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'b' && p.color === 'b') bb++;
      }
    if (bb >= 2) score -= 30;
  }

  // Doubled pawns penalty (-15 cp each)
  for (let col = 0; col < 8; col++) {
    if (whitePawnCount[col] > 1) score -= 15 * (whitePawnCount[col] - 1);
    if (blackPawnCount[col] > 1) score += 15 * (blackPawnCount[col] - 1);
  }

  // Isolated pawns penalty (-10 cp each)
  for (let col = 0; col < 8; col++) {
    if (whitePawnCount[col] > 0) {
      const hasNeighbor = (col > 0 && whitePawnCount[col - 1] > 0) || (col < 7 && whitePawnCount[col + 1] > 0);
      if (!hasNeighbor) score -= 10 * whitePawnCount[col];
    }
    if (blackPawnCount[col] > 0) {
      const hasNeighbor = (col > 0 && blackPawnCount[col - 1] > 0) || (col < 7 && blackPawnCount[col + 1] > 0);
      if (!hasNeighbor) score += 10 * blackPawnCount[col];
    }
  }

  // Rook on open/semi-open file bonus
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.type !== 'r') continue;
      if (p.color === 'w') {
        if (whitePawnCount[c] === 0 && blackPawnCount[c] === 0) score += 20; // open file
        else if (whitePawnCount[c] === 0) score += 10; // semi-open
      } else {
        if (whitePawnCount[c] === 0 && blackPawnCount[c] === 0) score -= 20;
        else if (blackPawnCount[c] === 0) score -= 10;
      }
    }
  }

  return score;
}

// ─── Move ordering ──────────────────────────────────────────────────────────

const MVV_LVA: Record<string, number> = {
  p: 1, n: 2, b: 3, r: 4, q: 5, k: 6,
};

function scoreMove(move: Move): number {
  let s = 0;
  if (move.captured) {
    s += 10000 + (MVV_LVA[move.captured] ?? 0) * 100 - (MVV_LVA[move.piece] ?? 0);
  }
  if (move.promotion) {
    s += move.promotion === 'q' ? 9000 : 5000;
  }
  if (move.san.includes('+')) {
    s += 3000;
  }
  return s;
}

function orderMoves(moves: Move[]): Move[] {
  const scored = moves.map(m => ({ move: m, score: scoreMove(m) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.move);
}

// ─── Search with iterative deepening ────────────────────────────────────────

const DEPTH_MAP: Record<string, number> = {
  easy: 2,
  medium: 3,
  hard: 5,
};

function quiesce(chess: Chess, alpha: number, beta: number, isMax: boolean): number {
  const standPat = evaluateBoard(chess);

  if (isMax) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat < beta) beta = standPat;
  }

  // Only search captures at depth 0
  const captures = chess.moves({ verbose: true }).filter(m => m.captured);
  const ordered = orderMoves(captures);

  for (const move of ordered) {
    chess.move(move);
    const score = quiesce(chess, alpha, beta, !isMax);
    chess.undo();

    if (isMax) {
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    } else {
      if (score <= alpha) return alpha;
      if (score < beta) beta = score;
    }
  }

  return isMax ? alpha : beta;
}

function minimax(chess: Chess, depth: number, alpha: number, beta: number, isMax: boolean): number {
  if (depth === 0) {
    return quiesce(chess, alpha, beta, isMax);
  }

  if (chess.isGameOver()) {
    return evaluateBoard(chess);
  }

  const moves = orderMoves(chess.moves({ verbose: true }));

  if (isMax) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const evalScore = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const evalScore = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function search(fen: string, difficulty: string, remainingTimeMs?: number): { from: string; to: string; eval: number } | null {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  let depth = DEPTH_MAP[difficulty] ?? 3;

  if (remainingTimeMs !== undefined) {
    if (remainingTimeMs < 10000) depth = Math.min(depth, 2);
    else if (remainingTimeMs < 30000) depth = Math.min(depth, 3);
  }

  const isWhite = chess.turn() === 'w';

  // Easy: 25% random move
  if (difficulty === 'easy' && Math.random() < 0.25) {
    const m = moves[Math.floor(Math.random() * moves.length)];
    return { from: m.from, to: m.to, eval: 0 };
  }

  const orderedMoves = orderMoves(moves);

  let bestMove = orderedMoves[0];
  let bestScore = isWhite ? -Infinity : Infinity;

  for (const move of orderedMoves) {
    chess.move(move);
    const score = minimax(chess, depth - 1, -Infinity, Infinity, !isWhite);
    chess.undo();

    if (isWhite ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  // Medium: small chance of near-equal alternative
  if (difficulty === 'medium' && Math.random() < 0.1) {
    const candidates: Move[] = [];
    for (const move of orderedMoves) {
      chess.move(move);
      const s = minimax(chess, depth - 2, -Infinity, Infinity, !isWhite);
      chess.undo();
      if (Math.abs(s - bestScore) < 40) candidates.push(move);
    }
    if (candidates.length > 1) {
      bestMove = candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  return { from: bestMove.from, to: bestMove.to, eval: bestScore };
}

// ─── Worker message handler ─────────────────────────────────────────────────

self.onmessage = (e: MessageEvent) => {
  const { id, fen, difficulty, remainingTimeMs } = e.data;
  const result = search(fen, difficulty, remainingTimeMs);
  self.postMessage({ id, result });
};
