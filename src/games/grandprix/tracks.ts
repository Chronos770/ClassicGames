// ═══════════════════════════════════════════════════════════════════
// grandprix/tracks.ts — Track definitions as spline control points
// ═══════════════════════════════════════════════════════════════════

import { Vec3 } from './rules';

export interface TrackControlPoint {
  pos: Vec3;
  width?: number;       // override default track width
  isCorner?: boolean;    // place curbs + gravel here
  cornerSpeed?: number;  // target speed for AI (m/s)
  hasCurbs?: boolean;
  hasGrandstand?: boolean;
  camPosition?: Vec3;    // TV camera position
}

export interface TrackDefinition {
  name: string;
  country: string;
  lapRecord: string;
  controlPoints: TrackControlPoint[];
  pitEntry: number;      // spline t for pit lane entry
  pitExit: number;       // spline t for pit lane exit
  grandstandPositions: Vec3[];
  treeZones: { center: Vec3; radius: number; count: number }[];
  bgColor: number;
}

// ── Autodromo (Monza-inspired) ────────────────────────────────────
// High-speed circuit with chicanes and a long back straight
// Scale: 1 unit = 1 meter, track ~5.8km total

export const TRACK_AUTODROMO: TrackDefinition = {
  name: 'Autodromo Nazionale',
  country: 'Italy',
  lapRecord: '1:21.076',
  pitEntry: 0.95,
  pitExit: 0.05,

  controlPoints: [
    // Start/finish straight (heading roughly +Z direction)
    { pos: { x: 0, y: 0, z: 0 },       hasGrandstand: true, camPosition: { x: -20, y: 8, z: 5 } },
    { pos: { x: 0, y: 0, z: 60 } },
    { pos: { x: 0, y: 0, z: 120 } },
    { pos: { x: 0, y: 0, z: 180 } },
    { pos: { x: 0, y: 0, z: 240 } },
    { pos: { x: 0, y: 0, z: 300 },     camPosition: { x: -18, y: 6, z: 305 } },

    // Turn 1-2: First chicane (tight right-left)
    { pos: { x: 8, y: 0, z: 340 },     isCorner: true, hasCurbs: true, cornerSpeed: 25, width: 11 },
    { pos: { x: 20, y: 0, z: 355 },    isCorner: true, hasCurbs: true, cornerSpeed: 22 },
    { pos: { x: 15, y: 0, z: 375 },    isCorner: true, hasCurbs: true, cornerSpeed: 25, camPosition: { x: 35, y: 7, z: 360 } },

    // Short straight
    { pos: { x: 10, y: 0, z: 410 } },
    { pos: { x: 5, y: 0, z: 450 } },

    // Turn 3-4: Second chicane (left-right)
    { pos: { x: -8, y: 0, z: 485 },    isCorner: true, hasCurbs: true, cornerSpeed: 28, width: 11 },
    { pos: { x: -15, y: 0, z: 510 },   isCorner: true, hasCurbs: true, cornerSpeed: 25 },
    { pos: { x: -5, y: 0, z: 535 },    isCorner: true, hasCurbs: true, cornerSpeed: 28, camPosition: { x: -30, y: 6, z: 510 } },

    // Medium straight to Lesmos
    { pos: { x: 0, y: 0, z: 570 } },
    { pos: { x: 5, y: 0, z: 610 } },
    { pos: { x: 10, y: 0, z: 650 },    hasGrandstand: true },

    // Turn 5-6: Lesmo 1 & 2 (two medium-speed rights)
    { pos: { x: 30, y: 0, z: 690 },    isCorner: true, hasCurbs: true, cornerSpeed: 45 },
    { pos: { x: 55, y: 0, z: 710 },    isCorner: true, cornerSpeed: 42, camPosition: { x: 40, y: 8, z: 730 } },
    { pos: { x: 75, y: 0, z: 700 },    isCorner: true, hasCurbs: true, cornerSpeed: 40 },
    { pos: { x: 90, y: 0, z: 680 },    isCorner: true, cornerSpeed: 45 },

    // Back straight (longest section — highest speed)
    { pos: { x: 105, y: 0, z: 650 } },
    { pos: { x: 115, y: 0, z: 590 } },
    { pos: { x: 120, y: 0, z: 520 } },
    { pos: { x: 120, y: 0, z: 440 } },
    { pos: { x: 115, y: 0, z: 360 },   camPosition: { x: 135, y: 7, z: 370 } },
    { pos: { x: 110, y: 0, z: 280 } },

    // Turn 8: Heavy braking right-hander (Variante Ascari approach)
    { pos: { x: 95, y: 0, z: 220 },    isCorner: true, hasCurbs: true, cornerSpeed: 30, hasGrandstand: true },
    { pos: { x: 75, y: 0, z: 195 },    isCorner: true, cornerSpeed: 28, camPosition: { x: 60, y: 8, z: 180 } },

    // Turn 9-10: Ascari chicane (left-right-left)
    { pos: { x: 55, y: 0, z: 180 },    isCorner: true, hasCurbs: true, cornerSpeed: 35, width: 11 },
    { pos: { x: 35, y: 0, z: 170 },    isCorner: true, hasCurbs: true, cornerSpeed: 32 },
    { pos: { x: 20, y: 0, z: 155 },    isCorner: true, hasCurbs: true, cornerSpeed: 35 },

    // Approach to Parabolica
    { pos: { x: 10, y: 0, z: 130 } },
    { pos: { x: 5, y: 0, z: 100 },     camPosition: { x: -15, y: 6, z: 95 } },

    // Turn 11: Parabolica (long sweeping right, opens onto main straight)
    { pos: { x: -5, y: 0, z: 70 },     isCorner: true, hasCurbs: true, cornerSpeed: 50, hasGrandstand: true },
    { pos: { x: -12, y: 0, z: 45 },    isCorner: true, cornerSpeed: 55 },
    { pos: { x: -10, y: 0, z: 20 },    isCorner: true, hasCurbs: true, cornerSpeed: 60 },
    { pos: { x: -5, y: 0, z: 5 },      isCorner: true, cornerSpeed: 65 },
  ],

  grandstandPositions: [
    { x: -22, y: 0, z: 30 },    // Start/finish main
    { x: -22, y: 0, z: 80 },    // Start/finish secondary
    { x: -22, y: 0, z: 140 },   // Main straight mid
    { x: -22, y: 0, z: 210 },   // Main straight end
    { x: 35, y: 0, z: 350 },    // First chicane outside
    { x: -28, y: 0, z: 500 },   // Second chicane outside
    { x: 25, y: 0, z: 650 },    // Before Lesmos
    { x: 95, y: 0, z: 220 },    // Ascari approach
    { x: -20, y: 0, z: 60 },    // Parabolica exit
    { x: 130, y: 0, z: 440 },   // Back straight mid
  ],

  treeZones: [
    { center: { x: -50, y: 0, z: 200 },  radius: 35, count: 45 },
    { center: { x: -50, y: 0, z: 350 },  radius: 30, count: 35 },
    { center: { x: -50, y: 0, z: 500 },  radius: 40, count: 50 },
    { center: { x: 150, y: 0, z: 500 },  radius: 35, count: 40 },
    { center: { x: 150, y: 0, z: 350 },  radius: 30, count: 35 },
    { center: { x: 50, y: 0, z: 750 },   radius: 30, count: 30 },
    { center: { x: -40, y: 0, z: -40 },  radius: 25, count: 25 },
    { center: { x: 140, y: 0, z: 200 },  radius: 30, count: 35 },
    { center: { x: 60, y: 0, z: 100 },   radius: 25, count: 20 },
    { center: { x: -30, y: 0, z: 650 },  radius: 25, count: 20 },
  ],

  bgColor: 0x6699CC,
};

// ── Track registry ────────────────────────────────────────────────

export const TRACKS: Record<string, TrackDefinition> = {
  autodromo: TRACK_AUTODROMO,
};

export function getTrack(id: string): TrackDefinition {
  return TRACKS[id] || TRACK_AUTODROMO;
}
