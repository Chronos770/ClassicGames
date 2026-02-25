// ═══════════════════════════════════════════════════════════════════
// grandprix/GrandPrixRenderer.ts — Three.js scene, cameras, loop
// ═══════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { GrandPrixGame } from './GrandPrixGame';
import { GP_CONFIG, TEAMS, DRIVERS, CameraMode } from './rules';
import { buildTrack, TrackMeshData } from './TrackBuilder';
import { buildCarModel, CarModelResult } from './CarModel';
import { getTrack, TrackDefinition } from './tracks';
import { CarInput } from './CarPhysics';
import { SoundManager } from '../../engine/SoundManager';

export interface HUDData {
  speed: number;        // km/h
  rpm: number;
  gear: number;
  position: number;
  totalCars: number;
  lap: number;
  totalLaps: number;
  currentLapTime: number;
  bestLapTime: number;
  raceTime: number;
  phase: string;
  startLights: number;
  surface: string;
  damage: number;
  standings: { name: string; gap: number; bestLap: number; position: number; finished: boolean }[];
  showStandings: boolean;
  fastestLap: number;
  fastestLapDriverName: string;
  cameraMode: CameraMode;
  autoGears: boolean;
  autoBrakes: boolean;
}

export class GrandPrixRenderer {
  private container: HTMLDivElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private cameras: { chase: THREE.PerspectiveCamera; cockpit: THREE.PerspectiveCamera; tv: THREE.PerspectiveCamera; helicopter: THREE.PerspectiveCamera };
  private activeCamera!: THREE.PerspectiveCamera;
  private game: GrandPrixGame;
  private trackData: TrackMeshData | null = null;
  private trackDef: TrackDefinition | null = null;
  private carModels: CarModelResult[] = [];
  private animId = 0;
  private lastTime = 0;
  private disposed = false;
  private keys: Record<string, boolean> = {};
  private tvCamPositions: THREE.Vector3[] = [];
  private tvCamIndex = 0;
  private startLightMeshes: THREE.Mesh[] = [];
  private redLightMat!: THREE.MeshLambertMaterial;
  private offLightMat!: THREE.MeshLambertMaterial;

  // Engine sound
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private audioCtx: AudioContext | null = null;

  // HUD callback
  onHUDUpdate: ((data: HUDData) => void) | null = null;

  constructor(container: HTMLDivElement, game: GrandPrixGame) {
    this.container = container;
    this.game = game;

    this.cameras = {
      chase: new THREE.PerspectiveCamera(65, GP_CONFIG.resolution.width / GP_CONFIG.resolution.height, 0.5, 500),
      cockpit: new THREE.PerspectiveCamera(75, GP_CONFIG.resolution.width / GP_CONFIG.resolution.height, 0.1, 500),
      tv: new THREE.PerspectiveCamera(30, GP_CONFIG.resolution.width / GP_CONFIG.resolution.height, 1, 800),
      helicopter: new THREE.PerspectiveCamera(50, GP_CONFIG.resolution.width / GP_CONFIG.resolution.height, 1, 600),
    };
  }

  async init(): Promise<void> {
    // ── Renderer ──────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(GP_CONFIG.resolution.width, GP_CONFIG.resolution.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    this.container.appendChild(this.renderer.domElement);

    // ── Scene ─────────────────────────────────────────────
    this.scene = new THREE.Scene();
    const trackId = this.game.state.track;
    this.trackDef = getTrack(trackId);
    this.scene.background = new THREE.Color(this.trackDef.bgColor);
    this.scene.fog = new THREE.Fog(this.trackDef.bgColor, 80, 300);

    // ── Sky dome (gradient) ────────────────────────────────
    const skyGeo = new THREE.SphereGeometry(380, 32, 24);
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 2; skyCanvas.height = 256;
    const skyCtx = skyCanvas.getContext('2d')!;
    const grad = skyCtx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#1a3a70');    // deep blue at zenith
    grad.addColorStop(0.25, '#2b5599');
    grad.addColorStop(0.45, '#4477bb');
    grad.addColorStop(0.60, '#7799cc');
    grad.addColorStop(0.75, '#99bbdd');
    grad.addColorStop(0.88, '#bbddee');
    grad.addColorStop(0.96, '#ddeeff');  // pale horizon
    grad.addColorStop(1.0, '#eef4ff');
    skyCtx.fillStyle = grad;
    skyCtx.fillRect(0, 0, 2, 256);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyDome);
    this.scene.background = null; // sky dome handles background

