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
    speed: 2.8, runSpeed: 4.5, jump: -13, accel: 0.35, decel: 0.25, airAccel: 0.2,
    special: 'Umbrella Float',
    description: 'Balanced all-rounder. Hold jump for a cute umbrella float!',
    statSpeed: 3, statJump: 3, statSpecial: 'Umbrella Float',
  },
  bojangles: {
    id: 'bojangles', name: 'BoJangles',
    speed: 2.5, runSpeed: 4.0, jump: -14.5, accel: 0.3, decel: 0.2, airAccel: 0.18,
    special: 'Float Jump',
    description: 'Higher jumps, slower on the ground. Hold jump to float!',
    statSpeed: 2, statJump: 5, statSpecial: 'Float Jump',
  },
  chonk: {
    id: 'chonk', name: 'Chonk',
    speed: 2.5, runSpeed: 3.8, jump: -12, accel: 0.3, decel: 0.3, airAccel: 0.15,
    special: 'Tongue + Dive Slam',
    description: 'Big fluffy dog! Tongue attack + dive slam from the air!',
    statSpeed: 2, statJump: 3, statSpecial: 'Tongue & Slam',
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
export const CHONK_SLAM_FRAMES = 15;      // slam shockwave visual duration
export const CHONK_DIVE_SPEED = 14;       // dive slam downward speed
export const CHONK_RETURN_FRAMES = 120;
export const CHONK_TONGUE_FRAMES = 18;   // tongue attack animation length
export const CHONK_TONGUE_RANGE = 80;    // tongue reach in pixels (~2.5 tiles)
export const PLANT_CYCLE = 120;           // total frames per cycle (60 hidden + 60 up)
export const PLANT_UP_HEIGHT = TILE * 1.4; // how tall when popped up

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
  | 'G' // King Grumble boss spawn
  | 'R' // ? block → mushroom
  | 'X' // ? block → fire flower
  | 'k' // koopa spawn
  | 'I'  // one-way platform
  | 'D'  // Chonk companion spawn
  | 'H'  // dig spot (Chonk digs into sub-level pipe)
  | 'W'  // warp exit (returns from sub-level)
  | 'V'  // poison ivy plant enemy spawn
  | 'L'  // ladybug flying enemy spawn
  | 'M'; // moving cloud platform spawn

// ── State interfaces ──────────────────────────────────────────

export type PowerUp = 'none' | 'big' | 'fire';
export type AnimState = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'skid' | 'death' |
  'grow' | 'shrink' | 'wallkick' | 'victory';
export type EnemyType = 'goomba' | 'koopa' | 'plant' | 'boss' | 'ladybug';
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
  floating: boolean;        // true when umbrella float is active (for rendering)
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
  // Boss fields (optional, only for type === 'boss')
  hp?: number;
  bossPhase?: number;
  bossTimer?: number;
  stunTimer?: number;
  // Ladybug fields (optional, only for type === 'ladybug')
  flyBaseY?: number; // sine wave center Y
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
export type CompanionAnim = 'idle' | 'walk' | 'jump' | 'fall' | 'tongue' | 'dive' | 'slam';

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
  diving: boolean;        // dive slam in progress
  slamTimer: number;      // slam shockwave visual frames remaining
  tongueTimer: number;     // tongue attack animation frames remaining
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

export const WORLD2_CINEMATIC_SCENES: CinematicScene[] = [
  {
    spriteKey: 'scene-heroes',
    lines: [
      'WITH THE GREEN HILLS SAVED',
      'OUR HEROES LOOK TO THE SKY',
      'WHERE MORE SPARKSTONES AWAIT!',
    ],
  },
  {
    spriteKey: 'scene-village',
    lines: [
      'ABOVE THE CLOUDS LIES A HIDDEN',
      'KINGDOM IN THE SKY GUARDED BY',
      "KING GRUMBLE'S FLYING ARMY!",
    ],
  },
  {
    spriteKey: 'scene-villain',
    lines: [
      'ONWARD AND UPWARD!',
      'THE CLOUD KINGDOM CALLS',
      'BUT BEWARE THE LADYBUGS!',
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
  { id: 1, x: 280, y: 300, name: '1-2', label: 'CHONK MEADOWS', connections: [0, 2], available: true },
  { id: 2, x: 440, y: 360, name: '1-3', label: 'THORNWOOD FOREST', connections: [1, 3], available: true },
  { id: 3, x: 560, y: 280, name: '1-4', label: 'SPARKSTONE MINES', connections: [2, 4], available: true },
  { id: 4, x: 700, y: 200, name: '1-5', label: 'SUMMIT TRAIL', connections: [3, 5], available: true },
  { id: 5, x: 780, y: 100, name: '2-1', label: 'CLOUD KINGDOM', connections: [4, 6], available: true },
  { id: 6, x: 650, y: 140, name: '2-2', label: 'NIMBUS BRIDGE', connections: [5, 7], available: true },
  { id: 7, x: 520, y: 80, name: '2-3', label: 'STORMCLOUD PASS', connections: [6, 8], available: true },
  { id: 8, x: 380, y: 140, name: '2-4', label: 'SKY CASTLE GATES', connections: [7, 9], available: true },
  { id: -1, x: 250, y: 80, name: 'BOSS', label: "GRUMBLE'S CASTLE", connections: [8], available: false },
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
  powerUp?: PowerUp;        // carry power-up across levels
  hasChonk?: boolean;       // whether Chonk companion was with the player
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
  cameraY: number;
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
  // Dig spots / sub-levels
  digSpots: DigSpot[];
  warpExits: WarpExit[];
  inSubLevel: boolean;
  hintText: string;     // tutorial hint shown above player
  hintTimer: number;     // frames remaining for hint
  // Warp transition animation
  warpAnim: WarpAnim | null;
  // Moving platforms (Cloud Kingdom)
  movingPlatforms: MovingPlatform[];
  // Cinematic target (for world 2+ intros)
  cinematicTarget?: 'select' | 'level';
  pendingLevel?: number;
}

export interface WarpAnim {
  type: 'dig-down' | 'warp-up';  // direction of travel
  phase: 'dig' | 'sink' | 'blackout' | 'arrive'; // animation phase
  timer: number;       // frames remaining in current phase
  startX: number;      // world X where animation started
  startY: number;      // world Y where animation started
  targetX: number;     // destination world X
  targetY: number;     // destination world Y
  startCam: number;    // camera X at start
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
    worldName: 'Chonk Meadows',
    subtitle: 'A loyal companion joins your quest!',
    bgColor: 0x6699FF,
    timeLimit: 300,
    tiles: [
      // 160 cols — outdoor meadow with Chonk intro + 2 dig spots → underground sub-levels
      // Main level rows 0-12, spacer 13-14, sub-level-1 rows 15-20, sub-level-2 rows 21-26
      // All rows MUST be exactly 160 characters
      '................................................................................................................................................................', // 0
      '................................................................................................................................................................', // 1
      '................................................................................................................................................................', // 2
      '................................................................................................................................................................', // 3
      '................................................................................................................................................................', // 4
      '................................................................................................................................................................', // 5
      '............................................................?..?...........................?R?..................................................................', // 6
      '..........C.C.C.........?..........C.C........R.....C.C.C..............BBB?BBB...C.C.C...........C.C.C.........X.......C.C.C....................................', // 7
      '..........................................................................I.I.I.I.I.I.........................I.I.I.I.I.I.......................................', // 8
      '.............................................................................................................................I.I.I.I.I.I........................', // 9
      '...........................................................................................E.........k..................................................PPF.....', // 10
      '.....S........D......E..........E.....k.......H............E........k..E........E..........k.....H.............E...k....E...............................##pp....', // 11
      '######################################################################################################################....########..####..######################', // 12
      '................................................................................................................................................................', // 13
      '................................................................................................................................................................', // 14
      // Sub-level 1: Coin Cavern — flat treasure room, walk right to W exit
      '######################################################################################..........................................................................', // 15
      '##....C.....C.....C.....C.....C.....C.....C.....C.....C.....C.....C.....C.....C.....##..........................................................................', // 16
      '##..?..C.C.C.C.C..?..C.C.C.C.C..?..C.C.C.C.C..R..C.C.C.C.C..?..C.C.C.C.C...W........##..........................................................................', // 17
      '##....................BBBB......................BBBB................................##..........................................................................', // 18
      '##..S...........E...........k...............E...........k...........E...........k...##..........................................................................', // 19
      '######################################################################################..........................................................................', // 20
      // Sub-level 2: Mushroom Grotto — brick platforms, stepping stones to W exit
      '######################################################################################..........................................................................', // 21
      '##..........C.C.C.C.C.............C.C.C.C.C...............C.C.C.C.C.................##..........................................................................', // 22
      '##......BBBBBBBBB.........BBBBBBBBB.....?...BBBBBBBBB.....R...BBBBBBBBB.........W...##..........................................................................', // 23
      '##.........E.........k...............E.........k...............E.........k..........##..........................................................................', // 24
      '##..S..########.........########.........########.........########.........###########..........................................................................', // 25
      '######################################################################################..........................................................................', // 26
    ],
  },
  {
    name: '1-3',
    world: 1,
    worldName: 'Thornwood Forest',
    subtitle: 'Dark woods full of tricks and traps!',
    bgColor: 0x448866,
    timeLimit: 350,
    tiles: [
      // 150 cols — forest with climbing sections, plant enemies, fewer gaps
      '.......................................................................................................................',
      '.......................................................................................................................',
      '.......................................................................................................................',
      '.......................................................................................................................',
      '...............................................................IIIII..............................................IIIII....',
      '.................................IIIII.............IIIII..................?R?...........IIIII..........X.?..IIIII...........',
      '..................R..?..IIIII..............C.C.C.C..........BBB?BBB.............IIIII.........C.C.C.........IIIII..........',
      '............C.C.C...........C.C.C.......C.C.C.............C.C.C..........C.C.C..........C.C.C.......C.C.C................',
      '.......................................................................................................................',
      '.......................................................................................................................',
      '.....S..........E.....V.........k..........E....V........k.........V..E.........k......V........E..k.....V.E.k..PPF.....',
      '################..############################..#############################..############################..######pp####',
      '################..############################..#############################..############################..######pp####',
    ],
  },
  {
    name: '1-4',
    world: 1,
    worldName: 'Sparkstone Mines',
    subtitle: 'Deep underground, the Sparkstones glow faintly...',
    bgColor: 0x221133,
    timeLimit: 350,
    tiles: [
      // 150 cols — underground mine with hilly terrain and jump obstacles
      '.......................................................................................................................',
      '.......................................................................................................................',
      '.......................................................................................................................',
      '.......................................................................................................................',
      '.......................................................................................................................',
      '.......................................................?R?....................................X.?...........................',
      '.....C.C.C.........?.?..............C.C.C.........BBB?BBB........C.C.C..........?R?........C.C.C...BBB?BBB...............',
      '.............................................##...............................................##.........####...............',
      '...............................##########............V..........####.......V.......####........##.###........V........PPF..',
      '.....................#####...##..........##......####....####......####.....####........####.#########............####.pp..',
      '.....S........E..####.....k...E..........k.E.k.............E.k..........k..E........k.............E....k..E......k..pp..',
      '########..####.####..........##..########..####..........####..##..........####..........####..........####..####..#######',
      '########..####.####..........##..########..####..........####..##..........####..........####..........####..####..#######',
    ],
  },
  {
    name: '1-5',
    world: 1,
    worldName: 'Summit Trail',
    subtitle: 'King Grumble awaits at the peak!',
    bgColor: 0x5588BB,
    timeLimit: 400,
    tiles: [
      // 120 cols x 13 rows — horizontal mountain climb, terrain rises L→R, boss arena at summit
      // Sections: 1(cols 0-23, ground row11) 2(24-48, row10) 3(49-73, row9) 4(74-93, row8) Boss(95-119, row7)
      // Left cliff col95 rows0-4, right wall col119 rows0-6, arena floor row7 cols95-119
      '........................................................................................................................', // 0
      '........................................................................................................................', // 1
      '...............................................................................................#.......................#', // 2
      '...............................................................................................#.......................#', // 3
      '...............................................................................................#...........G...........#', // 4
      '............IIII....................IIII..................IIII................IIII.....................................#', // 5
      '.......C.C.C........?R?..........C.C.C.........BBB?BBB...........C.C.C.......?X?............C...C...C...C...C...C...C..#', // 6
      '..............................................................................E.......k........#########################', // 7
      '...................................................E.........V.....k.........##############...##########################', // 8
      '.........................E.........k.......E.......################...##################################################', // 9
      '.....S.......E......E...################...############################################################################.', // 10
      '###############...######################################################################################################', // 11
      '########################################################################################################################', // 12
    ],
  },
  {
    name: '2-1',
    world: 2,
    worldName: 'Cloud Kingdom',
    subtitle: 'Above the clouds, danger flies on tiny wings!',
    bgColor: 0xAADDFF,
    timeLimit: 350,
    tiles: [
      // 150 cols — Cloud Kingdom with moving platforms, ladybugs, bottomless pits
      '......................................................................................................................................................', // 0
      '......................................................................................................................................................', // 1
      '......................................................................................................................................................', // 2
      '......................................................................................................................................................', // 3
      '........................IIIII.................................IIIII...................................IIIII...........................................', // 4
      '..........C.C.C......C.C.C.C............C.C.C.C..?R?.......C.C.C.........BBB?BBB.........C.C.C........X.?......C.C.C..................................', // 5
      '......................................................................................................................................................', // 6
      '......................................................................................................................................................', // 7
      '...........................L....................................L.......................................L...........................L.................', // 8
      '......................................................................................................................................................', // 9
      '.....S..........E...................E.......k.................................E.........k...........................E.....k.................PPF.......', // 10
      '####################......M.......######################....M......M.....#######################.....M......M.....##########################pp########', // 11
      '####################..............######################.................#######################..................##########################pp########', // 12
    ],
  },
  {
    name: '2-2',
    world: 2,
    worldName: 'Nimbus Bridge',
    subtitle: 'Cloud bridges stretch across the endless sky!',
    bgColor: 0x99CCFF,
    timeLimit: 400,
    tiles: [
      '....................................................................................................................................................................................', // 0
      '....................................................................................................................................................................................', // 1
      '....................................................................................................................................................................................', // 2
      '....................................................................................................................................................................................', // 3
      '...........................IIIIIII.................................................................IIIIIII..........................................................................', // 4
      '..........?.R................C.C..............CCC................C.C.................?.X.............C.C................CCC............C.C.................?.R......................', // 5
      '..........................................................IIIII........IIIII......................................................IIIII....IIIII....................................', // 6
      '..........................................BB?BB....................................................................B?BB.............................................................', // 7
      '............................L.......................L.................L........................L..............L...............................L.....................................', // 8
      '....................................................................................................................................................................................', // 9
      '.....S......E.....k........................E....E....k............................E.....k.............................E.....k.......................PPF.....E.......k.......E.......', // 10
      '######################.....M.......M....################.....M......M.....M...##############.....M......M.....M...##############.....M.......M....##pp##############################', // 11
      '######################..................################......................##############......................##############..................##pp##############################', // 12
    ],
  },
  {
    name: '2-3',
    world: 2,
    worldName: 'Stormcloud Pass',
    subtitle: 'Dark clouds swirl with danger at every step!',
    bgColor: 0x667799,
    timeLimit: 400,
    tiles: [
      '..............................................................................................................................................................................................', // 0
      '..............................................................................................................................................................................................', // 1
      '..............................................................................................................................................................................................', // 2
      '..............................................................................................................................................................................................', // 3
      '..................................................IIIIIII......................................................IIIIIII....................................................IIIIIII.............', // 4
      '..........?.R...........C.C......................?.XC.C..........................C.C....................?.R......C.C..........................C.C...........................C.C...............', // 5
      '....................IIIII..IIIII..........................................IIIII........IIIII............................................IIIII......IIIII......................................', // 6
      '................................................B?B.........................................................B?B.......................B?B.....................................................', // 7
      '......................L...................L............L................L.................L.........L..............L..............L...................L...........L...........................', // 8
      '..............................................................................................................................................................................................', // 9
      '.....S.......E.........................k.............................E..............................k............................E..............................k.......................PPF...', // 10
      '##################....M......M....##########.....M......M....M..########.....M......M.....M...############.....M.......M....##########.....M......M....M..############....M......M....##pp####', // 11
      '##################................##########....................########......................############..................##########....................############................##pp####', // 12
    ],
  },
  {
    name: '2-4',
    world: 2,
    worldName: 'Sky Castle Gates',
    subtitle: 'The final cloud fortress looms ahead!',
    bgColor: 0x88AACC,
    timeLimit: 450,
    tiles: [
      '........................................................................................................................................................................................................', // 0
      '........................................................................................................................................................................................................', // 1
      '........................................................................................................................................................................................................', // 2
      '........................................................................................................................................................................................................', // 3
      '........................IIIIIII.....................................................IIIIIII..........................................................IIIIIII............................................', // 4
      '........?.R...............C.C...............?.............C.C.X...............?.R.....C.C.............................?CXC.............................C.C..............?.R.......C.C...................', // 5
      '....................................................IIIII......IIIII............................................IIIII........IIIII............................................IIIII..IIIII..............', // 6
      '..........................................BB?BB.............................B?B....................................B?BB...............................................BB?B..............................', // 7
      '........................L....................L................L...................L.................L.................L................L...................L................L...........................', // 8
      '........................................................................................................................................................................................................', // 9
      '.....S.......E..k........................E..k..............................E.........................k..E................................E..k..........................E......................PPF.......', // 10
      '####################....M......M....##############.....M......M....M..##########....M......M....##############.....M.....M.....M....############.....M......M.....##########....M......M....##pp########', // 11
      '####################................##############....................##########................##############......................############..................##########................##pp########', // 12
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
    || tile === 'R' || tile === 'X' || tile === 'H';
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

export interface DigSpot {
  col: number; row: number;
  x: number; y: number;
  targetX: number; targetY: number; // warp destination (sub-level entry)
}

export interface WarpExit {
  col: number; row: number;
  x: number; y: number;
  returnX: number; returnY: number; // where to come back to in main level
}

export interface MovingPlatform {
  x: number; y: number;
  width: number;
  startX: number;
  range: number;   // oscillation range in pixels from startX
  speed: number;
  dir: number;     // 1 or -1
}

export function parseLevelEntities(tiles: string[]): {
  playerStart: { x: number; y: number };
  enemies: { x: number; y: number; type: EnemyType }[];
  coins: { x: number; y: number }[];
  questionBlocks: { col: number; row: number; content: QuestionBlock['content'] }[];
  flagPos: { x: number; y: number } | null;
  chonkSpawn: { x: number; y: number } | null;
  digSpots: DigSpot[];
  warpExits: WarpExit[];
  movingPlatformSpawns: { x: number; y: number }[];
} {
  const enemies: { x: number; y: number; type: EnemyType }[] = [];
  const coins: { x: number; y: number }[] = [];
  const questionBlocks: { col: number; row: number; content: QuestionBlock['content'] }[] = [];
  let playerStart: { x: number; y: number } | null = null;
  let flagPos: { x: number; y: number } | null = null;
  let chonkSpawn: { x: number; y: number } | null = null;
  const digSpotPositions: { col: number; row: number }[] = [];
  const warpExitPositions: { col: number; row: number }[] = [];
  const allStarts: { col: number; row: number }[] = []; // all S tiles
  const movingPlatformSpawns: { x: number; y: number }[] = [];

  for (let row = 0; row < tiles.length; row++) {
    for (let col = 0; col < tiles[row].length; col++) {
      const t = tiles[row][col];
      if (t === 'S') {
        allStarts.push({ col, row });
        if (!playerStart) playerStart = { x: col * TILE, y: row * TILE };
      }
      if (t === 'E') enemies.push({ x: col * TILE, y: row * TILE, type: 'goomba' });
      if (t === 'k') enemies.push({ x: col * TILE, y: row * TILE, type: 'koopa' });
      if (t === 'V') enemies.push({ x: col * TILE, y: row * TILE, type: 'plant' });
      if (t === 'G') enemies.push({ x: col * TILE, y: row * TILE, type: 'boss' });
      if (t === 'L') enemies.push({ x: col * TILE, y: row * TILE, type: 'ladybug' });
      if (t === 'M') movingPlatformSpawns.push({ x: col * TILE, y: row * TILE });
      if (t === 'C') coins.push({ x: col * TILE + TILE / 4, y: row * TILE + TILE / 4 });
      if (isQuestionLike(t)) questionBlocks.push({ col, row, content: contentForTile(t) });
      if (t === 'F' && !flagPos) flagPos = { x: col * TILE, y: row * TILE };
      if (t === 'D' && !chonkSpawn) chonkSpawn = { x: col * TILE, y: row * TILE };
      if (t === 'H') digSpotPositions.push({ col, row });
      if (t === 'W') warpExitPositions.push({ col, row });
    }
  }

  // Sub-level starts: all S tiles after the first (main level start)
  const subLevelStarts = allStarts.slice(1);

  // Pair dig spots with sub-level starts (entry points), fallback to warp exits
  const digSpots: DigSpot[] = digSpotPositions.map((d, i) => {
    const subStart = subLevelStarts[i];
    const exit = warpExitPositions[i];
    // Target the sub-level's S tile (entry), not the W tile (exit)
    const target = subStart ?? exit;
    return {
      col: d.col, row: d.row,
      x: d.col * TILE, y: d.row * TILE,
      targetX: target ? target.col * TILE : d.col * TILE,
      targetY: target ? (target.row - 1) * TILE : d.row * TILE,
    };
  });

  // Pair warp exits back to their dig spots (for return)
  const warpExits: WarpExit[] = warpExitPositions.map((w, i) => {
    const dig = digSpotPositions[i];
    return {
      col: w.col, row: w.row,
      x: w.col * TILE, y: w.row * TILE,
      returnX: dig ? dig.col * TILE : w.col * TILE,
      returnY: dig ? (dig.row - 1) * TILE : w.row * TILE,
    };
  });

  return { playerStart: playerStart ?? { x: 2 * TILE, y: 8 * TILE }, enemies, coins, questionBlocks, flagPos, chonkSpawn, digSpots, warpExits, movingPlatformSpawns };
}
