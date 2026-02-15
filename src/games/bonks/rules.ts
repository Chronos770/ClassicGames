// ═══════════════════════════════════════════════════════════════════
// rules.ts — Types, constants, levels for BooBonks, BoJangles & Chonk
// ═══════════════════════════════════════════════════════════════════

export const TILE = 32;

// ── Characters ────────────────────────────────────────────────
export type CharacterId = 'boobonks' | 'bojangles' | 'chonk';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  speed: number;
  runSpeed: number;
  jump: number;
  accel: number;
  decel: number;
  airAccel: number;
  special: string;
  description: string;
  statSpeed: number;
  statJump: number;
  statSpecial: string;
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  boobonks: {
    id: 'boobonks', name: 'BooBonks',
    speed: 2.8, runSpeed: 4.5, jump: -11, accel: 0.35, decel: 0.25, airAccel: 0.2,
    special: 'Wall Kick',
    description: 'Balanced all-rounder. Kick off walls in mid-air!',
    statSpeed: 3, statJump: 3, statSpecial: 'Wall Kick',
  },
  bojangles: {
    id: 'bojangles', name: 'BoJangles',
    speed: 2.5, runSpeed: 4.0, jump: -12.5, accel: 0.3, decel: 0.2, airAccel: 0.18,
    special: 'Float Jump',
    description: 'Higher jumps, slower on the ground. Hold jump to float!',
    statSpeed: 2, statJump: 5, statSpecial: 'Float Jump',
  },
  chonk: {
    id: 'chonk', name: 'Chonk',
    speed: 2.5, runSpeed: 3.8, jump: -10, accel: 0.3, decel: 0.3, airAccel: 0.15,
    special: 'Flutter + Tongue',
    description: 'Big fluffy dog! Flutter-jump and eat enemies with your tongue!',
    statSpeed: 2, statJump: 3, statSpecial: 'Tongue & Flutter',
  },
};

// Only boobonks and bojangles are selectable; chonk found in-world
export const SELECTABLE_CHARACTERS: CharacterId[] = ['boobonks', 'bojangles'];

// ── Physics constants ─────────────────────────────────────────
export const GRAVITY = 0.55;
export const PLAYER_MAX_FALL = 10;
export const COYOTE_FRAMES = 6;
export const JUMP_BUFFER_FRAMES = 6;
export const KOOPA_SHELL_SPEED = 6;
export const FIREBALL_SPEED = 5;
export const FIREBALL_GRAVITY = 0.4;
export const INVINCIBLE_FRAMES = 90;
export const FLOAT_FRAMES = 20;
export const FLOAT_GRAVITY_MULT = 0.6;
export const WALL_KICK_VX = 4;
export const WALL_KICK_VY = -10;
export const SHELL_REVERT_FRAMES = 300;
export const GROW_FREEZE_FRAMES = 30;
export const ENEMY_SPEED = 1.2;
export const CHONK_FLUTTER_FRAMES = 40;
export const CHONK_RETURN_FRAMES = 120;

// ── Tile types ────────────────────────────────────────────────
export type TileChar =
  | '.' // empty
  | '#' // ground
  | 'B' // brick
  | '?' // question block (coin)
  | 'P' // pipe top
  | 'p' // pipe body
  | 'C' // coin
  | 'E' // goomba spawn
  | 'S' // player start
  | 'F' // flag (level end)
  | 'G' // gap (death pit marker)
  | 'R' // ? block → mushroom
  | 'X' // ? block → fire flower
  | 'k' // koopa spawn
  | 'I'  // one-way platform
  | 'D'; // Chonk companion spawn

// ── State interfaces ──────────────────────────────────────────

export type PowerUp = 'none' | 'big' | 'fire';
export type AnimState = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'skid' | 'death' |
  'grow' | 'shrink' | 'wallkick' | 'victory';
export type EnemyType = 'goomba' | 'koopa';
export type EnemyAIState = 'walk' | 'shell' | 'shell-slide' | 'dead';

