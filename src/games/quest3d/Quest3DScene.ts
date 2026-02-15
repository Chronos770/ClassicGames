// ═══════════════════════════════════════════════════════════════════
// Quest3DScene.ts — Procedural low-poly town with canvas textures
// ═══════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import {
  createPS1Material,
  createTexturedMaterial,
  getCachedTexture,
  generateBrickTexture,
  generateStoneTexture,
  generateWoodTexture,
  generateCobblestoneTexture,
  generateRoofTexture,
  generateGrassTexture,
  generateWindowTexture,
  generateDoorTexture,
  generateStripedAwningTexture,
  generateSignTexture,
} from './PS1Shader';

// ── Color Palettes ───────────────────────────────────────────────
const C = {
  grass: 0x4A7A3D,
  path: 0xB8A07A,
  pathEdge: 0x9A8866,
  stoneGray: 0x8A8A80,
  warmBeige: 0xC8B090,
  dustyRose: 0xB88888,
  paleBlue: 0x8899AA,
  cream: 0xD4C8A8,
  terracotta: 0xB06644,
  roofDark: 0x664433,
  roofRed: 0x884433,
  roofBlue: 0x445566,
  doorBrown: 0x6B4226,
  trunkBrown: 0x6B4226,
  foliageGreen1: 0x3D7A2D,
  foliageGreen2: 0x558844,
  foliageGreen3: 0x2D5A1D,
  water: 0x5588AA,
  barrelBrown: 0x7A5230,
  crateTan: 0xAA8855,
  lampYellow: 0xFFDD66,
  fountainStone: 0x999999,
};

// ── Texture-backed material helpers (cached) ────────────────────

function wallMat(color: number): THREE.MeshLambertMaterial {
  const tex = getCachedTexture(`brick_${color}`, () => generateBrickTexture(color));
  return createTexturedMaterial(tex, 2, 2);
}

function stoneMat(color: number): THREE.MeshLambertMaterial {
  const tex = getCachedTexture(`stone_${color}`, () => generateStoneTexture(color));
  return createTexturedMaterial(tex, 1, 1);
}

function roofMat(color: number): THREE.MeshLambertMaterial {
  const tex = getCachedTexture(`roof_${color}`, () => generateRoofTexture(color));
  return createTexturedMaterial(tex, 2, 1);
}

function woodMat(color: number): THREE.MeshLambertMaterial {
  const tex = getCachedTexture(`wood_${color}`, () => generateWoodTexture(color));
  return createTexturedMaterial(tex, 1, 2);
}

function windowMat(): THREE.MeshLambertMaterial {
  const tex = getCachedTexture('window', () => generateWindowTexture());
  return createTexturedMaterial(tex, 1, 1);
}

function doorMat(): THREE.MeshLambertMaterial {
  const tex = getCachedTexture('door', () => generateDoorTexture(C.doorBrown));
  return createTexturedMaterial(tex, 1, 1);
}

// ── Geometry helpers ────────────────────────────────────────────

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function boxC(w: number, h: number, d: number, color: number, x: number, y: number, z: number): THREE.Mesh {
  return box(w, h, d, createPS1Material(color), x, y, z);
}

function cylinder(rTop: number, rBot: number, h: number, segs: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function cylC(rTop: number, rBot: number, h: number, segs: number, color: number, x: number, y: number, z: number): THREE.Mesh {
  return cylinder(rTop, rBot, h, segs, createPS1Material(color), x, y, z);
}

// ── Peaked Roof Geometry ────────────────────────────────────────

function createPeakedRoofGeo(w: number, d: number, peak: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, peak);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
}

// ── Building Generator ───────────────────────────────────────────
interface BuildingDef {
  x: number; z: number;
  w: number; d: number; h: number;
  wallColor: number; roofColor: number;
  rotation?: number;
  hasDoor?: boolean;
  hasChimney?: boolean;
  signText?: string;
}

