import { BattleshipBoard, GRID_SIZE, CellState } from './rules';
import { Difficulty } from '../../engine/types';

interface AIState {
  mode: 'hunt' | 'target';
  targetQueue: { row: number; col: number }[];
  lastHit: { row: number; col: number } | null;
}

let aiState: AIState = {
  mode: 'hunt',
  targetQueue: [],
  lastHit: null,
};

export function resetAI(): void {
  aiState = {
    mode: 'hunt',
    targetQueue: [],
    lastHit: null,
  };
}

export function getAIShot(playerBoard: BattleshipBoard, difficulty: Difficulty): { row: number; col: number } {
  // Process target queue first (targeting mode)
  while (aiState.targetQueue.length > 0) {
    const target = aiState.targetQueue.shift()!;
    const cell = playerBoard.grid[target.row][target.col];
    if (cell !== 'hit' && cell !== 'miss') {
      return target;
    }
  }

  // Hunt mode
  aiState.mode = 'hunt';

  // Easy: completely random
  if (difficulty === 'easy') {
    return randomShot(playerBoard);
  }

  // Medium/Hard: checkerboard pattern with probability density
  return smartShot(playerBoard, difficulty);
}

export function processResult(row: number, col: number, result: 'hit' | 'miss' | 'sunk'): void {
  if (result === 'hit') {
    aiState.mode = 'target';
    aiState.lastHit = { row, col };

    // Add adjacent cells to target queue
    const adjacent = [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ].filter((p) => p.row >= 0 && p.row < GRID_SIZE && p.col >= 0 && p.col < GRID_SIZE);

    for (const adj of adjacent) {
      if (!aiState.targetQueue.some((t) => t.row === adj.row && t.col === adj.col)) {
        aiState.targetQueue.push(adj);
      }
    }
  } else if (result === 'sunk') {
    // Ship sunk, clear target queue (might target other ships though)
    // Only clear if no other hits are unsunk
    aiState.targetQueue = [];
    aiState.mode = 'hunt';
    aiState.lastHit = null;
  }
}

function randomShot(board: BattleshipBoard): { row: number; col: number } {
  const available: { row: number; col: number }[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board.grid[r][c] !== 'hit' && board.grid[r][c] !== 'miss') {
        available.push({ row: r, col: c });
      }
    }
  }
  return available[Math.floor(Math.random() * available.length)] ?? { row: 0, col: 0 };
}

function smartShot(board: BattleshipBoard, difficulty: Difficulty): { row: number; col: number } {
  const scores: number[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));

  // Calculate probability density
  const remainingShips = board.ships.filter((s) => !s.sunk);
  const shipSizes = remainingShips.map((s) => s.size);

  for (const size of shipSizes) {
    // Try horizontal placements
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c <= GRID_SIZE - size; c++) {
        let valid = true;
        for (let i = 0; i < size; i++) {
          const cell = board.grid[r][c + i];
          if (cell === 'miss' || cell === 'hit') {
            valid = false;
            break;
          }
        }
        if (valid) {
          for (let i = 0; i < size; i++) {
            if (board.grid[r][c + i] !== 'hit') {
              scores[r][c + i]++;
            }
          }
        }
      }
    }

    // Try vertical placements
    for (let r = 0; r <= GRID_SIZE - size; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        let valid = true;
        for (let i = 0; i < size; i++) {
          const cell = board.grid[r + i][c];
          if (cell === 'miss' || cell === 'hit') {
            valid = false;
            break;
          }
        }
        if (valid) {
          for (let i = 0; i < size; i++) {
            if (board.grid[r + i][c] !== 'hit') {
              scores[r + i][c]++;
            }
          }
        }
      }
    }
  }

  // Checkerboard bonus (hard mode)
  if (difficulty === 'hard') {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if ((r + c) % 2 === 0) {
          scores[r][c] += 1;
        }
      }
    }
  }

  // Find best shot
  let bestScore = -1;
  let bestShots: { row: number; col: number }[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = board.grid[r][c];
      if (cell === 'hit' || cell === 'miss') continue;

      if (scores[r][c] > bestScore) {
        bestScore = scores[r][c];
        bestShots = [{ row: r, col: c }];
      } else if (scores[r][c] === bestScore) {
        bestShots.push({ row: r, col: c });
      }
    }
  }

  // Add some randomness for medium difficulty
  if (difficulty === 'medium' && Math.random() < 0.2) {
    return randomShot(board);
  }

  return bestShots[Math.floor(Math.random() * bestShots.length)] ?? { row: 0, col: 0 };
}