export interface PlayerState {
  x: number; y: number;
  vx: number; vy: number;
  width: number; height: number;
  onGround: boolean;
  facing: 'left' | 'right';
  alive: boolean;
  invincible: number;
  frame: number;
  character: CharacterId;
  powerUp: PowerUp;
  animState: AnimState;
  coyoteTime: number;
  jumpBuffer: number;
  fireballs: Fireball[];
  wallSliding: boolean;
  growTimer: number;
  floatTimer: number;
}

export interface EnemyState {
  x: number; y: number;
  vx: number; vy: number;
  width: number; height: number;
  type: EnemyType;
  state: EnemyAIState;
  alive: boolean;
  squished: number;
  onGround: boolean;
  frame: number;
  shellTimer: number;
  startX: number;
  startY: number;
}

export interface CoinState {
  x: number; y: number;
  collected: boolean;
  floating: boolean;
  popTimer: number;
}

export interface QuestionBlock {
  col: number; row: number;
  hit: boolean;
  popTimer: number;
  content: 'coin' | 'mushroom' | 'flower';
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  color: number;
  size: number;
  type?: 'debris' | 'stomp' | 'dust' | 'sparkle' | 'score';
  text?: string;
}

export interface Fireball {
  x: number; y: number;
  vx: number; vy: number;
  bounces: number;
  alive: boolean;
}

export interface PowerUpItem {
  x: number; y: number;
  vx: number; vy: number;
  type: 'mushroom' | 'flower';
  alive: boolean;
  rising: number;
  onGround: boolean;
}

// ── Companion (Chonk) ────────────────────────────────────────
export type CompanionAnim = 'idle' | 'walk' | 'jump' | 'fall' | 'flutter' | 'tongue';

export interface CompanionState {
  x: number; y: number;
  vx: number; vy: number;
  width: number; height: number;
  onGround: boolean;
  facing: 'left' | 'right';
  alive: boolean;
  mounted: boolean;       // player is riding
  anim: CompanionAnim;
  frame: number;
  flutterTimer: number;   // flutter charges
  spawnX: number;          // original spawn position
  spawnY: number;
  returnTimer: number;     // countdown to return after dismount-by-hit
  runningAway: boolean;    // briefly fleeing after being hit
}

// ── Phases ────────────────────────────────────────────────────

export type GamePhase = 'title' | 'cinematic' | 'select' | 'world' | 'playing' | 'dying' | 'complete' | 'game-over';

// ── Cinematic ─────────────────────────────────────────────────

export interface CinematicScene {
  spriteKey: string;
  lines: string[];
}

export const CINEMATIC_SCENES: CinematicScene[] = [
  {
    spriteKey: 'scene-village',
    lines: [
      'IN THE MAGICAL LAND OF FIZZLEWOOD',
      'GLOWING SPARKSTONES KEEP THE',
      'WORLD BRIGHT AND FULL OF LIFE.',
    ],
  },
  {
    spriteKey: 'scene-villain',
    lines: [
      'BUT ONE DARK MORNING KING GRUMBLE',
      'AND HIS MONSTER ARMY STOLE EVERY',
      'LAST SPARKSTONE! FIZZLEWOOD FADES...',
    ],
  },
  {
    spriteKey: 'scene-heroes',
    lines: [
      'TWO HEROES SET OUT ON A JOURNEY',
      'TO SAVE THEIR HOME AND BRING',
      'THE SPARKSTONES BACK!',
    ],
  },
];

// ── World Map ─────────────────────────────────────────────────

export interface WorldNode {
  id: number;           // index into LEVELS[] (or -1 for placeholder)
  x: number;            // map position (canvas coords)
  y: number;
  name: string;         // display name e.g. "1-1"
  label: string;        // e.g. "GREEN HILLS"
  connections: number[]; // indices of connected nodes (for navigation)
  available: boolean;   // false = coming soon placeholder
}

