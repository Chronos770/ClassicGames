import { Chess } from 'chess.js';
import {
  ChessGameState,
  ChessMoveResult,
  Square,
  PieceSymbol,
  getGameState,
  getLegalMoves,
  makeMove,
} from './rules';

export class ChessGame {
  private chess: Chess;
  private listeners: Set<(state: ChessGameState) => void> = new Set();
  private undoStack: string[] = [];

  constructor() {
    this.chess = new Chess();
  }

  initialize(): void {
    this.chess = new Chess();
    this.undoStack = [];
    this.notify();
  }

  getState(): ChessGameState {
    return getGameState(this.chess);
  }

  getFEN(): string {
    return this.chess.fen();
  }

  getChess(): Chess {
    return this.chess;
  }

  subscribe(listener: (state: ChessGameState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  getLegalMoves(square: Square): ChessMoveResult[] {
    return getLegalMoves(this.chess, square);
  }

  makeMove(from: Square, to: Square, promotion?: PieceSymbol): ChessMoveResult | null {
    this.undoStack.push(this.chess.fen());
    const result = makeMove(this.chess, from, to, promotion);
    if (!result) {
      this.undoStack.pop();
      return null;
    }
    this.notify();
    return result;
  }

  undo(): boolean {
    const prevFen = this.undoStack.pop();
    if (!prevFen) return false;
    this.chess.load(prevFen);
    this.notify();
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  getBoard(): ({ type: PieceSymbol; color: 'w' | 'b' } | null)[][] {
    return this.chess.board();
  }
}