    // Simple cloud layer (flat semi-transparent plane high up)
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 256; cloudCanvas.height = 256;
    const cCtx = cloudCanvas.getContext('2d')!;
    cCtx.fillStyle = 'rgba(0,0,0,0)';
    cCtx.fillRect(0, 0, 256, 256);
    // Scattered cloud puffs
    for (let i = 0; i < 40; i++) {
      const cx = Math.random() * 256;
      const cy = Math.random() * 256;
      const r = 15 + Math.random() * 30;
      const rg = cCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, 'rgba(255,255,255,0.35)');
      rg.addColorStop(0.5, 'rgba(255,255,255,0.15)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      cCtx.fillStyle = rg;
      cCtx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    const cloudTex = new THREE.CanvasTexture(cloudCanvas);
    cloudTex.wrapS = cloudTex.wrapT = THREE.RepeatWrapping;
    cloudTex.repeat.set(3, 3);
    const cloudMat = new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.7, side: THREE.DoubleSide, fog: false });
    const cloudGeo = new THREE.PlaneGeometry(800, 800);
    const cloudPlane = new THREE.Mesh(cloudGeo, cloudMat);
    cloudPlane.rotation.x = -Math.PI / 2;
    cloudPlane.position.set(60, 100, 350);
    this.scene.add(cloudPlane);

    // ── Lighting ──────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x778899, 0.9);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xFFEECC, 1.2);
    sun.position.set(50, 80, 30);
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x8899BB, 0.4);
    fill.position.set(-30, 40, -20);
    this.scene.add(fill);

    // ── Track ─────────────────────────────────────────────
    this.trackData = buildTrack(this.trackDef);
    this.scene.add(this.trackData.group);

    // Collect TV camera positions
    this.tvCamPositions = [];
    for (const cp of this.trackDef.controlPoints) {
      if (cp.camPosition) {
        this.tvCamPositions.push(new THREE.Vector3(cp.camPosition.x, cp.camPosition.y, cp.camPosition.z));
      }
    }

    // Find start light meshes
    this.redLightMat = new THREE.MeshLambertMaterial({ color: 0xFF0000, emissive: 0xFF0000, emissiveIntensity: 0.5 });
    this.offLightMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    this.startLightMeshes = [];
    this.trackData.group.traverse((child) => {
      if (child.userData.startLight !== undefined) {
        this.startLightMeshes.push(child as THREE.Mesh);
      }
    });

    // ── Cars ──────────────────────────────────────────────
    this.carModels = [];
    for (let i = 0; i < GP_CONFIG.gridSize; i++) {
      const driverIdx = i % DRIVERS.length;
      const driver = DRIVERS[driverIdx];
      const team = TEAMS[driver.team];

      const carModel = buildCarModel({
        team,
        number: driver.number,
        helmetColor: driver.helmetColor,
        driverName: driver.name,
      });

      this.scene.add(carModel.group);
      this.carModels.push(carModel);
    }

    // ── Cockpit interior (separate scene group, not parented under car) ──
    const playerModel = this.carModels[this.game.state.playerIndex];
    if (playerModel) {
      // Remove cockpit group from car's inner and add directly to scene
      // so it's visible even when car group is hidden
      const cockpitInner = playerModel.cockpitGroup;
      cockpitInner.parent?.remove(cockpitInner);
      cockpitInner.visible = false;

      // Wrap in a group that also has inner.rotation.y = -PI/2 to match car
      this.cockpitSceneGroup = new THREE.Group();
      const cockpitInnerWrapper = new THREE.Group();
      cockpitInnerWrapper.rotation.y = -Math.PI / 2;
      cockpitInnerWrapper.add(cockpitInner);
      this.cockpitSceneGroup.add(cockpitInnerWrapper);
      this.cockpitSceneGroup.visible = false;
      this.scene.add(this.cockpitSceneGroup);
    }

    // ── Initialize game ───────────────────────────────────
    this.game.initialize(this.trackData, this.trackDef);

    // ── Camera default ────────────────────────────────────
    this.activeCamera = this.cameras.chase;

    // ── Input ─────────────────────────────────────────────
    this.setupInput();
  }

  private setupInput(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = true;
      this.keys[e.code] = true;

      // Camera toggle
      if (e.key.toLowerCase() === 'c') {
        const modes: CameraMode[] = ['chase', 'cockpit', 'tv', 'helicopter'];
        const current = modes.indexOf(this.game.state.cameraMode);
        this.game.state.cameraMode = modes[(current + 1) % modes.length];
        this.activeCamera = this.cameras[this.game.state.cameraMode];
      }

      // Mini-map toggle
      if (e.key.toLowerCase() === 'm') {
        this.game.state.showMinimap = !this.game.state.showMinimap;
      }

      // Pause
      if (e.key === 'Escape') {
        this.game.state.paused = !this.game.state.paused;
      }

      // Standings
      if (e.key === 'Tab') {
        e.preventDefault();
        this.game.state.showStandings = true;
      }

      // Manual gear shift
      if (e.key === ' ' && !this.game.state.autoGears) {
        const car = this.game.getPlayerCar();
        if (car.gear < 5) car.gear++;
      }
      if (e.key === 'Shift' && !this.game.state.autoGears) {
        const car = this.game.getPlayerCar();
        if (car.gear > 0) car.gear--;
      }

      // Driving aids
      if (e.code === 'F1') { e.preventDefault(); this.game.state.autoBrakes = !this.game.state.autoBrakes; }
      if (e.code === 'F2') { e.preventDefault(); this.game.state.autoGears = !this.game.state.autoGears; }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = false;
      this.keys[e.code] = false;

      if (e.key === 'Tab') {
        this.game.state.showStandings = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Store for cleanup
    (this as any)._onKeyDown = onKeyDown;
    (this as any)._onKeyUp = onKeyUp;
  }

  startRace(): void {
    this.game.setPhase('grid');
    this.lastTime = performance.now();
    this.startEngineSound();
    this.animate();
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.animId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05); // cap at 50ms
    this.lastTime = now;

    // ── Player input ────────────────────────────────────
    const input: CarInput = {
      throttle: (this.keys['arrowup'] || this.keys['w']) ? 1 : 0,
      brake: (this.keys['arrowdown'] || this.keys['s']) ? 1 : 0,
      steer: ((this.keys['arrowleft'] || this.keys['a']) ? -1 : 0) +
             ((this.keys['arrowright'] || this.keys['d']) ? 1 : 0),
    };
    this.game.setPlayerInput(input);

    // ── Game update ─────────────────────────────────────
    this.game.update(dt);

    // ── Update visuals ──────────────────────────────────
    this.updateCarVisuals();
    this.updateStartLights();
    this.updateCamera(dt);
    this.updateEngineSound();

    // ── Render ───────────────────────────────────────────
    this.renderer.render(this.scene, this.activeCamera);

    // ── HUD data ────────────────────────────────────────
    this.emitHUDData();
  };

  private cockpitSceneGroup: THREE.Group | null = null;

  private updateCarVisuals(): void {
    const isCockpit = this.game.state.cameraMode === 'cockpit';

    for (let i = 0; i < this.game.state.cars.length; i++) {
      const car = this.game.state.cars[i];
      const model = this.carModels[i];
      if (!model) continue;

      const isPlayer = i === this.game.state.playerIndex;

      // Position
      model.group.position.set(car.position.x, car.position.y, car.position.z);

      // Heading
      model.group.rotation.y = car.heading;

      // Wheel spin — use quaternion to avoid gimbal lock at PI/2 tilt
      const tiltQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
      const spinQ = new THREE.Quaternion();
      for (const wheel of model.wheels) {
        spinQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), car.wheelRotation);
        wheel.quaternion.multiplyQuaternions(spinQ, tiltQ);
      }

      // Per-wheel steering pivots (front wheels rotate around own position)
      if (model.frontWheelPivots) {
        for (const pivot of model.frontWheelPivots) {
          pivot.rotation.y = car.steer * 0.35;
        }
      }

      // Cockpit mode: hide player car, show separate cockpit scene group
      if (isPlayer) {
        model.group.visible = !isCockpit;

        if (isCockpit && this.cockpitSceneGroup) {
          this.cockpitSceneGroup.visible = true;
          this.cockpitSceneGroup.position.set(car.position.x, car.position.y, car.position.z);
          this.cockpitSceneGroup.rotation.y = car.heading;
        } else if (this.cockpitSceneGroup) {
          this.cockpitSceneGroup.visible = false;
        }
      }
    }
  }

  private updateStartLights(): void {
    const lights = this.game.state.startLights;
    for (const mesh of this.startLightMeshes) {
      const idx = mesh.userData.startLight as number;
      if (lights === 6) {
        // GO — all off
        (mesh as THREE.Mesh).material = this.offLightMat;
      } else if (idx < lights) {
        (mesh as THREE.Mesh).material = this.redLightMat;
      } else {
        (mesh as THREE.Mesh).material = this.offLightMat;
      }
    }
  }

  private updateCamera(dt: number): void {
    const car = this.game.getPlayerCar();
    const carPos = new THREE.Vector3(car.position.x, car.position.y, car.position.z);
    const carForward = new THREE.Vector3(-Math.sin(car.heading), 0, -Math.cos(car.heading));

    switch (this.game.state.cameraMode) {
      case 'chase': {
        // 6m behind, 2.5m up, looking 3m ahead
        const behind = carForward.clone().multiplyScalar(-6);
        const targetPos = carPos.clone().add(behind).add(new THREE.Vector3(0, 2.5, 0));
        const lookAt = carPos.clone().add(carForward.clone().multiplyScalar(3));

        this.cameras.chase.position.lerp(targetPos, 1 - Math.pow(0.05, dt));
        this.cameras.chase.lookAt(lookAt);
        break;
      }

      case 'cockpit': {
        // Driver helmet position — inside the cockpit at eye level
        // Helmet is at y=0.58, so eye level ~0.58. Car body peaks at ~0.58.
        const cockpitPos = carPos.clone()
          .add(carForward.clone().multiplyScalar(-0.2))
          .add(new THREE.Vector3(0, 0.55, 0));
        this.cameras.cockpit.position.copy(cockpitPos);

        const lookTarget = cockpitPos.clone().add(carForward.clone().multiplyScalar(20));
        lookTarget.x += car.steer * 3;
        lookTarget.y -= 0.15; // look slightly down at road
        this.cameras.cockpit.lookAt(lookTarget);
        break;
      }

      case 'tv': {
        // Find nearest TV camera
        if (this.tvCamPositions.length > 0) {
          let minDist = Infinity;
          let bestIdx = 0;
          for (let i = 0; i < this.tvCamPositions.length; i++) {
            const d = this.tvCamPositions[i].distanceToSquared(carPos);
            if (d < minDist) {
              minDist = d;
              bestIdx = i;
            }
          }
          this.tvCamIndex = bestIdx;
          this.cameras.tv.position.copy(this.tvCamPositions[this.tvCamIndex]);
          this.cameras.tv.lookAt(carPos);
        }
        break;
      }

      case 'helicopter': {
        // 20m above, looking down
        const heliPos = carPos.clone().add(new THREE.Vector3(5, 20, 5));
        this.cameras.helicopter.position.lerp(heliPos, 1 - Math.pow(0.1, dt));
        this.cameras.helicopter.lookAt(carPos);
        break;
      }
    }
  }

  // ── Engine sound ──────────────────────────────────────────────

  private startEngineSound(): void {
    try {
      this.audioCtx = new AudioContext();
      this.engineGain = this.audioCtx.createGain();
      this.engineGain.gain.value = 0.08;
      this.engineGain.connect(this.audioCtx.destination);

      // Primary oscillator (sawtooth)
      this.engineOsc1 = this.audioCtx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.value = 120;
      this.engineOsc1.connect(this.engineGain);
      this.engineOsc1.start();

      // Second harmonic
      this.engineOsc2 = this.audioCtx.createOscillator();
      this.engineOsc2.type = 'sawtooth';
      this.engineOsc2.frequency.value = 240;
      const harmGain = this.audioCtx.createGain();
      harmGain.gain.value = 0.03;
      this.engineOsc2.connect(harmGain);
      harmGain.connect(this.audioCtx.destination);
      this.engineOsc2.start();
    } catch {
      // Audio not available
    }
  }

  private updateEngineSound(): void {
    if (!this.engineOsc1 || !this.engineGain) return;

    const car = this.game.getPlayerCar();
    const rpmNorm = (car.rpm - 3000) / 11500; // 0-1 range
    const freq = 80 + rpmNorm * 320; // 80-400 Hz range

    this.engineOsc1.frequency.value = freq;
    if (this.engineOsc2) {
      this.engineOsc2.frequency.value = freq * 2;
    }

    // Volume based on throttle
    const vol = 0.04 + car.throttle * 0.08;
    this.engineGain.gain.value = vol;
  }

  private stopEngineSound(): void {
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      this.audioCtx?.close();
    } catch { /* ignore */ }
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.audioCtx = null;
    this.engineGain = null;
  }

  // ── Sound effects ─────────────────────────────────────────────

  playSound(name: string): void {
    SoundManager.getInstance().play(name);
  }

  // ── HUD emission ──────────────────────────────────────────────

  private emitHUDData(): void {
    if (!this.onHUDUpdate) return;

    const car = this.game.getPlayerCar();
    const state = this.game.state;

    const standings = state.standings.map(s => {
      const dIdx = s.driverIndex % DRIVERS.length;
      return {
        name: s.driverIndex === state.playerIndex ? 'YOU' : DRIVERS[dIdx].name,
        gap: s.gap,
        bestLap: s.bestLap,
        position: s.position,
        finished: s.finished,
      };
    });

    const fastestDriverIdx = state.fastestLapDriver >= 0 ? state.fastestLapDriver % DRIVERS.length : -1;

    this.onHUDUpdate({
      speed: Math.round(car.speed * 3.6), // m/s → km/h
      rpm: Math.round(car.rpm),
      gear: car.gear + 1, // Display as 1-6
      position: this.game.getPlayerPosition(),
      totalCars: state.cars.length,
      lap: Math.max(1, car.lapCount + 1),
      totalLaps: state.totalLaps,
      currentLapTime: state.raceTime - car.currentLapStart,
      bestLapTime: car.bestLap,
      raceTime: state.raceTime,
      phase: state.phase,
      startLights: state.startLights,
      surface: car.surface,
      damage: car.damage,
      standings,
      showStandings: state.showStandings,
      fastestLap: state.fastestLap,
      fastestLapDriverName: fastestDriverIdx >= 0 ? DRIVERS[fastestDriverIdx].name : '',
      cameraMode: state.cameraMode,
      autoGears: state.autoGears,
      autoBrakes: state.autoBrakes,
    });
  }

  // ── Cleanup ───────────────────────────────────────────────────

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animId);

    this.stopEngineSound();

    window.removeEventListener('keydown', (this as any)._onKeyDown);
    window.removeEventListener('keyup', (this as any)._onKeyUp);

    // Dispose car models
    for (const cm of this.carModels) {
      cm.dispose();
    }

    // Dispose track
    this.trackData?.dispose();

    // Dispose renderer
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }

    this.redLightMat?.dispose();
    this.offLightMat?.dispose();
  }
}
