import { Difficulty } from '../../engine/types';
import { CheckersState, CheckerMove, PieceColor, getAllMoves, applyMove, countPieces, getValidMoves } from './rules';

const DEPTH_MAP: Record<Difficulty, number> = {
  easy: 2,
  medium: 4,
  hard: 7,
};

function evaluateBoard(board: (import('./rules').CheckerPiece | null)[][], color: PieceColor): number {
  let score = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      let value = piece.isKing ? 5 : 3;

      // Positional bonus: center control
      const centerBonus = (3.5 - Math.abs(col - 3.5)) * 0.1;
      value += centerBonus;

      // Advancement bonus for non-kings
      if (!piece.isKing) {
        if (piece.color === 'red') value += (7 - row) * 0.1;
        else value += row * 0.1;
      }

      // Back row protection
      if (piece.color === 'red' && row === 7) value += 0.5;
      if (piece.color === 'black' && row === 0) value += 0.5;

      if (piece.color === color) score += value;
      else score -= value;
    }
  }
  return score;
}

function minimax(
  board: (import('./rules').CheckerPiece | null)[][],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiColor: PieceColor,
  currentColor: PieceColor,
  jumpingPiece?: { row: number; col: number } | null,
): number {
  const moves = getAllMoves(board, currentColor, jumpingPiece);

  if (depth === 0 || moves.length === 0) {
    return evaluateBoard(board, aiColor);
  }

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const wasKing = board[move.fromRow][move.fromCol]?.isKing ?? false;
      const newBoard = applyMove(board, move);

      let nextColor: PieceColor = currentColor === 'red' ? 'black' : 'red';
      let nextJumping: { row: number; col: number } | null = null;

      // Multi-jump (but not if piece was just promoted to king)
      if (move.isJump) {
        const justPromoted = !wasKing && (newBoard[move.toRow][move.toCol]?.isKing ?? false);
        if (!justPromoted) {
          const furtherJumps = getValidMoves(newBoard, move.toRow, move.toCol, { row: move.toRow, col: move.toCol });
          if (furtherJumps.some((m) => m.isJump)) {
            nextColor = currentColor;
            nextJumping = { row: move.toRow, col: move.toCol };
          }
        }
      }

      const evalScore = minimax(newBoard, depth - 1, alpha, beta, nextColor !== aiColor, aiColor, nextColor, nextJumping);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const wasKing = board[move.fromRow][move.fromCol]?.isKing ?? false;
      const newBoard = applyMove(board, move);

      let nextColor: PieceColor = currentColor === 'red' ? 'black' : 'red';
      let nextJumping: { row: number; col: number } | null = null;

      if (move.isJump) {
        const justPromoted = !wasKing && (newBoard[move.toRow][move.toCol]?.isKing ?? false);
        if (!justPromoted) {
          const furtherJumps = getValidMoves(newBoard, move.toRow, move.toCol, { row: move.toRow, col: move.toCol });
          if (furtherJumps.some((m) => m.isJump)) {
            nextColor = currentColor;
            nextJumping = { row: move.toRow, col: move.toCol };
          }
        }
      }

      const evalScore = minimax(newBoard, depth - 1, alpha, beta, nextColor === aiColor, aiColor, nextColor, nextJumping);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function getBestMove(
  state: CheckersState,
  difficulty: Difficulty,
): CheckerMove | null {
  const moves = getAllMoves(state.board, state.currentPlayer, state.jumpingPiece);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  // Easy mode: random move sometimes
  if (difficulty === 'easy' && Math.random() < 0.4) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = DEPTH_MAP[difficulty];
  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    const wasKing = state.board[move.fromRow][move.fromCol]?.isKing ?? false;
    const newBoard = applyMove(state.board, move);

    let nextColor: PieceColor = state.currentPlayer === 'red' ? 'black' : 'red';
    let nextJumping: { row: number; col: number } | null = null;

    if (move.isJump) {
      const justPromoted = !wasKing && (newBoard[move.toRow][move.toCol]?.isKing ?? false);
      if (!justPromoted) {
        const furtherJumps = getValidMoves(newBoard, move.toRow, move.toCol, { row: move.toRow, col: move.toCol });
        if (furtherJumps.some((m) => m.isJump)) {
          nextColor = state.currentPlayer;
          nextJumping = { row: move.toRow, col: move.toCol };
        }
      }
    }

    const score = minimax(newBoard, depth - 1, -Infinity, Infinity, nextColor !== state.currentPlayer, state.currentPlayer, nextColor, nextJumping);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
