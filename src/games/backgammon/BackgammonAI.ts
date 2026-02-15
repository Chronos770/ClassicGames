import {
  BackgammonState,
  BackgammonMove,
  getAllValidMoves,
  applyMove,
  hasAnyMoves,
  pipCount,
  canBearOff,
} from './rules';

/** Evaluate a position for the current player (higher = better for white) */
function evaluatePosition(state: BackgammonState): number {
  let score = 0;

  // Pip count difference (lower is better)
  const whitePip = pipCount(state, 'white');
  const blackPip = pipCount(state, 'black');
  score += (blackPip - whitePip) * 1;

  // Borne off bonus
  score += state.borneOff[0] * 10;
  score -= state.borneOff[1] * 10;

  // Bar penalty (opponent on bar is good, us on bar is bad)
  score -= state.bar[0] * 20;
  score += state.bar[1] * 20;

  // Point control: prefer made points (2+ pieces), penalize blots (1 piece)
  for (let i = 0; i < 24; i++) {
    const pt = state.points[i];
    if (pt.count === 0) continue;

    if (pt.color === 'white') {
      if (pt.count >= 2) {
        // Made point bonus, higher value for home board and key points
        let pointBonus = 3;
        if (i <= 5) pointBonus = 5; // Home board
        if (i === 4 || i === 5 || i === 6) pointBonus = 6; // Golden points
        score += pointBonus;
      } else {
        // Blot penalty, worse if in opponent's home board
        let blotPenalty = -4;
        if (i >= 18) blotPenalty = -8; // In opponent's home
        score += blotPenalty;
      }
    } else {
      if (pt.count >= 2) {
        let pointBonus = 3;
        if (i >= 18) pointBonus = 5;
        if (i === 17 || i === 18 || i === 19) pointBonus = 6;
        score -= pointBonus;
      } else {
        let blotPenalty = -4;
        if (i <= 5) blotPenalty = -8;
        score -= blotPenalty;
      }
    }
  }

  // Bearing off readiness
  if (canBearOff(state, 'white')) score += 15;
  if (canBearOff(state, 'black')) score -= 15;

  return score;
}

/** Find the best sequence of moves for the current turn using simple lookahead */
export function getBestMoves(state: BackgammonState, difficulty: string): BackgammonMove[] {
  if (state.phase !== 'moving') return [];

  const isBlack = state.currentPlayer === 'black';
  const bestSequence: BackgammonMove[] = [];

  // Easy: random valid moves
  if (difficulty === 'easy') {
    return getRandomMoves(state);
  }

  // Medium/Hard: evaluate all possible move sequences
  const sequences = generateAllSequences(state, [], 0);

  if (sequences.length === 0) return [];

  let bestScore = isBlack ? Infinity : -Infinity;
  let bestSeq: BackgammonMove[] = sequences[0];

  for (const seq of sequences) {
    // Apply all moves in sequence to get final state
    let s = state;
    for (const m of seq) {
      s = applyMove(s, m);
    }
    const score = evaluatePosition(s);

    if (isBlack ? score < bestScore : score > bestScore) {
      bestScore = score;
      bestSeq = seq;
    }
  }

  // Hard: add some randomness to medium difficulty
  if (difficulty === 'medium' && Math.random() < 0.25 && sequences.length > 1) {
    // 25% chance of picking a random sequence for variety
    return sequences[Math.floor(Math.random() * sequences.length)];
  }

  return bestSeq;
}

function getRandomMoves(state: BackgammonState): BackgammonMove[] {
  const moves: BackgammonMove[] = [];
  let currentState = state;

  while (currentState.remainingMoves.length > 0 && hasAnyMoves(currentState)) {
    const valid = getAllValidMoves(currentState);
    if (valid.length === 0) break;
    const move = valid[Math.floor(Math.random() * valid.length)];
    moves.push(move);
    currentState = applyMove(currentState, move);
  }

  return moves;
}

function generateAllSequences(
  state: BackgammonState,
  currentSeq: BackgammonMove[],
  depth: number
): BackgammonMove[][] {
  if (depth > 4) return [currentSeq]; // Max 4 moves per turn (doubles)
  if (state.remainingMoves.length === 0 || !hasAnyMoves(state)) {
    return [currentSeq];
  }

  const validMoves = getAllValidMoves(state);
  if (validMoves.length === 0) return [currentSeq];

  // Limit branching for performance
  const maxBranch = depth === 0 ? 15 : 10;
  const movesToTry = validMoves.length > maxBranch
    ? validMoves.slice(0, maxBranch)
    : validMoves;

  const results: BackgammonMove[][] = [];

  for (const move of movesToTry) {
    const newState = applyMove(state, move);
    const subResults = generateAllSequences(newState, [...currentSeq, move], depth + 1);
    results.push(...subResults);

    // Limit total results to prevent explosion
    if (results.length > 200) break;
  }

  return results;
}
