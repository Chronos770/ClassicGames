import { Graphics } from 'pixi.js';
import { getCardTheme } from './CardThemes';
import { useSettingsStore } from '../stores/settingsStore';

export function createFeltSurface(width: number, height: number): Graphics {
  const g = new Graphics();

  // Base felt color
  g.rect(0, 0, width, height);
  g.fill({ color: 0x1a5c2a });

  // Radial gradient simulation - lighter center
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.max(width, height) * 0.7;

  for (let i = 10; i > 0; i--) {
    const r = (maxR * i) / 10;
    const alpha = 0.03 * (10 - i);
    g.ellipse(cx, cy, r, r * 0.75);
    g.fill({ color: 0x2d8a4e, alpha });
  }

  // Vignette - darker edges
  for (let i = 0; i < 5; i++) {
    const inset = i * 8;
    g.rect(0, 0, width, inset);
    g.fill({ color: 0x0a2e14, alpha: 0.1 * (5 - i) });
    g.rect(0, height - inset, width, inset);
    g.fill({ color: 0x0a2e14, alpha: 0.1 * (5 - i) });
    g.rect(0, 0, inset, height);
    g.fill({ color: 0x0a2e14, alpha: 0.1 * (5 - i) });
    g.rect(width - inset, 0, inset, height);
    g.fill({ color: 0x0a2e14, alpha: 0.1 * (5 - i) });
  }

  // Subtle felt texture noise (simulated with small dots)
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = 0.5 + Math.random() * 1.5;
    g.circle(x, y, size);
    g.fill({ color: Math.random() > 0.5 ? 0x1f6e35 : 0x155224, alpha: 0.08 });
  }

  return g;
}

export function createWoodSurface(width: number, height: number): Graphics {
  const g = new Graphics();

  // Base wood
  g.rect(0, 0, width, height);
  g.fill({ color: 0x8b5423 });

  // Wood grain lines
  for (let i = 0; i < 30; i++) {
    const y = Math.random() * height;
    const thickness = 1 + Math.random() * 3;
    g.rect(0, y, width, thickness);
    g.fill({ color: i % 2 === 0 ? 0x7a4a1f : 0x9c5e28, alpha: 0.15 });
  }

  // Vignette
  for (let i = 0; i < 5; i++) {
    const inset = i * 10;
    g.rect(0, 0, width, inset);
    g.fill({ color: 0x2a1508, alpha: 0.08 * (5 - i) });
    g.rect(0, height - inset, width, inset);
    g.fill({ color: 0x2a1508, alpha: 0.08 * (5 - i) });
  }

  return g;
}

export function createThemedFeltSurface(width: number, height: number): Graphics {
  const theme = getCardTheme(useSettingsStore.getState().cardTheme);
  const g = new Graphics();

  // Base felt color
  g.rect(0, 0, width, height);
  g.fill({ color: theme.feltBase });

  // Radial gradient simulation
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.max(width, height) * 0.7;

  for (let i = 10; i > 0; i--) {
    const r = (maxR * i) / 10;
    const alpha = 0.03 * (10 - i);
    g.ellipse(cx, cy, r, r * 0.75);
    g.fill({ color: theme.feltHighlight, alpha });
  }

  // Vignette
  for (let i = 0; i < 5; i++) {
    const inset = i * 8;
    g.rect(0, 0, width, inset);
    g.fill({ color: theme.feltVignette, alpha: 0.1 * (5 - i) });
    g.rect(0, height - inset, width, inset);
    g.fill({ color: theme.feltVignette, alpha: 0.1 * (5 - i) });
    g.rect(0, 0, inset, height);
    g.fill({ color: theme.feltVignette, alpha: 0.1 * (5 - i) });
    g.rect(width - inset, 0, inset, height);
    g.fill({ color: theme.feltVignette, alpha: 0.1 * (5 - i) });
  }

  // Subtle texture noise
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = 0.5 + Math.random() * 1.5;
    g.circle(x, y, size);
    g.fill({ color: Math.random() > 0.5 ? theme.feltHighlight : theme.feltBase, alpha: 0.08 });
  }

  return g;
}

export function createOceanSurface(width: number, height: number): Graphics {
  const g = new Graphics();

  // Deep ocean base with gradient
  g.rect(0, 0, width, height);
  g.fill({ color: 0x0a2d4a });

  // Layered depth gradient (lighter in center)
  const cx = width / 2;
  const cy = height / 2;
  for (let i = 8; i > 0; i--) {
    const rx = (width * 0.5 * i) / 8;
    const ry = (height * 0.5 * i) / 8;
    g.ellipse(cx, cy, rx, ry);
    g.fill({ color: 0x0d3a5c, alpha: 0.04 * (8 - i) });
  }

  // Seeded random for deterministic patterns
  const seed = (i: number) => {
    const n = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return n - Math.floor(n);
  };

  // Wave ripple patterns (horizontal wave lines)
  for (let i = 0; i < 25; i++) {
    const y = seed(i * 3) * height;
    const waveWidth = width * (0.2 + seed(i * 3 + 1) * 0.6);
    const startX = seed(i * 3 + 2) * (width - waveWidth);
    const thickness = 1 + seed(i * 7) * 1.5;

    // Curved wave line
    g.moveTo(startX, y);
    g.quadraticCurveTo(
      startX + waveWidth * 0.5, y + (seed(i * 5) - 0.5) * 6,
      startX + waveWidth, y
    );
    g.stroke({
      color: seed(i * 11) > 0.5 ? 0x0f4a6e : 0x0d3d5a,
      width: thickness,
      alpha: 0.15 + seed(i * 13) * 0.1,
    });
  }

  // Sparkle/light reflections on surface
  for (let i = 0; i < 30; i++) {
    const sx = seed(i * 2 + 100) * width;
    const sy = seed(i * 2 + 101) * height;
    const size = 0.5 + seed(i * 2 + 102) * 2;
    g.circle(sx, sy, size);
    g.fill({ color: 0x4488aa, alpha: 0.12 + seed(i * 2 + 103) * 0.08 });
  }

  // Vignette (darker edges for depth)
  for (let i = 0; i < 6; i++) {
    const inset = i * 10;
    const alpha = 0.06 * (6 - i);
    g.rect(0, 0, width, inset);
    g.fill({ color: 0x041525, alpha });
    g.rect(0, height - inset, width, inset);
    g.fill({ color: 0x041525, alpha });
    g.rect(0, 0, inset, height);
    g.fill({ color: 0x041525, alpha });
    g.rect(width - inset, 0, inset, height);
    g.fill({ color: 0x041525, alpha });
  }

  return g;
}
