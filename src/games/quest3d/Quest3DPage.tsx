// ═══════════════════════════════════════════════════════════════════
// Quest3DPage.tsx — PS1-Style 3D Town Demo (Three.js)
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { QUEST3D_CONFIG } from './rules';
import { buildTownScene } from './Quest3DScene';
import { createCharacters, updateCharacterAnimations, initCharacterBasePositions, AnimatedCharacter } from './Quest3DCharacters';
import { createPS1RenderTarget, createBlitMaterial, createBlitQuad } from './PS1Shader';

const { resolution, renderResolution } = QUEST3D_CONFIG;
const SKY_COLOR = 0x88AACC;

export default function Quest3DPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    try {
    // ── Renderer ────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(resolution.width, resolution.height);
    renderer.setPixelRatio(1); // Keep pixel-perfect
    renderer.setClearColor(SKY_COLOR);
    renderer.autoClear = false;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.imageRendering = 'pixelated';

    // ── Low-res render target (PS1 pixelation) ─────────────────
    const renderTarget = createPS1RenderTarget(renderResolution.width, renderResolution.height);
    const blitMat = createBlitMaterial(renderTarget);
    const blitQuad = createBlitQuad(blitMat);
    const blitScene = new THREE.Scene();
    const blitCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    blitScene.add(blitQuad);

    // ── Scene ───────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(SKY_COLOR, 15, 45);
    scene.background = new THREE.Color(SKY_COLOR);

    // ── Lighting ────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x606080, 1.2);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xFFEECC, 0.8);
    sun.position.set(8, 12, 5);
    scene.add(sun);

    // Subtle fill from opposite side
    const fill = new THREE.DirectionalLight(0x8899BB, 0.25);
    fill.position.set(-5, 4, -8);
    scene.add(fill);

    // ── Camera ──────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(
      60,
      resolution.width / resolution.height,
      0.1,
      100
    );
    camera.position.set(13, 1.6, 4);
    camera.lookAt(13, 1.0, 0);

    // ── Orbit Controls ──────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.target.set(0, 0, 0);

    // ── WASD pan ────────────────────────────────────────────────
    const keys: Record<string, boolean> = {};
    const PAN_SPEED = 0.15;

    function onKeyDown(e: KeyboardEvent) {
      keys[e.key.toLowerCase()] = true;
    }
    function onKeyUp(e: KeyboardEvent) {
      keys[e.key.toLowerCase()] = false;
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // ── Build Scene ─────────────────────────────────────────────
    buildTownScene(scene);
    const characters: AnimatedCharacter[] = createCharacters(scene);
    initCharacterBasePositions(characters);

    // ── GLTF Reference: Michelle (animated female) ─────────────
    const gltfLoader = new GLTFLoader();
    let michelleAnimMixer: THREE.AnimationMixer | null = null;

    // ── Canvas texture generators ──
    function makeCanvasTex(size: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const cx = c.getContext('2d')!;
      draw(cx, size, size);
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }

    // Skin texture — subtle warmth variation + pores
    const skinTex = makeCanvasTex(128, (ctx, w, h) => {
      ctx.fillStyle = '#F0D0B0';
      ctx.fillRect(0, 0, w, h);
      // Subtle skin variation
      for (let i = 0; i < 800; i++) {
        const x = Math.random() * w, y = Math.random() * h;
        const r = Math.random();
        ctx.fillStyle = r < 0.3 ? 'rgba(220,180,150,0.15)' : r < 0.6 ? 'rgba(255,210,180,0.1)' : 'rgba(200,160,130,0.08)';
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    });

    // Fabric texture — woven pattern for clothing
    const fabricTex = makeCanvasTex(64, (ctx, w, h) => {
      ctx.fillStyle = '#3355BB';
      ctx.fillRect(0, 0, w, h);
      // Woven grid pattern
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          const bright = ((x + y) % 4 === 0) ? 15 : -10;
          ctx.fillStyle = `rgba(${bright > 0 ? 255 : 0},${bright > 0 ? 255 : 0},${bright > 0 ? 255 : 0},${Math.abs(bright) / 255})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      // Subtle fabric noise
      for (let i = 0; i < 200; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
    });

    // Hair texture — strand lines
    const hairTex = makeCanvasTex(64, (ctx, w, h) => {
      ctx.fillStyle = '#553388';
      ctx.fillRect(0, 0, w, h);
      // Vertical strand lines
      for (let x = 0; x < w; x++) {
        const bright = Math.sin(x * 0.8) * 15 + Math.random() * 10 - 5;
        ctx.fillStyle = `rgba(${bright > 0 ? 255 : 0},${bright > 0 ? 200 : 0},${bright > 0 ? 255 : 0},${Math.abs(bright) / 200})`;
        ctx.fillRect(x, 0, 1, h);
      }
      // Random highlights
      for (let i = 0; i < 100; i++) {
        ctx.fillStyle = `rgba(150,100,200,${Math.random() * 0.15})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 3);
      }
    });

    // Leather texture — for boots
    const leatherTex = makeCanvasTex(64, (ctx, w, h) => {
      ctx.fillStyle = '#334466';
      ctx.fillRect(0, 0, w, h);
      // Leather grain
      for (let i = 0; i < 400; i++) {
        const x = Math.random() * w, y = Math.random() * h;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
        ctx.fillRect(x, y, Math.random() * 2 + 0.5, Math.random() * 2 + 0.5);
      }
    });

    // Pants fabric — slightly different from top
    const pantsTex = makeCanvasTex(64, (ctx, w, h) => {
      ctx.fillStyle = '#2A2A44';
      ctx.fillRect(0, 0, w, h);
      // Denim-like diagonal weave
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if ((x + y) % 3 === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    gltfLoader.load('/models/michelle.glb', (gltf) => {
      const model = gltf.scene;
      model.position.set(16, 0, 0);
      model.scale.setScalar(1.0);
      model.rotation.y = Math.PI * 1.2;

      // ── Textured materials ──
      const matSkin = new THREE.MeshStandardMaterial({ map: skinTex, color: 0xF5DCC0, roughness: 0.75 });
      const matTop = new THREE.MeshStandardMaterial({ map: fabricTex, color: 0x3355BB, roughness: 0.55 });
      const matPants = new THREE.MeshStandardMaterial({ map: pantsTex, color: 0x2A2A44, roughness: 0.6 });
      const matHair = new THREE.MeshStandardMaterial({ map: hairTex, color: 0x664499, roughness: 0.5 });
      const matBoots = new THREE.MeshStandardMaterial({ map: leatherTex, color: 0x3A4A5E, roughness: 0.35, metalness: 0.1 });
      const matEyes = new THREE.MeshStandardMaterial({ color: 0xF8F8F0, roughness: 0.3 });
      const matLash = new THREE.MeshStandardMaterial({ color: 0x1A0A1A, roughness: 0.9 });

      // Traverse everything — use .isMesh flag (catches SkinnedMesh too)
      model.traverse((child: THREE.Object3D) => {
        const obj = child as THREE.Mesh;
        if (!obj.isMesh) return;

        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        console.log(`MICHELLE MESH: "${obj.name}" (${obj.type}) materials=[${mats.map((m,i) => `${i}:"${m.name}" color=${'color' in m ? '#'+(m as any).color.getHexString() : 'none'}`).join(', ')}]`);

        // Build replacement array (or single) matching by material name
        const newMats = mats.map((mat) => {
          const mn = (mat.name || '').toLowerCase();
          // Match by material name keywords
          if (mn.includes('skin') || mn.includes('body') || mn.includes('head') || mn.includes('face')) return matSkin;
          if (mn.includes('hair')) return matHair;
          if (mn.includes('top') || mn.includes('shirt') || mn.includes('jacket')) return matTop;
          if (mn.includes('bottom') || mn.includes('pant') || mn.includes('jean')) return matPants;
          if (mn.includes('shoe') || mn.includes('boot') || mn.includes('sneak')) return matBoots;
          if (mn.includes('lash') || mn.includes('brow')) return matLash;
          if (mn.includes('eye') || mn.includes('cornea')) return matEyes;
          if (mn.includes('glass') || mn.includes('spectacle')) return matLash; // hide via dark

          // Fallback: analyze original color
          if ('color' in mat) {
            const c = (mat as any).color;
            const r = c.r, g = c.g, b = c.b;
            const lum = r * 0.299 + g * 0.587 + b * 0.114;
            if (lum < 0.08) return matLash;         // very dark = lashes/brows
            if (lum > 0.85) return matEyes;          // very light = eye whites
            if (r > 0.6 && r > g * 1.3) return matSkin;  // warm = skin
            if (b > r && b > g) return matTop;        // blue-ish = clothes
            if (lum < 0.25) return matBoots;          // dark = boots
            return matSkin;                            // warm-ish default = skin
          }
          return matTop;
        });

        obj.material = newMats.length === 1 ? newMats[0] : newMats;
      });

      scene.add(model);

      // Play idle animation
      if (gltf.animations.length > 0) {
        michelleAnimMixer = new THREE.AnimationMixer(model);
        michelleAnimMixer.clipAction(gltf.animations[0]).play();
      }

      // Label
      const lc = document.createElement('canvas');
      lc.width = 256; lc.height = 64;
      const lx = lc.getContext('2d')!;
      lx.fillStyle = '#fff'; lx.font = 'bold 24px sans-serif';
      lx.fillText('GLTF Customized', 10, 40);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lc) }));
      label.position.set(16, 2.5, 0);
      label.scale.set(2, 0.5, 1);
      scene.add(label);
    });

    // ── Unified Mesh Heroine (v2) — improved proportions & connectivity ──
    {
      const unified = new THREE.Group();
      const skinMat = new THREE.MeshLambertMaterial({ color: 0xF0D0B0, flatShading: true });
      const clothMat = new THREE.MeshLambertMaterial({ color: 0x3355BB, flatShading: true });
      const hairMat = new THREE.MeshLambertMaterial({ color: 0x553388, flatShading: true });
      const hairHL = new THREE.MeshLambertMaterial({ color: 0x664499, flatShading: true });
      const bootMat = new THREE.MeshLambertMaterial({ color: 0x334466, flatShading: true });
      const accentMat = new THREE.MeshLambertMaterial({ color: 0x5577DD, flatShading: true });
      const eyeWhite = new THREE.MeshLambertMaterial({ color: 0xEEEEEE });
      const irisMat = new THREE.MeshLambertMaterial({ color: 0x3366AA });
      const pupilMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
      const lipMat = new THREE.MeshLambertMaterial({ color: 0xCC7777 });
      const lashMat = new THREE.MeshLambertMaterial({ color: 0x221122 });

      // ── Helper: build connected tube mesh from vertex rings ──
      function buildTubeMesh(
        rings: { y: number; points: [number, number][] }[],
        mat: THREE.Material,
        closed?: 'top' | 'bottom' | 'both'
      ): THREE.Mesh {
        const positions: number[] = [];
        const indices: number[] = [];
        for (const ring of rings) {
          for (const [x, z] of ring.points) {
            positions.push(x, ring.y, z);
          }
        }
        const segs = rings[0].points.length;
        for (let r = 0; r < rings.length - 1; r++) {
          const b0 = r * segs, b1 = (r + 1) * segs;
          for (let s = 0; s < segs; s++) {
            const s1 = (s + 1) % segs;
            indices.push(b0 + s, b1 + s, b1 + s1);
            indices.push(b0 + s, b1 + s1, b0 + s1);
          }
        }
        if (closed === 'bottom' || closed === 'both') {
          const ci = positions.length / 3;
          const r = rings[0];
          positions.push(
            r.points.reduce((a, p) => a + p[0], 0) / segs, r.y,
            r.points.reduce((a, p) => a + p[1], 0) / segs
          );
          for (let s = 0; s < segs; s++) indices.push(ci, (s + 1) % segs, s);
        }
        if (closed === 'top' || closed === 'both') {
          const ci = positions.length / 3;
          const r = rings[rings.length - 1], bi = (rings.length - 1) * segs;
          positions.push(
            r.points.reduce((a, p) => a + p[0], 0) / segs, r.y,
            r.points.reduce((a, p) => a + p[1], 0) / segs
          );
          for (let s = 0; s < segs; s++) indices.push(ci, bi + s, bi + (s + 1) % segs);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        return new THREE.Mesh(geo, mat);
      }

      // Generate ring with elliptical cross-section + optional bust deformation
      function makeRing(n: number, rx: number, rz: number, bustPush?: number): [number, number][] {
        const pts: [number, number][] = [];
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          let x = Math.cos(a) * rx;
          let z = Math.sin(a) * rz;
          if (bustPush && bustPush > 0 && z > 0) {
            const normA = Math.atan2(z, x);
            const halfPI = Math.PI / 2;
            for (const center of [halfPI - 0.5, halfPI + 0.5]) {
              const dist = Math.abs(normA - center);
              if (dist < 0.7) {
                const s = Math.cos((dist / 0.7) * Math.PI / 2);
                z += bustPush * s * s;
              }
            }
          }
          pts.push([x, z]);
        }
        return pts;
      }

      // Custom ring for hair — exclude front face area
      function hairRing(n: number, rx: number, rz: number): [number, number][] {
        const pts: [number, number][] = [];
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          let er = 1.0;
          // Pull in front vertices so hair doesn't cover face
          const frontness = Math.sin(a);  // 1 at front, -1 at back
          if (frontness > 0.3) {
            er = 1.0 - (frontness - 0.3) * 0.15;  // subtle pullback at front
          }
          pts.push([Math.cos(a) * rx * er, Math.sin(a) * rz * er]);
        }
        return pts;
      }

      const N = 20; // more vertices = smoother curves

      // ═══ BODY — single connected mesh: waist → bust → shoulders → neck ═══
      const bodyMesh = buildTubeMesh([
        { y: 0.82, points: makeRing(N, 0.14, 0.09) },            // waist bottom
        { y: 0.85, points: makeRing(N, 0.12, 0.08) },            // waist
        { y: 0.88, points: makeRing(N, 0.09, 0.065) },           // narrow waist
        { y: 0.92, points: makeRing(N, 0.08, 0.06) },            // waist pinch (hourglass)
        { y: 0.96, points: makeRing(N, 0.09, 0.065) },           // ribs
        { y: 1.00, points: makeRing(N, 0.11, 0.08) },            // lower ribs
        { y: 1.04, points: makeRing(N, 0.13, 0.09, 0.02) },      // underbust
        { y: 1.08, points: makeRing(N, 0.14, 0.09, 0.06) },      // bust lower
        { y: 1.12, points: makeRing(N, 0.15, 0.09, 0.10) },      // bust peak
        { y: 1.16, points: makeRing(N, 0.15, 0.09, 0.08) },      // bust upper
        { y: 1.20, points: makeRing(N, 0.14, 0.09, 0.04) },      // above bust
        { y: 1.24, points: makeRing(N, 0.13, 0.08) },            // upper chest
        { y: 1.28, points: makeRing(N, 0.11, 0.075) },           // collarbone area
        { y: 1.32, points: makeRing(N, 0.08, 0.06) },            // base of neck
        { y: 1.35, points: makeRing(N, 0.06, 0.05) },            // neck transition
      ], clothMat);
      unified.add(bodyMesh);

      // ═══ NECK — skin, connects body to head ═══
      const neckMesh = buildTubeMesh([
        { y: 1.34, points: makeRing(N, 0.055, 0.048) },
        { y: 1.37, points: makeRing(N, 0.050, 0.044) },
        { y: 1.40, points: makeRing(N, 0.048, 0.042) },
        { y: 1.43, points: makeRing(N, 0.050, 0.044) },
        { y: 1.46, points: makeRing(N, 0.055, 0.048) },
      ], skinMat);
      unified.add(neckMesh);

      // ═══ HIPS + SKIRT — connected downward from waist ═══
      const skirtMesh = buildTubeMesh([
        { y: 0.62, points: makeRing(N, 0.22, 0.16) },    // hem (flared)
        { y: 0.65, points: makeRing(N, 0.20, 0.14) },
        { y: 0.69, points: makeRing(N, 0.18, 0.12) },
        { y: 0.73, points: makeRing(N, 0.16, 0.11) },
        { y: 0.77, points: makeRing(N, 0.15, 0.10) },
        { y: 0.82, points: makeRing(N, 0.14, 0.09) },    // meets waist
      ], clothMat, 'bottom');
      unified.add(skirtMesh);

      // ═══ HEAD — smooth feminine egg shape ═══
      const headMesh = buildTubeMesh([
        { y: 1.45, points: makeRing(N, 0.02, 0.015) },   // chin point
        { y: 1.47, points: makeRing(N, 0.06, 0.04) },    // chin
        { y: 1.49, points: makeRing(N, 0.09, 0.07) },    // jaw
        { y: 1.51, points: makeRing(N, 0.11, 0.09) },    // lower cheeks
        { y: 1.54, points: makeRing(N, 0.12, 0.10) },    // cheeks
        { y: 1.57, points: makeRing(N, 0.13, 0.11) },    // mid face
        { y: 1.60, points: makeRing(N, 0.135, 0.115) },   // eye level
        { y: 1.63, points: makeRing(N, 0.135, 0.115) },   // brow
        { y: 1.66, points: makeRing(N, 0.13, 0.11) },    // forehead
        { y: 1.69, points: makeRing(N, 0.12, 0.10) },    // upper forehead
        { y: 1.72, points: makeRing(N, 0.10, 0.09) },    // crown
        { y: 1.75, points: makeRing(N, 0.07, 0.06) },    // top
        { y: 1.77, points: makeRing(N, 0.03, 0.03) },    // apex
      ], skinMat, 'both');
      unified.add(headMesh);

      // ── Eyes — placed on head surface ──
      for (const side of [-1, 1]) {
        const white = new THREE.Mesh(new THREE.SphereGeometry(0.024, 7, 5), eyeWhite);
        white.scale.set(1.3, 0.8, 0.5);
        white.position.set(side * 0.055, 1.60, 0.105);
        unified.add(white);
        const iris = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 4), irisMat);
        iris.position.set(side * 0.055, 1.598, 0.115);
        unified.add(iris);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.008, 5, 3), pupilMat);
        pupil.position.set(side * 0.055, 1.598, 0.12);
        unified.add(pupil);
        // Highlight
        unified.add((() => { const h = new THREE.Mesh(new THREE.SphereGeometry(0.004, 4, 3), eyeWhite); h.position.set(side * 0.048, 1.605, 0.121); return h; })());
        // Upper lash line
        const lash = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.005, 0.008), lashMat);
        lash.position.set(side * 0.055, 1.615, 0.112);
        unified.add(lash);
      }

      // Eyebrows
      for (const side of [-1, 1]) {
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.008, 0.008), new THREE.MeshLambertMaterial({ color: 0x553388 }));
        brow.position.set(side * 0.055, 1.635, 0.112);
        brow.rotation.z = side * -0.12;
        unified.add(brow);
      }

      // Nose
      const noseBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.010, 0.035, 4), skinMat);
      noseBridge.position.set(0, 1.565, 0.115);
      noseBridge.rotation.x = 0.2;
      unified.add(noseBridge);
      const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.014, 5, 4), skinMat);
      noseTip.position.set(0, 1.545, 0.118);
      unified.add(noseTip);

      // Lips
      const upperLip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 3), lipMat);
      upperLip.scale.set(1.3, 0.3, 0.5);
      upperLip.position.set(0, 1.52, 0.10);
      unified.add(upperLip);
      const lowerLip = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 3), lipMat);
      lowerLip.scale.set(1.2, 0.25, 0.4);
      lowerLip.position.set(0, 1.51, 0.095);
      unified.add(lowerLip);

      // Ears
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 4, 3), skinMat);
        ear.scale.set(0.35, 0.7, 0.5);
        ear.position.set(side * 0.13, 1.59, 0);
        unified.add(ear);
      }

      // ═══ HAIR — connected cap + flowing curtain ═══
      // Hair cap that wraps over head, thicker at back, pulled back at face
      const hairCapMesh = buildTubeMesh([
        { y: 1.54, points: hairRing(N, 0.005, 0.125) },    // bottom ring (pulled in at front, flows at back)
        { y: 1.58, points: hairRing(N, 0.145, 0.125) },
        { y: 1.62, points: hairRing(N, 0.15, 0.13) },
        { y: 1.66, points: hairRing(N, 0.15, 0.125) },
        { y: 1.70, points: hairRing(N, 0.14, 0.115) },
        { y: 1.74, points: hairRing(N, 0.12, 0.10) },
        { y: 1.77, points: hairRing(N, 0.08, 0.07) },
        { y: 1.79, points: hairRing(N, 0.04, 0.04) },
      ], hairMat, 'top');
      unified.add(hairCapMesh);

      // Hair curtain — tapered panel flowing down back
      // Use more rings for smooth flow, wider at top, tapered at tips
      const curtainW = (y: number) => {  // width narrows from top to bottom
        const t = (y - 0.70) / (1.56 - 0.70);  // 0 at bottom, 1 at top
        return 0.08 + t * 0.06;
      };
      const curtainD = (y: number) => {  // depth (thickness)
        const t = (y - 0.70) / (1.56 - 0.70);
        return -0.10 - t * 0.03;
      };
      const curtainRings: { y: number; points: [number, number][] }[] = [];
      for (let yi = 0; yi <= 8; yi++) {
        const y = 0.70 + (yi / 8) * (1.56 - 0.70);
        const w = curtainW(y);
        const d = curtainD(y);
        curtainRings.push({
          y,
          points: [
            [-w, d], [-w * 0.7, d - 0.015], [0, d - 0.02],
            [w * 0.7, d - 0.015], [w, d],
            [w, d + 0.03], [0, d + 0.035], [-w, d + 0.03],
          ]
        });
      }
      const hairCurtainMesh = buildTubeMesh(curtainRings, hairMat, 'bottom');
      unified.add(hairCurtainMesh);

      // Highlight streak on curtain
      const hlRings: { y: number; points: [number, number][] }[] = [];
      for (let yi = 0; yi <= 6; yi++) {
        const y = 0.72 + (yi / 6) * (1.50 - 0.72);
        const d = curtainD(y) - 0.001;
        const w = 0.03;
        hlRings.push({ y, points: [[-w, d], [0, d - 0.005], [w, d], [w, d + 0.01], [0, d + 0.012], [-w, d + 0.01]] });
      }
      const hlMesh = buildTubeMesh(hlRings, hairHL);
      unified.add(hlMesh);

      // Side face-framing strands (connected tubes from cap to mid-body)
      for (const side of [-1, 1]) {
        const strandRings: { y: number; points: [number, number][] }[] = [];
        for (let yi = 0; yi <= 6; yi++) {
          const y = 1.10 + (yi / 6) * (1.56 - 1.10);
          const t = yi / 6;
          const bx = side * (0.13 + t * 0.02);
          const w = 0.015 + t * 0.01;
          const fz = 0.05 + t * 0.04;
          strandRings.push({ y, points: [[bx - w, fz], [bx, fz + 0.015], [bx + w, fz], [bx, fz - 0.01]] });
        }
        const strand = buildTubeMesh(strandRings, side === -1 ? hairHL : hairMat, 'bottom');
        unified.add(strand);
      }

      // Bangs — soft fringe along hairline
      for (let i = 0; i < 7; i++) {
        const bx = (i - 3) * 0.022;
        const bang = new THREE.Mesh(new THREE.SphereGeometry(0.011, 4, 3), i % 2 === 0 ? hairMat : hairHL);
        bang.scale.set(1.1, 1.6, 0.35);
        bang.position.set(bx, 1.635, 0.115);
        unified.add(bang);
      }

      // ═══ SHOULDERS + ARMS — connected from body to fingertips ═══
      for (const side of [-1, 1]) {
        // Shoulder cap (smooth transition from torso)
        const shoulderMesh = buildTubeMesh([
          { y: 1.22, points: makeRing(10, 0.042, 0.038) },  // arm start
          { y: 1.26, points: makeRing(10, 0.048, 0.042) },  // deltoid
          { y: 1.30, points: makeRing(10, 0.042, 0.038) },  // shoulder join
          { y: 1.33, points: makeRing(10, 0.030, 0.028) },  // merge into body
        ], clothMat, 'top');
        shoulderMesh.position.x = side * 0.14;
        unified.add(shoulderMesh);

        // Upper arm (clothed)
        const upperArm = buildTubeMesh([
          { y: 0.96, points: makeRing(10, 0.038, 0.036) },   // elbow
          { y: 1.02, points: makeRing(10, 0.040, 0.038) },
          { y: 1.08, points: makeRing(10, 0.042, 0.039) },
          { y: 1.14, points: makeRing(10, 0.044, 0.040) },
          { y: 1.20, points: makeRing(10, 0.043, 0.039) },
          { y: 1.24, points: makeRing(10, 0.042, 0.038) },   // shoulder
        ], clothMat);
        upperArm.position.x = side * 0.14;
        unified.add(upperArm);

        // Sleeve cuff accent
        const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.039, 0.006, 5, 8), accentMat);
        cuff.position.set(side * 0.14, 0.97, 0);
        cuff.rotation.x = Math.PI / 2;
        unified.add(cuff);

        // Forearm (skin)
        const forearm = buildTubeMesh([
          { y: 0.72, points: makeRing(10, 0.028, 0.027) },   // wrist
          { y: 0.78, points: makeRing(10, 0.033, 0.031) },
          { y: 0.84, points: makeRing(10, 0.036, 0.034) },
          { y: 0.90, points: makeRing(10, 0.037, 0.035) },
          { y: 0.96, points: makeRing(10, 0.038, 0.036) },   // elbow
        ], skinMat);
        forearm.position.x = side * 0.14;
        unified.add(forearm);

        // Hand
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.030, 6, 5), skinMat);
        hand.scale.set(0.8, 0.55, 1.1);
        hand.position.set(side * 0.14, 0.69, 0.01);
        unified.add(hand);

        // Simple fingers
        for (let f = 0; f < 4; f++) {
          const angle = ((f - 1.5) / 3) * 0.5;
          const fx = side * 0.14 + Math.sin(angle) * 0.025;
          const fz = Math.cos(angle) * 0.025 + 0.01;
          const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.005, 0.04, 4), skinMat);
          finger.position.set(fx, 0.665, fz);
          finger.rotation.x = 0.3;
          unified.add(finger);
        }
      }

      // ═══ LEGS — connected from hips to boots ═══
      for (const side of [-1, 1]) {
        // Upper leg (bare skin, from under skirt to knee)
        const upperLeg = buildTubeMesh([
          { y: 0.38, points: makeRing(10, 0.044, 0.042) },   // knee
          { y: 0.42, points: makeRing(10, 0.050, 0.046) },
          { y: 0.47, points: makeRing(10, 0.058, 0.052) },
          { y: 0.52, points: makeRing(10, 0.065, 0.056) },   // thigh
          { y: 0.57, points: makeRing(10, 0.070, 0.058) },
          { y: 0.62, points: makeRing(10, 0.072, 0.056) },   // upper thigh / skirt
        ], skinMat, 'top');
        upperLeg.position.x = side * 0.07;
        unified.add(upperLeg);

        // Lower leg (shin to ankle)
        const lowerLeg = buildTubeMesh([
          { y: 0.18, points: makeRing(10, 0.034, 0.034) },   // ankle
          { y: 0.22, points: makeRing(10, 0.036, 0.036) },
          { y: 0.26, points: makeRing(10, 0.042, 0.040) },
          { y: 0.30, points: makeRing(10, 0.048, 0.045) },   // calf peak
          { y: 0.34, points: makeRing(10, 0.046, 0.043) },
          { y: 0.38, points: makeRing(10, 0.044, 0.042) },   // knee
        ], skinMat);
        lowerLeg.position.x = side * 0.07;
        unified.add(lowerLeg);

        // Boot
        const boot = buildTubeMesh([
          { y: 0.02, points: makeRing(10, 0.042, 0.052) },   // toe
          { y: 0.04, points: makeRing(10, 0.040, 0.046) },
          { y: 0.07, points: makeRing(10, 0.038, 0.040) },
          { y: 0.11, points: makeRing(10, 0.038, 0.038) },
          { y: 0.16, points: makeRing(10, 0.040, 0.038) },
          { y: 0.20, points: makeRing(10, 0.042, 0.038) },   // cuff
        ], bootMat, 'bottom');
        boot.position.x = side * 0.07;
        unified.add(boot);

        // Boot cuff accent
        const bootCuff = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.005, 5, 8), accentMat);
        bootCuff.position.set(side * 0.07, 0.19, 0);
        bootCuff.rotation.x = Math.PI / 2;
        unified.add(bootCuff);

        // Small heel
        const heel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.025), bootMat);
        heel.position.set(side * 0.07, 0.013, -0.03);
        unified.add(heel);
      }

      // ═══ ACCENT DETAILS ═══
      // Waist band
      const waistBand = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.008, 5, 14), accentMat);
      waistBand.position.set(0, 0.84, 0);
      waistBand.rotation.x = Math.PI / 2;
      unified.add(waistBand);

      // Front straps (bust to waist)
      for (const side of [-1, 1]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.40, 0.006), accentMat);
        strap.position.set(side * 0.05, 1.02, 0.11);
        unified.add(strap);
      }

      // Center seam
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.45, 0.006), accentMat);
      seam.position.set(0, 1.02, 0.12);
      unified.add(seam);

      // Collar
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.007, 5, 10), accentMat);
      collar.position.set(0, 1.35, 0);
      collar.rotation.x = Math.PI / 2;
      unified.add(collar);

      // Skirt hem accent
      const hem = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.006, 5, 14), accentMat);
      hem.position.set(0, 0.62, 0);
      hem.rotation.x = Math.PI / 2;
      unified.add(hem);

      unified.position.set(12, 0, 0);
      unified.rotation.y = Math.PI * 1.2;
      scene.add(unified);

      // Label
      {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 64;
        const cx = c.getContext('2d')!;
        cx.fillStyle = '#fff'; cx.font = 'bold 24px sans-serif';
        cx.fillText('Unified Mesh v2', 10, 40);
        const t = new THREE.CanvasTexture(c);
        const l = new THREE.Sprite(new THREE.SpriteMaterial({ map: t }));
        l.position.set(12, 2.5, 0);
        l.scale.set(2, 0.5, 1);
        scene.add(l);
      }
    }

    setLoaded(true);

    // ── Animation Loop ──────────────────────────────────────────
    let animId = 0;
    const clock = new THREE.Clock();

    function animate() {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;

      // WASD panning
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

      if (keys['w']) { controls.target.addScaledVector(forward, PAN_SPEED); }
      if (keys['s']) { controls.target.addScaledVector(forward, -PAN_SPEED); }
      if (keys['a']) { controls.target.addScaledVector(right, -PAN_SPEED); }
      if (keys['d']) { controls.target.addScaledVector(right, PAN_SPEED); }

      // Clamp target to town bounds
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -15, 15);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -15, 15);

      controls.update();

      // Character animations
      updateCharacterAnimations(characters, elapsed);

      // Michelle GLTF animation
      if (michelleAnimMixer) michelleAnimMixer.update(delta);

      // Render to low-res target
      renderer.setRenderTarget(renderTarget);
      renderer.clear();
      renderer.render(scene, camera);

      // Blit to screen
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(blitScene, blitCamera);
    }
    animate();

    // ── Cleanup ─────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      controls.dispose();
      renderer.dispose();
      renderTarget.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    } catch (err) {
      console.error('Quest3D init error:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-4 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-3">
        <button
          onClick={() => navigate('/lobby/quest3d')}
          className="text-white/50 hover:text-white text-sm transition-colors"
        >
          &larr; Back
        </button>
        <h1 className="text-xl font-display font-bold text-white">
          Sparkstone Quest
        </h1>
        <span className="text-white/30 text-xs">PS1-Style Tech Demo</span>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden shadow-2xl border border-white/10"
        style={{ width: resolution.width, height: resolution.height, background: '#88AACC' }}
      />

      {/* Loading overlay */}
      {!loaded && !error && (
        <div
          className="absolute flex items-center justify-center"
          style={{ width: resolution.width, height: resolution.height }}
        >
          <div className="text-white/50 animate-pulse text-sm">Building town...</div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-4 p-4 bg-red-900/50 border border-red-500/50 rounded-lg max-w-lg">
          <p className="text-red-300 text-sm font-mono">{error}</p>
        </div>
      )}

      {/* Controls hint */}
      <div className="mt-3 flex gap-6 text-xs text-white/30">
        <span>Mouse drag — Orbit camera</span>
        <span>Scroll — Zoom</span>
        <span>WASD — Pan around town</span>
      </div>
    </div>
  );
}
