import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { createOceanSurface } from '../../renderer/TableSurface';
import { BattleshipState, GRID_SIZE, CellState, Ship } from './rules';
import { BattleshipEffects } from './BattleshipEffects';
import { drawShipSprite } from './BattleshipShips';

const CELL_SIZE = 32;
const GRID_PADDING = 20;
const LABEL_SIZE = 16;

export class BattleshipRenderer {
  private app: Application;
  private mainContainer: Container;
  private effectsContainer: Container;
  private effects: BattleshipEffects;
  private onCellClick?: (row: number, col: number, board: 'player' | 'ai') => void;
  private onCellHover?: (row: number, col: number, board: 'player' | 'ai') => void;
  private onCellHoverOut?: () => void;

  constructor(app: Application) {
    this.app = app;
    this.mainContainer = new Container();
    this.effectsContainer = new Container();

    const bg = createOceanSurface(app.screen.width, app.screen.height);
    this.mainContainer.addChild(bg);

    app.stage.addChild(this.mainContainer);
    app.stage.addChild(this.effectsContainer);

    this.effects = new BattleshipEffects(this.effectsContainer);
  }

  setOnCellClick(cb: (row: number, col: number, board: 'player' | 'ai') => void): void {
    this.onCellClick = cb;
  }

  setOnCellHover(cb: (row: number, col: number, board: 'player' | 'ai') => void): void {
    this.onCellHover = cb;
  }

  setOnCellHoverOut(cb: () => void): void {
    this.onCellHoverOut = cb;
  }

  render(state: BattleshipState, placementPreview?: { row: number; col: number; size: number; horizontal: boolean; valid: boolean } | null): void {
    while (this.mainContainer.children.length > 1) {
      this.mainContainer.removeChildAt(1);
    }

    const w = this.app.screen.width;
    const gridWidth = GRID_SIZE * CELL_SIZE;

    // AI board (left) - player fires here
    const aiGridX = (w / 2 - gridWidth) / 2;
    const gridY = 50;

    // Player board (right) - shows player's ships
    const playerGridX = w / 2 + (w / 2 - gridWidth) / 2;

    // Headers
    const headerStyle = new TextStyle({ fontSize: 14, fill: '#ffffff', fontFamily: 'Inter, sans-serif', fontWeight: 'bold' });
    const aiHeader = new Text({ text: 'Enemy Waters', style: headerStyle });
    aiHeader.anchor.set(0.5, 0);
    aiHeader.x = aiGridX + gridWidth / 2;
    aiHeader.y = 15;
    this.mainContainer.addChild(aiHeader);

    const playerHeader = new Text({ text: 'Your Fleet', style: headerStyle });
    playerHeader.anchor.set(0.5, 0);
    playerHeader.x = playerGridX + gridWidth / 2;
    playerHeader.y = 15;
    this.mainContainer.addChild(playerHeader);

    // Draw grids
    this.drawGrid(state.aiBoard.grid, aiGridX, gridY, 'ai', state.phase === 'playing', false, state.aiBoard.ships);
    this.drawGrid(state.playerBoard.grid, playerGridX, gridY, 'player', state.phase === 'placement', true, state.playerBoard.ships);

    // Draw ship sprites on player board
    this.drawShips(state.playerBoard.ships, playerGridX, gridY, true);
    // Draw sunk AI ships so player sees them
    this.drawShips(state.aiBoard.ships.filter(s => s.sunk), aiGridX, gridY, false);

    // Column/row labels
    this.drawLabels(aiGridX, gridY);
    this.drawLabels(playerGridX, gridY);

    // Placement preview
    if (placementPreview && state.phase === 'placement') {
      this.drawPlacementPreview(placementPreview, playerGridX, gridY);
    }

    // Ship status panels
    this.drawShipStatus(state.aiBoard.ships, aiGridX, gridY + gridWidth + 30, 'Enemy');
    this.drawShipStatus(state.playerBoard.ships, playerGridX, gridY + gridWidth + 30, 'Your');

    // Phase info
    if (state.phase === 'placement') {
      const info = new Text({
        text: state.playerShipsToPlace.length > 0
          ? `Place your ${state.playerShipsToPlace[0].name} (${state.playerShipsToPlace[0].size} cells) - Press R to rotate`
          : 'All ships placed!',
        style: new TextStyle({ fontSize: 12, fill: '#d4af37', fontFamily: 'Inter, sans-serif' }),
      });
      info.anchor.set(0.5);
      info.x = w / 2;
      info.y = gridY + gridWidth + 15;
      this.mainContainer.addChild(info);
    }
  }

