import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Card, Suit } from '../../engine/types';
import { createCardGraphics, getCardDimensions } from '../../renderer/CardSprite';
import { createFeltSurface } from '../../renderer/TableSurface';
import { HeartsOpponent, HeartsComment } from './HeartsCommentary';
import { HeartsState, cardPoints } from './rules';

const CARD = getCardDimensions();
const AVATAR_RADIUS = 20;

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Avatar positions: index 0=You (unused avatar), 1=West, 2=North, 3=East */
function getAvatarPositions(w: number, h: number): [number, number][] {
  return [
    [w / 2, h - 30],        // 0: You (bottom, no avatar drawn)
    [10, 110],               // 1: West — top-left corner
    [w / 2 - 110, 12],      // 2: North — top area, left of score box
    [w - 10, 110],           // 3: East — top-right corner
  ];
}

export class HeartsRenderer {
  private app: Application;
  private mainContainer: Container;
  private bubbleContainer: Container;
  private onCardClick?: (card: Card) => void;
  private opponents: HeartsOpponent[] = [];
  private pendingRAFs: number[] = [];
  private destroyed = false;

  constructor(app: Application) {
    this.app = app;
    this.mainContainer = new Container();
    this.bubbleContainer = new Container();

    const felt = createFeltSurface(app.screen.width, app.screen.height);
    this.mainContainer.addChild(felt);

    app.stage.addChild(this.mainContainer);
    app.stage.addChild(this.bubbleContainer);
  }

  setOpponents(opps: HeartsOpponent[]): void {
    this.opponents = opps;
  }

  setOnCardClick(cb: (card: Card) => void): void {
    this.onCardClick = cb;
  }

  private getNames(): string[] {
    if (this.opponents.length === 3) {
      return ['You', this.opponents[0].name, this.opponents[1].name, this.opponents[2].name];
    }
    return ['You', 'West', 'North', 'East'];
  }

  render(state: HeartsState, selectedCards: Set<string> = new Set()): void {
    // Clear everything except the felt background
    while (this.mainContainer.children.length > 1) {
      this.mainContainer.removeChildAt(1);
    }
    // Cancel any ongoing pulse animations from previous render
    for (const id of this.pendingRAFs) cancelAnimationFrame(id);
    this.pendingRAFs = [];

    const w = this.app.screen.width;
    const h = this.app.screen.height;

    // Player's hand (bottom)
    this.renderHand(state.hands[0], w / 2, h - 20, true, selectedCards);

    // AI hands (face down) — closer to edges since avatars are now HTML outside canvas
    this.renderAIHand(state.hands[1].length, 30, h / 2 + 20, 'left');
    this.renderAIHand(state.hands[2].length, w / 2, 20, 'top');
    this.renderAIHand(state.hands[3].length, w - 30, h / 2 + 20, 'right');

    // Trick in center
    this.renderTrick(state.currentTrick, w / 2, h / 2 - 10);

    // Collected point cards near each player
    this.renderCollectedPoints(state.tricks, state.scores);

    // Turn indicator glow during playing phase
    if (state.phase === 'playing') {
      this.renderTurnIndicator(state.currentPlayer);
    }

    // Round info (compact)
    const roundStyle = new TextStyle({ fontSize: 11, fill: '#ffffff88', fontFamily: 'Inter, sans-serif' });
    const roundText = new Text({ text: `Round ${state.roundNumber}`, style: roundStyle });
    roundText.anchor.set(1, 0);
    roundText.x = w - 10;
    roundText.y = 8;
    this.mainContainer.addChild(roundText);
  }

