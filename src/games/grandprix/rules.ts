// ═══════════════════════════════════════════════════════════════════
// grandprix/rules.ts — Grand Prix 3D: F1 Racing Game
// ═══════════════════════════════════════════════════════════════════

// ── Types ─────────────────────────────────────────────────────────

export type RacePhase = 'setup' | 'grid' | 'race' | 'finish' | 'results';
export type CameraMode = 'chase' | 'cockpit' | 'tv' | 'helicopter';
export type Surface = 'asphalt' | 'curb' | 'grass' | 'gravel' | 'barrier';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TeamConfig {
  name: string;
  primary: number;
  secondary: number;
  accent: number;
}

export interface DriverConfig {
  name: string;
  team: number;
  number: number;
  helmetColor: number;
  skill: number;       // 0.7 - 1.0
  aggression: number;  // 0.3 - 0.9
  consistency: number; // 0.8 - 1.0
}

export interface CarState {
  position: Vec3;
  heading: number;     // radians
  speed: number;       // m/s
  rpm: number;
  gear: number;        // 0-5 (6 gears)
  throttle: number;    // 0-1
  brake: number;       // 0-1
  steer: number;       // -1 to 1
  splineT: number;     // 0-1 track position
  lapCount: number;
  lapTimes: number[];
  bestLap: number;
  currentLapStart: number;
  sectorTimes: number[];
  currentSector: number;
  surface: Surface;
  finished: boolean;
  finishTime: number;
  damage: number;      // 0-1
  lateralG: number;
  wheelRotation: number;
}

export interface RaceStanding {
  driverIndex: number;
  position: number;
  lapCount: number;
  splineT: number;
  gap: number;          // seconds behind leader
  bestLap: number;
  finished: boolean;
}

export interface GrandPrixState {
  phase: RacePhase;
  track: string;
  totalLaps: number;
  difficulty: number;   // 0-2 (easy, medium, hard)
  raceTime: number;
  cars: CarState[];
  standings: RaceStanding[];
  startLights: number;  // 0-5 (lights lit), 6 = go
  playerIndex: number;
  cameraMode: CameraMode;
  showStandings: boolean;
  showMinimap: boolean;
  paused: boolean;
  autoGears: boolean;
  autoBrakes: boolean;
  fastestLap: number;
  fastestLapDriver: number;
}

// ── Physics Constants ─────────────────────────────────────────────

export const PHYSICS = {
  TIMESTEP: 1 / 120,                // 120 Hz fixed timestep
  MASS: 620,                        // kg (F1 car)
  DRAG_COEFF: 0.35,
  ROLLING_RESISTANCE: 8.0,
  MAX_STEER: 0.6,                   // radians
  STEER_REDUCTION: 0.7,             // steering reduces at speed
  STEER_SPEED: 4.0,                 // steering input rate
  GRIP_LIMIT: 3.5,                  // lateral g-force limit
  BRAKE_FORCE: 18000,               // Newtons
  DOWNFORCE_COEFF: 2.5,             // grip increases with speed
  MAX_SPEED: 95,                    // ~342 km/h

  // Surface grip multipliers
  GRIP_ASPHALT: 1.0,
  GRIP_CURB: 0.85,
  GRIP_GRASS: 0.45,
  GRIP_GRAVEL: 0.25,

  // Surface drag multipliers
  DRAG_ASPHALT: 1.0,
  DRAG_CURB: 1.1,
  DRAG_GRASS: 2.5,
  DRAG_GRAVEL: 4.0,
};

export const ENGINE = {
  GEAR_RATIOS: [3.2, 2.4, 1.8, 1.4, 1.1, 0.9],
  FINAL_DRIVE: 3.5,
  REDLINE: 14500,
  IDLE: 3000,
  PEAK_TORQUE_RPM: 12000,
  MAX_TORQUE: 300,                   // Nm
  UPSHIFT_RPM: 13800,               // 95% of redline
  DOWNSHIFT_RPM: 5800,              // 40% of redline
  WHEEL_RADIUS: 0.33,               // meters
};

// ── Track Constants ───────────────────────────────────────────────

export const TRACK = {
  DEFAULT_WIDTH: 12,                 // meters
  CURB_WIDTH: 0.8,
  GRAVEL_WIDTH: 6,
  BARRIER_OFFSET: 20,               // distance from center to barrier
  SPLINE_SAMPLES: 500,              // points along track
  SECTOR_COUNT: 3,
};

// ── Teams ─────────────────────────────────────────────────────────