  private drawGrid(
    grid: CellState[][],
    x: number,
    y: number,
    boardId: 'player' | 'ai',
    interactive: boolean,
    showShips: boolean,
    ships: Ship[]
  ): void {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = grid[row][col];
        const cx = x + col * CELL_SIZE;
        const cy = y + row * CELL_SIZE;

        const g = new Graphics();

        // Cell background
        let bgColor = 0x0d4a6e;
        let bgAlpha = 0.3;

        if (cell === 'hit') {
          bgColor = 0xcc3333;
          bgAlpha = 0.7;
        } else if (cell === 'miss') {
          bgColor = 0x336699;
          bgAlpha = 0.4;
        }

        g.rect(cx, cy, CELL_SIZE, CELL_SIZE);
        g.fill({ color: bgColor, alpha: bgAlpha });
        g.rect(cx, cy, CELL_SIZE, CELL_SIZE);
        g.stroke({ color: 0x1a6b8a, width: 0.5, alpha: 0.5 });

        // Hit/miss markers
        if (cell === 'hit') {
          g.moveTo(cx + 6, cy + 6);
          g.lineTo(cx + CELL_SIZE - 6, cy + CELL_SIZE - 6);
          g.moveTo(cx + CELL_SIZE - 6, cy + 6);
          g.lineTo(cx + 6, cy + CELL_SIZE - 6);
          g.stroke({ color: 0xff0000, width: 2.5 });
        } else if (cell === 'miss') {
          g.circle(cx + CELL_SIZE / 2, cy + CELL_SIZE / 2, 4);
          g.fill({ color: 0xffffff, alpha: 0.4 });
        }

        if (interactive) {
          g.eventMode = 'static';
          g.cursor = 'crosshair';
          g.hitArea = { contains: (px: number, py: number) => px >= cx && px < cx + CELL_SIZE && py >= cy && py < cy + CELL_SIZE };
          g.on('pointertap', () => this.onCellClick?.(row, col, boardId));
          g.on('pointerover', () => this.onCellHover?.(row, col, boardId));
          g.on('pointerout', () => this.onCellHoverOut?.());
        }

        this.mainContainer.addChild(g);
      }
    }
  }

  private drawLabels(gridX: number, gridY: number): void {
    const style = new TextStyle({ fontSize: 10, fill: '#ffffff66', fontFamily: 'Inter, sans-serif' });

    for (let i = 0; i < GRID_SIZE; i++) {
      // Column labels (A-J)
      const colLabel = new Text({ text: String.fromCharCode(65 + i), style });
      colLabel.anchor.set(0.5);
      colLabel.x = gridX + i * CELL_SIZE + CELL_SIZE / 2;
      colLabel.y = gridY - 10;
      this.mainContainer.addChild(colLabel);

      // Row labels (1-10)
      const rowLabel = new Text({ text: (i + 1).toString(), style });
      rowLabel.anchor.set(1, 0.5);
      rowLabel.x = gridX - 6;
      rowLabel.y = gridY + i * CELL_SIZE + CELL_SIZE / 2;
      this.mainContainer.addChild(rowLabel);
    }
  }

  private drawPlacementPreview(
    preview: { row: number; col: number; size: number; horizontal: boolean; valid: boolean },
    gridX: number,
    gridY: number
  ): void {
    const color = preview.valid ? 0x44ff44 : 0xff4444;
    for (let i = 0; i < preview.size; i++) {
      const r = preview.horizontal ? preview.row : preview.row + i;
      const c = preview.horizontal ? preview.col + i : preview.col;
      if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
        const g = new Graphics();
        g.rect(gridX + c * CELL_SIZE, gridY + r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        g.fill({ color, alpha: 0.3 });
        g.rect(gridX + c * CELL_SIZE, gridY + r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        g.stroke({ color, width: 2, alpha: 0.5 });
        this.mainContainer.addChild(g);
      }
    }
  }

  private drawShips(ships: Ship[], gridX: number, gridY: number, showAll: boolean): void {
    for (const ship of ships) {
      if (!showAll && !ship.sunk) continue;
      if (ship.positions.length < 2) continue;

      const isHorizontal = ship.positions[0].row === ship.positions[1].row;
      const startPos = ship.positions[0];
      const x = gridX + startPos.col * CELL_SIZE;
      const y = gridY + startPos.row * CELL_SIZE;

      const sprite = drawShipSprite(ship.name, ship.size, CELL_SIZE, isHorizontal);
      sprite.x = x;
      sprite.y = y;
      sprite.alpha = ship.sunk ? 0.5 : 0.9;
      this.mainContainer.addChild(sprite);
    }
  }

  private drawShipStatus(ships: Ship[], x: number, y: number, label: string): void {
    const titleStyle = new TextStyle({ fontSize: 11, fill: '#ffffff88', fontFamily: 'Inter, sans-serif' });
    const title = new Text({ text: `${label} Fleet`, style: titleStyle });
    title.x = x;
    title.y = y;
    this.mainContainer.addChild(title);

    ships.forEach((ship, i) => {
      const text = new Text({
        text: `${ship.sunk ? '\u2717' : '\u2713'} ${ship.name}`,
        style: new TextStyle({
          fontSize: 10,
          fill: ship.sunk ? '#ff6666' : '#88ff88',
          fontFamily: 'Inter, sans-serif',
        }),
      });
      text.x = x;
      text.y = y + 18 + i * 15;
      this.mainContainer.addChild(text);
    });
  }

  /** Play attack animation: projectile arc then hit/miss effect, then callback */
  playAttackAnimation(row: number, col: number, board: 'player' | 'ai', isHit: boolean, onComplete: () => void): void {
    const w = this.app.screen.width;
    const gridWidth = GRID_SIZE * CELL_SIZE;
    const gridX = board === 'ai'
      ? (w / 2 - gridWidth) / 2
      : w / 2 + (w / 2 - gridWidth) / 2;
    const gridY = 50;

    const targetX = gridX + col * CELL_SIZE + CELL_SIZE / 2;
    const targetY = gridY + row * CELL_SIZE + CELL_SIZE / 2;

    this.effects.playShot(targetX, targetY, () => {
      if (isHit) {
        this.effects.playExplosion(targetX, targetY);
      } else {
        this.effects.playSplash(targetX, targetY);
      }
      // Small delay before resolving state
      setTimeout(onComplete, 200);
    });
  }

  destroy(): void {
    this.app.stage.removeChildren();
  }
}
