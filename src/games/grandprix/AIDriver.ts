// ═══════════════════════════════════════════════════════════════════
// grandprix/AIDriver.ts — AI opponent logic
// Follows racing line, proper braking, overtaking, collision avoidance
// ═══════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { CarState, DriverConfig, DIFFICULTY, PHYSICS } from './rules';
import { TrackMeshData } from './TrackBuilder';
import { CarInput } from './CarPhysics';
import { TrackDefinition } from './tracks';

// ── Racing line ─────────────────────────────────────────────────

export interface RacingLinePoint {
  position: THREE.Vector3;
  targetSpeed: number;   // m/s
  direction: THREE.Vector3; // normalized forward direction
}

export function computeRacingLine(trackData: TrackMeshData, trackDef: TrackDefinition): RacingLinePoint[] {
  const N = trackData.splinePoints.length;
  const line: RacingLinePoint[] = [];

  for (let i = 0; i < N; i++) {
    const t = i / N;
    const cpIndex = Math.round(t * trackDef.controlPoints.length) % trackDef.controlPoints.length;
    const cp = trackDef.controlPoints[cpIndex];

    let pos = trackData.splinePoints[i].clone();
    let targetSpeed = PHYSICS.MAX_SPEED * 0.92;

    if (cp.isCorner && cp.cornerSpeed !== undefined) {
      targetSpeed = cp.cornerSpeed;

      // Shift position toward inside of corner
      const normal = trackData.normals[i];
      const halfWidth = (trackData.trackWidths[i] || 12) / 2;

      const prevIdx = (i - 5 + N) % N;
      const nextIdx = (i + 5) % N;
      const prev = trackData.splinePoints[prevIdx];
      const next = trackData.splinePoints[nextIdx];
      const curvature = new THREE.Vector3().subVectors(next, prev);
      const cross = curvature.x * normal.z - curvature.z * normal.x;
      const insideSign = cross > 0 ? -1 : 1;

      pos.x += normal.x * halfWidth * 0.4 * insideSign;
      pos.z += normal.z * halfWidth * 0.4 * insideSign;
    }

    // Compute direction from this point to next
    const nextPt = trackData.splinePoints[(i + 1) % N];
    const dir = new THREE.Vector3().subVectors(nextPt, trackData.splinePoints[i]).normalize();

    line.push({ position: pos, targetSpeed, direction: dir });
  }

  // Smooth braking zones: propagate deceleration backward (multiple passes)
  for (let pass = 0; pass < 5; pass++) {
    for (let i = N - 1; i >= 0; i--) {
      const next = (i + 1) % N;
      const dist = line[i].position.distanceTo(line[next].position);
      // v² = v_next² + 2 * a * d  (deceleration ≈ 18 m/s² with downforce)
      const maxApproach = Math.sqrt(line[next].targetSpeed ** 2 + 2 * 18 * dist);
      if (line[i].targetSpeed > maxApproach) {
        line[i].targetSpeed = maxApproach;
      }
    }
  }

  // Also smooth acceleration zones forward (can't accelerate infinitely)
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < N; i++) {
      const prev = (i - 1 + N) % N;
      const dist = line[i].position.distanceTo(line[prev].position);
      // Acceleration limited to ~12 m/s² (engine + traction limited)
      const maxExit = Math.sqrt(line[prev].targetSpeed ** 2 + 2 * 12 * dist);
      if (line[i].targetSpeed > maxExit) {
        line[i].targetSpeed = maxExit;
      }
    }
  }

  return line;
}

// ── AI Driver ───────────────────────────────────────────────────

export class AIDriverController {
  private driver: DriverConfig;
  private difficulty: number;
  private racingLine: RacingLinePoint[];
  private errorOffset = 0;
  private errorCooldown = 0;
  private lateralOffset = 0; // for overtaking

  constructor(driver: DriverConfig, difficulty: number, racingLine: RacingLinePoint[]) {
    this.driver = driver;
    this.difficulty = difficulty;
    this.racingLine = racingLine;
  }

