export interface HeartsOpponent {
  name: string;
  color: number; // hex color for their avatar circle
  initial: string;
}

/** playerIndex: 1=West, 2=North, 3=East (matches game state indices) */
export interface HeartsComment {
  message: string;
  playerIndex: number;
}

const NAMES = [
  'Bob', 'Fred', 'Larry', 'Margaret', 'Donna', 'Earl', 'Betty', 'Frank',
  'Helen', 'Gary', 'Ruth', 'Dale', 'Edna', 'Carl', 'Linda', 'Roy',
  'Jean', 'Hank', 'Nancy', 'Gus', 'Marge', 'Phil', 'Dot', 'Wally',
  'Barb', 'Norm', 'Fran', 'Lou', 'Rita', 'Bud',
];

const SEAT_COLORS = [
  0xE57373, // red
  0x64B5F6, // blue
  0x81C784, // green
  0xFFB74D, // orange
  0xBA68C8, // purple
  0x4DD0E1, // teal
];

export function pickOpponents(count: number): HeartsOpponent[] {
  const shuffled = [...NAMES].sort(() => Math.random() - 0.5);
  const colors = [...SEAT_COLORS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((name, i) => ({
    name,
    color: colors[i % colors.length],
    initial: name[0],
  }));
}

// --- Commentary lines ---
const TRICK_WIN_CLEAN = [
  'Clean trick, nice!',
  'No points there.',
  "I'll take that.",
  'Safe and sound.',
];
const TRICK_WIN_POINTS = [
  'Ouch...',
  'Not what I wanted.',
  'Well, that stings.',
  'That hurts.',
];
const TRICK_DUMP_ON_PLAYER = [
  'Enjoy those!',
  'Have fun with that!',
  "That's all yours.",
  'Better you than me!',
  'Ha! Gotcha.',
];
const HEARTS_BROKEN = [
  'Hearts are broken!',
  'Here come the hearts!',
  'No more hiding.',
  'Well, here we go...',
];
const QUEEN_PLAYED = [
  'The Black Lady!',
  'Watch out!',
  'There she is...',
  'Yikes!',
];
const QUEEN_DUMPED = [
  'Surprise!',
  'Sorry, not sorry.',
  'Catch!',
  "That's a gift for you.",
  'Whoops!',
];
const PASSING_DONE = [
  "Let's see what I got...",
  'Interesting hand.',
  'Alright, here we go.',
  'Good luck everyone.',
  'This should be fun.',
];
const ROUND_WINNING = [
  'Looking good for me!',
  "I'll take that score.",
  'Low score, happy me.',
];
const ROUND_LOSING = [
  "That didn't go well.",
  'I need to do better.',
  'Rough round...',
  'Oof.',
];
const SHOOT_MOON = [
  'Shot the moon!',
  '26 for everyone else!',
  "Didn't see that coming, did ya?",
];
const GAME_WON = [
  'Great game!',
  'Well played!',
  'That was fun.',
];
const GAME_LOST = [
  'Good game, you got me.',
  'Well played! Rematch?',
  "You're too good.",
];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAiIndex(): number {
  return 1 + Math.floor(Math.random() * 3); // 1, 2, or 3
}

export function commentOnPass(): HeartsComment {
  return { message: pick(PASSING_DONE), playerIndex: randomAiIndex() };
}

export function commentOnTrickWon(
  winnerId: number,
  points: number,
): HeartsComment | null {
  if (winnerId === 0) {
    if (points > 0) {
      return { message: pick(TRICK_DUMP_ON_PLAYER), playerIndex: randomAiIndex() };
    }
    return null;
  }
  if (points > 0) {
    return { message: pick(TRICK_WIN_POINTS), playerIndex: winnerId };
  }
  if (Math.random() < 0.25) {
    return { message: pick(TRICK_WIN_CLEAN), playerIndex: winnerId };
  }
  return null;
}

export function commentOnHeartsBroken(): HeartsComment {
  return { message: pick(HEARTS_BROKEN), playerIndex: randomAiIndex() };
}

export function commentOnQueenPlayed(
  playedBy: number,
  trickWinner: number,
): HeartsComment {
  if (playedBy !== 0 && trickWinner === 0) {
    return { message: pick(QUEEN_DUMPED), playerIndex: playedBy };
  }
  const idx = playedBy === 0 ? randomAiIndex() : playedBy;
  return { message: pick(QUEEN_PLAYED), playerIndex: idx };
}

export function commentOnRoundOver(scores: number[]): HeartsComment {
  let bestAi = 1;
  let worstAi = 1;
  for (let i = 2; i <= 3; i++) {
    if (scores[i] < scores[bestAi]) bestAi = i;
    if (scores[i] > scores[worstAi]) worstAi = i;
  }

  const moonShooter = scores.findIndex((s) => s === 26);
  if (moonShooter > 0) {
    return { message: pick(SHOOT_MOON), playerIndex: moonShooter };
  }

  if (scores[worstAi] > 10) {
    return { message: pick(ROUND_LOSING), playerIndex: worstAi };
  }
  return { message: pick(ROUND_WINNING), playerIndex: bestAi };
}

export function commentOnGameOver(totalScores: number[]): HeartsComment {
  const playerWon = totalScores[0] === Math.min(...totalScores);
  return {
    message: playerWon ? pick(GAME_LOST) : pick(GAME_WON),
    playerIndex: randomAiIndex(),
  };
}
