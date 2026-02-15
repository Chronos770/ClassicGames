// ═══════════════════════════════════════════════════════════════════
// Quest3DCharacters.ts — Custom-geometry humanoid characters
// Uses LatheGeometry, ExtrudeGeometry, Shape for organic forms
// ═══════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { createPS1Material, createTexturedMaterial, getCachedTexture } from './PS1Shader';

// Helper: place mesh without Object.assign (position/rotation read-only in r182)
function pm(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx?: number, ry?: number, rz?: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (rx !== undefined || ry !== undefined || rz !== undefined) m.rotation.set(rx ?? 0, ry ?? 0, rz ?? 0);
  return m;
}

// ── Custom Geometry Builders ────────────────────────────────────

/** Lathe a profile curve to make organic body parts.
 *  points = array of [radius, height] from bottom to top */
function latheShape(points: [number, number][], segs: number = 8): THREE.LatheGeometry {
  const vec2s = points.map(([r, h]) => new THREE.Vector2(r, h));
  return new THREE.LatheGeometry(vec2s, segs);
}

/** Extrude a 2D shape along Z for flat custom profiles (hair spikes, blades, etc.) */
function extrudeShape(shapePoints: [number, number][], depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(shapePoints[0][0], shapePoints[0][1]);
  for (let i = 1; i < shapePoints.length; i++) {
    shape.lineTo(shapePoints[i][0], shapePoints[i][1]);
  }
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
}

interface CharacterDef {
  name: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
  skinColor: number;
  clothesColor: number;
  clothesColor2?: number;
  pantsColor: number;
  shoeColor: number;
  hairColor: number;
  hairStyle: 'short' | 'long' | 'bald' | 'ponytail' | 'mohawk' | 'bun' | 'spiky';
  hatColor?: number;
  hatStyle?: 'flat' | 'pointy' | 'helmet' | 'hood';
  hasBeard?: boolean;
  beardStyle?: 'short' | 'long';
  accessory?: 'apron' | 'belt' | 'cape' | 'scarf' | 'bodysuit';
  accessoryColor?: number;
  heldItem?: 'sword' | 'staff' | 'basket' | 'broom' | 'shield' | 'greatsword';
  isFemale?: boolean;
  isProtagonist?: boolean;
}

const CHARACTERS: CharacterDef[] = [
  {
    name: 'hero', position: [0, 0, 2], rotation: Math.PI * 0.1, scale: 1.05,
    skinColor: 0xE8C4A0, clothesColor: 0x2244AA, clothesColor2: 0x3366CC, pantsColor: 0x222244, shoeColor: 0x332222,
    hairColor: 0xDD8822, hairStyle: 'spiky',
    accessory: 'belt', accessoryColor: 0x886622,
    heldItem: 'greatsword', isProtagonist: true,
  },
  {
    name: 'heroine', position: [14, 0, 0], rotation: Math.PI * 1.2, scale: 0.95,
    skinColor: 0xF0D0B0, clothesColor: 0x3355BB, clothesColor2: 0x4477DD, pantsColor: 0x3355BB, shoeColor: 0x334466,
    hairColor: 0x553388, hairStyle: 'long', isFemale: true,
    accessory: 'bodysuit', accessoryColor: 0x3355BB,
    isProtagonist: true,
  },
  {
    name: 'shopkeeper', position: [3, 0, 1], rotation: Math.PI * 0.75, scale: 1,
    skinColor: 0xD4A574, clothesColor: 0x8B6544, clothesColor2: 0xAA8866, pantsColor: 0x554433, shoeColor: 0x443322,
    hairColor: 0x443322, hairStyle: 'short', hasBeard: true, beardStyle: 'short',
    accessory: 'apron', accessoryColor: 0xDDCCAA,
  },
  {
    name: 'guard', position: [-6, 0, -8], rotation: 0, scale: 1.08,
    skinColor: 0xC8956C, clothesColor: 0x4466AA, clothesColor2: 0x5577BB, pantsColor: 0x334477, shoeColor: 0x333333,
    hairColor: 0x222222, hairStyle: 'short',
    hatColor: 0x888899, hatStyle: 'helmet',
    accessory: 'belt', accessoryColor: 0x664422,
    heldItem: 'sword',
  },
  {
    name: 'child', position: [1, 0, -1], rotation: Math.PI * 0.3, scale: 0.65,
    skinColor: 0xE8C4A0, clothesColor: 0xCC4444, clothesColor2: 0xDD6666, pantsColor: 0x4466AA, shoeColor: 0x553322,
    hairColor: 0xDD8833, hairStyle: 'ponytail', isFemale: true,
  },
  {
    name: 'elder', position: [-4, 0, 3], rotation: Math.PI * 0.5, scale: 0.92,
    skinColor: 0xBFA07A, clothesColor: 0x665544, clothesColor2: 0x776655, pantsColor: 0x443333, shoeColor: 0x332222,
    hairColor: 0xBBBBBB, hairStyle: 'bald', hasBeard: true, beardStyle: 'long',
    accessory: 'cape', accessoryColor: 0x554433,
    heldItem: 'staff',
  },
  {
    name: 'adventurer', position: [6, 0, -6], rotation: Math.PI * 1.2, scale: 1,
    skinColor: 0xD4A574, clothesColor: 0x446633, clothesColor2: 0x557744, pantsColor: 0x554422, shoeColor: 0x443311,
    hairColor: 0x663322, hairStyle: 'mohawk',
    accessory: 'belt', accessoryColor: 0x886622,
    hatColor: 0x558844, hatStyle: 'hood',
    heldItem: 'shield',
  },
  {
    name: 'maiden', position: [-2, 0, 5], rotation: Math.PI * 1.6, scale: 0.95,
    skinColor: 0xE8C4A0, clothesColor: 0x8855AA, clothesColor2: 0x9966BB, pantsColor: 0x8855AA, shoeColor: 0x443333,
    hairColor: 0x884422, hairStyle: 'long', isFemale: true,
    accessory: 'scarf', accessoryColor: 0xCC8844,
    heldItem: 'basket',
  },
  {
    name: 'blacksmith', position: [7.5, 0, 4.5], rotation: Math.PI * 1.0, scale: 1.1,
    skinColor: 0xBB8855, clothesColor: 0x554444, clothesColor2: 0x665555, pantsColor: 0x443333, shoeColor: 0x332222,
    hairColor: 0x222222, hairStyle: 'short', hasBeard: true, beardStyle: 'short',
    accessory: 'apron', accessoryColor: 0x665544,
  },
];

// ── Torso profile via LatheGeometry ─────────────────────────────

function makeTorsoGeo(isFemale: boolean): THREE.LatheGeometry {
  if (isFemale) {
    // Hourglass: narrow waist, wider chest and hips
    return latheShape([
      [0.14, 0],    // waist bottom
      [0.15, 0.05], // waist
      [0.12, 0.15], // narrow waist
      [0.13, 0.25], // ribs
      [0.17, 0.4],  // chest
      [0.16, 0.5],  // upper chest
      [0.12, 0.6],  // shoulders
      [0.08, 0.65], // neck base
    ], 10);
  }
  // Male: broader shoulders, straight/tapered
  return latheShape([
    [0.15, 0],    // waist bottom
    [0.16, 0.05], // waist
    [0.14, 0.15], // core
    [0.16, 0.3],  // ribs
    [0.19, 0.45], // chest
    [0.18, 0.55], // upper chest
    [0.14, 0.65], // shoulders
    [0.09, 0.7],  // neck base
  ], 10);
}

/** Thigh/calf profile via LatheGeometry */
function makeUpperLegGeo(): THREE.LatheGeometry {
  return latheShape([
    [0.055, 0],   // knee
    [0.065, 0.06],
    [0.08, 0.15], // mid thigh
    [0.085, 0.22],// upper thigh (widest)
    [0.07, 0.3],  // hip join
  ], 8);
}

function makeLowerLegGeo(): THREE.LatheGeometry {
  return latheShape([
    [0.04, 0],    // ankle
    [0.05, 0.05],
    [0.06, 0.12], // calf (widest)
    [0.055, 0.2],
    [0.05, 0.25], // knee
  ], 8);
}

/** Boot shape via LatheGeometry */
function makeBootGeo(): THREE.LatheGeometry {
  return latheShape([
    [0.05, 0],    // sole front
    [0.065, 0.02],// sole
    [0.06, 0.06], // ankle narrow
    [0.055, 0.1], // shaft
    [0.06, 0.15], // top flare
  ], 8);
}

/** Upper arm profile */
function makeUpperArmGeo(): THREE.LatheGeometry {
  return latheShape([
    [0.04, 0],
    [0.05, 0.05],
    [0.06, 0.12], // bicep
    [0.055, 0.2],
    [0.05, 0.28], // shoulder join
  ], 7);
}

function makeForearmGeo(): THREE.LatheGeometry {
  return latheShape([
    [0.035, 0],   // wrist
    [0.04, 0.04],
    [0.05, 0.1],  // forearm widest
    [0.045, 0.18],
    [0.04, 0.22], // elbow
  ], 7);
}

// ── Character Builder ───────────────────────────────────────────

