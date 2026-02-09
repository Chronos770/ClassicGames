import {
  TowerDefenseState,
  Tower,
  Enemy,
  Projectile,
  TowerType,
  EnemyType,
  TOWER_DEFS,
  ENEMY_DEFS,
  MAPS,
  MapDef,
  GRID_ROWS,
  GRID_COLS,
  CELL_SIZE,
  STARTING_GOLD,
  STARTING_LIVES,
  TOTAL_WAVES,
  getTowerDamage,
  getTowerRange,
  getTowerFireRate,
  getUpgradeCost,
  getSellValue,
  cellToPixel,
  distanceCells,
  Difficulty,
} from './rules';
import { generateWaves, WaveComposition } from './TowerDefenseAI';

let nextId = 1;
function genId(): number {
  return nextId++;
}

export class TowerDefenseGame {
  private state: TowerDefenseState;
  private map: MapDef;
  private waves: WaveComposition[] = [];
  private listeners: Set<(state: TowerDefenseState) => void> = new Set();

  constructor() {
    this.map = MAPS[0];
    this.state = this.createInitialState(0);
  }

  private createInitialState(mapIndex: number): TowerDefenseState {
    return {
      phase: 'building',
      mapIndex,
      wave: 0,
      gold: STARTING_GOLD,
      lives: STARTING_LIVES,
      score: 0,
      towers: [],
      enemies: [],
      projectiles: [],
      selectedTower: null,
      selectedPlacedTower: null,
      waveEnemiesRemaining: 0,
      waveSpawnQueue: [],
      spawnTimer: 0,
    };
  }

  initialize(mapIndex: number, difficulty: Difficulty): void {
    nextId = 1;
    this.map = MAPS[mapIndex];
    this.state = this.createInitialState(mapIndex);
    this.waves = generateWaves(difficulty);
    this.notify();
  }

  getState(): TowerDefenseState {
    return this.state;
  }

  getMap(): MapDef {
    return this.map;
  }

