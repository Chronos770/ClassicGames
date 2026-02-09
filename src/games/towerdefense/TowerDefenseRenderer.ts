import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import {
  TowerDefenseState,
  Tower,
  Enemy,
  Projectile,
  TowerType,
  TOWER_DEFS,
  ENEMY_DEFS,
  MapDef,
  GRID_ROWS,
  GRID_COLS,
  CELL_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  cellToPixel,
  getTowerRange,
  CellType,
} from './rules';
import { drawTower, drawEnemy, drawProjectile, createFiringFlash, createDeathBurst } from './TDSprites';

const PATH_COLOR = 0xC4A265;
const GRASS_COLOR = 0x3A7D44;
const GRASS_COLOR_ALT = 0x358140;
const BLOCKED_COLOR = 0x2D5A27;
const SPAWN_COLOR = 0x4488FF;
const EXIT_COLOR = 0xFF4444;

export class TowerDefenseRenderer {
  private app: Application;
  private bgContainer: Container;
  private towerContainer: Container;
  private enemyContainer: Container;
  private projectileContainer: Container;
  private uiContainer: Container;
  private rangeContainer: Container;

  private onCellClick?: (row: number, col: number) => void;
  private onCellHover?: (row: number, col: number) => void;
  private hoveredCell: { row: number; col: number } | null = null;

  constructor(app: Application) {
    this.app = app;
    this.bgContainer = new Container();
    this.rangeContainer = new Container();
    this.towerContainer = new Container();
    this.enemyContainer = new Container();
    this.projectileContainer = new Container();
    this.uiContainer = new Container();

    app.stage.addChild(this.bgContainer);
    app.stage.addChild(this.rangeContainer);
    app.stage.addChild(this.towerContainer);
    app.stage.addChild(this.enemyContainer);
    app.stage.addChild(this.projectileContainer);
    app.stage.addChild(this.uiContainer);
  }

  setOnCellClick(cb: (row: number, col: number) => void): void {
    this.onCellClick = cb;
  }

  setOnCellHover(cb: (row: number, col: number) => void): void {
    this.onCellHover = cb;
  }