  getInput(car: CarState, allCars: CarState[], carIndex: number): CarInput {
    const diff = DIFFICULTY[this.difficulty];
    const skill = this.driver.skill * diff.skillMult;
    const aggression = this.driver.aggression * diff.aggressionMult;

    const N = this.racingLine.length;
    const currentIdx = Math.round(car.splineT * N) % N;

    // Look ahead — further at higher speeds for better planning
    const lookAhead = Math.max(8, Math.round(car.speed * 0.5));
    const targetIdx = (currentIdx + lookAhead) % N;
    const target = this.racingLine[targetIdx];

    // Also check a nearer point for braking decisions
    const brakeCheckIdx = (currentIdx + Math.max(3, Math.round(car.speed * 0.15))) % N;
    const brakeTarget = this.racingLine[brakeCheckIdx];

    // ── Steering toward racing line ────────────────────
    let targetX = target.position.x;
    let targetZ = target.position.z;

    // Apply lateral offset for overtaking
    if (Math.abs(this.lateralOffset) > 0.01) {
      const normal = new THREE.Vector3(-target.direction.z, 0, target.direction.x);
      targetX += normal.x * this.lateralOffset;
      targetZ += normal.z * this.lateralOffset;
    }

    const dx = targetX - car.position.x;
    const dz = targetZ - car.position.z;
    const targetHeading = Math.atan2(-dx, -dz);

    let headingError = targetHeading - car.heading;
    while (headingError > Math.PI) headingError -= Math.PI * 2;
    while (headingError < -Math.PI) headingError += Math.PI * 2;

    // Driving error (consistency-based)
    this.errorCooldown -= 1;
    if (this.errorCooldown <= 0) {
      this.errorOffset = (1 - this.driver.consistency) * (Math.random() - 0.5) * 0.15;
      this.errorCooldown = 60 + Math.random() * 120;
    }
    headingError += this.errorOffset;

    // PID-like steering: proportional + derivative
    const steerP = headingError * 3.0;
    const steer = Math.max(-1, Math.min(1, steerP));

    // ── Throttle / Brake ────────────────────────────────
    // Use the closer brake target for braking decisions
    const targetSpeed = Math.min(target.targetSpeed, brakeTarget.targetSpeed) * diff.topSpeed * skill;
    const speedDiff = car.speed - targetSpeed;

    let throttle = 0;
    let brake = 0;

    if (speedDiff < -8) {
      // Well below target — full throttle
      throttle = 1.0;
    } else if (speedDiff < -2) {
      // Below target — proportional throttle
      throttle = 0.6 + 0.4 * Math.min(1, (-speedDiff - 2) / 6);
    } else if (speedDiff < 2) {
      // Near target — light throttle to maintain
      throttle = 0.3;
    } else if (speedDiff < 8) {
      // Above target — coast then brake
      throttle = 0;
      brake = (speedDiff - 2) * 0.12;
    } else {
      // Way above target — hard braking
      throttle = 0;
      brake = Math.min(1.0, (speedDiff - 2) * 0.15);
    }

    // Don't brake in corners if already at reasonable speed
    if (car.lateralG > 2.0) {
      throttle *= 0.7; // reduce throttle in high-G turns
    }

    // ── Collision avoidance + overtaking ─────────────────
    this.updateRacingBehavior(car, allCars, carIndex, aggression);

    // ── Skill-based imperfections ────────────────────────
    // Lower skill = slightly delayed braking reaction
    if (skill < 0.9 && speedDiff > 5) {
      brake *= (0.7 + skill * 0.3);
    }

    // Random throttle lift on corner exit (less consistent drivers)
    if (Math.random() > this.driver.consistency && car.lateralG > 1.5) {
      throttle *= 0.85;
    }

    return { throttle, brake, steer };
  }

  private updateRacingBehavior(
    car: CarState, allCars: CarState[], carIndex: number,
    aggression: number,
  ): void {
    const forwardX = -Math.sin(car.heading);
    const forwardZ = -Math.cos(car.heading);
    const rightX = Math.cos(car.heading);
    const rightZ = -Math.sin(car.heading);

    let closestAhead = Infinity;
    let closestAheadLateral = 0;
    this.lateralOffset *= 0.95; // decay overtaking offset

    for (let i = 0; i < allCars.length; i++) {
      if (i === carIndex) continue;
      const other = allCars[i];

      const dx = other.position.x - car.position.x;
      const dz = other.position.z - car.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 25) continue; // too far

      // Project onto forward/lateral axes
      const fwdDist = dx * forwardX + dz * forwardZ;
      const latDist = dx * rightX + dz * rightZ;

      // Car is ahead and in our path
      if (fwdDist > 0 && fwdDist < 20 && Math.abs(latDist) < 3) {
        if (fwdDist < closestAhead) {
          closestAhead = fwdDist;
          closestAheadLateral = latDist;
        }

        // Close proximity — reduce speed
        if (fwdDist < 8) {
          const slowFactor = fwdDist / 8;
          car.speed = Math.min(car.speed, other.speed + 2 + slowFactor * 3);
        }

        // Try to overtake if aggressive enough and on a straight
        if (fwdDist < 15 && car.lateralG < 1.0 && aggression > 0.4) {
          // Move to the side with more space
          const overtakeSide = closestAheadLateral > 0 ? -1 : 1;
          this.lateralOffset = overtakeSide * (3 + aggression * 2);
        }
      }

      // Side-by-side — don't run into them
      if (Math.abs(fwdDist) < 3 && Math.abs(latDist) < 2.5 && dist > 0.5) {
        // Push away laterally
        const pushDir = latDist > 0 ? -1 : 1;
        this.lateralOffset += pushDir * 0.5;
      }
    }

    // Clamp lateral offset
    this.lateralOffset = Math.max(-5, Math.min(5, this.lateralOffset));
  }
}
