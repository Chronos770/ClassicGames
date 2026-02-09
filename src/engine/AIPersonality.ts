import { Difficulty } from './types';

export interface AIPersonality {
  id: string;
  name: string;
  title: string;
  avatar: string;
  difficulty: Difficulty;
  description: string;
  catchphrase: string;
  games: string[];
  eloEstimate: number;
}

const AI_ROSTER: AIPersonality[] = [
  {
    id: 'beginner-bob',
    name: 'Beginner Bob',
    title: 'The Rookie',
    avatar: '\u{1F466}',
    difficulty: 'easy',
    description: 'Just learning the rules. Makes plenty of mistakes.',
    catchphrase: 'Oops, did I do that?',
    games: ['*'],
    eloEstimate: 400,
  },
  {
    id: 'casual-carol',
    name: 'Casual Carol',
    title: 'Weekend Player',
    avatar: '\u{1F469}',
    difficulty: 'easy',
    description: 'Plays for fun on weekends. Knows the basics.',
    catchphrase: 'Good game! Want to play again?',
    games: ['*'],
    eloEstimate: 600,
  },
  {
    id: 'steady-sam',
    name: 'Steady Sam',
    title: 'Club Player',
    avatar: '\u{1F468}\u200D\u{1F393}',
    difficulty: 'medium',
    description: 'Solid fundamentals. Rarely blunders.',
    catchphrase: 'Patience wins games.',
    games: ['*'],
    eloEstimate: 1000,
  },
  {
    id: 'tactical-tina',
    name: 'Tactical Tina',
    title: 'Sharp Attacker',
    avatar: '\u{1F469}\u200D\u{1F4BB}',
    difficulty: 'medium',
    description: 'Loves aggressive tactics and combinations.',
    catchphrase: 'Did you see that coming?',
    games: ['chess', 'checkers', 'battleship'],
    eloEstimate: 1200,
  },
  {
    id: 'expert-eve',
    name: 'Expert Eve',
    title: 'Tournament Champion',
    avatar: '\u{1F451}',
    difficulty: 'hard',
    description: 'Multiple tournament wins. Extremely strong.',
    catchphrase: 'I play to win.',
    games: ['*'],
    eloEstimate: 1800,
  },
  {
    id: 'grandmaster-greg',
    name: 'Grandmaster Greg',
    title: 'The Unbeatable',
    avatar: '\u{1F9D9}',
    difficulty: 'hard',
    description: 'Near-perfect play. Good luck.',
    catchphrase: 'Interesting... but insufficient.',
    games: ['chess', 'checkers'],
    eloEstimate: 2200,
  },
];

export function getAIsForGame(gameId: string): AIPersonality[] {
  return AI_ROSTER.filter(
    (ai) => ai.games.includes('*') || ai.games.includes(gameId)
  );
}

export function getAIById(id: string): AIPersonality | undefined {
  return AI_ROSTER.find((ai) => ai.id === id);
}
