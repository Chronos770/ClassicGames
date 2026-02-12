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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PIECE_NAMES: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

function pieceName(p: string): string { return PIECE_NAMES[p] ?? 'piece'; }
function capPieceName(p: string): string { const n = pieceName(p); return n[0].toUpperCase() + n.slice(1); }

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isCastle(move: ChessMoveResult): boolean { return move.san.startsWith('O-'); }
function isCheck(move: ChessMoveResult): boolean { return move.san.includes('+'); }
function isCheckmate(move: ChessMoveResult): boolean { return move.san.includes('#'); }
function isPromotion(move: ChessMoveResult): boolean { return !!move.promotion; }

// ─── Per-personality comment pools ────────────────────────────────────────────

interface CommentPool {
  // Reacting to player moves
  playerGreatMove: string[];
  playerGoodMove: string[];
  playerBlunder: string[];
  playerCapture: string[];

  // AI's own moves
  aiCapture: string[];
  aiCheck: string[];
  aiCastle: string[];
  aiGeneral: string[];    // thinking out loud about own position
  aiPromotion: string[];

  // Position evaluation
  aiWinning: string[];
  aiLosing: string[];

  // Opening phase (moves 1-6)
  opening: string[];

  // Checkmate
  aiWonCheckmate: string[];
  playerWonCheckmate: string[];
}

// ─── Grandmaster Greg ─────────────────────────────────────────────────────────
const GRANDMASTER_GREG: CommentPool = {
  playerGreatMove: [
    'Impressive. That\'s the engine\'s top recommendation.',
    'You found the strongest continuation. Well calculated.',
    'An excellent prophylactic move. Very well played.',
    'That\'s a strong positional concept. Respect.',
    'Precisely played. The initiative shifts to you.',
    'You understand the nuances of this position.',
  ],
  playerGoodMove: [
    'A reasonable move. Keeps the tension.',
    'Sound. Consistent with positional principles.',
    'Solid development. No complaints.',
    'That follows opening theory nicely.',
    'A principled decision.',
  ],
  playerBlunder: [
    'A significant inaccuracy. The position demanded more precision.',
    'That\'s a tactical oversight. Did you calculate the variations?',
    'Hmm. A positional concession I intend to exploit.',
    'That weakens your pawn structure considerably.',
    'An instructive mistake. Let me demonstrate why.',
    'You\'ve handed me the initiative. Thank you.',
  ],
  playerCapture: [
    'An exchange. Let me evaluate the resulting structure...',
    'That trade alters the pawn skeleton. Interesting.',
    'Taking, I see. The recapture will be instructive.',
  ],
  aiCapture: [
    `Eliminating that piece. It was becoming too active.`,
    'A favorable exchange. The resulting endgame favors me.',
    'Material advantage. A fundamental winning technique.',
    'Removing a key defender from the position.',
    'This simplification favors my structure.',
  ],
  aiCheck: [
    'Check. Your king position is compromised.',
    'An intermediate check. Tempo is everything.',
    'Zwischenschach. A useful in-between move.',
    'Your king must move. That costs you tempo.',
  ],
  aiCastle: [
    'Castling. King safety is a fundamental principle.',
    'Connecting the rooks. Classical development complete.',
    'Securing the king before launching the middlegame plan.',
  ],
  aiGeneral: [
    'Improving my piece coordination.',
    'Preparing a pawn break on the queenside.',
    'Maneuvering for control of the open file.',
    'Centralizing. The center controls everything.',
    'A prophylactic move. Preventing your plan before it starts.',
    'Repositioning to a more active square.',
    'Building pressure along the diagonal.',
    'Strengthening my pawn chain.',
  ],
  aiPromotion: [
    'Promotion. The endgame technique is straightforward from here.',
    'A new queen. The advantage is now decisive.',
  ],
  aiWinning: [
    'The position is clearly in my favor. Technique from here.',
    'My advantage is substantial. Converting should be routine.',
    'You\'re under significant positional pressure.',
    'The evaluation is quite one-sided at this point.',
  ],
  aiLosing: [
    'You\'ve built a strong position. I need to find counterplay.',
    'I\'m under pressure. Credit where it\'s due.',
    'The advantage is yours. I\'ll look for defensive resources.',
    'An uncomfortable position for me. Well played.',
  ],
  opening: [
    'Standard theory here. Let\'s see your preparation.',
    'A well-known tabiya. The real game begins soon.',
    'Following principal lines. Development, center, king safety.',
    'This position has decades of grandmaster practice behind it.',
    'Book moves for now. The critical moment approaches.',
  ],
  aiWonCheckmate: [
    'Checkmate. A clinical finish, I think you\'ll agree.',
    'And that\'s mate. An instructive game overall.',
    'Checkmate. Study the middlegame turning point for improvement.',
  ],
  playerWonCheckmate: [
    'Checkmate. Excellently played. I concede with respect.',
    'Well calculated. That was a strong attacking game.',
    'Mate. You played above your rating today.',
  ],
};