function buildHumanoid(def: CharacterDef): THREE.Group {
  const group = new THREE.Group();
  const skin = createPS1Material(def.skinColor);
  const clothes = createPS1Material(def.clothesColor);
  const clothes2 = createPS1Material(def.clothesColor2 ?? def.clothesColor);
  const pantsMat = createPS1Material(def.pantsColor);
  const shoeMat = createPS1Material(def.shoeColor);
  const hairMat = createPS1Material(def.hairColor);

  // ── Head (slightly oval, not perfect sphere) ──
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.75;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), skin);
  head.scale.set(1, 1.05, 0.95); // slightly tall, slightly flat front-back
  headGroup.add(head);

  // Chin (adds jaw definition)
  const chin = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), skin);
  chin.position.set(0, -0.18, 0.08);
  chin.scale.set(1.2, 0.6, 0.8);
  headGroup.add(chin);

  // Eyebrows
  const browMat = createPS1Material(def.hairColor);
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.03), browMat);
    brow.position.set(side * 0.09, 0.1, 0.24);
    brow.rotation.z = side * -0.1;
    headGroup.add(brow);
  }

  // Eyes
  const eyeWhiteMat = createPS1Material(0xEEEEEE);
  const irisMat = createPS1Material(def.name === 'child' ? 0x4488AA : def.name === 'heroine' ? 0x3366AA : 0x445533);
  const pupilMat = createPS1Material(0x111111);

  for (const side of [-1, 1]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), eyeWhiteMat);
    white.position.set(side * 0.09, 0.03, 0.22);
    headGroup.add(white);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5), irisMat);
    iris.position.set(side * 0.09, 0.03, 0.25);
    headGroup.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.016, 5, 4), pupilMat);
    pupil.position.set(side * 0.09, 0.03, 0.265);
    headGroup.add(pupil);
    // Eyelid
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.052, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.35), skin);
    lid.position.set(side * 0.09, 0.03, 0.22);
    lid.scale.y = 0.01;
    lid.userData.isEyelid = true;
    headGroup.add(lid);
  }

  // Nose (custom shape - bridge + tip)
  const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.06, 0.04), skin);
  noseBridge.position.set(0, 0.01, 0.27);
  headGroup.add(noseBridge);
  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), skin);
  noseTip.position.set(0, -0.02, 0.29);
  headGroup.add(noseTip);

  // Mouth
  headGroup.add(pm(new THREE.BoxGeometry(0.08, 0.015, 0.01), createPS1Material(0x995544), 0, -0.09, 0.26));
  // Lips (slightly fuller shape)
  const lipMat = createPS1Material(def.isFemale ? 0xBB6655 : 0x996655);
  const upperLip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 3), lipMat);
  upperLip.scale.set(1.2, 0.3, 0.4);
  upperLip.position.set(0, -0.08, 0.265);
  headGroup.add(upperLip);

  // Ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), skin);
    ear.position.set(side * 0.26, 0.02, 0);
    ear.scale.set(0.4, 0.8, 0.6);
    headGroup.add(ear);
  }

  // Hair
  buildHair(headGroup, def.hairStyle, hairMat, def.isFemale, def.skinColor);

  // Beard
  if (def.hasBeard) buildBeard(headGroup, def.beardStyle ?? 'short', hairMat);

  // Hat
  if (def.hatColor && def.hatStyle) buildHat(headGroup, def.hatStyle, createPS1Material(def.hatColor));

  group.add(headGroup);

  // ── Neck ──
  const neck = new THREE.Mesh(latheShape([[0.06, 0], [0.07, 0.05], [0.08, 0.1]], 8), skin);
  neck.position.set(0, 1.55, 0);
  group.add(neck);

  // ── Torso (custom lathe profile) ──
  const torsoGeo = makeTorsoGeo(!!def.isFemale);
  const torso = new THREE.Mesh(torsoGeo, clothes);
  torso.position.set(0, 0.82, 0);
  group.add(torso);

  // Collar detail
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 5, 10), clothes2);
  collar.position.set(0, 1.48, 0);
  collar.rotation.x = Math.PI / 2;
  group.add(collar);

  // Buttons
  const btnMat = createPS1Material(0xCCBB88);
  for (let i = 0; i < 3; i++) {
    group.add(pm(new THREE.SphereGeometry(0.015, 5, 4), btnMat, 0, 1.35 - i * 0.12, 0.15));
  }

  // Accessory
  if (def.accessory && def.accessoryColor) {
    buildAccessory(group, def.accessory, createPS1Material(def.accessoryColor), def);
  }

  // ── Shoulders (sphere joints) ──
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), clothes);
    shoulder.position.set(side * 0.28, 1.42, 0);
    group.add(shoulder);
  }

  // ── Arms (custom lathe profiles) ──
  const armMeshes: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    // Upper arm
    const upper = new THREE.Mesh(makeUpperArmGeo(), clothes);
    upper.position.set(side * 0.32, 1.12, 0);
    group.add(upper);
    armMeshes.push(upper);

    // Elbow joint
    group.add(pm(new THREE.SphereGeometry(0.045, 6, 5), clothes, side * 0.32, 1.12, 0));

    // Sleeve cuff
    group.add(pm(new THREE.TorusGeometry(0.05, 0.012, 5, 8), clothes2, side * 0.32, 1.08, 0, Math.PI / 2));

    // Forearm
    const forearm = new THREE.Mesh(makeForearmGeo(), skin);
    forearm.position.set(side * 0.32, 0.85, 0);
    group.add(forearm);

    // Wrist
    group.add(pm(new THREE.SphereGeometry(0.035, 6, 5), skin, side * 0.32, 0.85, 0));

    // Hand (flattened sphere for palm shape)
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), skin);
    hand.scale.set(0.9, 0.7, 1.1);
    hand.position.set(side * 0.32, 0.72, 0);
    group.add(hand);

    // Fingers (tapered cylinders)
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.008, 0.06, 5), skin);
      const angle = ((f - 1.5) / 3) * 0.7;
      finger.position.set(
        side * 0.32 + Math.sin(angle) * 0.04,
        0.665, Math.cos(angle) * 0.04
      );
      finger.rotation.x = 0.3;
      group.add(finger);
    }
    // Thumb
    const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.01, 0.045, 5), skin);
    thumb.position.set(side * (0.32 + side * 0.04), 0.7, 0.035);
    thumb.rotation.z = side * 0.5;
    group.add(thumb);
  }

  // ── Hip area (smooth transition) ──
  const hipGeo = latheShape([
    [0.13, 0], [0.15, 0.04], [0.14, 0.08], [0.12, 0.12]
  ], 10);
  group.add(pm(new THREE.Mesh(hipGeo, pantsMat).geometry, pantsMat, 0, 0.72, 0));

  // ── Legs (custom lathe profiles) ──
  for (const side of [-1, 1]) {
    // Upper leg
    const upperLeg = new THREE.Mesh(makeUpperLegGeo(), pantsMat);
    upperLeg.position.set(side * 0.1, 0.42, 0);
    group.add(upperLeg);

    // Knee joint
    group.add(pm(new THREE.SphereGeometry(0.055, 6, 5), pantsMat, side * 0.1, 0.42, 0));

    // Lower leg
    const lowerLeg = new THREE.Mesh(makeLowerLegGeo(), pantsMat);
    lowerLeg.position.set(side * 0.1, 0.17, 0);
    group.add(lowerLeg);

    // Boot (custom lathe)
    const boot = new THREE.Mesh(makeBootGeo(), shoeMat);
    boot.position.set(side * 0.1, 0.02, 0);
    group.add(boot);

    // Boot toe (extends forward for shape)
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), shoeMat);
    toe.scale.set(0.8, 0.4, 1.5);
    toe.position.set(side * 0.1, 0.03, 0.06);
    group.add(toe);

    // Boot sole
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, 0.16), createPS1Material(def.shoeColor - 0x111111));
    sole.position.set(side * 0.1, 0.01, 0.02);
    group.add(sole);
  }

  // ── Held Item ──
  if (def.heldItem) buildHeldItem(group, def.heldItem);

  // Elder lean
  if (def.name === 'elder') group.rotation.x = 0.08;

  group.scale.setScalar(def.scale);
  group.position.set(...def.position);
  group.rotation.y = def.rotation;

  group.userData.headGroup = headGroup;
  group.userData.armMeshes = armMeshes;

  return group;
}

// ── Hair (custom extruded shapes for spikes) ────────────────────

function buildHair(g: THREE.Group, style: string, mat: THREE.MeshLambertMaterial, isFemale?: boolean, skinColor?: number): void {
  switch (style) {
    case 'short': {
      // Fitted cap shape
      g.add(pm(new THREE.SphereGeometry(0.3, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.55), mat, 0, 0.02, 0));
      // Side texture
      for (const s of [-1, 1]) {
        const sb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.08), mat);
        sb.position.set(s * 0.24, -0.06, 0.1);
        g.add(sb);
      }
      break;
    }
    case 'long': {
      // Top cap
      g.add(pm(new THREE.SphereGeometry(0.31, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.55), mat, 0, 0.02, 0));

      // Back cascade — extruded custom shape for flowing hair
      const backShape = extrudeShape([
        [-0.22, 0], [-0.24, -0.15], [-0.22, -0.35], [-0.18, -0.5],
        [-0.12, -0.6], [0, -0.65],
        [0.12, -0.6], [0.18, -0.5], [0.22, -0.35], [0.24, -0.15], [0.22, 0]
      ], 0.12);
      const backHair = new THREE.Mesh(backShape, mat);
      backHair.position.set(0, 0.05, -0.25);
      g.add(backHair);

      // Side strands
      for (const s of [-1, 1]) {
        const strand = new THREE.Mesh(
          latheShape([[0.03, 0], [0.04, 0.1], [0.035, 0.25], [0.02, 0.4]], 6),
          mat
        );
        strand.position.set(s * 0.22, -0.3, 0.05);
        strand.rotation.z = s * 0.15;
        g.add(strand);
      }

      // Bangs
      if (isFemale) {
        // Swept bangs (custom extruded)
        const bangShape = extrudeShape([
          [-0.2, 0], [-0.22, 0.04], [0, 0.06], [0.22, 0.04], [0.2, 0]
        ], 0.08);
        const bangs = new THREE.Mesh(bangShape, mat);
        bangs.position.set(0, 0.16, 0.2);
        g.add(bangs);
      }
      break;
    }
    case 'bald': {
      // Just wisps on sides
      for (const s of [-1, 1]) {
        g.add(pm(new THREE.BoxGeometry(0.05, 0.08, 0.18), mat, s * 0.24, -0.02, -0.02));
      }
      break;
    }
    case 'ponytail': {
      g.add(pm(new THREE.SphereGeometry(0.3, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.5), mat, 0, 0.03, 0));
      // Bangs
      const bangGeo = extrudeShape([[-0.18, 0], [0, 0.05], [0.18, 0], [0, -0.02]], 0.07);
      const bangs = new THREE.Mesh(bangGeo, mat);
      bangs.position.set(0, 0.18, 0.2);
      g.add(bangs);
      // Tail (tapered via lathe)
      const tail = new THREE.Mesh(
        latheShape([[0.06, 0], [0.055, 0.08], [0.04, 0.2], [0.025, 0.35], [0.01, 0.45]], 7),
        mat
      );
      tail.position.set(0, -0.12, -0.26);
      tail.rotation.x = 0.5;
      g.add(tail);
      // Hair tie
      g.add(pm(new THREE.TorusGeometry(0.06, 0.015, 5, 8), createPS1Material(0xCC3333), 0, 0.04, -0.26, Math.PI / 2));
      break;
    }
    case 'mohawk': {
      // Ridge of extruded triangles
      for (let i = 0; i < 7; i++) {
        const h = 0.12 + i * 0.015;
        const spikeGeo = extrudeShape([[0, 0], [-0.03, 0], [0, h]], 0.06);
        const spike = new THREE.Mesh(spikeGeo, mat);
        spike.position.set(-0.03, 0.2 + i * 0.01, -0.18 + i * 0.06);
        g.add(spike);
      }
      // Shaved sides
      for (const s of [-1, 1]) {
        const shaved = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.4), createPS1Material((skinColor ?? 0xD4A574) - 0x080808));
        shaved.position.set(s * 0.18, 0.03, 0);
        shaved.scale.set(0.5, 0.6, 0.8);
        g.add(shaved);
      }
      break;
    }
    case 'spiky': {
      // Base cap
      g.add(pm(new THREE.SphereGeometry(0.3, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.5), mat, 0, 0.03, 0));

      // Large dramatic spikes using ExtrudeGeometry — swept back and upward
      const spikeProfile: [number, number][] = [
        [0, 0], [-0.04, 0.02], [-0.05, 0.15], [-0.03, 0.35], [0, 0.5], [0.03, 0.35], [0.05, 0.15], [0.04, 0.02]
      ];

      // Main crown spikes (5 big ones, swept backward)
      const mainAngles = [-0.6, -0.3, 0, 0.3, 0.6];
      for (let i = 0; i < mainAngles.length; i++) {
        const a = mainAngles[i];
        const spikeGeo = extrudeShape(spikeProfile, 0.04);
        const spike = new THREE.Mesh(spikeGeo, mat);
        spike.position.set(Math.sin(a) * 0.12, 0.22, -0.05 + Math.cos(a) * 0.08);
        // Tilt backward and outward
        spike.rotation.set(-0.4, a * 0.3, a * 0.5);
        g.add(spike);
      }

      // Side spikes (2 per side, swept outward + backward)
      for (const s of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const sideGeo = extrudeShape([
            [0, 0], [-0.035, 0.01], [-0.04, 0.12], [-0.02, 0.3], [0, 0.4],
            [0.02, 0.3], [0.04, 0.12], [0.035, 0.01]
          ], 0.035);
          const spike = new THREE.Mesh(sideGeo, mat);
          spike.position.set(s * (0.2 + i * 0.06), 0.1 + i * 0.06, -0.05);
          spike.rotation.set(-0.3, s * 0.4, s * (0.6 + i * 0.3));
          g.add(spike);
        }
      }

      // Front bangs — two thick swept strands
      for (const s of [-1, 1]) {
        const bangGeo = extrudeShape([
          [0, 0], [-0.03, 0.02], [-0.035, 0.1], [-0.02, 0.2], [0, 0.25],
          [0.02, 0.2], [0.035, 0.1], [0.03, 0.02]
        ], 0.04);
        const bang = new THREE.Mesh(bangGeo, mat);
        bang.position.set(s * 0.1, 0.12, 0.22);
        bang.rotation.set(0.5, s * 0.1, s * 0.2);
        g.add(bang);
      }

      // Top center spike (tallest)
      const topGeo = extrudeShape([
        [0, 0], [-0.05, 0.02], [-0.06, 0.2], [-0.035, 0.45], [0, 0.6],
        [0.035, 0.45], [0.06, 0.2], [0.05, 0.02]
      ], 0.045);
      const topSpike = new THREE.Mesh(topGeo, mat);
      topSpike.position.set(-0.02, 0.25, -0.08);
      topSpike.rotation.set(-0.35, 0, 0);
      g.add(topSpike);

      break;
    }
    case 'bun': {
      g.add(pm(new THREE.SphereGeometry(0.31, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.55), mat, 0, 0.02, 0));
      g.add(pm(new THREE.SphereGeometry(0.12, 7, 6), mat, 0, 0.12, -0.24));
      // Hair stick
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 5), createPS1Material(0xCCAA44));
      stick.position.set(0.04, 0.18, -0.24);
      stick.rotation.set(0.4, 0, 0.3);
      g.add(stick);
      break;
    }
  }
}

// ── Beard ───────────────────────────────────────────────────────

