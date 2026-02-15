// ═══════════════════════════════════════════════════════════════════
// quest3d/rules.ts — Sparkstone Quest: PS1-Style 3D Town Demo
// ═══════════════════════════════════════════════════════════════════

export interface Quest3DState {
  phase: 'loading' | 'explore';
  cameraTarget: { x: number; y: number; z: number };
  sceneLoaded: boolean;
}

export const QUEST3D_CONFIG = {
  name: 'Sparkstone Quest',
  description: 'A low-poly 3D adventure in the world of Fizzlewood',
  engine: 'three.js',
  targetPolyCount: 300,
  resolution: { width: 800, height: 600 },
  renderResolution: { width: 400, height: 300 }, // PS1-style low-res
};
