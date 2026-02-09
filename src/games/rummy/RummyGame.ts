import { Card } from '../../engine/types';
import {
  RummyState,
  createInitialState,
  dealGame,
  sortHand,
  findMelds,
  canKnock,
  isGin,
} from './rules';

export class RummyGame {
  private state: RummyState;
  private listeners: Set<(state: RummyState) => void> = new Set();

  constructor() {
    this.state = createInitialState();
  }

  /** Full reset: new game, scores back to zero */
  initialize(): void {
    this.state = createInitialState();
    dealGame(this.state);
    this.notify();
  }

  /** New round: preserve scores, deal fresh cards */
  newRound(): void {
    const scores = [...this.state.scores];
    this.state = createInitialState();
    this.state.scores = scores;
    dealGame(this.state);
    this.notify();
  }

  getState(): RummyState {
    return this.state;
  }

  subscribe(listener: (state: RummyState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  drawFromPile(): boolean {
    if (this.state.phase !== 'draw') return false;
    if (this.state.drawPile.length === 0) {
      // Draw pile empty at the start of a draw -- game is a draw
      this.state.phase = 'round-over';
      this.state.lastAction = 'Draw pile empty - draw game';
      this.state.roundResult = 'Draw pile exhausted. Round is a draw.';
      this.notify();
      return false;
    }

    const card = this.state.drawPile.pop()!;
    card.faceUp = true;
    this.state.hands[this.state.currentPlayer].push(card);
    sortHand(this.state.hands[this.state.currentPlayer]);
    this.state.phase = 'discard';
    this.state.lastAction = 'Drew from pile';

    this.notify();
    return true;
  }

  drawFromDiscard(): boolean {
    if (this.state.phase !== 'draw') return false;
    if (this.state.discardPile.length === 0) return false;

    const card = this.state.discardPile.pop()!;
    card.faceUp = true;
    this.state.hands[this.state.currentPlayer].push(card);
    sortHand(this.state.hands[this.state.currentPlayer]);
    this.state.phase = 'discard';
    this.state.lastAction = 'Drew from discard';
    this.notify();
    return true;
  }

  discard(card: Card): boolean {
    if (this.state.phase !== 'discard') return false;
    const hand = this.state.hands[this.state.currentPlayer];
    const index = hand.findIndex((c) => c.id === card.id);
    if (index === -1) return false;

    hand.splice(index, 1);
    this.state.discardPile.push(card);
    this.state.lastAction = `Discarded ${card.rank} of ${card.suit}`;

    // Check for gin after discard (10-card hand)
    if (isGin(hand)) {
      this.state.phase = 'gin';
      this.resolveRound(this.state.currentPlayer, true);
    } else {
      // Switch to next player's draw phase
      this.state.currentPlayer = 1 - this.state.currentPlayer;
      this.state.phase = 'draw';

      // Check if draw pile is empty for next player
      if (this.state.drawPile.length === 0 && this.state.discardPile.length === 0) {
        this.state.phase = 'round-over';
        this.state.lastAction = 'No cards left - draw game';
        this.state.roundResult = 'No cards available. Round is a draw.';
      }
    }

    this.notify();
    return true;
  }

  /**
   * Knock + discard in one operation.
   * In Gin Rummy, knocking requires discarding a card first,
   * then laying off melds. This method does both atomically.
   */
  knockWithDiscard(card: Card): boolean {
    if (this.state.phase !== 'discard' && this.state.phase !== 'knock-discard') return false;
    const hand = this.state.hands[this.state.currentPlayer];
    const index = hand.findIndex((c) => c.id === card.id);
    if (index === -1) return false;

    // Remove the discard card
    hand.splice(index, 1);
    this.state.discardPile.push(card);

    // Now check if knock is valid on the resulting 10-card hand
    if (!canKnock(hand)) {
      // Undo: put card back (knock was invalid after this discard)
      this.state.discardPile.pop();
      hand.splice(index, 0, card);
      sortHand(hand);
      return false;
    }

    this.state.lastAction = `Discarded ${card.rank} of ${card.suit} and knocked`;
    this.resolveRound(this.state.currentPlayer, isGin(hand));
    this.notify();
    return true;
  }

  /**
   * Enter knock-discard phase: player has indicated they want to knock,
   * now they need to select a card to discard.
   */
  enterKnockPhase(): boolean {
    if (this.state.phase !== 'discard') return false;
    // Check that knocking is at least possible (with 11 cards, some discard might yield <= 10)
    this.state.phase = 'knock-discard';
    this.state.lastAction = 'Select a card to discard for knock';
    this.notify();
    return true;
  }

  /** Cancel knock and return to normal discard phase */
  cancelKnock(): void {
    if (this.state.phase === 'knock-discard') {
      this.state.phase = 'discard';
      this.state.lastAction = 'Knock cancelled';
      this.notify();
    }
  }

  private resolveRound(knocker: number, isGinHand: boolean): void {
    const opponent = 1 - knocker;
    const knockerResult = findMelds(this.state.hands[knocker]);
    const opponentResult = findMelds(this.state.hands[opponent]);

    if (isGinHand) {
      // Gin bonus: 25 + opponent's deadwood
      const bonus = 25 + opponentResult.deadwoodPoints;
      this.state.scores[knocker] += bonus;
      this.state.lastAction = `${knocker === 0 ? 'You' : 'AI'} got Gin! +${bonus} points`;
      this.state.roundResult = this.state.lastAction;
    } else {
      // Knock: compare deadwood
      if (knockerResult.deadwoodPoints < opponentResult.deadwoodPoints) {
        const diff = opponentResult.deadwoodPoints - knockerResult.deadwoodPoints;
        this.state.scores[knocker] += diff;
        this.state.lastAction = `${knocker === 0 ? 'You' : 'AI'} knocked and won ${diff} points`;
        this.state.roundResult = this.state.lastAction;
      } else {
        // Undercut! Opponent gets bonus
        const diff = knockerResult.deadwoodPoints - opponentResult.deadwoodPoints + 25;
        this.state.scores[opponent] += diff;
        this.state.lastAction = `Undercut! ${opponent === 0 ? 'You' : 'AI'} won ${diff} points`;
        this.state.roundResult = this.state.lastAction;
      }
    }

    this.state.knocker = knocker;

    // Game over at 100 points
    if (this.state.scores[0] >= 100 || this.state.scores[1] >= 100) {
      this.state.phase = 'finished';
      this.state.winner = this.state.scores[0] >= 100 ? 0 : 1;
    } else {
      this.state.phase = 'round-over';
    }
  }

  canKnock(): boolean {
    if (this.state.phase !== 'discard') return false;
    // With 11 cards in hand (after draw), we check if ANY single discard
    // would leave a 10-card hand with deadwood <= 10
    const hand = this.state.hands[this.state.currentPlayer];
    for (const card of hand) {
      const remaining = hand.filter((c) => c.id !== card.id);
      if (canKnock(remaining)) return true;
    }
    return false;
  }

  isGin(): boolean {
    // Check if any discard from the 11-card hand would produce gin
    const hand = this.state.hands[this.state.currentPlayer];
    for (const card of hand) {
      const remaining = hand.filter((c) => c.id !== card.id);
      if (isGin(remaining)) return true;
    }
    return false;
  }

  getMelds(playerIndex: number) {
    return findMelds(this.state.hands[playerIndex]);
  }
}
