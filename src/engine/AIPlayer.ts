import { Difficulty, Move } from './types';

export interface AIPlayerConfig {
  difficulty: Difficulty;
  thinkingTimeMs: number;
}

export abstract class AIPlayer {
  protected difficulty: Difficulty;
  protected thinkingTimeMs: number;

  constructor(config: AIPlayerConfig) {
    this.difficulty = config.difficulty;
    this.thinkingTimeMs = config.thinkingTimeMs;
  }

  abstract selectMove(gameState: unknown): Promise<Move>;

  protected async simulateThinking(): Promise<void> {
    const jitter = Math.random() * 500;
    await new Promise(resolve => setTimeout(resolve, this.thinkingTimeMs + jitter));
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
  }
}
