export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
  id: string;
}

export type GamePhase = 'setup' | 'playing' | 'paused' | 'finished';

export interface Player {
  id: string;
  name: string;
  isHuman: boolean;
  score: number;
}

export interface Move {
  type: string;
  from?: string;
  to?: string;
  card?: Card;
  timestamp: number;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  moveHistory: Move[];
  winner: Player | null;
  startTime: number;
  elapsed: number;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameConfig {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  hasAI: boolean;
  thumbnail: string;
  color: string;
}

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, faceUp: false, id: `${rank}_${suit}` });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function rankValue(rank: Rank): number {
  const values: Record<Rank, number> = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13,
  };
  return values[rank];
}

export function suitColor(suit: Suit): 'red' | 'black' {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

export function cardDisplayName(card: Card): string {
  const suitSymbols: Record<Suit, string> = {
    hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660',
  };
  return `${card.rank}${suitSymbols[card.suit]}`;
}
