import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { BackgammonState, BackgammonMove } from './rules';
import { WinCelebration } from '../../renderer/effects/WinCelebration';

// Board layout constants
const BOARD_W = 860;
const BOARD_H = 500;
const BOARD_X = 20;
const BOARD_Y = 30;
const POINT_W = 60;
const POINT_H = 200;
const BAR_W = 40;
const CHECKER_R = 22;
const BORDER = 12;

// Colors
const BG_COLOR = 0x2a1810;
const BOARD_BG = 0x1a5c3a;
const BORDER_COLOR = 0x4a2916;
const POINT_LIGHT = 0xd4a574;
const POINT_DARK = 0x5c3a1a;
const WHITE_COLOR = 0xf5e6d0;
const WHITE_EDGE = 0xc9b89d;
const BLACK_COLOR = 0x2a2a2a;
const BLACK_EDGE = 0x1a1a1a;
const HIGHLIGHT = 0x44ff44;
const SELECTED_HIGHLIGHT = 0xffff00;
const HIT_HIGHLIGHT = 0xff4444;

// Bearing off tray
const TRAY_W = 50;
const TRAY_H = BOARD_H - BORDER * 2;

export class BackgammonRenderer {
  private app: Application;
  private mainContainer: Container;
  private boardContainer: Container;
  private checkersContainer: Container;
  private highlightsContainer: Container;
  private diceContainer: Container;
  private uiContainer: Container;
  private celebration: WinCelebration | null = null;

  private onPointClick?: (pointIndex: number) => void;
  private onBarClick?: () => void;
  private onRollClick?: () => void;

  private selectedFrom: number | 'bar' | null = null;

  constructor(app: Application) {
    this.app = app;
    this.mainContainer = new Container();
    this.boardContainer = new Container();
    this.checkersContainer = new Container();
    this.highlightsContainer = new Container();
    this.diceContainer = new Container();
    this.uiContainer = new Container();

    this.mainContainer.addChild(this.boardContainer);
    this.mainContainer.addChild(this.highlightsContainer);
    this.mainContainer.addChild(this.checkersContainer);
    this.mainContainer.addChild(this.diceContainer);
    this.mainContainer.addChild(this.uiContainer);

    app.stage.addChild(this.mainContainer);
    this.drawBoard();
  }

  setOnPointClick(cb: (pointIndex: number) => void): void {
    this.onPointClick = cb;
  }

  setOnBarClick(cb: () => void): void {
    this.onBarClick = cb;
  }

  setOnRollClick(cb: () => void): void {
    this.onRollClick = cb;
  }

  private drawBoard(): void {
    const g = new Graphics();

    // Background
    g.rect(0, 0, this.app.screen.width, this.app.screen.height);
    g.fill({ color: BG_COLOR });

    // Board frame
    g.rect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
    g.fill({ color: BORDER_COLOR });

    // Inner board surface
    g.rect(BOARD_X + BORDER, BOARD_Y + BORDER, BOARD_W - BORDER * 2, BOARD_H - BORDER * 2);
    g.fill({ color: BOARD_BG });

    // Central bar
    const barX = BOARD_X + BORDER + 6 * POINT_W;
    g.rect(barX, BOARD_Y, BAR_W, BOARD_H);
    g.fill({ color: BORDER_COLOR });

    this.boardContainer.addChild(g);

    // Draw triangular points
    this.drawPoints();

    // Bearing off tray
    const trayX = BOARD_X + BOARD_W + 8;
    const trayG = new Graphics();
    trayG.rect(trayX, BOARD_Y, TRAY_W, BOARD_H);
    trayG.fill({ color: BORDER_COLOR });
    trayG.rect(trayX + 4, BOARD_Y + 4, TRAY_W - 8, BOARD_H / 2 - 6);
    trayG.fill({ color: 0x3a2a1a });
    trayG.rect(trayX + 4, BOARD_Y + BOARD_H / 2 + 2, TRAY_W - 8, BOARD_H / 2 - 6);
    trayG.fill({ color: 0x3a2a1a });
    this.boardContainer.addChild(trayG);

    // Tray label
    const offStyle = new TextStyle({ fontSize: 10, fill: 0xffffff, fontFamily: 'sans-serif' });
    const offLabel = new Text({ text: 'OFF', style: offStyle });
    offLabel.x = trayX + TRAY_W / 2 - offLabel.width / 2;
    offLabel.y = BOARD_Y + BOARD_H / 2 - 7;
    this.boardContainer.addChild(offLabel);
  }

