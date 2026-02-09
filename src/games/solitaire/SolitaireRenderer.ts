import { Application, Container, Graphics, Text, TextStyle, FederatedPointerEvent } from 'pixi.js';
import { Card, cardDisplayName, suitColor, Suit } from '../../engine/types';
import { createCardGraphics, getCardDimensions } from '../../renderer/CardSprite';
import { createFeltSurface } from '../../renderer/TableSurface';
import { WinCelebration } from '../../renderer/effects/WinCelebration';
import { SolitaireGame } from './SolitaireGame';
import { SolitaireState } from './rules';

const CARD = getCardDimensions();
const STACK_OFFSET_FACE_DOWN = 4;
const STACK_OFFSET_FACE_UP = 22;
const FOUNDATION_X = 280;
const TABLEAU_Y = 170;
const MARGIN = 16;

// BUG FIX #5: Minimum distance in pixels before a pointerdown becomes a drag
const DRAG_THRESHOLD = 5;

export class SolitaireRenderer {
  private app: Application;
  private game: SolitaireGame;
  private mainContainer: Container;
  private dragContainer: Container;
  private celebration: WinCelebration | null = null;

  // Dragging state
  private dragging = false;
  private dragPending = false;           // BUG FIX #5: true between pointerdown and threshold
  private dragStartX = 0;               // BUG FIX #5: initial pointer position
  private dragStartY = 0;               // BUG FIX #5: initial pointer position
  private dragCards: Card[] = [];
  private dragSprites: Container[] = [];
  private dragFromCol = -1;
  private dragFromIndex = -1;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private dragSource: 'tableau' | 'waste' = 'tableau';
  private dragCardX = 0;                // BUG FIX #5: card's screen X for deferred sprite creation
  private dragCardY = 0;                // BUG FIX #5: card's screen Y for deferred sprite creation

  // BUG FIX #3/#4: Track whether a drag actually occurred to suppress tap
  private didDrag = false;

  // BUG FIX #6: Track IDs of cards being dragged so we can hide them in render
  private draggingCardIds: Set<string> = new Set();

  private onStateChange?: () => void;

  // BUG FIX #3/#4: Double-click detection
  private lastTapTime = 0;
  private lastTapCardId = '';
  private static readonly DOUBLE_TAP_MS = 400;

  constructor(app: Application, game: SolitaireGame) {
    this.app = app;
    this.game = game;
    this.mainContainer = new Container();
    this.dragContainer = new Container();
    this.app.stage.addChild(this.mainContainer);
    this.app.stage.addChild(this.dragContainer);

    // Background felt
    const felt = createFeltSurface(app.screen.width, app.screen.height);
    this.mainContainer.addChildAt(felt, 0);

    // Listen to pointer events on stage for drag
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointermove', this.onPointerMove.bind(this));
    this.app.stage.on('pointerup', this.onPointerUp.bind(this));
    this.app.stage.on('pointerupoutside', this.onPointerUp.bind(this));
  }

  setOnStateChange(cb: () => void): void {
    this.onStateChange = cb;
  }

  // BUG FIX #7: Reset drag state (called from handleNewGame)
  reset(): void {
    this.dragging = false;
    this.dragPending = false;
    this.didDrag = false;
    this.dragCards = [];
    this.dragSprites = [];
    this.dragFromCol = -1;
    this.dragFromIndex = -1;
    this.draggingCardIds.clear();
    this.dragContainer.removeChildren();
    this.celebration?.destroy();
    this.celebration = null;
  }

  render(state: SolitaireState): void {
    // Clear previous render (keep felt at index 0)
    while (this.mainContainer.children.length > 1) {
      this.mainContainer.removeChildAt(1);
    }

    this.renderStock(state);
    this.renderWaste(state);
    this.renderFoundations(state);
    this.renderTableau(state);
  }