function buildBeard(g: THREE.Group, style: string, mat: THREE.MeshLambertMaterial): void {
  if (style === 'short') {
    // Stubble shape (custom extruded jaw)
    const beardGeo = extrudeShape([
      [-0.1, 0], [-0.11, -0.06], [-0.08, -0.1], [0, -0.12],
      [0.08, -0.1], [0.11, -0.06], [0.1, 0]
    ], 0.1);
    const beard = new THREE.Mesh(beardGeo, mat);
    beard.position.set(0, -0.1, 0.14);
    g.add(beard);
    // Mustache
    g.add(pm(new THREE.BoxGeometry(0.14, 0.025, 0.04), mat, 0, -0.05, 0.26));
  } else {
    // Long beard (extruded flowing shape)
    const beardGeo = extrudeShape([
      [-0.11, 0], [-0.12, -0.08], [-0.1, -0.18], [-0.06, -0.28],
      [0, -0.35], [0.06, -0.28], [0.1, -0.18], [0.12, -0.08], [0.11, 0]
    ], 0.1);
    const beard = new THREE.Mesh(beardGeo, mat);
    beard.position.set(0, -0.08, 0.12);
    g.add(beard);
    // Mustache
    g.add(pm(new THREE.BoxGeometry(0.16, 0.03, 0.04), mat, 0, -0.05, 0.26));
  }
}

// ── Hats ────────────────────────────────────────────────────────

function buildHat(g: THREE.Group, style: string, mat: THREE.MeshLambertMaterial): void {
  switch (style) {
    case 'flat': {
      // Brim (torus for rounded edge)
      g.add(pm(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 12), mat, 0, 0.28, 0));
      const crown = new THREE.Mesh(latheShape([[0.2, 0], [0.21, 0.05], [0.2, 0.1], [0.19, 0.12]], 10), mat);
      crown.position.set(0, 0.28, 0);
      g.add(crown);
      g.add(pm(new THREE.TorusGeometry(0.21, 0.012, 5, 10), createPS1Material(0x664422), 0, 0.3, 0, Math.PI / 2));
      break;
    }
    case 'pointy': {
      const wizGeo = latheShape([[0.3, 0], [0.2, 0.05], [0.16, 0.15], [0.1, 0.3], [0.04, 0.45], [0.01, 0.55]], 8);
      g.add(pm(new THREE.Mesh(wizGeo, mat).geometry, mat, 0, 0.25, 0));
      break;
    }
    case 'helmet': {
      g.add(pm(new THREE.SphereGeometry(0.32, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.6), mat, 0, 0.02, 0));
      // Visor
      g.add(pm(new THREE.BoxGeometry(0.58, 0.035, 0.1), mat, 0, 0.1, 0.24));
      // Nose guard
      g.add(pm(new THREE.BoxGeometry(0.035, 0.14, 0.05), mat, 0, 0.03, 0.3));
      // Crest (extruded fin)
      const crestGeo = extrudeShape([[0, 0], [-0.15, 0.06], [0, 0.12], [0.15, 0.06]], 0.03);
      const crest = new THREE.Mesh(crestGeo, createPS1Material(0xCC3333));
      crest.position.set(-0.015, 0.22, -0.05);
      crest.rotation.y = Math.PI / 2;
      g.add(crest);
      break;
    }
    case 'hood': {
      g.add(pm(new THREE.SphereGeometry(0.34, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.65), mat, 0, 0.01, -0.02));
      // Hood drape
      const drapeGeo = extrudeShape([
        [-0.18, 0], [-0.2, -0.1], [-0.15, -0.22], [0, -0.28],
        [0.15, -0.22], [0.2, -0.1], [0.18, 0]
      ], 0.08);
      const drape = new THREE.Mesh(drapeGeo, mat);
      drape.position.set(0, 0.02, -0.22);
      g.add(drape);
      // Hood peak
      g.add(pm(new THREE.BoxGeometry(0.12, 0.04, 0.1), mat, 0, 0.2, 0.26));
      break;
    }
  }
}

// ── Accessories ─────────────────────────────────────────────────

function buildAccessory(group: THREE.Group, type: string, mat: THREE.MeshLambertMaterial, _def: CharacterDef): void {
  switch (type) {
    case 'apron': {
      // Apron front panel (extruded shape)
      const apronGeo = extrudeShape([
        [-0.2, 0], [-0.22, 0.15], [-0.2, 0.35], [-0.15, 0.5],
        [0.15, 0.5], [0.2, 0.35], [0.22, 0.15], [0.2, 0]
      ], 0.02);
      const apron = new THREE.Mesh(apronGeo, mat);
      apron.position.set(0, 0.72, 0.15);
      group.add(apron);
      // Straps
      for (const s of [-1, 1]) {
        group.add(pm(new THREE.BoxGeometry(0.03, 0.2, 0.02), mat, s * 0.12, 1.32, 0.16));
      }
      break;
    }
    case 'belt': {
      group.add(pm(new THREE.TorusGeometry(0.16, 0.02, 6, 12), mat, 0, 0.82, 0, Math.PI / 2));
      // Buckle
      group.add(pm(new THREE.BoxGeometry(0.08, 0.07, 0.02), createPS1Material(0xCCAA44), 0, 0.82, 0.17));
      // Pouch (small bag shape)
      const pouch = new THREE.Mesh(latheShape([[0.04, 0], [0.05, 0.02], [0.045, 0.06], [0.03, 0.08]], 6), createPS1Material(0x664422));
      pouch.position.set(-0.18, 0.76, 0.12);
      group.add(pouch);
      break;
    }
    case 'cape': {
      const capeGeo = extrudeShape([
        [-0.26, 0], [-0.28, -0.2], [-0.25, -0.5], [-0.2, -0.75],
        [0, -0.85], [0.2, -0.75], [0.25, -0.5], [0.28, -0.2], [0.26, 0]
      ], 0.04);
      const cape = new THREE.Mesh(capeGeo, mat);
      cape.position.set(0, 1.42, -0.18);
      group.add(cape);
      // Clasp
      group.add(pm(new THREE.SphereGeometry(0.025, 5, 4), createPS1Material(0xCCAA44), 0, 1.44, -0.12));
      break;
    }
    case 'scarf': {
      group.add(pm(new THREE.TorusGeometry(0.12, 0.025, 6, 10), mat, 0, 1.5, 0, Math.PI / 2));
      // Hanging end
      const scarfEnd = new THREE.Mesh(
        latheShape([[0.03, 0], [0.035, 0.05], [0.03, 0.15], [0.02, 0.25], [0.01, 0.3]], 6),
        mat
      );
      scarfEnd.position.set(0.1, 1.2, 0.12);
      group.add(scarfEnd);
      break;
    }
    case 'bodysuit': {
      const accentMat = createPS1Material((_def.accessoryColor ?? 0x3355BB) + 0x222222);
      // Accent lines along limbs and torso
      group.add(pm(new THREE.BoxGeometry(0.025, 0.55, 0.02), accentMat, 0, 1.1, 0.16));
      // Waist band
      group.add(pm(new THREE.TorusGeometry(0.14, 0.012, 5, 10), accentMat, 0, 0.84, 0, Math.PI / 2));
      // Arm stripes
      for (const s of [-1, 1]) {
        group.add(pm(new THREE.BoxGeometry(0.015, 0.25, 0.015), accentMat, s * 0.32, 1.22, 0.05));
      }
      // Collar detail
      group.add(pm(new THREE.TorusGeometry(0.1, 0.015, 5, 10), accentMat, 0, 1.5, 0, Math.PI / 2));
      break;
    }
  }
}

// ── Held Items ──────────────────────────────────────────────────

function buildHeldItem(group: THREE.Group, item: string): void {
  switch (item) {
    case 'sword': {
      const sGroup = new THREE.Group();
      // Blade (extruded custom shape for taper)
      const bladeGeo = extrudeShape([
        [0, 0], [-0.02, 0.02], [-0.02, 0.6], [-0.01, 0.68], [0, 0.72],
        [0.01, 0.68], [0.02, 0.6], [0.02, 0.02]
      ], 0.015);
      sGroup.add(pm(new THREE.Mesh(bladeGeo, createPS1Material(0xBBBBCC)).geometry, createPS1Material(0xBBBBCC), 0, 0, 0));
      // Guard
      sGroup.add(pm(new THREE.BoxGeometry(0.16, 0.035, 0.05), createPS1Material(0xAA8833), 0, 0, 0));
      // Handle
      sGroup.add(pm(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6), createPS1Material(0x553322), 0, -0.09, 0));
      // Pommel
      sGroup.add(pm(new THREE.SphereGeometry(0.025, 6, 5), createPS1Material(0xAA8833), 0, -0.17, 0));
      sGroup.position.set(-0.42, 0.72, 0.08);
      sGroup.rotation.z = 0.12;
      group.add(sGroup);
      break;
    }
    case 'greatsword': {
      const sGroup = new THREE.Group();
      const bladeMat = createPS1Material(0xCCCCDD);
      const edgeMat = createPS1Material(0xEEEEFF, { emissive: 0x111122 });
      // Blade (extruded wide taper shape)
      const bladeGeo = extrudeShape([
        [0, 0], [-0.06, 0.03], [-0.06, 0.9], [-0.04, 1.05], [-0.01, 1.15], [0, 1.2],
        [0.01, 1.15], [0.04, 1.05], [0.06, 0.9], [0.06, 0.03]
      ], 0.02);
      sGroup.add(pm(new THREE.Mesh(bladeGeo, bladeMat).geometry, bladeMat, -0.01, 0, -0.01));
      // Edge glow
      sGroup.add(pm(new THREE.BoxGeometry(0.01, 1.0, 0.025), edgeMat, 0.06, 0.5, 0));
      sGroup.add(pm(new THREE.BoxGeometry(0.01, 1.0, 0.025), edgeMat, -0.06, 0.5, 0));
      // Fuller (groove)
      sGroup.add(pm(new THREE.BoxGeometry(0.025, 0.7, 0.025), createPS1Material(0xAAAABB), 0, 0.45, 0));
      // Cross guard (ornate curved)
      sGroup.add(pm(new THREE.BoxGeometry(0.28, 0.05, 0.05), createPS1Material(0xBB9933), 0, 0, 0));
      for (const s of [-1, 1]) {
        sGroup.add(pm(new THREE.SphereGeometry(0.03, 6, 5), createPS1Material(0xCC9933), s * 0.15, 0, 0));
      }
      // Handle
      sGroup.add(pm(new THREE.CylinderGeometry(0.03, 0.025, 0.2, 7), createPS1Material(0x442211), 0, -0.12, 0));
      // Handle wraps
      for (let i = 0; i < 5; i++) {
        sGroup.add(pm(new THREE.TorusGeometry(0.032, 0.006, 4, 8), createPS1Material(0x553322), 0, -0.05 + i * 0.04, 0, Math.PI / 2));
      }
      // Pommel
      sGroup.add(pm(new THREE.SphereGeometry(0.04, 7, 6), createPS1Material(0xBB9933), 0, -0.25, 0));
      sGroup.add(pm(new THREE.SphereGeometry(0.018, 5, 4), createPS1Material(0x4444CC, { emissive: 0x222266 }), 0, -0.25, 0.035));

      sGroup.position.set(-0.45, 0.72, 0.1);
      sGroup.rotation.z = 0.08;
      group.add(sGroup);
      break;
    }
    case 'staff': {
      const staffGeo = latheShape([[0.025, 0], [0.028, 0.3], [0.03, 0.9], [0.028, 1.5], [0.022, 1.75], [0.015, 1.8]], 7);
      const staff = new THREE.Mesh(staffGeo, createPS1Material(0x664422));
      staff.position.set(0.42, 0.1, 0.08);
      group.add(staff);
      // Crystal
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), createPS1Material(0x44AADD, { emissive: 0x224466 }));
      crystal.position.set(0.42, 1.95, 0.08);
      group.add(crystal);
      break;
    }
    case 'basket': {
      const bGroup = new THREE.Group();
      const basketGeo = latheShape([[0.1, 0], [0.13, 0.03], [0.14, 0.1], [0.13, 0.18], [0.12, 0.2]], 8);
      bGroup.add(pm(new THREE.Mesh(basketGeo, createPS1Material(0xBB9955)).geometry, createPS1Material(0xBB9955), 0, 0, 0));
      // Handle
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 5, 10, Math.PI), createPS1Material(0xBB9955));
      handle.position.set(0, 0.1, 0);
      bGroup.add(handle);
      // Flowers
      const fc = [0xDD4466, 0xFFCC44, 0xDD88CC];
      for (let i = 0; i < 3; i++) {
        bGroup.add(pm(new THREE.SphereGeometry(0.035, 5, 4), createPS1Material(fc[i]), (i - 1) * 0.05, 0.14, (i - 1) * 0.03));
      }
      bGroup.position.set(0.42, 0.8, 0.08);
      group.add(bGroup);
      break;
    }
    case 'broom': {
      const hGeo = latheShape([[0.015, 0], [0.018, 0.5], [0.016, 1.2], [0.012, 1.5]], 6);
      const bHandle = new THREE.Mesh(hGeo, createPS1Material(0x886644));
      bHandle.position.set(0.42, 0.1, 0.08);
      group.add(bHandle);
      for (let i = 0; i < 5; i++) {
        const bristle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.004, 0.2, 4), createPS1Material(0xBBAA66));
        bristle.position.set(0.42 + (i - 2) * 0.02, 0.18, 0.08);
        bristle.rotation.z = (i - 2) * 0.05;
        group.add(bristle);
      }
      break;
    }
    case 'shield': {
      const sGroup = new THREE.Group();
      // Shield body (lathe for curved surface)
      const shieldGeo = latheShape([[0, 0], [0.1, 0.01], [0.18, 0.02], [0.22, 0.025], [0.24, 0.02]], 8);
      sGroup.add(pm(new THREE.Mesh(shieldGeo, createPS1Material(0x664422)).geometry, createPS1Material(0x664422), 0, 0, 0, Math.PI / 2));
      // Boss
      sGroup.add(pm(new THREE.SphereGeometry(0.05, 6, 5), createPS1Material(0xAA8833), 0, 0, 0.03));
      // Cross
      sGroup.add(pm(new THREE.BoxGeometry(0.035, 0.3, 0.01), createPS1Material(0xCC3333), 0, 0, 0.025));
      sGroup.add(pm(new THREE.BoxGeometry(0.25, 0.035, 0.01), createPS1Material(0xCC3333), 0, 0, 0.025));
      sGroup.position.set(-0.45, 1.0, -0.05);
      group.add(sGroup);
      break;
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// ENHANCED HERO — Procedural textures + detailed geometry
// ══════════════════════════════════════════════════════════════════

// ── Canvas/Texture Helpers ────────────────────────────────────

function _mkCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}

