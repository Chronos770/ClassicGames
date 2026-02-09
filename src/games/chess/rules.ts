import { Chess, Square, Move as ChessMove, PieceSymbol, Color } from 'chess.js';

export type { Square, PieceSymbol, Color };
export type ChessMoveResult = ChessMove;

export interface ChessGameState {
  fen: string;
  turn: Color;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  moveHistory: ChessMoveResult[];
  capturedWhite: PieceSymbol[];
  capturedBlack: PieceSymbol[];
}

export function createChessEngine(): Chess {
  return new Chess();
}

export function getGameState(chess: Chess): ChessGameState {
  const history = chess.history({ verbose: true });
  const capturedWhite: PieceSymbol[] = [];
  const capturedBlack: PieceSymbol[] = [];

  for (const move of history) {
    if (move.captured) {
      if (move.color === 'w') {
        capturedBlack.push(move.captured);
      } else {
        capturedWhite.push(move.captured);
      }
    }
  }

  return {
    fen: chess.fen(),
    turn: chess.turn(),
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isStalemate: chess.isStalemate(),
    isDraw: chess.isDraw(),
    isGameOver: chess.isGameOver(),
    moveHistory: history,
    capturedWhite,
    capturedBlack,
  };
}

export function getLegalMoves(chess: Chess, square: Square): ChessMoveResult[] {
  return chess.moves({ square, verbose: true });
}

export function makeMove(chess: Chess, from: Square, to: Square, promotion?: PieceSymbol): ChessMoveResult | null {
  try {
    return chess.move({ from, to, promotion: promotion ?? 'q' });
  } catch {
    return null;
  }
}

export function squareToCoords(square: Square): { row: number; col: number } {
  const col = square.charCodeAt(0) - 97; // a=0, b=1...
  const row = 8 - parseInt(square[1]); // 8=0, 7=1...
  return { row, col };
}

export function coordsToSquare(row: number, col: number): Square {
  const file = String.fromCharCode(97 + col);
  const rank = (8 - row).toString();
  return (file + rank) as Square;
}

export const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
};
