// ═══════════════════════════════════════════════════════════════════
// grandprix/CarPhysics.ts — Physics engine for F1 cars
// ═══════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { CarState, PHYSICS, ENGINE, TRACK, Surface } from './rules';
import { TrackMeshData } from './TrackBuilder';

// ── Input state ─────────────────────────────────────────────────

export interface CarInput {
  throttle: number;  // 0-1
  brake: number;     // 0-1
  steer: number;     // -1 to 1
}

// ── Physics update ──────────────────────────────────────────────

export function updateCarPhysics(
  car: CarState,
  input: CarInput,
  dt: number,
  trackData: TrackMeshData,
  autoGears: boolean,
  autoBrakes: boolean,
): void {
  const { MASS, DRAG_COEFF, ROLLING_RESISTANCE, MAX_STEER, STEER_REDUCTION, MAX_SPEED } = PHYSICS;

  // ── 1. Inputs ───────────────────────────────────────────
  car.throttle = input.throttle;
  car.brake = input.brake;

  // Smooth steering input
  const targetSteer = input.steer;
  const steerRate = PHYSICS.STEER_SPEED * dt;
  if (Math.abs(targetSteer - car.steer) < steerRate) {
    car.steer = targetSteer;
  } else {
    car.steer += Math.sign(targetSteer - car.steer) * steerRate;
  }

  // ── 2. Surface detection ────────────────────────────────
  car.surface = detectSurface(car, trackData);
  const gripMult = getGripMultiplier(car.surface);
  const dragMult = getDragMultiplier(car.surface);

  // ── 3. Engine force ─────────────────────────────────────
  const gearRatio = ENGINE.GEAR_RATIOS[car.gear] * ENGINE.FINAL_DRIVE;
  const torque = getEngineTorque(car.rpm) * (1 - car.damage * 0.5);
  const engineForce = car.throttle * torque * gearRatio / ENGINE.WHEEL_RADIUS;

  // ── 4. Drag + rolling resistance ────────────────────────
  const speed = car.speed;
  const dragForce = DRAG_COEFF * speed * speed * dragMult;
  const rollingForce = ROLLING_RESISTANCE * speed;

  // ── 5. Braking ──────────────────────────────────────────
  let brakeInput = car.brake;
  if (autoBrakes && car.surface !== 'asphalt' && speed > 20) {
    brakeInput = Math.max(brakeInput, 0.3);
  }
  const brakeForce = brakeInput * PHYSICS.BRAKE_FORCE;

  // ── 6. Steering ─────────────────────────────────────────
  const speedRatio = Math.min(speed / MAX_SPEED, 1);
  const steerAngle = car.steer * MAX_STEER * (1 - speedRatio * STEER_REDUCTION);

  // Update heading (bicycle model)
  // Negative because forward = (-sin(heading), -cos(heading)):
  // positive steer should increase heading to turn right (forward rotates clockwise)
  if (speed > 0.5) {
    car.heading -= steerAngle * speed * dt * 0.05;
  }

  // ── 7. Net force & velocity ─────────────────────────────
  const netForce = engineForce - dragForce - rollingForce - brakeForce;
  const acceleration = netForce / MASS;

  car.speed += acceleration * dt;
  if (car.speed < 0) car.speed = 0;
  if (car.speed > MAX_SPEED) car.speed = MAX_SPEED;

  // ── 8. Lateral grip check ───────────────────────────────
  const downforce = 1 + PHYSICS.DOWNFORCE_COEFF * speedRatio;
  const effectiveGrip = PHYSICS.GRIP_LIMIT * gripMult * downforce;
  const turnRadius = speed > 1 ? speed / (Math.abs(steerAngle) * 0.05 + 0.001) : Infinity;
  const lateralAccel = turnRadius < Infinity ? (speed * speed) / turnRadius : 0;
  car.lateralG = lateralAccel / 9.81;

  if (car.lateralG > effectiveGrip) {
    // Oversteer — slide
    const slideRatio = effectiveGrip / car.lateralG;
    car.speed *= 0.95 + 0.05 * slideRatio;
    car.heading -= steerAngle * dt * (1 - slideRatio) * 0.5;
  }

  // ── 9. Update position ──────────────────────────────────
  const forwardX = -Math.sin(car.heading);
  const forwardZ = -Math.cos(car.heading);
  car.position.x += forwardX * car.speed * dt;
  car.position.z += forwardZ * car.speed * dt;

  // ── 10. RPM from speed ──────────────────────────────────
  if (speed > 0.1) {
    car.rpm = Math.max(ENGINE.IDLE, speed / ENGINE.WHEEL_RADIUS * gearRatio * 60 / (2 * Math.PI));
  } else {
    car.rpm = ENGINE.IDLE + car.throttle * 3000;
  }
  car.rpm = Math.min(car.rpm, ENGINE.REDLINE);

  // ── 11. Auto shift ──────────────────────────────────────
  if (autoGears) {
    if (car.rpm > ENGINE.UPSHIFT_RPM && car.gear < 5) {
      car.gear++;
    } else if (car.rpm < ENGINE.DOWNSHIFT_RPM && car.gear > 0) {
      car.gear--;
    }
  }

  // ── 12. Wheel rotation ─────────────────────────────────
  car.wheelRotation += (speed / ENGINE.WHEEL_RADIUS) * dt;

  // ── 13. Track position (spline t) ──────────────────────
  updateSplineT(car, trackData);
}