function _canTex(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

function _hx(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xFF, (hex >> 8) & 0xFF, hex & 0xFF];
}

function _c(r: number, g: number, b: number): string {
  return `rgb(${Math.max(0, Math.min(255, ~~r))},${Math.max(0, Math.min(255, ~~g))},${Math.max(0, Math.min(255, ~~b))})`;
}

// ── Character Texture Generators ──────────────────────────────

function genSkinTexture(base: number): THREE.CanvasTexture {
  const [c, ctx] = _mkCanvas(16, 16);
  const [r, g, b] = _hx(base);
  ctx.fillStyle = _c(r, g, b);
  ctx.fillRect(0, 0, 16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = (Math.random() - 0.5) * 12;
      ctx.fillStyle = _c(r + n + 2, g + n, b + n - 2);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  for (let y = 12; y < 16; y++) {
    ctx.fillStyle = `rgba(0,0,0,${(y - 11) * 0.02})`;
    ctx.fillRect(0, y, 16, 1);
  }
  return _canTex(c);
}

function genClothTexture(base: number, variant: 'tunic' | 'pants' = 'tunic'): THREE.CanvasTexture {
  const [c, ctx] = _mkCanvas(32, 32);
  const [r, g, b] = _hx(base);
  ctx.fillStyle = _c(r, g, b);
  ctx.fillRect(0, 0, 32, 32);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const weave = ((x + y) % 2 === 0) ? 4 : -3;
      const noise = (Math.random() - 0.5) * 6;
      ctx.fillStyle = _c(r + weave + noise, g + weave + noise, b + weave + noise);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  if (variant === 'tunic') {
    ctx.strokeStyle = _c(r - 18, g - 18, b - 18);
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(4 + i * 10, 0);
      ctx.lineTo(8 + i * 10, 32);
      ctx.stroke();
    }
    ctx.strokeStyle = _c(r - 12, g - 12, b - 12);
    ctx.beginPath();
    ctx.moveTo(16, 0); ctx.lineTo(16, 32);
    ctx.stroke();
    ctx.fillStyle = _c(r + 15, g + 15, b + 15);
    ctx.fillRect(0, 4, 32, 2);
  } else {
    for (let y = 0; y < 32; y += 4) {
      ctx.fillStyle = _c(r - 5, g - 5, b - 5);
      ctx.fillRect(0, y, 32, 1);
    }
  }
  return _canTex(c);
}

function genLeatherTexture(base: number): THREE.CanvasTexture {
  const [c, ctx] = _mkCanvas(16, 16);
  const [r, g, b] = _hx(base);
  ctx.fillStyle = _c(r, g, b);
  ctx.fillRect(0, 0, 16, 16);
  for (let i = 0; i < 30; i++) {
    const lx = Math.random() * 16, ly = Math.random() * 16;
    ctx.fillStyle = _c(r - 10 - Math.random() * 10, g - 10 - Math.random() * 10, b - 10 - Math.random() * 10);
    ctx.fillRect(lx, ly, 1, 1);
  }
  ctx.strokeStyle = _c(r - 20, g - 20, b - 20);
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 4 + i * 5);
    ctx.lineTo(16, 5 + i * 5);
    ctx.stroke();
  }
  ctx.fillStyle = _c(r + 12, g + 10, b + 5);
  ctx.fillRect(2, 2, 12, 1);
  return _canTex(c);
}

function genMetalTexture(base: number): THREE.CanvasTexture {
  const [c, ctx] = _mkCanvas(16, 64);
  const [r, g, b] = _hx(base);
  ctx.fillStyle = _c(r, g, b);
  ctx.fillRect(0, 0, 16, 64);
  for (let x = 0; x < 16; x++) {
    const v = (Math.random() - 0.5) * 15;
    ctx.fillStyle = _c(r + v, g + v, b + v);
    ctx.fillRect(x, 0, 1, 64);
  }
  for (let y = 20; y < 28; y++) {
    const brightness = 30 - Math.abs(y - 24) * 6;
    ctx.fillStyle = _c(r + brightness, g + brightness, b + brightness);
    ctx.fillRect(0, y, 16, 1);
  }
  ctx.fillStyle = _c(r - 25, g - 25, b - 25);
  ctx.fillRect(0, 0, 16, 2);
  ctx.fillRect(0, 62, 16, 2);
  return _canTex(c);
}

function genHairTexture(base: number): THREE.CanvasTexture {
  const [c, ctx] = _mkCanvas(16, 32);
  const [r, g, b] = _hx(base);
  ctx.fillStyle = _c(r, g, b);
  ctx.fillRect(0, 0, 16, 32);
  for (let x = 0; x < 16; x++) {
    const strand = ((x % 3) === 0) ? -12 : ((x % 3) === 1) ? 8 : 0;
    const noise = (Math.random() - 0.5) * 10;
    ctx.fillStyle = _c(r + strand + noise, g + strand + noise, b + strand + noise);
    ctx.fillRect(x, 0, 1, 32);
  }
  for (let y = 8; y < 13; y++) {
    const hl = 20 - Math.abs(y - 10) * 5;
    ctx.fillStyle = `rgba(255,255,200,${hl / 255})`;
    ctx.fillRect(0, y, 16, 1);
  }
  for (let y = 26; y < 32; y++) {
    ctx.fillStyle = `rgba(0,0,0,${(y - 25) * 0.03})`;
    ctx.fillRect(0, y, 16, 1);
  }
  return _canTex(c);
}

// ── Enhanced Hair Spike Generator ─────────────────────────────

function makeHairSpikeGeo(length: number, baseRadius: number, segments: number = 8): THREE.LatheGeometry {
  const pts: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const belly = 1 + 0.25 * Math.sin(t * Math.PI * 0.8);
    const taper = 1 - t * t;
    pts.push([Math.max(0.001, baseRadius * belly * taper), t * length]);
  }
  pts.push([0.001, length * 1.02]);
  return latheShape(pts, 5);
}

// ── Enhanced Hero Builder ─────────────────────────────────────

