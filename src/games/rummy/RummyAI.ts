import { Card, rankValue } from '../../engine/types';
import { RummyState, findMelds, canKnock, isGin, calculateDeadwood } from './rules';

export function aiDecideDraw(state: RummyState): 'pile' | 'discard' {
  if (state.discardPile.length === 0) return 'pile';

  const hand = [...state.hands[1]];
  const topDiscard = state.discardPile[state.discardPile.length - 1];

  // Simulate: take the discard, find best card to drop, evaluate resulting 10-card hand
  const handWithDiscard = [...hand, topDiscard];
  const withDiscardResult = findMelds(handWithDiscard);

  // Find the best card to discard from the 11-card hand (highest deadwood not in a meld)
  const meldIds = new Set<string>();
  for (const meld of withDiscardResult.melds) {
    for (const c of meld.cards) meldIds.add(c.id);
  }
  const deadwoodCards = handWithDiscard.filter((c) => !meldIds.has(c.id));

  let bestDropDeadwood = Infinity;
  if (deadwoodCards.length > 0) {
    // Drop the highest-value deadwood card
    const worstCard = deadwoodCards.reduce((worst, c) =>
      Math.min(rankValue(c.rank), 10) > Math.min(rankValue(worst.rank), 10) ? c : worst
    );
    const afterDrop = handWithDiscard.filter((c) => c.id !== worstCard.id);
    bestDropDeadwood = findMelds(afterDrop).deadwoodPoints;
  } else {
    // All 11 cards in melds -- drop the least valuable meld card
    const sorted = [...handWithDiscard].sort((a, b) => Math.min(rankValue(a.rank), 10) - Math.min(rankValue(b.rank), 10));
    const afterDrop = handWithDiscard.filter((c) => c.id !== sorted[0].id);
    bestDropDeadwood = findMelds(afterDrop).deadwoodPoints;
  }

  const currentDeadwood = findMelds(hand).deadwoodPoints;

  // Take discard if the net result (after discarding our worst card) is better
  if (bestDropDeadwood < currentDeadwood - 1) {
    return 'discard';
  }

  return 'pile';
}

export function aiSelectDiscard(hand: Card[]): Card {
  const result = findMelds(hand);

  // Never discard cards that are in melds
  const meldCardIds = new Set<string>();
  for (const meld of result.melds) {
    for (const card of meld.cards) {
      meldCardIds.add(card.id);
    }
  }

  const deadwood = hand.filter((c) => !meldCardIds.has(c.id));

  if (deadwood.length === 0) {
    // All cards in melds - discard highest value card
    const sorted = [...hand].sort((a, b) => rankValue(b.rank) - rankValue(a.rank));
    return sorted[0];
  }

  // Discard highest deadwood card that doesn't have near-meld potential
  const scored = deadwood.map((card) => {
    let score = Math.min(rankValue(card.rank), 10); // Base: point value

    // Reduce score for cards near melds
    const others = hand.filter((c) => c.id !== card.id);
    const sameRank = others.filter((c) => c.rank === card.rank);
    const sameSuit = others.filter((c) => c.suit === card.suit);

    // Pairs are valuable (near sets)
    if (sameRank.length >= 1) score -= 5;
    if (sameRank.length >= 2) score -= 10;

    // Adjacent cards in same suit (near runs)
    const adjacent = sameSuit.filter(
      (c) => Math.abs(rankValue(c.rank) - rankValue(card.rank)) <= 2
    );
    if (adjacent.length >= 1) score -= 3;
    if (adjacent.length >= 2) score -= 8;

    return { card, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].card;
}

export function aiShouldKnock(hand: Card[]): boolean {
  if (!canKnock(hand)) return false;
  if (isGin(hand)) return true;

  const { deadwoodPoints } = findMelds(hand);
  // Knock if deadwood is low enough
  return deadwoodPoints <= 5;
}

/**
 * AI selects a card to discard when knocking.
 * Picks the discard that minimizes deadwood on the resulting 10-card hand,
 * while keeping deadwood <= 10 (valid knock).
 */
export function aiSelectKnockDiscard(hand: Card[]): Card | null {
  let bestCard: Card | null = null;
  let bestDeadwood = Infinity;

  for (const card of hand) {
    const remaining = hand.filter((c) => c.id !== card.id);
    const { deadwoodPoints } = findMelds(remaining);
    if (deadwoodPoints <= 10 && deadwoodPoints < bestDeadwood) {
      bestDeadwood = deadwoodPoints;
      bestCard = card;
    }
  }

  return bestCard;
}
