// ═══════════════════════════════════════════════════════════════════
// SolarSystemViewer.tsx — interactive 3D solar system for the Space
// Weather tab. Drag/pinch to orbit & zoom, tap a planet, moon, ring, or
// surface feature for real astronomical facts, tap the glowing markers
// (solar wind, flare activity, aurora) for a live readout pulled from
// the same NOAA data powering the rest of the tab. Tapping anything
// smoothly zooms the camera in on it (so you can freely orbit around
// just that body); tapping empty space zooms back out.
//
// Distances/sizes/speeds are stylized, not to-scale (see
// solarSystemData.ts for why). Lighting is a single point light at the
// Sun, which gives every planet a real day/night terminator for free —
// no custom shader needed.
//
// Mirrors the Three.js setup/cleanup pattern used in
// src/games/quest3d/Quest3DPage.tsx (renderer lifecycle, OrbitControls),
// but sized responsively (ResizeObserver) instead of a fixed resolution,
// since this needs to work well from a phone-width panel up to desktop.
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLANETS, SUN_RADIUS, SUN_FACTS, type PlanetDef, type MoonDef, type PlanetFeature, type WeatherReport } from '../../lib/solarSystemData';
import {
  flareActivity,
  flareClass,
  kpDescription,
  solarWindActivity,
  type SpaceWeatherSnapshot,
} from '../../lib/spaceWeatherService';
import type { WeatherStation } from '../../lib/weatherService';

type Selection =
  | { kind: 'sun' }
  | { kind: 'planet'; id: string }
  | { kind: 'moon'; planetId: string; moonName: string }
  | { kind: 'ring'; planetId: string }
  | { kind: 'feature'; planetId: string; featureId: string }
  | { kind: 'solarwind' }
  | { kind: 'flare' }
  | { kind: 'aurora' };

interface Props {
  data: SpaceWeatherSnapshot | null;
  station: WeatherStation | null;
}

// ── Space-weather severity → color ────────────────────────────────
// Shared color language across the wind comet, flare burst, and aurora
// ring: calm = blue/emerald, elevated = amber, severe = red/fuchsia.
// Markers are drawn with a plain white glow texture and tinted via
// `material.color` so this can update live, frame to frame, without
// regenerating any canvas/texture.

function windSeverityColor(speed: number | null, bz: number | null): number {
  if (speed === null) return 0x93c5fd; // unknown — neutral blue
  const veryFast = speed > 800 || (bz !== null && bz < -15);
  const fast = speed > 600 || (bz !== null && bz < -10);
  const elevated = speed > 450 || (bz !== null && bz < -5);
  if (veryFast) return 0xe879f9; // fuchsia — CME-level
  if (fast) return 0xfb923c; // orange — fast & aurora-friendly
  if (elevated) return 0xfbbf24; // amber
  return 0x93c5fd; // calm blue
}

function flareSeverityColor(letter: string): number {
  switch (letter) {
    case 'X': return 0xf5d0fe; // near-white magenta — major flare
    case 'M': return 0xf87171; // red
    case 'C': return 0xfb923c; // orange
    case 'B': return 0xfacc15; // yellow
    default: return 0xfca5a5; // dim rose — quiet/unknown
  }
}

// ── Procedural texture helpers (canvas → THREE.CanvasTexture) ────────
// Same technique as Quest3D's makeCanvasTex: draw on an offscreen 2D
// canvas, wrap as a texture. Keeps this self-contained with no external
// image assets to fetch.

function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}
function rgbStr([r, g, b]: [number, number, number], a = 1): string {
  return `rgba(${r},${g},${b},${a})`;
}
function shade([r, g, b]: [number, number, number], amt: number): [number, number, number] {
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + amt)));
  return [f(r), f(g), f(b)];
}