  private drawPoints(): void {
    const g = new Graphics();

    for (let i = 0; i < 24; i++) {
      const { x, y, isTop } = this.getPointPosition(i);
      const isEven = i % 2 === 0;
      const color = isEven ? POINT_LIGHT : POINT_DARK;

      // Draw triangle
      if (isTop) {
        g.moveTo(x, y);
        g.lineTo(x + POINT_W, y);
        g.lineTo(x + POINT_W / 2, y + POINT_H);
        g.closePath();
      } else {
        g.moveTo(x, y);
        g.lineTo(x + POINT_W, y);
        g.lineTo(x + POINT_W / 2, y - POINT_H);
        g.closePath();
      }
      g.fill({ color });
    }

    this.boardContainer.addChild(g);

    // Point number labels
    const labelStyle = new TextStyle({ fontSize: 9, fill: 0xffffff, fontFamily: 'sans-serif', alpha: 0.4 } as any);
    for (let i = 0; i < 24; i++) {
      const { x, isTop } = this.getPointPosition(i);
      const label = new Text({ text: `${i + 1}`, style: labelStyle });
      label.alpha = 0.4;
      label.x = x + POINT_W / 2 - label.width / 2;
      label.y = isTop ? BOARD_Y + 1 : BOARD_Y + BOARD_H - 12;
      this.boardContainer.addChild(label);
    }
  }

  /** Get the x,y position and orientation of a point (triangle) */
  private getPointPosition(index: number): { x: number; y: number; isTop: boolean } {
    // Board layout:
    // Top row (left to right): points 13-18 | BAR | 19-24
    // Bottom row (right to left): points 12-7 | BAR | 6-1
    const barX = BOARD_X + BORDER + 6 * POINT_W;

    if (index >= 12) {
      // Top row: points 13-24 (indices 12-23)
      const topIdx = index - 12; // 0-11
      let x: number;
      if (topIdx < 6) {
        x = BOARD_X + BORDER + topIdx * POINT_W;
      } else {
        x = barX + BAR_W + (topIdx - 6) * POINT_W;
      }
      return { x, y: BOARD_Y + BORDER, isTop: true };
    } else {
      // Bottom row: points 12-1 (indices 11-0)
      const bottomIdx = 11 - index; // 0-11
      let x: number;
      if (bottomIdx < 6) {
        x = BOARD_X + BORDER + bottomIdx * POINT_W;
      } else {
        x = barX + BAR_W + (bottomIdx - 6) * POINT_W;
      }
      return { x, y: BOARD_Y + BOARD_H - BORDER, isTop: false };
    }
  }

  /** Get the pixel position for a checker on a specific point */
  private getCheckerPosition(pointIndex: number, stackIndex: number): { cx: number; cy: number } {
    const { x, isTop } = this.getPointPosition(pointIndex);
    const cx = x + POINT_W / 2;
    const maxStack = 5; // Stack up to 5 vertically, then overlap
    const spacing = stackIndex < maxStack ? CHECKER_R * 2 : CHECKER_R;
    const effectiveIdx = stackIndex < maxStack ? stackIndex : maxStack + (stackIndex - maxStack);

    let cy: number;
    if (isTop) {
      cy = BOARD_Y + BORDER + CHECKER_R + effectiveIdx * spacing;
    } else {
      cy = BOARD_Y + BOARD_H - BORDER - CHECKER_R - effectiveIdx * spacing;
    }
    return { cx, cy };
  }

