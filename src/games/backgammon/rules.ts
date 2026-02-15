export type PlayerColor = 'white' | 'black';

export interface PointState {
  count: number;
  color: PlayerColor | null;
}

export interface BackgammonState {
  points: PointState[];      // 24 points, index 0 = point 1, index 23 = point 24
  bar: [number, number];     // [white on bar, black on bar]
  borneOff: [number, number]; // [white borne off, black borne off]
  currentPlayer: PlayerColor;
  dice: [number, number] | null;
  remainingMoves: number[];  // dice values still available this turn
  phase: 'rolling' | 'moving' | 'finished';
  winner: PlayerColor | null;
  doublingCube: number;
  turnCount: number;
  lastMove: BackgammonMove | null;
}

export interface BackgammonMove {
  from: number | 'bar';  // point index (0-23) or 'bar'
  to: number | 'off';    // point index (0-23) or 'off' (bearing off)
  dieValue: number;
  hitOpponent: boolean;
}

// White moves from high to low (24→1), home board = points 0-5 (1-6)
// Black moves from low to high (1→24), home board = points 18-23 (19-24)

export function createInitialBoard(): PointState[] {
  const points: PointState[] = Array.from({ length: 24 }, () => ({ count: 0, color: null }));

  // Standard backgammon starting position
  // Point indices are 0-based (point 1 = index 0, point 24 = index 23)
  points[0]  = { count: 2, color: 'white' };  // Point 1: 2 white
  points[5]  = { count: 5, color: 'black' };  // Point 6: 5 black
  points[7]  = { count: 3, color: 'black' };  // Point 8: 3 black
  points[11] = { count: 5, color: 'white' };  // Point 12: 5 white
  points[12] = { count: 5, color: 'black' };  // Point 13: 5 black
  points[16] = { count: 3, color: 'white' };  // Point 17: 3 white
  points[18] = { count: 5, color: 'white' };  // Point 19: 5 white
  points[23] = { count: 2, color: 'black' };  // Point 24: 2 black

  return points;
}

export function createInitialState(): BackgammonState {
  return {
    points: createInitialBoard(),
    bar: [0, 0],
    borneOff: [0, 0],
    currentPlayer: 'white',
    dice: null,
    remainingMoves: [],
    phase: 'rolling',
    winner: null,
    doublingCube: 1,
    turnCount: 0,
    lastMove: null,
  };
}

export function rollDice(): [number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}

export function getDiceMovesAvailable(dice: [number, number]): number[] {
  if (dice[0] === dice[1]) {
    // Doubles: 4 moves of that value
    return [dice[0], dice[0], dice[0], dice[0]];
  }
  return [dice[0], dice[1]];
}

function playerIndex(color: PlayerColor): 0 | 1 {
  return color === 'white' ? 0 : 1;
}

function opponentColor(color: PlayerColor): PlayerColor {
  return color === 'white' ? 'black' : 'white';
}

/** Direction of movement: white moves negative (24→1), black moves positive (1→24) */
function moveDirection(color: PlayerColor): number {
  return color === 'white' ? -1 : 1;
}

/** Bar entry point for a player */
function barEntryPoint(color: PlayerColor): number {
  // White enters at point 24 (index 23) and moves toward 1
  // Black enters at point 1 (index 0) and moves toward 24
  return color === 'white' ? 24 : -1;
}

/** Check if a player can bear off (all pieces in home board or already off) */
export function canBearOff(state: BackgammonState, color: PlayerColor): boolean {
  const idx = playerIndex(color);
  if (state.bar[idx] > 0) return false;

  // Count pieces not in home board
  for (let i = 0; i < 24; i++) {
    const pt = state.points[i];
    if (pt.color !== color || pt.count === 0) continue;
    if (color === 'white' && i > 5) return false;   // White home = 0-5
    if (color === 'black' && i < 18) return false;   // Black home = 18-23
  }
  return true;
}

/** Get the farthest point from home with pieces (for bearing off with higher die) */
function farthestFromHome(state: BackgammonState, color: PlayerColor): number {
  if (color === 'white') {
    for (let i = 5; i >= 0; i--) {
      if (state.points[i].color === color && state.points[i].count > 0) return i;
    }
  } else {
    for (let i = 18; i <= 23; i++) {
      if (state.points[i].color === color && state.points[i].count > 0) return i;
    }
  }
  return -1;
}