  private renderStock(state: SolitaireState): void {
    const x = MARGIN;
    const y = MARGIN;

    if (state.stock.length > 0) {
      // Render face-down card as stock
      const stock = createCardGraphics({ suit: 'spades', rank: 'A', faceUp: false, id: 'stock' }, false);
      stock.x = x;
      stock.y = y;
      stock.on('pointertap', () => {
        this.game.drawCard();
        this.onStateChange?.();
      });
      this.mainContainer.addChild(stock);

      // Count indicator
      const countStyle = new TextStyle({ fontSize: 11, fill: '#ffffff', fontFamily: 'Inter, sans-serif' });
      const countText = new Text({ text: `${state.stock.length}`, style: countStyle });
      countText.x = x + CARD.width / 2;
      countText.y = y + CARD.height + 4;
      countText.anchor.set(0.5, 0);
      this.mainContainer.addChild(countText);
    } else {
      // Empty stock - recycle button
      const recycleBtn = new Graphics();
      recycleBtn.roundRect(x, y, CARD.width, CARD.height, 6);
      recycleBtn.stroke({ color: 0x44aa66, width: 2, alpha: 0.5 });

      // Recycle icon (circle arrow)
      const cx = x + CARD.width / 2;
      const cy = y + CARD.height / 2;
      recycleBtn.arc(cx, cy, 15, 0, Math.PI * 1.5);
      recycleBtn.stroke({ color: 0x44aa66, width: 2, alpha: 0.6 });

      recycleBtn.eventMode = 'static';
      recycleBtn.cursor = 'pointer';
      recycleBtn.on('pointertap', () => {
        this.game.drawCard();
        this.onStateChange?.();
      });
      this.mainContainer.addChild(recycleBtn);
    }
  }

  private renderWaste(state: SolitaireState): void {
    const x = MARGIN + CARD.width + 16;
    const y = MARGIN;

    if (state.waste.length === 0) {
      // Empty placeholder
      const placeholder = new Graphics();
      placeholder.roundRect(x, y, CARD.width, CARD.height, 6);
      placeholder.stroke({ color: 0x2d8a4e, width: 1, alpha: 0.3 });
      this.mainContainer.addChild(placeholder);
      return;
    }

    // Show top card of waste
    const topCard = state.waste[state.waste.length - 1];

    // BUG FIX #6: Hide the card if it is currently being dragged
    if (this.draggingCardIds.has(topCard.id)) {
      return;
    }

    const cardSprite = createCardGraphics(topCard, true);
    cardSprite.x = x;
    cardSprite.y = y;

    // BUG FIX #3/#5: Use pointerdown to begin a pending drag; actual drag starts
    // after moving past DRAG_THRESHOLD. pointertap handles double-click to foundation.
    cardSprite.on('pointerdown', (e: FederatedPointerEvent) => {
      this.beginDragPending(e, 'waste', topCard, [topCard], -1, -1, x, y);
    });

    // BUG FIX #3: Only send to foundation on genuine double-tap, not every single tap.
    cardSprite.on('pointertap', () => {
      if (this.didDrag) return; // suppress tap after drag
      if (this.isDoubleTap(topCard.id)) {
        const result = this.game.moveWasteToFoundation();
        if (result >= 0) {
          this.onStateChange?.();
        }
      }
    });

    this.mainContainer.addChild(cardSprite);
  }

  private renderFoundations(state: SolitaireState): void {
    for (let f = 0; f < 4; f++) {
      const x = FOUNDATION_X + f * (CARD.width + 12);
      const y = MARGIN;

      // Foundation slot
      const slot = new Graphics();
      slot.roundRect(x, y, CARD.width, CARD.height, 6);
      slot.stroke({ color: 0xd4af37, width: 1.5, alpha: 0.3 });
      slot.fill({ color: 0xd4af37, alpha: 0.05 });

      // Suit label
      const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
      const symbols = ['\u2665', '\u2666', '\u2663', '\u2660'];
      const labelStyle = new TextStyle({
        fontSize: 24,
        fill: f < 2 ? '#cc000044' : '#1a1a1a44',
        fontFamily: 'Georgia, serif',
      });
      const label = new Text({ text: symbols[f], style: labelStyle });
      label.anchor.set(0.5);
      label.x = x + CARD.width / 2;
      label.y = y + CARD.height / 2;
      this.mainContainer.addChild(slot);
      this.mainContainer.addChild(label);

      // Top card on foundation
      if (state.foundations[f].length > 0) {
        const topCard = state.foundations[f][state.foundations[f].length - 1];
        const cardSprite = createCardGraphics(topCard, true);
        cardSprite.x = x;
        cardSprite.y = y;
        this.mainContainer.addChild(cardSprite);
      }
    }
  }