function buildEnhancedHero(def: CharacterDef): THREE.Group {
  const group = new THREE.Group();

  // ── Generate & cache procedural textures ──
  const skinTex = getCachedTexture('hero-skin', () => genSkinTexture(def.skinColor));
  const clothTex = getCachedTexture('hero-cloth', () => genClothTexture(def.clothesColor, 'tunic'));
  const cloth2Tex = getCachedTexture('hero-cloth2', () => genClothTexture(def.clothesColor2 ?? def.clothesColor, 'tunic'));
  const pantsTex = getCachedTexture('hero-pants', () => genClothTexture(def.pantsColor, 'pants'));
  const leatherTex = getCachedTexture('hero-leather', () => genLeatherTexture(def.shoeColor));
  const hairTex = getCachedTexture('hero-hair', () => genHairTexture(def.hairColor));
  const metalTex = getCachedTexture('hero-metal', () => genMetalTexture(0xCCCCDD));

  // ── Create textured materials ──
  const skin = createTexturedMaterial(skinTex, 2, 2);
  const clothes = createTexturedMaterial(clothTex, 3, 3);
  const clothes2 = createTexturedMaterial(cloth2Tex, 3, 3);
  const pantsMat = createTexturedMaterial(pantsTex, 2, 3);
  const shoeMat = createTexturedMaterial(leatherTex, 2, 2);
  const hairMat = createTexturedMaterial(hairTex, 1, 1);
  const hairHL = createTexturedMaterial(
    getCachedTexture('hero-hair-hl', () => genHairTexture(def.hairColor + 0x222200)), 1, 1
  );
  const metalMat = createTexturedMaterial(metalTex, 1, 2);
  const beltMat = createTexturedMaterial(
    getCachedTexture('hero-belt', () => genLeatherTexture(def.accessoryColor ?? 0x886622)), 2, 2
  );

  // Flat materials for small details
  const eyeWhiteMat = createPS1Material(0xEEEEEE);
  const irisMat = createPS1Material(0x445533);
  const pupilMat = createPS1Material(0x111111);
  const browMat = createPS1Material(def.hairColor - 0x111100);
  const lipMat = createPS1Material(0x996655);
  const goldMat = createPS1Material(0xCCAA44);
  const darkLeather = createPS1Material((def.shoeColor) - 0x111111);

  // ══════════════════════════════════════════════════════════════
  // HEAD — Enhanced with brow ridge, cheekbones, jawline
  // ══════════════════════════════════════════════════════════════
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.78;

  // Main head (egg-shaped: wider at cranium, narrower at jaw)
  const head = new THREE.Mesh(
    latheShape([
      [0.10, -0.25], [0.16, -0.18], [0.20, -0.08], [0.24, 0],
      [0.27, 0.08], [0.28, 0.16], [0.26, 0.24], [0.20, 0.3], [0.10, 0.33],
    ], 12), skin
  );
  head.position.set(0, -0.05, 0);
  headGroup.add(head);

  // Brow ridge
  const browRidge = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.09), skin);
  browRidge.position.set(0, 0.11, 0.18);
  headGroup.add(browRidge);

  // Cheekbones
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), skin);
    cheek.scale.set(0.8, 0.5, 0.6);
    cheek.position.set(side * 0.16, -0.04, 0.16);
    headGroup.add(cheek);
  }

  // Jawline
  const jaw = new THREE.Mesh(
    latheShape([[0.08, 0], [0.12, 0.02], [0.14, 0.06], [0.11, 0.1], [0.06, 0.12]], 8),
    skin
  );
  jaw.position.set(0, -0.24, 0.04);
  headGroup.add(jaw);

  // Chin (strong)
  const chin = new THREE.Mesh(new THREE.SphereGeometry(0.08, 7, 5), skin);
  chin.scale.set(1.0, 0.55, 0.7);
  chin.position.set(0, -0.2, 0.1);
  headGroup.add(chin);

  // ── Eyes (detailed) ──
  for (const side of [-1, 1]) {
    // Socket shadow
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), createPS1Material(def.skinColor - 0x101010));
    socket.scale.set(1.2, 0.8, 0.3);
    socket.position.set(side * 0.09, 0.035, 0.22);
    headGroup.add(socket);

    const white = new THREE.Mesh(new THREE.SphereGeometry(0.048, 7, 5), eyeWhiteMat);
    white.scale.set(1.15, 0.8, 0.8);
    white.position.set(side * 0.09, 0.035, 0.225);
    headGroup.add(white);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.03, 7, 5), irisMat);
    iris.position.set(side * 0.09, 0.03, 0.255);
    headGroup.add(iris);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.015, 5, 4), pupilMat);
    pupil.position.set(side * 0.09, 0.03, 0.268);
    headGroup.add(pupil);

    // Eye highlight
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.008, 4, 3), eyeWhiteMat);
    hl.position.set(side * 0.082, 0.04, 0.27);
    headGroup.add(hl);

    // Eyelid
    const lid = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.35), skin
    );
    lid.position.set(side * 0.09, 0.035, 0.225);
    lid.scale.y = 0.01;
    lid.userData.isEyelid = true;
    headGroup.add(lid);

    // Lower lash line
    const lash = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.008, 0.015), createPS1Material(def.hairColor - 0x222200));
    lash.position.set(side * 0.09, 0.01, 0.24);
    headGroup.add(lash);
  }

  // Eyebrows (thicker, more dramatic)
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.03, 0.035), browMat);
    brow.position.set(side * 0.09, 0.1, 0.24);
    brow.rotation.z = side * -0.12;
    headGroup.add(brow);
    const browInner = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 0.03), browMat);
    browInner.position.set(side * 0.04, 0.105, 0.245);
    headGroup.add(browInner);
  }

  // Nose (bridge + tip + nostrils)
  const noseBridge = new THREE.Mesh(
    latheShape([[0.015, 0], [0.018, 0.02], [0.016, 0.05], [0.012, 0.08]], 6), skin
  );
  noseBridge.position.set(0, -0.01, 0.27);
  headGroup.add(noseBridge);
  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5), skin);
  noseTip.position.set(0, -0.03, 0.29);
  headGroup.add(noseTip);
  for (const side of [-1, 1]) {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 3), createPS1Material(def.skinColor - 0x151510));
    nostril.position.set(side * 0.015, -0.04, 0.28);
    headGroup.add(nostril);
  }

  // Mouth
  headGroup.add(pm(new THREE.BoxGeometry(0.07, 0.012, 0.008), createPS1Material(0x995544), 0, -0.09, 0.265));
  const upperLip = new THREE.Mesh(new THREE.SphereGeometry(0.038, 5, 3), lipMat);
  upperLip.scale.set(1.2, 0.25, 0.4);
  upperLip.position.set(0, -0.08, 0.268);
  headGroup.add(upperLip);

  // Ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), skin);
    ear.scale.set(0.4, 0.8, 0.6);
    ear.position.set(side * 0.265, 0.02, 0);
    headGroup.add(ear);
    const earInner = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 3), createPS1Material(def.skinColor - 0x101008));
    earInner.scale.set(0.3, 0.6, 0.4);
    earInner.position.set(side * 0.255, 0.02, 0.01);
    headGroup.add(earInner);
  }

  // ══════════════════════════════════════════════════════════════
  // HAIR — Wide-spread anime spikes (radial burst, not converging)
  // ══════════════════════════════════════════════════════════════

  // Base cap — small, blends under spikes, shifted back
  const _heroCapMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.38),
    hairMat
  );
  _heroCapMesh.position.set(0, 0.04, -0.03);
  headGroup.add(_heroCapMesh);

  // Back volume — fills between cap and back spikes seamlessly
  const _heroBackVol = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 6, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.45),
    hairMat
  );
  _heroBackVol.position.set(0, 0.02, -0.06);
  headGroup.add(_heroBackVol);

  // Blade-shaped spike — tapered profile for clean anime silhouettes
  function hairBlade(length: number, width: number, depth: number): THREE.ExtrudeGeometry {
    const pts: [number, number][] = [];
    const N = 7;
    for (let i = 0; i <= N; i++) { const t = i / N; pts.push([-width * (1 - t * t), t * length]); }
    for (let i = N; i >= 0; i--) { const t = i / N; pts.push([width * (1 - t * t), t * length]); }
    return extrudeShape(pts, depth);
  }

  interface _SpikeDef { p: [number, number, number]; r: [number, number, number]; l: number; w: number; d: number; m: THREE.Material }
  const spikes: _SpikeDef[] = [
    // 3 CROWN — swept FAR backward (almost horizontal behind head)
    { p: [0, 0.2, -0.16], r: [-1.1, 0, 0], l: 0.65, w: 0.1, d: 0.055, m: hairMat },
    { p: [-0.1, 0.18, -0.13], r: [-0.95, -0.35, -0.3], l: 0.6, w: 0.085, d: 0.05, m: hairMat },
    { p: [0.1, 0.18, -0.13], r: [-0.95, 0.35, 0.3], l: 0.6, w: 0.085, d: 0.05, m: hairMat },

    // 2 OUTER — swept strongly sideways + backward
    { p: [-0.18, 0.12, -0.06], r: [-0.4, -0.5, -0.8], l: 0.55, w: 0.08, d: 0.045, m: hairMat },
    { p: [0.18, 0.12, -0.06], r: [-0.4, 0.5, 0.8], l: 0.55, w: 0.08, d: 0.045, m: hairMat },

    // 2 SIDE — nearly horizontal, swept to sides
    { p: [-0.25, 0.02, 0.04], r: [0.1, -0.2, -1.2], l: 0.45, w: 0.07, d: 0.04, m: hairHL },
    { p: [0.25, 0.02, 0.04], r: [0.1, 0.2, 1.2], l: 0.45, w: 0.07, d: 0.04, m: hairHL },

    // 2 LOW SIDE — fill temples, swept outward
    { p: [-0.22, -0.04, 0.08], r: [0.3, -0.3, -0.95], l: 0.3, w: 0.06, d: 0.035, m: hairMat },
    { p: [0.22, -0.04, 0.08], r: [0.3, 0.3, 0.95], l: 0.3, w: 0.06, d: 0.035, m: hairMat },

    // 1 TOP — SHORT, modest (not a tower)
    { p: [0, 0.26, -0.06], r: [-0.55, 0, 0.05], l: 0.4, w: 0.075, d: 0.05, m: hairHL },

    // 2 FRONT BANGS — frame face, angled downward
    { p: [-0.12, 0.1, 0.22], r: [0.7, -0.15, -0.3], l: 0.26, w: 0.06, d: 0.035, m: hairMat },
    { p: [0.08, 0.12, 0.22], r: [0.6, 0.1, 0.2], l: 0.24, w: 0.055, d: 0.035, m: hairHL },

    // 3 BACK MANE — flowing DOWN behind head
    { p: [0, 0.06, -0.24], r: [-1.3, 0, 0], l: 0.55, w: 0.09, d: 0.05, m: hairMat },
    { p: [-0.08, 0.04, -0.22], r: [-1.2, -0.12, -0.06], l: 0.5, w: 0.07, d: 0.04, m: hairHL },
    { p: [0.08, 0.04, -0.22], r: [-1.2, 0.12, 0.06], l: 0.5, w: 0.07, d: 0.04, m: hairMat },
  ];

  for (const s of spikes) {
    const geo = hairBlade(s.l, s.w, s.d);
    const spike = new THREE.Mesh(geo, s.m);
    spike.position.set(s.p[0], s.p[1], s.p[2]);
    spike.rotation.set(s.r[0], s.r[1], s.r[2]);
    headGroup.add(spike);
  }

  group.add(headGroup);

  // ══════════════════════════════════════════════════════════════
  // NECK — with trapezius and collar detail
  // ══════════════════════════════════════════════════════════════
  const neckGeo = latheShape([
    [0.065, 0], [0.072, 0.03], [0.078, 0.06], [0.085, 0.1], [0.075, 0.13]
  ], 10);
  const neck = new THREE.Mesh(neckGeo, skin);
  neck.position.set(0, 1.56, 0);
  group.add(neck);

  // Adam's apple
  group.add(pm(new THREE.SphereGeometry(0.015, 5, 4), skin, 0, 1.62, 0.07));

  // Trapezius ridges
  for (const side of [-1, 1]) {
    const trap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.08), clothes);
    trap.position.set(side * 0.14, 1.52, -0.02);
    trap.rotation.z = side * 0.4;
    group.add(trap);
  }

  // Collar bone area (V-neck skin)
  const collarSkin = new THREE.Mesh(
    latheShape([[0.01, 0], [0.06, 0.01], [0.08, 0.03], [0.05, 0.04]], 6), skin
  );
  collarSkin.position.set(0, 1.48, 0.1);
  group.add(collarSkin);

  // ══════════════════════════════════════════════════════════════
  // TORSO — broader shoulders, chest definition, cloth folds
  // ══════════════════════════════════════════════════════════════
  const torsoGeo = latheShape([
    [0.16, 0], [0.17, 0.05], [0.15, 0.15], [0.17, 0.3],
    [0.21, 0.45], [0.20, 0.55], [0.16, 0.65], [0.10, 0.72],
  ], 12);
  const torso = new THREE.Mesh(torsoGeo, clothes);
  torso.position.set(0, 0.82, 0);
  group.add(torso);

  // Pectoral definition
  for (const side of [-1, 1]) {
    const pec = new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 5), clothes);
    pec.scale.set(1.2, 0.6, 0.8);
    pec.position.set(side * 0.08, 1.32, 0.14);
    group.add(pec);
  }

  // Cloth fold ridges
  for (let i = 0; i < 4; i++) {
    const fold = new THREE.Mesh(
      new THREE.BoxGeometry(0.16 + i * 0.02, 0.008, 0.015), clothes2
    );
    fold.position.set(0, 1.05 + i * 0.1, 0.155 - i * 0.005);
    fold.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.05;
    group.add(fold);
  }

  // V-neckline
  for (const side of [-1, 1]) {
    const neckLine = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.015), clothes2);
    neckLine.position.set(side * 0.04, 1.46, 0.12);
    neckLine.rotation.z = side * 0.5;
    group.add(neckLine);
  }

  // Collar
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 12), clothes2);
  collar.position.set(0, 1.5, 0);
  collar.rotation.x = Math.PI / 2;
  group.add(collar);

  // Tunic hem
  group.add(pm(new THREE.TorusGeometry(0.165, 0.012, 5, 12), clothes2, 0, 0.83, 0, Math.PI / 2));

  // Buttons
  const btnMat = createPS1Material(0xCCBB88);
  for (let i = 0; i < 3; i++) {
    group.add(pm(new THREE.SphereGeometry(0.015, 5, 4), btnMat, 0, 1.35 - i * 0.12, 0.16));
  }

  // ══════════════════════════════════════════════════════════════
  // SHOULDERS + ARMS — connected with deltoid/wrist bridges
  // ══════════════════════════════════════════════════════════════
  const armMeshes: THREE.Mesh[] = [];
  const AX = 0.30; // arm x-offset (close to shoulder for seamless join)

  for (const side of [-1, 1]) {
    // Shoulder sphere (larger for better overlap)
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.10, 9, 7), clothes);
    shoulder.position.set(side * 0.28, 1.44, 0);
    group.add(shoulder);
    // Shoulder pad ridge
    group.add(pm(new THREE.BoxGeometry(0.1, 0.015, 0.12), clothes2, side * 0.28, 1.48, 0));

    // Deltoid connector (bridges shoulder to upper arm)
    const deltoidGeo = latheShape([
      [0.055, 0], [0.07, 0.06], [0.068, 0.14], [0.058, 0.22], [0.05, 0.28]
    ], 8);
    const deltoid = new THREE.Mesh(deltoidGeo, clothes);
    deltoid.position.set(side * AX, 1.16, 0);
    group.add(deltoid);

    // Upper arm (bicep profile)
    const upperArmGeo = latheShape([
      [0.045, 0], [0.055, 0.04], [0.065, 0.12],
      [0.062, 0.18], [0.055, 0.24], [0.05, 0.3],
    ], 8);
    const upper = new THREE.Mesh(upperArmGeo, clothes);
    upper.position.set(side * AX, 1.12, 0);
    group.add(upper);
    armMeshes.push(upper);

    // Elbow joint (larger)
    group.add(pm(new THREE.SphereGeometry(0.055, 7, 5), clothes, side * AX, 1.12, 0));

    // Sleeve cuff
    group.add(pm(new THREE.TorusGeometry(0.058, 0.015, 6, 8), clothes2, side * AX, 1.06, 0, Math.PI / 2));

    // Forearm (muscle)
    const forearmGeo = latheShape([
      [0.038, 0], [0.042, 0.03], [0.055, 0.1], [0.05, 0.16], [0.045, 0.22],
    ], 8);
    const forearm = new THREE.Mesh(forearmGeo, skin);
    forearm.position.set(side * AX, 0.84, 0);
    group.add(forearm);

    // Wrist bridge (connects forearm to hand)
    const wristBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.1, 7), skin);
    wristBridge.position.set(side * AX, 0.79, 0);
    group.add(wristBridge);

    // Bracer/wrist guard
    const bracerGeo = latheShape([
      [0.044, 0], [0.048, 0.02], [0.046, 0.05], [0.044, 0.07]
    ], 8);
    const bracer = new THREE.Mesh(bracerGeo, beltMat);
    bracer.position.set(side * AX, 0.84, 0);
    group.add(bracer);
    group.add(pm(new THREE.TorusGeometry(0.046, 0.006, 4, 8), goldMat, side * AX, 0.86, 0, Math.PI / 2));

    // Hand
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 7, 5), skin);
    hand.scale.set(0.85, 0.65, 1.1);
    hand.position.set(side * AX, 0.72, 0.01);
    group.add(hand);

    // Fingers (two segments each)
    for (let f = 0; f < 4; f++) {
      const angle = ((f - 1.5) / 3) * 0.65;
      const fx = side * AX + Math.sin(angle) * 0.035;
      const fz = Math.cos(angle) * 0.035 + 0.01;
      group.add(pm(new THREE.CylinderGeometry(0.012, 0.01, 0.035, 5), skin, fx, 0.69, fz, 0.4));
      group.add(pm(new THREE.CylinderGeometry(0.009, 0.007, 0.03, 4), skin, fx, 0.665, fz + 0.015, 0.6));
      group.add(pm(new THREE.SphereGeometry(0.01, 4, 3), skin, fx, 0.7, fz));
    }
    // Thumb
    const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.01, 0.04, 5), skin);
    thumb.position.set(side * (AX + side * 0.035), 0.7, 0.04);
    thumb.rotation.set(0.3, 0, side * 0.5);
    group.add(thumb);
  }

  // ══════════════════════════════════════════════════════════════
  // BELT — detailed with pouches, buckle, loops
  // ══════════════════════════════════════════════════════════════
  group.add(pm(new THREE.TorusGeometry(0.17, 0.025, 7, 14), beltMat, 0, 0.83, 0, Math.PI / 2));

  // Ornate buckle
  group.add(pm(new THREE.BoxGeometry(0.1, 0.08, 0.025), goldMat, 0, 0.83, 0.18));
  group.add(pm(new THREE.BoxGeometry(0.06, 0.04, 0.028), createPS1Material(0x886622), 0, 0.83, 0.185));
  group.add(pm(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 4), goldMat, 0, 0.835, 0.19, 0, 0, Math.PI / 2));

  // Pouches
  for (const side of [-1, 1]) {
    const pouch = new THREE.Mesh(
      latheShape([[0.035, 0], [0.045, 0.015], [0.042, 0.04], [0.035, 0.06], [0.025, 0.07]], 7),
      beltMat
    );
    pouch.position.set(side * 0.16, 0.76, 0.1 + (side === 1 ? 0.02 : 0));
    group.add(pouch);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.04), beltMat);
    flap.position.set(side * 0.16, 0.79, 0.11);
    group.add(flap);
    group.add(pm(new THREE.SphereGeometry(0.008, 4, 3), goldMat, side * 0.16, 0.785, 0.13));
  }

  // Belt loops
  for (const side of [-1, 1]) {
    group.add(pm(new THREE.BoxGeometry(0.025, 0.06, 0.015), beltMat, side * 0.08, 0.83, 0.16));
  }

  // ══════════════════════════════════════════════════════════════
  // GREATSWORD ON BACK — diagonal with shoulder strap
  // ══════════════════════════════════════════════════════════════
  const swordGroup = new THREE.Group();

  // Blade
  const bladeGeo = extrudeShape([
    [0, 0], [-0.055, 0.025], [-0.055, 0.85], [-0.04, 1.0],
    [-0.01, 1.12], [0, 1.18], [0.01, 1.12], [0.04, 1.0],
    [0.055, 0.85], [0.055, 0.025]
  ], 0.018);
  swordGroup.add(pm(bladeGeo, metalMat, -0.009, 0, -0.009));

  // Edge glow
  const edgeMat = createPS1Material(0xEEEEFF, { emissive: 0x111122 });
  swordGroup.add(pm(new THREE.BoxGeometry(0.008, 0.9, 0.02), edgeMat, 0.055, 0.47, 0));
  swordGroup.add(pm(new THREE.BoxGeometry(0.008, 0.9, 0.02), edgeMat, -0.055, 0.47, 0));

  // Fuller
  swordGroup.add(pm(new THREE.BoxGeometry(0.022, 0.65, 0.022), createPS1Material(0xAAAABB), 0, 0.42, 0));

  // Cross guard
  swordGroup.add(pm(new THREE.BoxGeometry(0.26, 0.045, 0.045), createPS1Material(0xBB9933), 0, 0, 0));
  for (const s of [-1, 1]) {
    swordGroup.add(pm(new THREE.SphereGeometry(0.028, 6, 5), goldMat, s * 0.14, 0, 0));
    swordGroup.add(pm(new THREE.SphereGeometry(0.018, 5, 4), createPS1Material(0xAA8822), s * 0.13, s * 0.02, 0));
  }

  // Handle
  swordGroup.add(pm(new THREE.CylinderGeometry(0.028, 0.022, 0.18, 7), createPS1Material(0x442211), 0, -0.11, 0));
  for (let i = 0; i < 5; i++) {
    swordGroup.add(pm(new THREE.TorusGeometry(0.03, 0.007, 4, 8), createPS1Material(0x553322), 0, -0.04 + i * 0.035, 0, Math.PI / 2));
  }

  // Pommel + gem
  swordGroup.add(pm(new THREE.SphereGeometry(0.038, 7, 6), goldMat, 0, -0.22, 0));
  swordGroup.add(pm(new THREE.SphereGeometry(0.016, 5, 4), createPS1Material(0x4444CC, { emissive: 0x222266 }), 0, -0.22, 0.032));

  // Position diagonally on back
  swordGroup.position.set(0.08, 0.6, -0.22);
  swordGroup.rotation.set(0.15, 0, -0.35);
  group.add(swordGroup);

  // Shoulder strap (across chest)
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.1, 0.015), beltMat);
  strap.position.set(-0.08, 1.15, 0.06);
  strap.rotation.z = 0.35;
  group.add(strap);
  group.add(pm(new THREE.BoxGeometry(0.06, 0.04, 0.02), goldMat, 0.06, 1.36, 0.12));

  // Back strap
  const backStrap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.015), beltMat);
  backStrap.position.set(-0.04, 1.15, -0.14);
  backStrap.rotation.z = 0.3;
  group.add(backStrap);

  // ══════════════════════════════════════════════════════════════
  // HIPS — smooth connection to legs
  // ══════════════════════════════════════════════════════════════
  const hipGeo = latheShape([
    [0.14, 0], [0.16, 0.03], [0.155, 0.06], [0.14, 0.1], [0.12, 0.14]
  ], 12);
  const hips = new THREE.Mesh(hipGeo, pantsMat);
  hips.position.set(0, 0.7, 0);
  group.add(hips);

  for (const side of [-1, 1]) {
    group.add(pm(new THREE.SphereGeometry(0.075, 7, 5), pantsMat, side * 0.1, 0.72, 0));
  }

  // ══════════════════════════════════════════════════════════════
  // LEGS — quad/calf definition, detailed boots
  // ══════════════════════════════════════════════════════════════
  for (const side of [-1, 1]) {
    // Upper leg
    const upperLegGeo = latheShape([
      [0.058, 0], [0.068, 0.05], [0.082, 0.14],
      [0.088, 0.22], [0.075, 0.3],
    ], 9);
    group.add(pm(upperLegGeo, pantsMat, side * 0.1, 0.42, 0));

    // Knee
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 5), pantsMat);
    knee.scale.set(1, 0.8, 1);
    knee.position.set(side * 0.1, 0.42, 0.01);
    group.add(knee);
    group.add(pm(new THREE.SphereGeometry(0.025, 5, 4), pantsMat, side * 0.1, 0.42, 0.06));

    // Lower leg (calf)
    const lowerLegGeo = latheShape([
      [0.042, 0], [0.052, 0.04], [0.065, 0.12],
      [0.058, 0.2], [0.052, 0.26],
    ], 9);
    group.add(pm(lowerLegGeo, pantsMat, side * 0.1, 0.16, 0));

    // Ankle bridge
    group.add(pm(new THREE.SphereGeometry(0.04, 5, 4), pantsMat, side * 0.1, 0.16, 0));

    // Boot shaft
    const bootGeo = latheShape([
      [0.055, 0], [0.065, 0.02], [0.058, 0.06],
      [0.055, 0.1], [0.057, 0.14], [0.065, 0.17],
    ], 9);
    group.add(pm(bootGeo, shoeMat, side * 0.1, 0.02, 0));

    // Boot cuff
    group.add(pm(new THREE.TorusGeometry(0.06, 0.01, 5, 8), shoeMat, side * 0.1, 0.17, 0, Math.PI / 2));

    // Boot toe
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 5), shoeMat);
    toe.scale.set(0.75, 0.38, 1.5);
    toe.position.set(side * 0.1, 0.035, 0.06);
    group.add(toe);

    // Sole
    group.add(pm(new THREE.BoxGeometry(0.12, 0.025, 0.17), darkLeather, side * 0.1, 0.012, 0.02));

    // Heel
    group.add(pm(new THREE.BoxGeometry(0.07, 0.02, 0.04), darkLeather, side * 0.1, 0.015, -0.05));

    // Boot buckle + strap
    group.add(pm(new THREE.BoxGeometry(0.04, 0.025, 0.015), goldMat, side * 0.1, 0.1, 0.06));
    group.add(pm(new THREE.TorusGeometry(0.056, 0.008, 4, 8), beltMat, side * 0.1, 0.1, 0, Math.PI / 2));
  }

  // ══════════════════════════════════════════════════════════════
  // FINALIZE
  // ══════════════════════════════════════════════════════════════
  group.scale.setScalar(def.scale);
  group.position.set(...def.position);
  group.rotation.y = def.rotation;

  group.userData.headGroup = headGroup;
  group.userData.armMeshes = armMeshes;

  return group;
}

