// ═══════════════════════════════════════════════════════════════════
// grandprix/GrandPrixGame.ts — Game state machine
// ═══════════════════════════════════════════════════════════════════

import {
  GrandPrixState, CarState, RaceStanding, RacePhase,
  DRIVERS, GP_CONFIG, createInitialCarState, TRACK, ENGINE,
} from './rules';
import { TrackMeshData } from './TrackBuilder';
import { CarInput, updateCarPhysics, resolveCarCollisions, handleBarrierCollision } from './CarPhysics';
import { AIDriverController, computeRacingLine, RacingLinePoint } from './AIDriver';
import { TrackDefinition } from './tracks';

export class GrandPrixGame {
  state: GrandPrixState;
  private trackData: TrackMeshData | null = null;
  private trackDef: TrackDefinition | null = null;
  private aiControllers: AIDriverController[] = [];
  private racingLine: RacingLinePoint[] = [];
  private accumulator = 0;
  private startTimer = 0;
  private finishTimer = 0;
  private goDelay = 0.5 + Math.random() * 0.5; // random delay stored once
  private playerInput: CarInput = { throttle: 0, brake: 0, steer: 0 };

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GrandPrixState {
    const cars: CarState[] = [];
    for (let i = 0; i < GP_CONFIG.gridSize; i++) {
      cars.push(createInitialCarState());
    }

    return {
      phase: 'setup',
      track: 'autodromo',
      totalLaps: GP_CONFIG.defaultLaps,
      difficulty: 1,
      raceTime: 0,
      cars,
      standings: [],
      startLights: 0,
      playerIndex: GP_CONFIG.gridSize - 1, // Start at back
      cameraMode: 'chase',
      showStandings: false,
      showMinimap: false,
      paused: false,
      autoGears: true,
      autoBrakes: false,
      fastestLap: Infinity,
      fastestLapDriver: -1,
    };
  }

  initialize(trackData: TrackMeshData, trackDef: TrackDefinition): void {
    this.trackData = trackData;
    this.trackDef = trackDef;

    // Compute racing line
    this.racingLine = computeRacingLine(trackData, trackDef);

    // Create AI controllers for all non-player cars
    this.aiControllers = [];
    for (let i = 0; i < GP_CONFIG.gridSize; i++) {
      if (i === this.state.playerIndex) {
        this.aiControllers.push(null as unknown as AIDriverController);
        continue;
      }
      const driverIdx = i % DRIVERS.length;
      this.aiControllers.push(
        new AIDriverController(DRIVERS[driverIdx], this.state.difficulty, this.racingLine)
      );
    }
  }

  setPhase(phase: RacePhase): void {
    this.state.phase = phase;

    if (phase === 'grid') {
      this.placeGrid();
      this.state.startLights = 0;
      this.startTimer = 0;
    }
  }

  private placeGrid(): void {
    if (!this.trackData) return;

    const startPoint = this.trackData.splinePoints[0];
    const startNormal = this.trackData.normals[0];
    const spline = this.trackData.spline;
    const startTangent = spline.getTangentAt(0).normalize();

    for (let i = 0; i < this.state.cars.length; i++) {
      const car = this.state.cars[i];
      const row = Math.floor(i / 2);
      const col = i % 2;

      // Stagger grid: 2 cars per row, rows 5m apart
      const backOffset = row * 8 + 5;
      const sideOffset = (col === 0 ? -1 : 1) * 2.5;

      car.position.x = startPoint.x - startTangent.x * backOffset + startNormal.x * sideOffset;
      car.position.y = 0;
      car.position.z = startPoint.z - startTangent.z * backOffset + startNormal.z * sideOffset;
      car.heading = Math.atan2(-startTangent.x, -startTangent.z);
      car.speed = 0;
      car.rpm = ENGINE.IDLE;
      car.gear = 0;
      car.splineT = 0;
      car.lapCount = 0;
      car.lapTimes = [];
      car.bestLap = Infinity;
      car.currentLapStart = 0;
      car.sectorTimes = [];
      car.currentSector = 0;
      car.finished = false;
      car.damage = 0;
    }
  }

  setPlayerInput(input: CarInput): void {
    this.playerInput = input;
  }

  update(frameDt: number): void {
    if (this.state.paused) return;

    const { phase } = this.state;

    if (phase === 'grid') {
      this.updateGridPhase(frameDt);
    } else if (phase === 'race') {
      this.updateRacePhase(frameDt);
    } else if (phase === 'finish') {
      this.updateFinishPhase(frameDt);
    }
  }

  // ── Grid phase: start lights sequence ─────────────────────────

  private updateGridPhase(dt: number): void {
    this.startTimer += dt;

    // Light sequence: 1 light per 0.8 seconds, then go after all 5
    const lightInterval = 0.8;
    const lightsNeeded = Math.floor(this.startTimer / lightInterval);

    if (lightsNeeded <= 5) {
      this.state.startLights = lightsNeeded;
    } else if (this.startTimer > 5 * lightInterval + this.goDelay) {
      // Random delay after 5 lights (0.5-1.0s)
      this.state.startLights = 6; // GO!
      this.state.phase = 'race';
      this.state.raceTime = 0;

      // Set lap start time for all cars
      for (const car of this.state.cars) {
        car.currentLapStart = 0;
      }
    }
  }

  // ── Race phase: physics + lap tracking ────────────────────────

