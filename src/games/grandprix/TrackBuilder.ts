// ═══════════════════════════════════════════════════════════════════
// grandprix/TrackBuilder.ts — Generate track mesh from spline data
// ═══════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { TrackDefinition } from './tracks';
import { TRACK } from './rules';

// ── Texture generators ────────────────────────────────────────────

const textureCache = new Map<string, THREE.CanvasTexture>();

function getCachedTexture(key: string, generator: () => HTMLCanvasElement): THREE.CanvasTexture {
  if (textureCache.has(key)) return textureCache.get(key)!;
  const canvas = generator();
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  textureCache.set(key, tex);
  return tex;
}

function generateAsphaltTexture(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * 64;
    const y = Math.random() * 64;
    const v = 45 + Math.random() * 35;
    ctx.fillStyle = `rgb(${v},${v},${v + 4})`;
    ctx.fillRect(x, y, 1 + Math.random() * 1.5, 1);
  }
  // Subtle tire marks
  ctx.strokeStyle = 'rgba(25,25,25,0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 64, 0);
    ctx.lineTo(Math.random() * 64, 64);
    ctx.stroke();
  }
  return c;
}

function generateGrassTexture(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#2d6a1e';
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 64;
    const y = Math.random() * 64;
    const g = 70 + Math.random() * 60;
    ctx.fillStyle = `rgb(${30 + Math.random() * 25},${g},${15 + Math.random() * 20})`;
    ctx.fillRect(x, y, 1, 2 + Math.random() * 3);
  }
  return c;
}