  private renderTableau(state: SolitaireState): void {
    for (let col = 0; col < 7; col++) {
      const x = MARGIN + col * (CARD.width + 12);
      const column = state.tableau[col];

      if (column.length === 0) {
        // Empty column placeholder
        const slot = new Graphics();
        slot.roundRect(x, TABLEAU_Y, CARD.width, CARD.height, 6);
        slot.stroke({ color: 0x2d8a4e, width: 1, alpha: 0.2 });
        slot.fill({ color: 0x2d8a4e, alpha: 0.05 });
        slot.eventMode = 'static';
        slot.cursor = 'pointer';
        // Accept kings on empty columns
        this.mainContainer.addChild(slot);
        continue;
      }

      for (let ci = 0; ci < column.length; ci++) {
        const card = column[ci];

        // BUG FIX #6: Hide cards that are currently being dragged
        if (this.draggingCardIds.has(card.id)) {
          continue;
        }

        const offset = ci === 0 ? 0 : column.slice(0, ci).reduce((sum, c) =>
          sum + (c.faceUp ? STACK_OFFSET_FACE_UP : STACK_OFFSET_FACE_DOWN), 0);
        const y = TABLEAU_Y + offset;

        const cardSprite = createCardGraphics(card, card.faceUp);
        cardSprite.x = x;
        cardSprite.y = y;

        if (card.faceUp) {
          // Capture col/ci in closure for this card
          const capturedCol = col;
          const capturedCi = ci;
          const capturedCard = card;
          const cardsInStack = column.slice(ci);

          // BUG FIX #4/#5: Use pointerdown to begin pending drag
          cardSprite.on('pointerdown', (e: FederatedPointerEvent) => {
            this.beginDragPending(e, 'tableau', capturedCard, cardsInStack, capturedCol, capturedCi, x, y);
          });

          // BUG FIX #4: Only send to foundation on genuine double-tap for top card
          cardSprite.on('pointertap', () => {
            if (this.didDrag) return; // suppress tap after drag
            if (capturedCi === column.length - 1 && this.isDoubleTap(capturedCard.id)) {
              const result = this.game.moveTableauToFoundation(capturedCol);
              if (result >= 0) {
                this.onStateChange?.();
              }
            }
          });
        }

        this.mainContainer.addChild(cardSprite);
      }
    }
  }

  // BUG FIX #3/#4: Double-tap detection helper
  private isDoubleTap(cardId: string): boolean {
    const now = Date.now();
    if (cardId === this.lastTapCardId && now - this.lastTapTime < SolitaireRenderer.DOUBLE_TAP_MS) {
      // Reset so a third tap doesn't also count
      this.lastTapTime = 0;
      this.lastTapCardId = '';
      return true;
    }
    this.lastTapTime = now;
    this.lastTapCardId = cardId;
    return false;
  }

  // BUG FIX #5: Begin a "pending" drag. Only promote to a real drag after the pointer
  // moves past DRAG_THRESHOLD pixels, preventing flicker and tap/drag conflicts.
  private beginDragPending(
    e: FederatedPointerEvent,
    source: 'tableau' | 'waste',
    topCard: Card,
    cards: Card[],
    col: number,
    cardIndex: number,
    cardX: number,
    cardY: number,
  ): void {
    this.dragPending = true;
    this.didDrag = false;
    this.dragSource = source;
    this.dragFromCol = col;
    this.dragFromIndex = cardIndex;
    this.dragCards = cards;
    this.dragStartX = e.globalX;
    this.dragStartY = e.globalY;
    this.dragOffsetX = e.globalX - cardX;
    this.dragOffsetY = e.globalY - cardY;
    this.dragCardX = cardX;
    this.dragCardY = cardY;
  }

