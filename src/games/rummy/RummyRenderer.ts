import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Card } from '../../engine/types';
import { createCardGraphics, getCardDimensions } from '../../renderer/CardSprite';
import { createFeltSurface } from '../../renderer/TableSurface';
import { RummyState, findMelds } from './rules';

const CARD = getCardDimensions();

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export class RummyRenderer {
  private app: Application;
  private mainContainer: Container;
  private animContainer: Container;
  private onCardClick?: (card: Card, source: 'hand' | 'discard' | 'draw') => void;
  private opponentName = 'AI';
  private isMultiplayer = false;
  private pulseRAFs: number[] = [];      // turn indicator pulse (safe to cancel on re-render)
  private dealAnimRAFs: number[] = [];   // deal animation (must NOT be cancelled by render)
  private cardAnimRAFs: number[] = [];   // card draw/discard animations
  private destroyed = false;
  private dealing = false;               // true while deal animation is in progress

  constructor(app: Application) {
    this.app = app;
    this.mainContainer = new Container();
    this.animContainer = new Container();

    const felt = createFeltSurface(app.screen.width, app.screen.height);
    this.mainContainer.addChild(felt);

    app.stage.addChild(this.mainContainer);
    app.stage.addChild(this.animContainer);
  }

  setOnCardClick(cb: (card: Card, source: 'hand' | 'discard' | 'draw') => void): void {
    this.onCardClick = cb;
  }

  setOpponentName(name: string): void {
    this.opponentName = name;
  }

  setMultiplayer(value: boolean): void {
    this.isMultiplayer = value;
  }

  render(state: RummyState, highlightedCards: Set<string> = new Set()): void {
    // Don't render during deal animation — the deal callback will render when done
    if (this.dealing) return;

    while (this.mainContainer.children.length > 1) {
      this.mainContainer.removeChildAt(1);
    }
    // Cancel pulse animations only (not deal or card animations)
    for (const id of this.pulseRAFs) cancelAnimationFrame(id);
    this.pulseRAFs = [];
    // Clear any leftover animation sprites
    this.animContainer.removeChildren();

    const w = this.app.screen.width;
    const h = this.app.screen.height;

    // Turn indicator (draw behind cards)
    if (state.phase === 'draw' || state.phase === 'discard' || state.phase === 'knock-discard') {
      this.renderTurnIndicator(state.currentPlayer);
    }

    // Draw pile
    if (state.drawPile.length > 0) {
      const drawCard = createCardGraphics({ suit: 'spades', rank: 'A', faceUp: false, id: 'draw' }, false);
      drawCard.x = w / 2 - CARD.width - 20;
      drawCard.y = h / 2 - CARD.height / 2;
      drawCard.on('pointertap', () => {
        this.onCardClick?.({ suit: 'spades', rank: 'A', faceUp: false, id: 'draw' }, 'draw');
      });
      this.mainContainer.addChild(drawCard);

      const countStyle = new TextStyle({ fontSize: 11, fill: '#ffffff88', fontFamily: 'Inter, sans-serif' });
      const countText = new Text({ text: `${state.drawPile.length}`, style: countStyle });
      countText.anchor.set(0.5);
      countText.x = w / 2 - CARD.width / 2 - 20;
      countText.y = h / 2 + CARD.height / 2 + 12;
      this.mainContainer.addChild(countText);
    }

    // Discard pile
    if (state.discardPile.length > 0) {
      const topDiscard = state.discardPile[state.discardPile.length - 1];
      const discardCard = createCardGraphics(topDiscard, true);
      discardCard.x = w / 2 + 20;
      discardCard.y = h / 2 - CARD.height / 2;
      discardCard.on('pointertap', () => {
        this.onCardClick?.(topDiscard, 'discard');
      });
      this.mainContainer.addChild(discardCard);

      const label = new Text({
        text: 'Discard',
        style: new TextStyle({ fontSize: 11, fill: '#ffffff66', fontFamily: 'Inter, sans-serif' }),
      });
      label.anchor.set(0.5);
      label.x = w / 2 + 20 + CARD.width / 2;
      label.y = h / 2 + CARD.height / 2 + 12;
      this.mainContainer.addChild(label);
    } else {
      const slot = new Graphics();
      slot.roundRect(w / 2 + 20, h / 2 - CARD.height / 2, CARD.width, CARD.height, 6);
      slot.stroke({ color: 0x2d8a4e, width: 1, alpha: 0.3 });
      this.mainContainer.addChild(slot);
    }

    // Player hand (bottom)
    this.renderHand(state.hands[0], w / 2, h - 20, true, highlightedCards);

    // Opponent hand (top, face down)
    this.renderOpponentHand(state.hands[1].length, w / 2, 40);

    // Labels
    const labelStyle = new TextStyle({ fontSize: 12, fill: '#ffffff88', fontFamily: 'Inter, sans-serif' });
    const youLabel = new Text({ text: 'Your Hand', style: labelStyle });
    youLabel.anchor.set(0.5);
    youLabel.x = w / 2;
    youLabel.y = h - CARD.height - 40;
    this.mainContainer.addChild(youLabel);

    const oppLabel = new Text({ text: `${this.opponentName}'s Hand`, style: labelStyle });
    oppLabel.anchor.set(0.5);
    oppLabel.x = w / 2;
    oppLabel.y = 15;
    this.mainContainer.addChild(oppLabel);

    // Scores
    const scoreStyle = new TextStyle({ fontSize: 13, fill: '#ffffffcc', fontFamily: 'Inter, sans-serif' });
    const scores = new Text({
      text: `You: ${state.scores[0]} | ${this.opponentName}: ${state.scores[1]}`,
      style: scoreStyle,
    });
    scores.anchor.set(0.5);
    scores.x = w / 2;
    scores.y = h / 2 - CARD.height / 2 - 25;
    this.mainContainer.addChild(scores);

    // Phase indicator
    const phaseStyle = new TextStyle({ fontSize: 11, fill: '#d4af37', fontFamily: 'Inter, sans-serif' });
    let phaseText = '';
    if (state.phase === 'finished' || state.phase === 'round-over') {
      phaseText = state.lastAction || 'Round over';
    } else if (state.phase === 'gin') {
      phaseText = state.lastAction || 'Gin!';
    } else if (state.phase === 'knock-discard') {
      phaseText = state.currentPlayer === 0
        ? 'Select a card to discard for knock'
        : `${this.opponentName} is knocking...`;
    } else if (state.currentPlayer === 0) {
      phaseText = state.phase === 'draw' ? 'Draw a card' : 'Discard a card';
    } else {
      phaseText = this.isMultiplayer
        ? `Waiting for ${this.opponentName}...`
        : `${this.opponentName} is thinking...`;
    }
    const phase = new Text({ text: phaseText, style: phaseStyle });
    phase.anchor.set(0.5);
    phase.x = w / 2;
    phase.y = h / 2 + CARD.height / 2 + 30;
    this.mainContainer.addChild(phase);
  }

  /** Render a glow/indicator around the current player's area */
  private renderTurnIndicator(currentPlayer: number): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    const positions = [
      // Player (bottom) - around hand area
      { x: w / 2 - 180, y: h - CARD.height - 35, w: 360, h: CARD.height + 20 },
      // Opponent (top) - around hand area
      { x: w / 2 - 130, y: 30, w: 260, h: CARD.height + 20 },
    ];

    const pos = positions[currentPlayer];
    const indicator = new Graphics();
    indicator.roundRect(pos.x, pos.y, pos.w, pos.h, 10);
    indicator.stroke({ width: 2, color: 0xfbbf24, alpha: 0.6 });
    indicator.roundRect(pos.x, pos.y, pos.w, pos.h, 10);
    indicator.fill({ color: 0xfbbf24, alpha: 0.06 });
    this.mainContainer.addChild(indicator);

    // Animate pulse
    let pulseUp = true;
    let alpha = 0.6;
    const pulse = () => {
      if (this.destroyed) return;
      alpha += pulseUp ? 0.015 : -0.015;
      if (alpha >= 0.9) pulseUp = false;
      if (alpha <= 0.3) pulseUp = true;
      indicator.alpha = alpha;
      this.pulseRAFs.push(requestAnimationFrame(pulse));
    };
    this.pulseRAFs.push(requestAnimationFrame(pulse));
  }

  /** Animate a card moving from the draw pile or discard pile to a player's hand area */
  animateCardDraw(source: 'pile' | 'discard', toPlayer: number, card?: Card, onComplete?: () => void): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    // Source positions
    const pileX = w / 2 - CARD.width - 20;
    const discardX = w / 2 + 20;
    const sourceY = h / 2 - CARD.height / 2;

    const sx = source === 'pile' ? pileX : discardX;
    const sy = sourceY;

    // Target positions (center of hand area)
    const targets: [number, number][] = [
      [w / 2 - CARD.width / 2, h - 20 - CARD.height],  // Player (bottom)
      [w / 2 - CARD.width / 2, 40],                      // Opponent (top)
    ];
    const [tx, ty] = targets[toPlayer];

    // Create the card sprite (face-down for pile, face-up for discard)
    const faceUp = source === 'discard' && card;
    const sprite = faceUp
      ? createCardGraphics(card!, true)
      : createCardGraphics({ suit: 'spades', rank: 'A', faceUp: false, id: 'anim-draw' }, false);
    sprite.x = sx;
    sprite.y = sy;
    sprite.alpha = 0.9;
    this.animContainer.addChild(sprite);

    const startX = sx;
    const startY = sy;
    const startTime = performance.now();
    const duration = 280;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const e = easeOutCubic(progress);

      sprite.x = startX + (tx - startX) * e;
      sprite.y = startY + (ty - startY) * e;
      sprite.alpha = 0.9 + 0.1 * e;

      if (progress < 1 && !this.destroyed) {
        this.cardAnimRAFs.push(requestAnimationFrame(animate));
      } else {
        this.animContainer.removeChild(sprite);
        sprite.destroy();
        onComplete?.();
      }
    };

    this.cardAnimRAFs.push(requestAnimationFrame(animate));
  }

  /** Animate a card moving from a player's hand to the discard pile */
  animateCardDiscard(fromPlayer: number, card: Card, onComplete?: () => void): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    // Start positions (center of hand area)
    const starts: [number, number][] = [
      [w / 2 - CARD.width / 2, h - 20 - CARD.height],  // Player (bottom)
      [w / 2 - CARD.width / 2, 40],                      // Opponent (top)
    ];
    const [sx, sy] = starts[fromPlayer];

    // Target: discard pile
    const tx = w / 2 + 20;
    const ty = h / 2 - CARD.height / 2;

    const sprite = createCardGraphics(card, true);
    sprite.x = sx;
    sprite.y = sy;
    sprite.alpha = 0.9;
    this.animContainer.addChild(sprite);

    const startTime = performance.now();
    const duration = 280;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const e = easeOutCubic(progress);

      sprite.x = sx + (tx - sx) * e;
      sprite.y = sy + (ty - sy) * e;
      sprite.alpha = 0.9 + 0.1 * e;

      if (progress < 1 && !this.destroyed) {
        this.cardAnimRAFs.push(requestAnimationFrame(animate));
      } else {
        this.animContainer.removeChild(sprite);
        sprite.destroy();
        onComplete?.();
      }
    };

    this.cardAnimRAFs.push(requestAnimationFrame(animate));
  }

  private renderHand(cards: Card[], cx: number, bottomY: number, interactive: boolean, highlighted: Set<string>): void {
    const totalWidth = Math.min(cards.length * 35, 600);
    const spacing = totalWidth / Math.max(cards.length - 1, 1);
    const startX = cx - totalWidth / 2;

    // Highlight melds
    const { melds } = findMelds(cards);
    const meldCardIds = new Set<string>();
    for (const meld of melds) {
      for (const card of meld.cards) {
        meldCardIds.add(card.id);
      }
    }

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const isHighlighted = highlighted.has(card.id);
      const isMeld = meldCardIds.has(card.id);
      const sprite = createCardGraphics(card, true);
      sprite.x = startX + i * spacing;
      sprite.y = bottomY - CARD.height - (isHighlighted ? 20 : 0);

      // Meld indicator (subtle green glow)
      if (isMeld) {
        const glow = new Graphics();
        glow.roundRect(sprite.x - 2, sprite.y - 2, CARD.width + 4, CARD.height + 4, 8);
        glow.fill({ color: 0x44ff44, alpha: 0.15 });
        this.mainContainer.addChild(glow);
      }

      if (interactive) {
        sprite.on('pointertap', () => {
          this.onCardClick?.(card, 'hand');
        });
      }

      this.mainContainer.addChild(sprite);
    }
  }

  private renderOpponentHand(count: number, cx: number, y: number): void {
    const totalWidth = Math.min(count * 25, 400);
    const spacing = totalWidth / Math.max(count - 1, 1);
    const startX = cx - totalWidth / 2;

    for (let i = 0; i < count; i++) {
      const card = createCardGraphics({ suit: 'spades', rank: 'A', faceUp: false, id: `opp-${i}` }, false);
      card.x = startX + i * spacing;
      card.y = y;
      card.eventMode = 'none';
      card.cursor = 'default';
      this.mainContainer.addChild(card);
    }
  }

  playDealAnimation(playerCount: number, aiCount: number, onComplete: () => void): void {
    this.dealing = true;

    while (this.mainContainer.children.length > 1) {
      this.mainContainer.removeChildAt(1);
    }

    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const dealContainer = new Container();
    this.mainContainer.addChild(dealContainer);

    const centerX = w / 2 - CARD.width / 2;
    const centerY = h / 2 - CARD.height / 2;

    // Deck stack
    for (let i = 0; i < 3; i++) {
      const bg = createCardGraphics({ suit: 'spades', rank: 'A', faceUp: false, id: `deck-${i}` }, false);
      bg.x = centerX - i * 2;
      bg.y = centerY - i * 2;
      bg.eventMode = 'none';
      dealContainer.addChild(bg);
    }

    const totalCards = playerCount + aiCount;
    let dealt = 0;
    let completedAnims = 0;

    const animateCard = (sprite: Container, tx: number, ty: number, duration: number) => {
      const sx = sprite.x, sy = sprite.y;
      const start = performance.now();
      const tick = () => {
        const p = Math.min((performance.now() - start) / duration, 1);
        const e = easeOutCubic(p);
        sprite.x = sx + (tx - sx) * e;
        sprite.y = sy + (ty - sy) * e;
        if (p < 1 && !this.destroyed) {
          this.dealAnimRAFs.push(requestAnimationFrame(tick));
        } else {
          completedAnims++;
          if (completedAnims >= totalCards) {
            setTimeout(() => {
              dealContainer.destroy({ children: true });
              this.dealing = false;
              onComplete();
            }, 150);
          }
        }
      };
      this.dealAnimRAFs.push(requestAnimationFrame(tick));
    };

    // Player hand targets (bottom)
    const playerTargets = (idx: number) => {
      const tw = Math.min(playerCount * 35, 600);
      const sp = tw / Math.max(playerCount - 1, 1);
      return { x: w / 2 - tw / 2 + idx * sp, y: h - 20 - CARD.height };
    };

    // Opponent hand targets (top)
    const oppTargets = (idx: number) => {
      const tw = Math.min(aiCount * 25, 400);
      const sp = tw / Math.max(aiCount - 1, 1);
      return { x: w / 2 - tw / 2 + idx * sp, y: 40 };
    };

    let playerIdx = 0, oppIdx = 0;

    const dealNext = () => {
      if (dealt >= totalCards) return;
      const isPlayer = dealt % 2 === 0 && playerIdx < playerCount;
      dealt++;

      const sprite = createCardGraphics({ suit: 'spades', rank: 'A', faceUp: false, id: `deal-${dealt}` }, false);
      sprite.x = centerX;
      sprite.y = centerY;
      sprite.eventMode = 'none';
      dealContainer.addChild(sprite);

      if (isPlayer) {
        const t = playerTargets(playerIdx++);
        animateCard(sprite, t.x, t.y, 160);
      } else {
        const t = oppTargets(oppIdx++);
        animateCard(sprite, t.x, t.y, 160);
      }

      setTimeout(dealNext, 40);
    };

    setTimeout(dealNext, 300);
  }

  destroy(): void {
    this.destroyed = true;
    this.dealing = false;
    for (const id of this.pulseRAFs) cancelAnimationFrame(id);
    for (const id of this.dealAnimRAFs) cancelAnimationFrame(id);
    for (const id of this.cardAnimRAFs) cancelAnimationFrame(id);
    this.pulseRAFs = [];
    this.dealAnimRAFs = [];
    this.cardAnimRAFs = [];
    this.app.stage.removeChildren();
  }
}
