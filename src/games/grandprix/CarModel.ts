// ═══════════════════════════════════════════════════════════════════
// grandprix/CarModel.ts — Procedural F1 car geometry (1995-era)
// Smooth body shell with solid wheels + per-wheel steering pivots
// ═══════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { TeamConfig } from './rules';

function pm(mesh: THREE.Object3D, x: number, y: number, z: number) {
  mesh.position.set(x, y, z);
}

interface CarModelOptions {
  team: TeamConfig;
  number: number;
  helmetColor: number;
  driverName?: string;
}

export interface CarModelResult {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  frontWheelPivots: THREE.Group[];  // per-wheel steering pivots
  steeringGroup: THREE.Group;       // kept for compat, not used for steering
  cockpitGroup: THREE.Group;        // 3D cockpit interior
  dispose: () => void;
}

// ── Build smooth body shell from cross-sections ──────────────────

interface CrossSection {
  x: number;     // position along car length
  w: number;     // half-width
  hTop: number;  // height above base
  hBot: number;  // depth below base (flat bottom)
  yBase: number; // base height from ground
}

function buildBodyShell(sections: CrossSection[], mat: THREE.Material): THREE.Mesh {
  const segsAround = 10; // half-circle top + flat bottom
  const N = sections.length;
  const totalVerts = N * (segsAround + 3); // +3 for bottom flat vertices

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // For each cross-section, generate a profile: flat bottom + rounded top
  for (let si = 0; si < N; si++) {
    const s = sections[si];

    // Bottom-left
    positions.push(s.x, s.yBase - s.hBot, -s.w);
    normals.push(0, -1, 0);
    // Bottom-right
    positions.push(s.x, s.yBase - s.hBot, s.w);
    normals.push(0, -1, 0);
    // Bottom-center (for triangulation)
    positions.push(s.x, s.yBase - s.hBot, 0);
    normals.push(0, -1, 0);

    // Rounded top profile
    for (let ai = 0; ai <= segsAround; ai++) {
      const t = ai / segsAround; // 0=left, 1=right
      const angle = Math.PI * (1 - t); // PI to 0
      const z = Math.cos(angle) * s.w;
      const y = s.yBase + Math.sin(angle) * s.hTop;
      const ny = Math.sin(angle);
      const nz = Math.cos(angle);
      positions.push(s.x, y, z);
      normals.push(0, ny, nz);
    }
  }

  const ringSize = segsAround + 4; // 3 bottom + (segsAround+1) top

  // Connect adjacent sections
  for (let si = 0; si < N - 1; si++) {
    const base0 = si * ringSize;
    const base1 = (si + 1) * ringSize;

    // Bottom faces (quad between two sections)
    indices.push(base0, base1, base1 + 1, base0, base1 + 1, base0 + 1);

    // Side + top faces
    for (let ai = 0; ai < segsAround; ai++) {
      const a0 = base0 + 3 + ai;
      const a1 = base0 + 3 + ai + 1;
      const b0 = base1 + 3 + ai;
      const b1 = base1 + 3 + ai + 1;
      indices.push(a0, b0, b1, a0, b1, a1);
    }

    // Connect bottom-left to first top vertex
    indices.push(base0, base0 + 3, base1 + 3, base0, base1 + 3, base1);
    // Connect bottom-right to last top vertex
    const lastTop0 = base0 + 3 + segsAround;
    const lastTop1 = base1 + 3 + segsAround;
    indices.push(base0 + 1, lastTop1, lastTop0, base0 + 1, base1 + 1, lastTop1);
  }

  // Cap front face
  const fb = 0;
  for (let ai = 0; ai < segsAround; ai++) {
    indices.push(fb + 2, fb + 3 + ai + 1, fb + 3 + ai);
  }
  // Cap rear face
  const rb = (N - 1) * ringSize;
  for (let ai = 0; ai < segsAround; ai++) {
    indices.push(rb + 2, rb + 3 + ai, rb + 3 + ai + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals(); // smooth normals across sections

  return new THREE.Mesh(geo, mat);
}

export function buildCarModel(opts: CarModelOptions): CarModelResult {
  const { team, number, helmetColor } = opts;
  const group = new THREE.Group();
  const inner = new THREE.Group();
  inner.rotation.y = -Math.PI / 2;
  group.add(inner);

  const disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
  const wheels: THREE.Mesh[] = [];
  const frontWheelPivots: THREE.Group[] = [];

  const darken = (c: number, f: number) => {
    const r = ((c >> 16) & 0xFF) * f;
    const g = ((c >> 8) & 0xFF) * f;
    const b = (c & 0xFF) * f;
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
  };

  // Use Phong for shinier car body
  const primaryMat = new THREE.MeshPhongMaterial({ color: team.primary, shininess: 60 });
  const primaryDarkMat = new THREE.MeshPhongMaterial({ color: darken(team.primary, 0.7), shininess: 40 });
  const secondaryMat = new THREE.MeshPhongMaterial({ color: team.secondary, shininess: 50 });
  const accentMat = new THREE.MeshPhongMaterial({ color: team.accent, shininess: 70 });
  const blackMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const darkGrayMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
  const silverMat = new THREE.MeshPhongMaterial({ color: 0xBBBBBB, shininess: 80 });
  const carbonMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  disposables.push(primaryMat, primaryDarkMat, secondaryMat, accentMat, blackMat, darkGrayMat, silverMat, carbonMat);

  // ═══════════════════════════════════════════════════════════════
  // 1. BODY — Smooth shell from cross-sections
  // ═══════════════════════════════════════════════════════════════

  const bodySections: CrossSection[] = [
    { x: -2.10, w: 0.04, hTop: 0.04, hBot: 0.01, yBase: 0.24 }, // nose tip
    { x: -1.90, w: 0.08, hTop: 0.06, hBot: 0.02, yBase: 0.23 },
    { x: -1.60, w: 0.14, hTop: 0.08, hBot: 0.03, yBase: 0.22 },
    { x: -1.30, w: 0.20, hTop: 0.11, hBot: 0.03, yBase: 0.21 },
    { x: -1.00, w: 0.26, hTop: 0.14, hBot: 0.03, yBase: 0.20 },
    { x: -0.70, w: 0.30, hTop: 0.18, hBot: 0.03, yBase: 0.19 },
    { x: -0.40, w: 0.32, hTop: 0.22, hBot: 0.03, yBase: 0.18 }, // cockpit front
    { x: -0.10, w: 0.33, hTop: 0.24, hBot: 0.03, yBase: 0.18 }, // widest
    { x:  0.20, w: 0.32, hTop: 0.22, hBot: 0.03, yBase: 0.18 },
    { x:  0.50, w: 0.30, hTop: 0.20, hBot: 0.03, yBase: 0.19 },
    { x:  0.80, w: 0.27, hTop: 0.18, hBot: 0.03, yBase: 0.20 },
    { x:  1.10, w: 0.23, hTop: 0.16, hBot: 0.03, yBase: 0.21 },
    { x:  1.40, w: 0.19, hTop: 0.14, hBot: 0.03, yBase: 0.22 },
    { x:  1.65, w: 0.15, hTop: 0.11, hBot: 0.03, yBase: 0.23 },
    { x:  1.85, w: 0.12, hTop: 0.08, hBot: 0.02, yBase: 0.24 },
    { x:  2.00, w: 0.10, hTop: 0.06, hBot: 0.02, yBase: 0.25 }, // tail
  ];

  const body = buildBodyShell(bodySections, primaryMat);
  disposables.push(body.geometry);
  inner.add(body);

  // Underbody plate
  const bellyGeo = new THREE.BoxGeometry(3.8, 0.02, 0.60);
  disposables.push(bellyGeo);
  const belly = new THREE.Mesh(bellyGeo, darkGrayMat);
  pm(belly, -0.05, 0.16, 0);
  inner.add(belly);

  // ═══════════════════════════════════════════════════════════════
  // 2. FRONT WING
  // ═══════════════════════════════════════════════════════════════
  const fwMainGeo = new THREE.BoxGeometry(0.30, 0.012, 1.8);
  disposables.push(fwMainGeo);
  const fwMain = new THREE.Mesh(fwMainGeo, secondaryMat);
  pm(fwMain, -2.05, 0.10, 0);
  inner.add(fwMain);

  const fwFlapGeo = new THREE.BoxGeometry(0.24, 0.012, 1.6);
  disposables.push(fwFlapGeo);
  const fwFlap = new THREE.Mesh(fwFlapGeo, secondaryMat);
  fwFlap.rotation.z = 0.25;
  pm(fwFlap, -1.97, 0.14, 0);
  inner.add(fwFlap);

  // Nose pillar connecting nose to wing
  const nosePillarGeo = new THREE.BoxGeometry(0.04, 0.12, 0.04);
  disposables.push(nosePillarGeo);
  const nosePillar = new THREE.Mesh(nosePillarGeo, primaryMat);
  pm(nosePillar, -2.05, 0.17, 0);
  inner.add(nosePillar);

  for (const side of [-1, 1]) {
    const epGeo = new THREE.BoxGeometry(0.32, 0.12, 0.012);
    disposables.push(epGeo);
    const ep = new THREE.Mesh(epGeo, primaryMat);
    pm(ep, -2.0, 0.12, side * 0.9);
    inner.add(ep);
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. REAR WING
  // ═══════════════════════════════════════════════════════════════
  const rwMainGeo = new THREE.BoxGeometry(0.22, 0.012, 0.90);
  disposables.push(rwMainGeo);
  const rwMain = new THREE.Mesh(rwMainGeo, secondaryMat);
  pm(rwMain, 1.92, 0.65, 0);
  inner.add(rwMain);

  const rwFlapGeo = new THREE.BoxGeometry(0.18, 0.012, 0.85);
  disposables.push(rwFlapGeo);
  const rwFlap = new THREE.Mesh(rwFlapGeo, secondaryMat);
  rwFlap.rotation.z = 0.40;
  pm(rwFlap, 1.95, 0.72, 0);
  inner.add(rwFlap);

  for (const side of [-1, 1]) {
    const rwEpGeo = new THREE.BoxGeometry(0.30, 0.26, 0.012);
    disposables.push(rwEpGeo);
    const numCanvas = document.createElement('canvas');
    numCanvas.width = 32; numCanvas.height = 32;
    const ctx = numCanvas.getContext('2d')!;
    ctx.fillStyle = '#' + team.primary.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), 16, 16);
    const numTex = new THREE.CanvasTexture(numCanvas);
    const numMat = new THREE.MeshLambertMaterial({ map: numTex });
    disposables.push(numMat, numTex);
    const rwEp = new THREE.Mesh(rwEpGeo, numMat);
    pm(rwEp, 1.94, 0.65, side * 0.46);
    inner.add(rwEp);
  }

  // Wing pillars
  for (const pz of [-0.30, 0.30]) {
    const pillarGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.28, 4);
    disposables.push(pillarGeo);
    const pillar = new THREE.Mesh(pillarGeo, carbonMat);
    pm(pillar, 1.88, 0.48, pz);
    inner.add(pillar);
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. SIDEPODS
  // ═══════════════════════════════════════════════════════════════
  for (const side of [-1, 1]) {
    const spSections: CrossSection[] = [
      { x: -0.40, w: 0.12, hTop: 0.10, hBot: 0.02, yBase: 0.20 },
      { x: -0.10, w: 0.14, hTop: 0.12, hBot: 0.02, yBase: 0.20 },
      { x:  0.30, w: 0.13, hTop: 0.11, hBot: 0.02, yBase: 0.20 },
      { x:  0.70, w: 0.10, hTop: 0.08, hBot: 0.02, yBase: 0.21 },
    ];
    const sp = buildBodyShell(spSections, primaryDarkMat);
    disposables.push(sp.geometry);
    pm(sp, 0, 0.10, side * 0.46);
    inner.add(sp);

    // Air intake
    const intakeGeo = new THREE.BoxGeometry(0.02, 0.13, 0.20);
    disposables.push(intakeGeo);
    const intake = new THREE.Mesh(intakeGeo, darkGrayMat);
    pm(intake, -0.42, 0.33, side * 0.46);
    inner.add(intake);
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. AIRBOX + ENGINE COVER
  // ═══════════════════════════════════════════════════════════════
  const airboxGeo = new THREE.BoxGeometry(0.14, 0.14, 0.16);
  disposables.push(airboxGeo);
  const airbox = new THREE.Mesh(airboxGeo, primaryMat);
  pm(airbox, 0.38, 0.58, 0);
  inner.add(airbox);

  const scoopGeo = new THREE.BoxGeometry(0.02, 0.10, 0.12);
  disposables.push(scoopGeo);
  const scoop = new THREE.Mesh(scoopGeo, blackMat);
  pm(scoop, 0.30, 0.58, 0);
  inner.add(scoop);

  const ridgeGeo = new THREE.BoxGeometry(1.0, 0.025, 0.05);
  disposables.push(ridgeGeo);
  const ridge = new THREE.Mesh(ridgeGeo, primaryDarkMat);
  pm(ridge, 1.0, 0.43, 0);
  inner.add(ridge);

  // ═══════════════════════════════════════════════════════════════
  // 6. COCKPIT
  // ═══════════════════════════════════════════════════════════════
  const cockpitGeo = new THREE.BoxGeometry(0.55, 0.08, 0.32);
  disposables.push(cockpitGeo);
  const cockpitMesh = new THREE.Mesh(cockpitGeo, blackMat);
  pm(cockpitMesh, -0.05, 0.46, 0);
  inner.add(cockpitMesh);

  // Cockpit rim
  for (const side of [-1, 1]) {
    const rimGeo = new THREE.BoxGeometry(0.58, 0.04, 0.025);
    disposables.push(rimGeo);
    const rim = new THREE.Mesh(rimGeo, primaryMat);
    pm(rim, -0.05, 0.50, side * 0.17);
    inner.add(rim);
  }
  const fRimGeo = new THREE.BoxGeometry(0.025, 0.04, 0.32);
  disposables.push(fRimGeo);
  const fRim = new THREE.Mesh(fRimGeo, primaryMat);
  pm(fRim, -0.32, 0.50, 0);
  inner.add(fRim);

  // Rollbar
  const rollbarGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.07, 4);
  disposables.push(rollbarGeo);
  const rollbar = new THREE.Mesh(rollbarGeo, silverMat);
  pm(rollbar, 0.22, 0.56, 0);
  inner.add(rollbar);

  // Small steering wheel on the car model
  const swGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.008, 8);
  disposables.push(swGeo);
  const sw = new THREE.Mesh(swGeo, blackMat);
  sw.rotation.x = Math.PI / 4;
  pm(sw, -0.24, 0.44, 0);
  inner.add(sw);

  // ═══════════════════════════════════════════════════════════════
  // 7. DRIVER HELMET
  // ═══════════════════════════════════════════════════════════════
  const helmetMat = new THREE.MeshPhongMaterial({ color: helmetColor, shininess: 90 });
  disposables.push(helmetMat);
  const helmetGeo = new THREE.SphereGeometry(0.09, 8, 6);
  disposables.push(helmetGeo);
  const helmet = new THREE.Mesh(helmetGeo, helmetMat);
  helmet.scale.set(1.0, 0.9, 0.85);
  pm(helmet, 0.05, 0.54, 0);
  inner.add(helmet);

  const visorGeo = new THREE.BoxGeometry(0.05, 0.03, 0.16);
  disposables.push(visorGeo);
  const visorMat = new THREE.MeshPhongMaterial({ color: 0x222233, shininess: 100 });
  disposables.push(visorMat);
  const visor = new THREE.Mesh(visorGeo, visorMat);
  pm(visor, -0.03, 0.55, 0);
  inner.add(visor);

  for (const side of [-1, 1]) {
    const shGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.05, 4);
    disposables.push(shGeo);
    const sh = new THREE.Mesh(shGeo, primaryMat);
    sh.rotation.z = Math.PI / 2;
    pm(sh, 0.05, 0.46, side * 0.13);
    inner.add(sh);
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. WHEELS — Per-wheel steering pivots (no wobble)
  // ═══════════════════════════════════════════════════════════════
  const tireMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 10 });
  const hubMat = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 60 });
  disposables.push(tireMat, hubMat);

  // Legacy steeringGroup (kept for interface compat — not used for actual steering)
  const steeringGroup = new THREE.Group();
  inner.add(steeringGroup);

  // [x, z, isFront, tireRadius, tireWidth]
  const wheelPositions: [number, number, boolean, number, number][] = [
    [-1.50, -0.78, true, 0.28, 0.16],
    [-1.50,  0.78, true, 0.28, 0.16],
    [ 1.50, -0.74, false, 0.30, 0.22],
    [ 1.50,  0.74, false, 0.30, 0.22],
  ];

  for (const [wx, wz, isFront, tireR, tireW] of wheelPositions) {
    // Create a steering pivot at the wheel's position (for front wheels)
    // This ensures the wheel rotates around its own vertical axis
    let parent: THREE.Object3D = inner;

    if (isFront) {
      const pivot = new THREE.Group();
      pm(pivot, wx, 0, wz); // pivot at wheel XZ position
      inner.add(pivot);
      frontWheelPivots.push(pivot);
      parent = pivot;
    }

    // Tire offset: relative to pivot for front, absolute for rear
    const tireX = isFront ? 0 : wx;
    const tireZ = isFront ? 0 : wz;

    const tireGeo = new THREE.CylinderGeometry(tireR, tireR, tireW, 16);
    disposables.push(tireGeo);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.x = Math.PI / 2;
    pm(tire, tireX, tireR, tireZ);
    parent.add(tire);
    wheels.push(tire);

    // Hub face
    const hubGeo = new THREE.CylinderGeometry(tireR * 0.50, tireR * 0.50, 0.02, 10);
    disposables.push(hubGeo);
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.x = Math.PI / 2;
    const hubZoff = (isFront ? 0 : wz);
    const hubZabs = hubZoff > 0 || (!isFront && wz > 0) ? hubZoff + tireW / 2 + 0.01 : hubZoff - tireW / 2 - 0.01;
    pm(hub, tireX, tireR, hubZabs);
    parent.add(hub);

    // Center nut
    const nutGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.025, 6);
    disposables.push(nutGeo);
    const nut = new THREE.Mesh(nutGeo, accentMat);
    nut.rotation.x = Math.PI / 2;
    const nutZabs = hubZoff > 0 || (!isFront && wz > 0) ? hubZoff + tireW / 2 + 0.02 : hubZoff - tireW / 2 - 0.02;
    pm(nut, tireX, tireR, nutZabs);
    parent.add(nut);
  }

  // ═══════════════════════════════════════════════════════════════
  // 9. SUSPENSION ARMS
  // ═══════════════════════════════════════════════════════════════
  // Rear suspension only attached to inner (front pivots handle their own)
  for (const [wx, wz, isFront, tireR] of wheelPositions) {
    if (isFront) continue; // front suspension handled separately
    const chassisX = 1.0;
    const chassisZ = wz > 0 ? 0.28 : -0.28;

    for (const isUpper of [true, false]) {
      const dx = wx - chassisX;
      const dz = wz - chassisZ;
      const armLen = Math.sqrt(dx * dx + dz * dz);
      const armGeo = new THREE.CylinderGeometry(0.010, 0.010, armLen, 4);
      disposables.push(armGeo);
      const arm = new THREE.Mesh(armGeo, carbonMat);
      const my = isUpper ? tireR + 0.08 : tireR - 0.08;
      pm(arm, (wx + chassisX) / 2, my, (wz + chassisZ) / 2);
      const angle = Math.atan2(dz, dx);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = -angle;
      inner.add(arm);
    }
  }

  // Front suspension — simple static arms from chassis to wheel area
  for (const [wx, wz, isFront, tireR] of wheelPositions) {
    if (!isFront) continue;
    const chassisX = -1.0;
    const chassisZ = wz > 0 ? 0.28 : -0.28;
    for (const isUpper of [true, false]) {
      const dx = wx - chassisX;
      const dz = wz - chassisZ;
      const armLen = Math.sqrt(dx * dx + dz * dz);
      const armGeo = new THREE.CylinderGeometry(0.010, 0.010, armLen, 4);
      disposables.push(armGeo);
      const arm = new THREE.Mesh(armGeo, carbonMat);
      const my = isUpper ? 0.28 + 0.08 : 0.28 - 0.08;
      pm(arm, (wx + chassisX) / 2, my, (wz + chassisZ) / 2);
      const angle = Math.atan2(dz, dx);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = -angle;
      inner.add(arm); // static on body (visual only)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 10. MIRRORS
  // ═══════════════════════════════════════════════════════════════
  for (const side of [-1, 1]) {
    const mirrorGeo = new THREE.BoxGeometry(0.04, 0.025, 0.012);
    disposables.push(mirrorGeo);
    const mirror = new THREE.Mesh(mirrorGeo, silverMat);
    pm(mirror, -0.20, 0.48, side * 0.26);
    inner.add(mirror);

    const armGeo = new THREE.BoxGeometry(0.05, 0.008, 0.008);
    disposables.push(armGeo);
    const arm = new THREE.Mesh(armGeo, primaryMat);
    pm(arm, -0.20, 0.47, side * 0.20);
    inner.add(arm);
  }

  // ═══════════════════════════════════════════════════════════════
  // 11. EXHAUST
  // ═══════════════════════════════════════════════════════════════
  const exhaustGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.12, 6);
  disposables.push(exhaustGeo);
  const exhaustMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
  disposables.push(exhaustMat);
  const exhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
  exhaust.rotation.z = Math.PI / 2;
  pm(exhaust, 1.98, 0.30, 0);
  inner.add(exhaust);

  // ═══════════════════════════════════════════════════════════════
  // 12. COCKPIT INTERIOR (for cockpit camera view)
  // ═══════════════════════════════════════════════════════════════
  const cockpitGroup = buildCockpitInterior(team, disposables);
  inner.add(cockpitGroup);
  cockpitGroup.visible = false; // hidden by default, shown in cockpit cam

  return {
    group,
    wheels,
    frontWheelPivots,
    steeringGroup,
    cockpitGroup,
    dispose: () => {
      disposables.forEach(d => d.dispose());
    },
  };
}

