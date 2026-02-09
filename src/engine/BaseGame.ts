import { GamePhase, GameState, Move, Player } from './types';

export abstract class BaseGame<TState extends GameState = GameState> {
  protected state: TState;
  protected undoStack: TState[] = [];
  protected redoStack: TState[] = [];
  protected listeners: Set<(state: TState) => void> = new Set();

  constructor(initialState: TState) {
    this.state = initialState;
  }

  getState(): TState {
    return this.state;
  }

  subscribe(listener: (state: TState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  protected notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  protected setState(newState: TState): void {
    this.state = newState;
    this.notify();
  }

  protected pushUndo(): void {
    this.undoStack.push(JSON.parse(JSON.stringify(this.state)));
    this.redoStack = [];
  }

  undo(): boolean {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.redoStack.push(JSON.parse(JSON.stringify(this.state)));
    this.setState(prev);
    return true;
  }

  redo(): boolean {
    const next = this.redoStack.pop();
    if (!next) return false;
    this.undoStack.push(JSON.parse(JSON.stringify(this.state)));
    this.setState(next);
    return true;
  }

  abstract initialize(): void;
  abstract makeMove(move: Move): boolean;
  abstract getValidMoves(): Move[];
  abstract isGameOver(): boolean;

  getPhase(): GamePhase {
    return this.state.phase;
  }

  getCurrentPlayer(): Player | null {
    if (this.state.players.length === 0) return null;
    return this.state.players[this.state.currentPlayerIndex];
  }

  getWinner(): Player | null {
    return this.state.winner;
  }
}
