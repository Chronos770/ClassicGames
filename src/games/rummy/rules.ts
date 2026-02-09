import { Card, Suit, Rank, RANKS, createDeck, shuffleDeck, rankValue } from '../../engine/types';

export interface RummyState {
  hands: Card[][];        // [player, opponent]
  drawPile: Card[];
  discardPile: Card[];
  currentPlayer: number;  // 0 = human, 1 = AI
  phase: 'draw' | 'discard' | 'knock-discard' | 'knock' | 'gin' | 'round-over' | 'finished';
  scores: number[];
  lastAction: string;
  winner: number | null;
  knocker: number | null;
  roundResult: string | null;  // summary of round outcome
}

export interface Meld {
  type: 'set' | 'run';
  cards: Card[];
}

export function createInitialState(): RummyState {
  return {
    hands: [[], []],
    drawPile: [],
    discardPile: [],
    currentPlayer: 0,
    phase: 'draw',
    scores: [0, 0],
    lastAction: '',
    winner: null,
    knocker: null,
    roundResult: null,
  };
}

export function dealGame(state: RummyState): void {
  const deck = shuffleDeck(createDeck());
  state.hands = [[], []];

  // Deal 10 cards each
  for (let i = 0; i < 20; i++) {
    const card = { ...deck[i], faceUp: true };
    state.hands[i % 2].push(card);
  }

  // First card to discard
  const firstDiscard = { ...deck[20], faceUp: true };
  state.discardPile = [firstDiscard];

  // Rest to draw pile
  state.drawPile = deck.slice(21).map((c) => ({ ...c, faceUp: false }));

  sortHand(state.hands[0]);
  sortHand(state.hands[1]);
}

export function sortHand(hand: Card[]): void {
  const suitOrder: Record<Suit, number> = { clubs: 0, diamonds: 1, hearts: 2, spades: 3 };
  hand.sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) return suitOrder[a.suit] - suitOrder[b.suit];
    return rankValue(a.rank) - rankValue(b.rank);
  });
}

export function findMelds(hand: Card[]): { melds: Meld[]; deadwood: Card[]; deadwoodPoints: number } {
  // Find all possible melds and return the best combination (lowest deadwood)
  const bestResult = findBestMelds(hand);
  return bestResult;
}

function findBestMelds(hand: Card[]): { melds: Meld[]; deadwood: Card[]; deadwoodPoints: number } {
  let bestResult = { melds: [] as Meld[], deadwood: [...hand], deadwoodPoints: calculateDeadwood(hand) };

  // Find all sets (3-4 cards of same rank)
  const rankGroups: Map<Rank, Card[]> = new Map();
  for (const card of hand) {
    const group = rankGroups.get(card.rank) ?? [];
    group.push(card);
    rankGroups.set(card.rank, group);
  }

  // Find all runs (3+ consecutive cards of same suit)
  const suitGroups: Map<Suit, Card[]> = new Map();
  for (const card of hand) {
    const group = suitGroups.get(card.suit) ?? [];
    group.push(card);
    suitGroups.set(card.suit, group);
  }

  // Try greedy approach: sets first, then runs
  const usedIds = new Set<string>();
  const melds: Meld[] = [];

  // Sets
  for (const [rank, cards] of rankGroups) {
    if (cards.length >= 3) {
      const meldCards = cards.slice(0, Math.min(cards.length, 4));
      melds.push({ type: 'set', cards: meldCards });
      for (const c of meldCards) usedIds.add(c.id);
    }
  }

  // Runs
  for (const [suit, cards] of suitGroups) {
    const sorted = cards.filter((c) => !usedIds.has(c.id)).sort((a, b) => rankValue(a.rank) - rankValue(b.rank));
    let run: Card[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (run.length === 0 || rankValue(sorted[i].rank) === rankValue(run[run.length - 1].rank) + 1) {
        run.push(sorted[i]);
      } else {
        if (run.length >= 3) {
          melds.push({ type: 'run', cards: [...run] });
          for (const c of run) usedIds.add(c.id);
        }
        run = [sorted[i]];
      }
    }
    if (run.length >= 3) {
      melds.push({ type: 'run', cards: [...run] });
      for (const c of run) usedIds.add(c.id);
    }
  }

  const deadwood = hand.filter((c) => !usedIds.has(c.id));
  const deadwoodPoints = calculateDeadwood(deadwood);

  if (deadwoodPoints < bestResult.deadwoodPoints) {
    bestResult = { melds, deadwood, deadwoodPoints };
  }

  // Also try runs first, then sets
  const usedIds2 = new Set<string>();
  const melds2: Meld[] = [];

  // Need fresh sorted arrays for the runs-first pass (don't mutate the originals)
  const suitGroups2: Map<Suit, Card[]> = new Map();
  for (const card of hand) {
    const group = suitGroups2.get(card.suit) ?? [];
    group.push(card);
    suitGroups2.set(card.suit, group);
  }

  for (const [suit, cards] of suitGroups2) {
    const sorted = [...cards].sort((a, b) => rankValue(a.rank) - rankValue(b.rank));
    let run: Card[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (run.length === 0 || rankValue(sorted[i].rank) === rankValue(run[run.length - 1].rank) + 1) {
        run.push(sorted[i]);
      } else {
        if (run.length >= 3) {
          melds2.push({ type: 'run', cards: [...run] });
          for (const c of run) usedIds2.add(c.id);
        }
        run = [sorted[i]];
      }
    }
    if (run.length >= 3) {
      melds2.push({ type: 'run', cards: [...run] });
      for (const c of run) usedIds2.add(c.id);
    }
  }

  for (const [rank, cards] of rankGroups) {
    const remaining = cards.filter((c) => !usedIds2.has(c.id));
    if (remaining.length >= 3) {
      melds2.push({ type: 'set', cards: remaining.slice(0, 4) });
      for (const c of remaining.slice(0, 4)) usedIds2.add(c.id);
    }
  }

  const deadwood2 = hand.filter((c) => !usedIds2.has(c.id));
  const deadwoodPoints2 = calculateDeadwood(deadwood2);

  if (deadwoodPoints2 < bestResult.deadwoodPoints) {
    bestResult = { melds: melds2, deadwood: deadwood2, deadwoodPoints: deadwoodPoints2 };
  }

  return bestResult;
}

export function calculateDeadwood(cards: Card[]): number {
  return cards.reduce((sum, c) => {
    const v = rankValue(c.rank);
    return sum + Math.min(v, 10); // Face cards = 10
  }, 0);
}

export function canKnock(hand: Card[]): boolean {
  const { deadwoodPoints } = findMelds(hand);
  return deadwoodPoints <= 10;
}

export function isGin(hand: Card[]): boolean {
  const { deadwoodPoints } = findMelds(hand);
  return deadwoodPoints === 0;
}

export function cardPointValue(card: Card): number {
  const v = rankValue(card.rank);
  return Math.min(v, 10);
}