function buildBuilding(def: BuildingDef, parent: THREE.Group): void {
  const { x, z, w, d, h, wallColor, roofColor, rotation = 0, hasDoor = true, hasChimney = false, signText } = def;
  const bGroup = new THREE.Group();

  // Walls (textured brick)
  bGroup.add(box(w, h, d, wallMat(wallColor), 0, h / 2, 0));

  // Foundation strip (stone texture at base)
  bGroup.add(box(w + 0.05, 0.3, d + 0.05, stoneMat(0x666660), 0, 0.15, 0));

  // ── Peaked roof (triangular cross-section, ridge along Z) ──
  const peakH = w * 0.4; // roof peak proportional to building width
  const roofGeo = createPeakedRoofGeo(w + 0.3, d + 0.3, peakH);
  const roofMesh = new THREE.Mesh(roofGeo, roofMat(roofColor));
  roofMesh.position.set(0, h, -(d + 0.3) / 2);
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  bGroup.add(roofMesh);

  // Ridge cap detail along the top of the peaked roof
  bGroup.add(boxC(0.12, 0.08, d + 0.35, roofColor, 0, h + peakH + 0.02, 0));

  // ── Chimney ──
  if (hasChimney) {
    const chimneyX = w * 0.25;
    const chimneyBaseY = h + peakH * 0.4;
    const chimneyH = peakH * 0.8 + 0.6;
    // Brick stack
    const chimneyMat = wallMat(0x885544);
    bGroup.add(box(0.35, chimneyH, 0.35, chimneyMat, chimneyX, chimneyBaseY + chimneyH / 2, 0));
    // Cap ring
    bGroup.add(boxC(0.42, 0.08, 0.42, 0x554433, chimneyX, chimneyBaseY + chimneyH + 0.04, 0));
    // Dark inner top (soot)
    const sootCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.06, 6),
      createPS1Material(0x222222)
    );
    sootCyl.position.set(chimneyX, chimneyBaseY + chimneyH + 0.11, 0);
    bGroup.add(sootCyl);
  }

  // Door (textured wood)
  if (hasDoor) {
    const doorH = 1.2;
    bGroup.add(box(0.6, doorH, 0.1, doorMat(), 0, doorH / 2, d / 2 + 0.05));
    // Door frame
    bGroup.add(boxC(0.08, doorH + 0.1, 0.12, 0x554433, -0.34, doorH / 2, d / 2 + 0.06));
    bGroup.add(boxC(0.08, doorH + 0.1, 0.12, 0x554433, 0.34, doorH / 2, d / 2 + 0.06));
    bGroup.add(boxC(0.76, 0.08, 0.12, 0x554433, 0, doorH + 0.04, d / 2 + 0.06));
    // Step
    bGroup.add(boxC(0.8, 0.08, 0.2, 0x888880, 0, 0.04, d / 2 + 0.15));
  }

  // Windows (front face, textured)
  const windowY = h * 0.6;
  const wMat = windowMat();
  const shutterMat = woodMat(0x556644);

  if (w > 2.5) {
    // Left window
    bGroup.add(box(0.45, 0.5, 0.1, wMat, -w * 0.25, windowY, d / 2 + 0.05));
    // Right window
    bGroup.add(box(0.45, 0.5, 0.1, wMat, w * 0.25, windowY, d / 2 + 0.05));
    // Window sills
    bGroup.add(boxC(0.55, 0.05, 0.15, 0x888880, -w * 0.25, windowY - 0.27, d / 2 + 0.08));
    bGroup.add(boxC(0.55, 0.05, 0.15, 0x888880, w * 0.25, windowY - 0.27, d / 2 + 0.08));

    // ── Window shutters (left window) ──
    const lShutterL = box(0.12, 0.52, 0.04, shutterMat, -w * 0.25 - 0.28, windowY, d / 2 + 0.08);
    lShutterL.rotation.y = 0.3;
    bGroup.add(lShutterL);
    const lShutterR = box(0.12, 0.52, 0.04, shutterMat, -w * 0.25 + 0.28, windowY, d / 2 + 0.08);
    lShutterR.rotation.y = -0.3;
    bGroup.add(lShutterR);

    // ── Window shutters (right window) ──
    const rShutterL = box(0.12, 0.52, 0.04, shutterMat, w * 0.25 - 0.28, windowY, d / 2 + 0.08);
    rShutterL.rotation.y = 0.3;
    bGroup.add(rShutterL);
    const rShutterR = box(0.12, 0.52, 0.04, shutterMat, w * 0.25 + 0.28, windowY, d / 2 + 0.08);
    rShutterR.rotation.y = -0.3;
    bGroup.add(rShutterR);

    // ── Flower boxes (below left window) ──
    buildFlowerBox(bGroup, -w * 0.25, windowY - 0.38, d / 2 + 0.12);
    // ── Flower boxes (below right window) ──
    buildFlowerBox(bGroup, w * 0.25, windowY - 0.38, d / 2 + 0.12);
  } else {
    bGroup.add(box(0.45, 0.5, 0.1, wMat, 0, windowY, d / 2 + 0.05));
    bGroup.add(boxC(0.55, 0.05, 0.15, 0x888880, 0, windowY - 0.27, d / 2 + 0.08));

    // ── Window shutters (single window) ──
    const sShutterL = box(0.12, 0.52, 0.04, shutterMat, -0.28, windowY, d / 2 + 0.08);
    sShutterL.rotation.y = 0.3;
    bGroup.add(sShutterL);
    const sShutterR = box(0.12, 0.52, 0.04, shutterMat, 0.28, windowY, d / 2 + 0.08);
    sShutterR.rotation.y = -0.3;
    bGroup.add(sShutterR);

    // ── Flower box (below single window) ──
    buildFlowerBox(bGroup, 0, windowY - 0.38, d / 2 + 0.12);
  }

  // Side windows
  if (d > 2) {
    bGroup.add(box(0.1, 0.45, 0.45, wMat, w / 2 + 0.05, windowY, 0));
    bGroup.add(box(0.1, 0.45, 0.45, wMat, -w / 2 - 0.05, windowY, 0));
  }

  // Second floor windows on taller buildings
  if (h > 4.5) {
    const w2Y = h * 0.85;
    if (w > 2.5) {
      bGroup.add(box(0.4, 0.4, 0.1, wMat, -w * 0.25, w2Y, d / 2 + 0.05));
      bGroup.add(box(0.4, 0.4, 0.1, wMat, w * 0.25, w2Y, d / 2 + 0.05));
    } else {
      bGroup.add(box(0.4, 0.4, 0.1, wMat, 0, w2Y, d / 2 + 0.05));
    }
  }

  // ── Hanging sign ──
  if (signText) {
    const signTex = getCachedTexture(`sign_${signText}`, () => generateSignTexture(signText, 0x5A3A1A));
    const signMat = createTexturedMaterial(signTex, 1, 1);
    // Arm bracket extending from building front
    const armX = w * 0.35;
    bGroup.add(boxC(0.04, 0.04, 0.5, 0x444444, armX, h * 0.7, d / 2 + 0.3));
    // Vertical hanger wires
    bGroup.add(boxC(0.02, 0.15, 0.02, 0x444444, armX - 0.15, h * 0.7 - 0.1, d / 2 + 0.55));
    bGroup.add(boxC(0.02, 0.15, 0.02, 0x444444, armX + 0.15, h * 0.7 - 0.1, d / 2 + 0.55));
    // Sign board
    const signBoard = box(0.5, 0.25, 0.04, signMat, armX, h * 0.7 - 0.25, d / 2 + 0.55);
    bGroup.add(signBoard);
  }

  bGroup.position.set(x, 0, z);
  bGroup.rotation.y = rotation;
  parent.add(bGroup);
}