/** Get all valid moves for the current state and a specific die value */
export function getValidMovesForDie(state: BackgammonState, dieValue: number): BackgammonMove[] {
  const color = state.currentPlayer;
  const idx = playerIndex(color);
  const dir = moveDirection(color);
  const opp = opponentColor(color);
  const moves: BackgammonMove[] = [];

  // Must move from bar first
  if (state.bar[idx] > 0) {
    const entry = barEntryPoint(color);
    const target = entry + dir * dieValue;
    if (target < 0 || target > 23) return moves;

    const pt = state.points[target];
    if (pt.color === opp && pt.count >= 2) return moves; // Blocked

    moves.push({
      from: 'bar',
      to: target,
      dieValue,
      hitOpponent: pt.color === opp && pt.count === 1,
    });
    return moves;
  }

  // Regular moves and bearing off
  const bearingOff = canBearOff(state, color);

  for (let i = 0; i < 24; i++) {
    const pt = state.points[i];
    if (pt.color !== color || pt.count === 0) continue;

    const target = i + dir * dieValue;

    // Bearing off
    if (bearingOff) {
      if (color === 'white' && target < 0) {
        // Exact bear off or higher die from farthest point
        const exactOff = (target === -1);
        const farthest = farthestFromHome(state, color);
        if (exactOff || (farthest === i && target < 0)) {
          moves.push({ from: i, to: 'off', dieValue, hitOpponent: false });
          continue;
        }
      } else if (color === 'black' && target > 23) {
        const exactOff = (target === 24);
        const farthest = farthestFromHome(state, color);
        if (exactOff || (farthest === i && target > 23)) {
          moves.push({ from: i, to: 'off', dieValue, hitOpponent: false });
          continue;
        }
      }
    }

    // Normal move
    if (target < 0 || target > 23) continue;
    const destPt = state.points[target];
    if (destPt.color === opp && destPt.count >= 2) continue; // Blocked

    moves.push({
      from: i,
      to: target,
      dieValue,
      hitOpponent: destPt.color === opp && destPt.count === 1,
    });
  }

  return moves;
}

/** Get all valid moves for any remaining die value */
export function getAllValidMoves(state: BackgammonState): BackgammonMove[] {
  const seen = new Set<string>();
  const moves: BackgammonMove[] = [];

  for (const dv of state.remainingMoves) {
    for (const m of getValidMovesForDie(state, dv)) {
      const key = `${m.from}-${m.to}-${m.dieValue}`;
      if (!seen.has(key)) {
        seen.add(key);
        moves.push(m);
      }
    }
  }
  return moves;
}

/** Apply a move to the state, returning a new state */
export function applyMove(state: BackgammonState, move: BackgammonMove): BackgammonState {
  const newState: BackgammonState = {
    ...state,
    points: state.points.map(p => ({ ...p })),
    bar: [...state.bar] as [number, number],
    borneOff: [...state.borneOff] as [number, number],
    remainingMoves: [...state.remainingMoves],
    lastMove: move,
  };

  const color = state.currentPlayer;
  const idx = playerIndex(color);
  const oppIdx = 1 - idx;

  // Remove piece from source
  if (move.from === 'bar') {
    newState.bar[idx]--;
  } else {
    newState.points[move.from].count--;
    if (newState.points[move.from].count === 0) {
      newState.points[move.from].color = null;
    }
  }

  // Place piece at destination
  if (move.to === 'off') {
    newState.borneOff[idx]++;
  } else {
    // Hit opponent blot
    if (move.hitOpponent) {
      newState.points[move.to].count = 0;
      newState.points[move.to].color = null;
      newState.bar[oppIdx]++;
    }
    newState.points[move.to].count++;
    newState.points[move.to].color = color;
  }

  // Remove used die
  const dieIdx = newState.remainingMoves.indexOf(move.dieValue);
  if (dieIdx !== -1) {
    newState.remainingMoves.splice(dieIdx, 1);
  }

  // Check win
  if (newState.borneOff[idx] === 15) {
    newState.phase = 'finished';
    newState.winner = color;
  }

  return newState;
}

/** Check if the current player has any valid moves */
export function hasAnyMoves(state: BackgammonState): boolean {
  return getAllValidMoves(state).length > 0;
}

/** Pip count for a player (total distance to bear off all pieces) */
export function pipCount(state: BackgammonState, color: PlayerColor): number {
  const idx = playerIndex(color);
  let count = 0;

  // Pieces on bar: white needs to go 25 points, black needs to go 25 points
  count += state.bar[idx] * 25;

  for (let i = 0; i < 24; i++) {
    const pt = state.points[i];
    if (pt.color !== color || pt.count === 0) continue;
    if (color === 'white') {
      count += pt.count * (i + 1); // Distance from bearing off edge
    } else {
      count += pt.count * (24 - i);
    }
  }

  return count;
}
