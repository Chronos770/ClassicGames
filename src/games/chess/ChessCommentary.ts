import { AIPersonality } from '../../engine/AIPersonality';
import { ChessMoveResult } from './rules';

interface CommentaryContext {
  move: ChessMoveResult;
  evalBefore: number;
  evalAfter: number;
  isPlayerMove: boolean;
  moveNumber: number;
  personality?: AIPersonality;
}

const PLAYER_GOOD_MOVE = [
  'Nice move!',
  'Well played.',
  'Strong choice.',
  'That\'s solid.',
  'Good technique.',
  'I respect that.',
];

const PLAYER_GREAT_MOVE = [
  'Excellent! I didn\'t see that coming.',
  'Wow, that\'s a great move!',
  'Very impressive play.',
  'You\'re playing really well.',
  'That\'s a powerful move!',
];

const PLAYER_BLUNDER = [
  'Hmm, are you sure about that?',
  'Interesting choice...',
  'That might not be the best move.',
  'I think I can capitalize on that.',
  'Thank you for that!',
];

const AI_CONFIDENT = [
  'I like my position here.',
  'Things are looking good for me.',
  'My pieces are well coordinated.',
  'I\'m building pressure.',
];

const AI_WORRIED = [
  'You\'re making this difficult.',
  'I need to be careful here.',
  'Your position is strong.',
  'I\'m under pressure.',
];

const CAPTURE_COMMENTS = [
  'I\'ll take that.',
  'Material advantage!',
  'One less piece to worry about.',
  'That trade works for me.',
];

const CHECK_COMMENTS = [
  'Check!',
  'Your king is in danger!',
  'Watch out!',
  'Better move that king.',
];

const OPENING_COMMENTS = [
  'Let\'s see your opening.',
  'Developing pieces...',
  'Fighting for the center.',
  'A solid start.',
];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateCommentary(ctx: CommentaryContext): string | null {
  const evalDiff = ctx.evalAfter - ctx.evalBefore;
  const absEvalDiff = Math.abs(evalDiff);

  // Early game comments (first 4 moves)
  if (ctx.moveNumber <= 4 && Math.random() < 0.3) {
    return pick(OPENING_COMMENTS);
  }

  // Check comments
  if (ctx.move.san.includes('+')) {
    if (Math.random() < 0.6) return pick(CHECK_COMMENTS);
  }

  // Checkmate
  if (ctx.move.san.includes('#')) {
    return ctx.isPlayerMove ? 'Checkmate! Well played!' : 'Checkmate. Better luck next time!';
  }

  if (ctx.isPlayerMove) {
    // Player made a great move (eval swung significantly in their favor)
    if (evalDiff < -150) {
      return pick(PLAYER_GREAT_MOVE);
    }
    // Player made a good move
    if (evalDiff < -50) {
      if (Math.random() < 0.5) return pick(PLAYER_GOOD_MOVE);
    }
    // Player blundered (eval swung in AI's favor)
    if (evalDiff > 200) {
      return pick(PLAYER_BLUNDER);
    }
  } else {
    // AI move
    if (ctx.move.captured) {
      if (Math.random() < 0.4) return pick(CAPTURE_COMMENTS);
    }

    // AI is doing well
    if (ctx.evalAfter < -200) {
      if (Math.random() < 0.3) return pick(AI_CONFIDENT);
    }

    // AI is in trouble
    if (ctx.evalAfter > 200) {
      if (Math.random() < 0.3) return pick(AI_WORRIED);
    }
  }

  // Don't comment on every move
  return null;
}

export function getPersonalityComment(personality: AIPersonality, evalAfter: number): string | null {
  // Occasional personality catchphrase
  if (Math.random() < 0.1) {
    return `"${personality.catchphrase}"`;
  }
  return null;
}