// ── Flower Box Helper ──────────────────────────────────────────
function buildFlowerBox(parent: THREE.Group, x: number, y: number, z: number): void {
  // Box container (dark wood)
  parent.add(box(0.5, 0.1, 0.12, woodMat(0x553322), x, y, z));
  // Tiny flowers in the box
  const flowerColors = [0xFF88AA, 0xFFDD44, 0xFF4444, 0xFF99CC, 0xFFAA33];
  for (let i = 0; i < 5; i++) {
    const fx = x - 0.18 + i * 0.09;
    const fy = y + 0.08;
    const fz = z;
    const color = flowerColors[i % flowerColors.length];
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 4, 3),
      createPS1Material(color)
    );
    flower.position.set(fx, fy, fz);
    parent.add(flower);
    // Tiny green stem
    parent.add(boxC(0.01, 0.06, 0.01, 0x337722, fx, fy - 0.03, fz));
  }
}

// ── Building Definitions ────────────────────────────────────────
const BUILDINGS: BuildingDef[] = [
  // North row
  { x: -7, z: -7, w: 3.5, d: 3, h: 4, wallColor: C.stoneGray, roofColor: C.roofDark, hasChimney: true, signText: 'INN' },
  { x: -2, z: -8, w: 4, d: 3, h: 5, wallColor: C.warmBeige, roofColor: C.roofRed, hasChimney: true },
  { x: 5, z: -7, w: 2.5, d: 2.5, h: 3.5, wallColor: C.paleBlue, roofColor: C.roofBlue, signText: 'CHAPEL' },
  // East side
  { x: 8, z: -3, w: 3, d: 2.5, h: 7, wallColor: C.stoneGray, roofColor: C.roofDark, rotation: Math.PI * 0.5, hasChimney: true },
  { x: 7, z: 4, w: 3.5, d: 3, h: 4.5, wallColor: C.terracotta, roofColor: C.roofRed, rotation: Math.PI * 0.5 },
  // West side
  { x: -8, z: -2, w: 2.5, d: 3, h: 3.5, wallColor: C.cream, roofColor: C.roofBlue, rotation: -Math.PI * 0.5, signText: 'SMITHY' },
  { x: -7, z: 5, w: 3, d: 2.5, h: 4, wallColor: C.dustyRose, roofColor: C.roofDark, rotation: -Math.PI * 0.5, hasChimney: true },
  // South
  { x: -3, z: 8, w: 3, d: 3, h: 5.5, wallColor: C.warmBeige, roofColor: C.roofRed, rotation: Math.PI, hasChimney: true },
  { x: 3, z: 9, w: 2.5, d: 2.5, h: 3, wallColor: C.paleBlue, roofColor: C.roofBlue, rotation: Math.PI },
  // Interior / scattered
  { x: -4, z: -3, w: 2, d: 2, h: 3, wallColor: C.dustyRose, roofColor: C.roofDark },
  { x: 4, z: 6, w: 2, d: 2, h: 3.5, wallColor: C.cream, roofColor: C.roofRed },
  { x: -5, z: 9, w: 3, d: 2.5, h: 4, wallColor: C.stoneGray, roofColor: C.roofBlue, rotation: Math.PI },
];

