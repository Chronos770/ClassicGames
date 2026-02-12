import { Chess, Move } from 'chess.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PIECE VALUES (centipawns)
// ═══════════════════════════════════════════════════════════════════════════════

const PIECE_VALUES: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PIECE-SQUARE TABLES (from white's perspective, row 0 = rank 8)
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATION (returns score from White's perspective)
// ═══════════════════════════════════════════════════════════════════════════════

// Passed pawn bonus by rank (index = rank, from white's perspective)
const PASSED_PAWN_BONUS    = [0, 0, 10, 20, 40, 70, 120, 0];
const PASSED_PAWN_ENDGAME  = [0, 0, 20, 40, 70, 120, 200, 0];

function evaluateBoard(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -99999 : 99999;
  }
  if (chess.isDraw() || chess.isStalemate()) return 0;

  const board = chess.board();

  // Count material for endgame detection
  let whiteQueens = 0, blackQueens = 0, whiteMinors = 0, blackMinors = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      if (p.type === 'q') { if (p.color === 'w') whiteQueens++; else blackQueens++; }
      if (p.type === 'n' || p.type === 'b') { if (p.color === 'w') whiteMinors++; else blackMinors++; }
    }
  }

  const totalQueens = whiteQueens + blackQueens;
  const totalMinors = whiteMinors + blackMinors;
  const endgame = totalQueens === 0 || (totalQueens <= 2 && totalMinors <= 2);
  const kingTable = endgame ? KING_ENDGAME_TABLE : KING_MIDGAME_TABLE;

  let score = 0;

  // Pawn structure tracking
  const whitePawnCount = new Array(8).fill(0);
  const blackPawnCount = new Array(8).fill(0);
  let whiteKingRow = 7, whiteKingCol = 4;
  let blackKingRow = 0, blackKingCol = 4;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      let value = PIECE_VALUES[piece.type] ?? 0;
      const idx = piece.color === 'w' ? row * 8 + col : (7 - row) * 8 + col;

      if (piece.type === 'k') {
        value += kingTable[idx];
        if (piece.color === 'w') { whiteKingRow = row; whiteKingCol = col; }
        else { blackKingRow = row; blackKingCol = col; }
      } else {
        const table = PST[piece.type];
        if (table) value += table[idx];
      }

      if (piece.type === 'p') {
        if (piece.color === 'w') whitePawnCount[col]++;
        else blackPawnCount[col]++;
      }

      score += piece.color === 'w' ? value : -value;
    }
  }

  // Bishop pair bonus
  let whiteBishops = 0, blackBishops = 0;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'b') { if (p.color === 'w') whiteBishops++; else blackBishops++; }
    }
  if (whiteBishops >= 2) score += 30;
  if (blackBishops >= 2) score -= 30;

  // Doubled pawns penalty
  for (let col = 0; col < 8; col++) {
    if (whitePawnCount[col] > 1) score -= 15 * (whitePawnCount[col] - 1);
    if (blackPawnCount[col] > 1) score += 15 * (blackPawnCount[col] - 1);
  }

  // Isolated pawns penalty
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

  // Rook on open/semi-open file
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.type !== 'r') continue;
      if (p.color === 'w') {
        if (whitePawnCount[c] === 0 && blackPawnCount[c] === 0) score += 20;
        else if (whitePawnCount[c] === 0) score += 10;
      } else {
        if (whitePawnCount[c] === 0 && blackPawnCount[c] === 0) score -= 20;
        else if (blackPawnCount[c] === 0) score -= 10;
      }
    }
  }

  // Passed pawns
  for (let col = 0; col < 8; col++) {
    // White passed pawns (scan from rank 7 down to rank 2)
    if (whitePawnCount[col] > 0) {
      for (let row = 1; row <= 6; row++) {
        const p = board[row][col];
        if (!p || p.type !== 'p' || p.color !== 'w') continue;
        let passed = true;
        for (let r = row - 1; r >= 0 && passed; r--) {
          for (let c = Math.max(0, col - 1); c <= Math.min(7, col + 1); c++) {
            const bp = board[r][c];
            if (bp && bp.type === 'p' && bp.color === 'b') { passed = false; break; }
          }
        }
        if (passed) {
          const rank = 8 - row;
          score += endgame ? PASSED_PAWN_ENDGAME[rank] : PASSED_PAWN_BONUS[rank];
        }
        break;
      }
    }
    // Black passed pawns (scan from rank 2 up to rank 7)
    if (blackPawnCount[col] > 0) {
      for (let row = 6; row >= 1; row--) {
        const p = board[row][col];
        if (!p || p.type !== 'p' || p.color !== 'b') continue;
        let passed = true;
        for (let r = row + 1; r <= 7 && passed; r++) {
          for (let c = Math.max(0, col - 1); c <= Math.min(7, col + 1); c++) {
            const wp = board[r][c];
            if (wp && wp.type === 'p' && wp.color === 'w') { passed = false; break; }
          }
        }
        if (passed) {
          const rank = row + 1;
          score -= endgame ? PASSED_PAWN_ENDGAME[rank] : PASSED_PAWN_BONUS[rank];
        }
        break;
      }
    }
  }

  // King pawn shield (midgame only)
  if (!endgame) {
    // White king shield
    const wShieldRow = whiteKingRow - 1;
    if (wShieldRow >= 0) {
      for (let c = Math.max(0, whiteKingCol - 1); c <= Math.min(7, whiteKingCol + 1); c++) {
        const p = board[wShieldRow][c];
        if (p && p.type === 'p' && p.color === 'w') score += 10;
      }
    }
    // Black king shield
    const bShieldRow = blackKingRow + 1;
    if (bShieldRow <= 7) {
      for (let c = Math.max(0, blackKingCol - 1); c <= Math.min(7, blackKingCol + 1); c++) {
        const p = board[bShieldRow][c];
        if (p && p.type === 'p' && p.color === 'b') score -= 10;
      }
    }
  }

  // Tempo bonus: side to move has a small edge (breaks ties, discourages shuffling)
  score += chess.turn() === 'w' ? 12 : -12;

  return score;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSPOSITION TABLE
