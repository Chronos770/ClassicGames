import { Card, Suit } from '../../engine/types';
import { HeartsState, isValidPlay, cardPoints, heartsRankValue } from './rules';

export function selectPassCards(hand: Card[]): Card[] {
  // Strategy: pass high spades (especially Q), high hearts, and high cards
  const sorted = [...hand].sort((a, b) => {
    // Always pass Queen of Spades
    if (a.suit === 'spades' && a.rank === 'Q') return -1;
    if (b.suit === 'spades' && b.rank === 'Q') return 1;
    // Pass high spades (A, K)
    if (a.suit === 'spades' && heartsRankValue(a.rank) >= 12) return -1;
    if (b.suit === 'spades' && heartsRankValue(b.rank) >= 12) return 1;
    // Pass high hearts
    if (a.suit === 'hearts' && b.suit !== 'hearts') return -1;
    if (b.suit === 'hearts' && a.suit !== 'hearts') return 1;
    // Otherwise pass highest cards
    return heartsRankValue(b.rank) - heartsRankValue(a.rank);
  });

  return sorted.slice(0, 3);
}

export function selectPlay(state: HeartsState, playerIndex: number): Card | null {
  const hand = state.hands[playerIndex];
  const validPlays = hand.filter((c) => isValidPlay(state, playerIndex, c));

  if (validPlays.length === 0) return null;
  if (validPlays.length === 1) return validPlays[0];

  const trickCards = state.currentTrick.filter((c): c is Card => c !== null);

  // Leading
  if (trickCards.length === 0) {
    return selectLead(validPlays, state);
  }

  const leadSuit = state.currentTrick[state.trickLeader]!.suit;
  const followingSuit = validPlays.filter((c) => c.suit === leadSuit);

  // Can follow suit
  if (followingSuit.length > 0) {
    return selectFollow(followingSuit, trickCards, state);
  }

  // Can't follow suit - dump points
  return selectDump(validPlays, state);
}

function selectLead(plays: Card[], state: HeartsState): Card {
  // Lead low non-heart, non-spade cards
  const safe = plays.filter((c) => c.suit !== 'hearts' && !(c.suit === 'spades' && heartsRankValue(c.rank) >= 12));
  if (safe.length > 0) {
    // Lead lowest
    safe.sort((a, b) => heartsRankValue(a.rank) - heartsRankValue(b.rank));
    return safe[0];
  }
  // Must lead heart or high spade
  plays.sort((a, b) => heartsRankValue(a.rank) - heartsRankValue(b.rank));
  return plays[0];
}

function selectFollow(plays: Card[], trickCards: Card[], state: HeartsState): Card {
  const leadSuit = state.currentTrick[state.trickLeader]!.suit;

  // If spades are led and queen of spades hasn't been played, be careful
  if (leadSuit === 'spades') {
    const qsPlayed = trickCards.some((c) => c.suit === 'spades' && c.rank === 'Q');
    if (!qsPlayed) {
      // Play under the queen if possible
      const underQueen = plays.filter((c) => heartsRankValue(c.rank) < 12);
      if (underQueen.length > 0) {
        // Play highest card under queen
        underQueen.sort((a, b) => heartsRankValue(b.rank) - heartsRankValue(a.rank));
        return underQueen[0];
      }
    }
  }

  // Check if trick has points
  const trickHasPoints = trickCards.some((c) => cardPoints(c) > 0);

  if (trickHasPoints) {
    // Try to play low to avoid winning
    plays.sort((a, b) => heartsRankValue(a.rank) - heartsRankValue(b.rank));
    return plays[0];
  }

  // No points in trick, safe to play high (but still under any point cards)
  // Play highest card that won't win or play lowest if all would win
  const highestInTrick = Math.max(...trickCards.filter((c) => c.suit === leadSuit).map((c) => heartsRankValue(c.rank)));
  const underCards = plays.filter((c) => heartsRankValue(c.rank) < highestInTrick);

  if (underCards.length > 0) {
    underCards.sort((a, b) => heartsRankValue(b.rank) - heartsRankValue(a.rank));
    return underCards[0];
  }

  // Must win, play lowest winner
  plays.sort((a, b) => heartsRankValue(a.rank) - heartsRankValue(b.rank));
  return plays[0];
}

function selectDump(plays: Card[], state: HeartsState): Card {
  // Dump Queen of Spades first!
  const qs = plays.find((c) => c.suit === 'spades' && c.rank === 'Q');
  if (qs) return qs;

  // Dump highest hearts
  const hearts = plays.filter((c) => c.suit === 'hearts');
  if (hearts.length > 0) {
    hearts.sort((a, b) => heartsRankValue(b.rank) - heartsRankValue(a.rank));
    return hearts[0];
  }

  // Dump highest card in suit with fewest cards (to void suits)
  const suitCounts: Partial<Record<Suit, number>> = {};
  for (const c of state.hands[state.currentPlayer]) {
    suitCounts[c.suit] = (suitCounts[c.suit] ?? 0) + 1;
  }

  plays.sort((a, b) => {
    const countDiff = (suitCounts[a.suit] ?? 0) - (suitCounts[b.suit] ?? 0);
    if (countDiff !== 0) return countDiff;
    return heartsRankValue(b.rank) - heartsRankValue(a.rank);
  });

  return plays[0];
}