// ── Tree Generator ──────────────────────────────────────────────
function buildTree(x: number, z: number, parent: THREE.Group, variant: number = 0): void {
  const trunkH = 1.2 + Math.random() * 0.5;
  parent.add(cylinder(0.15, 0.2, trunkH, 5, woodMat(C.trunkBrown), x, trunkH / 2, z));

  const foliageColors = [C.foliageGreen1, C.foliageGreen2, C.foliageGreen3];
  const color = foliageColors[variant % 3];
  const foliageY = trunkH + 0.8;

  if (variant % 3 === 0) {
    // Cone tree (pine)
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.2, 6), createPS1Material(color));
    cone.position.set(x, foliageY, z);
    cone.castShadow = true;
    parent.add(cone);
    // Second smaller cone on top
    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.4, 6), createPS1Material(color + 0x111100));
    cone2.position.set(x, foliageY + 1.2, z);
    cone2.castShadow = true;
    parent.add(cone2);
  } else if (variant % 3 === 1) {
    // Round tree (deciduous)
    const sph = new THREE.Mesh(new THREE.SphereGeometry(1.1, 5, 4), createPS1Material(color));
    sph.position.set(x, foliageY, z);
    sph.castShadow = true;
    parent.add(sph);
  } else {
    // Multi-ball tree
    for (let i = 0; i < 3; i++) {
      const r = 0.6 + Math.random() * 0.3;
      const dx = (Math.random() - 0.5) * 0.8;
      const dz = (Math.random() - 0.5) * 0.8;
      const sph = new THREE.Mesh(new THREE.SphereGeometry(r, 5, 4), createPS1Material(color));
      sph.position.set(x + dx, foliageY + i * 0.3, z + dz);
      sph.castShadow = true;
      parent.add(sph);
    }
  }
}

const TREE_POSITIONS: [number, number][] = [
  [-10, -10], [-11, -4], [-10, 3], [-11, 8],
  [10, -9], [11, -2], [10, 7], [11, 10],
  [-3, -12], [4, -11],
];

// ── Fountain ────────────────────────────────────────────────────
function buildFountain(parent: THREE.Group): void {
  const fGroup = new THREE.Group();
  const sMat = stoneMat(C.fountainStone);

  // Base pool
  fGroup.add(cylinder(1.8, 2, 0.6, 8, sMat, 0, 0.3, 0));

  // Water (animated in page via userData)
  const waterGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.15, 8);
  const water = new THREE.Mesh(waterGeo, createPS1Material(C.water, { opacity: 0.8 }));
  water.position.y = 0.55;
  fGroup.add(water);

  // Center pillar
  fGroup.add(cylinder(0.3, 0.35, 2, 6, sMat, 0, 1.6, 0));

  // Decorative rings on pillar
  fGroup.add(cylinder(0.38, 0.38, 0.08, 8, stoneMat(0x888888), 0, 0.8, 0));
  fGroup.add(cylinder(0.38, 0.38, 0.08, 8, stoneMat(0x888888), 0, 1.8, 0));

  // Top bowl
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.5, 0.4, 6), sMat);
  top.position.y = 2.8;
  fGroup.add(top);

  // Finial
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.2, 5, 4), stoneMat(0xAAAAAA));
  finial.position.y = 3.2;
  fGroup.add(finial);

  parent.add(fGroup);
}

// ── Market Stalls (with striped awnings) ────────────────────────
function buildMarketStall(x: number, z: number, awningColor: number, rotation: number, parent: THREE.Group): void {
  const sGroup = new THREE.Group();
  const wMat = woodMat(C.crateTan);

  // Counter (wood texture)
  sGroup.add(box(2, 0.9, 1, wMat, 0, 0.45, 0));

  // Posts (wood texture)
  const pMat = woodMat(C.trunkBrown);
  sGroup.add(box(0.12, 1.8, 0.12, pMat, -0.9, 0.9, -0.4));
  sGroup.add(box(0.12, 1.8, 0.12, pMat, 0.9, 0.9, -0.4));
  sGroup.add(box(0.12, 1.5, 0.12, pMat, -0.9, 0.75, 0.4));
  sGroup.add(box(0.12, 1.5, 0.12, pMat, 0.9, 0.75, 0.4));

  // ── Striped awning (textured instead of flat color) ──
  const awningTex = getCachedTexture(`awning_${awningColor}`, () =>
    generateStripedAwningTexture(awningColor, 0xFFFFEE)
  );
  const awningMat = createTexturedMaterial(awningTex, 2, 1);
  const awning = box(2.2, 0.08, 1.3, awningMat, 0, 1.75, -0.05);
  awning.rotation.x = 0.15;
  sGroup.add(awning);

  // Goods on counter (small colored boxes)
  const goodColors = [0xCC4444, 0x44AA44, 0xAAAA44, 0x8866CC];
  for (let i = 0; i < 4; i++) {
    const g = boxC(0.2, 0.15, 0.2, goodColors[i], -0.6 + i * 0.4, 1.0, 0);
    sGroup.add(g);
  }

  sGroup.position.set(x, 0, z);
  sGroup.rotation.y = rotation;
  parent.add(sGroup);
}