  private updateRacePhase(dt: number): void {
    if (!this.trackData) return;

    this.state.raceTime += dt;

    // Fixed timestep accumulator
    this.accumulator += dt;
    const physDt = 1 / 120;

    while (this.accumulator >= physDt) {
      this.accumulator -= physDt;

      // Update player car
      const playerCar = this.state.cars[this.state.playerIndex];
      if (!playerCar.finished) {
        updateCarPhysics(
          playerCar, this.playerInput, physDt,
          this.trackData, this.state.autoGears, this.state.autoBrakes
        );
        handleBarrierCollision(playerCar, this.trackData);
      }

      // Update AI cars
      for (let i = 0; i < this.state.cars.length; i++) {
        if (i === this.state.playerIndex) continue;
        const car = this.state.cars[i];
        if (car.finished) continue;

        const ai = this.aiControllers[i];
        if (ai) {
          const input = ai.getInput(car, this.state.cars, i);
          updateCarPhysics(car, input, physDt, this.trackData!, this.state.autoGears, false);
          handleBarrierCollision(car, this.trackData!);
        }
      }

      // Resolve car-to-car collisions
      resolveCarCollisions(this.state.cars);
    }

    // Lap tracking
    this.updateLapTracking();

    // Update standings
    this.updateStandings();

    // Check for race end
    const playerCar = this.state.cars[this.state.playerIndex];
    if (playerCar.finished) {
      this.state.phase = 'finish';
      this.finishTimer = 0;
    }
  }

  // ── Finish phase ──────────────────────────────────────────────

  private updateFinishPhase(dt: number): void {
    if (!this.trackData) return;

    this.state.raceTime += dt;
    this.finishTimer += dt;

    // Keep AI running for a bit
    this.accumulator += dt;
    const physDt = 1 / 120;

    while (this.accumulator >= physDt) {
      this.accumulator -= physDt;

      for (let i = 0; i < this.state.cars.length; i++) {
        if (i === this.state.playerIndex) continue;
        const car = this.state.cars[i];
        if (car.finished) continue;

        const ai = this.aiControllers[i];
        if (ai) {
          const input = ai.getInput(car, this.state.cars, i);
          updateCarPhysics(car, input, physDt, this.trackData!, this.state.autoGears, false);
        }
      }
    }

    this.updateLapTracking();
    this.updateStandings();

    // After 10 seconds, move to results
    if (this.finishTimer > 10) {
      this.state.phase = 'results';
      // Mark all unfinished cars as finished
      for (const car of this.state.cars) {
        if (!car.finished) {
          car.finished = true;
          car.finishTime = this.state.raceTime;
        }
      }
    }
  }

  // ── Lap tracking ──────────────────────────────────────────────

  private updateLapTracking(): void {
    for (const car of this.state.cars) {
      if (car.finished) continue;

      // Detect lap completion: splineT crosses from >0.95 to <0.05
      // (handled by checking if car is near start and has moved forward)
      const prevT = car.splineT;

      // Check sector progression
      const sectorSize = 1 / TRACK.SECTOR_COUNT;
      const newSector = Math.floor(car.splineT / sectorSize);
      if (newSector !== car.currentSector) {
        const sectorTime = this.state.raceTime - car.currentLapStart;
        car.sectorTimes.push(sectorTime);
        car.currentSector = newSector;
      }

      // Lap completion check
      if (prevT > 0.90 && car.splineT < 0.10 && car.speed > 5) {
        car.lapCount++;

        if (car.lapCount > 0) {
          const lapTime = this.state.raceTime - car.currentLapStart;
          car.lapTimes.push(lapTime);

          if (lapTime < car.bestLap) {
            car.bestLap = lapTime;
          }

          if (lapTime < this.state.fastestLap) {
            this.state.fastestLap = lapTime;
            this.state.fastestLapDriver = this.state.cars.indexOf(car);
          }
        }

        car.currentLapStart = this.state.raceTime;
        car.sectorTimes = [];
        car.currentSector = 0;

        // Check if finished
        if (car.lapCount >= this.state.totalLaps) {
          car.finished = true;
          car.finishTime = this.state.raceTime;
        }
      }
    }
  }

  // ── Standings ─────────────────────────────────────────────────

  private updateStandings(): void {
    const standings: RaceStanding[] = this.state.cars.map((car, i) => ({
      driverIndex: i,
      position: 0,
      lapCount: car.lapCount,
      splineT: car.splineT,
      gap: 0,
      bestLap: car.bestLap,
      finished: car.finished,
    }));

    // Sort by progress: laps first, then spline position
    standings.sort((a, b) => {
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      if (a.finished && b.finished) {
        return this.state.cars[a.driverIndex].finishTime - this.state.cars[b.driverIndex].finishTime;
      }
      const progA = a.lapCount * 1000 + a.splineT;
      const progB = b.lapCount * 1000 + b.splineT;
      return progB - progA;
    });

    // Assign positions and gaps
    for (let i = 0; i < standings.length; i++) {
      standings[i].position = i + 1;
      if (i === 0) {
        standings[i].gap = 0;
      } else {
        // Approximate gap based on distance
        const leader = standings[0];
        const progLeader = leader.lapCount * 1000 + leader.splineT;
        const progThis = standings[i].lapCount * 1000 + standings[i].splineT;
        const progDiff = progLeader - progThis;
        // Very rough: 1 spline unit ~= 0.1 seconds at average speed
        standings[i].gap = progDiff * 0.5;
      }
    }

    this.state.standings = standings;
  }

  // ── Getters ───────────────────────────────────────────────────

  getPlayerPosition(): number {
    const standing = this.state.standings.find(s => s.driverIndex === this.state.playerIndex);
    return standing?.position || this.state.cars.length;
  }

  getPlayerCar(): CarState {
    return this.state.cars[this.state.playerIndex];
  }
}
