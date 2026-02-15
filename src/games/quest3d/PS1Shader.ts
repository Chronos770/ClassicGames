// ═══════════════════════════════════════════════════════════════════
// PS1Shader.ts — PS1-style rendering + procedural canvas textures
// ═══════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ── Render Target (PS1 pixelation) ──────────────────────────────

export function createPS1RenderTarget(width: number, height: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
  });
}

export function createBlitMaterial(renderTarget: THREE.WebGLRenderTarget): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: renderTarget.texture } },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      varying vec2 vUv;
      void main() { gl_FragColor = texture2D(tDiffuse, vUv); }
    `,
    depthTest: false,
    depthWrite: false,
  });
}

export function createBlitQuad(material: THREE.ShaderMaterial): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  return mesh;
}

// ── Flat-color material ─────────────────────────────────────────

export function createPS1Material(color: number | string, options?: {
  emissive?: number;
  opacity?: number;
  side?: THREE.Side;
}): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    color,
    flatShading: true,
    emissive: options?.emissive ?? 0x000000,
    transparent: options?.opacity !== undefined && options.opacity < 1,
    opacity: options?.opacity ?? 1,
    side: options?.side ?? THREE.FrontSide,
  });
}

// ── Canvas texture helpers ──────────────────────────────────────

function canvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xFF, (hex >> 8) & 0xFF, hex & 0xFF];
}

function rgbStr(r: number, g: number, b: number): string {
  return `rgb(${r},${g},${b})`;
}

function varyColor(hex: number, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const v = () => Math.floor((Math.random() - 0.5) * amount * 2);
  return rgbStr(
    Math.max(0, Math.min(255, r + v())),
    Math.max(0, Math.min(255, g + v())),
    Math.max(0, Math.min(255, b + v()))
  );
}

// ── Texture Generators ──────────────────────────────────────────

export function generateBrickTexture(baseColor: number, mortarColor: number = 0x999988): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(64, 64);
  const [mr, mg, mb] = hexToRgb(mortarColor);
  ctx.fillStyle = rgbStr(mr, mg, mb);
  ctx.fillRect(0, 0, 64, 64);

  const brickH = 8, brickW = 16, gap = 1;
  for (let row = 0; row < 8; row++) {
    const offset = (row % 2) * (brickW / 2);
    for (let col = -1; col < 5; col++) {
      const x = col * (brickW + gap) + offset;
      const y = row * (brickH + gap);
      ctx.fillStyle = varyColor(baseColor, 20);
      ctx.fillRect(x + gap, y + gap, brickW - gap, brickH - gap);
      // Highlight top edge
      ctx.fillStyle = varyColor(baseColor, 35);
      ctx.fillRect(x + gap, y + gap, brickW - gap, 1);
      // Shadow bottom edge
      ctx.fillStyle = varyColor(baseColor, -15);
      ctx.fillRect(x + gap, y + brickH - 1, brickW - gap, 1);
    }
  }
  return canvasTexture(c);
}

export function generateStoneTexture(baseColor: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(64, 64);
  const [br, bg, bb] = hexToRgb(baseColor);
  ctx.fillStyle = rgbStr(br, bg, bb);
  ctx.fillRect(0, 0, 64, 64);

  // Irregular stones
  for (let i = 0; i < 18; i++) {
    const x = (i % 4) * 16 + Math.random() * 4;
    const y = Math.floor(i / 4) * 14 + Math.random() * 4;
    const w = 10 + Math.random() * 6;
    const h = 8 + Math.random() * 6;
    ctx.fillStyle = varyColor(baseColor, 22);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = varyColor(baseColor, 35);
    ctx.fillRect(x, y, w, 1);
    ctx.fillStyle = varyColor(baseColor, -18);
    ctx.fillRect(x, y + h - 1, w, 1);
  }

  // Crack lines
  ctx.strokeStyle = varyColor(baseColor, -25);
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    const sx = Math.random() * 64, sy = Math.random() * 64;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (Math.random() - 0.5) * 20, sy + (Math.random() - 0.5) * 20);
    ctx.stroke();
  }
  return canvasTexture(c);
}

export function generateWoodTexture(baseColor: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(32, 64);
  const [br, bg, bb] = hexToRgb(baseColor);
  ctx.fillStyle = rgbStr(br, bg, bb);
  ctx.fillRect(0, 0, 32, 64);

  // Vertical grain
  for (let i = 0; i < 16; i++) {
    ctx.strokeStyle = varyColor(baseColor, 18);
    ctx.lineWidth = 0.5 + Math.random();
    const x = 1 + Math.random() * 30;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y < 64; y += 4) ctx.lineTo(x + (Math.random() - 0.5) * 1.5, y);
    ctx.stroke();
  }

  // Knots
  for (let k = 0; k < 2; k++) {
    if (Math.random() > 0.4) {
      const kx = 6 + Math.random() * 20, ky = 10 + Math.random() * 44;
      ctx.fillStyle = varyColor(baseColor, -25);
      ctx.beginPath();
      ctx.ellipse(kx, ky, 3, 2, Math.random(), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = varyColor(baseColor, -15);
      ctx.beginPath();
      ctx.ellipse(kx, ky, 5, 3.5, Math.random(), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  return canvasTexture(c);
}

export function generateCobblestoneTexture(baseColor: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(64, 64);
  const [br, bg, bb] = hexToRgb(baseColor);
  ctx.fillStyle = rgbStr(Math.max(0, br - 40), Math.max(0, bg - 40), Math.max(0, bb - 40));
  ctx.fillRect(0, 0, 64, 64);

  for (let row = 0; row < 6; row++) {
    const offset = (row % 2) * 5;
    for (let col = 0; col < 6; col++) {
      const x = col * 11 + offset + Math.random() * 2;
      const y = row * 11 + Math.random() * 2;
      const w = 8 + Math.random() * 3, h = 8 + Math.random() * 3;
      ctx.fillStyle = varyColor(baseColor, 22);
      // Rounded corners via path
      const r = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.lineTo(x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.lineTo(x + w - r, y + h); ctx.lineTo(x + r, y + h);
      ctx.lineTo(x, y + h - r); ctx.lineTo(x, y + r); ctx.closePath();
      ctx.fill();
      // Top highlight
      ctx.fillStyle = varyColor(baseColor, 35);
      ctx.fillRect(x + 1, y + 1, w - 2, 1);
    }
  }
  return canvasTexture(c);
}

export function generateRoofTexture(baseColor: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(64, 32);
  const [br, bg, bb] = hexToRgb(baseColor);
  ctx.fillStyle = rgbStr(br, bg, bb);
  ctx.fillRect(0, 0, 64, 32);

  const shH = 6;
  for (let row = 0; row < 6; row++) {
    const offset = (row % 2) * 8;
    const y = row * shH;
    ctx.fillStyle = rgbStr(Math.max(0, br - 25), Math.max(0, bg - 25), Math.max(0, bb - 25));
    ctx.fillRect(0, y, 64, 1);
    for (let col = -1; col < 9; col++) {
      const x = col * 9 + offset;
      ctx.fillStyle = varyColor(baseColor, 15);
      ctx.fillRect(x, y + 1, 8, shH - 1);
      ctx.fillStyle = varyColor(baseColor, 30);
      ctx.fillRect(x + 1, y + 1, 6, 1);
      ctx.fillStyle = varyColor(baseColor, -12);
      ctx.fillRect(x, y + shH - 1, 8, 1);
    }
  }
  return canvasTexture(c);
}

export function generateGrassTexture(baseColor: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(64, 64);
  const [br, bg, bb] = hexToRgb(baseColor);
  ctx.fillStyle = rgbStr(br, bg, bb);
  ctx.fillRect(0, 0, 64, 64);

  for (let i = 0; i < 150; i++) {
    ctx.fillStyle = varyColor(baseColor, 22);
    ctx.fillRect(Math.random() * 64, Math.random() * 64, 1, 2 + Math.random() * 3);
  }
  // Dirt specks
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = varyColor(0x887755, 15);
    ctx.fillRect(Math.random() * 64, Math.random() * 64, 1 + Math.random(), 1 + Math.random());
  }
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = varyColor(baseColor, -18);
    ctx.fillRect(Math.random() * 60, Math.random() * 60, 3 + Math.random() * 5, 3 + Math.random() * 5);
  }
  return canvasTexture(c);
}

export function generateWindowTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(16, 16);
  ctx.fillStyle = '#1a2a3a';
  ctx.fillRect(0, 0, 16, 16);
  // Frame
  ctx.fillStyle = '#666655';
  ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 15, 16, 1);
  ctx.fillRect(0, 0, 1, 16); ctx.fillRect(15, 0, 1, 16);
  // Cross bar
  ctx.fillRect(7, 0, 2, 16); ctx.fillRect(0, 7, 16, 2);
  // Pane highlights
  ctx.fillStyle = 'rgba(100,140,180,0.2)';
  ctx.fillRect(2, 2, 4, 4);
  ctx.fillStyle = 'rgba(80,120,160,0.15)';
  ctx.fillRect(10, 2, 4, 4);
  // Curtain hint (bottom panes slightly lighter)
  ctx.fillStyle = 'rgba(60,40,30,0.3)';
  ctx.fillRect(2, 10, 4, 4);
  ctx.fillRect(10, 10, 4, 4);
  return canvasTexture(c);
}

export function generateDoorTexture(baseColor: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(16, 32);
  const [br, bg, bb] = hexToRgb(baseColor);
  ctx.fillStyle = rgbStr(br, bg, bb);
  ctx.fillRect(0, 0, 16, 32);
  // Planks
  for (const px of [4, 8, 12]) {
    ctx.strokeStyle = rgbStr(Math.max(0, br - 20), Math.max(0, bg - 20), Math.max(0, bb - 20));
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, 32); ctx.stroke();
  }
  // Cross brace
  ctx.strokeStyle = rgbStr(Math.max(0, br - 15), Math.max(0, bg - 15), Math.max(0, bb - 15));
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(1, 10); ctx.lineTo(15, 22); ctx.stroke();
  // Handle
  ctx.fillStyle = '#BBAA44';
  ctx.fillRect(11, 16, 2, 3);
  // Hinge plates
  ctx.fillStyle = '#555555';
  ctx.fillRect(1, 4, 3, 2);
  ctx.fillRect(1, 26, 3, 2);
  // Arch
  ctx.fillStyle = rgbStr(Math.max(0, br - 15), Math.max(0, bg - 15), Math.max(0, bb - 15));
  ctx.fillRect(1, 0, 14, 2);
  return canvasTexture(c);
}

export function generateStripedAwningTexture(color1: number, color2: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(32, 32);
  const [r1, g1, b1] = hexToRgb(color1);
  const [r2, g2, b2] = hexToRgb(color2);
  const stripeW = 4;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? rgbStr(r1, g1, b1) : rgbStr(r2, g2, b2);
    ctx.fillRect(i * stripeW, 0, stripeW, 32);
  }
  // Fringe at bottom
  ctx.fillStyle = rgbStr(Math.max(0, r1 - 30), Math.max(0, g1 - 30), Math.max(0, b1 - 30));
  for (let i = 0; i < 16; i++) {
    ctx.fillRect(i * 2, 28, 1, 4);
  }
  return canvasTexture(c);
}

export function generateSignTexture(text: string, bgColor: number, textColor: string = '#DDCC88'): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(64, 32);
  const [br, bg, bb] = hexToRgb(bgColor);
  // Wood background
  ctx.fillStyle = rgbStr(br, bg, bb);
  ctx.fillRect(0, 0, 64, 32);
  // Grain
  for (let i = 0; i < 8; i++) {
    ctx.strokeStyle = rgbStr(Math.max(0, br - 15), Math.max(0, bg - 15), Math.max(0, bb - 15));
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(Math.random() * 64, 0);
    ctx.lineTo(Math.random() * 64, 32);
    ctx.stroke();
  }
  // Border
  ctx.strokeStyle = '#443322';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 62, 30);
  // Text
  ctx.fillStyle = textColor;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 32, 16);
  return canvasTexture(c);
}

// ── Textured material factory ───────────────────────────────────

export function createTexturedMaterial(
  texture: THREE.CanvasTexture,
  repeatX: number = 1,
  repeatY: number = 1,
  options?: { emissive?: number; opacity?: number; side?: THREE.Side }
): THREE.MeshLambertMaterial {
  texture.repeat.set(repeatX, repeatY);
  return new THREE.MeshLambertMaterial({
    map: texture,
    flatShading: true,
    emissive: options?.emissive ?? 0x000000,
    transparent: options?.opacity !== undefined && options.opacity < 1,
    opacity: options?.opacity ?? 1,
    side: options?.side ?? THREE.FrontSide,
  });
}

// ── Texture cache ───────────────────────────────────────────────

const _cache: Record<string, THREE.CanvasTexture> = {};

export function getCachedTexture(key: string, generator: () => THREE.CanvasTexture): THREE.CanvasTexture {
  if (!_cache[key]) _cache[key] = generator();
  return _cache[key];
}