  // BUG FIX #5: Promote a pending drag to a real drag (creates drag sprites)
  private promoteDrag(e: FederatedPointerEvent): void {
    this.dragPending = false;
    this.dragging = true;
    this.didDrag = true;

    // BUG FIX #6: Mark cards as being dragged and re-render to hide originals
    this.draggingCardIds.clear();
    for (const card of this.dragCards) {
      this.draggingCardIds.add(card.id);
    }
    // Re-render main container to hide the cards being dragged
    const state = this.game.getState();
    this.renderMainOnly(state);

    // Create drag sprites
    this.dragSprites = [];
    let yOffset = 0;
    for (const card of this.dragCards) {
      const sprite = createCardGraphics(card, true);
      sprite.x = e.globalX - this.dragOffsetX;
      sprite.y = e.globalY - this.dragOffsetY + yOffset;
      sprite.alpha = 0.9;
      this.dragContainer.addChild(sprite);
      this.dragSprites.push(sprite);
      yOffset += STACK_OFFSET_FACE_UP;
    }
  }

  // Helper: re-render main container without triggering onStateChange
  private renderMainOnly(state: SolitaireState): void {
    while (this.mainContainer.children.length > 1) {
      this.mainContainer.removeChildAt(1);
    }
    this.renderStock(state);
    this.renderWaste(state);
    this.renderFoundations(state);
    this.renderTableau(state);
  }

  private onPointerMove(e: FederatedPointerEvent): void {
    // BUG FIX #5: Check if pending drag should be promoted
    if (this.dragPending) {
      const dx = e.globalX - this.dragStartX;
      const dy = e.globalY - this.dragStartY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        this.promoteDrag(e);
      }
      return;
    }

    if (!this.dragging) return;

    let yOffset = 0;
    for (const sprite of this.dragSprites) {
      sprite.x = e.globalX - this.dragOffsetX;
      sprite.y = e.globalY - this.dragOffsetY + yOffset;
      yOffset += STACK_OFFSET_FACE_UP;
    }
  }

  private onPointerUp(e: FederatedPointerEvent): void {
    // BUG FIX #5: If drag was still pending (pointer never moved past threshold),
    // just cancel -- let pointertap handle it as a click.
    if (this.dragPending) {
      this.dragPending = false;
      return;
    }

    if (!this.dragging) return;
    this.dragging = false;
    this.dragContainer.removeChildren();

    // BUG FIX #6: Clear the set of dragged card IDs so they reappear on re-render
    this.draggingCardIds.clear();

    const dropX = e.globalX;
    const dropY = e.globalY;

    // Check foundation drop
    for (let f = 0; f < 4; f++) {
      const fx = FOUNDATION_X + f * (CARD.width + 12);
      const fy = MARGIN;
      if (
        this.dragCards.length === 1 &&
        dropX >= fx && dropX <= fx + CARD.width &&
        dropY >= fy && dropY <= fy + CARD.height
      ) {
        let success = false;
        if (this.dragSource === 'tableau') {
          success = this.game.moveTableauToFoundation(this.dragFromCol) >= 0;
        } else {
          success = this.game.moveWasteToFoundation() >= 0;
        }
        if (success) {
          this.onStateChange?.();
          return;
        }
      }
    }

    // Check tableau drop
    for (let col = 0; col < 7; col++) {
      const cx = MARGIN + col * (CARD.width + 12);
      const state = this.game.getState();
      const column = state.tableau[col];
      const lastOffset = column.length === 0 ? 0 :
        column.slice(0, column.length).reduce((sum, c) =>
          sum + (c.faceUp ? STACK_OFFSET_FACE_UP : STACK_OFFSET_FACE_DOWN), 0);
      const cy = TABLEAU_Y;
      const ch = TABLEAU_Y + lastOffset + CARD.height;

      if (dropX >= cx && dropX <= cx + CARD.width && dropY >= cy && dropY <= ch + 40) {
        let success = false;
        if (this.dragSource === 'tableau') {
          if (col !== this.dragFromCol) {
            success = this.game.moveTableauToTableau(this.dragFromCol, this.dragFromIndex, col);
          }
        } else {
          success = this.game.moveWasteToTableau(col);
        }
        if (success) {
          this.onStateChange?.();
          return;
        }
      }
    }

    // Drop cancelled - re-render to restore card positions
    this.onStateChange?.();
  }

  showWin(): void {
    if (!this.celebration) {
      this.celebration = new WinCelebration(this.app.stage);
    }
    this.celebration.start(this.app.screen.width / 2, this.app.screen.height / 2);
  }

  destroy(): void {
    this.celebration?.destroy();
    this.app.stage.removeChildren();
  }
}