  private getBarCheckerPosition(color: 'white' | 'black', stackIndex: number): { cx: number; cy: number } {
    const barX = BOARD_X + BORDER + 6 * POINT_W + BAR_W / 2;
    if (color === 'white') {
      // White bar: bottom half
      return { cx: barX, cy: BOARD_Y + BOARD_H / 2 + 30 + stackIndex * (CHECKER_R * 2) };
    } else {
      // Black bar: top half
      return { cx: barX, cy: BOARD_Y + BOARD_H / 2 - 30 - stackIndex * (CHECKER_R * 2) };
    }
  }

  private drawChecker(cx: number, cy: number, color: 'white' | 'black', count?: number): Graphics {
    const g = new Graphics();
    const mainColor = color === 'white' ? WHITE_COLOR : BLACK_COLOR;
    const edgeColor = color === 'white' ? WHITE_EDGE : BLACK_EDGE;
    const textColor = color === 'white' ? 0x333333 : 0xdddddd;

    // Shadow
    g.circle(cx + 2, cy + 3, CHECKER_R);
    g.fill({ color: 0x000000, alpha: 0.3 });

    // Outer ring
    g.circle(cx, cy, CHECKER_R);
    g.fill({ color: edgeColor });

    // Inner
    g.circle(cx, cy, CHECKER_R - 3);
    g.fill({ color: mainColor });

    // Center detail
    g.circle(cx, cy, CHECKER_R - 8);
    g.stroke({ color: edgeColor, width: 1.5, alpha: 0.5 });

    // Stack count indicator
    if (count && count > 1) {
      const style = new TextStyle({ fontSize: 12, fill: textColor, fontWeight: 'bold', fontFamily: 'sans-serif' });
      const text = new Text({ text: `${count}`, style });
      text.x = cx - text.width / 2;
      text.y = cy - text.height / 2;
      g.addChild(text);
    }

    return g;
  }

  render(state: BackgammonState, validMoves: BackgammonMove[] = [], selectedFrom?: number | 'bar' | null): void {
    this.checkersContainer.removeChildren();
    this.highlightsContainer.removeChildren();
    this.diceContainer.removeChildren();

    this.selectedFrom = selectedFrom ?? null;

    // Draw click areas for points
    this.drawClickAreas(state);

    // Highlight valid targets
    this.drawMoveHighlights(validMoves, selectedFrom ?? null);

    // Draw checkers on points
    for (let i = 0; i < 24; i++) {
      const pt = state.points[i];
      if (pt.count === 0 || !pt.color) continue;

      if (pt.count <= 5) {
        for (let j = 0; j < pt.count; j++) {
          const { cx, cy } = this.getCheckerPosition(i, j);
          const checker = this.drawChecker(cx, cy, pt.color);
          this.checkersContainer.addChild(checker);
        }
      } else {
        // Show stacked with count
        for (let j = 0; j < 5; j++) {
          const { cx, cy } = this.getCheckerPosition(i, j);
          const checker = this.drawChecker(cx, cy, pt.color, j === 4 ? pt.count : undefined);
          this.checkersContainer.addChild(checker);
        }
      }
    }

    // Draw checkers on bar
    for (let c = 0; c < 2; c++) {
      const color: 'white' | 'black' = c === 0 ? 'white' : 'black';
      const count = state.bar[c];
      for (let j = 0; j < Math.min(count, 4); j++) {
        const { cx, cy } = this.getBarCheckerPosition(color, j);
        const checker = this.drawChecker(cx, cy, color, j === Math.min(count, 4) - 1 && count > 1 ? count : undefined);
        this.checkersContainer.addChild(checker);
      }
    }

    // Draw borne off checkers
    this.drawBorneOff(state);

    // Draw dice
    if (state.dice) {
      this.drawDice(state.dice, state.remainingMoves);
    }

    // Draw roll button if in rolling phase
    if (state.phase === 'rolling') {
      this.drawRollButton(state.currentPlayer);
    }
  }