// ── Props ───────────────────────────────────────────────────────
function buildBarrelCluster(x: number, z: number, parent: THREE.Group): void {
  const bMat = woodMat(C.barrelBrown);
  parent.add(cylinder(0.35, 0.35, 0.8, 6, bMat, x, 0.4, z));
  parent.add(cylinder(0.35, 0.35, 0.8, 6, bMat, x + 0.6, 0.4, z + 0.2));
  parent.add(cylinder(0.35, 0.35, 0.8, 6, bMat, x + 0.25, 1.15, z + 0.1));
  // Metal bands
  const bandMat = createPS1Material(0x555555);
  for (const bx of [x, x + 0.6]) {
    const bz = bx === x ? z : z + 0.2;
    parent.add(cylinder(0.37, 0.37, 0.04, 8, bandMat, bx, 0.25, bz));
    parent.add(cylinder(0.37, 0.37, 0.04, 8, bandMat, bx, 0.55, bz));
  }
}

function buildCrateStack(x: number, z: number, parent: THREE.Group): void {
  const cMat = woodMat(C.crateTan);
  parent.add(box(0.7, 0.7, 0.7, cMat, x, 0.35, z));
  parent.add(box(0.6, 0.6, 0.6, cMat, x + 0.1, 1.0, z - 0.05));
  // Cross braces on crates
  parent.add(boxC(0.02, 0.5, 0.5, 0x886644, x, 0.35, z + 0.36));
  parent.add(boxC(0.5, 0.02, 0.02, 0x886644, x, 0.35, z + 0.36));
}

function buildLampPost(x: number, z: number, parent: THREE.Group): void {
  // Pole (metal)
  parent.add(cylC(0.06, 0.08, 2.5, 5, 0x444444, x, 1.25, z));
  // Base plate
  parent.add(cylC(0.2, 0.2, 0.06, 6, 0x444444, x, 0.03, z));
  // Arm
  parent.add(boxC(0.04, 0.04, 0.3, 0x444444, x, 2.45, z + 0.15));
  // Lantern housing
  parent.add(boxC(0.18, 0.25, 0.18, 0x333333, x, 2.5, z + 0.3));
  // Lantern glow
  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 5, 4),
    createPS1Material(C.lampYellow, { emissive: 0x886622 })
  );
  lantern.position.set(x, 2.5, z + 0.3);
  parent.add(lantern);

  // ── Point light at lantern ──
  const light = new THREE.PointLight(0xFFDD88, 0.4, 5);
  light.position.set(x, 2.5, z + 0.3);
  parent.add(light);
}

// ── Benches ─────────────────────────────────────────────────────
function buildBench(x: number, z: number, rotation: number, parent: THREE.Group): void {
  const bGroup = new THREE.Group();
  const wMat = woodMat(0x664422);

  // Seat
  bGroup.add(box(1.2, 0.06, 0.35, wMat, 0, 0.45, 0));
  // Back rest
  bGroup.add(box(1.2, 0.4, 0.06, wMat, 0, 0.72, -0.15));
  // Legs (iron)
  const legMat = createPS1Material(0x444444);
  bGroup.add(box(0.06, 0.45, 0.3, legMat, -0.5, 0.22, 0));
  bGroup.add(box(0.06, 0.45, 0.3, legMat, 0.5, 0.22, 0));

  bGroup.position.set(x, 0, z);
  bGroup.rotation.y = rotation;
  parent.add(bGroup);
}

// ── Town Square Border ──────────────────────────────────────────
function buildSquareBorder(parent: THREE.Group): void {
  const r = 4;
  const segs = 12;
  const sMat = stoneMat(C.fountainStone);
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const a2 = ((i + 1) / segs) * Math.PI * 2;
    const dir = ((a + a2) / 2) % (Math.PI * 2);
    const isOpening = (
      (dir > -0.3 && dir < 0.3) ||
      (dir > Math.PI * 0.5 - 0.35 && dir < Math.PI * 0.5 + 0.35) ||
      (dir > Math.PI - 0.3 && dir < Math.PI + 0.3) ||
      (dir > Math.PI * 1.5 - 0.35 && dir < Math.PI * 1.5 + 0.35)
    );
    if (isOpening) continue;

    const cx = Math.cos((a + a2) / 2) * r;
    const cz = Math.sin((a + a2) / 2) * r;
    const wallSeg = box(1.5, 0.5, 0.3, sMat, cx, 0.25, cz);
    wallSeg.rotation.y = -(a + a2) / 2 + Math.PI / 2;
    parent.add(wallSeg);
  }
}