function generateGravelTexture(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#C4A870';
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * 64;
    const y = Math.random() * 64;
    const v = 150 + Math.random() * 60;
    ctx.fillStyle = `rgb(${v},${v - 15},${v - 45})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.5 + Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

function generateAdTexture(bgColor: string, text: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 32;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 128, 32);
  // Border
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 126, 30);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 16);
  return c;
}

// ── Track spline + geometry ───────────────────────────────────────

export interface TrackMeshData {
  group: THREE.Group;
  spline: THREE.CatmullRomCurve3;
  splinePoints: THREE.Vector3[];
  trackWidths: number[];
  normals: THREE.Vector3[];
  dispose: () => void;
}

export function buildTrack(trackDef: TrackDefinition): TrackMeshData {
  const group = new THREE.Group();
  const disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];

  // Build spline from control points
  const cpVecs = trackDef.controlPoints.map(cp =>
    new THREE.Vector3(cp.pos.x, cp.pos.y, cp.pos.z)
  );
  const spline = new THREE.CatmullRomCurve3(cpVecs, true, 'catmullrom', 0.5);

  const N = TRACK.SPLINE_SAMPLES;
  const splinePoints: THREE.Vector3[] = [];
  const tangents: THREE.Vector3[] = [];
  const normals: THREE.Vector3[] = [];
  const trackWidths: number[] = [];

  for (let i = 0; i < N; i++) {
    const t = i / N;
    splinePoints.push(spline.getPointAt(t));
    tangents.push(spline.getTangentAt(t).normalize());

    const right = new THREE.Vector3().crossVectors(tangents[i], new THREE.Vector3(0, 1, 0)).normalize();
    normals.push(right);

    const cpIndex = Math.round(t * trackDef.controlPoints.length) % trackDef.controlPoints.length;
    trackWidths.push(trackDef.controlPoints[cpIndex].width || TRACK.DEFAULT_WIDTH);
  }

  // ── Road surface (ribbon geometry) ──────────────────────────
  const asphaltTex = getCachedTexture('asphalt', generateAsphaltTexture);
  asphaltTex.repeat.set(2, 80);
  const roadMat = new THREE.MeshLambertMaterial({ map: asphaltTex, side: THREE.DoubleSide });
  disposables.push(roadMat);

  const roadGeo = new THREE.BufferGeometry();
  const roadVerts: number[] = [];
  const roadUVs: number[] = [];
  const roadIndices: number[] = [];

  for (let i = 0; i < N; i++) {
    const p = splinePoints[i];
    const n = normals[i];
    const w = trackWidths[i] / 2;

    roadVerts.push(p.x - n.x * w, p.y + 0.01, p.z - n.z * w);
    roadVerts.push(p.x + n.x * w, p.y + 0.01, p.z + n.z * w);

    const v = i / N;
    roadUVs.push(0, v);
    roadUVs.push(1, v);

    if (i < N - 1) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      roadIndices.push(a, c, b, b, c, d);
    }
  }
  const last = (N - 1) * 2;
  roadIndices.push(last, 0, last + 1, last + 1, 0, 1);

  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVerts, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUVs, 2));
  roadGeo.setIndex(roadIndices);
  roadGeo.computeVertexNormals();
  disposables.push(roadGeo);
  group.add(new THREE.Mesh(roadGeo, roadMat));

  // ── White edge lines (ribbon along road edges) ──────────────
  const edgeMat = new THREE.MeshLambertMaterial({ color: 0xEEEEEE, side: THREE.DoubleSide });
  disposables.push(edgeMat);
  for (const edgeSide of [-1, 1]) {
    const edgeGeo = new THREE.BufferGeometry();
    const eVerts: number[] = [];
    const eIdx: number[] = [];
    const lineW = 0.3; // white line width

    for (let i = 0; i < N; i++) {
      const p = splinePoints[i];
      const n = normals[i];
      const w = trackWidths[i] / 2;
      const outerW = w + lineW * 0.5;
      const innerW = w - lineW * 0.5;

      eVerts.push(
        p.x + n.x * innerW * edgeSide, 0.015, p.z + n.z * innerW * edgeSide,
        p.x + n.x * outerW * edgeSide, 0.015, p.z + n.z * outerW * edgeSide,
      );

      if (i < N - 1) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        eIdx.push(a, c, b, b, c, d);
      }
    }
    const eLast = (N - 1) * 2;
    eIdx.push(eLast, 0, eLast + 1, eLast + 1, 0, 1);

    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(eVerts, 3));
    edgeGeo.setIndex(eIdx);
    edgeGeo.computeVertexNormals();
    disposables.push(edgeGeo);
    group.add(new THREE.Mesh(edgeGeo, edgeMat));
  }

  // ── Start/finish line ───────────────────────────────────────
  const sfGeo = new THREE.PlaneGeometry(trackWidths[0], 2);
  const sfCanvas = document.createElement('canvas');
  sfCanvas.width = 64; sfCanvas.height = 8;
  const sfCtx = sfCanvas.getContext('2d')!;
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 2; y++) {
      sfCtx.fillStyle = (x + y) % 2 === 0 ? '#FFFFFF' : '#111111';
      sfCtx.fillRect(x * 4, y * 4, 4, 4);
    }
  }
  const sfTex = new THREE.CanvasTexture(sfCanvas);
  const sfMat = new THREE.MeshLambertMaterial({ map: sfTex, side: THREE.DoubleSide });
  disposables.push(sfGeo, sfMat, sfTex);

  const sfMesh = new THREE.Mesh(sfGeo, sfMat);
  sfMesh.rotation.x = -Math.PI / 2;
  sfMesh.position.set(splinePoints[0].x, 0.02, splinePoints[0].z);
  sfMesh.rotation.z = Math.atan2(tangents[0].x, tangents[0].z);
  group.add(sfMesh);

  // ── Curb strips (continuous ribbons at corners) ─────────────
  const curbColorA = new THREE.MeshLambertMaterial({ color: 0xCC0000, side: THREE.DoubleSide });
  const curbColorB = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide });
  disposables.push(curbColorA, curbColorB);

  // Build continuous curb ribbons at corner sections
  for (const edgeSide of [-1, 1]) {
    const curbGeo = new THREE.BufferGeometry();
    const cVerts: number[] = [];
    const cIdx: number[] = [];
    const cColors: number[] = [];
    let vertCount = 0;

    for (let i = 0; i < N; i++) {
      const t = i / N;
      const cpIndex = Math.round(t * trackDef.controlPoints.length) % trackDef.controlPoints.length;
      const cp = trackDef.controlPoints[cpIndex];
      if (!cp.hasCurbs) continue;

      const p = splinePoints[i];
      const n = normals[i];
      const w = trackWidths[i] / 2;
      const curbOuter = w + TRACK.CURB_WIDTH;

      cVerts.push(
        p.x + n.x * w * edgeSide, 0.025, p.z + n.z * w * edgeSide,
        p.x + n.x * curbOuter * edgeSide, 0.04, p.z + n.z * curbOuter * edgeSide,
      );

      // Alternating red/white stripes based on distance along track
      const stripeIdx = Math.floor(i / 3);
      const isRed = stripeIdx % 2 === 0;
      const r = isRed ? 0.8 : 1.0;
      const g = isRed ? 0.0 : 1.0;
      const b = isRed ? 0.0 : 1.0;
      cColors.push(r, g, b, r, g, b);

      if (vertCount >= 2) {
        const a = vertCount - 2, bv = a + 1, c = a + 2, d = a + 3;
        cIdx.push(a, c, bv, bv, c, d);
      }
      vertCount += 2;
    }

    if (vertCount >= 4) {
      curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(cVerts, 3));
      curbGeo.setAttribute('color', new THREE.Float32BufferAttribute(cColors, 3));
      curbGeo.setIndex(cIdx);
      curbGeo.computeVertexNormals();
      disposables.push(curbGeo);
      const curbMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
      disposables.push(curbMat);
      group.add(new THREE.Mesh(curbGeo, curbMat));
    }
  }

  // ── Grass ground plane ──────────────────────────────────────
  // Center the grass on the track bounding box
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of splinePoints) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const extentX = (maxX - minX) + 200;
  const extentZ = (maxZ - minZ) + 200;
  const grassSize = Math.max(extentX, extentZ, 1200);

  const grassTex = getCachedTexture('grass', generateGrassTexture);
  grassTex.repeat.set(150, 150);
  const grassMat = new THREE.MeshLambertMaterial({ map: grassTex });
  const grassGeo = new THREE.PlaneGeometry(grassSize, grassSize);
  disposables.push(grassMat, grassGeo);

  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(centerX, -0.05, centerZ);
  group.add(grass);

  // ── Gravel traps at corners ─────────────────────────────────
  const gravelTex = getCachedTexture('gravel', generateGravelTexture);
  gravelTex.repeat.set(4, 4);
  const gravelMat = new THREE.MeshLambertMaterial({ map: gravelTex });
  disposables.push(gravelMat);

  const placedGravel = new Set<number>();
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const cpIndex = Math.round(t * trackDef.controlPoints.length) % trackDef.controlPoints.length;
    const cp = trackDef.controlPoints[cpIndex];
    if (!cp.isCorner || placedGravel.has(cpIndex)) continue;
    placedGravel.add(cpIndex);

    const p = splinePoints[i];
    const n = normals[i];
    const w = trackWidths[i] / 2;

    for (const side of [-1, 1]) {
      const gGeo = new THREE.BoxGeometry(TRACK.GRAVEL_WIDTH, 0.02, 12);
      disposables.push(gGeo);
      const gMesh = new THREE.Mesh(gGeo, gravelMat);
      gMesh.position.set(
        p.x + n.x * (w + TRACK.CURB_WIDTH + TRACK.GRAVEL_WIDTH / 2) * side,
        -0.03,
        p.z + n.z * (w + TRACK.CURB_WIDTH + TRACK.GRAVEL_WIDTH / 2) * side
      );
      gMesh.rotation.y = Math.atan2(tangents[i].x, tangents[i].z);
      group.add(gMesh);
    }
  }

  // ── Continuous barrier walls ────────────────────────────────
  // Build as ribbon geometry on each side of track
  const barrierMat = new THREE.MeshLambertMaterial({ color: 0xBBBBBB });
  const barrierTopMat = new THREE.MeshLambertMaterial({ color: 0xDD0000 }); // red top rail
  disposables.push(barrierMat, barrierTopMat);

  for (const side of [-1, 1]) {
    // Main barrier wall (continuous ribbon)
    const wallGeo = new THREE.BufferGeometry();
    const wVerts: number[] = [];
    const wIdx: number[] = [];
    const step = 3; // every 3rd sample for smooth but efficient barriers

    let vi = 0;
    for (let i = 0; i < N; i += step) {
      const p = splinePoints[i];
      const n = normals[i];
      const offset = TRACK.BARRIER_OFFSET;

      const bx = p.x + n.x * offset * side;
      const bz = p.z + n.z * offset * side;

      // Bottom and top of barrier wall
      wVerts.push(bx, 0, bz);         // bottom
      wVerts.push(bx, 0.7, bz);       // top

      if (vi >= 2) {
        const a = vi - 2, b = a + 1, c = a + 2, d = a + 3;
        wIdx.push(a, c, b, b, c, d);
      }
      vi += 2;
    }
    // Close the loop
    if (vi >= 4) {
      wIdx.push(vi - 2, 0, vi - 1, vi - 1, 0, 1);
    }

    wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wVerts, 3));
    wallGeo.setIndex(wIdx);
    wallGeo.computeVertexNormals();
    disposables.push(wallGeo);
    group.add(new THREE.Mesh(wallGeo, barrierMat));

    // Red top rail (thinner ribbon on top)
    const topGeo = new THREE.BufferGeometry();
    const tVerts: number[] = [];
    const tIdx: number[] = [];
    let ti = 0;
    for (let i = 0; i < N; i += step) {
      const p = splinePoints[i];
      const n = normals[i];
      const offset = TRACK.BARRIER_OFFSET;

      const bx = p.x + n.x * offset * side;
      const bz = p.z + n.z * offset * side;

      tVerts.push(bx, 0.7, bz);
      tVerts.push(bx, 0.85, bz);

      if (ti >= 2) {
        const a = ti - 2, b = a + 1, c = a + 2, d = a + 3;
        tIdx.push(a, c, b, b, c, d);
      }
      ti += 2;
    }
    if (ti >= 4) {
      tIdx.push(ti - 2, 0, ti - 1, ti - 1, 0, 1);
    }

    topGeo.setAttribute('position', new THREE.Float32BufferAttribute(tVerts, 3));
    topGeo.setIndex(tIdx);
    topGeo.computeVertexNormals();
    disposables.push(topGeo);
    group.add(new THREE.Mesh(topGeo, barrierTopMat));

    // Barrier posts every 15 samples
    const postMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    disposables.push(postMat);
    for (let i = 0; i < N; i += 15) {
      const p = splinePoints[i];
      const n = normals[i];
      const offset = TRACK.BARRIER_OFFSET;

      const postGeo = new THREE.BoxGeometry(0.1, 0.9, 0.1);
      disposables.push(postGeo);
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(
        p.x + n.x * offset * side,
        0.45,
        p.z + n.z * offset * side
      );
      group.add(post);
    }
  }

  // ── Start gantry ────────────────────────────────────────────
  buildStartGantry(group, splinePoints[0], tangents[0], trackWidths[0], disposables);

  // ── Grandstands (auto-oriented toward nearest track point) ──
  for (const pos of trackDef.grandstandPositions) {
    // Find nearest spline point to orient grandstand toward track
    let minD = Infinity;
    let nearestIdx = 0;
    for (let i = 0; i < N; i += 5) {
      const dx = pos.x - splinePoints[i].x;
      const dz = pos.z - splinePoints[i].z;
      const d = dx * dx + dz * dz;
      if (d < minD) { minD = d; nearestIdx = i; }
    }
    const toTrack = Math.atan2(
      splinePoints[nearestIdx].x - pos.x,
      splinePoints[nearestIdx].z - pos.z
    );
    buildGrandstand(group, pos, toTrack, disposables);
  }

  // ── Pit buildings (along start/finish straight) ────────────
  buildPitLane(group, splinePoints, normals, trackWidths, disposables);

  // ── Control tower ──────────────────────────────────────────
  buildControlTower(group, splinePoints[0], normals[0], trackWidths[0], disposables);

  // ── Trees ───────────────────────────────────────────────────
  for (const zone of trackDef.treeZones) {
    for (let i = 0; i < zone.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * zone.radius;
      const tx = zone.center.x + Math.cos(angle) * r;
      const tz = zone.center.z + Math.sin(angle) * r;
      buildTree(group, tx, tz, disposables);
    }
  }

  // ── Advertising boards (placed outside barriers) ────────────
  const adTexts = ['SPEED', 'TURBO', 'APEX', 'GRIP', 'FUEL', 'POLE', 'RACE', 'NITRO'];
  const adColors = ['#CC0000', '#0044CC', '#FFD700', '#00AA44', '#FF6600', '#660099', '#CC6600', '#0088AA'];
  let adIdx = 0;
  for (let i = 0; i < N; i += 25) {
    const p = splinePoints[i];
    const n = normals[i];
    const side = i % 50 < 25 ? -1 : 1;
    const offset = TRACK.BARRIER_OFFSET + 1.5; // just outside the barriers

    const adCanvas = generateAdTexture(adColors[adIdx % adColors.length], adTexts[adIdx % adTexts.length]);
    const adTex = new THREE.CanvasTexture(adCanvas);
    const adMat = new THREE.MeshLambertMaterial({ map: adTex });
    const adGeo = new THREE.BoxGeometry(5, 1.2, 0.08);
    disposables.push(adMat, adTex, adGeo);

    const ad = new THREE.Mesh(adGeo, adMat);
    ad.position.set(
      p.x + n.x * offset * side,
      0.8,
      p.z + n.z * offset * side
    );
    // Face toward the track
    ad.rotation.y = Math.atan2(n.x * side, n.z * side);
    group.add(ad);
    adIdx++;
  }

  return {
    group,
    spline,
    splinePoints,
    trackWidths,
    normals,
    dispose: () => {
      disposables.forEach(d => d.dispose());
      textureCache.clear();
    },
  };
}

// ── Start gantry with lights ────────────────────────────────────

function buildStartGantry(
  group: THREE.Group, pos: THREE.Vector3, dir: THREE.Vector3,
  width: number, disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[]
) {
  const gantryMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
  disposables.push(gantryMat);

  for (const side of [-1, 1]) {
    const pylonGeo = new THREE.BoxGeometry(0.4, 8, 0.4);
    disposables.push(pylonGeo);
    const pylon = new THREE.Mesh(pylonGeo, gantryMat);
    pylon.position.set(pos.x + side * width * 0.55, 4, pos.z);
    group.add(pylon);
  }

  const beamGeo = new THREE.BoxGeometry(width + 2, 0.6, 0.5);
  disposables.push(beamGeo);
  const beam = new THREE.Mesh(beamGeo, gantryMat);
  beam.position.set(pos.x, 8, pos.z);
  group.add(beam);

  const lightOffMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  disposables.push(lightOffMat);

  for (let i = 0; i < 5; i++) {
    const lx = pos.x - 3 + i * 1.5;
    const housingGeo = new THREE.BoxGeometry(0.4, 0.4, 0.25);
    disposables.push(housingGeo);
    const housingMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    disposables.push(housingMat);
    const housing = new THREE.Mesh(housingGeo, housingMat);
    housing.position.set(lx, 7.5, pos.z - 0.2);
    group.add(housing);

    const lightGeo = new THREE.SphereGeometry(0.15, 8, 6);
    disposables.push(lightGeo);
    const light = new THREE.Mesh(lightGeo, lightOffMat);
    light.position.set(lx, 7.5, pos.z - 0.38);
    light.userData.startLight = i;
    group.add(light);
  }
}

// ── Grandstand (oriented toward track) ──────────────────────────

function buildGrandstand(
  group: THREE.Group, pos: { x: number; y: number; z: number },
  rotation: number,
  disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[]
) {
  const crowdCanvas = document.createElement('canvas');
  crowdCanvas.width = 64; crowdCanvas.height = 64;
  const ctx = crowdCanvas.getContext('2d')!;
  ctx.fillStyle = '#666666';
  ctx.fillRect(0, 0, 64, 64);
  const crowdColors = ['#CC3333', '#3333CC', '#FFDD00', '#FFFFFF', '#FF6600', '#33CC33', '#FF3399', '#00CCCC'];
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = crowdColors[Math.floor(Math.random() * crowdColors.length)];
    ctx.fillRect(Math.random() * 62, Math.random() * 62, 2, 3);
  }
  const crowdTex = new THREE.CanvasTexture(crowdCanvas);
  const crowdMat = new THREE.MeshLambertMaterial({ map: crowdTex });
  disposables.push(crowdTex, crowdMat);

  const standGroup = new THREE.Group();

  // Back wall (structural)
  const backGeo = new THREE.BoxGeometry(32, 8, 0.4);
  const backMat = new THREE.MeshLambertMaterial({ color: 0x777777 });
  disposables.push(backGeo, backMat);
  const back = new THREE.Mesh(backGeo, backMat);
  back.position.set(0, 4, -7);
  standGroup.add(back);

  // Side walls
  for (const sx of [-16.2, 16.2]) {
    const sideGeo = new THREE.BoxGeometry(0.3, 8, 7);
    disposables.push(sideGeo);
    const side = new THREE.Mesh(sideGeo, backMat);
    side.position.set(sx, 4, -3.5);
    standGroup.add(side);
  }

  // 8 stepped rows with crowd
  for (let row = 0; row < 8; row++) {
    const rowGeo = new THREE.BoxGeometry(30, 0.5, 1.0);
    disposables.push(rowGeo);
    const rowMesh = new THREE.Mesh(rowGeo, crowdMat);
    rowMesh.position.set(0, row * 0.9 + 0.5, -row * 0.85);
    standGroup.add(rowMesh);
  }

  // Roof
  const roofGeo = new THREE.BoxGeometry(34, 0.25, 10);
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
  disposables.push(roofGeo, roofMat);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 8, -3.5);
  roof.rotation.x = -0.06;
  standGroup.add(roof);

  // Roof support pillars
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
  disposables.push(pillarMat);
  for (const px of [-14, -7, 0, 7, 14]) {
    const pillarGeo = new THREE.CylinderGeometry(0.12, 0.12, 8, 4);
    disposables.push(pillarGeo);
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(px, 4, 0.2);
    standGroup.add(pillar);
  }

  // Catch fence in front of grandstand (tall wire mesh look)
  const fenceMat = new THREE.MeshLambertMaterial({ color: 0xAAAAAA, transparent: true, opacity: 0.4 });
  disposables.push(fenceMat);
  const fenceGeo = new THREE.PlaneGeometry(32, 4);
  disposables.push(fenceGeo);
  const fence = new THREE.Mesh(fenceGeo, fenceMat);
  fence.position.set(0, 3, 1);
  standGroup.add(fence);

  standGroup.position.set(pos.x, pos.y, pos.z);
  standGroup.rotation.y = rotation;
  group.add(standGroup);
}

// ── Pit Lane Buildings ─────────────────────────────────────────

function buildPitLane(
  group: THREE.Group,
  splinePoints: THREE.Vector3[],
  normals: THREE.Vector3[],
  trackWidths: number[],
  disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[],
) {
  // Place pit garages along the start/finish straight (first ~80 spline points)
  // Offset to the opposite side from grandstands (positive X side)
  const pitWallMat = new THREE.MeshLambertMaterial({ color: 0xCCCCCC });
  const pitRoofMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
  const pitDoorMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  disposables.push(pitWallMat, pitRoofMat, pitDoorMat);

  // Team colors for garage fronts
  const teamColors = [
    0x003399, 0xCC0000, 0xFF6600, 0x00AA44, 0xFFD700,
    0x000066, 0x0044CC, 0x006699, 0x333333, 0x222222
  ];

  const pitGroup = new THREE.Group();
  const startPt = splinePoints[0];
  const startNorm = normals[0];
  const pitOffset = trackWidths[0] / 2 + 8; // 8m beyond track edge

  for (let i = 0; i < 10; i++) {
    const garageZ = i * 8 + 10; // space 8m apart, starting 10m from start line
    const garageX = startPt.x + startNorm.x * pitOffset;

    // Garage structure
    const wallGeo = new THREE.BoxGeometry(5, 3.5, 7);
    disposables.push(wallGeo);
    const wall = new THREE.Mesh(wallGeo, pitWallMat);
    wall.position.set(garageX, 1.75, garageZ);
    pitGroup.add(wall);

    // Garage door (dark opening)
    const doorGeo = new THREE.BoxGeometry(0.1, 2.8, 5);
    disposables.push(doorGeo);
    const door = new THREE.Mesh(doorGeo, pitDoorMat);
    door.position.set(garageX - 2.5, 1.4, garageZ);
    pitGroup.add(door);

    // Team-colored stripe above door
    const teamMat = new THREE.MeshLambertMaterial({ color: teamColors[i % teamColors.length] });
    disposables.push(teamMat);
    const stripeGeo = new THREE.BoxGeometry(0.15, 0.5, 5.5);
    disposables.push(stripeGeo);
    const stripe = new THREE.Mesh(stripeGeo, teamMat);
    stripe.position.set(garageX - 2.55, 3.0, garageZ);
    pitGroup.add(stripe);

    // Roof overhang
    const roofGeo = new THREE.BoxGeometry(6.5, 0.15, 8);
    disposables.push(roofGeo);
    const roof = new THREE.Mesh(roofGeo, pitRoofMat);
    roof.position.set(garageX - 0.5, 3.6, garageZ);
    pitGroup.add(roof);
  }

  // Pit wall (low wall between pit lane and track)
  const pitWallGeo = new THREE.BoxGeometry(0.3, 1.0, 85);
  disposables.push(pitWallGeo);
  const pitWall = new THREE.Mesh(pitWallGeo, new THREE.MeshLambertMaterial({ color: 0x999999 }));
  pitWall.position.set(startPt.x + startNorm.x * (trackWidths[0] / 2 + 2), 0.5, 45);
  pitGroup.add(pitWall);

  group.add(pitGroup);
}

// ── Control Tower ──────────────────────────────────────────────

function buildControlTower(
  group: THREE.Group,
  startPt: THREE.Vector3, startNorm: THREE.Vector3, trackWidth: number,
  disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[],
) {
  const towerGroup = new THREE.Group();
  const offset = trackWidth / 2 + 12;
  const tx = startPt.x + startNorm.x * offset;
  const tz = startPt.z - 5; // just behind start line

  // Tower base
  const baseMat = new THREE.MeshLambertMaterial({ color: 0xBBBBBB });
  disposables.push(baseMat);
  const baseGeo = new THREE.BoxGeometry(8, 12, 6);
  disposables.push(baseGeo);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.set(tx, 6, tz);
  towerGroup.add(base);

  // Glass windows (dark tinted)
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x334455 });
  disposables.push(glassMat);
  for (let floor = 0; floor < 3; floor++) {
    const windowGeo = new THREE.BoxGeometry(0.1, 1.5, 4);
    disposables.push(windowGeo);
    const win = new THREE.Mesh(windowGeo, glassMat);
    win.position.set(tx - 4.05, 3 + floor * 3.5, tz);
    towerGroup.add(win);
  }

  // Top observation deck (wider, glass-fronted)
  const topGeo = new THREE.BoxGeometry(10, 3, 7);
  disposables.push(topGeo);
  const top = new THREE.Mesh(topGeo, baseMat);
  top.position.set(tx, 13.5, tz);
  towerGroup.add(top);

  // Glass front at top
  const topGlassGeo = new THREE.BoxGeometry(0.1, 2.5, 6);
  disposables.push(topGlassGeo);
  const topGlass = new THREE.Mesh(topGlassGeo, glassMat);
  topGlass.position.set(tx - 5.05, 13.5, tz);
  towerGroup.add(topGlass);

  // Antenna
  const antGeo = new THREE.CylinderGeometry(0.05, 0.08, 4, 4);
  disposables.push(antGeo);
  const antMat = new THREE.MeshLambertMaterial({ color: 0x777777 });
  disposables.push(antMat);
  const ant = new THREE.Mesh(antGeo, antMat);
  ant.position.set(tx, 17, tz);
  towerGroup.add(ant);

  group.add(towerGroup);
}

// ── Tree ────────────────────────────────────────────────────────

function buildTree(
  group: THREE.Group, x: number, z: number,
  disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[]
) {
  const greens = [0x2d6a1e, 0x3a8028, 0x1f5515, 0x448B2F];
  const green = greens[Math.floor(Math.random() * greens.length)];
  const height = 2.5 + Math.random() * 2.5;

  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.22, height, 5);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1a });
  disposables.push(trunkGeo, trunkMat);

  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.set(x, height / 2, z);
  group.add(trunk);

  const foliageType = Math.random() > 0.4;
  const foliageGeo = foliageType
    ? new THREE.ConeGeometry(1.3 + Math.random() * 0.6, 3 + Math.random() * 1.5, 6)
    : new THREE.SphereGeometry(1.3 + Math.random() * 0.6, 6, 5);
  const foliageMat = new THREE.MeshLambertMaterial({ color: green });
  disposables.push(foliageGeo, foliageMat);

  const foliage = new THREE.Mesh(foliageGeo, foliageMat);
  foliage.position.set(x, height + 1.2, z);
  group.add(foliage);
}
