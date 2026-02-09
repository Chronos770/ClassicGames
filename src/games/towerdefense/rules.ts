// ── Types & Constants ──

export type Difficulty = 'easy' | 'medium' | 'hard';

export const GRID_COLS = 20;
export const GRID_ROWS = 14;
export const CELL_SIZE = 36;
export const CANVAS_WIDTH = 750;
export const CANVAS_HEIGHT = 550;
export const TOTAL_WAVES = 15;
export const STARTING_GOLD = 200;
export const STARTING_LIVES = 20;

// ── Cell types ──
export type CellType = 'grass' | 'path' | 'spawn' | 'exit' | 'blocked';

// ── Tower Definitions ──
export type TowerType = 'arrow' | 'cannon' | 'ice' | 'lightning';

export interface TowerDef {
  type: TowerType;
  name: string;
  symbol: string;
  cost: number;
  damage: number;
  range: number;       // in cells
  fireRate: number;     // shots per second
  special: string;
  color: number;
  upgradeCost: number;
  upgradeDamageBonus: number;
}

export const TOWER_DEFS: Record<TowerType, TowerDef> = {
  arrow: {
    type: 'arrow',
    name: 'Arrow Tower',
    symbol: '\u{1F3F9}',
    cost: 50,
    damage: 15,
    range: 3.5,
    fireRate: 2,
    special: 'Fast single-target',
    color: 0x8B4513,
    upgradeCost: 40,
    upgradeDamageBonus: 10,
  },
  cannon: {
    type: 'cannon',
    name: 'Cannon Tower',
    symbol: '\u{1F4A3}',
    cost: 100,
    damage: 30,
    range: 2.5,
    fireRate: 0.8,
    special: 'Area of effect (1.5 cell radius)',
    color: 0x555555,
    upgradeCost: 75,
    upgradeDamageBonus: 20,
  },
  ice: {
    type: 'ice',
    name: 'Ice Tower',
    symbol: '\u2744',
    cost: 75,
    damage: 8,
    range: 3,
    fireRate: 1.5,
    special: 'Slows enemies 50% for 2s',
    color: 0x66CCFF,
    upgradeCost: 50,
    upgradeDamageBonus: 5,
  },
  lightning: {
    type: 'lightning',
    name: 'Lightning Tower',
    symbol: '\u26A1',
    cost: 125,
    damage: 20,
    range: 3,
    fireRate: 1,
    special: 'Chains to 3 enemies',
    color: 0xFFDD00,
    upgradeCost: 90,
    upgradeDamageBonus: 15,
  },
};

// ── Enemy Definitions ──
export type EnemyType = 'grunt' | 'scout' | 'brute' | 'overlord';

export interface EnemyDef {
  type: EnemyType;
  name: string;
  symbol: string;
  hp: number;
  speed: number;   // cells per second
  reward: number;
  color: number;
}

export const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  grunt: {
    type: 'grunt',
    name: 'Grunt',
    symbol: '\u{1F47E}',
    hp: 60,
    speed: 1.8,
    reward: 10,
    color: 0x44AA44,
  },
  scout: {
    type: 'scout',
    name: 'Scout',
    symbol: '\u{1F3C3}',
    hp: 35,
    speed: 3.0,
    reward: 15,
    color: 0x44AADD,
  },
  brute: {
    type: 'brute',
    name: 'Brute',
    symbol: '\u{1F6E1}',
    hp: 200,
    speed: 1.0,
    reward: 25,
    color: 0xAA4444,
  },
  overlord: {
    type: 'overlord',
    name: 'Overlord',
    symbol: '\u{1F480}',
    hp: 800,
    speed: 0.6,
    reward: 100,
    color: 0x9933CC,
  },
};

// ── Map Definitions ──
export interface MapDef {
  name: string;
  description: string;
  grid: CellType[][];
  paths: { row: number; col: number }[][];  // one or more paths from spawn to exit
}

function createGrid(rows: number, cols: number, fill: CellType = 'grass'): CellType[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(fill));
}

function carve(grid: CellType[][], path: { row: number; col: number }[]): void {
  for (const p of path) {
    grid[p.row][p.col] = 'path';
  }
}

function buildPath(waypoints: { row: number; col: number }[]): { row: number; col: number }[] {
  const path: { row: number; col: number }[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    // Horizontal then vertical movement
    if (from.row === to.row) {
      const step = from.col < to.col ? 1 : -1;
      for (let c = from.col; c !== to.col + step; c += step) {
        if (path.length === 0 || path[path.length - 1].row !== from.row || path[path.length - 1].col !== c) {
          path.push({ row: from.row, col: c });
        }
      }
    } else if (from.col === to.col) {
      const step = from.row < to.row ? 1 : -1;
      for (let r = from.row; r !== to.row + step; r += step) {
        if (path.length === 0 || path[path.length - 1].row !== r || path[path.length - 1].col !== from.col) {
          path.push({ row: r, col: from.col });
        }
      }
    }
  }
  return path;
}

