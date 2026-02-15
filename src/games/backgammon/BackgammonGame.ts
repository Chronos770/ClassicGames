import {
  BackgammonState,
  BackgammonMove,
  PlayerColor,
  createInitialState,
  rollDice,
  getDiceMovesAvailable,
  applyMove,
  getAllValidMoves,
  hasAnyMoves,
} from './rules';

export class BackgammonGame {
  private state: BackgammonState;
  private listeners: Set<(state: BackgammonState) => void> = new Set();
  private undoStack: BackgammonState[] = [];

  constructor() {
    this.state = createInitialState();
  }

  initialize(): void {
    this.state = createInitialState();
    this.undoStack = [];
    this.notify();
  }

  getState(): BackgammonState {
    return this.state;
  }

  subscribe(listener: (state: BackgammonState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  roll(): [number, number] | null {
    if (this.state.phase !== 'rolling') return null;

    const dice = rollDice();
    this.state = {
      ...this.state,
      dice,
      remainingMoves: getDiceMovesAvailable(dice),
      phase: 'moving',
      turnCount: this.state.turnCount + 1,
    };

    // If no moves available, skip turn
    if (!hasAnyMoves(this.state)) {
      this.endTurn();
    }

    this.undoStack = []; // Clear undo for new turn
    this.notify();
    return dice;
  }

  /** Set specific dice (for multiplayer sync) */
  setDice(dice: [number, number]): void {
    this.state = {
      ...this.state,
      dice,
      remainingMoves: getDiceMovesAvailable(dice),
      phase: 'moving',
      turnCount: this.state.turnCount + 1,
    };

    if (!hasAnyMoves(this.state)) {
      this.endTurn();
    }

    this.undoStack = [];
    this.notify();
  }

  getValidMoves(): BackgammonMove[] {
    if (this.state.phase !== 'moving') return [];
    return getAllValidMoves(this.state);
  }

  makeMove(move: BackgammonMove): boolean {
    if (this.state.phase !== 'moving') return false;

    // Validate move
    const validMoves = getAllValidMoves(this.state);
    const isValid = validMoves.some(m =>
      m.from === move.from && m.to === move.to && m.dieValue === move.dieValue
    );
    if (!isValid) return false;

    this.undoStack.push({ ...this.state, points: this.state.points.map(p => ({ ...p })), bar: [...this.state.bar] as [number, number], borneOff: [...this.state.borneOff] as [number, number], remainingMoves: [...this.state.remainingMoves] });

    this.state = applyMove(this.state, move);

    // Check if turn is over (no more moves or dice used up)
    if (this.state.phase !== 'finished' && (this.state.remainingMoves.length === 0 || !hasAnyMoves(this.state))) {
      this.endTurn();
    }

    this.notify();
    return true;
  }

  undo(): boolean {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.state = prev;
    this.notify();
    return true;
  }

  private endTurn(): void {
    const nextPlayer: PlayerColor = this.state.currentPlayer === 'white' ? 'black' : 'white';
    this.state = {
      ...this.state,
      currentPlayer: nextPlayer,
      dice: null,
      remainingMoves: [],
      phase: 'rolling',
    };
  }

  /** For multiplayer: force end turn */
  forceEndTurn(): void {
    if (this.state.phase === 'moving') {
      this.endTurn();
      this.notify();
    }
  }
}