export const WORLD_MAP: WorldNode[] = [
  { id: 0, x: 120, y: 380, name: '1-1', label: 'GREEN HILLS', connections: [1], available: true },
  { id: 1, x: 280, y: 300, name: '1-2', label: 'MUSHROOM CAVERNS', connections: [0, 2], available: true },
  { id: -1, x: 440, y: 360, name: '1-3', label: 'THORNWOOD FOREST', connections: [1, 3], available: false },
  { id: -1, x: 560, y: 280, name: '1-4', label: 'SPARKSTONE MINES', connections: [2, 4], available: false },
  { id: -1, x: 440, y: 180, name: '2-1', label: 'FROSTPEAK SUMMIT', connections: [3, 5], available: false },
  { id: -1, x: 560, y: 100, name: '2-2', label: 'CLOUD KINGDOM', connections: [4, 6], available: false },
  { id: -1, x: 700, y: 180, name: '2-3', label: 'LAVA DEPTHS', connections: [5, 7], available: false },
  { id: -1, x: 780, y: 100, name: 'BOSS', label: "GRUMBLE'S CASTLE", connections: [6], available: false },
];

// ── Save Data ─────────────────────────────────────────────────

export interface SaveData {
  character: CharacterId;
  level: number;
  lives: number;
  score: number;
  coins: number;
  completedLevels: number[];
  timestamp: number;
}

// ── Game State ────────────────────────────────────────────────

export interface BonksState {
  player: PlayerState;
  companion: CompanionState | null;
  enemies: EnemyState[];
  coins: CoinState[];
  questionBlocks: QuestionBlock[];
  particles: Particle[];
  powerUpItems: PowerUpItem[];
  score: number;
  coinsCollected: number;
  lives: number;
  level: number;
  phase: GamePhase;
  cameraX: number;
  timeLeft: number;
  levelWidth: number;
  levelHeight: number;
  tiles: string[];
  flagReached: boolean;
  transitionTimer: number;
  selectedCharacter: CharacterId;
  selectIndex: number;
  timerFrames: number;
  // Title screen
  titleIndex: number; // 0=START, 1=CONTINUE
  // Cinematic
  cinematicScene: number;
  cinematicTimer: number;
  // World map
  worldMapIndex: number;
  completedLevels: number[];
}

// ── Story ─────────────────────────────────────────────────────

export const STORY = {
  gameOver: 'FIZZLEWOOD GROWS DARKER...',
  victory: 'THE SPARKSTONES SHINE ONCE MORE!',
};

// ── Level data ────────────────────────────────────────────────

export interface LevelData {
  name: string;
  world: number;
  worldName: string;
  subtitle: string;
  tiles: string[];
  bgColor: number;
  timeLimit: number;
}

// Level 1-1: ~150 cols wide, Mario 1-1 style progression
// Flat start → first goomba → ? blocks → mushroom → koopa → pipe → pit → coins → staircase → flagpole
export const LEVELS: LevelData[] = [
  {
    name: '1-1',
    world: 1,
    worldName: 'Green Hills',
    subtitle: 'The trail of stolen Sparkstones begins here...',
    bgColor: 0x6699FF,
    timeLimit: 300,
    tiles: [
      //  0         1         2         3         4         5         6         7         8         9         10        11        12        13        14
      //  0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
      '...............................................................................................................................................................',
      '...............................................................................................................................................................',
      '...............................................................................................................................................................',
      '...............................................................................................................................................................',
      '...............................................................................................................................................................',
      '...............................................................................................................................................................',
      '.....................???.................R...?.?..................................................???X.........................................................',
      '..............C.C.C..................................C.....C..........C.C.C..........C.C.C............BBB?BBB.........BBBB.....................................',
      '..........................................................................................................................C.C.C................................',
      '..........................................................................BBBBB.....................................BBBBB......................................',
      '.....S.............E..........E.........k...............k....D.....E.............E..........k......................E.........PPF...............................',
      '##############...########################################...###########################...#####################################...##########..##pp#############',
      '##############...########################################...###########################...#####################################...##########..##pp#############',
    ],
  },
  {
    name: '1-2',
    world: 1,
    worldName: 'Mushroom Caverns',
    subtitle: 'Grumble\'s minions guard the underground passage...',
    bgColor: 0x222244,
    timeLimit: 280,
    tiles: [
      // 170 chars per row — cave level with ceiling
      '##########################################################################################################################################################################',
      '##......................................................................................................................................................................##',
      '##......................................................................................................................................................................##',
      '##......................................................................................................................................................................##',
      '##......................................................................................................................................................................##',
      '##..........?...?...?...............R.............................X..................................C.C.C.C.C..........................................................##',
      '##.....................................................C.C.C.......C.C..........?B?B?............BBB?BBB......................................C.C.......................##',
      '##............C.C.C......C.C...................................................................................IIIII.....IIIII..........................................##',
      '##.................................................IIIII...........IIIII........................................................IIIII...................................##',
      '##.....S...........E.......E..k.......E.E......k........E.k..........E.E.E..k........E...k....E.E..........k.E...k....E....PPF..........................................##',
      '##########...###############...##############...###############...################...###############...###############...##############..##pp#############################',
      '##########...###############...##############...###############...################...###############...###############...##############..##pp#############################',
    ],
  },
];