  showBubble(comment: HeartsComment): void {
    this.clearBubble();
    if (!this.opponents.length) return;

    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const positions = getAvatarPositions(w, h);
    const [ax, ay] = positions[comment.playerIndex];
    const opp = this.opponents[comment.playerIndex - 1];

    // Determine bubble direction based on player position
    // West (1): bubble to the right; North (2): bubble below-right; East (3): bubble to the left
    const isLeft = comment.playerIndex === 1;
    const isRight = comment.playerIndex === 3;

    // Measure text width roughly (10px per char at fontSize 11)
    const maxWidth = 140;
    const textContent = comment.message;

    // Create bubble
    const bubble = new Container();

    const padding = 8;
    const textStyle = new TextStyle({
      fontSize: 11,
      fill: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      wordWrap: true,
      wordWrapWidth: maxWidth - padding * 2,
    });
    const msgText = new Text({ text: textContent, style: textStyle });

    const bubbleW = Math.min(msgText.width + padding * 2, maxWidth);
    const bubbleH = msgText.height + padding * 2;

    // Position bubble relative to avatar
    let bx: number;
    const by = ay - bubbleH / 2;

    if (isRight) {
      bx = ax - AVATAR_RADIUS - bubbleW - 8;
    } else {
      bx = ax + AVATAR_RADIUS + 8;
    }

    // Clamp to canvas
    bx = Math.max(4, Math.min(bx, w - bubbleW - 4));

    // Background
    const bg = new Graphics();
    bg.roundRect(bx, by, bubbleW, bubbleH, 8).fill({ color: 0x000000, alpha: 0.7 });

    // Tail triangle pointing toward avatar
    const tailY = by + bubbleH / 2;
    if (isRight) {
      bg.moveTo(bx + bubbleW, tailY - 5)
        .lineTo(bx + bubbleW + 6, tailY)
        .lineTo(bx + bubbleW, tailY + 5)
        .fill({ color: 0x000000, alpha: 0.7 });
    } else {
      bg.moveTo(bx, tailY - 5)
        .lineTo(bx - 6, tailY)
        .lineTo(bx, tailY + 5)
        .fill({ color: 0x000000, alpha: 0.7 });
    }

    // Colored accent line on the avatar side
    const accentX = isRight ? bx + bubbleW - 2 : bx + 2;
    bg.roundRect(accentX - 1, by + 4, 2, bubbleH - 8, 1).fill(opp.color);

    bubble.addChild(bg);

    msgText.x = bx + padding;
    msgText.y = by + padding;
    bubble.addChild(msgText);

    this.bubbleContainer.addChild(bubble);
  }

  clearBubble(): void {
    this.bubbleContainer.removeChildren();
  }

  showFloatingPoints(playerIndex: number, points: number): void {
    if (points <= 0) return;

    const w = this.app.screen.width;
    const h = this.app.screen.height;

    // Positions near each player's card area
    const positions: [number, number][] = [
      [w / 2, h - CARD.height - 55],   // You (bottom)
      [90, h / 2],                       // West
      [w / 2, 70],                       // North
      [w - 90, h / 2],                   // East
    ];

    const [x, y] = positions[playerIndex];

    const label = points >= 13 ? `+${points}!` : `+${points}`;
    const color = points >= 13 ? '#ff4444' : '#ff8866';

    // Shadow text for readability
    const shadow = new Text({
      text: label,
      style: new TextStyle({ fontSize: 24, fill: '#000000', fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }),
    });
    shadow.anchor.set(0.5);
    shadow.x = x + 1;
    shadow.y = y + 1;
    shadow.alpha = 0.6;
    this.bubbleContainer.addChild(shadow);

    const text = new Text({
      text: label,
      style: new TextStyle({ fontSize: 24, fill: color, fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }),
    });
    text.anchor.set(0.5);
    text.x = x;
    text.y = y;
    this.bubbleContainer.addChild(text);

    const startY = y;
    const startTime = performance.now();
    const duration = 1400;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const offsetY = progress * 40;
      text.y = startY - offsetY;
      shadow.y = startY - offsetY + 1;
      const fade = 1 - progress * progress;
      text.alpha = fade;
      shadow.alpha = fade * 0.6;

      if (progress < 1 && !this.destroyed) {
        this.pendingRAFs.push(requestAnimationFrame(animate));
      } else {
        this.bubbleContainer.removeChild(text);
        this.bubbleContainer.removeChild(shadow);
        text.destroy();
        shadow.destroy();
      }
    };