// ── Enhanced Heroine Builder ──────────────────────────────────

function buildEnhancedHeroine(def: CharacterDef): THREE.Group {
  const group = new THREE.Group();

  // ── Textures ──
  const skinTex = getCachedTexture('heroine-skin', () => genSkinTexture(def.skinColor));
  const clothTex = getCachedTexture('heroine-cloth', () => genClothTexture(def.clothesColor, 'tunic'));
  const cloth2Tex = getCachedTexture('heroine-cloth2', () => genClothTexture(def.clothesColor2 ?? def.clothesColor, 'tunic'));
  const hairTex = getCachedTexture('heroine-hair', () => genHairTexture(def.hairColor));
  const bootTex = getCachedTexture('heroine-boot', () => genLeatherTexture(def.shoeColor));

  const skin = createTexturedMaterial(skinTex, 2, 2);
  const clothes = createTexturedMaterial(clothTex, 3, 3);
  const clothes2 = createTexturedMaterial(cloth2Tex, 3, 3);
  const hairMat = createTexturedMaterial(hairTex, 1, 1);
  const hairHL = createTexturedMaterial(
    getCachedTexture('heroine-hair-hl', () => genHairTexture(def.hairColor + 0x221122)), 1, 1
  );
  const shoeMat = createTexturedMaterial(bootTex, 2, 2);

  const eyeWhiteMat = createPS1Material(0xEEEEEE);
  const irisMat = createPS1Material(0x3366AA);
  const pupilMat = createPS1Material(0x111111);
  const lipMat = createPS1Material(0xCC7777);
  const lashMat = createPS1Material(0x221122);
  const accentMat = createPS1Material((def.accessoryColor ?? 0x3355BB) + 0x222222);
  const darkBoot = createPS1Material(def.shoeColor - 0x111111);

  function hairBlade(length: number, width: number, depth: number): THREE.ExtrudeGeometry {
    const pts: [number, number][] = [];
    const N = 7;
    for (let i = 0; i <= N; i++) { const t = i / N; pts.push([-width * (1 - t * t), t * length]); }
    for (let i = N; i >= 0; i--) { const t = i / N; pts.push([width * (1 - t * t), t * length]); }
    return extrudeShape(pts, depth);
  }

  // ══════════════════════════════════════════════════════════════
  // HEAD — softer features, larger eyes, feminine proportions
  // ══════════════════════════════════════════════════════════════
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.52;
  headGroup.scale.setScalar(0.68);

  // Head — smooth profile with integrated chin/jaw (no separate chin piece)
  const headGeo = latheShape([
    [0.01, -0.24], [0.05, -0.20], [0.10, -0.15], [0.14, -0.08],
    [0.17, -0.03], [0.19, 0.02], [0.20, 0.07], [0.21, 0.13],
    [0.21, 0.18], [0.19, 0.23], [0.15, 0.27], [0.08, 0.31], [0.03, 0.33],
  ], 14);
  const head = new THREE.Mesh(headGeo, skin);
  head.position.set(0, -0.05, 0);
  headGroup.add(head);

  // ── Eyes (flush against head surface) ──
  for (const side of [-1, 1]) {
    // Eye white
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.035, 7, 5), eyeWhiteMat);
    white.scale.set(1.1, 0.8, 0.5);
    white.position.set(side * 0.08, 0.04, 0.19);
    headGroup.add(white);

    // Iris
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.022, 7, 5), irisMat);
    iris.position.set(side * 0.08, 0.038, 0.20);
    headGroup.add(iris);

    // Pupil
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.010, 5, 4), pupilMat);
    pupil.position.set(side * 0.08, 0.038, 0.21);
    headGroup.add(pupil);

    // Highlight sparkle
    headGroup.add(pm(new THREE.SphereGeometry(0.006, 4, 3), eyeWhiteMat, side * 0.072, 0.046, 0.212));
    headGroup.add(pm(new THREE.SphereGeometry(0.003, 3, 3), eyeWhiteMat, side * 0.088, 0.034, 0.21));

    // Eyelid
    const lid = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.35), skin
    );
    lid.position.set(side * 0.08, 0.04, 0.19);
    lid.scale.y = 0.01;
    lid.userData.isEyelid = true;
    headGroup.add(lid);

    // Upper lashes
    for (let l = 0; l < 2; l++) {
      const lashAngle = ((l - 0.5) / 1.5) * 0.3;
      const lash = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.001, 0.025, 3), lashMat);
      lash.position.set(side * 0.08 + Math.sin(lashAngle) * 0.02, 0.06, 0.20 + Math.cos(lashAngle) * 0.006);
      lash.rotation.set(0.5, 0, side * (0.3 + l * 0.2));
      headGroup.add(lash);
    }
  }

  // Eyebrows
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.010, 0.012), createPS1Material(def.hairColor));
    brow.position.set(side * 0.08, 0.09, 0.20);
    brow.rotation.z = side * -0.15;
    headGroup.add(brow);
  }

  // Nose — flush against face
  const noseBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.013, 0.05, 4), skin);
  noseBridge.position.set(0, 0.01, 0.20);
  noseBridge.rotation.x = 0.2;
  headGroup.add(noseBridge);
  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.020, 5, 4), skin);
  noseTip.position.set(0, -0.02, 0.20);
  headGroup.add(noseTip);
  for (const side of [-1, 1]) {
    headGroup.add(pm(new THREE.SphereGeometry(0.006, 4, 3), lashMat, side * 0.011, -0.030, 0.20));
  }

  // Lips — flush against face
  const upperLipMesh = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 3), lipMat);
  upperLipMesh.scale.set(1.3, 0.3, 0.5);
  upperLipMesh.position.set(0, -0.07, 0.18);
  headGroup.add(upperLipMesh);
  const lowerLipMesh = new THREE.Mesh(new THREE.SphereGeometry(0.030, 5, 3), lipMat);
  lowerLipMesh.scale.set(1.2, 0.25, 0.4);
  lowerLipMesh.position.set(0, -0.085, 0.17);
  headGroup.add(lowerLipMesh);

  // Ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), skin);
    ear.scale.set(0.35, 0.7, 0.5);
    ear.position.set(side * 0.20, 0.03, 0);
    headGroup.add(ear);
  }

  // ══════════════════════════════════════════════════════════════
  // HAIR — Long straight flowing purple hair (organic strands)
  // ══════════════════════════════════════════════════════════════

  // Hair cap — two-piece: crown (full 360°) + back/sides extension
  // Crown — covers top of head fully, no bald forehead
  const crownMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.255, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.40),
    hairMat
  );
  crownMesh.position.set(0, 0.03, 0);
  headGroup.add(crownMesh);

  // Back/sides — extends lower but skips front face (~80° excluded)
  const backCapMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.257, 10, 5,
      Math.PI * 0.72, Math.PI * 1.56,
      Math.PI * 0.32, Math.PI * 0.28
    ),
    hairMat
  );
  backCapMesh.position.set(0, 0.03, 0);
  headGroup.add(backCapMesh);

  // Highlight wedge strips — on back/sides for textured look
  for (let i = 0; i < 4; i++) {
    const phiStart = Math.PI * (0.8 + i * 0.35);
    const strip = new THREE.Mesh(
      new THREE.SphereGeometry(0.258, 3, 5, phiStart, Math.PI * 0.2, 0, Math.PI * 0.38),
      hairHL
    );
    strip.position.set(0, 0.035, 0);
    headGroup.add(strip);
  }

  // Center part line
  const partLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.005, 0.008, 0.24),
    createPS1Material(def.hairColor - 0x111111)
  );
  partLine.position.set(0, 0.28, -0.04);
  partLine.rotation.x = -0.15;
  headGroup.add(partLine);

  // Tapered hair strand — organic tube shape via LatheGeometry
  function hairLock(topR: number, length: number): THREE.LatheGeometry {
    return latheShape([
      [topR, 0], [topR * 0.95, length * 0.1], [topR * 0.85, length * 0.3],
      [topR * 0.72, length * 0.5], [topR * 0.55, length * 0.7],
      [topR * 0.35, length * 0.88], [topR * 0.15, length],
    ], 5);
  }

  // Hair transition band — solid piece connecting cap to hanging locks
  const transitionGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.10, 10, 1, true,
    Math.PI * 0.2, Math.PI * 1.6  // back/sides only, skip face
  );
  const transitionMesh = new THREE.Mesh(transitionGeo, hairMat);
  transitionMesh.position.set(0, -0.02, -0.02);
  headGroup.add(transitionMesh);

  // Back curtain — wide flat blades forming a solid hair wall
  const _backBlades = [
    { x: 0, z: -0.19, w: 0.12, len: 0.85, d: 0.025, rx: 0.15, mat: hairMat },
    { x: -0.10, z: -0.17, w: 0.10, len: 0.80, d: 0.02, rx: 0.12, mat: hairHL },
    { x: 0.10, z: -0.17, w: 0.10, len: 0.80, d: 0.02, rx: 0.12, mat: hairMat },
    { x: -0.18, z: -0.14, w: 0.08, len: 0.72, d: 0.018, rx: 0.10, mat: hairMat },
    { x: 0.18, z: -0.14, w: 0.08, len: 0.72, d: 0.018, rx: 0.10, mat: hairHL },
  ];
  for (const bl of _backBlades) {
    const blade = new THREE.Mesh(hairBlade(bl.len, bl.w, bl.d), bl.mat);
    blade.position.set(bl.x, 0.02, bl.z);
    blade.rotation.set(Math.PI + bl.rx, 0, 0);
    headGroup.add(blade);
  }

  // Side locks — wider, flowing from under cap
  for (const side of [-1, 1]) {
    // Front side blade
    const sideBlade1 = new THREE.Mesh(hairBlade(0.6, 0.06, 0.015), side === -1 ? hairHL : hairMat);
    sideBlade1.position.set(side * 0.17, 0.0, 0.06);
    sideBlade1.rotation.set(Math.PI + 0.05, side * 0.2, side * 0.06);
    headGroup.add(sideBlade1);

    // Back side blade
    const sideBlade2 = new THREE.Mesh(hairBlade(0.52, 0.05, 0.012), hairMat);
    sideBlade2.position.set(side * 0.19, -0.02, -0.02);
    sideBlade2.rotation.set(Math.PI + 0.08, side * 0.3, side * 0.04);
    headGroup.add(sideBlade2);
  }

  // Bangs — soft wispy tips at hairline
  for (let bi = 0; bi < 5; bi++) {
    const bx = (bi - 2) * 0.04;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 4, 3), bi % 2 === 0 ? hairMat : hairHL);
    tip.scale.set(1.1, 1.4, 0.3);
    tip.position.set(bx, 0.08, 0.20);
    headGroup.add(tip);
  }

  // Framing strands — from under cap in front of ears
  for (const side of [-1, 1]) {
    const frameLock = new THREE.Mesh(hairLock(0.03, 0.38), hairHL);
    frameLock.position.set(side * 0.18, -0.02, 0.10);
    frameLock.rotation.set(Math.PI + 0.05, side * 0.1, side * 0.06);
    headGroup.add(frameLock);
  }

  group.add(headGroup);

  // ══════════════════════════════════════════════════════════════
  // NECK — slimmer, feminine
  // ══════════════════════════════════════════════════════════════
  const neckGeo = latheShape([
    [0.05, 0], [0.058, 0.03], [0.062, 0.06], [0.065, 0.1], [0.06, 0.12]
  ], 10);
  group.add(pm(neckGeo, skin, 0, 1.34, 0));

  // ══════════════════════════════════════════════════════════════
  // TORSO — hourglass figure with bodysuit
  // ══════════════════════════════════════════════════════════════
  const torsoGeo = latheShape([
    [0.14, 0],    // waist bottom
    [0.14, 0.04], // waist
    [0.07, 0.14], // narrow waist (dramatic hourglass pinch)
    [0.09, 0.22], // ribs
    [0.18, 0.36], // bust
    [0.14, 0.42], // upper chest (slimmer)
    [0.10, 0.48], // shoulders (narrower, feminine)
    [0.07, 0.52], // neck base
  ], 12);
  const torso = new THREE.Mesh(torsoGeo, clothes);
  torso.position.set(0, 0.82, 0);
  torso.scale.set(1, 1, 0.65); // flatten depth — oval, not barrel
  group.add(torso);

  // Bust — hemisphere domes emerging from torso (not full orbs)
  const bustGeo = new THREE.SphereGeometry(0.085, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
  for (const side of [-1, 1]) {
    const bust = new THREE.Mesh(bustGeo, clothes);
    bust.position.set(side * 0.055, 1.20, 0.12);
    bust.scale.set(1.0, 1.15, 1.0);
    bust.rotation.x = -0.12; // slight natural droop
    group.add(bust);
  }

  // Bodysuit accent lines — suspender straps from bust to hips
  // Waist band
  group.add(pm(new THREE.TorusGeometry(0.12, 0.012, 5, 12), accentMat, 0, 0.84, 0, Math.PI / 2));
  // Front suspender straps — bust to waist/hips
  for (const side of [-1, 1]) {
    group.add(pm(new THREE.BoxGeometry(0.02, 0.52, 0.012), accentMat, side * 0.06, 0.98, 0.14));
  }
  // Side straps — following body contour from bust to hips
  for (const side of [-1, 1]) {
    group.add(pm(new THREE.BoxGeometry(0.012, 0.52, 0.02), accentMat, side * 0.15, 0.98, 0.04));
  }
  // Center front seam — full length from chest to hips
  group.add(pm(new THREE.BoxGeometry(0.015, 0.54, 0.012), accentMat, 0, 0.98, 0.15));
  // Collar (form-fitting)
  group.add(pm(new THREE.TorusGeometry(0.09, 0.015, 5, 10), accentMat, 0, 1.35, 0, Math.PI / 2));
  // V-neckline
  for (const side of [-1, 1]) {
    group.add(pm(new THREE.BoxGeometry(0.08, 0.012, 0.012), accentMat, side * 0.03, 1.32, 0.1, 0, 0, side * 0.5));
  }

  // ══════════════════════════════════════════════════════════════
  // SHOULDERS + ARMS — slimmer, connected
  // ══════════════════════════════════════════════════════════════
  const armMeshes: THREE.Mesh[] = [];
  const FAX = 0.18; // feminine arm x-offset (close to body)

  for (const side of [-1, 1]) {
    // Shoulder (slim, feminine — no shoulder pads)
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), clothes);
    shoulder.scale.set(1.2, 0.65, 0.9);
    shoulder.position.set(side * 0.17, 1.24, 0);
    group.add(shoulder);

    // Deltoid connector (slimmer)
    const deltoidGeo = latheShape([
      [0.032, 0], [0.042, 0.05], [0.040, 0.12], [0.035, 0.2], [0.030, 0.26]
    ], 7);
    group.add(pm(deltoidGeo, clothes, side * FAX, 1.08, 0));

    // Upper arm
    const upperArmGeo = latheShape([
      [0.032, 0], [0.04, 0.04], [0.048, 0.12],
      [0.045, 0.18], [0.04, 0.24], [0.038, 0.28],
    ], 7);
    const upper = new THREE.Mesh(upperArmGeo, clothes);
    upper.position.set(side * FAX, 1.04, 0);
    group.add(upper);
    armMeshes.push(upper);

    // Elbow (bridging upper arm to forearm)
    group.add(pm(new THREE.SphereGeometry(0.045, 6, 5), clothes, side * FAX, 1.03, 0));

    // Sleeve cuff
    group.add(pm(new THREE.TorusGeometry(0.045, 0.01, 5, 8), accentMat, side * FAX, 0.98, 0, Math.PI / 2));

    // Forearm (moved up to close gap with upper arm)
    const forearmGeo = latheShape([
      [0.034, 0], [0.038, 0.03], [0.044, 0.1], [0.040, 0.16], [0.034, 0.22],
    ], 7);
    group.add(pm(forearmGeo, skin, side * FAX, 0.82, 0));

    // Wrist bridge
    group.add(pm(new THREE.CylinderGeometry(0.028, 0.032, 0.08, 6), skin, side * FAX, 0.76, 0));

    // Hand (smaller, graceful)
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), skin);
    hand.scale.set(0.8, 0.6, 1.1);
    hand.position.set(side * FAX, 0.68, 0.01);
    group.add(hand);

    // Fingers
    for (let f = 0; f < 4; f++) {
      const angle = ((f - 1.5) / 3) * 0.6;
      const fx = side * FAX + Math.sin(angle) * 0.03;
      const fz = Math.cos(angle) * 0.03 + 0.01;
      group.add(pm(new THREE.CylinderGeometry(0.009, 0.007, 0.035, 4), skin, fx, 0.65, fz, 0.35));
      group.add(pm(new THREE.CylinderGeometry(0.007, 0.005, 0.025, 4), skin, fx, 0.628, fz + 0.012, 0.55));
    }
    const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.008, 0.035, 4), skin);
    thumb.position.set(side * (FAX + side * 0.03), 0.67, 0.035);
    thumb.rotation.set(0.3, 0, side * 0.5);
    group.add(thumb);
  }

  // ══════════════════════════════════════════════════════════════
  // HIPS — connector between torso and skirt (no spheres, skirt handles shape)
  // ══════════════════════════════════════════════════════════════
  const hipGeo = latheShape([
    [0.14, 0], [0.15, 0.04], [0.14, 0.08], [0.13, 0.12]
  ], 12);
  group.add(pm(hipGeo, clothes, 0, 0.72, 0));

  // ══════════════════════════════════════════════════════════════
  // SKIRT + LEGS — flared skirt, bare legs, heeled boots
  // ══════════════════════════════════════════════════════════════

  // Flared skirt (shorter)
  const skirtGeo = latheShape([
    [0.21, 0],     // bottom hem (flared)
    [0.19, 0.03],  // slight taper
    [0.16, 0.08],  // mid
    [0.14, 0.14],  // narrowing
    [0.14, 0.18],  // waist
  ], 12);
  group.add(pm(skirtGeo, clothes, 0, 0.64, 0));
  // Skirt hem accent
  group.add(pm(new THREE.TorusGeometry(0.21, 0.008, 5, 12), accentMat, 0, 0.64, 0, Math.PI / 2));

  for (const side of [-1, 1]) {
    // Upper leg (bare skin)
    const upperLegGeo = latheShape([
      [0.048, 0], [0.058, 0.05], [0.072, 0.14],
      [0.078, 0.22], [0.068, 0.3],
    ], 9);
    group.add(pm(upperLegGeo, skin, side * 0.09, 0.42, 0));

    // Knee
    group.add(pm(new THREE.SphereGeometry(0.05, 6, 5), skin, side * 0.09, 0.42, 0.01));

    // Lower leg (bare skin)
    const lowerLegGeo = latheShape([
      [0.035, 0], [0.042, 0.04], [0.055, 0.12],
      [0.048, 0.2], [0.042, 0.26],
    ], 9);
    group.add(pm(lowerLegGeo, skin, side * 0.09, 0.16, 0));

    // Ankle
    group.add(pm(new THREE.SphereGeometry(0.035, 5, 4), skin, side * 0.09, 0.16, 0));

    // Boot (sleek, higher shaft)
    const bootGeo = latheShape([
      [0.045, 0], [0.055, 0.02], [0.048, 0.06],
      [0.044, 0.1], [0.046, 0.14], [0.052, 0.18],
    ], 9);
    group.add(pm(bootGeo, shoeMat, side * 0.09, 0.02, 0));

    // Boot cuff
    group.add(pm(new THREE.TorusGeometry(0.05, 0.008, 5, 8), shoeMat, side * 0.09, 0.18, 0, Math.PI / 2));

    // Toe
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), shoeMat);
    toe.scale.set(0.7, 0.35, 1.4);
    toe.position.set(side * 0.09, 0.03, 0.05);
    group.add(toe);

    // Sole
    group.add(pm(new THREE.BoxGeometry(0.09, 0.02, 0.14), darkBoot, side * 0.09, 0.012, 0.02));

    // Small heel
    group.add(pm(new THREE.BoxGeometry(0.04, 0.03, 0.03), darkBoot, side * 0.09, 0.015, -0.04));
  }

  // ══════════════════════════════════════════════════════════════
  // FINALIZE
  // ══════════════════════════════════════════════════════════════
  group.scale.setScalar(def.scale);
  group.position.set(...def.position);
  group.rotation.y = def.rotation;

  group.userData.headGroup = headGroup;
  group.userData.armMeshes = armMeshes;

  return group;
}

