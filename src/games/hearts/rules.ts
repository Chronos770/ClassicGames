import { Card, Suit, Rank, createDeck, shuffleDeck } from '../../engine/types';

export interface HeartsState {
  hands: Card[][];            // 4 players' hands
  currentTrick: (Card | null)[];  // 4 slots for current trick
  trickLeader: number;        // Who led the current trick
  currentPlayer: number;
  scores: number[];           // Current round scores
  totalScores: number[];      // Cumulative scores across rounds
  tricks: Card[][];           // Won tricks this round (per player)
  heartsBroken: boolean;
  phase: 'passing' | 'playing' | 'round-over' | 'game-over';
  passingCards: Card[][];     // Cards selected for passing (per player)
  passDirection: number;      // 0=left, 1=right, 2=across, 3=none
  roundNumber: number;
}

/**
 * In Hearts, Ace is high (value 14). The shared rankValue() treats Ace as 1
 * which is correct for Rummy/Solitaire but wrong for Hearts. This local
 * function is used for all Hearts-specific rank comparisons.
 */
export function heartsRankValue(rank: Rank): number {
  const values: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  };
  return values[rank];
}

export function createInitialState(): HeartsState {
  return {
    hands: [[], [], [], []],
    currentTrick: [null, null, null, null],
    trickLeader: 0,
    currentPlayer: 0,
    scores: [0, 0, 0, 0],
    totalScores: [0, 0, 0, 0],
    tricks: [[], [], [], []],
    heartsBroken: false,
    phase: 'passing',
    passingCards: [[], [], [], []],
    passDirection: 0,
    roundNumber: 1,
  };
}

export function dealHands(state: HeartsState): void {
  const deck = shuffleDeck(createDeck());
  for (let i = 0; i < 52; i++) {
    deck[i].faceUp = true;
    state.hands[i % 4].push(deck[i]);
  }
  // Sort each hand
  for (const hand of state.hands) {
    sortHand(hand);
  }
}

export function sortHand(hand: Card[]): void {
  const suitOrder: Record<Suit, number> = { clubs: 0, diamonds: 1, spades: 2, hearts: 3 };
  hand.sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) return suitOrder[a.suit] - suitOrder[b.suit];
    return heartsRankValue(a.rank) - heartsRankValue(b.rank);
  });
}

export function getPassTarget(player: number, direction: number): number {
  if (direction === 0) return (player + 1) % 4; // left
  if (direction === 1) return (player + 3) % 4; // right
  if (direction === 2) return (player + 2) % 4; // across
  return -1; // no passing
}

export function isValidPlay(state: HeartsState, playerIndex: number, card: Card): boolean {
  const hand = state.hands[playerIndex];
  if (!hand.some((c) => c.id === card.id)) return false;

  const trickCards = state.currentTrick.filter((c): c is Card => c !== null);

  // First card of the round must be 2 of clubs
  if (trickCards.length === 0 && state.tricks.every((t) => t.length === 0)) {
    return card.suit === 'clubs' && card.rank === '2';
  }

  // Must follow suit if possible
  if (trickCards.length > 0) {
    const leadSuit = state.currentTrick[state.trickLeader]!.suit;
    const hasSuit = hand.some((c) => c.suit === leadSuit);
    if (hasSuit && card.suit !== leadSuit) return false;
  }

  // Can't lead with hearts unless broken
  if (trickCards.length === 0 && card.suit === 'hearts' && !state.heartsBroken) {
    const hasNonHearts = hand.some((c) => c.suit !== 'hearts');
    if (hasNonHearts) return false;
  }

  // First trick: can't play hearts or queen of spades (if have other cards)
  if (state.tricks.every((t) => t.length === 0) && trickCards.length > 0) {
    if (card.suit === 'hearts' || (card.suit === 'spades' && card.rank === 'Q')) {
      const leadSuit = state.currentTrick[state.trickLeader]!.suit;
      const followCards = hand.filter((c) => c.suit === leadSuit);
      if (followCards.length > 0) return false;
      // If can't follow suit, check if they ONLY have hearts/QS
      const nonPointCards = hand.filter(
        (c) => c.suit !== 'hearts' && !(c.suit === 'spades' && c.rank === 'Q') && c.suit !== leadSuit
      );
      // If they have non-point off-suit cards, block hearts/QS dump on first trick
      // Actually, standard Hearts rules: if you can't follow suit on the first trick
      // you still can't play points UNLESS that's all you have
      if (nonPointCards.length > 0) return false;
    }
  }

  return true;
}

/**
 * Determine which player won the trick.
 * trick[] is indexed by player number (0-3), and leader indicates who led.
 * The lead suit is determined by the leader's card.
 * The highest card of the lead suit wins.
 */
export function trickWinner(trick: Card[], leader: number): number {
  const leadSuit = trick[leader].suit;
  let winner = leader;
  let highestValue = heartsRankValue(trick[leader].rank);

  for (let i = 0; i < 4; i++) {
    if (i === leader) continue;
    if (trick[i].suit === leadSuit && heartsRankValue(trick[i].rank) > highestValue) {
      highestValue = heartsRankValue(trick[i].rank);
      winner = i;
    }
  }

  return winner;
}

export function cardPoints(card: Card): number {
  if (card.suit === 'hearts') return 1;
  if (card.suit === 'spades' && card.rank === 'Q') return 13;
  return 0;
}

export function trickPoints(trick: Card[]): number {
  return trick.reduce((sum, c) => sum + cardPoints(c), 0);
}

export function checkShootTheMoon(scores: number[]): number[] {
  const moonShooter = scores.findIndex((s) => s === 26);
  if (moonShooter >= 0) {
    return scores.map((_, i) => (i === moonShooter ? 0 : 26));
  }
  return scores;
}

export function isGameOver(totalScores: number[]): boolean {
  return totalScores.some((s) => s >= 100);
}

export function findStartPlayer(hands: Card[][]): number {
  for (let i = 0; i < 4; i++) {
    if (hands[i].some((c) => c.suit === 'clubs' && c.rank === '2')) return i;
  }
  return 0;
}