// ─── Expert Eve ───────────────────────────────────────────────────────────────
const EXPERT_EVE: CommentPool = {
  playerGreatMove: [
    'That\'s a strong move. You\'re playing well.',
    'Didn\'t expect that. Nice find.',
    'Top-level move. I\'ll have to be careful.',
    'You clearly know what you\'re doing.',
    'Strong. Very strong.',
  ],
  playerGoodMove: [
    'Decent move. The position stays balanced.',
    'Fine. Nothing wrong with that.',
    'A solid choice.',
    'That works.',
  ],
  playerBlunder: [
    'That\'s a mistake. I won\'t let it slide.',
    'You gave me an opportunity. I\'ll take it.',
    'Not the best move there. I\'m capitalizing.',
    'A slip. The position turns in my favor.',
    'That was the wrong plan. Watch what happens now.',
  ],
  playerCapture: [
    'Bold trade. Let\'s see if it pays off.',
    'I\'ll recapture and reassess.',
  ],
  aiCapture: [
    'I\'ll take that. Gladly.',
    'Winning material. This should be decisive.',
    'That piece was in my way. Not anymore.',
    'A clean capture. Advantage grows.',
  ],
  aiCheck: [
    'Check. Move your king.',
    'In check. Your options are limited.',
    'Check! The attack continues.',
  ],
  aiCastle: [
    'King is safe. Time to attack.',
    'Castled. Now the real fight begins.',
  ],
  aiGeneral: [
    'Building my position. Patience.',
    'Every move has a purpose.',
    'Setting up for the attack.',
    'Piece activity is everything in this position.',
    'I play to win. No draws.',
    'Improving, always improving.',
  ],
  aiPromotion: [
    'Promoted. Game over.',
    'A new queen. That\'s game.',
  ],
  aiWinning: [
    'I\'m in control now.',
    'The advantage is mine. Just a matter of technique.',
    'You\'re in trouble. I can feel it.',
  ],
  aiLosing: [
    'You\'re outplaying me. I need to fight back.',
    'Good position for you. I\'m not done yet though.',
    'Tough spot. Let me find something.',
  ],
  opening: [
    'Let\'s get the pieces out.',
    'Opening phase. I know my lines.',
    'Development first, attack later.',
    'Standard stuff. The middlegame is where it gets real.',
  ],
  aiWonCheckmate: [
    'Checkmate. I told you I play to win.',
    'That\'s mate. Good effort though.',
    'Checkmate. Better luck next time.',
  ],
  playerWonCheckmate: [
    'Checkmate. You earned that one.',
    'Well played. You got me.',
    'Mate. Respect. Rematch?',
  ],
};