    this.pendingRAFs.push(requestAnimationFrame(animate));
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
      [cx, cy + 50],
      [cx - 60, cy],
      [cx, cy - 50],
      [cx + 60, cy],
    ];

    for (let i = 0; i < 4; i++) {
      if (!trick[i]) continue;
      const sprite = createCardGraphics(trick[i]!, true);
      sprite.x = positions[i][0] - CARD.width / 2;
      sprite.y = positions[i][1] - CARD.height / 2;
      this.mainContainer.addChild(sprite);
    }
  }

  /** Animate a card sliding from a player's hand area to the trick center position */
  animateCardToTrick(playerIndex: number, card: Card, onComplete?: () => void): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    // Start positions (near each player's hand area)
    const startPositions: [number, number][] = [
      [w / 2, h - 60],      // 0: Bottom (You)
      [80, h / 2 + 20],     // 1: West
      [w / 2, 60],          // 2: North
      [w - 80, h / 2 + 20], // 3: East
    ];

    // Trick center positions (same as renderTrick)
    const cx = w / 2;
    const cy = h / 2 - 10;
    const trickPositions: [number, number][] = [
      [cx, cy + 50],
      [cx - 60, cy],
      [cx, cy - 50],
      [cx + 60, cy],
    ];

    const [sx, sy] = startPositions[playerIndex];
    const [tx, ty] = trickPositions[playerIndex];

    const sprite = createCardGraphics(card, true);
    sprite.x = sx - CARD.width / 2;
    sprite.y = sy - CARD.height / 2;
    sprite.alpha = 0.9;
    this.mainContainer.addChild(sprite);

    const startX = sprite.x;
    const startY = sprite.y;
    const targetX = tx - CARD.width / 2;
    const targetY = ty - CARD.height / 2;
    const startTime = performance.now();
    const duration = 300;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const e = easeOutCubic(progress);

      sprite.x = startX + (targetX - startX) * e;
      sprite.y = startY + (targetY - startY) * e;
      sprite.alpha = 0.9 + 0.1 * e;

      if (progress < 1 && !this.destroyed) {
        this.pendingRAFs.push(requestAnimationFrame(animate));
      } else {
        onComplete?.();
      }
    };

    this.pendingRAFs.push(requestAnimationFrame(animate));
  }

  /** Render a glow/indicator around the current player's area */
  renderTurnIndicator(currentPlayer: number): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    // Positions for the turn indicator near each player's area
    const positions: { x: number; y: number; w: number; h: number }[] = [
      { x: w / 2 - 160, y: h - CARD.height - 35, w: 320, h: CARD.height + 20 }, // Bottom
      { x: 5, y: h / 2 - 50, w: 55, h: 120 },                                     // West
      { x: w / 2 - 100, y: 5, w: 200, h: 50 },                                     // North
      { x: w - 60, y: h / 2 - 50, w: 55, h: 120 },                                 // East
    ];

    const pos = positions[currentPlayer];
    const indicator = new Graphics();

    // Pulsing glow border
    indicator.roundRect(pos.x, pos.y, pos.w, pos.h, 10);
    indicator.stroke({ width: 2, color: 0xfbbf24, alpha: 0.6 });

    // Subtle fill
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
      this.pendingRAFs.push(requestAnimationFrame(pulse));
    };
    this.pendingRAFs.push(requestAnimationFrame(pulse));
  }

  /** Render actual card sprites of collected point cards near each player */
  private renderCollectedPoints(tricks: Card[][], _scores: number[]): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    const SCALE = 0.35;
    const DISPLAY_GAP = 12; // px between card left edges at display size

    // Anchor positions for each player's point card pile
    const layouts: { x: number; y: number; fromRight?: boolean }[] = [
      { x: w / 2 + 185, y: h - 58 },                    // Bottom: right of hand
      { x: 8, y: h / 2 + 115 },                          // West: below hand
      { x: w / 2 + 125, y: 8 },                          // North: right of top cards
      { x: w - 8, y: h / 2 + 115, fromRight: true },     // East: below hand (right-aligned)
    ];

    for (let player = 0; player < 4; player++) {
      const pointCards = tricks[player].filter((c) => cardPoints(c) > 0);
      if (pointCards.length === 0) continue;

      // Sort: Q♠ first, then hearts
      pointCards.sort((a, b) => {
        if (a.suit === 'spades' && a.rank === 'Q') return -1;
        if (b.suit === 'spades' && b.rank === 'Q') return 1;
        return 0;
      });

      const layout = layouts[player];
      const pile = new Container();

      for (let i = 0; i < pointCards.length; i++) {
        const sprite = createCardGraphics(pointCards[i], true);
        sprite.scale.set(SCALE);
        sprite.x = i * DISPLAY_GAP;
        sprite.y = 0;
        pile.addChild(sprite);
      }

      // Position the pile
      if (layout.fromRight) {
        const totalW = (pointCards.length - 1) * DISPLAY_GAP + CARD.width * SCALE;
        pile.x = layout.x - totalW;
      } else {
        pile.x = layout.x;
      }
      pile.y = layout.y;
      this.mainContainer.addChild(pile);

      // Points label below the pile
      const totalPts = pointCards.reduce((sum, c) => sum + cardPoints(c), 0);
      const label = new Text({
        text: `${totalPts} pts`,
        style: new TextStyle({ fontSize: 9, fill: '#ffffff88', fontFamily: 'Inter, sans-serif' }),
      });
      if (layout.fromRight) {
        label.anchor.set(1, 0);
        label.x = layout.x;
      } else {
        label.x = layout.x;
      }
      label.y = pile.y + CARD.height * SCALE + 2;
      this.mainContainer.addChild(label);
    }
  }

  /** Show a large announcement overlay (e.g. trick winner, round over) */
  showAnnouncement(text: string, duration: number = 2000): void {
    this.clearAnnouncement();

    const w = this.app.screen.width;
    const cy = 150;

    const container = new Container();
    container.label = 'announcement';

    const textStyle = new TextStyle({
      fontSize: 22,
      fill: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 'bold',
    });
    const msg = new Text({ text, style: textStyle });
    msg.anchor.set(0.5);
    msg.x = w / 2;
    msg.y = cy;

    const padX = 24;
    const padY = 12;
    const bg = new Graphics();
    bg.roundRect(
      w / 2 - msg.width / 2 - padX,
      cy - msg.height / 2 - padY,
      msg.width + padX * 2,
      msg.height + padY * 2,
      10,
    ).fill({ color: 0x000000, alpha: 0.75 });
    bg.roundRect(
      w / 2 - msg.width / 2 - padX,
      cy - msg.height / 2 - padY,
      msg.width + padX * 2,
      msg.height + padY * 2,
      10,
    ).stroke({ width: 2, color: 0xfbbf24, alpha: 0.5 });

    container.addChild(bg);
    container.addChild(msg);
    container.alpha = 0;

    this.bubbleContainer.addChild(container);

    // Fade in
    const fadeInStart = performance.now();
    const fadeIn = () => {
      if (this.destroyed) return;
      const p = Math.min((performance.now() - fadeInStart) / 200, 1);
      container.alpha = easeOutCubic(p);
      if (p < 1) this.pendingRAFs.push(requestAnimationFrame(fadeIn));
    };
    this.pendingRAFs.push(requestAnimationFrame(fadeIn));

    // Fade out before end
    setTimeout(() => {
      if (this.destroyed) return;
      const fadeOutStart = performance.now();
      const fadeOut = () => {
        if (this.destroyed) return;
        const p = Math.min((performance.now() - fadeOutStart) / 300, 1);
        container.alpha = 1 - p;
        if (p < 1) {
          this.pendingRAFs.push(requestAnimationFrame(fadeOut));
        } else {
          this.bubbleContainer.removeChild(container);
          container.destroy({ children: true });
        }
      };
      this.pendingRAFs.push(requestAnimationFrame(fadeOut));
    }, Math.max(duration - 300, 200));
  }

  clearAnnouncement(): void {
    const toRemove: Container[] = [];
    for (const child of this.bubbleContainer.children) {
      if ((child as Container).label === 'announcement') {
        toRemove.push(child as Container);
      }
    }
    for (const c of toRemove) {
      this.bubbleContainer.removeChild(c);
      c.destroy({ children: true });
    }
  }

  playDealAnimation(handSizes: number[], onComplete: () => void): void {
    // Clear game elements but keep felt
    while (this.mainContainer.children.length > 1) {
      this.mainContainer.removeChildAt(1);
    }

    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const dealContainer = new Container();
    this.mainContainer.addChild(dealContainer);

    const centerX = w / 2 - CARD.width / 2;
    const centerY = h / 2 - CARD.height / 2;

    // Target positions for each player's cards
    const getTarget = (player: number, idx: number, total: number): { x: number; y: number; rot: number } => {
      if (player === 0) {
        const tw = Math.min(total * 30, 600);
        const sp = tw / Math.max(total - 1, 1);
        return { x: w / 2 - tw / 2 + idx * sp, y: h - 20 - CARD.height, rot: 0 };
      } else if (player === 1) {
        return { x: 30, y: h / 2 + 20 - (total * 10) / 2 + idx * 10, rot: Math.PI / 2 };
      } else if (player === 2) {
        return { x: w / 2 - (total * 15) / 2 + idx * 15, y: 20, rot: 0 };
      } else {
        return { x: w - 30, y: h / 2 + 20 - (total * 10) / 2 + idx * 10, rot: -Math.PI / 2 };
      }
    };

    // Draw a deck stack in the center
    for (let i = 0; i < 3; i++) {
      const bg = createCardGraphics({ suit: 'spades', rank: 'A', faceUp: false, id: `deck-${i}` }, false);
      bg.x = centerX - i * 2;
      bg.y = centerY - i * 2;
      bg.eventMode = 'none';
      dealContainer.addChild(bg);
    }

    const totalCards = handSizes.reduce((a, b) => a + b, 0);
    const counters = [0, 0, 0, 0];
    let dealt = 0;
    let completedAnims = 0;

    const animateCard = (sprite: Container, tx: number, ty: number, tRot: number, duration: number) => {
      const sx = sprite.x, sy = sprite.y, sr = sprite.rotation;
      const start = performance.now();
      const tick = () => {
        if (this.destroyed) return;
        const p = Math.min((performance.now() - start) / duration, 1);
        const e = easeOutCubic(p);
        sprite.x = sx + (tx - sx) * e;
        sprite.y = sy + (ty - sy) * e;
        sprite.rotation = sr + (tRot - sr) * e;
        if (p < 1) {
          this.pendingRAFs.push(requestAnimationFrame(tick));
        } else {
          completedAnims++;
          if (completedAnims >= totalCards) {
            setTimeout(() => {
              if (this.destroyed) return;
              dealContainer.destroy({ children: true });
              onComplete();
            }, 150);
          }
        }
      };
      this.pendingRAFs.push(requestAnimationFrame(tick));
    };

    const dealNext = () => {
      if (this.destroyed || dealt >= totalCards) return;
      const player = dealt % 4;
      if (counters[player] >= handSizes[player]) {
        dealt++;
        dealNext();
        return;
      }
      const idx = counters[player]++;
      dealt++;

      const sprite = createCardGraphics({ suit: 'spades', rank: 'A', faceUp: false, id: `deal-${dealt}` }, false);
      sprite.x = centerX;
      sprite.y = centerY;
      sprite.eventMode = 'none';
      dealContainer.addChild(sprite);

      const target = getTarget(player, idx, handSizes[player]);
      animateCard(sprite, target.x, target.y, target.rot, 180);

      setTimeout(() => { if (!this.destroyed) dealNext(); }, 35);
    };

    // Small delay then start dealing
    setTimeout(() => { if (!this.destroyed) dealNext(); }, 300);
  }

  destroy(): void {
    this.destroyed = true;
    for (const id of this.pendingRAFs) cancelAnimationFrame(id);
    this.pendingRAFs = [];
    this.app.stage.removeChildren();
  }
}