// ═══════════════════════════════════════════════════════════════════════════════

const TT_EXACT = 0;
const TT_LOWER = 1; // Score is at least this (beta cutoff)
const TT_UPPER = 2; // Score is at most this (failed low)

interface TTEntry {
  depth: number;
  score: number;
  flag: number;
  bestMove: string | null;
}

const tt = new Map<string, TTEntry>();
const TT_MAX = 500_000;

function ttKey(chess: Chess): string {
  return chess.fen().split(' ').slice(0, 4).join(' ');
}

function ttProbe(key: string, depth: number, alpha: number, beta: number):
  { hit: boolean; score: number; bestMove: string | null } {
  const entry = tt.get(key);
  if (!entry) return { hit: false, score: 0, bestMove: null };

  // Always return best move hint even if depth insufficient
  if (entry.depth < depth) return { hit: false, score: 0, bestMove: entry.bestMove };

  if (entry.flag === TT_EXACT) return { hit: true, score: entry.score, bestMove: entry.bestMove };
  if (entry.flag === TT_LOWER && entry.score >= beta) return { hit: true, score: entry.score, bestMove: entry.bestMove };
  if (entry.flag === TT_UPPER && entry.score <= alpha) return { hit: true, score: entry.score, bestMove: entry.bestMove };

  return { hit: false, score: 0, bestMove: entry.bestMove };
}

