import { EnemyType, TOTAL_WAVES, Difficulty } from './rules';

export interface WaveComposition {
  wave: number;
  enemies: { type: EnemyType; delay: number }[];
  bonus: number;  // gold bonus for completing wave
}

function repeat<T>(item: T, count: number): T[] {
  return Array.from({ length: count }, () => item);
}

function spawnGroup(type: EnemyType, count: number, delayBetween: number, initialDelay: number = 0): { type: EnemyType; delay: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    type,
    delay: initialDelay + i * delayBetween,
  }));
}

function mixGroups(...groups: { type: EnemyType; delay: number }[][]): { type: EnemyType; delay: number }[] {
  // Merge all groups and sort by delay
  const all = groups.flat();
  all.sort((a, b) => a.delay - b.delay);
  // Convert to relative delays
  const result: { type: EnemyType; delay: number }[] = [];
  let lastTime = 0;
  for (const entry of all) {
    result.push({ type: entry.type, delay: entry.delay - lastTime });
    lastTime = entry.delay;
  }
  return result;
}

export function generateWaves(difficulty: Difficulty): WaveComposition[] {
  const waves: WaveComposition[] = [];
  const diff = difficulty === 'easy' ? 0.7 : difficulty === 'medium' ? 1.0 : 1.4;

  for (let w = 1; w <= TOTAL_WAVES; w++) {
    let enemies: { type: EnemyType; delay: number }[];
    let bonus: number;

    if (w <= 3) {
      // Early waves: grunts only
      const count = Math.ceil((3 + w * 2) * diff);
      enemies = spawnGroup('grunt', count, 1.2);
      bonus = 20 + w * 5;
    } else if (w <= 6) {
      // Introduce scouts
      const gruntCount = Math.ceil((4 + w) * diff);
      const scoutCount = Math.ceil((w - 2) * diff);
      enemies = mixGroups(
        spawnGroup('grunt', gruntCount, 1.0),
        spawnGroup('scout', scoutCount, 0.8, 2.0)
      );
      bonus = 30 + w * 5;
    } else if (w <= 9) {
      // Introduce brutes
      const gruntCount = Math.ceil((6 + w) * diff);
      const scoutCount = Math.ceil((w - 3) * diff);
      const bruteCount = Math.ceil((w - 5) * diff);
      enemies = mixGroups(
        spawnGroup('grunt', gruntCount, 0.9),
        spawnGroup('scout', scoutCount, 0.7, 1.5),
        spawnGroup('brute', bruteCount, 2.0, 4.0)
      );
      bonus = 40 + w * 8;
    } else if (w <= 12) {
      // Heavy mixed waves
      const gruntCount = Math.ceil((8 + w) * diff);
      const scoutCount = Math.ceil((w - 2) * diff);
      const bruteCount = Math.ceil((w - 6) * diff);
      enemies = mixGroups(
        spawnGroup('grunt', gruntCount, 0.7),
        spawnGroup('scout', scoutCount, 0.5, 1.0),
        spawnGroup('brute', bruteCount, 1.8, 3.0)
      );
      bonus = 50 + w * 10;
    } else if (w <= 14) {
      // Overlords appear
      const gruntCount = Math.ceil(10 * diff);
      const scoutCount = Math.ceil(8 * diff);
      const bruteCount = Math.ceil(5 * diff);
      const overlordCount = Math.ceil((w - 12) * diff);
      enemies = mixGroups(
        spawnGroup('grunt', gruntCount, 0.6),
        spawnGroup('scout', scoutCount, 0.5, 1.0),
        spawnGroup('brute', bruteCount, 1.5, 2.0),
        spawnGroup('overlord', overlordCount, 3.0, 6.0)
      );
      bonus = 60 + w * 12;
    } else {
      // Wave 15: Boss wave
      const gruntCount = Math.ceil(15 * diff);
      const scoutCount = Math.ceil(10 * diff);
      const bruteCount = Math.ceil(8 * diff);
      const overlordCount = Math.ceil(3 * diff);
      enemies = mixGroups(
        spawnGroup('grunt', gruntCount, 0.5),
        spawnGroup('scout', scoutCount, 0.4, 0.5),
        spawnGroup('brute', bruteCount, 1.2, 2.0),
        spawnGroup('overlord', overlordCount, 4.0, 8.0)
      );
      bonus = 0; // Final wave, no bonus needed
    }

    waves.push({ wave: w, enemies, bonus });
  }

  return waves;
}
