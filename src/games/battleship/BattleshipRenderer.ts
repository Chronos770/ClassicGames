import { Application, Container, Graphics, Text, TextStyle, FederatedPointerEvent } from 'pixi.js';
import { createOceanSurface } from '../../renderer/TableSurface';
import { BattleshipState, CellState, Ship, canPlaceShip, WeaponDef } from './rules';
import { BattleshipEffects } from './BattleshipEffects';
import { drawShipSprite } from './BattleshipShips';

// ─── Color palette ──────────────────────────────────────────────────────────
const WATER_BASE = 0x0d4a6e;
const WATER_LIGHT = 0x1a6b8a;
const WATER_DARK = 0x083a55;
const HIT_COLOR = 0xee3333;
const HIT_BG = 0x661111;
const MISS_COLOR = 0x4488aa;
const MISS_BG = 0x0c3d55;
const GRID_LINE = 0x1a6b8a;
const HOVER_COLOR = 0x44ddff;
const VALID_COLOR = 0x44ff44;
const INVALID_COLOR = 0xff4444;
const WEAPON_COLOR = 0xff8800;

export class BattleshipRenderer {
  private app: Application;

  // Layer hierarchy (bottom to top)
  private mainContainer: Container;       // grids, ships, dock, labels
  private overlayContainer: Container;    // hover highlights, placement/weapon previews
  private eventContainer: Container;      // transparent hit areas for grids
  private dragLayer: Container;           // ghost ship + snap preview during drag
  private effectsContainer: Container;    // attack animations

  private effects: BattleshipEffects;

  // Persistent overlay graphics (cleared independently from render())
  private hoverGraphics: Graphics;
  private previewGraphics: Graphics;

  // Callbacks
  private onCellClick?: (row: number, col: number, board: 'player' | 'ai') => void;
  private onCellHover?: (row: number, col: number, board: 'player' | 'ai') => void;
  private onCellHoverOut?: () => void;
  onShipPlace?: (name: string, row: number, col: number, horizontal: boolean) => void;

  // Drag state
  private _isDragging = false;
  private dragGhost: Container | null = null;
  private dragPreview: Graphics | null = null;
  private dragShipName = '';
  private dragShipSize = 0;
  private dragHorizontal = true;

  // Layout (recalculated per render) — side by side
  private cellSize = 30;
  private gridSize = 10;
  private aiGridX = 0;
  private playerGridX = 0;
  private gridY = 0;
  private gridWidth = 0;

  // Current state ref for drag validation
  private currentState: BattleshipState | null = null;

  constructor(app: Application) {
    this.app = app;

    this.mainContainer = new Container();
    this.overlayContainer = new Container();
    this.eventContainer = new Container();
    this.dragLayer = new Container();
    this.effectsContainer = new Container();

    // Add ocean background to main (index 0, never cleared)
    const bg = createOceanSurface(app.screen.width, app.screen.height);
    this.mainContainer.addChild(bg);

    app.stage.addChild(this.mainContainer);
    app.stage.addChild(this.overlayContainer);
    app.stage.addChild(this.eventContainer);
    app.stage.addChild(this.dragLayer);
    app.stage.addChild(this.effectsContainer);

    this.effects = new BattleshipEffects(this.effectsContainer);

    // Persistent overlay graphics
    this.hoverGraphics = new Graphics();
    this.previewGraphics = new Graphics();
    this.overlayContainer.addChild(this.previewGraphics);
    this.overlayContainer.addChild(this.hoverGraphics);

    // Stage-level events for drag
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointermove', this.onPointerMove.bind(this));
    app.stage.on('pointerup', this.onPointerUp.bind(this));
    app.stage.on('pointerupoutside', this.onPointerUp.bind(this));
  }

  setOnCellClick(cb: (row: number, col: number, board: 'player' | 'ai') => void): void { this.onCellClick = cb; }
  setOnCellHover(cb: (row: number, col: number, board: 'player' | 'ai') => void): void { this.onCellHover = cb; }
  setOnCellHoverOut(cb: () => void): void { this.onCellHoverOut = cb; }
  get isDragging(): boolean { return this._isDragging; }

  private getGridX(board: 'player' | 'ai'): number {
    return board === 'ai' ? this.aiGridX : this.playerGridX;
  }

  // ─── Preview methods (don't trigger full re-render) ─────────────────────