// ── Engine torque curve (parabolic) ─────────────────────────────

function getEngineTorque(rpm: number): number {
  const normalized = rpm / ENGINE.PEAK_TORQUE_RPM;
  // Parabolic curve peaking at PEAK_TORQUE_RPM
  const curve = 1 - 0.8 * (normalized - 1) * (normalized - 1);
  return ENGINE.MAX_TORQUE * Math.max(0.1, curve);
}

// ── Surface detection ───────────────────────────────────────────

function detectSurface(car: CarState, trackData: TrackMeshData): Surface {
  const pos = new THREE.Vector3(car.position.x, 0, car.position.z);

  // Find nearest spline point
  let minDist = Infinity;
  let nearestIdx = 0;
  const step = 5; // check every 5th point for performance
  for (let i = 0; i < trackData.splinePoints.length; i += step) {
    const d = pos.distanceToSquared(trackData.splinePoints[i]);
    if (d < minDist) {
      minDist = d;
      nearestIdx = i;
    }
  }

  // Refine search around nearest
  const start = Math.max(0, nearestIdx - step);
  const end = Math.min(trackData.splinePoints.length - 1, nearestIdx + step);
  for (let i = start; i <= end; i++) {
    const d = pos.distanceToSquared(trackData.splinePoints[i]);
    if (d < minDist) {
      minDist = d;
      nearestIdx = i;
    }
  }

  const nearestPoint = trackData.splinePoints[nearestIdx];
  const normal = trackData.normals[nearestIdx];
  const halfWidth = (trackData.trackWidths[nearestIdx] || TRACK.DEFAULT_WIDTH) / 2;

  // Project car position onto track normal to get lateral distance
  const dx = car.position.x - nearestPoint.x;
  const dz = car.position.z - nearestPoint.z;
  const lateralDist = Math.abs(dx * normal.x + dz * normal.z);

  if (lateralDist < halfWidth) return 'asphalt';
  if (lateralDist < halfWidth + TRACK.CURB_WIDTH) return 'curb';
  if (lateralDist < halfWidth + TRACK.CURB_WIDTH + TRACK.GRAVEL_WIDTH) return 'gravel';
  if (lateralDist < TRACK.BARRIER_OFFSET) return 'grass';
  return 'barrier';
}

function getGripMultiplier(surface: Surface): number {
  switch (surface) {
    case 'asphalt': return PHYSICS.GRIP_ASPHALT;
    case 'curb': return PHYSICS.GRIP_CURB;
    case 'grass': return PHYSICS.GRIP_GRASS;
    case 'gravel': return PHYSICS.GRIP_GRAVEL;
    case 'barrier': return PHYSICS.GRIP_GRAVEL;
  }
}

