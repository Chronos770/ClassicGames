import { Card, Rank, rankValue, suitColor, Suit } from '../../engine/types';

export interface SolitaireState {
  stock: Card[];          // draw pile (face down)
  waste: Card[];          // flipped from stock
  foundations: Card[][];  // 4 piles (one per suit), built A->K
  tableau: Card[][];      // 7 columns
  phase: 'playing' | 'finished';
  moveCount: number;
  score: number;
}

export function canPlaceOnTableau(card: Card, target: Card | undefined): boolean {
  if (!target) {
    // Empty tableau column: only King can be placed
    return card.rank === 'K';
  }
  if (!target.faceUp) return false;
  // Must be opposite color and one rank lower
  return (
    suitColor(card.suit) !== suitColor(target.suit) &&
    rankValue(card.rank) === rankValue(target.rank) - 1
  );
}

export function canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) {
    return card.rank === 'A';
  }
  const top = foundation[foundation.length - 1];
  return card.suit === top.suit && rankValue(card.rank) === rankValue(top.rank) + 1;
}

export function isWon(state: SolitaireState): boolean {
  return state.foundations.every((f) => f.length === 13);
}

export function getFoundationSuit(foundations: Card[][]): (Suit | null)[] {
  return foundations.map((f) => (f.length > 0 ? f[0].suit : null));
}

export function scoreMove(from: string, to: string): number {
  if (to === 'foundation') return 10;
  if (from === 'waste' && to === 'tableau') return 5;
  if (from === 'foundation' && to === 'tableau') return -15;
  if (from === 'tableau' && to === 'tableau') return 0;
  return 0;
}

export function autoCompleteAvailable(state: SolitaireState): boolean {
  // All cards in tableau are face up
  if (state.stock.length > 0 || state.waste.length > 0) return false;
  return state.tableau.every((col) => col.every((c) => c.faceUp));
}

export interface SolitaireMove {
  type: 'draw' | 'waste-to-tableau' | 'waste-to-foundation' | 'tableau-to-tableau' | 'tableau-to-foundation' | 'recycle';
  fromCol?: number;
  toCol?: number;
  cardIndex?: number;
  foundationIndex?: number;
}

export function getValidMoves(state: SolitaireState): SolitaireMove[] {
  const moves: SolitaireMove[] = [];

  // Draw from stock
  if (state.stock.length > 0) {
    moves.push({ type: 'draw' });
  } else if (state.waste.length > 0) {
    moves.push({ type: 'recycle' });
  }

  // Waste to tableau
  if (state.waste.length > 0) {
    const wasteCard = state.waste[state.waste.length - 1];
    for (let col = 0; col < 7; col++) {
      const topCard = state.tableau[col].length > 0 ? state.tableau[col][state.tableau[col].length - 1] : undefined;
      if (canPlaceOnTableau(wasteCard, topCard)) {
        moves.push({ type: 'waste-to-tableau', toCol: col });
      }
    }

    // Waste to foundation
    for (let f = 0; f < 4; f++) {
      if (canPlaceOnFoundation(wasteCard, state.foundations[f])) {
        moves.push({ type: 'waste-to-foundation', foundationIndex: f });
      }
    }
  }

  // Tableau to tableau
  for (let fromCol = 0; fromCol < 7; fromCol++) {
    const col = state.tableau[fromCol];
    for (let ci = 0; ci < col.length; ci++) {
      if (!col[ci].faceUp) continue;
      const card = col[ci];
      for (let toCol = 0; toCol < 7; toCol++) {
        if (toCol === fromCol) continue;
        const targetCol = state.tableau[toCol];
        const topCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : undefined;
        if (canPlaceOnTableau(card, topCard)) {
          moves.push({ type: 'tableau-to-tableau', fromCol, toCol, cardIndex: ci });
        }
      }
    }
  }

  // Tableau to foundation
  for (let fromCol = 0; fromCol < 7; fromCol++) {
    const col = state.tableau[fromCol];
    if (col.length === 0) continue;
    const topCard = col[col.length - 1];
    if (!topCard.faceUp) continue;
    for (let f = 0; f < 4; f++) {
      if (canPlaceOnFoundation(topCard, state.foundations[f])) {
        moves.push({ type: 'tableau-to-foundation', fromCol, foundationIndex: f });
      }
    }
  }

  return moves;
}
