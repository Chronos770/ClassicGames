import { Chess } from 'chess.js';
import { Difficulty } from '../../engine/types';
import { ChessMoveResult, Square } from './rules';

// Simple AI that doesn't require Stockfish WASM
// Uses minimax with basic evaluation for a self-contained implementation
// Stockfish integration can be added later as an enhancement

const PIECE_VALUES: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

// Piece-square tables for positional evaluation
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

const DEPTH_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 1,
  medium: 3,
  hard: 4,
};

export function evaluateBoard(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -99999 : 99999;
  }
  if (chess.isDraw() || chess.isStalemate()) return 0;

  let score = 0;
  const board = chess.board();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      let value = PIECE_VALUES[piece.type] ?? 0;
      const tableIndex = piece.color === 'w' ? row * 8 + col : (7 - row) * 8 + col;

      if (piece.type === 'p') value += PAWN_TABLE[tableIndex];
      if (piece.type === 'n') value += KNIGHT_TABLE[tableIndex];

      score += piece.color === 'w' ? value : -value;
    }
  }

  return score;
}

function minimax(chess: Chess, depth: number, alpha: number, beta: number, isMax: boolean): number {
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess);
  }

  const moves = chess.moves();

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

export async function getBestMove(
  fen: string,
  difficulty: Difficulty
): Promise<{ from: Square; to: Square; eval?: number } | null> {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  const depth = DEPTH_BY_DIFFICULTY[difficulty];
  const isWhite = chess.turn() === 'w';

  // Add some randomness for easy difficulty
  if (difficulty === 'easy' && Math.random() < 0.3) {
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    return { from: randomMove.from as Square, to: randomMove.to as Square };
  }

  let bestMove = moves[0];
  let bestScore = isWhite ? -Infinity : Infinity;

  for (const move of moves) {
    chess.move(move);
    const score = minimax(chess, depth - 1, -Infinity, Infinity, !isWhite);
    chess.undo();

    if (isWhite ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  // Add slight randomness for medium
  if (difficulty === 'medium' && Math.random() < 0.1) {
    const goodMoves = moves.filter((m) => {
      chess.move(m);
      const s = evaluateBoard(chess);
      chess.undo();
      return Math.abs(s - bestScore) < 50;
    });
    if (goodMoves.length > 0) {
      bestMove = goodMoves[Math.floor(Math.random() * goodMoves.length)];
    }
  }

  return { from: bestMove.from as Square, to: bestMove.to as Square, eval: bestScore };
}