// Airless rocky/icy world — real impact craters: a dark floor, a bright
// rim lit from one side, and a soft ejecta halo, layered with a wide
// power-law size mix (many tiny craters, a handful of big ones) like
// actual cratered terrain rather than random blurry blobs.
function makeCrateredTexture(base: number, accent: number, density = 1): THREE.CanvasTexture {
  const size = 320;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const b = hexToRgb(base);
  const a = hexToRgb(accent);
  ctx.fillStyle = rgbStr(b);
  ctx.fillRect(0, 0, size, size);
  // Fine regolith grain.
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 2.5 + 0.4;
    ctx.fillStyle = rgbStr(shade(Math.random() > 0.5 ? a : b, (Math.random() - 0.5) * 22), 0.35);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // A light source direction for consistent rim shading across all craters.
  const lx = -0.5;
  const ly = -0.6;
  const craterCount = Math.round(140 * density);
  for (let i = 0; i < craterCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    // Bias heavily toward small craters, a few big ones.
    const r = Math.pow(Math.random(), 2.4) * 30 + 1.5;
    // Soft ejecta halo.
    if (r > 6) {
      const haloGrad = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 1.8);
      haloGrad.addColorStop(0, rgbStr(shade(b, 10), 0.18));
      haloGrad.addColorStop(1, rgbStr(shade(b, 10), 0));
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    // Crater bowl: dark floor fading to a bright rim on the lit side.
    const bowlGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
    bowlGrad.addColorStop(0, rgbStr(shade(b, -38)));
    bowlGrad.addColorStop(0.72, rgbStr(shade(b, -20)));
    bowlGrad.addColorStop(1, rgbStr(shade(b, -6), 0));
    ctx.fillStyle = bowlGrad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // Bright rim arc on the lit side only.
    ctx.strokeStyle = rgbStr(shade(a, 34), Math.min(0.75, 0.3 + r / 30));
    ctx.lineWidth = Math.max(0.6, r * 0.14);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.94, Math.atan2(ly, lx) - 1.1, Math.atan2(ly, lx) + 1.1);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// Venus / Titan — a thick, opaque cloud/haze deck. You never see the
// actual solid surface of either world from outside, so this renders
// soft, wind-sheared horizontal cloud bands instead of any terrain.
function makeCloudyTexture(base: number, accent: number): THREE.CanvasTexture {
  const w = 320;
  const h = 160;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const b = hexToRgb(base);
  const a = hexToRgb(accent);
  ctx.fillStyle = rgbStr(b);
  ctx.fillRect(0, 0, w, h);
  // Wind-sheared horizontal streak bands, each row offset by a slow sine
  // wave so bands drift rather than sitting in hard rectangles.
  const rows = 70;
  for (let i = 0; i < rows; i++) {
    const y = (i / rows) * h;
    const rowH = h / rows + 0.6;
    const wave = Math.sin(i * 0.35) * 6 + Math.sin(i * 0.9) * 2.5;
    const t = (Math.sin(i * 0.5) + 1) / 2;
    ctx.fillStyle = rgbStr(shade(t > 0.5 ? a : b, (Math.random() - 0.5) * 10), 0.5);
    ctx.beginPath();
    ctx.ellipse(w / 2 + wave, y + rowH / 2, w * 0.62, rowH * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Soft billowing swirl blobs for structure.
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const rx = Math.random() * 34 + 14;
    const ry = rx * (0.25 + Math.random() * 0.25);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rx);
    grad.addColorStop(0, rgbStr(shade(Math.random() > 0.5 ? a : b, (Math.random() - 0.5) * 26), 0.22));
    grad.addColorStop(1, rgbStr(b, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, Math.random() * 0.6 - 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// Mars — rust-red plains, larger dark basaltic albedo regions, sparse
// light cratering (dust buries most craters at this scale), and bright
// polar ice caps top and bottom.
function makeMarsTexture(base: number, accent: number): THREE.CanvasTexture {
  const size = 320;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const b = hexToRgb(base);
  const a = hexToRgb(accent);
  ctx.fillStyle = rgbStr(b);
  ctx.fillRect(0, 0, size, size);
  // Fine dust-color variation.
  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = rgbStr(shade(b, (Math.random() - 0.5) * 24), 0.3);
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 2 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Large dark basaltic regions (Syrtis Major-like albedo features).
  for (let i = 0; i < 9; i++) {
    const x = Math.random() * size;
    const y = size * 0.15 + Math.random() * size * 0.7;
    const r = Math.random() * 36 + 20;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, rgbStr(shade(a, -20), 0.55));
    grad.addColorStop(1, rgbStr(shade(a, -20), 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.5 + Math.random() * 0.4), Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // A faint canyon streak, evoking Valles Marineris.
  ctx.strokeStyle = rgbStr(shade(b, -30), 0.4);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(size * 0.15, size * 0.52);
  ctx.bezierCurveTo(size * 0.35, size * 0.48, size * 0.55, size * 0.58, size * 0.78, size * 0.5);
  ctx.stroke();
  // Sparse light craters.
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.pow(Math.random(), 2) * 10 + 2;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, rgbStr(shade(b, -26)));
    grad.addColorStop(0.75, rgbStr(shade(b, -12)));
    grad.addColorStop(1, rgbStr(shade(b, -12), 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Polar ice caps.
  const capGrad1 = ctx.createLinearGradient(0, 0, 0, size * 0.12);
  capGrad1.addColorStop(0, 'rgba(255,250,245,0.95)');
  capGrad1.addColorStop(1, 'rgba(255,250,245,0)');
  ctx.fillStyle = capGrad1;
  ctx.fillRect(0, 0, size, size * 0.12);
  const capGrad2 = ctx.createLinearGradient(0, size * 0.88, 0, size);
  capGrad2.addColorStop(0, 'rgba(255,250,245,0)');
  capGrad2.addColorStop(1, 'rgba(255,250,245,0.95)');
  ctx.fillStyle = capGrad2;
  ctx.fillRect(0, size * 0.88, size, size * 0.12);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// Icy moons — Europa's straight, dark linea fractures or Triton's
// blobby "cantaloupe" dimpled terrain, over a pale ice base.
function makeIcyCrackedTexture(base: number, accent: number, style: 'linear' | 'cantaloupe'): THREE.CanvasTexture {
  const size = 320;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const b = hexToRgb(base);
  const a = hexToRgb(accent);
  ctx.fillStyle = rgbStr(b);
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = rgbStr(shade(b, (Math.random() - 0.5) * 16), 0.3);
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 2.5 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (style === 'linear') {
    // Long, gently-curving fracture lines criss-crossing the surface.
    for (let i = 0; i < 22; i++) {
      const x0 = Math.random() * size;
      const y0 = Math.random() * size;
      const ang = Math.random() * Math.PI * 2;
      const len = Math.random() * 140 + 60;
      const x1 = x0 + Math.cos(ang) * len;
      const y1 = y0 + Math.sin(ang) * len;
      const midx = (x0 + x1) / 2 + (Math.random() - 0.5) * 40;
      const midy = (y0 + y1) / 2 + (Math.random() - 0.5) * 40;
      ctx.strokeStyle = rgbStr(shade(a, -10), 0.35 + Math.random() * 0.25);
      ctx.lineWidth = Math.random() * 1.8 + 0.5;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(midx, midy, x1, y1);
      ctx.stroke();
    }
  } else {
    // Cantaloupe terrain: irregular dimpled blobs, no sharp rims.
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 14 + 5;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, rgbStr(shade(a, -14), 0.4));
      grad.addColorStop(1, rgbStr(shade(a, -14), 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Bright polar frost.
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(0, 0, size, size * 0.07);
  ctx.fillRect(0, size * 0.93, size, size * 0.07);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// Io — sulfur-and-silicate volcanic patchwork. No craters (constantly
// resurfaced by eruptions); instead blotchy patches of yellow, orange,
// white and black, like a lava lamp frozen mid-swirl.
function makeVolcanicTexture(base: number, accent: number): THREE.CanvasTexture {
  const size = 320;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const b = hexToRgb(base);
  const a = hexToRgb(accent);
  ctx.fillStyle = rgbStr(b);
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 26 + 8;
    const roll = Math.random();
    const col = roll < 0.35 ? shade(a, 20) : roll < 0.6 ? shade(b, -10) : roll < 0.8 ? [255, 245, 220] as [number, number, number] : [40, 30, 20] as [number, number, number];
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, rgbStr(col, 0.5));
    grad.addColorStop(1, rgbStr(col, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + Math.random() * 0.4), Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // A few active-looking dark volcanic vents with a hot rim.
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 6 + 3;
    ctx.fillStyle = 'rgba(35,20,15,0.7)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,180,90,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.4, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function makeBandedTexture(base: number, accent: number, spot?: number): THREE.CanvasTexture {
  const w = 320;
  const h = 160;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const b = hexToRgb(base);
  const a = hexToRgb(accent);
  // Fine-grained horizontal bands (row by row) with a slow sine drift so
  // belt boundaries look turbulent/wind-sheared rather than ruled lines.
  const rowCount = 80;
  for (let i = 0; i < rowCount; i++) {
    const y = (i / rowCount) * h;
    const rowH = h / rowCount + 0.8;
    const bandPhase = Math.sin(i * 0.28) * 0.5 + Math.sin(i * 0.61 + 1.3) * 0.3;
    const useAccent = bandPhase > 0;
    const col = useAccent ? a : b;
    const jitterAmt = (Math.random() - 0.5) * 16 + bandPhase * 12;
    ctx.fillStyle = rgbStr(shade(col, jitterAmt));
    ctx.fillRect(0, y, w, rowH);
  }
  // Turbulent horizontal noise streaks, denser than before, with slight
  // wave curvature to suggest shear flow between adjacent belts.
  for (let i = 0; i < 550; i++) {
    const y = Math.random() * h;
    const x = Math.random() * w;
    const len = Math.random() * 36 + 10;
    ctx.strokeStyle = rgbStr(shade(Math.random() > 0.5 ? a : b, (Math.random() - 0.5) * 34), 0.22);
    ctx.lineWidth = Math.random() * 1.4 + 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + len * 0.4, y + (Math.random() - 0.5) * 3, x + len * 0.7, y + (Math.random() - 0.5) * 3, x + len, y + (Math.random() - 0.5) * 2);
    ctx.stroke();
  }
  // Small swirling vortices scattered across the bands (mini storms).
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 6 + 3;
    ctx.strokeStyle = rgbStr(shade(Math.random() > 0.5 ? a : b, 24), 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0.4, Math.PI * 1.7);
    ctx.stroke();
  }
  if (spot) {
    const sc = hexToRgb(spot);
    const sx = w * 0.28;
    const sy = h * 0.62;
    // Storm body with a swirled inner ring, not a flat blob.
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20);
    grad.addColorStop(0, rgbStr(shade(sc, 18), 0.9));
    grad.addColorStop(0.6, rgbStr(sc, 0.85));
    grad.addColorStop(1, rgbStr(sc, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 20, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgbStr(shade(sc, -30), 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 12, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function makeEarthTexture(): THREE.CanvasTexture {
  const w = 384;
  const h = 192;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  // Ocean with a subtle depth gradient rather than a flat fill.
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
  oceanGrad.addColorStop(0, '#1c4a80');
  oceanGrad.addColorStop(0.5, '#2b6bad');
  oceanGrad.addColorStop(1, '#1c4a80');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, w, h);
  // Landmasses — each continent built from several overlapping blobs so
  // coastlines look organic and irregular instead of a single ellipse.
  const drawLand = (cx: number, cy: number, rx: number, ry: number, rot: number) => {
    for (const dx of [-w, 0, w]) {
      const grad = ctx.createRadialGradient(cx + dx, cy, 0, cx + dx, cy, Math.max(rx, ry) * 1.1);
      grad.addColorStop(0, 'rgba(90,138,66,0.95)');
      grad.addColorStop(0.75, 'rgba(74,124,60,0.92)');
      grad.addColorStop(1, 'rgba(74,124,60,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  const continents = 9;
  for (let i = 0; i < continents; i++) {
    const cx = Math.random() * w;
    const cy = Math.random() * h * 0.76 + h * 0.1;
    const baseRx = Math.random() * 26 + 14;
    const baseRy = Math.random() * 14 + 8;
    const lobes = 3 + Math.floor(Math.random() * 3);
    for (let j = 0; j < lobes; j++) {
      const ang = (j / lobes) * Math.PI * 2 + Math.random() * 0.6;
      const dist = Math.random() * baseRx * 0.7;
      const lx = cx + Math.cos(ang) * dist;
      const ly = cy + Math.sin(ang) * dist * 0.6;
      const lrx = baseRx * (0.45 + Math.random() * 0.5);
      const lry = baseRy * (0.45 + Math.random() * 0.5);
      drawLand(lx, ly, lrx, lry, Math.random() * Math.PI);
    }
    // Arid/desert tint patches on some landmasses.
    if (Math.random() > 0.5) {
      for (const dx of [-w, 0, w]) {
        ctx.fillStyle = 'rgba(150,132,74,0.35)';
        ctx.beginPath();
        ctx.ellipse(cx + dx + (Math.random() - 0.5) * baseRx, cy, baseRx * 0.4, baseRy * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Mountain/terrain shading flecks over land.
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillStyle = `rgba(40,60,30,${Math.random() * 0.12})`;
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 2 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Poles.
  const poleGradN = ctx.createLinearGradient(0, 0, 0, h * 0.1);
  poleGradN.addColorStop(0, 'rgba(240,245,250,0.95)');
  poleGradN.addColorStop(1, 'rgba(240,245,250,0)');
  ctx.fillStyle = poleGradN;
  ctx.fillRect(0, 0, w, h * 0.1);
  const poleGradS = ctx.createLinearGradient(0, h * 0.9, 0, h);
  poleGradS.addColorStop(0, 'rgba(240,245,250,0)');
  poleGradS.addColorStop(1, 'rgba(240,245,250,0.95)');
  ctx.fillStyle = poleGradS;
  ctx.fillRect(0, h * 0.9, w, h * 0.1);
  // Scattered wispy cloud streaks.
  for (let i = 0; i < 26; i++) {
    const cx = Math.random() * w;
    const cy = Math.random() * h;
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.22 + 0.06})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.random() * 22 + 8, Math.random() * 6 + 3, Math.random() * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // A couple of spiral cyclone systems for a more recognizable "weather"
  // read, drawn as a tightening arc spiral rather than a plain ellipse.
  const spirals = 2 + Math.floor(Math.random() * 2);
  for (let s = 0; s < spirals; s++) {
    const cx = Math.random() * w;
    const cy = Math.random() * h * 0.7 + h * 0.15;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const turns = 2.2;
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ang = t * Math.PI * 2 * turns;
      const rad = t * 14;
      const px = cx + Math.cos(ang) * rad;
      const py = cy + Math.sin(ang) * rad * 0.7;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// Fixed candidate sunspot positions (as UV fractions), generated once
// and reused across redraws — only which ones are DRAWN changes with
// the live active-region count, so spots appear/disappear in place
// rather than jumping around every time data refreshes.
const SUNSPOT_SLOTS: { u: number; v: number; scale: number }[] = Array.from({ length: 14 }, () => ({
  u: 0.08 + Math.random() * 0.84,
  v: 0.18 + Math.random() * 0.64,
  scale: 0.6 + Math.random() * 0.8,
}));

function drawSunSurface(ctx: CanvasRenderingContext2D, size: number, activeSpotCount: number) {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#ffb347';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 3 + 0.5;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,220,120,0.5)' : 'rgba(255,140,40,0.4)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Real sunspots — count driven by the live NOAA active-region count
  // (data.sunspots.active_regions_count), capped to how many slots we
  // pre-generated. Each is a dark umbra with a lighter penumbra ring,
  // roughly how sunspots actually look.
  const n = Math.max(0, Math.min(activeSpotCount, SUNSPOT_SLOTS.length));
  for (let i = 0; i < n; i++) {
    const slot = SUNSPOT_SLOTS[i];
    const x = slot.u * size;
    const y = slot.v * size;
    const r = 4.5 * slot.scale;
    ctx.beginPath();
    ctx.fillStyle = 'rgba(90,45,10,0.55)';
    ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = 'rgba(40,15,5,0.85)';
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function makeSunTexture(spotCount: number): { tex: THREE.CanvasTexture; redraw: (n: number) => void } {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  drawSunSurface(ctx, size, spotCount);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  const redraw = (n: number) => {
    drawSunSurface(ctx, size, n);
    tex.needsUpdate = true;
  };
  return { tex, redraw };
}

// Radial-gradient sprite texture for glow effects (Sun corona, markers,
// comet head/tail particles).
function makeGlowTexture(color: string): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, color);
  grad.addColorStop(0.4, color.replace(/[\d.]+\)$/, '0.35)'));
  grad.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

// Elongated "shooting star" glow — bright core tapering to transparent
// at both ends along Y, soft falloff across X. Used for the solar-wind
// streak's head so it reads as a fast-moving particle, not a round dot.
// White base so material.color can tint it live (see makeGlowTexture).
function makeStreakTexture(): THREE.CanvasTexture {
  const w = 64;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const cx = w / 2;
  const cy = h / 2;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x - cx) / (w / 2);
      const ny = (y - cy) / (h / 2);
      // Elliptical falloff, softer along the long (Y) axis so the tip
      // fades gradually rather than looking cut off.
      const d = Math.sqrt(nx * nx + ny * ny * 0.55);
      const a = Math.max(0, 1 - d);
      const i = (y * w + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * a * a);
    }
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}

// Horizontal fade for the wind's ribbon tail: opaque at U=0 (the head
// end) fading to fully transparent at U=1 (the oldest, trailing end).
// White base so material.color can tint it live by severity.
function makeRibbonGradientTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 8;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  return new THREE.CanvasTexture(c);
}

// Small pill-shaped text label so the live-data markers read as
// "something you can click," not decorative sparkles.
function makeLabelSprite(text: string, accent: string): { sprite: THREE.Sprite; dispose: () => void } {
  const fontPx = 40;
  const padX = 20;
  const padY = 14;
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = `700 ${fontPx}px sans-serif`;
  const textWidth = measure.measureText(text).width;
  const c = document.createElement('canvas');
  c.width = Math.ceil(textWidth + padX * 2);
  c.height = fontPx + padY * 2;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(8,10,20,0.72)';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, c.width - 3, c.height - 3);
  ctx.font = `700 ${fontPx}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  const worldHeight = 0.42;
  sprite.scale.set(worldHeight * (c.width / c.height), worldHeight, 1);
  return { sprite, dispose: () => { tex.dispose(); mat.dispose(); } };
}

interface ClickTarget {
  object: THREE.Object3D;
  selection: Selection;
}

// What the running Three.js scene exposes to React once built, so the
// component's other effects (fullscreen toggle, focus/zoom, sunspot
// redraw) can drive it without tearing anything down. Kept in a ref
// rather than component state since none of this should ever trigger
// a re-render.
interface SceneEngine {
  attach: (el: HTMLDivElement) => void;
  setFocus: (sel: Selection | null) => void;
  setSunspots: (n: number) => void;
}

export default function SolarSystemViewer({ data, station }: Props) {
  // Two possible homes for the live WebGL canvas: the normal in-card
  // spot, and a fullscreen one rendered through a portal (see below).
  // Only one is ever attached at a time — attach() (built inside the
  // setup effect) moves the *same* canvas element between them via
  // plain DOM appendChild, which re-parents it without losing its GL
  // context, so toggling fullscreen never rebuilds the scene or resets
  // the camera.
  const compactContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SceneEngine | null>(null);
  const dataRef = useRef(data);
  const stationRef = useRef(station);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [ready, setReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    stationRef.current = station;
  }, [station]);

  // Fullscreen chrome is rendered via a portal straight into
  // document.body (see the return statement) — NOT just `position:
  // fixed` in place. Reason: this tab's route wrapper
  // (src/ui/Layout.tsx's `<motion.div>` around `<Outlet />`) is
  // animated by Framer Motion, and an ancestor with a CSS transform
  // establishes a new containing block for `position: fixed`
  // descendants — so a plain fixed-position overlay here would only
  // ever fill that wrapper's box, not the real viewport. A portal
  // sidesteps the whole issue by mounting outside that subtree.
  useEffect(() => {
    if (!fullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [fullscreen]);

  // Move the live canvas to whichever container is currently mounted —
  // fires on mount (attaching for the first time) and every time
  // `fullscreen` toggles (re-parenting into/out of the portal).
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const target = fullscreen ? fullscreenContainerRef.current : compactContainerRef.current;
    if (!target) return;
    engine.attach(target);
  }, [fullscreen]);

  useEffect(() => {
    const initialContainer = compactContainerRef.current;
    if (!initialContainer) return;

    let disposed = false;
    const clickTargets: ClickTarget[] = [];
    const disposables: { dispose: () => void }[] = [];

    // ── Renderer / Scene / Camera ─────────────────────────────────
    // Not attached to a DOM container here — engine.attach() (defined
    // near the bottom of this effect) handles that, and also runs on
    // every fullscreen toggle via the effect above.
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x03040a);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 500);
    camera.position.set(0, 22, 34);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 6;
    controls.maxDistance = 90;
    controls.target.set(0, 0, 0);

    // ── Lighting: point light at the Sun gives every planet a real
    // day/night terminator for free via standard/phong materials.
    const sunLight = new THREE.PointLight(0xfff2d8, 3.2, 0, 0.4);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    const ambient = new THREE.AmbientLight(0x28304a, 0.55);
    scene.add(ambient);

    // ── Starfield ────────────────────────────────────────────────
    {
      const starCount = 1200;
      const positions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const r = 150 + Math.random() * 150;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.cos(phi);
        positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: true });
      const stars = new THREE.Points(starGeo, starMat);
      scene.add(stars);
      disposables.push(starGeo, starMat);
    }

    // ── Sun ──────────────────────────────────────────────────────
    // Sunspot count on the texture is driven by the real live NOAA
    // active-region count (redrawn on demand via __setSunspots below,
    // not every frame — see the note near that hook).
    const { tex: sunTex, redraw: redrawSunspots } = makeSunTexture(dataRef.current?.sunspots.active_regions_count ?? 0);
    const sunGeo = new THREE.SphereGeometry(SUN_RADIUS, 32, 24);
    const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);
    clickTargets.push({ object: sunMesh, selection: { kind: 'sun' } });
    disposables.push(sunGeo, sunMat, sunTex);

    const glowTex = makeGlowTexture('rgba(255,200,120,1)');
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false });
    const glowSprite = new THREE.Sprite(glowMat);
    glowSprite.scale.set(SUN_RADIUS * 4.2, SUN_RADIUS * 4.2, 1);
    scene.add(glowSprite);
    disposables.push(glowTex, glowMat);

    // ── Orbit rings ──────────────────────────────────────────────
    for (const p of PLANETS) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * p.orbitRadius, 0, Math.sin(a) * p.orbitRadius));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: 0x3a4a6a, transparent: true, opacity: 0.35 });
      scene.add(new THREE.Line(geo, mat));
      disposables.push(geo, mat);
    }

    // ── Planets ──────────────────────────────────────────────────
    interface MoonRuntime {
      pivot: THREE.Object3D;
      def: MoonDef;
      angle: number;
    }
    interface PlanetRuntime {
      def: PlanetDef;
      group: THREE.Group;
      mesh: THREE.Mesh;
      angle: number;
      moons: MoonRuntime[];
    }
    const runtimePlanets: PlanetRuntime[] = [];

    for (const def of PLANETS) {
      const group = new THREE.Group();
      const angle = Math.random() * Math.PI * 2;
      group.position.set(Math.cos(angle) * def.orbitRadius, 0, Math.sin(angle) * def.orbitRadius);
      scene.add(group);

      const tiltGroup = new THREE.Group();
      tiltGroup.rotation.z = THREE.MathUtils.degToRad(def.axialTilt);
      group.add(tiltGroup);

      const isEarth = def.id === 'earth';
      const isGasGiant = ['jupiter', 'saturn', 'uranus', 'neptune'].includes(def.id);
      const tex = isEarth
        ? makeEarthTexture()
        : isGasGiant
        ? makeBandedTexture(def.color, def.bandColor ?? def.color, def.id === 'jupiter' ? 0xcc6a3d : undefined)
        : def.id === 'venus'
        ? makeCloudyTexture(def.color, def.bandColor ?? def.color)
        : def.id === 'mars'
        ? makeMarsTexture(def.color, def.bandColor ?? def.color)
        : makeCrateredTexture(def.color, def.bandColor ?? def.color, def.id === 'mercury' ? 1.3 : 1);
      const geo = new THREE.SphereGeometry(def.radius, 40, 30);
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.0 });
      const mesh = new THREE.Mesh(geo, mat);
      tiltGroup.add(mesh);
      clickTargets.push({ object: mesh, selection: { kind: 'planet', id: def.id } });
      disposables.push(geo, mat, tex);

      if (def.hasRing) {
        const ringGeo = new THREE.RingGeometry(def.radius * 1.5, def.radius * 2.4, 48);
        // RingGeometry UVs are radial, not ideal for a texture — flat
        // tinted material reads cleanly enough at this scale.
        const ringMat = new THREE.MeshStandardMaterial({
          color: def.ringColor ?? 0xcccccc,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
          roughness: 1,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        tiltGroup.add(ring);
        clickTargets.push({ object: ring, selection: { kind: 'ring', planetId: def.id } });
        disposables.push(ringGeo, ringMat);
      }

      // Surface landmarks (Great Red Spot, Olympus Mons, ...) — tiny
      // marker attached directly to the spinning mesh, so it stays
      // pinned to the same point on the surface as the planet rotates.
      for (const feat of def.features ?? []) {
        const dir = new THREE.Vector3(...feat.direction).normalize();
        const fGeo = new THREE.SphereGeometry(Math.max(def.radius * 0.1, 0.02), 8, 6);
        const fMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const marker = new THREE.Mesh(fGeo, fMat);
        marker.position.copy(dir).multiplyScalar(def.radius * 1.05);
        mesh.add(marker);
        clickTargets.push({ object: marker, selection: { kind: 'feature', planetId: def.id, featureId: feat.id } });
        disposables.push(fGeo, fMat);
      }

      const moons: MoonRuntime[] = [];
      for (const m of def.moons ?? []) {
        const mAccent = m.accentColor ?? m.color;
        const mTex =
          m.style === 'hazy'
            ? makeCloudyTexture(m.color, mAccent)
            : m.style === 'volcanic'
            ? makeVolcanicTexture(m.color, mAccent)
            : m.style === 'icy'
            ? makeIcyCrackedTexture(m.color, mAccent, 'linear')
            : m.style === 'cantaloupe'
            ? makeIcyCrackedTexture(m.color, mAccent, 'cantaloupe')
            : makeCrateredTexture(m.color, mAccent, 1.1);
        const mGeo = new THREE.SphereGeometry(m.radius, 20, 16);
        const mMat = new THREE.MeshStandardMaterial({ map: mTex, roughness: 0.95 });
        const mMesh = new THREE.Mesh(mGeo, mMat);
        const pivot = new THREE.Object3D();
        pivot.add(mMesh);
        group.add(pivot);
        clickTargets.push({ object: mMesh, selection: { kind: 'moon', planetId: def.id, moonName: m.name } });
        moons.push({ pivot, def: m, angle: Math.random() * Math.PI * 2 });
        disposables.push(mGeo, mMat, mTex);
      }

      runtimePlanets.push({ def, group, mesh, angle, moons });
    }
    const earthRuntime = runtimePlanets.find((r) => r.def.id === 'earth')!;
    const earthDef = earthRuntime.def;

    // ── Live data markers ────────────────────────────────────────
    // Solar wind: a streaking particle with a tapered ribbon tail —
    // meant to read as an actual fast-moving stream, not a floating
    // ball — continuously traveling from the Sun's corona toward
    // wherever Earth currently is in its orbit. Direction and general
    // path are illustrative, but its travel SPEED and color are driven
    // by the real, live solar wind speed/Bz from NOAA.
    const streakTex = makeStreakTexture();
    disposables.push(streakTex);

    // Head: a small plane, manually billboarded each frame to face the
    // camera while staying elongated along the direction of travel —
    // a Sprite can't do this (Sprites only ever rotate in pure
    // screen-space, so they can't lean into a 3D velocity direction).
    const windHeadGeo = new THREE.PlaneGeometry(1, 1);
    const windHeadMat = new THREE.MeshBasicMaterial({
      map: streakTex, color: 0x93c5fd, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const windHead = new THREE.Mesh(windHeadGeo, windHeadMat);
    scene.add(windHead);
    clickTargets.push({ object: windHead, selection: { kind: 'solarwind' } });
    disposables.push(windHeadGeo, windHeadMat);

    // Tail: one ribbon mesh built fresh each frame from the recent
    // position history (billboarded per-segment toward the camera),
    // tapering in width and fading via the gradient texture below —
    // a continuous streak instead of a chain of separate dots.
    const WIND_TAIL_LEN = 22;
    const ribbonTex = makeRibbonGradientTexture();
    const ribbonMat = new THREE.MeshBasicMaterial({
      map: ribbonTex, color: 0x93c5fd, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const ribbonGeo = new THREE.BufferGeometry();
    const ribbonPositions = new Float32Array((WIND_TAIL_LEN + 1) * 2 * 3);
    const ribbonUvs = new Float32Array((WIND_TAIL_LEN + 1) * 2 * 2);
    const ribbonIndices: number[] = [];
    for (let i = 0; i < WIND_TAIL_LEN; i++) {
      const a = i * 2;
      ribbonIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    ribbonGeo.setAttribute('position', new THREE.BufferAttribute(ribbonPositions, 3));
    ribbonGeo.setAttribute('uv', new THREE.BufferAttribute(ribbonUvs, 2));
    ribbonGeo.setIndex(ribbonIndices);
    ribbonGeo.setDrawRange(0, 0); // nothing to draw until history fills in
    const windRibbon = new THREE.Mesh(ribbonGeo, ribbonMat);
    windRibbon.frustumCulled = false; // custom-updated bounds, never auto-computed
    scene.add(windRibbon);
    clickTargets.push({ object: windRibbon, selection: { kind: 'solarwind' } });
    disposables.push(ribbonGeo, ribbonMat, ribbonTex);

    const windHistory: THREE.Vector3[] = [];
    let windProgress = 0; // 0 (near Sun) → 1 (past Earth's orbit), loops

    const { sprite: windLabel, dispose: disposeWindLabel } = makeLabelSprite('Solar Wind', '#93c5fd');
    scene.add(windLabel);
    disposables.push({ dispose: disposeWindLabel });

    // Flare activity: an actual prominence-style arc erupting from the
    // Sun's surface (like a real solar flare/loop), not a floating
    // ball. Two feet anchored on the photosphere, child of sunMesh so
    // it co-rotates with the surface like a real active region would.
    const flareDir = new THREE.Vector3(1.5, 0.85, 0.55).normalize();
    const flareTangent = new THREE.Vector3().crossVectors(flareDir, new THREE.Vector3(0, 1, 0)).normalize();
    const flareFoot1 = flareDir.clone().applyAxisAngle(flareTangent, 0.42).multiplyScalar(SUN_RADIUS * 1.01);
    const flareFoot2 = flareDir.clone().applyAxisAngle(flareTangent, -0.42).multiplyScalar(SUN_RADIUS * 1.01);
    const flarePeak = flareDir.clone().multiplyScalar(SUN_RADIUS * 1.85);
    const flareCurve = new THREE.QuadraticBezierCurve3(flareFoot1, flarePeak, flareFoot2);
    const flareArcGeo = new THREE.TubeGeometry(flareCurve, 24, SUN_RADIUS * 0.045, 8, false);
    const flareArcMat = new THREE.MeshBasicMaterial({
      color: 0xfca5a5, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const flareArc = new THREE.Mesh(flareArcGeo, flareArcMat);
    sunMesh.add(flareArc);
    clickTargets.push({ object: flareArc, selection: { kind: 'flare' } });
    disposables.push(flareArcGeo, flareArcMat);

    // Bright glow at the peak — its own sprite (not the tube) so it can
    // pulse in scale for an "energetic burst" look without distorting
    // where the arc's feet meet the surface.
    const flareGlowTex = makeGlowTexture('rgba(255,255,255,1)');
    const flareGlowMat = new THREE.SpriteMaterial({ map: flareGlowTex, color: 0xfca5a5, transparent: true, depthWrite: false });
    const flarePeakGlow = new THREE.Sprite(flareGlowMat);
    flarePeakGlow.position.copy(flarePeak);
    flarePeakGlow.scale.set(0.7, 0.7, 1);
    sunMesh.add(flarePeakGlow);
    clickTargets.push({ object: flarePeakGlow, selection: { kind: 'flare' } });
    disposables.push(flareGlowTex, flareGlowMat);

    const { sprite: flareLabel, dispose: disposeFlareLabel } = makeLabelSprite('Solar Flare', '#fca5a5');
    scene.add(flareLabel);
    disposables.push({ dispose: disposeFlareLabel });
    const flareWorldPos = new THREE.Vector3(); // scratch, reused every frame

    // Aurora: a ring around Earth, colored by Kp / aurora probability.
    const auroraRingGeo = new THREE.RingGeometry(earthDef.radius * 1.7, earthDef.radius * 2.1, 32);
    const auroraRingMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    });
    const auroraRing = new THREE.Mesh(auroraRingGeo, auroraRingMat);
    disposables.push(auroraRingGeo, auroraRingMat);
    // Parented under the scene (not Earth's group) so its per-frame
    // position can be set explicitly alongside the label below — Earth's
    // own position is read fresh from earthRuntime.group each frame.
    scene.add(auroraRing);
    clickTargets.push({ object: auroraRing, selection: { kind: 'aurora' } });

    const { sprite: auroraLabel, dispose: disposeAuroraLabel } = makeLabelSprite('Aurora', '#6ee7b7');
    scene.add(auroraLabel);
    disposables.push({ dispose: disposeAuroraLabel });

    // ── Pointer handling (click vs drag-to-orbit) ───────────────
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downPos: { x: number; y: number } | null = null;

    function pointerToNdc(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function onPointerDown(e: PointerEvent) {
      downPos = { x: e.clientX, y: e.clientY };
    }
    function onPointerUp(e: PointerEvent) {
      if (!downPos) return;
      const dx = e.clientX - downPos.x;
      const dy = e.clientY - downPos.y;
      downPos = null;
      if (Math.hypot(dx, dy) > 6) return; // was a drag, not a tap
      pointerToNdc(e);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(clickTargets.map((t) => t.object), false);
      if (hits.length === 0) {
        setSelected(null); // tapped empty space — zoom back out
        return;
      }
      const hitObj = hits[0].object;
      const target = clickTargets.find((t) => t.object === hitObj);
      if (target) setSelected(target.selection);
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // ── Resize (responsive to whichever container currently holds
    // the canvas — compact card or fullscreen portal) ──────────────
    let activeContainer: HTMLDivElement = initialContainer;
    function resizeTo(el: HTMLDivElement) {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    const ro = new ResizeObserver(() => resizeTo(activeContainer));

    function attach(el: HTMLDivElement) {
      activeContainer = el;
      el.appendChild(renderer.domElement);
      ro.disconnect();
      ro.observe(el);
      resizeTo(el);
    }
    attach(initialContainer);

    setReady(true);

    // ── Camera focus (click-to-zoom) ────────────────────────────
    // Clicking any body smoothly pulls the camera in close enough to
    // freely orbit around just that object, while continuing to track
    // its position as it orbits/moves. Clicking empty space (or ✕)
    // clears focus and the camera drifts back out to the wide default
    // range via the restored min/max distance.
    interface FocusTarget {
      getPos: () => THREE.Vector3;
      distance: number;
    }
    let focus: FocusTarget | null = null;
    const DEFAULT_MIN_DIST = 6;
    const DEFAULT_MAX_DIST = 90;
    // Roughly matches the initial camera.position.set(0, 22, 34) distance
    // from the origin — deselecting eases the camera back toward this,
    // from whatever angle the user is currently looking, rather than
    // just releasing the zoom clamp in place (which wouldn't actually
    // "zoom back out" the way the on-screen hint promises).
    const WIDE_VIEW_DISTANCE = 40;
    const RELEASE_DURATION = 1.6; // seconds of eased pull-back before returning free control
    let releaseTimer = 0;

    function computeFocus(sel: Selection | null): FocusTarget | null {
      if (!sel) return null;
      switch (sel.kind) {
        case 'sun':
          return { getPos: () => new THREE.Vector3(0, 0, 0), distance: SUN_RADIUS * 3.2 };
        case 'planet': {
          const rp = runtimePlanets.find((r) => r.def.id === sel.id);
          if (!rp) return null;
          return { getPos: () => rp.group.position, distance: rp.def.radius * 6.5 + 1.1 };
        }
        case 'ring': {
          const rp = runtimePlanets.find((r) => r.def.id === sel.planetId);
          if (!rp) return null;
          return { getPos: () => rp.group.position, distance: rp.def.radius * 8 + 1.2 };
        }
        case 'feature': {
          const rp = runtimePlanets.find((r) => r.def.id === sel.planetId);
          if (!rp) return null;
          return { getPos: () => rp.group.position, distance: rp.def.radius * 5.5 + 0.9 };
        }
        case 'moon': {
          const rp = runtimePlanets.find((r) => r.def.id === sel.planetId);
          const moon = rp?.moons.find((m) => m.def.name === sel.moonName);
          if (!rp || !moon) return null;
          // Simple translation, not a rotation — pivot is a direct
          // child of `group` with no intervening rotated node, so world
          // position is just the sum, no matrix-world lag to worry about.
          return {
            getPos: () => rp.group.position.clone().add(moon.pivot.position),
            distance: moon.def.radius * 11 + 0.35,
          };
        }
        case 'solarwind':
          return { getPos: () => windHead.position, distance: 2.4 };
        case 'flare':
          // flareArc is a child of sunMesh (co-rotates with the
          // surface), so its position is local — resolve world space
          // fresh each call rather than reading .position directly.
          return {
            getPos: () => flarePeakGlow.getWorldPosition(flareWorldPos),
            distance: SUN_RADIUS * 2.1,
          };
        case 'aurora':
          return { getPos: () => earthRuntime.group.position, distance: earthDef.radius * 6.5 + 1.1 };
        default:
          return null;
      }
    }

    function setFocus(sel: Selection | null) {
      const next = computeFocus(sel);
      if (next) {
        focus = next;
        releaseTimer = 0;
        controls.minDistance = Math.max(0.1, next.distance * 0.3);
        controls.maxDistance = next.distance * 4;
      } else {
        // Deselecting: ease back out to the wide view for a bit, then
        // hand free control back to the user (see RELEASE_DURATION).
        focus = { getPos: () => new THREE.Vector3(0, 0, 0), distance: WIDE_VIEW_DISTANCE };
        releaseTimer = RELEASE_DURATION;
        controls.minDistance = DEFAULT_MIN_DIST;
        controls.maxDistance = DEFAULT_MAX_DIST;
      }
    }

    // Exposed to React (the effects above/below this one) via a ref
    // rather than DOM-node properties, now that the canvas can live in
    // either of two different containers depending on fullscreen state.
    engineRef.current = {
      attach,
      setFocus,
      // Redrawing a 256x256 canvas (noise + spots) every frame would be
      // wasteful for something that only changes when fresh data lands
      // — so this fires on demand from a React effect below instead of
      // from inside animate().
      setSunspots: (n: number) => redrawSunspots(n),
    };

    // ── Animation loop ──────────────────────────────────────────
    const clock = new THREE.Clock();
    let animId = 0;

    function animate() {
      if (disposed) return;
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const t = clock.elapsedTime;

      sunMesh.rotation.y += delta * 0.03;
      glowSprite.material.rotation += delta * 0.01;

      for (const rp of runtimePlanets) {
        rp.angle += rp.def.orbitSpeed * delta * 0.25;
        rp.group.position.set(Math.cos(rp.angle) * rp.def.orbitRadius, 0, Math.sin(rp.angle) * rp.def.orbitRadius);
        rp.mesh.rotation.y += rp.def.spinSpeed * delta;
        for (const m of rp.moons) {
          m.angle += m.def.orbitSpeed * delta;
          m.pivot.position.set(Math.cos(m.angle) * m.def.orbitRadius, 0, Math.sin(m.angle) * m.def.orbitRadius);
        }
      }

      // ── Live marker updates from the latest fetched data ────────
      const d = dataRef.current;
      const speed = d?.solar_wind.latest.speed ?? null;
      const bz = d?.solar_wind.latest.bz ?? null;
      const speedFactor = speed === null ? 1 : Math.max(0.5, Math.min(2.5, speed / 400));
      const windColor = windSeverityColor(speed, bz);
      windHeadMat.color.setHex(windColor);
      ribbonMat.color.setHex(windColor);

      // Streaking solar-wind particle: travels from just outside the
      // Sun's corona out past Earth's current orbital position, along
      // the Sun→Earth line, looping continuously. Faster real wind
      // speed = faster loop.
      windProgress += delta * 0.12 * speedFactor;
      if (windProgress > 1) {
        windProgress -= 1;
        windHistory.length = 0; // avoid the ribbon snapping across the whole path on wrap
      }
      const windAngle = earthRuntime.angle;
      const windR = THREE.MathUtils.lerp(SUN_RADIUS * 1.35, earthDef.orbitRadius * 1.3, windProgress);
      const windY = Math.sin(windProgress * Math.PI) * 0.9;
      const prevWindPos = windHistory[0] ?? null;
      windHead.position.set(Math.cos(windAngle) * windR, windY, Math.sin(windAngle) * windR);

      // Orient the head to face the camera while staying elongated
      // along its actual direction of travel (a Sprite can only rotate
      // in flat screen-space, so it can't lean into a 3D velocity like
      // this — hence a manually-billboarded Mesh instead).
      const travelDir = prevWindPos
        ? windHead.position.clone().sub(prevWindPos)
        : new THREE.Vector3(Math.cos(windAngle), 0, Math.sin(windAngle));
      if (travelDir.lengthSq() < 1e-8) travelDir.set(Math.cos(windAngle), 0, Math.sin(windAngle));
      travelDir.normalize();
      const toCam = new THREE.Vector3().subVectors(camera.position, windHead.position).normalize();
      let headRight = new THREE.Vector3().crossVectors(travelDir, toCam);
      if (headRight.lengthSq() < 1e-8) headRight.set(1, 0, 0);
      headRight.normalize();
      const headUp = new THREE.Vector3().crossVectors(toCam, headRight).normalize();
      windHead.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(headRight, headUp, toCam));
      const windHeadPulse = 1 + Math.sin(t * 3) * 0.15;
      const windBaseSize = 0.5 * speedFactor * 0.6 * windHeadPulse + 0.25;
      windHead.scale.set(windBaseSize * 0.5, windBaseSize * 1.6, 1); // narrow + elongated = streak, not a ball

      windHistory.unshift(windHead.position.clone());
      if (windHistory.length > WIND_TAIL_LEN + 1) windHistory.pop();

      // Rebuild the ribbon strip from the position history — each
      // point gets a camera-facing "right" vector (perpendicular to its
      // local direction of travel) scaled by a tapering half-width, so
      // the whole thing reads as one continuous fading streak.
      {
        const posAttr = ribbonGeo.attributes.position as THREE.BufferAttribute;
        const uvAttr = ribbonGeo.attributes.uv as THREE.BufferAttribute;
        const n = windHistory.length;
        const maxHalfWidth = windBaseSize * 0.3;
        const scratchRight = new THREE.Vector3();
        const scratchCam = new THREE.Vector3();
        for (let i = 0; i < n; i++) {
          const p = windHistory[i];
          const neighbor = windHistory[i + 1] ?? windHistory[i - 1] ?? p;
          const tangent = scratchRight.subVectors(p, neighbor);
          if (tangent.lengthSq() < 1e-8) tangent.copy(travelDir);
          tangent.normalize();
          const toCamI = scratchCam.subVectors(camera.position, p).normalize();
          const right = new THREE.Vector3().crossVectors(tangent, toCamI);
          if (right.lengthSq() < 1e-8) right.set(0, 1, 0).cross(toCamI);
          right.normalize();
          const life = 1 - i / WIND_TAIL_LEN;
          const half = maxHalfWidth * life;
          const vi = i * 2 * 3;
          posAttr.array[vi] = p.x + right.x * half;
          posAttr.array[vi + 1] = p.y + right.y * half;
          posAttr.array[vi + 2] = p.z + right.z * half;
          posAttr.array[vi + 3] = p.x - right.x * half;
          posAttr.array[vi + 4] = p.y - right.y * half;
          posAttr.array[vi + 5] = p.z - right.z * half;
          const u = i / WIND_TAIL_LEN;
          const ui = i * 2 * 2;
          uvAttr.array[ui] = u; uvAttr.array[ui + 1] = 0;
          uvAttr.array[ui + 2] = u; uvAttr.array[ui + 3] = 1;
        }
        posAttr.needsUpdate = true;
        uvAttr.needsUpdate = true;
        ribbonGeo.setDrawRange(0, Math.max(0, (n - 1) * 6));
      }
      windLabel.position.copy(windHead.position).add(new THREE.Vector3(0, 0.55, 0));

      const flux = d?.xray.latest_flux ?? null;
      const flareAct = flareActivity(flux);
      const flareCls = flareClass(flux);
      const flareHot = flareAct.label.startsWith('Major') || flareAct.label.startsWith('Moderate');
      const flarePulse = flareHot ? 1 + Math.sin(t * 6) * 0.4 : 1 + Math.sin(t * 1.4) * 0.15;
      const flareCol = flareSeverityColor(flareCls.letter);
      // The arc's feet must stay anchored to the Sun's surface, so only
      // its brightness pulses (not its scale, which would visibly pull
      // the feet away from the photosphere). The peak glow sprite is a
      // separate object, so IT can pulse in size freely for the
      // "energetic burst" look.
      flareArcMat.color.setHex(flareCol);
      flareArcMat.opacity = flareHot ? 0.75 + Math.sin(t * 6) * 0.25 : 0.75 + Math.sin(t * 1.4) * 0.15;
      flareGlowMat.color.setHex(flareCol);
      flarePeakGlow.scale.setScalar(0.7 * flarePulse);
      flareLabel.position.copy(flarePeakGlow.getWorldPosition(flareWorldPos)).add(new THREE.Vector3(0, 0.5, 0));

      const kp = d?.kp.current ?? null;
      if (kp !== null) {
        const tone = kpDescription(kp).tone;
        const color = tone.includes('emerald') ? 0x34d399
          : tone.includes('amber') ? 0xfbbf24
          : tone.includes('orange') ? 0xfb923c
          : tone.includes('red') ? 0xef4444
          : tone.includes('fuchsia') ? 0xe879f9
          : 0x9ca3af;
        auroraRingMat.color.setHex(color);
      }
      auroraRingMat.opacity = 0.4 + Math.sin(t * 2) * 0.15;
      auroraRing.position.copy(earthRuntime.group.position);
      auroraRing.lookAt(camera.position);
      auroraLabel.position.copy(earthRuntime.group.position).add(new THREE.Vector3(0, earthDef.radius * 2.6, 0));

      // ── Camera focus follow/zoom ─────────────────────────────
      if (releaseTimer > 0) {
        releaseTimer -= delta;
        if (releaseTimer <= 0) focus = null; // hand free control back to the user
      }
      if (focus) {
        const targetPos = focus.getPos();
        const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
        const curDist = dir.length() || 1;
        dir.normalize();
        controls.target.lerp(targetPos, 0.08);
        const newDist = THREE.MathUtils.lerp(curDist, focus.distance, 0.07);
        camera.position.copy(controls.target).addScaledVector(dir, newDist);
      }

      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      disposed = true;
      engineRef.current = null;
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      for (const d2 of disposables) d2.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  // Push the current selection into the scene's focus/zoom system.
  useEffect(() => {
    engineRef.current?.setFocus(selected);
  }, [selected]);

  // Redraw the Sun's sunspots when the live active-region count changes
  // (not every render — only the count value itself matters here).
  const activeRegionsCount = data?.sunspots.active_regions_count ?? 0;
  useEffect(() => {
    engineRef.current?.setSunspots(activeRegionsCount);
  }, [activeRegionsCount]);

  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-white/40 font-semibold">
            The solar system, right now
          </div>
          <div className="text-[11px] text-white/50">
            Drag to rotate · scroll or pinch to zoom · tap a planet, moon, ring, or labeled marker to zoom
            in and see details · tap empty space to zoom back out
          </div>
        </div>
        <button
          onClick={() => setFullscreen(true)}
          className="flex-shrink-0 min-h-[38px] text-xs sm:text-[13px] font-medium px-3 py-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-200 hover:text-white transition-colors"
          title="View fullscreen"
        >
          ⛶ Fullscreen
        </button>
      </div>
      <div className="relative w-full" style={{ height: 'min(72vw, 460px)', minHeight: 280 }}>
        <div ref={compactContainerRef} className="absolute inset-0" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm animate-pulse">
            Building the solar system…
          </div>
        )}
        {selected && !fullscreen && (
          <InfoPanel
            selection={selected}
            data={data}
            station={station}
            onClose={() => setSelected(null)}
            onSelect={setSelected}
          />
        )}
      </div>

      {fullscreen && createPortal(
        <div className="fixed inset-0 z-50 bg-[#03040a] flex flex-col">
          <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-white/10 flex-shrink-0">
            <div className="min-w-0">
              <div className="text-sm font-display font-bold text-white">The Solar System</div>
              <div className="text-[11px] text-white/50 truncate">
                Drag to rotate · scroll or pinch to zoom · tap anything for details
              </div>
            </div>
            <button
              onClick={() => setFullscreen(false)}
              className="flex-shrink-0 text-white/60 hover:text-white text-sm w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10"
              aria-label="Exit fullscreen"
            >
              ✕
            </button>
          </div>
          <div className="relative flex-1 min-h-0">
            <div ref={fullscreenContainerRef} className="absolute inset-0" />
            {selected && (
              <InfoPanel
                selection={selected}
                data={data}
                station={station}
                onClose={() => setSelected(null)}
                onSelect={setSelected}
              />
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Info panel ─────────────────────────────────────────────────────

function InfoPanel({
  selection,
  data,
  station,
  onClose,
  onSelect,
}: {
  selection: Selection;
  data: SpaceWeatherSnapshot | null;
  station: WeatherStation | null;
  onClose: () => void;
  onSelect: (sel: Selection) => void;
}) {
  return (
    <div className="absolute right-2 top-2 bottom-2 w-[min(88vw,300px)] bg-black/85 backdrop-blur-md border border-white/15 rounded-lg p-3.5 overflow-y-auto text-white">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-white/40 hover:text-white text-sm w-6 h-6 flex items-center justify-center rounded hover:bg-white/10"
        aria-label="Close and zoom back out"
      >
        ✕
      </button>
      {selection.kind === 'sun' && <SunPanel />}
      {selection.kind === 'planet' && <PlanetPanel id={selection.id} onSelect={onSelect} />}
      {selection.kind === 'moon' && <MoonPanel planetId={selection.planetId} moonName={selection.moonName} />}
      {selection.kind === 'ring' && <RingPanel planetId={selection.planetId} />}
      {selection.kind === 'feature' && <FeaturePanel planetId={selection.planetId} featureId={selection.featureId} />}
      {selection.kind === 'solarwind' && <SolarWindPanel data={data} />}
      {selection.kind === 'flare' && <FlarePanel data={data} />}
      {selection.kind === 'aurora' && <AuroraPanel data={data} station={station} />}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="mb-2">
      <div className="text-[9px] uppercase tracking-wide text-white/40">{label}</div>
      <div className="text-xs text-white/85">{value}</div>
    </div>
  );
}

// Renders a planet/moon's `weather` block in the same visual language
// as the app's real Earth weather (stat tiles + notable-conditions
// list) — but explicitly labeled "Typical conditions," not "Live,"
// since there's no live public data feed for other worlds (see the
// long comment on WeatherReport in solarSystemData.ts for why).
function WeatherReportCard({ weather }: { weather: WeatherReport }) {
  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <div className="text-[9px] uppercase tracking-wide text-white/40 mb-1.5">
        🌡️ Typical conditions — not live, real planetary science
      </div>
      <div className="text-xs font-semibold text-sky-200 mb-2 leading-snug">{weather.headline}</div>
      <div className="space-y-1.5 mb-2.5">
        <div className="bg-white/5 rounded-md px-2 py-1.5">
          <div className="text-[8px] uppercase tracking-wide text-white/35">Temperature</div>
          <div className="text-[11px] text-white/85 leading-snug">{weather.tempRange}</div>
        </div>
        <div className="bg-white/5 rounded-md px-2 py-1.5">
          <div className="text-[8px] uppercase tracking-wide text-white/35">Pressure</div>
          <div className="text-[11px] text-white/85 leading-snug">{weather.pressure}</div>
        </div>
        <div className="bg-white/5 rounded-md px-2 py-1.5">
          <div className="text-[8px] uppercase tracking-wide text-white/35">Wind</div>
          <div className="text-[11px] text-white/85 leading-snug">{weather.wind}</div>
        </div>
      </div>
      {weather.notable.length > 0 && (
        <div>
          <div className="text-[8px] uppercase tracking-wide text-white/35 mb-1">Notable</div>
          <ul className="space-y-1">
            {weather.notable.map((n, i) => (
              <li key={i} className="text-[11px] text-white/65 leading-snug flex gap-1.5">
                <span className="text-white/30 flex-shrink-0">•</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SunPanel() {
  return (
    <div className="pr-5">
      <div className="text-lg font-display font-bold text-amber-300 mb-2">The Sun</div>
      <Fact label="Surface temperature" value={SUN_FACTS.surfaceTempC} />
      <Fact label="Core temperature" value={SUN_FACTS.coreTempC} />
      <Fact label="Rotation" value={SUN_FACTS.dayLength} />
      <Fact label="Composition" value={SUN_FACTS.composition} />
      <p className="text-[11px] text-white/55 leading-relaxed mt-2">{SUN_FACTS.blurb}</p>
    </div>
  );
}

function PlanetPanel({ id, onSelect }: { id: string; onSelect: (sel: Selection) => void }) {
  const p = PLANETS.find((x) => x.id === id);
  if (!p) return null;
  const hasExtras = (p.moons?.length ?? 0) > 0 || (p.features?.length ?? 0) > 0 || p.hasRing;
  return (
    <div className="pr-5">
      <div className="text-lg font-display font-bold text-white mb-2">{p.name}</div>
      <Fact label="Distance from Sun" value={`${p.facts.distanceAU} AU · ${p.facts.distanceKm}`} />
      <Fact label="Day length" value={p.facts.dayLength} />
      <Fact label="Year length" value={p.facts.yearLength} />
      <Fact label="Day-side temp" value={p.facts.dayTempC} />
      <Fact label="Night-side temp" value={p.facts.nightTempC} />
      <Fact label="Atmosphere" value={p.facts.atmosphere} />
      <Fact label="Moons" value={p.facts.moonCount} />
      <p className="text-[11px] text-white/55 leading-relaxed mt-2">{p.facts.blurb}</p>
      <WeatherReportCard weather={p.facts.weather} />
      {hasExtras && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-[9px] uppercase tracking-wide text-white/40 mb-1.5">
            Explore further — tap to zoom in
          </div>
          <div className="flex flex-wrap gap-1.5">
            {p.moons?.map((m) => (
              <button
                key={m.name}
                onClick={() => onSelect({ kind: 'moon', planetId: p.id, moonName: m.name })}
                className="text-[11px] px-2 py-1 rounded-md bg-slate-500/20 hover:bg-slate-500/35 border border-slate-400/30 text-slate-200 transition-colors"
              >
                🌙 {m.name}
              </button>
            ))}
            {p.hasRing && (
              <button
                onClick={() => onSelect({ kind: 'ring', planetId: p.id })}
                className="text-[11px] px-2 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-100 transition-colors"
              >
                💍 Rings
              </button>
            )}
            {p.features?.map((f) => (
              <button
                key={f.id}
                onClick={() => onSelect({ kind: 'feature', planetId: p.id, featureId: f.id })}
                className="text-[11px] px-2 py-1 rounded-md bg-orange-500/15 hover:bg-orange-500/25 border border-orange-400/30 text-orange-200 transition-colors"
              >
                📍 {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MoonPanel({ planetId, moonName }: { planetId: string; moonName: string }) {
  const p = PLANETS.find((x) => x.id === planetId);
  const m = p?.moons?.find((x) => x.name === moonName);
  if (!p || !m) return null;
  return (
    <div className="pr-5">
      <div className="text-[10px] uppercase tracking-wide text-white/35 mb-0.5">Moon of {p.name}</div>
      <div className="text-lg font-display font-bold text-slate-200 mb-2">{m.name}</div>
      <Fact label="Diameter" value={m.facts.diameterKm} />
      <Fact label="Distance from planet" value={m.facts.distanceFromPlanetKm} />
      <Fact label="Orbital period" value={m.facts.orbitalPeriod} />
      <p className="text-[11px] text-white/55 leading-relaxed mt-2">{m.facts.blurb}</p>
      <WeatherReportCard weather={m.facts.weather} />
    </div>
  );
}

const RING_BLURBS: Record<string, string> = {
  saturn:
    "Trillions of chunks of ice and rock, ranging from dust grains to mountain-sized blocks, spread across a disk that's incredibly thin — about 10 meters thick on average despite being over 280,000 km wide. Likely the remains of a shattered moon or comet.",
  uranus:
    "Discovered in 1977 by watching a star flicker as Uranus passed in front of it — the rings themselves are too dark to see directly from Earth. Made of much larger, darker particles than Saturn's icy, bright rings.",
};

function RingPanel({ planetId }: { planetId: string }) {
  const p = PLANETS.find((x) => x.id === planetId);
  if (!p) return null;
  return (
    <div className="pr-5">
      <div className="text-[10px] uppercase tracking-wide text-white/35 mb-0.5">Ring system</div>
      <div className="text-lg font-display font-bold text-amber-100 mb-2">{p.name}'s Rings</div>
      <p className="text-[11px] text-white/55 leading-relaxed">
        {RING_BLURBS[planetId] ?? "A ring system made of countless small icy and rocky particles orbiting the planet."}
      </p>
    </div>
  );
}

function FeaturePanel({ planetId, featureId }: { planetId: string; featureId: string }) {
  const p = PLANETS.find((x) => x.id === planetId);
  const f: PlanetFeature | undefined = p?.features?.find((x) => x.id === featureId);
  if (!p || !f) return null;
  return (
    <div className="pr-5">
      <div className="text-[10px] uppercase tracking-wide text-white/35 mb-0.5">Surface feature on {p.name}</div>
      <div className="text-lg font-display font-bold text-orange-200 mb-2">{f.name}</div>
      <p className="text-[11px] text-white/55 leading-relaxed">{f.blurb}</p>
    </div>
  );
}

function SolarWindPanel({ data }: { data: SpaceWeatherSnapshot | null }) {
  const l = data?.solar_wind.latest;
  const a = solarWindActivity(l?.speed ?? null, l?.bz ?? null);
  return (
    <div className="pr-5">
      <div className="text-lg font-display font-bold text-sky-300 mb-1">Solar Wind — Live</div>
      <div className={`text-sm font-semibold mb-2 ${a.tone}`}>{a.label}</div>
      <Fact label="Speed" value={l?.speed !== null && l?.speed !== undefined ? `${Math.round(l.speed)} km/s` : '—'} />
      <Fact label="Density" value={l?.density !== null && l?.density !== undefined ? `${l.density.toFixed(1)} p/cm³` : '—'} />
      <Fact label="Bz (N/S magnetism)" value={l?.bz !== null && l?.bz !== undefined ? `${l.bz.toFixed(1)} nT` : '—'} />
      <p className="text-[11px] text-white/55 leading-relaxed mt-2">
        The streaking particle is a stylized stand-in for the actual stream of particles flowing from the
        Sun past Earth right now, measured a million miles upwind — its speed here scales with the real
        wind speed. Strongly negative Bz punches holes in Earth's magnetic shield and drives aurora.
      </p>
    </div>
  );
}

function FlarePanel({ data }: { data: SpaceWeatherSnapshot | null }) {
  const flux = data?.xray.latest_flux ?? null;
  const a = flareActivity(flux);
  const cls = flareClass(flux);
  const alerts = data?.alerts ?? [];
  return (
    <div className="pr-5">
      <div className="text-lg font-display font-bold text-red-300 mb-1">Solar Flares — Live</div>
      <div className={`text-sm font-semibold mb-2 ${a.tone}`}>{a.label}</div>
      <Fact label="Current X-ray class" value={cls.letter === '—' ? '—' : `${cls.letter}${cls.magnitude}`} />
      <Fact label="Active NOAA alerts (36h)" value={alerts.length} />
      {alerts.length > 0 && (
        <div className="mt-2 space-y-1">
          {alerts.slice(0, 3).map((al, i) => (
            <div key={i} className="text-[10px] text-white/60 bg-white/5 rounded p-1.5">
              {al.product_id}
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-white/55 leading-relaxed mt-2">
        This loop is a stylized solar prominence, anchored to the Sun's surface — it brightens and pulses
        faster during stronger flare activity, standing in for the actual bursts of X-rays coming off the
        Sun's surface right now.
      </p>
    </div>
  );
}

function AuroraPanel({ data, station }: { data: SpaceWeatherSnapshot | null; station: WeatherStation | null }) {
  const kp = data?.kp.current ?? null;
  const desc = kpDescription(kp);
  return (
    <div className="pr-5">
      <div className="text-lg font-display font-bold text-emerald-300 mb-1">Aurora — Live</div>
      <div className={`text-sm font-semibold mb-2 ${desc.tone}`}>{desc.label}</div>
      <Fact label="Kp index" value={kp === null ? '—' : kp.toFixed(1)} />
      {station?.latitude !== null && station?.latitude !== undefined && (
        <Fact label="Your latitude" value={`${station.latitude.toFixed(1)}°`} />
      )}
      <p className="text-[11px] text-white/55 leading-relaxed mt-2">
        The ring around Earth changes color with the current Kp index — geomagnetic storm strength, the
        main driver of aurora visibility. See the Aurora Forecast Map card below for a precise reading at
        your location.
      </p>
    </div>
  );
}