// ── Cat ─────────────────────────────────────────────────────────

function buildCat(): THREE.Group {
  const group = new THREE.Group();
  const fur = createPS1Material(0xFF8833);
  const dark = createPS1Material(0x553311);
  const white = createPS1Material(0xEEEEDD);

  // Body (lathe for organic shape)
  const bodyGeo = latheShape([[0.08, 0], [0.14, 0.06], [0.16, 0.15], [0.14, 0.25], [0.1, 0.3]], 8);
  const body = new THREE.Mesh(bodyGeo, fur);
  body.position.set(0, 0.1, 0);
  body.rotation.z = Math.PI / 2;
  body.rotation.y = Math.PI / 2;
  group.add(body);

  // Chest
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), white);
  chest.scale.set(0.8, 0.6, 0.5);
  chest.position.set(0.15, 0.28, 0);
  group.add(chest);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 7), fur);
  head.scale.set(1, 0.95, 0.9);
  head.position.set(0.28, 0.38, 0);
  group.add(head);

  // Eyes
  for (const s of [-1, 1]) {
    group.add(pm(new THREE.SphereGeometry(0.03, 5, 4), createPS1Material(0xDDDD44), 0.35, 0.4, s * 0.07));
    group.add(pm(new THREE.BoxGeometry(0.008, 0.035, 0.008), createPS1Material(0x111111), 0.37, 0.4, s * 0.07));
  }

  // Nose + ears
  group.add(pm(new THREE.SphereGeometry(0.018, 4, 3), createPS1Material(0xDD8888), 0.41, 0.36, 0));
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.09, 5), fur);
    ear.position.set(0.26, 0.52, s * 0.07);
    group.add(ear);
  }

  // Legs + paws
  for (const [lx, lz] of [[-0.1, -0.07], [-0.1, 0.07], [0.1, -0.07], [0.1, 0.07]]) {
    group.add(pm(new THREE.CylinderGeometry(0.035, 0.03, 0.14, 6), fur, lx, 0.07, lz));
    group.add(pm(new THREE.SphereGeometry(0.035, 5, 4), white, lx, 0.02, lz));
  }

  // Tail (curved via segments)
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.03 - t * 0.006, 5, 4), i >= 4 ? dark : fur);
    seg.position.set(-0.2 - t * 0.12, 0.28 + t * 0.2, Math.sin(t * 2) * 0.05);
    group.add(seg);
  }

  // Whiskers
  const wGeo = new THREE.CylinderGeometry(0.002, 0.001, 0.12, 3);
  const wMat = createPS1Material(0xDDDDDD);
  for (const zOff of [-0.02, 0.01]) {
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(wGeo, wMat);
      w.position.set(0.4, 0.35, s * (0.04 + Math.abs(zOff)));
      w.rotation.z = Math.PI / 2 + zOff * 3;
      w.rotation.y = s * 0.2;
      group.add(w);
    }
  }

  group.position.set(5, 1.1, 2.5);
  group.rotation.y = Math.PI * 0.8;
  return group;
}