  private drawClickAreas(state: BackgammonState): void {
    // Point click areas
    for (let i = 0; i < 24; i++) {
      const { x, isTop } = this.getPointPosition(i);
      const area = new Graphics();
      area.rect(x, isTop ? BOARD_Y + BORDER : BOARD_Y + BOARD_H / 2, POINT_W, BOARD_H / 2 - BORDER);
      area.fill({ color: 0x000000, alpha: 0.001 });
      area.eventMode = 'static';
      area.cursor = 'pointer';
      const idx = i;
      area.on('pointerdown', () => this.onPointClick?.(idx));
      this.checkersContainer.addChild(area);
    }

    // Bar click area
    const barX = BOARD_X + BORDER + 6 * POINT_W;
    const barArea = new Graphics();
    barArea.rect(barX, BOARD_Y, BAR_W, BOARD_H);
    barArea.fill({ color: 0x000000, alpha: 0.001 });
    barArea.eventMode = 'static';
    barArea.cursor = 'pointer';
    barArea.on('pointerdown', () => this.onBarClick?.());
    this.checkersContainer.addChild(barArea);
  }

  private drawMoveHighlights(validMoves: BackgammonMove[], selectedFrom: number | 'bar' | null): void {
    // Highlight selected source
    if (selectedFrom !== null && selectedFrom !== 'bar') {
      const { x, isTop } = this.getPointPosition(selectedFrom);
      const h = new Graphics();
      h.rect(x, isTop ? BOARD_Y + BORDER : BOARD_Y + BOARD_H / 2, POINT_W, BOARD_H / 2 - BORDER);
      h.fill({ color: SELECTED_HIGHLIGHT, alpha: 0.15 });
      this.highlightsContainer.addChild(h);
    }

    // Highlight valid targets
    const targetMoves = selectedFrom !== null
      ? validMoves.filter(m => m.from === selectedFrom)
      : validMoves;

    const targetSet = new Set<string>();
    for (const m of targetMoves) {
      if (m.to === 'off') {
        targetSet.add('off');
      } else {
        targetSet.add(`${m.to}-${m.hitOpponent}`);
      }
    }

    for (const key of targetSet) {
      if (key === 'off') {
        // Highlight bearing off tray
        const trayX = BOARD_X + BOARD_W + 8;
        const h = new Graphics();
        h.rect(trayX, BOARD_Y, TRAY_W, BOARD_H);
        h.fill({ color: HIGHLIGHT, alpha: 0.2 });
        this.highlightsContainer.addChild(h);
      } else {
        const [ptStr, hitStr] = key.split('-');
        const pt = parseInt(ptStr);
        const isHit = hitStr === 'true';
        const { x, isTop } = this.getPointPosition(pt);
        const h = new Graphics();
        h.rect(x, isTop ? BOARD_Y + BORDER : BOARD_Y + BOARD_H / 2, POINT_W, BOARD_H / 2 - BORDER);
        h.fill({ color: isHit ? HIT_HIGHLIGHT : HIGHLIGHT, alpha: 0.2 });
        this.highlightsContainer.addChild(h);
      }
    }

    // Highlight sources if no piece selected
    if (selectedFrom === null) {
      const sources = new Set<string>();
      for (const m of validMoves) {
        sources.add(String(m.from));
      }
      for (const src of sources) {
        if (src === 'bar') {
          const barX = BOARD_X + BORDER + 6 * POINT_W;
          const h = new Graphics();
          h.rect(barX, BOARD_Y, BAR_W, BOARD_H);
          h.fill({ color: SELECTED_HIGHLIGHT, alpha: 0.1 });
          this.highlightsContainer.addChild(h);
        } else {
          const pt = parseInt(src);
          const { x, isTop } = this.getPointPosition(pt);
          const h = new Graphics();
          h.rect(x, isTop ? BOARD_Y + BORDER : BOARD_Y + BOARD_H / 2, POINT_W, BOARD_H / 2 - BORDER);
          h.fill({ color: SELECTED_HIGHLIGHT, alpha: 0.1 });
          this.highlightsContainer.addChild(h);
        }
      }
    }
  }