// ── Well ────────────────────────────────────────────────────────
function buildWell(x: number, z: number, parent: THREE.Group): void {
  const wGroup = new THREE.Group();
  const sMat = stoneMat(0x888888);

  // Stone base (ring)
  wGroup.add(cylinder(0.7, 0.8, 0.6, 8, sMat, 0, 0.3, 0));
  // Inner dark (water)
  wGroup.add(cylinder(0.55, 0.55, 0.1, 8, createPS1Material(0x112233), 0, 0.55, 0));
  // Posts
  const pMat = woodMat(C.trunkBrown);
  wGroup.add(box(0.08, 1.4, 0.08, pMat, -0.55, 1.0, 0));
  wGroup.add(box(0.08, 1.4, 0.08, pMat, 0.55, 1.0, 0));
  // Cross beam
  wGroup.add(box(1.3, 0.08, 0.08, pMat, 0, 1.7, 0));
  // Roof (tiny)
  wGroup.add(box(1.4, 0.06, 0.8, roofMat(C.roofDark), 0, 1.8, 0));
  // Bucket
  wGroup.add(boxC(0.15, 0.15, 0.12, 0x664422, 0, 0.9, 0));
  // Rope
  wGroup.add(boxC(0.02, 0.8, 0.02, 0xAA9966, 0, 1.3, 0));

  wGroup.position.set(x, 0, z);
  parent.add(wGroup);
}

// ── Fence Sections ──────────────────────────────────────────────
function buildFence(
  x: number, z: number,
  length: number, rotation: number,
  parent: THREE.Group
): void {
  const fGroup = new THREE.Group();
  const postMat = woodMat(0x664422);
  const railMat = woodMat(0x775533);
  const postCount = Math.max(2, Math.floor(length / 0.8) + 1);
  const spacing = length / (postCount - 1);

  for (let i = 0; i < postCount; i++) {
    const px = -length / 2 + i * spacing;
    // Post
    fGroup.add(box(0.06, 0.7, 0.06, postMat, px, 0.35, 0));
    // Post cap (pointed)
    fGroup.add(boxC(0.04, 0.08, 0.04, 0x554433, px, 0.74, 0));
  }
  // Top rail
  fGroup.add(box(length, 0.04, 0.04, railMat, 0, 0.6, 0));
  // Bottom rail
  fGroup.add(box(length, 0.04, 0.04, railMat, 0, 0.25, 0));

  fGroup.position.set(x, 0, z);
  fGroup.rotation.y = rotation;
  parent.add(fGroup);
}

// ── Wagon/Cart ──────────────────────────────────────────────────
function buildWagon(x: number, z: number, rotation: number, parent: THREE.Group): void {
  const wGroup = new THREE.Group();
  const bedMat = woodMat(0x886644);
  const sideMat = woodMat(0x775533);

  // Bed (flat platform)
  wGroup.add(box(1.8, 0.1, 1.0, bedMat, 0, 0.5, 0));

  // Side walls
  wGroup.add(box(1.8, 0.3, 0.06, sideMat, 0, 0.7, 0.47));
  wGroup.add(box(1.8, 0.3, 0.06, sideMat, 0, 0.7, -0.47));
  // Front wall
  wGroup.add(box(0.06, 0.3, 1.0, sideMat, 0.87, 0.7, 0));
  // Back is open

  // Axles
  wGroup.add(boxC(0.06, 0.06, 1.2, 0x444444, -0.6, 0.3, 0));
  wGroup.add(boxC(0.06, 0.06, 1.2, 0x444444, 0.6, 0.3, 0));

  // 4 wheels (cylinders rotated sideways)
  const wheelMat = woodMat(0x553322);
  const wheelPositions: [number, number][] = [[-0.6, -0.6], [-0.6, 0.6], [0.6, -0.6], [0.6, 0.6]];
  for (const [wx, wz] of wheelPositions) {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.08, 8),
      wheelMat
    );
    wheel.position.set(wx, 0.25, wz);
    wheel.rotation.x = Math.PI / 2;
    wheel.castShadow = true;
    wGroup.add(wheel);
    // Hub
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.1, 6),
      createPS1Material(0x444444)
    );
    hub.position.set(wx, 0.25, wz);
    hub.rotation.x = Math.PI / 2;
    wGroup.add(hub);
  }

  // Handle/tongue (pull bar)
  wGroup.add(box(0.8, 0.04, 0.04, sideMat, -1.3, 0.45, -0.15));
  wGroup.add(box(0.8, 0.04, 0.04, sideMat, -1.3, 0.45, 0.15));

  // Some cargo in the wagon
  wGroup.add(boxC(0.3, 0.25, 0.3, 0xAA8844, 0.3, 0.72, 0));
  wGroup.add(boxC(0.25, 0.2, 0.25, 0x996633, -0.2, 0.65, 0.15));

  wGroup.position.set(x, 0, z);
  wGroup.rotation.y = rotation;
  parent.add(wGroup);
}

