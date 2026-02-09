import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Card, cardDisplayName, suitColor } from '../../engine/types';
import { createCardGraphics, getCardDimensions } from '../../renderer/CardSprite';
import { createFeltSurface } from '../../renderer/TableSurface';
import { HeartsState } from './rules';

const CARD = getCardDimensions();

export class HeartsRenderer {
  private app: Application;
  private mainContainer: Container;
  private onCardClick?: (card: Card) => void;

  constructor(app: Application) {
    this.app = app;
    this.mainContainer = new Container();

    const felt = createFeltSurface(app.screen.width, app.screen.height);
    this.mainContainer.addChild(felt);

    app.stage.addChild(this.mainContainer);
  }

  setOnCardClick(cb: (card: Card) => void): void {
    this.onCardClick = cb;
  }

  render(state: HeartsState, selectedCards: Set<string> = new Set()): void {
    while (this.mainContainer.children.length > 1) {
      this.mainContainer.removeChildAt(1);
    }

    const w = this.app.screen.width;
    const h = this.app.screen.height;

    // Render player's hand (bottom)
    this.renderHand(state.hands[0], w / 2, h - 20, true, selectedCards);

    // Render AI hands (face down)
    this.renderAIHand(state.hands[1].length, 40, h / 2, 'left');   // Left
    this.renderAIHand(state.hands[2].length, w / 2, 30, 'top');   // Top
    this.renderAIHand(state.hands[3].length, w - 40, h / 2, 'right'); // Right

    // Render current trick (center)
    this.renderTrick(state.currentTrick, w / 2, h / 2 - 20);

    // Render scores
    this.renderScores(state, w, h);

    // Player labels
    const labelStyle = new TextStyle({ fontSize: 12, fill: '#ffffff88', fontFamily: 'Inter, sans-serif' });
    const names = ['You', 'West', 'North', 'East'];
    const positions = [
      [w / 2, h - CARD.height - 40],
      [15, h / 2 + 60],
      [w / 2, 10],
      [w - 50, h / 2 + 60],
    ];
    for (let i = 0; i < 4; i++) {
      const label = new Text({ text: names[i], style: labelStyle });
      label.anchor.set(0.5, 0);
      label.x = positions[i][0];
      label.y = positions[i][1];
      this.mainContainer.addChild(label);
    }
  }

  private renderHand(cards: Card[], cx: number, bottomY: number, interactive: boolean, selected: Set<string>): void {
    const totalWidth = Math.min(cards.length * 30, 600);
    const spacing = totalWidth / Math.max(cards.length - 1, 1);
    const startX = cx - totalWidth / 2;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const isSelected = selected.has(card.id);
      const sprite = createCardGraphics(card, true);
      sprite.x = startX + i * spacing;
      sprite.y = bottomY - CARD.height - (isSelected ? 20 : 0);

      if (interactive) {
        sprite.on('pointertap', () => {
          this.onCardClick?.(card);
        });
      }

      this.mainContainer.addChild(sprite);
    }
  }

  private renderAIHand(count: number, cx: number, cy: number, position: 'left' | 'top' | 'right'): void {
    for (let i = 0; i < Math.min(count, 13); i++) {
      const card = createCardGraphics({ suit: 'spades', rank: 'A', faceUp: false, id: `ai-${position}-${i}` }, false);

      if (position === 'top') {
        card.x = cx - (count * 15) / 2 + i * 15;
        card.y = cy;
      } else if (position === 'left') {
        card.x = cx;
        card.y = cy - (count * 10) / 2 + i * 10;
        card.rotation = Math.PI / 2;
      } else {
        card.x = cx;
        card.y = cy - (count * 10) / 2 + i * 10;
        card.rotation = -Math.PI / 2;
      }

      this.mainContainer.addChild(card);
    }
  }

  private renderTrick(trick: (Card | null)[], cx: number, cy: number): void {
    const positions = [
      [cx, cy + 50],     // Player (bottom)
      [cx - 60, cy],     // West (left)
      [cx, cy - 50],     // North (top)
      [cx + 60, cy],     // East (right)
    ];

    for (let i = 0; i < 4; i++) {
      if (!trick[i]) continue;
      const sprite = createCardGraphics(trick[i]!, true);
      sprite.x = positions[i][0] - CARD.width / 2;
      sprite.y = positions[i][1] - CARD.height / 2;
      this.mainContainer.addChild(sprite);
    }
  }

  private renderScores(state: HeartsState, w: number, h: number): void {
    const style = new TextStyle({
      fontSize: 11,
      fill: '#ffffffaa',
      fontFamily: 'Inter, sans-serif',
    });

    const names = ['You', 'West', 'North', 'East'];
    for (let i = 0; i < 4; i++) {
      const text = new Text({
        text: `${names[i]}: ${state.totalScores[i]} (+${state.scores[i]})`,
        style,
      });
      text.x = w - 130;
      text.y = 10 + i * 18;
      this.mainContainer.addChild(text);
    }

    // Round info
    const roundText = new Text({
      text: `Round ${state.roundNumber}`,
      style: new TextStyle({ fontSize: 11, fill: '#ffffff66', fontFamily: 'Inter, sans-serif' }),
    });
    roundText.x = w - 130;
    roundText.y = 85;
    this.mainContainer.addChild(roundText);
  }

  destroy(): void {
    this.app.stage.removeChildren();
  }
}
