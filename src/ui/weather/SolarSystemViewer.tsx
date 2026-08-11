// ═══════════════════════════════════════════════════════════════════
// SolarSystemViewer.tsx — interactive 3D solar system for the Space
// Weather tab. Drag/pinch to orbit & zoom, tap a planet or the Sun for
// real astronomical facts, tap the three glowing markers (solar wind,
// flare activity, aurora) for a live readout pulled from the same NOAA
// data powering the rest of the tab.
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
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLANETS, SUN_RADIUS, SUN_FACTS, type PlanetDef } from '../../lib/solarSystemData';
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
  | { kind: 'solarwind' }
  | { kind: 'flare' }
  | { kind: 'aurora' };

interface Props {
  data: SpaceWeatherSnapshot | null;
  station: WeatherStation | null;
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

function makeMottledTexture(base: number, accent: number): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const b = hexToRgb(base);
  const a = hexToRgb(accent);
  ctx.fillStyle = rgbStr(b);
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 6 + 1;
    const t = Math.random();
    ctx.fillStyle = rgbStr(t > 0.5 ? shade(a, (Math.random() - 0.5) * 20) : shade(b, (Math.random() - 0.5) * 24), 0.5);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function makeBandedTexture(base: number, accent: number, spot?: number): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const b = hexToRgb(base);
  const a = hexToRgb(accent);
  // Horizontal bands with wavy edges, like gas-giant cloud belts.
  const bandCount = 9;
  for (let i = 0; i < bandCount; i++) {
    const y0 = (i / bandCount) * h;
    const y1 = ((i + 1) / bandCount) * h;
    const useAccent = i % 2 === 0;
    const col = useAccent ? a : b;
    const jitterAmt = (Math.random() - 0.5) * 18;
    ctx.fillStyle = rgbStr(shade(col, jitterAmt));
    ctx.fillRect(0, y0, w, y1 - y0);
  }
  // Soft horizontal noise streaks for texture.
  for (let i = 0; i < 400; i++) {
    const y = Math.random() * h;
    const x = Math.random() * w;
    const len = Math.random() * 30 + 10;
    ctx.strokeStyle = rgbStr(shade(Math.random() > 0.5 ? a : b, (Math.random() - 0.5) * 30), 0.25);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + (Math.random() - 0.5) * 2);
    ctx.stroke();
  }
  if (spot) {
    const sc = hexToRgb(spot);
    ctx.fillStyle = rgbStr(sc, 0.85);
    ctx.beginPath();
    ctx.ellipse(w * 0.28, h * 0.62, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function makeEarthTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#245a9c';
  ctx.fillRect(0, 0, w, h);
  // Landmasses — random green/brown blobs.
  for (let i = 0; i < 16; i++) {
    const cx = Math.random() * w;
    const cy = Math.random() * h * 0.8 + h * 0.1;
    const rx = Math.random() * 22 + 8;
    const ry = Math.random() * 12 + 5;
    ctx.fillStyle = Math.random() > 0.4 ? 'rgba(74,124,60,0.9)' : 'rgba(120,108,66,0.85)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    // wrap-around continuity at the seams
    ctx.beginPath();
    ctx.ellipse(cx - w, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + w, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Poles
  ctx.fillStyle = 'rgba(240,245,250,0.9)';
  ctx.fillRect(0, 0, w, h * 0.08);
  ctx.fillRect(0, h * 0.92, w, h * 0.08);
  // Clouds
  for (let i = 0; i < 22; i++) {
    const cx = Math.random() * w;
    const cy = Math.random() * h;
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.25 + 0.08})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.random() * 20 + 8, Math.random() * 6 + 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function makeSunTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
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
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// Radial-gradient sprite texture for glow effects (Sun corona, markers).
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

interface ClickTarget {
  object: THREE.Object3D;
  selection: Selection;
}

export default function SolarSystemViewer({ data, station }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef(data);
  const stationRef = useRef(station);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    stationRef.current = station;
  }, [station]);

  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;
    // Explicitly-typed non-null alias — plain narrowing of `container`
    // doesn't survive being read inside the nested `resize` function
    // declaration below, so give the closures a binding TS already
    // knows is non-null by its declared type, not by control flow.
    const container: HTMLDivElement = containerEl;

    let disposed = false;
    const clickTargets: ClickTarget[] = [];
    const disposables: { dispose: () => void }[] = [];

    // ── Renderer / Scene / Camera ─────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x03040a);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
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
    const sunTex = makeSunTexture();
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
    interface PlanetRuntime {
      def: PlanetDef;
      group: THREE.Group;
      mesh: THREE.Mesh;
      angle: number;
      moons: { pivot: THREE.Object3D; def: NonNullable<PlanetDef['moons']>[number]; angle: number }[];
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
        : makeMottledTexture(def.color, def.bandColor ?? def.color);
      const geo = new THREE.SphereGeometry(def.radius, 24, 18);
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
        disposables.push(ringGeo, ringMat);
      }

      const moons: PlanetRuntime['moons'] = [];
      for (const m of def.moons ?? []) {
        const mGeo = new THREE.SphereGeometry(m.radius, 10, 8);
        const mMat = new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.95 });
        const mMesh = new THREE.Mesh(mGeo, mMat);
        const pivot = new THREE.Object3D();
        pivot.add(mMesh);
        group.add(pivot);
        moons.push({ pivot, def: m, angle: Math.random() * Math.PI * 2 });
        disposables.push(mGeo, mMat);
      }

      runtimePlanets.push({ def, group, mesh, angle, moons });
    }

    // ── Live data markers ────────────────────────────────────────
    // Solar wind: a small glowing marker roughly between the Sun and
    // Earth's orbit, color/pulse driven by real current wind speed.
    const windTex = makeGlowTexture('rgba(96,165,250,1)');
    const windMat = new THREE.SpriteMaterial({ map: windTex, transparent: true, depthWrite: false });
    const windMarker = new THREE.Sprite(windMat);
    const earthDef = PLANETS.find((p) => p.id === 'earth')!;
    windMarker.position.set(earthDef.orbitRadius * 0.55, 0.6, 0);
    windMarker.scale.set(1.1, 1.1, 1);
    scene.add(windMarker);
    clickTargets.push({ object: windMarker, selection: { kind: 'solarwind' } });
    disposables.push(windTex, windMat);

    // Flare activity: pulsing marker just off the Sun's surface.
    const flareTex = makeGlowTexture('rgba(248,113,113,1)');
    const flareMat = new THREE.SpriteMaterial({ map: flareTex, transparent: true, depthWrite: false });
    const flareMarker = new THREE.Sprite(flareMat);
    flareMarker.position.set(SUN_RADIUS * 1.6, SUN_RADIUS * 0.9, SUN_RADIUS * 0.6);
    flareMarker.scale.set(0.9, 0.9, 1);
    scene.add(flareMarker);
    clickTargets.push({ object: flareMarker, selection: { kind: 'flare' } });
    disposables.push(flareTex, flareMat);

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
    // Parented under Earth's tilt group so it stays centered on the
    // planet as it orbits; found after the fact since Earth was built
    // in the loop above.
    const earthRuntime = runtimePlanets.find((r) => r.def.id === 'earth')!;
    earthRuntime.mesh.parent!.add(auroraRing);
    clickTargets.push({ object: auroraRing, selection: { kind: 'aurora' } });

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
      if (hits.length === 0) return;
      const hitObj = hits[0].object;
      const target = clickTargets.find((t) => t.object === hitObj);
      if (target) setSelected(target.selection);
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // ── Resize (responsive to container) ────────────────────────
    function resize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    setReady(true);

    // ── Animation loop ──────────────────────────────────────────
    const clock = new THREE.Clock();
    let animId = 0;
    let focusedId: string | null = null;

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

      // Live marker updates from the latest fetched data.
      const d = dataRef.current;
      const speed = d?.solar_wind.latest.speed ?? null;
      const windScale = speed === null ? 1 : Math.max(0.7, Math.min(2.2, speed / 400));
      const windPulse = 1 + Math.sin(t * 2.2) * 0.12;
      windMarker.scale.setScalar(1.1 * windScale * windPulse);

      const flux = d?.xray.latest_flux ?? null;
      const flareAct = flareActivity(flux);
      const flarePulse = flareAct.label.startsWith('Major') || flareAct.label.startsWith('Moderate')
        ? 1 + Math.sin(t * 6) * 0.35
        : 1 + Math.sin(t * 1.5) * 0.1;
      flareMarker.scale.setScalar(0.9 * flarePulse);

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
      auroraRing.lookAt(camera.position);

      // Smoothly follow a focused planet so it stays centered while it
      // continues to orbit.
      if (focusedId) {
        const rp = runtimePlanets.find((r) => r.def.id === focusedId);
        if (rp) controls.target.lerp(rp.group.position, 0.06);
      }

      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Expose a tiny hook so the React click handler (outside this
    // closure) can update which planet the camera follows.
    (container as any).__focusPlanet = (id: string | null) => {
      focusedId = id;
    };

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      for (const d2 of disposables) d2.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  // Keep the camera following whichever planet is selected.
  useEffect(() => {
    const container = containerRef.current as any;
    if (!container?.__focusPlanet) return;
    container.__focusPlanet(selected?.kind === 'planet' ? selected.id : null);
  }, [selected]);

  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <div className="text-xs uppercase tracking-wide text-white/40 font-semibold">
          The solar system, right now
        </div>
        <div className="text-[11px] text-white/50">
          Drag to rotate · scroll or pinch to zoom · tap a planet, or the glowing markers, for details
        </div>
      </div>
      <div className="relative w-full" style={{ height: 'min(72vw, 460px)', minHeight: 280 }}>
        <div ref={containerRef} className="absolute inset-0" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm animate-pulse">
            Building the solar system…
          </div>
        )}
        {selected && (
          <InfoPanel selection={selected} data={data} station={station} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}

// ── Info panel ─────────────────────────────────────────────────────

function InfoPanel({
  selection,
  data,
  station,
  onClose,
}: {
  selection: Selection;
  data: SpaceWeatherSnapshot | null;
  station: WeatherStation | null;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-2 top-2 bottom-2 w-[min(88vw,300px)] bg-black/85 backdrop-blur-md border border-white/15 rounded-lg p-3.5 overflow-y-auto text-white">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-white/40 hover:text-white text-sm w-6 h-6 flex items-center justify-center rounded hover:bg-white/10"
        aria-label="Close"
      >
        ✕
      </button>
      {selection.kind === 'sun' && <SunPanel />}
      {selection.kind === 'planet' && <PlanetPanel id={selection.id} />}
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

function PlanetPanel({ id }: { id: string }) {
  const p = PLANETS.find((x) => x.id === id);
  if (!p) return null;
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
        This is the actual stream of particles flowing from the Sun past Earth right now, measured a
        million miles upwind. Strongly negative Bz punches holes in Earth's magnetic shield and drives
        aurora.
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
        This marker glows brighter and pulses faster during stronger flare activity — the actual bursts of
        X-rays coming off the Sun's surface right now.
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