export const TEAMS: TeamConfig[] = [
  { name: 'Williams',  primary: 0x003399, secondary: 0xFFFFFF, accent: 0xCC0000 },
  { name: 'Ferrari',   primary: 0xCC0000, secondary: 0xFFFFFF, accent: 0xFFD700 },
  { name: 'McLaren',   primary: 0xFF6600, secondary: 0x000000, accent: 0xFF6600 },
  { name: 'Benetton',  primary: 0x00AA44, secondary: 0xFFDD00, accent: 0x0066CC },
  { name: 'Jordan',    primary: 0xFFD700, secondary: 0x006633, accent: 0xFFD700 },
  { name: 'Tyrrell',   primary: 0x000066, secondary: 0xFFFFFF, accent: 0xCC0000 },
  { name: 'Ligier',    primary: 0x0044CC, secondary: 0xFFFFFF, accent: 0xFFDD00 },
  { name: 'Sauber',    primary: 0x006699, secondary: 0xCCCCCC, accent: 0xCC0000 },
  { name: 'Minardi',   primary: 0x333333, secondary: 0xFFD700, accent: 0xCC0000 },
  { name: 'Arrows',    primary: 0x222222, secondary: 0xFFFFFF, accent: 0x006600 },
];

// ── Drivers ───────────────────────────────────────────────────────

export const DRIVERS: DriverConfig[] = [
  { name: 'D. Hill',       team: 0, number: 0,  helmetColor: 0x003399, skill: 0.95, aggression: 0.6, consistency: 0.95 },
  { name: 'J. Villeneuve', team: 0, number: 6,  helmetColor: 0xFF0000, skill: 0.93, aggression: 0.7, consistency: 0.90 },
  { name: 'M. Schumacher', team: 1, number: 1,  helmetColor: 0xCC0000, skill: 1.0,  aggression: 0.85, consistency: 0.98 },
  { name: 'E. Irvine',     team: 1, number: 2,  helmetColor: 0x00AA00, skill: 0.85, aggression: 0.65, consistency: 0.88 },
  { name: 'M. Hakkinen',   team: 2, number: 8,  helmetColor: 0xFFFFFF, skill: 0.95, aggression: 0.5, consistency: 0.93 },
  { name: 'D. Coulthard',  team: 2, number: 9,  helmetColor: 0x0066CC, skill: 0.88, aggression: 0.55, consistency: 0.92 },
  { name: 'J. Alesi',      team: 3, number: 3,  helmetColor: 0xFF4400, skill: 0.87, aggression: 0.8, consistency: 0.82 },
  { name: 'G. Berger',     team: 3, number: 4,  helmetColor: 0xFFDD00, skill: 0.86, aggression: 0.6, consistency: 0.90 },
  { name: 'R. Barrichello', team: 4, number: 14, helmetColor: 0x006633, skill: 0.84, aggression: 0.55, consistency: 0.88 },
  { name: 'M. Brundle',    team: 4, number: 15, helmetColor: 0x333366, skill: 0.80, aggression: 0.45, consistency: 0.90 },
];

// ── Difficulty Presets ────────────────────────────────────────────

export const DIFFICULTY = [
  { name: 'Easy',   skillMult: 0.80, aggressionMult: 0.6, topSpeed: 0.85 },
  { name: 'Medium', skillMult: 0.92, aggressionMult: 0.8, topSpeed: 0.93 },
  { name: 'Hard',   skillMult: 1.0,  aggressionMult: 1.0, topSpeed: 1.0  },
];

// ── Config ────────────────────────────────────────────────────────

export const GP_CONFIG = {
  name: 'Grand Prix 3D',
  description: 'A 3D F1 racing game inspired by MicroProse Grand Prix II',
  engine: 'three.js',
  resolution: { width: 960, height: 600 },
  defaultLaps: 5,
  gridSize: 10,
};

// ── Helpers ───────────────────────────────────────────────────────

export function createInitialCarState(): CarState {
  return {
    position: { x: 0, y: 0, z: 0 },
    heading: 0,
    speed: 0,
    rpm: ENGINE.IDLE,
    gear: 0,
    throttle: 0,
    brake: 0,
    steer: 0,
    splineT: 0,
    lapCount: 0,
    lapTimes: [],
    bestLap: Infinity,
    currentLapStart: 0,
    sectorTimes: [],
    currentSector: 0,
    surface: 'asphalt',
    finished: false,
    finishTime: 0,
    damage: 0,
    lateralG: 0,
    wheelRotation: 0,
  };
}
