export type CellState = 'empty' | 'ship' | 'hit' | 'miss';
export type GameMode = 'classic' | 'advanced';
export type WeaponType = 'standard' | 'torpedo' | 'depth-charge' | 'airstrike';

export interface WeaponDef {
  type: WeaponType;
  name: string;
  icon: string;
  description: string;
  pattern: { dr: number; dc: number }[];
}

export const WEAPON_DEFS: Record<WeaponType, WeaponDef> = {
  standard: {
    type: 'standard',
    name: 'Standard',
    icon: '\u{1F4A5}',
    description: 'Single cell',
    pattern: [{ dr: 0, dc: 0 }],
  },
  torpedo: {
    type: 'torpedo',
    name: 'Torpedo',
    icon: '\u{1F680}',
    description: '3 cells in a line',
    pattern: [{ dr: 0, dc: -1 }, { dr: 0, dc: 0 }, { dr: 0, dc: 1 }],
  },
  'depth-charge': {
    type: 'depth-charge',
    name: 'Depth Charge',
    icon: '\u{1F4A3}',
    description: '+ pattern (5 cells)',
    pattern: [
      { dr: -1, dc: 0 },
      { dr: 0, dc: -1 }, { dr: 0, dc: 0 }, { dr: 0, dc: 1 },
      { dr: 1, dc: 0 },
    ],
  },
  airstrike: {
    type: 'airstrike',
    name: 'Airstrike',
    icon: '\u2708\uFE0F',
    description: 'Row of 5 cells',
    pattern: [
      { dr: 0, dc: -2 }, { dr: 0, dc: -1 }, { dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 0, dc: 2 },
    ],
  },
};

export interface WeaponInventory {
  torpedo: number;
  'depth-charge': number;
  airstrike: number;
}

export const STARTING_WEAPONS: WeaponInventory = {
  torpedo: 3,
  'depth-charge': 2,
  airstrike: 1,
};

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
  mode: GameMode;
  gridSize: number;
  playerWeapons: WeaponInventory;
  aiWeapons: WeaponInventory;
  selectedWeapon: WeaponType;
}

export const SHIP_TYPES = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 },
];

export const ADVANCED_SHIP_TYPES = [
  ...SHIP_TYPES,
  { name: 'Patrol Boat', size: 2 },
];

export const GRID_SIZE = 10;
export const ADVANCED_GRID_SIZE = 12;

export function getGridSize(mode: GameMode): number {
  return mode === 'advanced' ? ADVANCED_GRID_SIZE : GRID_SIZE;
}

export function getShipTypes(mode: GameMode): { name: string; size: number }[] {
  return mode === 'advanced' ? ADVANCED_SHIP_TYPES : SHIP_TYPES;
}

export function createEmptyBoard(gridSize: number = GRID_SIZE): BattleshipBoard {
  return {
    grid: Array.from({ length: gridSize }, () => Array(gridSize).fill('empty')),
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
  const gs = board.grid.length;
  for (let i = 0; i < size; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    if (r < 0 || r >= gs || c < 0 || c >= gs) return false;
    if (board.grid[r][c] !== 'empty') return false;
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

export function fireMultiShot(
  board: BattleshipBoard,
  row: number,
  col: number,
  weapon: WeaponDef
): { row: number; col: number; result: 'hit' | 'miss' | 'already-shot' | 'sunk' }[] {
  const gs = board.grid.length;
  const results: { row: number; col: number; result: 'hit' | 'miss' | 'already-shot' | 'sunk' }[] = [];
  for (const { dr, dc } of weapon.pattern) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < gs && c >= 0 && c < gs) {
      results.push({ row: r, col: c, result: fireShot(board, r, c) });
    }
  }
  return results;
}

export function allShipsSunk(board: BattleshipBoard): boolean {
  return board.ships.length > 0 && board.ships.every((s) => s.sunk);
}

export function randomPlacement(board: BattleshipBoard, shipTypes?: { name: string; size: number }[]): void {
  const types = shipTypes ?? SHIP_TYPES;
  const gs = board.grid.length;
  for (const ship of types) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 1000) {
      const horizontal = Math.random() > 0.5;
      const row = Math.floor(Math.random() * gs);
      const col = Math.floor(Math.random() * gs);
      placed = placeShip(board, ship.name, row, col, ship.size, horizontal);
      attempts++;
    }
  }
}
