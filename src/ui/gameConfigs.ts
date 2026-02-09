import { GameConfig } from '../engine/types';

export interface ExtendedGameConfig extends GameConfig {
  icon: string;
  rules: string[];
  playModes: ('ai' | 'online' | 'private' | 'solo')[];
  category: 'card' | 'board' | 'strategy';
}

export const GAME_CONFIGS: Record<string, ExtendedGameConfig> = {
  chess: {
    id: 'chess',
    name: 'Chess',
    description: 'The king of strategy games. Play against AI at any difficulty.',
    minPlayers: 2,
    maxPlayers: 2,
    hasAI: true,
    thumbnail: '',
    color: '#5a3219',
    icon: '\u265A',
    category: 'board',
    playModes: ['ai', 'online', 'private'],
    rules: [
      'Each piece moves differently: pawns forward, rooks in lines, bishops diagonally, etc.',
      'Capture opponent pieces by moving to their square',
      'Put the enemy King in checkmate (no escape from attack) to win',
      'Special moves: castling, en passant, and pawn promotion',
    ],
  },
  solitaire: {
    id: 'solitaire',
    name: 'Solitaire',
    description: 'Classic Klondike solitaire. Sort all cards into foundation piles by suit.',
    minPlayers: 1,
    maxPlayers: 1,
    hasAI: false,
    thumbnail: '',
    color: '#166534',
    icon: '\u2660',
    category: 'card',
    playModes: ['solo'],
    rules: [
      'Move cards between 7 tableau columns, building down in alternating colors',
      'Turn cards from the stock pile to find playable cards',
      'Build foundation piles from Ace to King by suit',
      'Win by moving all 52 cards to the 4 foundation piles',
    ],
  },
  hearts: {
    id: 'hearts',
    name: 'Hearts',
    description: 'Classic trick-taking card game. Avoid hearts and the Queen of Spades.',
    minPlayers: 4,
    maxPlayers: 4,
    hasAI: true,
    thumbnail: '',
    color: '#991b1b',
    icon: '\u2665',
    category: 'card',
    playModes: ['ai', 'online', 'private'],
    rules: [
      'Pass 3 cards to another player each round, then play tricks',
      'Follow the lead suit if possible; highest card of lead suit wins the trick',
      'Each Heart = 1 point, Queen of Spades = 13 points (points are bad!)',
      'Or "Shoot the Moon" by taking ALL hearts + Queen of Spades to give 26 points to everyone else',
    ],
  },
  checkers: {
    id: 'checkers',
    name: 'Checkers',
    description: 'Jump and capture your way to victory on the classic 8x8 board.',
    minPlayers: 2,
    maxPlayers: 2,
    hasAI: true,
    thumbnail: '',
    color: '#713f12',
    icon: '\u26C0',
    category: 'board',
    playModes: ['ai', 'online', 'private'],
    rules: [
      'Move pieces diagonally forward on dark squares',
      'Jump over opponent pieces to capture them (mandatory if possible)',
      'Reach the opposite end to become a King - Kings move backwards too',
      'Win by capturing all opponent pieces or blocking all their moves',
    ],
  },
  rummy: {
    id: 'rummy',
    name: 'Gin Rummy',
    description: 'Form melds and go gin! Classic 2-player draw and discard card game.',
    minPlayers: 2,
    maxPlayers: 2,
    hasAI: true,
    thumbnail: '',
    color: '#1e3a5f',
    icon: '\u2666',
    category: 'card',
    playModes: ['ai', 'online', 'private'],
    rules: [
      'Draw a card from the stock or discard pile each turn, then discard one',
      'Form melds: sets of 3-4 same-rank cards, or runs of 3+ consecutive suited cards',
      'Knock when your deadwood (unmelded cards) totals 10 or less',
      'Go Gin with zero deadwood for bonus points! First to 100 wins',
    ],
  },
  battleship: {
    id: 'battleship',
    name: 'Battleship',
    description: 'Place your fleet and hunt the enemy. Call your shots on the high seas.',
    minPlayers: 2,
    maxPlayers: 2,
    hasAI: true,
    thumbnail: '',
    color: '#0f4c5c',
    icon: '\u2693',
    category: 'strategy',
    playModes: ['ai', 'online', 'private'],
    rules: [
      'Place your fleet of 5 ships on your grid (ships cannot overlap)',
      'Take turns firing shots at the enemy grid to find their ships',
      'Hits are marked red, misses are marked white',
      'Sink all 5 enemy ships before they sink yours to win!',
    ],
  },
  towerdefense: {
    id: 'towerdefense',
    name: 'Tower Defense',
    description: 'Build towers, defend the path! Survive 15 waves of enemies in this real-time strategy game.',
    minPlayers: 1,
    maxPlayers: 1,
    hasAI: false,
    thumbnail: '',
    color: '#2D5A27',
    icon: '\u{1F3F0}',
    category: 'strategy',
    playModes: ['solo'],
    rules: [
      'Place towers on grass tiles adjacent to the enemy path',
      '4 tower types: Arrow (fast), Cannon (AoE), Ice (slow), Lightning (chain)',
      'Start waves when ready - enemies follow the path toward the exit',
      'Survive all 15 waves! Upgrade towers and earn gold from kills',
    ],
  },
};

export function getGameConfig(gameId: string): ExtendedGameConfig | undefined {
  return GAME_CONFIGS[gameId];
}

export function getAllGames(): ExtendedGameConfig[] {
  return Object.values(GAME_CONFIGS);
}
