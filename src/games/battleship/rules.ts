export type CellState = 'empty' | 'ship' | 'hit' | 'miss';

export interface Ship {
  name: string;
  size: number;
  positions: { row: number; col: number }[];
  hits: number;
  sunk: boolean;
}

export interface BattleshipBoard {
  grid: CellState[][];
  ships: Ship[];
}

export interface BattleshipState {
  playerBoard: BattleshipBoard;
  aiBoard: BattleshipBoard;
  currentPlayer: 'player' | 'ai';
  phase: 'placement' | 'playing' | 'finished';
  winner: 'player' | 'ai' | null;
  playerShipsToPlace: { name: string; size: number }[];
  placementOrientation: 'horizontal' | 'vertical';
}

export const SHIP_TYPES = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 },
];

export const GRID_SIZE = 10;

export function createEmptyBoard(): BattleshipBoard {
  return {
    grid: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('empty')),
    ships: [],
  };
}

export function canPlaceShip(
  board: BattleshipBoard,
  row: number,
  col: number,
  size: number,
  horizontal: boolean
): boolean {
  for (let i = 0; i < size; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;

    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    if (board.grid[r][c] !== 'empty') return false;

    // Check adjacent cells (no ships touching)
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          if (board.grid[nr][nc] === 'ship') return false;
        }
      }
    }
  }
  return true;
}

export function placeShip(
  board: BattleshipBoard,
  name: string,
  row: number,
  col: number,
  size: number,
  horizontal: boolean
): boolean {
  if (!canPlaceShip(board, row, col, size, horizontal)) return false;

  const positions: { row: number; col: number }[] = [];
  for (let i = 0; i < size; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    board.grid[r][c] = 'ship';
    positions.push({ row: r, col: c });
  }

  board.ships.push({ name, size, positions, hits: 0, sunk: false });
  return true;
}

export function fireShot(board: BattleshipBoard, row: number, col: number): 'hit' | 'miss' | 'already-shot' | 'sunk' {
  const cell = board.grid[row][col];
  if (cell === 'hit' || cell === 'miss') return 'already-shot';

  if (cell === 'ship') {
    board.grid[row][col] = 'hit';

    // Check which ship was hit
    for (const ship of board.ships) {
      if (ship.positions.some((p) => p.row === row && p.col === col)) {
        ship.hits++;
        if (ship.hits === ship.size) {
          ship.sunk = true;
          return 'sunk';
        }
        return 'hit';
      }
    }
    return 'hit';
  }

  board.grid[row][col] = 'miss';
  return 'miss';
}

export function allShipsSunk(board: BattleshipBoard): boolean {
  return board.ships.length > 0 && board.ships.every((s) => s.sunk);
}

export function randomPlacement(board: BattleshipBoard): void {
  for (const ship of SHIP_TYPES) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 1000) {
      const horizontal = Math.random() > 0.5;
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);
      placed = placeShip(board, ship.name, row, col, ship.size, horizontal);
      attempts++;
    }
  }
}
