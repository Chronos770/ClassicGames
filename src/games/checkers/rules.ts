export type PieceColor = 'red' | 'black';

export interface CheckerPiece {
  color: PieceColor;
  isKing: boolean;
}

export interface CheckersState {
  board: (CheckerPiece | null)[][];
  currentPlayer: PieceColor;
  phase: 'playing' | 'finished';
  selectedPiece: { row: number; col: number } | null;
  mustJump: boolean;
  jumpingPiece: { row: number; col: number } | null;
  winner: PieceColor | null;
  redCount: number;
  blackCount: number;
}

export interface CheckerMove {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  isJump: boolean;
  capturedRow?: number;
  capturedCol?: number;
}

export function createInitialBoard(): (CheckerPiece | null)[][] {
  const board: (CheckerPiece | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));

  // Black pieces (top)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'black', isKing: false };
      }
    }
  }

  // Red pieces (bottom)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'red', isKing: false };
      }
    }
  }

  return board;
}

export function getValidMoves(board: (CheckerPiece | null)[][], row: number, col: number, mustJumpFrom?: { row: number; col: number } | null): CheckerMove[] {
  const piece = board[row][col];
  if (!piece) return [];

  // If must continue jumping with specific piece
  if (mustJumpFrom && (mustJumpFrom.row !== row || mustJumpFrom.col !== col)) {
    return [];
  }

  const moves: CheckerMove[] = [];
  const directions = piece.isKing
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.color === 'red'
      ? [[-1, -1], [-1, 1]]  // Red moves up
      : [[1, -1], [1, 1]];   // Black moves down

  // FIX BUG 3: Non-king pieces can only jump forward, not backward.
  // Kings can jump in all 4 directions.
  const jumpDirs = piece.isKing
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.color === 'red'
      ? [[-1, -1], [-1, 1]]  // Red jumps up
      : [[1, -1], [1, 1]];   // Black jumps down

  for (const [dr, dc] of jumpDirs) {
    const midRow = row + dr;
    const midCol = col + dc;
    const toRow = row + 2 * dr;
    const toCol = col + 2 * dc;

    if (toRow >= 0 && toRow < 8 && toCol >= 0 && toCol < 8) {
      const midPiece = board[midRow][midCol];
      if (midPiece && midPiece.color !== piece.color && !board[toRow][toCol]) {
        moves.push({
          fromRow: row, fromCol: col,
          toRow, toCol,
          isJump: true,
          capturedRow: midRow, capturedCol: midCol,
        });
      }
    }
  }

  // Regular moves (only if no jumps available and not mid-jump)
  if (moves.length === 0 && !mustJumpFrom) {
    for (const [dr, dc] of directions) {
      const toRow = row + dr;
      const toCol = col + dc;
      if (toRow >= 0 && toRow < 8 && toCol >= 0 && toCol < 8 && !board[toRow][toCol]) {
        moves.push({
          fromRow: row, fromCol: col,
          toRow, toCol,
          isJump: false,
        });
      }
    }
  }

  return moves;
}

export function getAllMoves(board: (CheckerPiece | null)[][], color: PieceColor, jumpingPiece?: { row: number; col: number } | null): CheckerMove[] {
  const moves: CheckerMove[] = [];
  let hasJumps = false;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || piece.color !== color) continue;

      const pieceMoves = getValidMoves(board, row, col, jumpingPiece);
      for (const m of pieceMoves) {
        if (m.isJump) hasJumps = true;
        moves.push(m);
      }
    }
  }

  // Forced jump rule: if any jumps exist, must jump
  if (hasJumps) {
    return moves.filter((m) => m.isJump);
  }
  return moves;
}

export function applyMove(board: (CheckerPiece | null)[][], move: CheckerMove): (CheckerPiece | null)[][] {
  const newBoard = board.map((row) => [...row]);
  const piece = { ...newBoard[move.fromRow][move.fromCol]! };

  newBoard[move.fromRow][move.fromCol] = null;

  // King promotion
  if (piece.color === 'red' && move.toRow === 0) piece.isKing = true;
  if (piece.color === 'black' && move.toRow === 7) piece.isKing = true;

  newBoard[move.toRow][move.toCol] = piece;

  // Capture
  if (move.isJump && move.capturedRow !== undefined && move.capturedCol !== undefined) {
    newBoard[move.capturedRow][move.capturedCol] = null;
  }

  return newBoard;
}

export function countPieces(board: (CheckerPiece | null)[][]): { red: number; black: number } {
  let red = 0, black = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell?.color === 'red') red++;
      if (cell?.color === 'black') black++;
    }
  }
  return { red, black };
}