  showPlacementPreview(row: number, col: number, size: number, horizontal: boolean, valid: boolean): void {
    this.previewGraphics.clear();
    const color = valid ? VALID_COLOR : INVALID_COLOR;
    for (let i = 0; i < size; i++) {
      const r = horizontal ? row : row + i;
      const c = horizontal ? col + i : col;
      if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize) {
        const cx = this.playerGridX + c * this.cellSize;
        const cy = this.gridY + r * this.cellSize;
        this.previewGraphics.rect(cx + 1, cy + 1, this.cellSize - 2, this.cellSize - 2);
        this.previewGraphics.fill({ color, alpha: 0.25 });
        this.previewGraphics.rect(cx + 1, cy + 1, this.cellSize - 2, this.cellSize - 2);
        this.previewGraphics.stroke({ color, width: 2, alpha: 0.5 });
      }
    }
  }

  showWeaponPreview(row: number, col: number, weapon: WeaponDef): void {
    this.previewGraphics.clear();
    for (const { dr, dc } of weapon.pattern) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize) {
        const cx = this.aiGridX + c * this.cellSize;
        const cy = this.gridY + r * this.cellSize;
        this.previewGraphics.rect(cx + 1, cy + 1, this.cellSize - 2, this.cellSize - 2);
        this.previewGraphics.fill({ color: WEAPON_COLOR, alpha: 0.2 });
        this.previewGraphics.rect(cx + 1, cy + 1, this.cellSize - 2, this.cellSize - 2);
        this.previewGraphics.stroke({ color: WEAPON_COLOR, width: 1.5, alpha: 0.5 });
      }
    }
  }

  clearPreview(): void {
    this.previewGraphics.clear();
  }

  private showCellHover(row: number, col: number, board: 'player' | 'ai'): void {
    const gridX = this.getGridX(board);
    const cx = gridX + col * this.cellSize;
    const cy = this.gridY + row * this.cellSize;

    this.hoverGraphics.clear();
    this.hoverGraphics.rect(cx + 1, cy + 1, this.cellSize - 2, this.cellSize - 2);
    this.hoverGraphics.fill({ color: HOVER_COLOR, alpha: 0.15 });
    this.hoverGraphics.rect(cx + 1, cy + 1, this.cellSize - 2, this.cellSize - 2);
    this.hoverGraphics.stroke({ color: HOVER_COLOR, width: 1.5, alpha: 0.4 });

    this.onCellHover?.(row, col, board);
  }

  private clearCellHover(): void {
    this.hoverGraphics.clear();
    this.onCellHoverOut?.();
  }

  // ─── Drag methods ──────────────────────────────────────────────────────

  rotateDrag(): void {
    if (!this._isDragging) return;
    this.dragHorizontal = !this.dragHorizontal;
    if (this.dragGhost) {
      const oldX = this.dragGhost.x;
      const oldY = this.dragGhost.y;
      this.dragLayer.removeChild(this.dragGhost);
      this.dragGhost = drawShipSprite(this.dragShipName, this.dragShipSize, this.cellSize, this.dragHorizontal);
      this.dragGhost.alpha = 0.7;
      this.dragGhost.x = oldX;
      this.dragGhost.y = oldY;
      this.dragLayer.addChild(this.dragGhost);
    }
  }

  cancelDrag(): void {
    this._isDragging = false;
    if (this.dragGhost) {
      this.dragLayer.removeChild(this.dragGhost);
      this.dragGhost = null;
    }
    this.clearDragPreview();
  }

  private startDrag(name: string, size: number, gx: number, gy: number): void {
    this._isDragging = true;
    this.dragShipName = name;
    this.dragShipSize = size;
    // Sync orientation with game state
    this.dragHorizontal = (this.currentState?.placementOrientation ?? 'horizontal') === 'horizontal';

    this.dragGhost = drawShipSprite(name, size, this.cellSize, this.dragHorizontal);
    this.dragGhost.alpha = 0.7;
    this.dragGhost.x = gx - this.cellSize / 2;
    this.dragGhost.y = gy - this.cellSize / 2;
    this.dragLayer.addChild(this.dragGhost);
  }

  private onPointerMove(e: FederatedPointerEvent): void {
    if (!this._isDragging || !this.dragGhost) return;

    const gx = e.global.x;
    const gy = e.global.y;

    const col = Math.floor((gx - this.playerGridX) / this.cellSize);
    const row = Math.floor((gy - this.gridY) / this.cellSize);

    if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
      // Snap to grid
      this.dragGhost.x = this.playerGridX + col * this.cellSize;
      this.dragGhost.y = this.gridY + row * this.cellSize;

      const valid = this.currentState
        ? canPlaceShip(this.currentState.playerBoard, row, col, this.dragShipSize, this.dragHorizontal)
        : false;
      this.drawDragPreview(row, col, valid);
    } else {
      // Follow cursor freely
      this.dragGhost.x = gx - this.cellSize / 2;
      this.dragGhost.y = gy - this.cellSize / 2;
      this.clearDragPreview();
    }
  }

  private onPointerUp(e: FederatedPointerEvent): void {
    if (!this._isDragging) return;

    const gx = e.global.x;
    const gy = e.global.y;
    const col = Math.floor((gx - this.playerGridX) / this.cellSize);
    const row = Math.floor((gy - this.gridY) / this.cellSize);

    if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
      const valid = this.currentState
        ? canPlaceShip(this.currentState.playerBoard, row, col, this.dragShipSize, this.dragHorizontal)
        : false;
      if (valid) {
        this.onShipPlace?.(this.dragShipName, row, col, this.dragHorizontal);
      }
    }

    this.cancelDrag();
  }

  private drawDragPreview(row: number, col: number, valid: boolean): void {
    this.clearDragPreview();
    const g = new Graphics();
    const color = valid ? VALID_COLOR : INVALID_COLOR;

    for (let i = 0; i < this.dragShipSize; i++) {
      const r = this.dragHorizontal ? row : row + i;
      const c = this.dragHorizontal ? col + i : col;
      if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize) {
        g.rect(this.playerGridX + c * this.cellSize + 1, this.gridY + r * this.cellSize + 1, this.cellSize - 2, this.cellSize - 2);
        g.fill({ color, alpha: 0.2 });
        g.rect(this.playerGridX + c * this.cellSize + 1, this.gridY + r * this.cellSize + 1, this.cellSize - 2, this.cellSize - 2);
        g.stroke({ color, width: 2, alpha: 0.5 });
      }
    }

    this.dragPreview = g;
    this.dragLayer.addChildAt(g, 0);
  }

  private clearDragPreview(): void {
    if (this.dragPreview) {
      this.dragLayer.removeChild(this.dragPreview);
      this.dragPreview = null;
    }
  }

  // ─── Main render ──────────────────────────────────────────────────────

  render(state: BattleshipState): void {
    this.currentState = state;

    // Calculate side-by-side layout
    this.gridSize = state.gridSize;
    this.cellSize = state.gridSize <= 10 ? 30 : 26;
    this.gridWidth = this.gridSize * this.cellSize;

    const w = this.app.screen.width;
    const labelMargin = 24;
    const gap = 40;
    const totalGridW = labelMargin + this.gridWidth + gap + labelMargin + this.gridWidth;
    const leftStart = (w - totalGridW) / 2;

    this.aiGridX = leftStart + labelMargin;
    this.playerGridX = this.aiGridX + this.gridWidth + gap + labelMargin;
    this.gridY = 50;

    // Clear main container (keep background at index 0)
    while (this.mainContainer.children.length > 1) {
      this.mainContainer.removeChildAt(1);
    }

    // Clear overlays and event layer
    this.hoverGraphics.clear();
    this.previewGraphics.clear();
    this.eventContainer.removeChildren();

    // ── Section Headers ──
    const headerStyle = new TextStyle({
      fontSize: 13,
      fill: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 'bold',
      letterSpacing: 1,
    });

    const aiHeader = new Text({ text: 'ENEMY WATERS', style: headerStyle });
    aiHeader.anchor.set(0.5, 1);
    aiHeader.x = this.aiGridX + this.gridWidth / 2;
    aiHeader.y = this.gridY - 20;
    this.mainContainer.addChild(aiHeader);

    const playerHeader = new Text({ text: 'YOUR FLEET', style: headerStyle });
    playerHeader.anchor.set(0.5, 1);
    playerHeader.x = this.playerGridX + this.gridWidth / 2;
    playerHeader.y = this.gridY - 20;
    this.mainContainer.addChild(playerHeader);

    // Grid frames
    this.drawGridFrame(this.aiGridX, this.gridY, this.gridWidth);
    this.drawGridFrame(this.playerGridX, this.gridY, this.gridWidth);

    // Draw grids
    this.drawGrid(state.aiBoard.grid, this.aiGridX, this.gridY, false, state.aiBoard.ships);
    this.drawGrid(state.playerBoard.grid, this.playerGridX, this.gridY, true, state.playerBoard.ships);

    // Ship sprites
    this.drawShips(state.playerBoard.ships, this.playerGridX, this.gridY, true);
    this.drawShips(state.aiBoard.ships.filter(s => s.sunk), this.aiGridX, this.gridY, false);

    // Labels
    this.drawLabels(this.aiGridX, this.gridY);
    this.drawLabels(this.playerGridX, this.gridY);

    // Ship dock during placement (centered below both grids)
    if (state.phase === 'placement' && state.playerShipsToPlace.length > 0) {
      this.drawShipDock(state.playerShipsToPlace);
    }

    // Phase info
    if (state.phase === 'placement') {
      const infoY = this.gridY + this.gridWidth + 70;
      if (state.playerShipsToPlace.length > 0) {
        const orient = state.placementOrientation === 'horizontal' ? 'H' : 'V';
        const orientLabel = state.placementOrientation === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL';

        // Orientation badge (to the right of the player grid)
        const badgeX = this.playerGridX + this.gridWidth + 8;
        const badgeY = this.gridY + this.gridWidth - 30;
        if (badgeX + 20 < w) {
          const badgeBg = new Graphics();
          badgeBg.roundRect(badgeX, badgeY, 22, 22, 4);
          badgeBg.fill({ color: 0xd4af37, alpha: 0.25 });
          badgeBg.roundRect(badgeX, badgeY, 22, 22, 4);
          badgeBg.stroke({ color: 0xd4af37, width: 1, alpha: 0.5 });
          this.mainContainer.addChild(badgeBg);

          const badgeText = new Text({
            text: orient,
            style: new TextStyle({ fontSize: 13, fill: '#d4af37', fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }),
          });
          badgeText.anchor.set(0.5);
          badgeText.x = badgeX + 11;
          badgeText.y = badgeY + 11;
          this.mainContainer.addChild(badgeText);
        }

        const infoText = `Placing: ${orientLabel} \u2022 R to rotate \u2022 Drag or click to place`;
        const info = new Text({
          text: infoText,
          style: new TextStyle({
            fontSize: 11,
            fill: '#d4af37',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '500',
          }),
        });
        info.anchor.set(0.5);
        info.x = w / 2;
        info.y = infoY;
        this.mainContainer.addChild(info);
      } else {
        const info = new Text({
          text: 'All ships placed! Fire at will!',
          style: new TextStyle({
            fontSize: 11,
            fill: '#d4af37',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '500',
          }),
        });
        info.anchor.set(0.5);
        info.x = w / 2;
        info.y = infoY;
        this.mainContainer.addChild(info);
      }
    }

    // Set up event overlays for grids
    this.setupEventOverlays(state);
  }

  // ─── Event overlays (transparent hit areas) ────────────────────────────

  private setupEventOverlays(state: BattleshipState): void {
    // AI grid overlay (clickable during playing phase)
    if (state.phase === 'playing') {
      const aiOverlay = new Graphics();
      aiOverlay.rect(this.aiGridX, this.gridY, this.gridWidth, this.gridWidth);
      aiOverlay.fill({ color: 0xffffff, alpha: 0.001 });
      aiOverlay.eventMode = 'static';
      aiOverlay.cursor = 'crosshair';

      aiOverlay.on('pointermove', (e: FederatedPointerEvent) => {
        const col = Math.floor((e.global.x - this.aiGridX) / this.cellSize);
        const row = Math.floor((e.global.y - this.gridY) / this.cellSize);
        if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
          this.showCellHover(row, col, 'ai');
        } else {
          this.clearCellHover();
        }
      });

      aiOverlay.on('pointerout', () => this.clearCellHover());

      aiOverlay.on('pointertap', (e: FederatedPointerEvent) => {
        const col = Math.floor((e.global.x - this.aiGridX) / this.cellSize);
        const row = Math.floor((e.global.y - this.gridY) / this.cellSize);
        if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
          this.onCellClick?.(row, col, 'ai');
        }
      });

      this.eventContainer.addChild(aiOverlay);
    }

    // Player grid overlay (clickable during placement)
    if (state.phase === 'placement') {
      const playerOverlay = new Graphics();
      playerOverlay.rect(this.playerGridX, this.gridY, this.gridWidth, this.gridWidth);
      playerOverlay.fill({ color: 0xffffff, alpha: 0.001 });
      playerOverlay.eventMode = 'static';
      playerOverlay.cursor = 'pointer';

      playerOverlay.on('pointermove', (e: FederatedPointerEvent) => {
        const col = Math.floor((e.global.x - this.playerGridX) / this.cellSize);
        const row = Math.floor((e.global.y - this.gridY) / this.cellSize);
        if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
          this.showCellHover(row, col, 'player');
        } else {
          this.clearCellHover();
        }
      });

      playerOverlay.on('pointerout', () => this.clearCellHover());

      playerOverlay.on('pointertap', (e: FederatedPointerEvent) => {
        const col = Math.floor((e.global.x - this.playerGridX) / this.cellSize);
        const row = Math.floor((e.global.y - this.gridY) / this.cellSize);
        if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
          this.onCellClick?.(row, col, 'player');
        }
      });

      this.eventContainer.addChild(playerOverlay);
    }
  }

  // ─── Ship dock (centered below both grids) ─────────────────────────────

  private drawShipDock(shipsToPlace: { name: string; size: number }[]): void {
    const DOCK_CELL = this.gridSize <= 10 ? 20 : 16;
    const dockY = this.gridY + this.gridWidth + 10;

    let totalWidth = 0;
    for (const ship of shipsToPlace) {
      totalWidth += ship.size * DOCK_CELL + 12;
    }
    totalWidth -= 12;
    const startX = this.app.screen.width / 2 - totalWidth / 2;

    // Dock background
    const dockBg = new Graphics();
    dockBg.roundRect(startX - 12, dockY - 6, totalWidth + 24, DOCK_CELL + 28, 6);
    dockBg.fill({ color: 0x0a3d5c, alpha: 0.6 });
    dockBg.roundRect(startX - 12, dockY - 6, totalWidth + 24, DOCK_CELL + 28, 6);
    dockBg.stroke({ color: 0x1a6b8a, width: 1, alpha: 0.4 });
    this.mainContainer.addChild(dockBg);

    let offsetX = startX;
    for (const ship of shipsToPlace) {
      const thisX = offsetX;

      // Ship sprite (small)
      const sprite = drawShipSprite(ship.name, ship.size, DOCK_CELL, true);
      sprite.x = thisX;
      sprite.y = dockY + 2;
      this.mainContainer.addChild(sprite);

      // Hit area for drag (add to event container so it's above the grid overlay)
      const hitArea = new Graphics();
      hitArea.rect(thisX - 2, dockY - 2, ship.size * DOCK_CELL + 4, DOCK_CELL + 20);
      hitArea.fill({ color: 0xffffff, alpha: 0.001 });
      hitArea.eventMode = 'static';
      hitArea.cursor = 'grab';

      const shipName = ship.name;
      const shipSize = ship.size;
      hitArea.on('pointerdown', (e: FederatedPointerEvent) => {
        this.startDrag(shipName, shipSize, e.global.x, e.global.y);
      });

      this.eventContainer.addChild(hitArea);

      // Name label
      const label = new Text({
        text: ship.name,
        style: new TextStyle({ fontSize: 8, fill: '#88bbcc', fontFamily: 'Inter, sans-serif' }),
      });
      label.anchor.set(0.5, 0);
      label.x = thisX + (ship.size * DOCK_CELL) / 2;
      label.y = dockY + DOCK_CELL + 4;
      this.mainContainer.addChild(label);

      offsetX += ship.size * DOCK_CELL + 12;
    }
  }

  // ─── Grid rendering ───────────────────────────────────────────────────

  private drawGridFrame(x: number, y: number, size: number): void {
    const frame = new Graphics();
    frame.roundRect(x - 4, y - 4, size + 8, size + 8, 3);
    frame.fill({ color: 0x1a6b8a, alpha: 0.15 });
    frame.roundRect(x - 2, y - 2, size + 4, size + 4, 2);
    frame.stroke({ color: 0x1a6b8a, width: 1.5, alpha: 0.4 });
    this.mainContainer.addChild(frame);
  }

  private drawGrid(
    grid: CellState[][],
    x: number,
    y: number,
    showShips: boolean,
    ships: Ship[]
  ): void {
    const seed = (r: number, c: number, i: number) => {
      const n = Math.sin(r * 127.1 + c * 311.7 + i * 74.7) * 43758.5453;
      return n - Math.floor(n);
    };

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cell = grid[row][col];
        const cx = x + col * this.cellSize;
        const cy = y + row * this.cellSize;

        const g = new Graphics();

        // Cell background with water variation
        if (cell === 'hit') {
          g.rect(cx, cy, this.cellSize, this.cellSize);
          g.fill({ color: HIT_BG, alpha: 0.8 });
          g.rect(cx + 1, cy + 1, this.cellSize - 2, this.cellSize - 2);
          g.stroke({ color: HIT_COLOR, width: 1, alpha: 0.4 });
        } else if (cell === 'miss') {
          g.rect(cx, cy, this.cellSize, this.cellSize);
          g.fill({ color: MISS_BG, alpha: 0.5 });
        } else {
          const waterAlpha = 0.25 + seed(row, col, 0) * 0.12;
          const waterColor = seed(row, col, 1) > 0.5 ? WATER_BASE : WATER_DARK;
          g.rect(cx, cy, this.cellSize, this.cellSize);
          g.fill({ color: waterColor, alpha: waterAlpha });

          if (seed(row, col, 2) > 0.7) {
            const wy = cy + this.cellSize * (0.3 + seed(row, col, 3) * 0.4);
            g.moveTo(cx + 4, wy);
            g.quadraticCurveTo(cx + this.cellSize / 2, wy - 2, cx + this.cellSize - 4, wy);
            g.stroke({ color: WATER_LIGHT, width: 0.8, alpha: 0.15 });
          }
        }

        // Grid lines
        g.rect(cx, cy, this.cellSize, this.cellSize);
        g.stroke({ color: GRID_LINE, width: 0.5, alpha: 0.35 });

        // Hit/miss markers
        if (cell === 'hit') {
          const inset = Math.round(this.cellSize * 0.2);
          g.moveTo(cx + inset, cy + inset);
          g.lineTo(cx + this.cellSize - inset, cy + this.cellSize - inset);
          g.moveTo(cx + this.cellSize - inset, cy + inset);
          g.lineTo(cx + inset, cy + this.cellSize - inset);
          g.stroke({ color: 0xff8800, width: 4, alpha: 0.3 });
          g.moveTo(cx + inset, cy + inset);
          g.lineTo(cx + this.cellSize - inset, cy + this.cellSize - inset);
          g.moveTo(cx + this.cellSize - inset, cy + inset);
          g.lineTo(cx + inset, cy + this.cellSize - inset);
          g.stroke({ color: HIT_COLOR, width: 2 });
          g.circle(cx + this.cellSize / 2, cy + this.cellSize / 2, 2.5);
          g.fill({ color: 0xff6600, alpha: 0.6 });
        } else if (cell === 'miss') {
          g.circle(cx + this.cellSize / 2, cy + this.cellSize / 2, 6);
          g.stroke({ color: MISS_COLOR, width: 1, alpha: 0.5 });
          g.circle(cx + this.cellSize / 2, cy + this.cellSize / 2, 3);
          g.stroke({ color: MISS_COLOR, width: 0.7, alpha: 0.35 });
          g.circle(cx + this.cellSize / 2, cy + this.cellSize / 2, 1.5);
          g.fill({ color: 0xffffff, alpha: 0.35 });
        }

        this.mainContainer.addChild(g);
      }
    }
  }

  private drawLabels(gridX: number, gridY: number): void {
    const style = new TextStyle({
      fontSize: this.cellSize <= 26 ? 9 : 10,
      fill: '#88bbcc',
      fontFamily: 'Inter, sans-serif',
      fontWeight: '600',
    });

    for (let i = 0; i < this.gridSize; i++) {
      const colLabel = new Text({ text: String.fromCharCode(65 + i), style });
      colLabel.anchor.set(0.5, 1);
      colLabel.x = gridX + i * this.cellSize + this.cellSize / 2;
      colLabel.y = gridY - 6;
      this.mainContainer.addChild(colLabel);

      const rowLabel = new Text({ text: (i + 1).toString(), style });
      rowLabel.anchor.set(1, 0.5);
      rowLabel.x = gridX - 8;
      rowLabel.y = gridY + i * this.cellSize + this.cellSize / 2;
      this.mainContainer.addChild(rowLabel);
    }
  }

  private drawShips(ships: Ship[], gridX: number, gridY: number, showAll: boolean): void {
    for (const ship of ships) {
      if (!showAll && !ship.sunk) continue;
      if (ship.positions.length < 2) continue;

      const isHorizontal = ship.positions[0].row === ship.positions[1].row;
      const startPos = ship.positions[0];
      const x = gridX + startPos.col * this.cellSize;
      const y = gridY + startPos.row * this.cellSize;

      const sprite = drawShipSprite(ship.name, ship.size, this.cellSize, isHorizontal);
      sprite.x = x;
      sprite.y = y;
      sprite.alpha = ship.sunk ? 0.45 : 0.9;
      this.mainContainer.addChild(sprite);

      if (ship.sunk) {
        for (const pos of ship.positions) {
          const fx = gridX + pos.col * this.cellSize + this.cellSize / 2;
          const fy = gridY + pos.row * this.cellSize + this.cellSize / 2;
          const smoke = new Graphics();
          smoke.circle(fx, fy - 4, 4);
          smoke.fill({ color: 0x444444, alpha: 0.25 });
          smoke.circle(fx + 2, fy - 7, 3);
          smoke.fill({ color: 0x555555, alpha: 0.2 });
          this.mainContainer.addChild(smoke);
        }
      }
    }
  }

  private drawShipStatusInline(ships: Ship[], x: number, y: number, _label: string): void {
    ships.forEach((ship, i) => {
      const icon = new Graphics();
      if (ship.sunk) {
        icon.moveTo(x, y + i * 16 + 2);
        icon.lineTo(x + 7, y + i * 16 + 9);
        icon.moveTo(x + 7, y + i * 16 + 2);
        icon.lineTo(x, y + i * 16 + 9);
        icon.stroke({ color: 0xff4444, width: 1.5 });
      } else {
        icon.moveTo(x, y + i * 16 + 5);
        icon.lineTo(x + 3, y + i * 16 + 8);
        icon.lineTo(x + 7, y + i * 16 + 2);
        icon.stroke({ color: 0x44cc44, width: 1.5 });
      }
      this.mainContainer.addChild(icon);

      const text = new Text({
        text: ship.name,
        style: new TextStyle({
          fontSize: 10,
          fill: ship.sunk ? '#ff6666' : '#88ff88',
          fontFamily: 'Inter, sans-serif',
        }),
      });
      text.x = x + 10;
      text.y = y + i * 16;
      this.mainContainer.addChild(text);
    });
  }

  // ─── Effects ──────────────────────────────────────────────────────────

  playAttackAnimation(row: number, col: number, board: 'player' | 'ai', isHit: boolean, onComplete: () => void): void {
    const gridX = this.getGridX(board);
    const targetX = gridX + col * this.cellSize + this.cellSize / 2;
    const targetY = this.gridY + row * this.cellSize + this.cellSize / 2;

    this.effects.playShot(targetX, targetY, () => {
      if (isHit) {
        this.effects.playExplosion(targetX, targetY);
      } else {
        this.effects.playSplash(targetX, targetY);
      }
      setTimeout(onComplete, 200);
    });
  }

  playMultiAttackAnimation(
    targets: { row: number; col: number; isHit: boolean }[],
    board: 'player' | 'ai',
    onComplete: () => void
  ): void {
    if (targets.length === 0) { onComplete(); return; }

    const gridX = this.getGridX(board);
    const center = targets[Math.floor(targets.length / 2)];
    const cx = gridX + center.col * this.cellSize + this.cellSize / 2;
    const cy = this.gridY + center.row * this.cellSize + this.cellSize / 2;

    this.effects.playShot(cx, cy, () => {
      for (const t of targets) {
        const tx = gridX + t.col * this.cellSize + this.cellSize / 2;
        const ty = this.gridY + t.row * this.cellSize + this.cellSize / 2;
        if (t.isHit) {
          this.effects.playExplosion(tx, ty);
        } else {
          this.effects.playSplash(tx, ty);
        }
      }
      setTimeout(onComplete, 400);
    });
  }

  destroy(): void {
    this.app.stage.removeChildren();
  }
}