// ── Dog ─────────────────────────────────────────────────────────

function buildDog(): THREE.Group {
  const group = new THREE.Group();
  const fur = createPS1Material(0xBB8844);
  const dark = createPS1Material(0x664422);
  const white = createPS1Material(0xEEDDCC);

  // Body (lathe)
  const bodyGeo = latheShape([[0.1, 0], [0.16, 0.08], [0.18, 0.18], [0.16, 0.28], [0.12, 0.35]], 8);
  const body = new THREE.Mesh(bodyGeo, fur);
  body.position.set(0, 0.12, 0);
  body.rotation.z = Math.PI / 2;
  body.rotation.y = Math.PI / 2;
  group.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 7), fur);
  head.position.set(0.3, 0.42, 0);
  group.add(head);

  // Snout (custom)
  const snoutGeo = latheShape([[0.03, 0], [0.05, 0.02], [0.055, 0.06], [0.04, 0.1], [0.02, 0.12]], 6);
  const snout = new THREE.Mesh(snoutGeo, fur);
  snout.position.set(0.42, 0.38, 0);
  snout.rotation.z = -Math.PI / 2;
  group.add(snout);
  group.add(pm(new THREE.SphereGeometry(0.025, 5, 4), createPS1Material(0x222222), 0.5, 0.4, 0));

  // Eyes
  for (const s of [-1, 1]) {
    group.add(pm(new THREE.SphereGeometry(0.025, 5, 4), createPS1Material(0x332211), 0.38, 0.46, s * 0.08));
    group.add(pm(new THREE.SphereGeometry(0.008, 4, 3), white, 0.39, 0.47, s * 0.078));
  }

  // Floppy ears
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.03), dark);
    ear.position.set(0.26, 0.46, s * 0.11);
    ear.rotation.x = s * 0.3;
    ear.rotation.z = s * 0.4;
    group.add(ear);
  }

  // Legs
  for (const [lx, lz] of [[-0.12, -0.08], [-0.12, 0.08], [0.12, -0.08], [0.12, 0.08]]) {
    group.add(pm(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 6), fur, lx, 0.09, lz));
    group.add(pm(new THREE.SphereGeometry(0.035, 5, 4), dark, lx, 0.01, lz));
  }

  // Tail
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.012, 0.22, 5), fur);
  tail.position.set(-0.3, 0.42, 0);
  tail.rotation.z = -0.7;
  group.add(tail);

  // Collar
  group.add(pm(new THREE.TorusGeometry(0.1, 0.015, 5, 8), createPS1Material(0xCC3333), 0.26, 0.36, 0, Math.PI / 2));
  group.add(pm(new THREE.SphereGeometry(0.018, 5, 4), createPS1Material(0xDDAA44), 0.26, 0.33, 0.08));

  group.position.set(-5, 0, -5);
  group.rotation.y = Math.PI * 0.4;
  return group;
}

// ── Public API ──────────────────────────────────────────────────

export interface AnimatedCharacter {
  group: THREE.Group;
  phaseOffset: number;
  type: 'human' | 'cat' | 'dog';
}

export function createCharacters(scene: THREE.Scene): AnimatedCharacter[] {
  const characters: AnimatedCharacter[] = [];
  for (const d of CHARACTERS) {
    const group = d.name === 'hero' ? buildEnhancedHero(d)
      : d.name === 'heroine' ? buildEnhancedHeroine(d)
      : buildHumanoid(d);
    scene.add(group);
    characters.push({ group, phaseOffset: Math.random() * Math.PI * 2, type: 'human' });
  }
  const cat = buildCat();
  scene.add(cat);
  characters.push({ group: cat, phaseOffset: Math.random() * Math.PI * 2, type: 'cat' });
  const dog = buildDog();
  scene.add(dog);
  characters.push({ group: dog, phaseOffset: Math.random() * Math.PI * 2, type: 'dog' });
  return characters;
}

export function updateCharacterAnimations(characters: AnimatedCharacter[], time: number): void {
  for (const { group, phaseOffset, type } of characters) {
    const baseY = group.userData.baseY ?? 0;
    group.position.y = baseY + Math.sin(time * 1.5 + phaseOffset) * 0.035;

    if (type === 'cat') { group.rotation.z = Math.sin(time * 2 + phaseOffset) * 0.02; continue; }
    if (type === 'dog') { group.rotation.z = Math.sin(time * 1.8 + phaseOffset) * 0.025; continue; }

    group.rotation.z = Math.sin(time + phaseOffset) * 0.015;
    const headGroup = group.userData.headGroup as THREE.Group | undefined;
    if (headGroup) {
      headGroup.rotation.y = Math.sin(time * 0.7 + phaseOffset * 2) * 0.15;
      headGroup.rotation.x = Math.sin(time * 0.5 + phaseOffset) * 0.03;
      const blinkCycle = (time * 0.8 + phaseOffset) % 4;
      const blinkAmount = blinkCycle < 0.15 ? 1 : 0;
      headGroup.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.userData.isEyelid) child.scale.y = blinkAmount;
      });
    }
    const arms = group.userData.armMeshes as THREE.Mesh[] | undefined;
    if (arms && arms.length >= 2) {
      arms[0].rotation.x = Math.sin(time * 0.8 + phaseOffset) * 0.06;
      arms[1].rotation.x = Math.sin(time * 0.8 + phaseOffset + Math.PI) * 0.06;
    }
  }
}

export function initCharacterBasePositions(characters: AnimatedCharacter[]): void {
  for (const { group } of characters) { group.userData.baseY = group.position.y; }
}
