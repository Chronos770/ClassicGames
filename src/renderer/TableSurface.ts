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

  g.rect(0, 0, width, height);
  g.fill({ color: 0x0a3d5c });

  // Water ripple effect
  for (let i = 0; i < 15; i++) {
    const y = Math.random() * height;
    g.rect(0, y, width, 2);
    g.fill({ color: 0x0d4a6e, alpha: 0.2 });
  }

  return g;
}