// ─── Tactical Tina ────────────────────────────────────────────────────────────
const TACTICAL_TINA: CommentPool = {
  playerGreatMove: [
    'Ooh, nice tactic! Didn\'t see that one.',
    'Sharp move! You\'re dangerous.',
    'Wow, that\'s really clever!',
    'Love that aggression. Great move!',
    'You found it! That\'s the combination.',
  ],
  playerGoodMove: [
    'Decent. But where\'s the fireworks?',
    'Safe choice. I prefer something spicier.',
    'Solid, sure. But boring!',
    'That works. I guess.',
  ],
  playerBlunder: [
    'Ha! Did you see my trap?',
    'Ooh, that\'s a mistake! Here I come!',
    'You walked right into it!',
    'Now THAT\'S what I was waiting for!',
    'Gotcha! The tactics work in my favor.',
  ],
  playerCapture: [
    'A trade? Where\'s the fun in that?',
    'Taking pieces, are we? I can play that game!',
  ],
  aiCapture: [
    'Yoink! Mine now!',
    'Got it! That piece was asking for it.',
    'Captured! The attack rolls on.',
    'Taking, taking, taking! I love it.',
  ],
  aiCheck: [
    'Check! Run, little king!',
    'In check! Where will you go?',
    'Check! The attack is ON!',
    'Surprise check! Didn\'t expect that, did you?',
  ],
  aiCastle: [
    'Tucking my king away. Now the fun begins!',
    'Castled. Time to launch the attack!',
  ],
  aiGeneral: [
    'Setting up a combination... watch closely!',
    'I see a tactic brewing. Can you?',
    'Pieces aimed at your king. Just saying.',
    'Attack, attack, attack! That\'s my motto.',
    'Looking for a sacrifice opportunity...',
    'Do you see what I\'m planning? Probably not!',
  ],
  aiPromotion: [
    'Promoted! Boom!',
    'New queen! That\'s what speed gets you!',
  ],
  aiWinning: [
    'I\'m crushing it! The attack is unstoppable!',
    'This position is mine. The tactics are flowing!',
    'Everything\'s firing. You can\'t hold this.',
  ],
  aiLosing: [
    'Okay, I\'m on the defensive. For now!',
    'You\'ve got me scrambling. I need a trick!',
    'Behind, but one tactic can change everything!',
  ],
  opening: [
    'Let\'s get this party started!',
    'Opening moves. The calm before the storm!',
    'Developing pieces... but I\'m already planning the attack.',
    'Boring part first. The fireworks come later!',
  ],
  aiWonCheckmate: [
    'CHECKMATE! What a finish!',
    'Boom! That\'s mate! Beautiful combination!',
    'Checkmate! The attack was irresistible!',
  ],
  playerWonCheckmate: [
    'Checkmate! Great attacking play!',
    'You got me! That was a nice combo.',
    'Mated! I respect aggressive play like that.',
  ],
};