  private drawBorneOff(state: BackgammonState): void {
    const trayX = BOARD_X + BOARD_W + 8;

    // White borne off (bottom tray)
    for (let i = 0; i < state.borneOff[0]; i++) {
      const g = new Graphics();
      const y = BOARD_Y + BOARD_H - 8 - i * 6;
      g.roundRect(trayX + 8, y - 14, TRAY_W - 16, 5, 2);
      g.fill({ color: WHITE_COLOR });
      this.checkersContainer.addChild(g);
    }

    // Black borne off (top tray)
    for (let i = 0; i < state.borneOff[1]; i++) {
      const g = new Graphics();
      const y = BOARD_Y + 8 + i * 6;
      g.roundRect(trayX + 8, y, TRAY_W - 16, 5, 2);
      g.fill({ color: BLACK_COLOR });
      this.checkersContainer.addChild(g);
    }
  }

  private drawDice(dice: [number, number], remaining: number[]): void {
    const centerX = this.app.screen.width / 2;
    const centerY = BOARD_Y + BOARD_H / 2;

    for (let d = 0; d < 2; d++) {
      const x = centerX + (d === 0 ? -40 : 10);
      const y = centerY - 20;
      const value = dice[d];

      // Check if this die value is used
      const usedCount = dice.filter(v => v === dice[d]).length - remaining.filter(v => v === dice[d]).length;
      const thisUsed = d < usedCount || !remaining.includes(dice[d]);
      // More precise: for non-doubles, track by index
      const isUsed = dice[0] === dice[1]
        ? remaining.length < (4 - d) // For doubles
        : !remaining.includes(dice[d]);

      const alpha = isUsed ? 0.3 : 1;

      const g = new Graphics();
      // Die background
      g.roundRect(x, y, 30, 30, 5);
      g.fill({ color: 0xfefefe, alpha });
      g.roundRect(x, y, 30, 30, 5);
      g.stroke({ color: 0x999999, width: 1, alpha });

      this.drawDieFace(g, x + 15, y + 15, value, alpha);
      this.diceContainer.addChild(g);
    }
  }

  private drawDieFace(g: Graphics, cx: number, cy: number, value: number, alpha: number): void {
    const dotR = 3;
    const off = 8;
    const dots: [number, number][] = [];

    switch (value) {
      case 1: dots.push([0, 0]); break;
      case 2: dots.push([-off, -off], [off, off]); break;
      case 3: dots.push([-off, -off], [0, 0], [off, off]); break;
      case 4: dots.push([-off, -off], [off, -off], [-off, off], [off, off]); break;
      case 5: dots.push([-off, -off], [off, -off], [0, 0], [-off, off], [off, off]); break;
      case 6: dots.push([-off, -off], [off, -off], [-off, 0], [off, 0], [-off, off], [off, off]); break;
    }

    for (const [dx, dy] of dots) {
      g.circle(cx + dx, cy + dy, dotR);
      g.fill({ color: 0x222222, alpha });
    }
  }

  private drawRollButton(currentPlayer: 'white' | 'black'): void {
    const centerX = this.app.screen.width / 2;
    const centerY = BOARD_Y + BOARD_H / 2;

    const btn = new Graphics();
    btn.roundRect(centerX - 50, centerY - 18, 100, 36, 8);
    btn.fill({ color: 0xd4af37, alpha: 0.9 });
    btn.roundRect(centerX - 50, centerY - 18, 100, 36, 8);
    btn.stroke({ color: 0xb8962e, width: 2 });

    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', () => this.onRollClick?.());

    const style = new TextStyle({ fontSize: 14, fill: 0x1a1a1a, fontWeight: 'bold', fontFamily: 'sans-serif' });
    const text = new Text({ text: 'Roll Dice', style });
    text.x = centerX - text.width / 2;
    text.y = centerY - text.height / 2;

    this.diceContainer.addChild(btn);
    this.diceContainer.addChild(text);
  }

  showWin(): void {
    if (!this.celebration) {
      this.celebration = new WinCelebration(this.app.stage);
    }
    this.celebration.start(this.app.screen.width / 2, this.app.screen.height / 2);
  }

  stopCelebration(): void {
    if (this.celebration) {
      this.celebration.destroy();
      this.celebration = null;
    }
  }

  destroy(): void {
    this.celebration?.destroy();
    this.mainContainer.destroy({ children: true });
  }
}
