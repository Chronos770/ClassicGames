import { createDeck, shuffleDeck, Card } from '../../engine/types';
import {
  SolitaireState,
  SolitaireMove,
  canPlaceOnTableau,
  canPlaceOnFoundation,
  isWon,
  scoreMove,
  getValidMoves,
  autoCompleteAvailable,
} from './rules';

export class SolitaireGame {
  private state: SolitaireState;
  private undoStack: SolitaireState[] = [];
  private listeners: Set<(state: SolitaireState) => void> = new Set();

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): SolitaireState {
    return {
      stock: [],
      waste: [],
      foundations: [[], [], [], []],
      tableau: [[], [], [], [], [], [], []],
      phase: 'playing',
      moveCount: 0,
      score: 0,
    };
  }

  initialize(): void {
    const deck = shuffleDeck(createDeck());
    const state = this.createInitialState();

    // Deal to tableau
    let cardIndex = 0;
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = { ...deck[cardIndex++] };
        card.faceUp = row === col; // Only top card face up
        state.tableau[col].push(card);
      }
    }

    // Remaining cards go to stock
    state.stock = deck.slice(cardIndex).map((c) => ({ ...c, faceUp: false }));

    this.state = state;
    this.undoStack = [];
    this.notify();
  }

  getState(): SolitaireState {
    return this.state;
  }

  subscribe(listener: (state: SolitaireState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private pushUndo(): void {
    this.undoStack.push(JSON.parse(JSON.stringify(this.state)));
  }

  undo(): boolean {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.state = prev;
    this.notify();
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  drawCard(): boolean {
    this.pushUndo();

    if (this.state.stock.length > 0) {
      const card = this.state.stock.pop()!;
      card.faceUp = true;
      this.state.waste.push(card);
    } else if (this.state.waste.length > 0) {
      // BUG FIX #9: Avoid in-place .reverse() mutation of the waste array.
      // Use spread + reverse to create a new array instead of mutating in place.
      const reversed = [...this.state.waste].reverse();
      this.state.stock = reversed.map((c) => ({ ...c, faceUp: false }));
      this.state.waste = [];
      this.state.score = Math.max(0, this.state.score - 100);
    } else {
      this.undoStack.pop();
      return false;
    }

    this.state.moveCount++;
    this.notify();
    return true;
  }

  moveWasteToTableau(toCol: number): boolean {
    if (this.state.waste.length === 0) return false;
    const card = this.state.waste[this.state.waste.length - 1];
    const topCard = this.state.tableau[toCol].length > 0
      ? this.state.tableau[toCol][this.state.tableau[toCol].length - 1]
      : undefined;

    if (!canPlaceOnTableau(card, topCard)) return false;

    this.pushUndo();
    this.state.waste.pop();
    this.state.tableau[toCol].push(card);
    this.state.score += scoreMove('waste', 'tableau');
    this.state.moveCount++;
    this.notify();
    return true;
  }

  moveWasteToFoundation(): number {
    if (this.state.waste.length === 0) return -1;
    const card = this.state.waste[this.state.waste.length - 1];

    for (let f = 0; f < 4; f++) {
      if (canPlaceOnFoundation(card, this.state.foundations[f])) {
        this.pushUndo();
        this.state.waste.pop();
        this.state.foundations[f].push(card);
        this.state.score += scoreMove('waste', 'foundation');
        this.state.moveCount++;
        this.checkWin();
        this.notify();
        return f;
      }
    }
    return -1;
  }

  moveTableauToTableau(fromCol: number, cardIndex: number, toCol: number): boolean {
    const col = this.state.tableau[fromCol];
    if (cardIndex < 0 || cardIndex >= col.length) return false;
    if (!col[cardIndex].faceUp) return false;

    const card = col[cardIndex];
    const topCard = this.state.tableau[toCol].length > 0
      ? this.state.tableau[toCol][this.state.tableau[toCol].length - 1]
      : undefined;

    if (!canPlaceOnTableau(card, topCard)) return false;

    this.pushUndo();

    // Move stack of cards
    const moving = col.splice(cardIndex);
    this.state.tableau[toCol].push(...moving);

    // Flip the new top card if needed
    const newCol = this.state.tableau[fromCol];
    if (newCol.length > 0 && !newCol[newCol.length - 1].faceUp) {
      newCol[newCol.length - 1].faceUp = true;
      this.state.score += 5;
    }

    this.state.moveCount++;
    this.notify();
    return true;
  }

  moveTableauToFoundation(fromCol: number): number {
    const col = this.state.tableau[fromCol];
    if (col.length === 0) return -1;
    const card = col[col.length - 1];
    if (!card.faceUp) return -1;

    for (let f = 0; f < 4; f++) {
      if (canPlaceOnFoundation(card, this.state.foundations[f])) {
        this.pushUndo();
        col.pop();

        // Flip new top card
        if (col.length > 0 && !col[col.length - 1].faceUp) {
          col[col.length - 1].faceUp = true;
          this.state.score += 5;
        }

        this.state.foundations[f].push(card);
        this.state.score += scoreMove('tableau', 'foundation');
        this.state.moveCount++;
        this.checkWin();
        this.notify();
        return f;
      }
    }
    return -1;
  }

  // BUG FIX #8: autoComplete pushes a single undo snapshot before the loop,
  // so pressing Undo once reverts the entire auto-complete action.
  autoComplete(): boolean {
    if (!autoCompleteAvailable(this.state)) return false;

    // Save a single undo snapshot before the entire auto-complete sequence
    this.pushUndo();

    let moved = true;
    while (moved) {
      moved = false;
      for (let col = 0; col < 7; col++) {
        if (this._moveTableauToFoundationNoUndo(col) >= 0) {
          moved = true;
        }
      }
    }

    this.checkWin();
    this.notify();
    return isWon(this.state);
  }

  // Internal helper: move tableau top card to foundation without pushing undo.
  // Used by autoComplete to batch the entire operation under a single undo entry.
  private _moveTableauToFoundationNoUndo(fromCol: number): number {
    const col = this.state.tableau[fromCol];
    if (col.length === 0) return -1;
    const card = col[col.length - 1];
    if (!card.faceUp) return -1;

    for (let f = 0; f < 4; f++) {
      if (canPlaceOnFoundation(card, this.state.foundations[f])) {
        col.pop();

        // Flip new top card
        if (col.length > 0 && !col[col.length - 1].faceUp) {
          col[col.length - 1].faceUp = true;
          this.state.score += 5;
        }

        this.state.foundations[f].push(card);
        this.state.score += scoreMove('tableau', 'foundation');
        this.state.moveCount++;
        return f;
      }
    }
    return -1;
  }

  private checkWin(): void {
    if (isWon(this.state)) {
      this.state.phase = 'finished';
    }
  }

  isWon(): boolean {
    return isWon(this.state);
  }

  isAutoCompleteAvailable(): boolean {
    return autoCompleteAvailable(this.state);
  }

  getValidMoves(): SolitaireMove[] {
    return getValidMoves(this.state);
  }

  getHint(): SolitaireMove | null {
    const moves = this.getValidMoves();
    // Prioritize: foundation moves > tableau moves > draw
    const foundationMoves = moves.filter(
      (m) => m.type === 'waste-to-foundation' || m.type === 'tableau-to-foundation'
    );
    if (foundationMoves.length > 0) return foundationMoves[0];

    const tableauMoves = moves.filter(
      (m) => m.type === 'waste-to-tableau' || m.type === 'tableau-to-tableau'
    );
    if (tableauMoves.length > 0) return tableauMoves[0];

    const drawMoves = moves.filter((m) => m.type === 'draw' || m.type === 'recycle');
    if (drawMoves.length > 0) return drawMoves[0];

    return null;
  }
}