// ── Map 1: Serpentine Valley ──
function createSerpentineMap(): MapDef {
  const grid = createGrid(GRID_ROWS, GRID_COLS);

  const waypoints: { row: number; col: number }[] = [
    { row: 1, col: 0 },
    { row: 1, col: 5 },
    { row: 4, col: 5 },
    { row: 4, col: 1 },
    { row: 7, col: 1 },
    { row: 7, col: 6 },
    { row: 10, col: 6 },
    { row: 10, col: 2 },
    { row: 12, col: 2 },
    { row: 12, col: 9 },
    { row: 7, col: 9 },
    { row: 7, col: 14 },
    { row: 4, col: 14 },
    { row: 4, col: 18 },
    { row: 7, col: 18 },
    { row: 7, col: 19 },
  ];

  const path = buildPath(waypoints);
  carve(grid, path);

  // Mark spawn and exit
  grid[1][0] = 'spawn';
  grid[7][19] = 'exit';

  return {
    name: 'Serpentine Valley',
    description: 'A winding S-shaped path through the valley. Build on the inner curves!',
    grid,
    paths: [path],
  };
}

// ── Map 2: The Crossroads ──
function createCrossroadsMap(): MapDef {
  const grid = createGrid(GRID_ROWS, GRID_COLS);

  // Shared entrance
  const entrance: { row: number; col: number }[] = buildPath([
    { row: 6, col: 0 },
    { row: 6, col: 4 },
  ]);

  // Top branch
  const topBranch = buildPath([
    { row: 6, col: 4 },
    { row: 2, col: 4 },
    { row: 2, col: 10 },
    { row: 5, col: 10 },
    { row: 5, col: 15 },
    { row: 2, col: 15 },
    { row: 2, col: 19 },
  ]);

  // Bottom branch
  const bottomBranch = buildPath([
    { row: 6, col: 4 },
    { row: 10, col: 4 },
    { row: 10, col: 9 },
    { row: 7, col: 9 },
    { row: 7, col: 13 },
    { row: 11, col: 13 },
    { row: 11, col: 19 },
  ]);

  // Full path 1: entrance + top
  const path1 = [...entrance, ...topBranch.filter(
    (p, i) => i > 0 || !entrance.some(e => e.row === p.row && e.col === p.col)
  )];

  // Full path 2: entrance + bottom
  const path2 = [...entrance, ...bottomBranch.filter(
    (p, i) => i > 0 || !entrance.some(e => e.row === p.row && e.col === p.col)
  )];

  carve(grid, path1);
  carve(grid, path2);

  grid[6][0] = 'spawn';
  grid[2][19] = 'exit';
  grid[11][19] = 'exit';

  return {
    name: 'The Crossroads',
    description: 'The path splits into two! You must defend both routes to the exits.',
    grid,
    paths: [path1, path2],
  };
}

export const MAPS: MapDef[] = [createSerpentineMap(), createCrossroadsMap()];

// ── Runtime State Types ──

export interface Tower {
  id: number;
  type: TowerType;
  row: number;
  col: number;
  level: number;       // 1-3
  cooldown: number;     // seconds until next fire
  totalKills: number;
}

export interface Enemy {
  id: number;
  type: EnemyType;
  hp: number;
  maxHp: number;
  pathIndex: number;     // which path this enemy follows (for multi-path maps)
  progress: number;      // fractional index along path (0 = start, path.length-1 = end)
  speed: number;
  slowTimer: number;     // remaining slow duration
  x: number;             // pixel position (computed from progress)
  y: number;
  alive: boolean;
}

export interface Projectile {
  id: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;      // 0-1
  towerType: TowerType;
  damage: number;
  targetId: number;
  aoe: boolean;
  chainTargets?: number[];
}

export interface TowerDefenseState {
  phase: 'building' | 'wave' | 'won' | 'lost';
  mapIndex: number;
  wave: number;
  gold: number;
  lives: number;
  score: number;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  selectedTower: TowerType | null;
  selectedPlacedTower: number | null;  // tower id for info/upgrade/sell
  waveEnemiesRemaining: number;
  waveSpawnQueue: { type: EnemyType; delay: number }[];
  spawnTimer: number;
}

// ── Helpers ──

export function getTowerDamage(tower: Tower): number {
  const def = TOWER_DEFS[tower.type];
  return def.damage + (tower.level - 1) * def.upgradeDamageBonus;
}

export function getTowerRange(tower: Tower): number {
  const def = TOWER_DEFS[tower.type];
  return def.range + (tower.level - 1) * 0.3;
}

export function getTowerFireRate(tower: Tower): number {
  const def = TOWER_DEFS[tower.type];
  return def.fireRate * (1 + (tower.level - 1) * 0.15);
}

export function getUpgradeCost(tower: Tower): number {
  if (tower.level >= 3) return Infinity;
  const def = TOWER_DEFS[tower.type];
  return def.upgradeCost * tower.level;
}

export function getSellValue(tower: Tower): number {
  const def = TOWER_DEFS[tower.type];
  let spent = def.cost;
  for (let l = 1; l < tower.level; l++) {
    spent += def.upgradeCost * l;
  }
  return Math.floor(spent * 0.6);
}

export function cellToPixel(row: number, col: number): { x: number; y: number } {
  return {
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: row * CELL_SIZE + CELL_SIZE / 2,
  };
}

export function pixelToCell(x: number, y: number): { row: number; col: number } {
  return {
    row: Math.floor(y / CELL_SIZE),
    col: Math.floor(x / CELL_SIZE),
  };
}

export function distanceCells(r1: number, c1: number, r2: number, c2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (c1 - c2) ** 2);
}