// ── Cockpit interior for first-person view ──────────────────────

function buildCockpitInterior(
  team: TeamConfig,
  disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[],
): THREE.Group {
  const g = new THREE.Group();
  const blackMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const carbonMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const teamMat = new THREE.MeshPhongMaterial({ color: team.primary, shininess: 40 });
  const screenMat = new THREE.MeshLambertMaterial({ color: 0x113311 }); // green LCD
  disposables.push(blackMat, carbonMat, teamMat, screenMat);

  // Dashboard panel (in front of driver at cockpit bottom)
  const dashGeo = new THREE.BoxGeometry(0.35, 0.06, 0.30);
  disposables.push(dashGeo);
  const dash = new THREE.Mesh(dashGeo, carbonMat);
  dash.rotation.x = -0.3; // angled toward driver
  pm(dash, -0.25, 0.41, 0);
  g.add(dash);

  // LCD screen on dashboard
  const lcdGeo = new THREE.BoxGeometry(0.12, 0.04, 0.08);
  disposables.push(lcdGeo);
  const lcd = new THREE.Mesh(lcdGeo, screenMat);
  pm(lcd, -0.25, 0.44, 0);
  g.add(lcd);

  // Steering wheel (larger, visible in cockpit view)
  const swRimGeo = new THREE.TorusGeometry(0.10, 0.012, 6, 16);
  disposables.push(swRimGeo);
  const swRim = new THREE.Mesh(swRimGeo, blackMat);
  swRim.rotation.x = Math.PI / 2 + 0.6; // angled toward driver
  pm(swRim, -0.22, 0.43, 0);
  g.add(swRim);

  // Steering column
  const colGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 4);
  disposables.push(colGeo);
  const col = new THREE.Mesh(colGeo, carbonMat);
  col.rotation.x = Math.PI / 4;
  pm(col, -0.20, 0.42, 0);
  g.add(col);

  // Cockpit walls (side panels visible from inside)
  for (const side of [-1, 1]) {
    const wallGeo = new THREE.BoxGeometry(0.55, 0.10, 0.02);
    disposables.push(wallGeo);
    const wall = new THREE.Mesh(wallGeo, teamMat);
    pm(wall, -0.05, 0.45, side * 0.16);
    g.add(wall);
  }

  // Nose visible ahead (extends forward from cockpit)
  const noseVisGeo = new THREE.BoxGeometry(1.0, 0.03, 0.20);
  disposables.push(noseVisGeo);
  const noseVis = new THREE.Mesh(noseVisGeo, teamMat);
  pm(noseVis, -1.0, 0.28, 0);
  g.add(noseVis);

  return g;
}