  // ── Draw the static background (only needs to be called once per map) ──
  renderBackground(map: MapDef): void {
    this.bgContainer.removeChildren();

    const bg = new Graphics();

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = map.grid[row][col];
        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE;

        let color: number;
        switch (cell) {
          case 'path':
            color = PATH_COLOR;
            break;
          case 'spawn':
            color = SPAWN_COLOR;
            break;
          case 'exit':
            color = EXIT_COLOR;
            break;
          case 'blocked':
            color = BLOCKED_COLOR;
            break;
          default:
            color = (row + col) % 2 === 0 ? GRASS_COLOR : GRASS_COLOR_ALT;
        }

        bg.rect(x, y, CELL_SIZE, CELL_SIZE);
        bg.fill({ color });

        // Subtle grid lines on grass
        if (cell === 'grass') {
          bg.rect(x, y, CELL_SIZE, CELL_SIZE);
          bg.stroke({ color: 0x000000, width: 0.5, alpha: 0.1 });
        }

        // Path edges - draw slightly darker border for path tiles
        if (cell === 'path' || cell === 'spawn' || cell === 'exit') {
          bg.rect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          bg.stroke({ color: 0x000000, width: 0.5, alpha: 0.15 });
        }
      }
    }

    // Spawn label
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = map.grid[row][col];
        if (cell === 'spawn') {
          const label = new Text({
            text: 'START',
            style: new TextStyle({ fontSize: 8, fill: '#ffffff', fontWeight: 'bold', fontFamily: 'Inter, sans-serif' }),
          });
          label.anchor.set(0.5);
          label.x = col * CELL_SIZE + CELL_SIZE / 2;
          label.y = row * CELL_SIZE + CELL_SIZE / 2;
          this.bgContainer.addChild(label);
        } else if (cell === 'exit') {
          const label = new Text({
            text: 'EXIT',
            style: new TextStyle({ fontSize: 8, fill: '#ffffff', fontWeight: 'bold', fontFamily: 'Inter, sans-serif' }),
          });
          label.anchor.set(0.5);
          label.x = col * CELL_SIZE + CELL_SIZE / 2;
          label.y = row * CELL_SIZE + CELL_SIZE / 2;
          this.bgContainer.addChild(label);
        }
      }
    }

    // Interactive overlay for cell clicks
    const overlay = new Graphics();
    overlay.rect(0, 0, GRID_COLS * CELL_SIZE, GRID_ROWS * CELL_SIZE);
    overlay.fill({ color: 0x000000, alpha: 0.001 }); // Nearly invisible but interactive
    overlay.eventMode = 'static';
    overlay.cursor = 'pointer';

    overlay.on('pointertap', (e) => {
      const local = e.getLocalPosition(overlay);
      const col = Math.floor(local.x / CELL_SIZE);
      const row = Math.floor(local.y / CELL_SIZE);
      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        this.onCellClick?.(row, col);
      }
    });

    overlay.on('pointermove', (e) => {
      const local = e.getLocalPosition(overlay);
      const col = Math.floor(local.x / CELL_SIZE);
      const row = Math.floor(local.y / CELL_SIZE);
      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        if (!this.hoveredCell || this.hoveredCell.row !== row || this.hoveredCell.col !== col) {
          this.hoveredCell = { row, col };
          this.onCellHover?.(row, col);
        }
      }
    });

    this.bgContainer.addChildAt(bg, 0);
    this.bgContainer.addChild(overlay);
  }

  // ── Render dynamic game state (called every frame) ──
  render(state: TowerDefenseState, map: MapDef): void {
    this.renderTowers(state);
    this.renderEnemies(state);
    this.renderProjectiles(state);
    this.renderRange(state);
  }

  private renderTowers(state: TowerDefenseState): void {
    this.towerContainer.removeChildren();

    for (const tower of state.towers) {
      const { x, y } = cellToPixel(tower.row, tower.col);
      const isSelected = state.selectedPlacedTower === tower.id;

      // Selection highlight
      if (isSelected) {
        const sel = new Graphics();
        sel.roundRect(
          x - CELL_SIZE / 2 + 1,
          y - CELL_SIZE / 2 + 1,
          CELL_SIZE - 2,
          CELL_SIZE - 2,
          4
        );
        sel.stroke({ color: 0xFFDD00, width: 2 });
        this.towerContainer.addChild(sel);
      }

      // Draw tower sprite
      const sprite = drawTower(tower.type, CELL_SIZE, tower.level);
      sprite.x = x;
      sprite.y = y;
      this.towerContainer.addChild(sprite);
    }

    // Placement preview
    if (state.selectedTower && this.hoveredCell) {
      const { row, col } = this.hoveredCell;
      const canPlace = state.towers.every(t => t.row !== row || t.col !== col) &&
        row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS;
      const def = TOWER_DEFS[state.selectedTower];
      const { x, y } = cellToPixel(row, col);

      // Semi-transparent preview tower
      const previewSprite = drawTower(state.selectedTower, CELL_SIZE, 1);
      previewSprite.x = x;
      previewSprite.y = y;
      previewSprite.alpha = 0.5;
      this.towerContainer.addChild(previewSprite);

      const outline = new Graphics();
      outline.roundRect(
        x - CELL_SIZE / 2 + 2,
        y - CELL_SIZE / 2 + 2,
        CELL_SIZE - 4,
        CELL_SIZE - 4,
        4
      );
      outline.stroke({ color: canPlace ? 0x44FF44 : 0xFF4444, width: 2, alpha: 0.7 });
      this.towerContainer.addChild(outline);
    }
  }

  private renderEnemies(state: TowerDefenseState): void {
    this.enemyContainer.removeChildren();

    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;

      const def = ENEMY_DEFS[enemy.type];

      // Health bar background
      const hpBg = new Graphics();
      hpBg.rect(enemy.x - 14, enemy.y - CELL_SIZE / 2 + 1, 28, 4);
      hpBg.fill({ color: 0x333333 });
      this.enemyContainer.addChild(hpBg);

      // Health bar fill
      const hpFill = new Graphics();
      const hpRatio = enemy.hp / enemy.maxHp;
      const hpColor = hpRatio > 0.6 ? 0x44DD44 : hpRatio > 0.3 ? 0xDDDD44 : 0xDD4444;
      hpFill.rect(enemy.x - 14, enemy.y - CELL_SIZE / 2 + 1, 28 * hpRatio, 4);
      hpFill.fill({ color: hpColor });
      this.enemyContainer.addChild(hpFill);

      // Slow indicator ring
      if (enemy.slowTimer > 0) {
        const slowRing = new Graphics();
        slowRing.circle(enemy.x, enemy.y, CELL_SIZE * 0.38);
        slowRing.stroke({ color: 0x66CCFF, width: 2, alpha: 0.7 });
        this.enemyContainer.addChild(slowRing);
      }

      // Draw enemy sprite
      const sprite = drawEnemy(enemy.type, CELL_SIZE);
      sprite.x = enemy.x;
      sprite.y = enemy.y;
      this.enemyContainer.addChild(sprite);
    }
  }

  private renderProjectiles(state: TowerDefenseState): void {
    this.projectileContainer.removeChildren();

    for (const proj of state.projectiles) {
      const x = proj.fromX + (proj.toX - proj.fromX) * proj.progress;
      const y = proj.fromY + (proj.toY - proj.fromY) * proj.progress;

      const g = drawProjectile(proj.towerType);
      g.x = x;
      g.y = y;

      this.projectileContainer.addChild(g);
    }

    // Draw lightning chains
    for (const proj of state.projectiles) {
      if (proj.towerType === 'lightning' && proj.chainTargets && proj.progress >= 1) {
        // Chain lines between targets
        const targets = [
          state.enemies.find(e => e.id === proj.targetId),
          ...proj.chainTargets.map(id => state.enemies.find(e => e.id === id))
        ].filter(Boolean) as Enemy[];

        for (let i = 0; i < targets.length - 1; i++) {
          const from = targets[i];
          const to = targets[i + 1];
          const chain = new Graphics();
          chain.moveTo(from.x, from.y);
          chain.lineTo(to.x, to.y);
          chain.stroke({ color: 0xFFDD00, width: 2, alpha: 0.6 });
          this.projectileContainer.addChild(chain);
        }
      }
    }
  }

  private renderRange(state: TowerDefenseState): void {
    this.rangeContainer.removeChildren();

    // Show range for selected placed tower
    if (state.selectedPlacedTower !== null) {
      const tower = state.towers.find(t => t.id === state.selectedPlacedTower);
      if (tower) {
        const range = getTowerRange(tower) * CELL_SIZE;
        const { x, y } = cellToPixel(tower.row, tower.col);
        const rangeCircle = new Graphics();
        rangeCircle.circle(x, y, range);
        rangeCircle.fill({ color: 0xFFFFFF, alpha: 0.05 });
        rangeCircle.circle(x, y, range);
        rangeCircle.stroke({ color: 0xFFFFFF, width: 1, alpha: 0.2 });
        this.rangeContainer.addChild(rangeCircle);
      }
    }

    // Show range preview for tower being placed
    if (state.selectedTower && this.hoveredCell) {
      const def = TOWER_DEFS[state.selectedTower];
      const { x, y } = cellToPixel(this.hoveredCell.row, this.hoveredCell.col);
      const range = def.range * CELL_SIZE;
      const rangeCircle = new Graphics();
      rangeCircle.circle(x, y, range);
      rangeCircle.fill({ color: 0xFFFFFF, alpha: 0.05 });
      rangeCircle.circle(x, y, range);
      rangeCircle.stroke({ color: 0x44FF44, width: 1, alpha: 0.3 });
      this.rangeContainer.addChild(rangeCircle);
    }
  }

  // ── Tower firing flash ──
  renderFiringFlash(x: number, y: number, towerType: TowerType): void {
    const flash = createFiringFlash(x, y, towerType);
    this.projectileContainer.addChild(flash);
    setTimeout(() => this.projectileContainer.removeChild(flash), 100);
  }

  // ── Explosion effect ──
  renderExplosion(x: number, y: number): void {
    const explosion = new Graphics();
    explosion.circle(x, y, CELL_SIZE * 1.5);
    explosion.fill({ color: 0xFF6600, alpha: 0.3 });
    explosion.circle(x, y, CELL_SIZE);
    explosion.fill({ color: 0xFFAA00, alpha: 0.4 });
    this.projectileContainer.addChild(explosion);

    // Remove after a short time
    setTimeout(() => {
      this.projectileContainer.removeChild(explosion);
    }, 200);
  }

  // ── Kill effect with particle burst ──
  renderKillEffect(x: number, y: number): void {
    // Death burst particles
    const burst = createDeathBurst(x, y, 0xff6600);
    this.projectileContainer.addChild(burst);
    setTimeout(() => this.projectileContainer.removeChild(burst), 400);

    // Gold text
    const text = new Text({
      text: '+$',
      style: new TextStyle({ fontSize: 12, fill: '#FFD700', fontWeight: 'bold', fontFamily: 'Inter, sans-serif' }),
    });
    text.anchor.set(0.5);
    text.x = x;
    text.y = y - 10;
    this.projectileContainer.addChild(text);

    // Float up and fade
    let frame = 0;
    const animate = () => {
      frame++;
      text.y -= 0.5;
      text.alpha -= 0.02;
      if (frame < 30) {
        requestAnimationFrame(animate);
      } else {
        this.projectileContainer.removeChild(text);
      }
    };
    requestAnimationFrame(animate);
  }

  destroy(): void {
    this.app.stage.removeChildren();
  }
}