// ── Signpost at Crossroads ──────────────────────────────────────
function buildSignpost(x: number, z: number, parent: THREE.Group): void {
  const sGroup = new THREE.Group();
  const postMat = woodMat(0x664422);

  // Vertical post
  sGroup.add(box(0.1, 2.4, 0.1, postMat, 0, 1.2, 0));
  // Post base stone
  sGroup.add(cylinder(0.2, 0.22, 0.15, 6, stoneMat(0x777777), 0, 0.075, 0));

  // Arm signs pointing different directions
  const armDefs: { text: string; rotY: number; y: number }[] = [
    { text: 'MARKET', rotY: 0.3, y: 2.1 },
    { text: 'CHAPEL', rotY: -0.8, y: 1.8 },
    { text: 'WELL', rotY: 2.0, y: 1.5 },
  ];

  for (const arm of armDefs) {
    const armGroup = new THREE.Group();

    // Arm board
    const armTex = getCachedTexture(`signpost_${arm.text}`, () => generateSignTexture(arm.text, 0x5A3A1A));
    const armMat = createTexturedMaterial(armTex, 1, 1);
    const armMesh = box(0.7, 0.18, 0.04, armMat, 0.4, 0, 0);
    armGroup.add(armMesh);

    // Pointed end
    const point = boxC(0.06, 0.12, 0.04, 0x5A3A1A, 0.78, 0, 0);
    armGroup.add(point);

    armGroup.position.set(0, arm.y, 0);
    armGroup.rotation.y = arm.rotY;
    sGroup.add(armGroup);
  }

  // Top cap
  sGroup.add(boxC(0.14, 0.08, 0.14, 0x554433, 0, 2.44, 0));

  sGroup.position.set(x, 0, z);
  parent.add(sGroup);
}

// ── Birds on Rooftops ───────────────────────────────────────────
function buildBird(x: number, y: number, z: number, facingAngle: number, parent: THREE.Group): void {
  const birdGroup = new THREE.Group();
  const bodyColor = 0x443333;
  const wingColor = 0x554444;

  // Body (small sphere)
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 4, 3),
    createPS1Material(bodyColor)
  );
  body.position.set(0, 0, 0);
  birdGroup.add(body);

  // Head (smaller sphere)
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 4, 3),
    createPS1Material(bodyColor)
  );
  head.position.set(0.06, 0.03, 0);
  birdGroup.add(head);

  // Beak (tiny cone)
  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.015, 0.04, 3),
    createPS1Material(0xCC8833)
  );
  beak.position.set(0.1, 0.03, 0);
  beak.rotation.z = -Math.PI / 2;
  birdGroup.add(beak);

  // Left wing (thin angled box)
  const leftWing = boxC(0.04, 0.01, 0.08, wingColor, -0.01, 0.02, -0.05);
  leftWing.rotation.x = -0.2;
  birdGroup.add(leftWing);

  // Right wing
  const rightWing = boxC(0.04, 0.01, 0.08, wingColor, -0.01, 0.02, 0.05);
  rightWing.rotation.x = 0.2;
  birdGroup.add(rightWing);

  // Tail (thin box)
  const tail = boxC(0.06, 0.01, 0.03, bodyColor, -0.08, 0.01, 0);
  tail.rotation.z = 0.2;
  birdGroup.add(tail);

  birdGroup.position.set(x, y, z);
  birdGroup.rotation.y = facingAngle;
  parent.add(birdGroup);
}

// ── Garden / Flower Patches ─────────────────────────────────────
function buildGardenPatch(x: number, z: number, parent: THREE.Group): void {
  const gGroup = new THREE.Group();

  // Green ground patch
  gGroup.add(box(1.2, 0.05, 1.0, createPS1Material(0x3A6A2A), 0, 0.025, 0));

  // Border stones
  const sMat = stoneMat(0x888877);
  for (let i = -3; i <= 3; i++) {
    gGroup.add(box(0.15, 0.08, 0.08, sMat, i * 0.17, 0.06, 0.5));
    gGroup.add(box(0.15, 0.08, 0.08, sMat, i * 0.17, 0.06, -0.5));
  }
  for (let i = -2; i <= 2; i++) {
    gGroup.add(box(0.08, 0.08, 0.15, sMat, 0.6, 0.06, i * 0.2));
    gGroup.add(box(0.08, 0.08, 0.15, sMat, -0.6, 0.06, i * 0.2));
  }

  // Scattered flowers (cones and spheres)
  const flowerColors = [0xFF6699, 0xFFDD44, 0xFF4444, 0xCC66FF, 0xFFAA33, 0xFF88CC];
  for (let i = 0; i < 12; i++) {
    const fx = (Math.random() - 0.5) * 1.0;
    const fz = (Math.random() - 0.5) * 0.8;
    const color = flowerColors[i % flowerColors.length];

    // Stem
    gGroup.add(boxC(0.01, 0.12, 0.01, 0x337722, fx, 0.11, fz));

    if (i % 3 === 0) {
      // Cone flower (tulip-like)
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.035, 0.06, 4),
        createPS1Material(color)
      );
      cone.position.set(fx, 0.2, fz);
      gGroup.add(cone);
    } else {
      // Sphere flower (round bloom)
      const bloom = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 4, 3),
        createPS1Material(color)
      );
      bloom.position.set(fx, 0.19, fz);
      gGroup.add(bloom);
    }
  }

  gGroup.position.set(x, 0, z);
  parent.add(gGroup);
}