function ttStore(key: string, depth: number, score: number, flag: number, bestMove: string | null): void {
  const existing = tt.get(key);
  if (!existing || existing.depth <= depth) {
    if (!existing && tt.size >= TT_MAX) {
      // Evict ~25% oldest entries
      let toDelete = TT_MAX >> 2;
      for (const k of tt.keys()) {
        if (toDelete-- <= 0) break;
        tt.delete(k);
      }
    }
    tt.set(key, { depth, score, flag, bestMove });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH STATE (reset per search call)
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_PLY = 64;
let killers: [string | null, string | null][];
let historyScores: Map<string, number>;
let nodes: number;
let searchTimeUp: boolean;
let searchDeadline: number;

function initSearch(): void {
  killers = Array.from({ length: MAX_PLY }, () => [null, null]);
  historyScores = new Map();
  nodes = 0;
  searchTimeUp = false;
}

function checkTime(): void {
  if ((++nodes & 2047) === 0) {
    searchTimeUp = performance.now() >= searchDeadline;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOVE ORDERING
// ═══════════════════════════════════════════════════════════════════════════════

const MVV_LVA: Record<string, number> = { p: 1, n: 2, b: 3, r: 4, q: 5, k: 6 };

function scoreMoveForOrder(move: Move, ttBest: string | null, ply: number): number {
  if (ttBest && move.san === ttBest) return 100_000;

  let s = 0;
  if (move.captured) {
    s += 10_000 + (MVV_LVA[move.captured] ?? 0) * 100 - (MVV_LVA[move.piece] ?? 0);
  }
  if (move.promotion) s += move.promotion === 'q' ? 9_000 : 5_000;
  if (move.san.includes('+')) s += 3_000;

  if (ply < MAX_PLY) {
    if (killers[ply][0] === move.san) s += 2_000;
    else if (killers[ply][1] === move.san) s += 1_500;
  }

  const hKey = `${move.piece}${move.from}${move.to}`;
  s += Math.min(historyScores.get(hKey) ?? 0, 900);

  return s;
}

function orderMoves(moves: Move[], ttBest: string | null, ply: number): Move[] {
  return moves
    .map(m => ({ m, s: scoreMoveForOrder(m, ttBest, ply) }))
    .sort((a, b) => b.s - a.s)
    .map(x => x.m);
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUIESCENCE SEARCH (negamax style — captures only)
// ═══════════════════════════════════════════════════════════════════════════════

function quiesce(chess: Chess, alpha: number, beta: number, ply: number): number {
  checkTime();
  if (searchTimeUp) return 0;

  const color = chess.turn() === 'w' ? 1 : -1;
  const standPat = color * evaluateBoard(chess);

  if (ply >= MAX_PLY) return standPat;
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;

  const captures = chess.moves({ verbose: true }).filter(m => m.captured);
  captures.sort((a, b) =>
    ((MVV_LVA[b.captured!] ?? 0) * 10 - (MVV_LVA[b.piece] ?? 0)) -
    ((MVV_LVA[a.captured!] ?? 0) * 10 - (MVV_LVA[a.piece] ?? 0))
  );

  for (const move of captures) {
    chess.move(move);
    const score = -quiesce(chess, -beta, -alpha, ply + 1);
    chess.undo();

    if (searchTimeUp) return 0;
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }

  return alpha;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEGAMAX with TT, LMR, Killer Moves, Check Extensions
// ═══════════════════════════════════════════════════════════════════════════════

function negamax(chess: Chess, depth: number, alpha: number, beta: number, ply: number): number {
  checkTime();
  if (searchTimeUp) return 0;

  // Check extension: search deeper when in check
  const inCheck = chess.isCheck();
  if (inCheck && ply < MAX_PLY) depth++;

  if (depth <= 0) return quiesce(chess, alpha, beta, ply);

  if (chess.isGameOver()) {
    const color = chess.turn() === 'w' ? 1 : -1;
    return color * evaluateBoard(chess);
  }

  // TT probe
  const key = ttKey(chess);
  const probe = ttProbe(key, depth, alpha, beta);
  if (probe.hit) return probe.score;

  const origAlpha = alpha;
  let bestScore = -99_999;
  let bestMoveSan: string | null = null;

  const moves = orderMoves(chess.moves({ verbose: true }), probe.bestMove, ply);
  let searched = 0;

  for (const move of moves) {
    chess.move(move);

    let score: number;

    // Late Move Reductions: search later quiet moves at reduced depth
    if (searched >= 3 && depth >= 3 && !move.captured && !move.promotion && !inCheck && !chess.isCheck()) {
      const R = searched >= 6 ? 2 : 1;
      // Reduced scout search
      score = -negamax(chess, depth - 1 - R, -alpha - 1, -alpha, ply + 1);
      // Re-search at full depth if promising
      if (!searchTimeUp && score > alpha) {
        score = -negamax(chess, depth - 1, -beta, -alpha, ply + 1);
      }
    } else {
      score = -negamax(chess, depth - 1, -beta, -alpha, ply + 1);
    }

    chess.undo();
    searched++;

    if (searchTimeUp) return 0;

    if (score > bestScore) {
      bestScore = score;
      bestMoveSan = move.san;
    }
    if (score > alpha) alpha = score;
    if (alpha >= beta) {
      // Beta cutoff — store killer and history for quiet moves
      if (!move.captured && ply < MAX_PLY) {
        if (killers[ply][0] !== move.san) {
          killers[ply][1] = killers[ply][0];
          killers[ply][0] = move.san;
        }
        const hKey = `${move.piece}${move.from}${move.to}`;
        historyScores.set(hKey, (historyScores.get(hKey) ?? 0) + depth * depth);
      }
      break;
    }
  }

  // TT store
  let flag: number;
  if (bestScore <= origAlpha) flag = TT_UPPER;
  else if (bestScore >= beta) flag = TT_LOWER;
  else flag = TT_EXACT;
  ttStore(key, depth, bestScore, flag, bestMoveSan);

  return bestScore;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPENING BOOK
// ═══════════════════════════════════════════════════════════════════════════════

const BOOK_LINES: string[][] = [
  // === KING PAWN OPENINGS (1.e4) ===
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+'],
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Bc5', 'O-O', 'O-O'],
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5'],
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6'],
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4', 'd4', 'Nd6', 'Bxc6', 'dxc6', 'dxe5', 'Nf5'],
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Bc5', 'c3', 'Nf6', 'O-O', 'O-O', 'd4'],
  ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Be3', 'Qf6', 'c3', 'Nge7'],
  ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nxc6', 'bxc6', 'e5', 'Qe7'],
  ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'd6', 'Nf3', 'Nxe4', 'd4', 'd5', 'Bd3', 'Nc6'],
  ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be2', 'e5'],
  ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7'],
  ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6'],
  ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'Nf3', 'Nc6'],
  ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5', 'a3', 'Bxc3+', 'bxc3'],
  ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e5', 'Nfd7', 'Bxe7', 'Qxe7'],
  ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Qb6', 'a3'],
  ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6', 'Nf3'],
  ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6', 'Be2', 'c5', 'Be3'],
  // === QUEEN PAWN OPENINGS (1.d4) ===
  ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7', 'Rc1'],
  ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5', 'Bg5', 'Be7', 'e3', 'O-O', 'Bd3'],
  ['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6', 'Bxc4', 'c5', 'O-O', 'a6'],
  ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5', 'e3', 'e6'],
  ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'c5', 'e3', 'Nc6', 'Nbd2', 'e6', 'c3', 'Bd6'],
  ['d4', 'Nf6', 'Nf3', 'e6', 'Bf4', 'd5', 'e3', 'Bd6', 'Bg3', 'O-O', 'Bd3'],
  ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'Be7', 'Nf3', 'O-O', 'O-O', 'dxc4'],
  ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'd5'],
  ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3', 'O-O', 'Be3', 'e5'],
  ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Bd3', 'd5', 'Nf3', 'c5'],
  ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2', 'O-O', 'a3', 'Bxc3+', 'Qxc3', 'd5'],
  ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6', 'g3', 'Bb7', 'Bg2', 'Be7', 'O-O', 'O-O'],
  ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3', 'Bg7'],
  // === FLANK OPENINGS ===
  ['c4', 'e5', 'Nc3', 'Nf6', 'Nf3', 'Nc6', 'g3', 'd5', 'cxd5', 'Nxd5', 'Bg2'],
  ['c4', 'c5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'g3', 'd5', 'cxd5', 'Nxd5'],
  ['Nf3', 'd5', 'g3', 'Nf6', 'Bg2', 'c6', 'O-O', 'Bg4', 'd3', 'Nbd7', 'Nbd2'],
];

const openingBook = new Map<string, string[]>();

function buildOpeningBook(): void {
  for (const line of BOOK_LINES) {
    const chess = new Chess();
    for (const san of line) {
      const key = chess.fen().split(' ').slice(0, 4).join(' ');
      if (!openingBook.has(key)) openingBook.set(key, []);
      const moves = openingBook.get(key)!;
      if (!moves.includes(san)) moves.push(san);
      const result = chess.move(san);
      if (!result) break;
    }
  }
}

buildOpeningBook();

function getBookMove(fen: string): string | null {
  const key = fen.split(' ').slice(0, 4).join(' ');
  const moves = openingBook.get(key);
  if (!moves || moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ITERATIVE DEEPENING SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

function search(fen: string, difficulty: string, remainingTimeMs?: number): { from: string; to: string; eval: number } | null {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Only one legal move — play it instantly
  if (moves.length === 1) {
    return { from: moves[0].from, to: moves[0].to, eval: 0 };
  }

  // Opening book for medium and hard
  if (difficulty !== 'easy') {
    const bookSan = getBookMove(fen);
    if (bookSan) {
      try {
        const result = chess.move(bookSan);
        if (result) {
          chess.undo();
          return { from: result.from, to: result.to, eval: 0 };
        }
      } catch { /* fall through to search */ }
    }
  }

  // Easy: 25% random move
  if (difficulty === 'easy' && Math.random() < 0.25) {
    const m = moves[Math.floor(Math.random() * moves.length)];
    return { from: m.from, to: m.to, eval: 0 };
  }

  // Time management
  let timeLimitMs: number;
  let maxDepth: number;

  if (difficulty === 'hard') {
    timeLimitMs = 8000; maxDepth = 64;
  } else if (difficulty === 'medium') {
    timeLimitMs = 3000; maxDepth = 10;
  } else {
    timeLimitMs = 1500; maxDepth = 5;
  }

  // Reduce when clock is low
  if (remainingTimeMs !== undefined) {
    if (remainingTimeMs < 5000) { timeLimitMs = Math.min(timeLimitMs, 500); maxDepth = Math.min(maxDepth, 3); }
    else if (remainingTimeMs < 15000) { timeLimitMs = Math.min(timeLimitMs, 2000); maxDepth = Math.min(maxDepth, 6); }
    else if (remainingTimeMs < 30000) { timeLimitMs = Math.min(timeLimitMs, 3000); }
  }

  initSearch();
  searchDeadline = performance.now() + timeLimitMs;

  const color = chess.turn() === 'w' ? 1 : -1;
  let bestMove = moves[0];
  let bestEval = 0;

  // Iterative deepening: search depth 1, 2, 3, ... up to time limit
  // Each iteration uses TT from previous to order moves better
  for (let depth = 1; depth <= maxDepth; depth++) {
    let depthBest: Move | null = null;
    let depthScore = -Infinity;
    let alpha = -Infinity;

    // Get TT best move for root ordering
    const key = ttKey(chess);
    const ttEntry = tt.get(key);
    const rootMoves = orderMoves(moves, ttEntry?.bestMove ?? null, 0);

    for (const move of rootMoves) {
      chess.move(move);
      const score = -negamax(chess, depth - 1, -Infinity, -alpha, 1);
      chess.undo();

      if (searchTimeUp) break;

      if (score > depthScore) {
        depthScore = score;
        depthBest = move;
      }
      alpha = Math.max(alpha, score);
    }

    // Only use completed iteration results
    if (searchTimeUp && depth > 1) break;

    if (depthBest) {
      bestMove = depthBest;
      bestEval = color * depthScore;
    }

    // Store root result in TT for next iteration's move ordering
    if (depthBest) {
      ttStore(key, depth, depthScore, TT_EXACT, depthBest.san);
    }

    // If we found a forced mate, stop searching deeper
    if (Math.abs(depthScore) > 90000) break;
  }

  return { from: bestMove.from, to: bestMove.to, eval: bestEval };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

self.onmessage = (e: MessageEvent) => {
  const { id, fen, difficulty, remainingTimeMs } = e.data;
  const result = search(fen, difficulty, remainingTimeMs);
  self.postMessage({ id, result });
};