// ── Level complete quips ──────────────────────────────────────
export const COMPLETE_QUIPS: Record<CharacterId, string[]> = {
  boobonks: ["WE'RE GETTING CLOSER!", 'ANOTHER SPARKSTONE SAVED!', 'TAKE THAT GRUMBLE!'],
  bojangles: ['EASY PEASY!', 'ONWARDS AND UPWARDS!', 'TOO FAST FOR THEM!'],
  chonk: ['WOOF!', '*HAPPY TAIL WAG*', '*LICKS FACE*'],
};

// ── Helpers ───────────────────────────────────────────────────

export function getTile(tiles: string[], col: number, row: number): string {
  if (row < 0 || row >= tiles.length) return '.';
  if (col < 0 || col >= (tiles[row]?.length ?? 0)) return '.';
  return tiles[row][col];
}

export function isSolid(tile: string): boolean {
  return tile === '#' || tile === 'B' || tile === '?' || tile === 'P' || tile === 'p'
    || tile === 'R' || tile === 'X';
}

export function isQuestionLike(tile: string): boolean {
  return tile === '?' || tile === 'R' || tile === 'X';
}

export function isOneWay(tile: string): boolean {
  return tile === 'I';
}

export function contentForTile(tile: string): QuestionBlock['content'] {
  switch (tile) {
    case 'R': return 'mushroom';
    case 'X': return 'flower';
    default: return 'coin';
  }
}

export function parseLevelEntities(tiles: string[]): {
  playerStart: { x: number; y: number };
  enemies: { x: number; y: number; type: EnemyType }[];
  coins: { x: number; y: number }[];
  questionBlocks: { col: number; row: number; content: QuestionBlock['content'] }[];
  flagPos: { x: number; y: number } | null;
  chonkSpawn: { x: number; y: number } | null;
} {
  const enemies: { x: number; y: number; type: EnemyType }[] = [];
  const coins: { x: number; y: number }[] = [];
  const questionBlocks: { col: number; row: number; content: QuestionBlock['content'] }[] = [];
  let playerStart = { x: 2 * TILE, y: 8 * TILE };
  let flagPos: { x: number; y: number } | null = null;
  let chonkSpawn: { x: number; y: number } | null = null;

  for (let row = 0; row < tiles.length; row++) {
    for (let col = 0; col < tiles[row].length; col++) {
      const t = tiles[row][col];
      if (t === 'S') playerStart = { x: col * TILE, y: row * TILE };
      if (t === 'E') enemies.push({ x: col * TILE, y: row * TILE, type: 'goomba' });
      if (t === 'k') enemies.push({ x: col * TILE, y: row * TILE, type: 'koopa' });
      if (t === 'C') coins.push({ x: col * TILE + TILE / 4, y: row * TILE + TILE / 4 });
      if (isQuestionLike(t)) questionBlocks.push({ col, row, content: contentForTile(t) });
      if (t === 'F' && !flagPos) flagPos = { x: col * TILE, y: row * TILE };
      if (t === 'D' && !chonkSpawn) chonkSpawn = { x: col * TILE, y: row * TILE };
    }
  }

  return { playerStart, enemies, coins, questionBlocks, flagPos, chonkSpawn };
}