  subscribe(listener: (state: TowerDefenseState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const s = this.state;
    for (const listener of this.listeners) {
      listener(s);
    }
  }

  // ── Tower Actions ──

  canPlaceTower(row: number, col: number): boolean {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return false;
    const cell = this.map.grid[row][col];
    if (cell !== 'grass') return false;
    // Check if tower already exists here
    return !this.state.towers.some(t => t.row === row && t.col === col);
  }

  placeTower(row: number, col: number, type: TowerType): boolean {
    const def = TOWER_DEFS[type];
    if (!this.canPlaceTower(row, col)) return false;
    if (this.state.gold < def.cost) return false;

    const tower: Tower = {
      id: genId(),
      type,
      row,
      col,
      level: 1,
      cooldown: 0,
      totalKills: 0,
    };

    this.state.towers.push(tower);
    this.state.gold -= def.cost;
    this.state.selectedTower = null;
    this.notify();
    return true;
  }

  upgradeTower(towerId: number): boolean {
    const tower = this.state.towers.find(t => t.id === towerId);
    if (!tower || tower.level >= 3) return false;
    const cost = getUpgradeCost(tower);
    if (this.state.gold < cost) return false;

    tower.level++;
    this.state.gold -= cost;
    this.notify();
    return true;
  }

  sellTower(towerId: number): boolean {
    const idx = this.state.towers.findIndex(t => t.id === towerId);
    if (idx === -1) return false;
    const tower = this.state.towers[idx];
    const value = getSellValue(tower);
    this.state.gold += value;
    this.state.towers.splice(idx, 1);
    if (this.state.selectedPlacedTower === towerId) {
      this.state.selectedPlacedTower = null;
    }
    this.notify();
    return true;
  }

  selectTowerType(type: TowerType | null): void {
    this.state.selectedTower = type;
    this.state.selectedPlacedTower = null;
    this.notify();
  }

  selectPlacedTower(towerId: number | null): void {
    this.state.selectedPlacedTower = towerId;
    this.state.selectedTower = null;
    this.notify();
  }

  // ── Wave Control ──

  startWave(): boolean {
    if (this.state.phase !== 'building') return false;
    if (this.state.wave >= TOTAL_WAVES) return false;

    this.state.wave++;
    this.state.phase = 'wave';

    const waveData = this.waves[this.state.wave - 1];
    this.state.waveSpawnQueue = [...waveData.enemies];
    this.state.waveEnemiesRemaining = waveData.enemies.length;
    this.state.spawnTimer = this.state.waveSpawnQueue.length > 0 ? this.state.waveSpawnQueue[0].delay : 0;

    this.notify();
    return true;
  }

  // ── Game Update Loop ──

  update(deltaMs: number): { events: GameEvent[] } {
    const dt = deltaMs / 1000; // seconds
    const events: GameEvent[] = [];

    if (this.state.phase !== 'wave') return { events };

    // 1. Spawn enemies
    this.updateSpawning(dt, events);

    // 2. Move enemies
    this.updateEnemies(dt, events);

    // 3. Tower targeting & firing
    this.updateTowers(dt, events);

    // 4. Move projectiles
    this.updateProjectiles(dt, events);

    // 5. Check wave completion
    this.checkWaveEnd(events);

    // Clean up dead enemies and finished projectiles
    this.state.enemies = this.state.enemies.filter(e => e.alive);
    this.state.projectiles = this.state.projectiles.filter(p => p.progress < 1);

    return { events };
  }

  private updateSpawning(dt: number, events: GameEvent[]): void {
    if (this.state.waveSpawnQueue.length === 0) return;

    this.state.spawnTimer -= dt;
    while (this.state.spawnTimer <= 0 && this.state.waveSpawnQueue.length > 0) {
      const spawn = this.state.waveSpawnQueue.shift()!;

      // For multi-path maps, randomly assign to a path
      const pathIndex = this.map.paths.length > 1 ? Math.floor(Math.random() * this.map.paths.length) : 0;
      const path = this.map.paths[pathIndex];
      const startPos = cellToPixel(path[0].row, path[0].col);

      const def = ENEMY_DEFS[spawn.type];
      const enemy: Enemy = {
        id: genId(),
        type: spawn.type,
        hp: def.hp,
        maxHp: def.hp,
        pathIndex,
        progress: 0,
        speed: def.speed,
        slowTimer: 0,
        x: startPos.x,
        y: startPos.y,
        alive: true,
      };

      this.state.enemies.push(enemy);
      events.push({ type: 'spawn', enemyType: spawn.type });

      // Set timer for next spawn
      if (this.state.waveSpawnQueue.length > 0) {
        this.state.spawnTimer += this.state.waveSpawnQueue[0].delay;
      }
    }
  }

  private updateEnemies(dt: number, events: GameEvent[]): void {
    for (const enemy of this.state.enemies) {
      if (!enemy.alive) continue;

      // Update slow
      if (enemy.slowTimer > 0) {
        enemy.slowTimer -= dt;
      }

      // Move along path
      const speedMult = enemy.slowTimer > 0 ? 0.5 : 1.0;
      const moveAmount = enemy.speed * speedMult * dt;
      enemy.progress += moveAmount;

      const path = this.map.paths[enemy.pathIndex];
      if (enemy.progress >= path.length - 1) {
        // Enemy reached the end
        enemy.alive = false;
        this.state.lives--;
        this.state.waveEnemiesRemaining--;
        events.push({ type: 'leak' });

        if (this.state.lives <= 0) {
          this.state.phase = 'lost';
          events.push({ type: 'game-over', won: false });
        }
      } else {
        // Interpolate position
        const idx = Math.floor(enemy.progress);
        const frac = enemy.progress - idx;
        const p1 = path[idx];
        const p2 = path[Math.min(idx + 1, path.length - 1)];
        const pos1 = cellToPixel(p1.row, p1.col);
        const pos2 = cellToPixel(p2.row, p2.col);
        enemy.x = pos1.x + (pos2.x - pos1.x) * frac;
        enemy.y = pos1.y + (pos2.y - pos1.y) * frac;
      }
    }
  }

  private updateTowers(dt: number, events: GameEvent[]): void {
    for (const tower of this.state.towers) {
      tower.cooldown -= dt;
      if (tower.cooldown > 0) continue;

      const towerPos = cellToPixel(tower.row, tower.col);
      const range = getTowerRange(tower) * CELL_SIZE;
      const damage = getTowerDamage(tower);

      // Find closest enemy in range
      let target: Enemy | null = null;
      let minDist = Infinity;

      for (const enemy of this.state.enemies) {
        if (!enemy.alive) continue;
        const dist = Math.sqrt((towerPos.x - enemy.x) ** 2 + (towerPos.y - enemy.y) ** 2);
        if (dist <= range && dist < minDist) {
          minDist = dist;
          target = enemy;
        }
      }

      if (!target) continue;

      // Fire!
      tower.cooldown = 1 / getTowerFireRate(tower);

      const projectile: Projectile = {
        id: genId(),
        fromX: towerPos.x,
        fromY: towerPos.y,
        toX: target.x,
        toY: target.y,
        progress: 0,
        towerType: tower.type,
        damage,
        targetId: target.id,
        aoe: tower.type === 'cannon',
        chainTargets: tower.type === 'lightning' ? this.findChainTargets(target, tower, 3) : undefined,
      };

      this.state.projectiles.push(projectile);
      events.push({ type: 'fire', towerType: tower.type, towerId: tower.id, x: towerPos.x, y: towerPos.y });
    }
  }

  private findChainTargets(primary: Enemy, tower: Tower, maxChain: number): number[] {
    const range = getTowerRange(tower) * CELL_SIZE * 1.5;
    const targets: number[] = [];
    const used = new Set<number>([primary.id]);

    let current = primary;
    for (let i = 0; i < maxChain - 1; i++) {
      let closest: Enemy | null = null;
      let closestDist = Infinity;

      for (const e of this.state.enemies) {
        if (!e.alive || used.has(e.id)) continue;
        const dist = Math.sqrt((current.x - e.x) ** 2 + (current.y - e.y) ** 2);
        if (dist <= range && dist < closestDist) {
          closestDist = dist;
          closest = e;
        }
      }

      if (!closest) break;
      targets.push(closest.id);
      used.add(closest.id);
      current = closest;
    }

    return targets;
  }

  private updateProjectiles(dt: number, events: GameEvent[]): void {
    const projectileSpeed = 8; // normalized speed

    for (const proj of this.state.projectiles) {
      proj.progress += dt * projectileSpeed;

      if (proj.progress >= 1) {
        proj.progress = 1;
        // Apply damage
        this.applyProjectileDamage(proj, events);
      }
    }
  }

  private applyProjectileDamage(proj: Projectile, events: GameEvent[]): void {
    const target = this.state.enemies.find(e => e.id === proj.targetId);

    if (proj.aoe) {
      // Cannon: area damage
      const aoeRadius = 1.5 * CELL_SIZE;
      for (const enemy of this.state.enemies) {
        if (!enemy.alive) continue;
        const dist = Math.sqrt((proj.toX - enemy.x) ** 2 + (proj.toY - enemy.y) ** 2);
        if (dist <= aoeRadius) {
          this.damageEnemy(enemy, proj.damage, events);
        }
      }
      events.push({ type: 'explosion', x: proj.toX, y: proj.toY });
    } else if (proj.chainTargets && proj.chainTargets.length > 0) {
      // Lightning: chain damage
      if (target && target.alive) {
        this.damageEnemy(target, proj.damage, events);
      }
      for (const chainId of proj.chainTargets) {
        const chainTarget = this.state.enemies.find(e => e.id === chainId);
        if (chainTarget && chainTarget.alive) {
          this.damageEnemy(chainTarget, Math.floor(proj.damage * 0.7), events);
        }
      }
    } else {
      // Single target (arrow, ice)
      if (target && target.alive) {
        this.damageEnemy(target, proj.damage, events);

        // Ice slow effect
        if (proj.towerType === 'ice') {
          target.slowTimer = 2.0;
          events.push({ type: 'slow', enemyId: target.id });
        }
      }
    }
  }

  private damageEnemy(enemy: Enemy, damage: number, events: GameEvent[]): void {
    enemy.hp -= damage;
    if (enemy.hp <= 0 && enemy.alive) {
      enemy.alive = false;
      const def = ENEMY_DEFS[enemy.type];
      this.state.gold += def.reward;
      this.state.score += def.reward;
      this.state.waveEnemiesRemaining--;
      events.push({ type: 'kill', enemyType: enemy.type, x: enemy.x, y: enemy.y });

      // Credit kill to nearest tower (approximate)
      // Just increment a random tower that could've hit it for now
    }
  }

  private checkWaveEnd(events: GameEvent[]): void {
    if (this.state.phase !== 'wave') return;

    const allSpawned = this.state.waveSpawnQueue.length === 0;
    const allDead = this.state.enemies.every(e => !e.alive);

    if (allSpawned && allDead) {
      if (this.state.wave >= TOTAL_WAVES) {
        this.state.phase = 'won';
        events.push({ type: 'game-over', won: true });
      } else {
        // Wave complete, back to building
        this.state.phase = 'building';
        const waveData = this.waves[this.state.wave - 1];
        this.state.gold += waveData.bonus;
        this.state.score += waveData.bonus;
        events.push({ type: 'wave-complete', wave: this.state.wave, bonus: waveData.bonus });
      }
    }
  }
}

// ── Game Events ──
export type GameEvent =
  | { type: 'spawn'; enemyType: EnemyType }
  | { type: 'fire'; towerType: TowerType; towerId: number; x: number; y: number }
  | { type: 'kill'; enemyType: EnemyType; x: number; y: number }
  | { type: 'leak' }
  | { type: 'explosion'; x: number; y: number }
  | { type: 'slow'; enemyId: number }
  | { type: 'wave-complete'; wave: number; bonus: number }
  | { type: 'game-over'; won: boolean };