// ─── Steady Sam ───────────────────────────────────────────────────────────────
const STEADY_SAM: CommentPool = {
  playerGreatMove: [
    'That\'s a really strong move. Well thought out.',
    'Good calculation. That was the right choice.',
    'Nicely played. Methodical and correct.',
    'You found the best move. Respect.',
  ],
  playerGoodMove: [
    'Solid move. Can\'t argue with that.',
    'Makes sense. Keeping things steady.',
    'Good, practical choice.',
    'Textbook play. Nothing wrong there.',
  ],
  playerBlunder: [
    'Hmm, I think there was something better there.',
    'That might have been a small mistake.',
    'I\'ll try to take advantage of that.',
    'A slip. Happens to everyone.',
  ],
  playerCapture: [
    'Fair trade. The position stays balanced.',
    'An exchange. Let me think about this...',
  ],
  aiCapture: [
    'I\'ll take that piece. Thanks.',
    'A good exchange for me, I think.',
    'Capturing. This improves my position.',
    'Simple and effective. Material counts.',
  ],
  aiCheck: [
    'Check. Please move your king.',
    'A check here. The position opens up.',
  ],
  aiCastle: [
    'Castling. Safety first.',
    'Getting my king to safety. Standard procedure.',
  ],
  aiGeneral: [
    'Slow and steady approach.',
    'Patience wins games. Just improving.',
    'One step at a time.',
    'Developing naturally. No rush.',
    'Solid position. Let\'s keep building.',
    'Playing it safe but with a plan.',
  ],
  aiPromotion: [
    'Promoted. That should do it.',
    'A new queen. Steady play pays off.',
  ],
  aiWinning: [
    'I think I\'m a bit ahead here.',
    'Things are going well. Just need to keep it steady.',
    'My position is looking good.',
  ],
  aiLosing: [
    'You\'re playing well. I need to be patient.',
    'Tough position. But I won\'t give up.',
    'Behind, but there\'s still a lot of game left.',
  ],
  opening: [
    'Developing my pieces. Fundamentals first.',
    'Following the opening principles.',
    'Center control, development, king safety.',
    'Taking it one move at a time.',
  ],
  aiWonCheckmate: [
    'Checkmate. Good game, well played by both sides.',
    'That\'s checkmate. Thanks for the game.',
  ],
  playerWonCheckmate: [
    'Checkmate. Well played! You earned that.',
    'You got me. Great game.',
  ],
};

// ─── Casual Carol ─────────────────────────────────────────────────────────────
const CASUAL_CAROL: CommentPool = {
  playerGreatMove: [
    'Oh wow, that looked really smart!',
    'Nice one! How did you see that?',
    'That was great! I\'m learning from you.',
    'Whoa, great move!',
  ],
  playerGoodMove: [
    'Good move! This is fun.',
    'That looks like it worked out!',
    'Nice! I think that was good.',
    'Cool, cool. Good stuff.',
  ],
  playerBlunder: [
    'Ooh, I think I can do something with that!',
    'Was that on purpose? I\'m not sure...',
    'Hmm, I think that might help me!',
    'I don\'t want to be rude, but... thanks!',
  ],
  playerCapture: [
    'Oh, you took my piece! Rude!',
    'Hey! I liked that piece!',
  ],
  aiCapture: [
    'Ooh, I got one! Is that good?',
    'Taking! Sorry, not sorry!',
    'Captured! I think that helps me?',
    'Bye bye, little piece!',
  ],
  aiCheck: [
    'Check! That\'s the thing where your king has to move, right?',
    'Oh, check! Am I doing this right?',
    'Check! This is exciting!',
  ],
  aiCastle: [
    'Castling! I always think that move is cool.',
    'The swoopy king-rook thing! Love it.',
  ],
  aiGeneral: [
    'I\'ll just put this here. Seems nice!',
    'This is fun! I\'m having a great time.',
    'Hmm, I think this is a good spot.',
    'Not sure about this one, but let\'s try!',
    'I\'m just vibing with this position.',
    'Playing for fun, that\'s my strategy!',
  ],
  aiPromotion: [
    'My pawn became a queen! That\'s so cool!',
    'Promotion! Is that as good as I think it is?',
  ],
  aiWinning: [
    'Wait, am I winning? That\'s new!',
    'I think things are going well for me!',
    'Am I actually doing good? No way!',
  ],
  aiLosing: [
    'You\'re really good at this! But I\'m having fun!',
    'Okay you\'re crushing me, but it\'s fine!',
    'I\'m losing but honestly? Still having a great time.',
  ],
  opening: [
    'Here we go! I love the start of a game!',
    'Moving pieces out. That\'s what you do, right?',
    'Let\'s have a fun game!',
    'I\'m just going to play what feels right!',
  ],
  aiWonCheckmate: [
    'Wait, I won?! Checkmate! Yay!',
    'Checkmate! That was so much fun! Again?',
  ],
  playerWonCheckmate: [
    'Checkmate! Great game! You\'re really good!',
    'You got me! That was fun though!',
    'Mated! Good game! Want to play again?',
  ],
};