// ── Main Builder ────────────────────────────────────────────────
export function buildTownScene(scene: THREE.Scene): void {
  const town = new THREE.Group();

  // Ground plane (grass texture)
  const grassTex = getCachedTexture('grass', () => generateGrassTexture(C.grass));
  const groundMat = createTexturedMaterial(grassTex, 8, 8);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  town.add(ground);

  // Cobblestone paths
  const cobbleTex = getCachedTexture('cobble', () => generateCobblestoneTexture(C.path));

  // North-South path
  const nsPathMat = createTexturedMaterial(cobbleTex, 1, 8);
  const nsPath = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 28), nsPathMat);
  nsPath.rotation.x = -Math.PI / 2;
  nsPath.position.y = 0.01;
  town.add(nsPath);

  // East-West path
  const ewPathMat = createTexturedMaterial(
    getCachedTexture('cobble2', () => generateCobblestoneTexture(C.path)),
    8, 1
  );
  const ewPath = new THREE.Mesh(new THREE.PlaneGeometry(28, 2.5), ewPathMat);
  ewPath.rotation.x = -Math.PI / 2;
  ewPath.position.y = 0.01;
  town.add(ewPath);

  // Town square area
  const sqTex = getCachedTexture('cobble_sq', () => generateCobblestoneTexture(C.pathEdge));
  const sqPath = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), createTexturedMaterial(sqTex, 3, 3));
  sqPath.rotation.x = -Math.PI / 2;
  sqPath.position.y = 0.015;
  town.add(sqPath);

  // Buildings
  for (const bDef of BUILDINGS) {
    buildBuilding(bDef, town);
  }

  // Trees
  TREE_POSITIONS.forEach(([x, z], i) => buildTree(x, z, town, i));

  // Fountain (center of town)
  buildFountain(town);

  // Town square border walls
  buildSquareBorder(town);

  // Well
  buildWell(-2, 5.5, town);

  // Market stalls
  buildMarketStall(3, 2, 0xCC4444, 0, town);
  buildMarketStall(5, 3, 0x4477AA, Math.PI * 0.3, town);
  buildMarketStall(2, 4, 0x449944, -Math.PI * 0.2, town);

  // Benches
  buildBench(-3.5, -4.5, Math.PI * 0.5, town);
  buildBench(3.5, -4.5, -Math.PI * 0.5, town);
  buildBench(-4, 3.2, Math.PI * 0.5, town);  // Elder sits here

  // Props: barrels, crates, lamps
  buildBarrelCluster(-6, -5.5, town);
  buildBarrelCluster(6, 7, town);
  buildCrateStack(5, 2.5, town);
  buildCrateStack(-3, 6, town);
  buildCrateStack(8, -6, town);

  buildLampPost(-1.5, -4.5, town);
  buildLampPost(1.5, -4.5, town);
  buildLampPost(-1.5, 4.5, town);
  buildLampPost(1.5, 4.5, town);
  buildLampPost(-5, 0, town);
  buildLampPost(5, 0, town);

  // ── Wagon/cart near market stall ──
  buildWagon(4.5, 1, -0.3, town);

  // ── Signpost at crossroads ──
  buildSignpost(0.5, -0.5, town);

  // ── Birds on rooftops ──
  // Bird on north-row stone building (x:-7, z:-7, h:4, peaked roof ~4 + 3.5*0.4=5.4)
  buildBird(-6.5, 5.5, -7.2, 0.8, town);
  // Bird on east tall building (x:8, z:-3, h:7, rotated — roof peak ~7+3*0.4=8.2)
  buildBird(8.2, 8.4, -2.5, -1.2, town);
  // Bird on interior small building (x:-4, z:-3, h:3, peaked roof ~3+2*0.4=3.8)
  buildBird(-3.8, 4.0, -3.3, 2.0, town);

  // ── Fence sections around buildings ──
  // Fence along the side of the west cream building (x:-8, z:-2)
  buildFence(-8, -4, 2.5, 0, town);
  // Fence behind the south pale blue building (x:3, z:9)
  buildFence(3, 10.8, 3, 0, town);
  // Fence near the dusty rose interior building (x:-4, z:-3)
  buildFence(-4, -4.5, 2, Math.PI * 0.5, town);

  // ── Garden/flower patches ──
  buildGardenPatch(-6, 2, town);
  buildGardenPatch(6, -5, town);
  buildGardenPatch(-1, 7, town);

  scene.add(town);
}
