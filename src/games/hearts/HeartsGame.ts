import { Card } from '../../engine/types';
import {
  HeartsState,
  createInitialState,
  dealHands,
  isValidPlay,
  trickWinner,
  trickPoints,
  checkShootTheMoon,
  isGameOver,
  findStartPlayer,
  sortHand,
  getPassTarget,
  cardPoints,
} from './rules';

export class HeartsGame {
  private state: HeartsState;
  private listeners: Set<(state: HeartsState) => void> = new Set();

  constructor() {
    this.state = createInitialState();
  }

  initialize(): void {
    this.state = createInitialState();
    dealHands(this.state);
    const starter = findStartPlayer(this.state.hands);
    this.state.currentPlayer = starter;
    this.state.trickLeader = starter;

    // Skip passing on round 4 (and every 4th round)
    if (this.state.roundNumber % 4 === 0) {
      this.state.phase = 'playing';
    }

    this.notify();
  }

  getState(): HeartsState {
    return this.state;
  }

  subscribe(listener: (state: HeartsState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  selectPassCard(playerIndex: number, card: Card): boolean {
    if (this.state.phase !== 'passing') return false;
    const passing = this.state.passingCards[playerIndex];
    if (passing.length >= 3) return false;
    if (passing.some((c) => c.id === card.id)) return false;
    if (!this.state.hands[playerIndex].some((c) => c.id === card.id)) return false;

    passing.push(card);
    this.notify();
    return true;
  }

  deselectPassCard(playerIndex: number, card: Card): void {
    if (this.state.phase !== 'passing') return;
    this.state.passingCards[playerIndex] = this.state.passingCards[playerIndex].filter(
      (c) => c.id !== card.id
    );
    this.notify();
  }

  executePass(): boolean {
    if (this.state.phase !== 'passing') return false;
    // Check all players have selected 3 cards
    if (!this.state.passingCards.every((p) => p.length === 3)) return false;

    const direction = this.state.passDirection;

    // Remove cards from hands and collect
    const passing: Card[][] = [[], [], [], []];
    for (let i = 0; i < 4; i++) {
      for (const card of this.state.passingCards[i]) {
        this.state.hands[i] = this.state.hands[i].filter((c) => c.id !== card.id);
        const target = getPassTarget(i, direction);
        passing[target].push(card);
      }
    }

    // Add received cards
    for (let i = 0; i < 4; i++) {
      this.state.hands[i].push(...passing[i]);
      sortHand(this.state.hands[i]);
    }

    this.state.passingCards = [[], [], [], []];
    this.state.phase = 'playing';

    // Find who has 2 of clubs
    const starter = findStartPlayer(this.state.hands);
    this.state.currentPlayer = starter;
    this.state.trickLeader = starter;

    this.notify();
    return true;
  }

  playCard(playerIndex: number, card: Card): boolean {
    if (this.state.phase !== 'playing') return false;
    if (playerIndex !== this.state.currentPlayer) return false;
    if (!isValidPlay(this.state, playerIndex, card)) return false;

    // Remove card from hand
    this.state.hands[playerIndex] = this.state.hands[playerIndex].filter((c) => c.id !== card.id);
    this.state.currentTrick[playerIndex] = card;

    // Check if hearts broken
    if (card.suit === 'hearts') {
      this.state.heartsBroken = true;
    }

    // Check if trick is complete
    const playedCount = this.state.currentTrick.filter((c) => c !== null).length;
    if (playedCount === 4) {
      this.completeTrick();
    } else {
      // Next player
      this.state.currentPlayer = (this.state.currentPlayer + 1) % 4;
    }

    this.notify();
    return true;
  }

  private completeTrick(): void {
    const trick = this.state.currentTrick as Card[];
    const winner = trickWinner(trick, this.state.trickLeader);
    const points = trickPoints(trick);

    this.state.scores[winner] += points;
    this.state.tricks[winner].push(...trick);
    this.state.currentTrick = [null, null, null, null];
    this.state.trickLeader = winner;
    this.state.currentPlayer = winner;

    // Check if round is over (all cards played)
    if (this.state.hands.every((h) => h.length === 0)) {
      this.completeRound();
    }
  }

  private completeRound(): void {
    // Check shoot the moon
    const adjustedScores = checkShootTheMoon([...this.state.scores]);

    for (let i = 0; i < 4; i++) {
      this.state.totalScores[i] += adjustedScores[i];
    }

    if (isGameOver(this.state.totalScores)) {
      this.state.phase = 'game-over';
    } else {
      this.state.phase = 'round-over';
    }

    this.notify();
  }

  startNextRound(): void {
    const totalScores = [...this.state.totalScores];
    const roundNumber = this.state.roundNumber + 1;
    const passDirection = (this.state.passDirection + 1) % 4;

    this.state = createInitialState();
    this.state.totalScores = totalScores;
    this.state.roundNumber = roundNumber;
    this.state.passDirection = passDirection;

    dealHands(this.state);

    if (passDirection === 3) {
      this.state.phase = 'playing';
    }

    const starter = findStartPlayer(this.state.hands);
    this.state.currentPlayer = starter;
    this.state.trickLeader = starter;

    this.notify();
  }

  getValidPlays(playerIndex: number): Card[] {
    return this.state.hands[playerIndex].filter((card) =>
      isValidPlay(this.state, playerIndex, card)
    );
  }

  getWinner(): number {
    // Lowest score wins
    let minScore = Infinity;
    let winner = 0;
    for (let i = 0; i < 4; i++) {
      if (this.state.totalScores[i] < minScore) {
        minScore = this.state.totalScores[i];
        winner = i;
      }
    }
    return winner;
  }
}