// ─── Beginner Bob ─────────────────────────────────────────────────────────────
const BEGINNER_BOB: CommentPool = {
  playerGreatMove: [
    'Whoa! That looked really smart. I have no idea how to respond.',
    'That was... wow. Are you a pro or something?',
    'I don\'t understand what just happened but it seems good for you.',
    'How did you even see that? I\'m lost.',
  ],
  playerGoodMove: [
    'Hmm, that looks like it was probably good?',
    'I think that was a good move. Maybe?',
    'Oh okay. Sure. I\'ll just... figure something out.',
  ],
  playerBlunder: [
    'Wait, was that bad? I honestly can\'t tell.',
    'Oh hmm... I think maybe something happened? Not sure.',
    'I have no idea if that helped me or not.',
    'Did you mean to do that? I\'m confused too.',
  ],
  playerCapture: [
    'Hey, that was my piece! I think I needed that.',
    'Oh no, you took something. Was that important?',
  ],
  aiCapture: [
    'Ooh I can take this! ...wait, is it a trap?',
    'Taking! Please don\'t let this be a mistake.',
    'I got a piece! That\'s good... right?',
    'This seems free? I\'m going for it.',
  ],
  aiCheck: [
    'Check! Wait, that IS check, right?',
    'Is that... check? I think it is! Cool!',
    'Check! I actually did something!',
  ],
  aiCastle: [
    'I heard you\'re supposed to castle early? So here goes.',
    'The castle thing! I remembered to do it!',
  ],
  aiGeneral: [
    'I\'ll just... move this somewhere. Seems fine?',
    'Hmm. I have no idea what I\'m doing.',
    'Is this good? I genuinely don\'t know.',
    'Okay, this piece looks lonely over there. Let\'s move it.',
    'I\'m just going to guess and hope for the best.',
    'Eeny, meeny, miny... this one.',
    '*moves piece nervously*',
    'I think this is what you\'re supposed to do?',
  ],
  aiPromotion: [
    'My pawn made it! What do I pick? Queen, right? Queen!',
    'A promotion! I actually did something right!',
  ],
  aiWinning: [
    'Wait... am I winning?? How did THAT happen?',
    'I think I might actually be ahead? This is unprecedented.',
    'Something went right! I\'m as surprised as you are.',
  ],
  aiLosing: [
    'Yeah, that\'s about what I expected.',
    'I\'m definitely losing. But hey, I\'m learning!',
    'This is going badly. As usual. But I\'m having fun!',
    'I have no idea what went wrong. Everything, probably.',
  ],
  opening: [
    'Okay! I remember some of the piece names. That\'s a start.',
    'Here we go... wish me luck!',
    'I watched a chess video once. Let\'s see if it helps.',
    'Opening! I\'ll just move pawns and hope?',
  ],
  aiWonCheckmate: [
    'Wait... is that checkmate?! I WON?! How?!',
    'Checkmate! I can\'t believe it! Is this real life?',
  ],
  playerWonCheckmate: [
    'Checkmate. Yep, saw that coming. Well, I didn\'t, but still.',
    'You got me! I never stood a chance, honestly.',
    'Mated! I\'m just glad I didn\'t knock the pieces over.',
  ],
};

// ─── Pool lookup ──────────────────────────────────────────────────────────────

const PERSONALITY_POOLS: Record<string, CommentPool> = {
  'grandmaster-greg': GRANDMASTER_GREG,
  'expert-eve': EXPERT_EVE,
  'tactical-tina': TACTICAL_TINA,
  'steady-sam': STEADY_SAM,
  'casual-carol': CASUAL_CAROL,
  'beginner-bob': BEGINNER_BOB,
};

