import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Card } from '../../engine/types';
import { createCardGraphics, getCardDimensions } from '../../renderer/CardSprite';
import { createFeltSurface } from '../../renderer/TableSurface';
import { RummyState, findMelds } from './rules';

const CARD = getCardDimensions();

export class RummyRenderer {
  private app: Application;
  private mainContainer: Container;
  private onCardClick?: (card: Card, source: 'hand' | 'discard' | 'draw') => void;

  constructor(app: Application) {
    this.app = app;
    this.mainContainer = new Container();

    const felt = createFeltSurface(app.screen.width, app.screen.height);
    this.mainContainer.addChild(felt);

    app.stage.addChild(this.mainContainer);
  }

  setOnCardClick(cb: (card: Card, source: 'hand' | 'discard' | 'draw') => void): void {
    this.onCardClick = cb;
  }

  render(state: RummyState, highlightedCards: Set<string> = new Set()): void {
    while (this.mainContainer.children.length > 1) {
      this.mainContainer.removeChildAt(1);
    }

    const w = this.app.screen.width;
    const h = this.app.screen.height;

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

    // AI hand (top, face down)
    this.renderAIHand(state.hands[1].length, w / 2, 40);

    // Labels
    const labelStyle = new TextStyle({ fontSize: 12, fill: '#ffffff88', fontFamily: 'Inter, sans-serif' });
    const youLabel = new Text({ text: 'Your Hand', style: labelStyle });
    youLabel.anchor.set(0.5);
    youLabel.x = w / 2;
    youLabel.y = h - CARD.height - 40;
    this.mainContainer.addChild(youLabel);

    const aiLabel = new Text({ text: 'AI Hand', style: labelStyle });
    aiLabel.anchor.set(0.5);
    aiLabel.x = w / 2;
    aiLabel.y = 15;
    this.mainContainer.addChild(aiLabel);

    // Scores
    const scoreStyle = new TextStyle({ fontSize: 13, fill: '#ffffffcc', fontFamily: 'Inter, sans-serif' });
    const scores = new Text({
      text: `You: ${state.scores[0]} | AI: ${state.scores[1]}`,
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
      phaseText = 'Select a card to discard for knock';
    } else if (state.currentPlayer === 0) {
      phaseText = state.phase === 'draw' ? 'Draw a card' : 'Discard a card';
    } else {
      phaseText = 'AI is thinking...';
    }
    const phase = new Text({ text: phaseText, style: phaseStyle });
    phase.anchor.set(0.5);
    phase.x = w / 2;
    phase.y = h / 2 + CARD.height / 2 + 30;
    this.mainContainer.addChild(phase);
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

  private renderAIHand(count: number, cx: number, y: number): void {
    const totalWidth = Math.min(count * 25, 400);
    const spacing = totalWidth / Math.max(count - 1, 1);
    const startX = cx - totalWidth / 2;

    for (let i = 0; i < count; i++) {
      const card = createCardGraphics({ suit: 'spades', rank: 'A', faceUp: false, id: `ai-${i}` }, false);
      card.x = startX + i * spacing;
      card.y = y;
      card.eventMode = 'none';
      card.cursor = 'default';
      this.mainContainer.addChild(card);
    }
  }

  playDealAnimation(playerCount: number, aiCount: number, onComplete: () => void): void {
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
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animateCard = (sprite: Container, tx: number, ty: number, duration: number) => {
      const sx = sprite.x, sy = sprite.y;
      const start = performance.now();
      const tick = () => {
        const p = Math.min((performance.now() - start) / duration, 1);
        const e = easeOutCubic(p);
        sprite.x = sx + (tx - sx) * e;
        sprite.y = sy + (ty - sy) * e;
        if (p < 1) requestAnimationFrame(tick);
        else {
          completedAnims++;
          if (completedAnims >= totalCards) {
            setTimeout(() => {
              dealContainer.destroy({ children: true });
              onComplete();
            }, 150);
          }
        }
      };
      requestAnimationFrame(tick);
    };

    // Player hand targets (bottom)
    const playerTargets = (idx: number) => {
      const tw = Math.min(playerCount * 35, 600);
      const sp = tw / Math.max(playerCount - 1, 1);
      return { x: w / 2 - tw / 2 + idx * sp, y: h - 20 - CARD.height };
    };

    // AI hand targets (top)
    const aiTargets = (idx: number) => {
      const tw = Math.min(aiCount * 25, 400);
      const sp = tw / Math.max(aiCount - 1, 1);
      return { x: w / 2 - tw / 2 + idx * sp, y: 40 };
    };

    let playerIdx = 0, aiIdx = 0;

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
        const t = aiTargets(aiIdx++);
        animateCard(sprite, t.x, t.y, 160);
      }

      setTimeout(dealNext, 40);
    };

    setTimeout(dealNext, 300);
  }

  destroy(): void {
    this.app.stage.removeChildren();
  }
}