function getDragMultiplier(surface: Surface): number {
  switch (surface) {
    case 'asphalt': return PHYSICS.DRAG_ASPHALT;
    case 'curb': return PHYSICS.DRAG_CURB;
    case 'grass': return PHYSICS.DRAG_GRASS;
    case 'gravel': return PHYSICS.DRAG_GRAVEL;
    case 'barrier': return PHYSICS.DRAG_GRAVEL;
  }
}

// ── Spline T tracking ───────────────────────────────────────────

function updateSplineT(car: CarState, trackData: TrackMeshData): void {
  const pos = new THREE.Vector3(car.position.x, 0, car.position.z);
  let minDist = Infinity;
  let bestIdx = 0;

  const N = trackData.splinePoints.length;
  // Search near current position for efficiency
  const searchStart = Math.round(car.splineT * N) - 20;
  const searchEnd = searchStart + 40;

  for (let i = searchStart; i <= searchEnd; i++) {
    const idx = ((i % N) + N) % N;
    const d = pos.distanceToSquared(trackData.splinePoints[idx]);
    if (d < minDist) {
      minDist = d;
      bestIdx = idx;
    }
  }

  car.splineT = bestIdx / N;
}

// ── Car-to-car collision ────────────────────────────────────────

export function resolveCarCollisions(cars: CarState[]): void {
  const COLLISION_RADIUS = 1.2;
  const COLLISION_RADIUS_SQ = COLLISION_RADIUS * COLLISION_RADIUS * 4;

  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const dx = cars[j].position.x - cars[i].position.x;
      const dz = cars[j].position.z - cars[i].position.z;
      const distSq = dx * dx + dz * dz;

      if (distSq < COLLISION_RADIUS_SQ && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const overlap = COLLISION_RADIUS * 2 - dist;
        const nx = dx / dist;
        const nz = dz / dist;

        // Push apart
        cars[i].position.x -= nx * overlap * 0.5;
        cars[i].position.z -= nz * overlap * 0.5;
        cars[j].position.x += nx * overlap * 0.5;
        cars[j].position.z += nz * overlap * 0.5;

        // Impulse-based speed transfer (faster car slows a bit, slower speeds up a bit)
        const closing = Math.abs(cars[i].speed - cars[j].speed);
        const impulse = closing * 0.3;

        if (cars[i].speed > cars[j].speed) {
          cars[i].speed -= impulse;
          cars[j].speed += impulse * 0.5; // some energy lost
        } else {
          cars[j].speed -= impulse;
          cars[i].speed += impulse * 0.5;
        }

        // Small contact friction
        cars[i].speed *= 0.97;
        cars[j].speed *= 0.97;

        // Slight heading deflection so cars don't phase through
        cars[i].heading -= nz * 0.02;
        cars[j].heading += nz * 0.02;

        // Damage if high speed collision
        if (closing > 15) {
          const dmg = (closing - 15) * 0.01;
          cars[i].damage = Math.min(1, cars[i].damage + dmg);
          cars[j].damage = Math.min(1, cars[j].damage + dmg);
        }
      }
    }
  }
}

// ── Barrier bounce ──────────────────────────────────────────────

export function handleBarrierCollision(car: CarState, trackData: TrackMeshData): boolean {
  if (car.surface !== 'barrier') return false;

  // Find nearest track point and bounce off
  const pos = new THREE.Vector3(car.position.x, 0, car.position.z);
  let minDist = Infinity;
  let nearestIdx = 0;

  for (let i = 0; i < trackData.splinePoints.length; i += 5) {
    const d = pos.distanceToSquared(trackData.splinePoints[i]);
    if (d < minDist) {
      minDist = d;
      nearestIdx = i;
    }
  }

  const norm = trackData.normals[nearestIdx];
  const center = trackData.splinePoints[nearestIdx];

  // Push car back toward track
  const dx = car.position.x - center.x;
  const dz = car.position.z - center.z;
  const dot = dx * norm.x + dz * norm.z;

  car.position.x -= norm.x * Math.sign(dot) * 2;
  car.position.z -= norm.z * Math.sign(dot) * 2;

  // Reduce speed sharply
  car.speed *= 0.3;
  car.damage = Math.min(1, car.damage + 0.1);

  return true;
}