// Fallback: match difficulty tier
function getPoolForPersonality(personality?: AIPersonality): CommentPool {
  if (personality && PERSONALITY_POOLS[personality.id]) {
    return PERSONALITY_POOLS[personality.id];
  }
  // Fallback based on difficulty
  if (personality) {
    switch (personality.difficulty) {
      case 'hard': return EXPERT_EVE;
      case 'medium': return STEADY_SAM;
      case 'easy': return CASUAL_CAROL;
    }
  }
  return STEADY_SAM; // default
}

// ─── Commentary Generator ─────────────────────────────────────────────────────

export function generateCommentary(ctx: CommentaryContext): string | null {
  const pool = getPoolForPersonality(ctx.personality);
  const evalDiff = ctx.evalAfter - ctx.evalBefore;

  // Checkmate - always comment
  if (isCheckmate(ctx.move)) {
    return ctx.isPlayerMove ? pick(pool.playerWonCheckmate) : pick(pool.aiWonCheckmate);
  }

  if (ctx.isPlayerMove) {
    // ── Player move reactions ──

    // Player great move (big eval swing in their favor)
    if (evalDiff < -150) {
      return pick(pool.playerGreatMove);
    }

    // Player good move
    if (evalDiff < -50 && Math.random() < 0.5) {
      return pick(pool.playerGoodMove);
    }

    // Player blunder (eval swung in AI's favor)
    if (evalDiff > 200) {
      return pick(pool.playerBlunder);
    }

    // Player capture
    if (ctx.move.captured && Math.random() < 0.35) {
      return pick(pool.playerCapture);
    }

    // Don't comment on every player move
    return null;
  }

  // ── AI move commentary ──

  // Check
  if (isCheck(ctx.move) && Math.random() < 0.7) {
    return pick(pool.aiCheck);
  }

  // Castling
  if (isCastle(ctx.move)) {
    return pick(pool.aiCastle);
  }

  // Promotion
  if (isPromotion(ctx.move)) {
    return pick(pool.aiPromotion);
  }

  // Capture - mention specific piece for Greg
  if (ctx.move.captured) {
    if (Math.random() < 0.5) {
      // Context-aware capture comments for high-level AIs
      if (ctx.personality?.id === 'grandmaster-greg' && Math.random() < 0.4) {
        const captured = capPieceName(ctx.move.captured);
        const contextCaptures = [
          `Eliminating your ${captured.toLowerCase()}. It was misplaced.`,
          `Taking the ${captured.toLowerCase()}. A favorable exchange.`,
          `Your ${captured.toLowerCase()} had to go. The position demanded it.`,
        ];
        return pick(contextCaptures);
      }
      return pick(pool.aiCapture);
    }
  }

  // Opening phase (moves 1-6) — comment ~40% of the time
  if (ctx.moveNumber <= 6 && Math.random() < 0.4) {
    return pick(pool.opening);
  }

  // Position-based: AI winning or losing
  // evalAfter from white's perspective; AI plays black (negative = AI ahead)
  // Actually AI can be either color, so use the eval relative to the position
  const absEval = Math.abs(ctx.evalAfter);
  if (absEval > 250 && Math.random() < 0.3) {
    // Determine if AI is ahead: AI just moved, so evalAfter reflects post-AI-move position
    // If AI plays black: negative eval = AI winning
    // If AI plays white: positive eval = AI winning
    // Since AI made the move, a favorable eval means the move improved AI's position
    const aiColor = ctx.move.color; // 'w' or 'b'
    const aiAhead = aiColor === 'w' ? ctx.evalAfter > 250 : ctx.evalAfter < -250;
    if (aiAhead) {
      return pick(pool.aiWinning);
    } else {
      return pick(pool.aiLosing);
    }
  }

  // General AI move comment (~30% chance)
  if (Math.random() < 0.3) {
    return pick(pool.aiGeneral);
  }

  // Don't comment on every move
  return null;
}

// Kept for backwards compatibility but no longer needed separately
export function getPersonalityComment(_personality: AIPersonality, _evalAfter: number): string | null {
  return null;
}
