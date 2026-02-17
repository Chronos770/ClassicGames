// ═══════════════════════════════════════════════════════════════════
// BonksRenderer.ts — Sprite-based renderer for BooBonks & BoJangles
// Title → Cinematic → Select → Gameplay rendering
// ═══════════════════════════════════════════════════════════════════

import { Application, Container, Sprite, Graphics } from 'pixi.js';
import { BonksState, EnemyState, TILE, LEVELS, WORLD_MAP, getTile, isSolid, isQuestionLike,
  CHARACTERS, CharacterId, SELECTABLE_CHARACTERS, CINEMATIC_SCENES, WORLD2_CINEMATIC_SCENES, STORY,
  CHONK_TONGUE_FRAMES, CHONK_TONGUE_RANGE, PLANT_CYCLE, PLANT_UP_HEIGHT, MovingPlatform } from './rules';
import { tex, hasTex, PX, FONT_W, FONT_H, initBonksTextures } from './BonksSprites';

const CANVAS_W = 900;
const CANVAS_H = 500;
const SPRITE_SCALE = 1.4; // Scale up sprites for larger, cleaner look

const CHAR_PREFIXES: Record<CharacterId, string> = {
  boobonks: 'bb', bojangles: 'bj', chonk: 'ch',
};

export class BonksRenderer {
  private app: Application;
  private bgContainer: Container;
  private worldContainer: Container;
  private tileContainer: Container;
  private entityContainer: Container;
  private fgContainer: Container;
  private hudContainer: Container;
  private overlayContainer: Container;
  private frameCount = 0;
  private texturesReady = false;

  constructor(app: Application) {
    this.app = app;

    this.bgContainer = new Container();
    this.worldContainer = new Container();
    this.tileContainer = new Container();
    this.entityContainer = new Container();
    this.fgContainer = new Container();
    this.hudContainer = new Container();
    this.overlayContainer = new Container();

    this.worldContainer.addChild(this.bgContainer);
    this.worldContainer.addChild(this.tileContainer);
    this.worldContainer.addChild(this.entityContainer);
    this.worldContainer.addChild(this.fgContainer);

    app.stage.addChild(this.worldContainer);
    app.stage.addChild(this.hudContainer);
    app.stage.addChild(this.overlayContainer);

    try {
      initBonksTextures(app);
      this.texturesReady = true;
    } catch (e) {
      console.warn('BonksSprites init failed, falling back', e);
    }
  }

  render(state: BonksState): void {
    this.frameCount++;

    // Clear all
    this.bgContainer.removeChildren();
    this.tileContainer.removeChildren();
    this.entityContainer.removeChildren();
    this.fgContainer.removeChildren();
    this.hudContainer.removeChildren();
    this.overlayContainer.removeChildren();

    switch (state.phase) {
      case 'title':
        this.renderTitle(state);
        break;
      case 'cinematic':
        this.renderCinematic(state);
        break;
      case 'select':
        this.renderSelect(state);
        break;
      case 'world':
        this.renderWorld(state);
        break;
      case 'playing':
      case 'dying':
        this.renderGameplay(state);
        break;
      case 'complete':
        this.renderGameplay(state);
        this.renderCompleteOverlay(state);
        break;
      case 'game-over':
        this.renderGameOverOverlay(state);
        break;
    }
  }

  // ═══════════════════════════════════════
  // TITLE SCREEN
  // ═══════════════════════════════════════

  private renderTitle(state: BonksState): void {
    // Render gameplay in background
    this.renderGameplayWorld(state);

    // Dark gradient overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, CANVAS_W, CANVAS_H).fill({ color: 0x000000, alpha: 0.65 });
    this.overlayContainer.addChild(overlay);

    // Decorative top/bottom bars
    const topBar = new Graphics();
    topBar.rect(0, 0, CANVAS_W, 4).fill({ color: 0xFFDD00, alpha: 0.6 });
    this.overlayContainer.addChild(topBar);
    const botBar = new Graphics();
    botBar.rect(0, CANVAS_H - 4, CANVAS_W, 4).fill({ color: 0xFFDD00, alpha: 0.4 });
    this.overlayContainer.addChild(botBar);

    // Title text — properly centered
    const titleY = 80;
    const bob = Math.sin(this.frameCount * 0.03) * 3;
    this.drawCentered('BOOBONKS', titleY + bob, 0xE91E8C, this.overlayContainer, 2.5);
    this.drawCentered('AND', titleY + 46, 0xFFFFFF, this.overlayContainer);
    this.drawCentered('BOJANGLES', titleY + 68 - bob, 0x33BB33, this.overlayContainer, 2.5);

    // Subtitle with sparkle
    this.drawCentered('A FIZZLEWOOD ADVENTURE', titleY + 120, 0xFFDD00, this.overlayContainer);

    // Divider line
    const divW = 200;
    const div = new Graphics();
    div.rect(CANVAS_W / 2 - divW / 2, titleY + 140, divW, 1).fill({ color: 0xFFFFFF, alpha: 0.2 });
    this.overlayContainer.addChild(div);

    // Menu items
    const menuY = 300;
    const items = ['START', 'CONTINUE'];
    for (let i = 0; i < items.length; i++) {
      const isContinue = i === 1;
      const disabled = isContinue && state.titleIndex !== 1 && !state.titleIndex; // dim if no save
      const selected = i === state.titleIndex;
      const color = selected ? 0xFFDD00 : (isContinue && state.titleIndex === 0 ? 0x555555 : 0xBBBBBB);
      const y = menuY + i * 32;

      if (selected) {
        // Selection highlight bar
        const bar = new Graphics();
        bar.roundRect(CANVAS_W / 2 - 80, y - 4, 160, 22, 4);
        bar.fill({ color: 0xFFDD00, alpha: 0.12 });
        bar.roundRect(CANVAS_W / 2 - 80, y - 4, 160, 22, 4);
        bar.stroke({ color: 0xFFDD00, width: 1, alpha: 0.4 });
        this.overlayContainer.addChild(bar);

        // Cursor arrows
        const bounce = Math.sin(this.frameCount * 0.12) * 3;
        this.drawText('>', CANVAS_W / 2 - 70 - bounce, y, 0xFFDD00, this.overlayContainer);
        this.drawText('<', CANVAS_W / 2 + 60 + bounce, y, 0xFFDD00, this.overlayContainer);
      }

      this.drawCentered(items[i], y, color, this.overlayContainer);
    }

    // Blink hint
    if (Math.floor(this.frameCount / 30) % 2 === 0) {
      this.drawCentered('PRESS ENTER', CANVAS_H - 52, 0xFFFFFF, this.overlayContainer, 1, 0.7);
    }

    // Credits
    this.drawCentered('CASTLE AND CARDS', CANVAS_H - 22, 0x444444, this.overlayContainer);
  }

  // ═══════════════════════════════════════
  // CINEMATIC
  // ═══════════════════════════════════════

  private renderCinematic(state: BonksState): void {
    const scenes = state.cinematicTarget === 'level' ? WORLD2_CINEMATIC_SCENES : CINEMATIC_SCENES;
    const scene = scenes[state.cinematicScene];
    if (!scene) return;

    // Dark starry background
    const bg = new Graphics();
    bg.rect(0, 0, CANVAS_W, CANVAS_H).fill({ color: 0x0a0a1a });
    this.overlayContainer.addChild(bg);

    // Subtle stars
    const stars = new Graphics();
    for (let i = 0; i < 40; i++) {
      const sx = (i * 131) % CANVAS_W;
      const sy = (i * 67) % (CANVAS_H - 100);
      const bright = (Math.sin(this.frameCount * 0.03 + i * 2) + 1) * 0.5;
      stars.circle(sx, sy, 0.5 + bright).fill({ color: 0xFFFFFF, alpha: 0.15 + bright * 0.3 });
    }
    this.overlayContainer.addChild(stars);

    // Scene illustration — scale to fit nicely (scene sprites are 64-wide * PX=2 = 128px baked)
    // Use scale 2.5 → 320px wide, ~150px tall; fits well above text
    const sprKey = scene.spriteKey;
    // Scene sprites are 64x~58 art pixels, baked at PX=2 → 128x116 px
    // Scale 1.5 → 192x174, fits above text nicely
    const sceneScale = 1.5;
    const sceneW = 64 * PX * sceneScale;
    const sceneH = 58 * PX * sceneScale;

    if (this.texturesReady && hasTex(sprKey)) {
      // Decorative frame around illustration
      const frameG = new Graphics();
      const fx = (CANVAS_W - sceneW) / 2 - 4;
      const fy = 26;
      frameG.roundRect(fx, fy, sceneW + 8, sceneH + 8, 4);
      frameG.stroke({ color: 0xFFDD00, width: 1, alpha: 0.4 });
      this.overlayContainer.addChild(frameG);

      const spr = new Sprite(tex(sprKey));
      spr.scale.set(sceneScale);
      spr.x = (CANVAS_W - sceneW) / 2;
      spr.y = 30;
      this.overlayContainer.addChild(spr);
    } else {
      // Fallback: colored rectangle with border
      const g = new Graphics();
      g.roundRect(CANVAS_W / 2 - 160, 30, 320, sceneH, 4).fill({ color: 0x223344 });
      g.roundRect(CANVAS_W / 2 - 160, 30, 320, sceneH, 4).stroke({ color: 0x445566, width: 1 });
      this.overlayContainer.addChild(g);
    }

    // Fade-in effect for text
    const alpha = Math.min(1, state.cinematicTimer / 30);

    // Story text below illustration — with text box background
    const textY = 40 + sceneH + 20;
    const textBoxH = scene.lines.length * 22 + 20;
    const textBox = new Graphics();
    textBox.roundRect(CANVAS_W / 2 - 260, textY - 10, 520, textBoxH, 6);
    textBox.fill({ color: 0x000000, alpha: 0.5 * alpha });
    this.overlayContainer.addChild(textBox);

    for (let i = 0; i < scene.lines.length; i++) {
      const line = scene.lines[i];
      const lineW = line.length * (FONT_W + 1) * PX;
      this.drawText(line, (CANVAS_W - lineW) / 2, textY + i * 22, 0xFFFFFF, this.overlayContainer, 1, alpha);
    }

    // Scene indicator dots
    const dotY = CANVAS_H - 42;
    for (let i = 0; i < scenes.length; i++) {
      const g = new Graphics();
      const isCurrent = i === state.cinematicScene;
      const color = isCurrent ? 0xFFDD00 : 0x444444;
      g.circle(CANVAS_W / 2 - 20 + i * 20, dotY, isCurrent ? 5 : 3).fill({ color });
      this.overlayContainer.addChild(g);
    }

    // Navigation hint
    if (Math.floor(this.frameCount / 40) % 2 === 0) {
      this.drawCentered('ENTER OR ARROWS TO CONTINUE', CANVAS_H - 18, 0x666666, this.overlayContainer);
    }
  }

  // ═══════════════════════════════════════
  // CHARACTER SELECT
  // ═══════════════════════════════════════

  private renderSelect(state: BonksState): void {
    // Dark background with animated stars
    const bg = new Graphics();
    bg.rect(0, 0, CANVAS_W, CANVAS_H).fill({ color: 0x0a0a1a });
    this.overlayContainer.addChild(bg);

    // Stars
    const stars = new Graphics();
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137 + this.frameCount * 0.15) % CANVAS_W;
      const sy = (i * 97 + Math.sin(i) * 30) % CANVAS_H;
      const bright = (Math.sin(this.frameCount * 0.04 + i) + 1) * 0.5;
      stars.circle(sx, sy, 0.5 + bright).fill({ color: 0xFFFFFF, alpha: 0.2 + bright * 0.4 });
    }
    this.overlayContainer.addChild(stars);

    // Title with decorative line
    this.drawCentered('CHOOSE YOUR HERO', 30, 0xFFDD00, this.overlayContainer, 1.5);
    const divW = 240;
    const div = new Graphics();
    div.rect(CANVAS_W / 2 - divW / 2, 56, divW, 1).fill({ color: 0xFFDD00, alpha: 0.3 });
    this.overlayContainer.addChild(div);

    // 2 characters side by side
    const charW = 300;
    const startX = (CANVAS_W - charW * 2) / 2;

    for (let i = 0; i < SELECTABLE_CHARACTERS.length; i++) {
      const charId = SELECTABLE_CHARACTERS[i];
      const charDef = CHARACTERS[charId];
      const cx = startX + i * charW + charW / 2;
      const isSelected = i === state.selectIndex;

      // Card background
      const card = new Graphics();
      const cardX = cx - 115;
      const cardY = 70;
      const cardW = 230;
      const cardH = 340;

      if (isSelected) {
        // Glow effect
        card.roundRect(cardX - 3, cardY - 3, cardW + 6, cardH + 6, 12);
        card.fill({ color: 0xFFDD00, alpha: 0.15 });
      }

      card.roundRect(cardX, cardY, cardW, cardH, 8);
      card.fill({ color: isSelected ? 0x1a1a3a : 0x111128 });
      card.roundRect(cardX, cardY, cardW, cardH, 8);
      card.stroke({ color: isSelected ? 0xFFDD00 : 0x333355, width: isSelected ? 2 : 1, alpha: isSelected ? 0.9 : 0.5 });
      this.overlayContainer.addChild(card);

      if (isSelected) {
        // Bouncing arrow above card
        const arrowY = 58 + Math.sin(this.frameCount * 0.1) * 4;
        this.drawCenteredAt('V', cx, arrowY, 0xFFDD00, this.overlayContainer);
      }

      // Character portrait — scale 2.5 so it's 80x80, fits in card
      const prefix = CHAR_PREFIXES[charId];
      const portraitKey = `portrait-${prefix}`;
      if (this.texturesReady && hasTex(portraitKey)) {
        const portrait = new Sprite(tex(portraitKey));
        const pScale = 2.5;
        const pSize = 16 * PX * pScale; // 80px
        portrait.x = cx - pSize / 2;
        portrait.y = 85;
        portrait.scale.set(pScale);
        this.overlayContainer.addChild(portrait);
      }

      // Name below portrait
      const nameY = 170;
      const nameColor = isSelected ? 0xFFFFFF : 0xBBBBBB;
      this.drawCenteredAt(charDef.name.toUpperCase(), cx, nameY, nameColor, this.overlayContainer, 1.2);

      // Divider
      const nameDiv = new Graphics();
      nameDiv.rect(cx - 60, nameY + 20, 120, 1).fill({ color: 0xFFFFFF, alpha: 0.1 });
      this.overlayContainer.addChild(nameDiv);

      // Stats
      const statY = 200;
      const statLabelX = cx - 55;
      const statBarX = cx + 10;

      this.drawText('SPEED', statLabelX, statY, 0x999999, this.overlayContainer);
      this.drawStatBar(statBarX, statY + 2, charDef.statSpeed, 5);

      this.drawText('JUMP', statLabelX, statY + 20, 0x999999, this.overlayContainer);
      this.drawStatBar(statBarX, statY + 22, charDef.statJump, 5);

      // Special ability with icon
      this.drawText('SPECIAL', statLabelX, statY + 46, 0x999999, this.overlayContainer);
      this.drawCenteredAt(charDef.statSpecial.toUpperCase(), cx, statY + 62, 0x66CCFF, this.overlayContainer);

      // Description (word-wrap, centered in card)
      const desc = charDef.description;
      const words = desc.split(' ');
      let line = '';
      let lineY = statY + 86;
      const maxLineLen = 22;
      const lines: string[] = [];
      for (const word of words) {
        if ((line + ' ' + word).length > maxLineLen) {
          lines.push(line);
          line = word;
        } else {
          line = line ? line + ' ' + word : word;
        }
      }
      if (line) lines.push(line);
      for (const l of lines) {
        this.drawCenteredAt(l.toUpperCase(), cx, lineY, 0x777777, this.overlayContainer);
        lineY += 16;
      }
    }

    // Bottom section
    this.drawCentered('CHONK: FIND IN WORLD!', CANVAS_H - 60, 0x555555, this.overlayContainer);

    if (Math.floor(this.frameCount / 30) % 2 === 0) {
      this.drawCentered('PRESS ENTER TO START', CANVAS_H - 36, 0xFFFFFF, this.overlayContainer, 1, 0.8);
    }

    this.drawCentered('LEFT-RIGHT TO SELECT', CANVAS_H - 16, 0x555555, this.overlayContainer);
  }

  private drawStatBar(x: number, y: number, value: number, max: number): void {
    const g = new Graphics();
    for (let i = 0; i < max; i++) {
      const filled = i < value;
      g.rect(x + i * 12, y, 10, 8).fill({ color: filled ? 0xFFDD00 : 0x333333 });
    }
    this.overlayContainer.addChild(g);
  }

  // ═══════════════════════════════════════
  // WORLD MAP
  // ═══════════════════════════════════════

  private renderWorld(state: BonksState): void {
    // Sky background
    const bg = new Graphics();
    bg.rect(0, 0, CANVAS_W, CANVAS_H).fill({ color: 0x4488CC });
    this.overlayContainer.addChild(bg);

    // Parallax hills
    const hills = new Graphics();
    for (let i = 0; i < 5; i++) {
      const hx = 80 + i * 200 + Math.sin(i * 1.7) * 40;
      const hy = CANVAS_H - 40;
      const hw = 160 + (i % 2) * 60;
      const hh = 80 + (i % 3) * 30;
      hills.ellipse(hx, hy, hw / 2, hh / 2).fill({ color: 0x44AA55, alpha: 0.3 });
    }
    this.overlayContainer.addChild(hills);

    // Ground area
    const ground = new Graphics();
    ground.rect(0, CANVAS_H - 60, CANVAS_W, 60).fill({ color: 0x3D8B37 });
    ground.rect(0, CANVAS_H - 60, CANVAS_W, 3).fill({ color: 0x2D7B27 });
    this.overlayContainer.addChild(ground);

    // Background clouds
    if (this.texturesReady && hasTex('bg-cloud')) {
      for (let i = 0; i < 5; i++) {
        const cx = (i * 220 + 60 + this.frameCount * 0.15) % (CANVAS_W + 200) - 100;
        const cy = 40 + (i % 3) * 25;
        const cloud = new Sprite(tex('bg-cloud'));
        cloud.x = cx;
        cloud.y = cy;
        cloud.alpha = 0.5;
        cloud.scale.set(1.8 + (i % 2) * 0.6);
        this.overlayContainer.addChild(cloud);
      }
    }

    // Decorative trees
    const trees = new Graphics();
    const treePositions = [40, 170, 350, 620, 830];
    for (const tx of treePositions) {
      const ty = CANVAS_H - 60;
      // Trunk
      trees.rect(tx - 4, ty - 35, 8, 35).fill({ color: 0x6B4226 });
      // Foliage
      trees.circle(tx, ty - 45, 18).fill({ color: 0x2D8B27 });
      trees.circle(tx - 10, ty - 35, 13).fill({ color: 0x3D9B37 });
      trees.circle(tx + 10, ty - 35, 13).fill({ color: 0x3D9B37 });
    }
    this.overlayContainer.addChild(trees);

    // Draw path lines connecting nodes
    const pathG = new Graphics();
    for (const node of WORLD_MAP) {
      for (const connIdx of node.connections) {
        const conn = WORLD_MAP[connIdx];
        if (connIdx < WORLD_MAP.indexOf(node)) continue; // draw each path once
        // Dotted gold line
        const dx = conn.x - node.x;
        const dy = conn.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dots = Math.floor(dist / 12);
        for (let i = 0; i <= dots; i++) {
          const t = i / dots;
          const px = node.x + dx * t;
          const py = node.y + dy * t;
          pathG.circle(px, py, 2).fill({ color: 0xCCAA44, alpha: 0.6 });
        }
      }
    }
    this.overlayContainer.addChild(pathG);

    // Draw nodes
    for (let i = 0; i < WORLD_MAP.length; i++) {
      const node = WORLD_MAP[i];
      const isSelected = i === state.worldMapIndex;
      const isCompleted = node.available && node.id >= 0 && state.completedLevels.includes(node.id);
      const isUnlocked = this.isNodeUnlockedForRender(i, state);
      const isComingSoon = !node.available;

      const nodeG = new Graphics();

      if (isCompleted) {
        // Completed: green circle with gold checkmark star
        nodeG.circle(node.x, node.y, 18).fill({ color: 0x33AA33 });
        nodeG.circle(node.x, node.y, 18).stroke({ color: 0x44CC44, width: 2 });
        // Checkmark
        nodeG.moveTo(node.x - 7, node.y).lineTo(node.x - 2, node.y + 6).lineTo(node.x + 8, node.y - 6);
        nodeG.stroke({ color: 0xFFDD00, width: 3 });
      } else if (isComingSoon) {
        // Coming soon: dimmed gray with "?"
        nodeG.circle(node.x, node.y, 16).fill({ color: 0x444444, alpha: 0.5 });
        nodeG.circle(node.x, node.y, 16).stroke({ color: 0x555555, width: 1 });
        this.overlayContainer.addChild(nodeG);
        this.drawCenteredAt('?', node.x, node.y - 6, 0x777777, this.overlayContainer);
        continue;
      } else if (!isUnlocked) {
        // Locked: gray circle with lock shape
        nodeG.circle(node.x, node.y, 16).fill({ color: 0x555555 });
        nodeG.circle(node.x, node.y, 16).stroke({ color: 0x666666, width: 1 });
        // Lock icon (simple rectangle + arc)
        nodeG.rect(node.x - 5, node.y - 1, 10, 8).fill({ color: 0x888888 });
        nodeG.rect(node.x - 5, node.y - 1, 10, 8).stroke({ color: 0x999999, width: 1 });
        nodeG.moveTo(node.x - 3, node.y - 1).lineTo(node.x - 3, node.y - 5);
        nodeG.bezierCurveTo(node.x - 3, node.y - 10, node.x + 3, node.y - 10, node.x + 3, node.y - 5);
        nodeG.lineTo(node.x + 3, node.y - 1);
        nodeG.stroke({ color: 0x999999, width: 1.5 });
      } else {
        // Available/unlocked: bright yellow circle, pulsing glow
        const pulse = Math.sin(this.frameCount * 0.06) * 0.2 + 0.8;
        if (isSelected) {
          nodeG.circle(node.x, node.y, 24).fill({ color: 0xFFDD00, alpha: 0.15 * pulse });
        }
        nodeG.circle(node.x, node.y, 18).fill({ color: 0xFFBB00 });
        nodeG.circle(node.x, node.y, 18).stroke({ color: 0xFFDD00, width: 2, alpha: pulse });
      }

      this.overlayContainer.addChild(nodeG);

      // Level name label above node
      this.drawCenteredAt(node.name, node.x, node.y - 28, 0xFFFFFF, this.overlayContainer);
    }

    // Player character on selected node
    const selectedNode = WORLD_MAP[state.worldMapIndex];
    if (selectedNode) {
      const bounce = Math.sin(this.frameCount * 0.08) * 3;
      const prefix = CHAR_PREFIXES[state.selectedCharacter];
      const texKey = `${prefix}-sm-idle`;
      if (this.texturesReady && hasTex(texKey)) {
        const spr = new Sprite(tex(texKey));
        spr.anchor.set(0.5, 1);
        spr.x = selectedNode.x;
        spr.y = selectedNode.y - 20 + bounce;
        spr.scale.set(SPRITE_SCALE);
        this.overlayContainer.addChild(spr);
      } else {
        const pg = new Graphics();
        const color = state.selectedCharacter === 'bojangles' ? 0x33BB33 : 0xE91E8C;
        pg.rect(selectedNode.x - 8, selectedNode.y - 40 + bounce, 16, 20).fill({ color });
        this.overlayContainer.addChild(pg);
      }
    }

    // World name header — dynamic based on selected node
    const selNode = WORLD_MAP[state.worldMapIndex];
    const worldNum = selNode ? (selNode.name.startsWith('2') ? 2 : 1) : 1;
    const worldLabel = worldNum === 2 ? 'WORLD 2: CLOUD KINGDOM' : 'WORLD 1: GREEN HILLS';
    this.drawCentered(worldLabel, 12, 0xFFDD00, this.overlayContainer, 1.3);
    const divW = 280;
    const div = new Graphics();
    div.rect(CANVAS_W / 2 - divW / 2, 34, divW, 1).fill({ color: 0xFFDD00, alpha: 0.3 });
    this.overlayContainer.addChild(div);

    // HUD bar at top (lives, coins, score)
    this.drawWorldHUD(state);

    // Selected node info at bottom
    if (selectedNode) {
      const infoBoxG = new Graphics();
      infoBoxG.roundRect(CANVAS_W / 2 - 200, CANVAS_H - 55, 400, 50, 6);
      infoBoxG.fill({ color: 0x000000, alpha: 0.6 });
      infoBoxG.roundRect(CANVAS_W / 2 - 200, CANVAS_H - 55, 400, 50, 6);
      infoBoxG.stroke({ color: 0xFFDD00, width: 1, alpha: 0.3 });
      this.overlayContainer.addChild(infoBoxG);

      const isComingSoon = !selectedNode.available;
      const isUnlocked = this.isNodeUnlockedForRender(state.worldMapIndex, state);

      this.drawCentered(
        `${selectedNode.name} - ${selectedNode.label}`,
        CANVAS_H - 50, 0xFFFFFF, this.overlayContainer,
      );

      if (isComingSoon) {
        this.drawCentered('COMING SOON', CANVAS_H - 32, 0x888888, this.overlayContainer);
      } else if (!isUnlocked) {
        this.drawCentered('LOCKED', CANVAS_H - 32, 0x888888, this.overlayContainer);
      } else if (Math.floor(this.frameCount / 30) % 2 === 0) {
        this.drawCentered('PRESS ENTER', CANVAS_H - 32, 0xFFDD00, this.overlayContainer, 1, 0.8);
      }
    }
  }

  private drawWorldHUD(state: BonksState): void {
    const bar = new Graphics();
    bar.rect(0, 0, CANVAS_W, 8).fill({ color: 0x000000, alpha: 0.0 });
    this.hudContainer.addChild(bar);

    // Lives (top-left area under header)
    const prefix = CHAR_PREFIXES[state.selectedCharacter];
    const portraitKey = `portrait-${prefix}`;
    if (this.texturesReady && hasTex(portraitKey)) {
      const portrait = new Sprite(tex(portraitKey));
      portrait.x = 14;
      portrait.y = 42;
      portrait.scale.set(1.2);
      this.hudContainer.addChild(portrait);
    }
    if (this.texturesReady && hasTex('hud-heart')) {
      for (let i = 0; i < state.lives; i++) {
        const heart = new Sprite(tex('hud-heart'));
        heart.x = 38 + i * 18;
        heart.y = 46;
        this.hudContainer.addChild(heart);
      }
    } else {
      this.drawText(`x${state.lives}`, 38, 46, 0xFF3333, this.hudContainer);
    }

    // Score (top-right)
    this.drawText(
      `SCORE ${state.score.toString().padStart(6, '0')}`,
      CANVAS_W - 110, 46, 0xFFFFFF, this.hudContainer,
    );
  }

  /** Mirror of BonksGame.isNodeUnlocked for rendering */
  private isNodeUnlockedForRender(nodeIndex: number, state: BonksState): boolean {
    if (nodeIndex === 0) return true;
    for (let i = 0; i < nodeIndex; i++) {
      const prevNode = WORLD_MAP[i];
      if (prevNode.available && prevNode.id >= 0) {
        if (!state.completedLevels.includes(prevNode.id)) return false;
      }
    }
    return true;
  }

  // ═══════════════════════════════════════
  // GAMEPLAY (used by playing, dying, complete, and title background)
  // ═══════════════════════════════════════

  private renderGameplay(state: BonksState): void {
    this.renderGameplayWorld(state);

    // Warp animation overlay
    if (state.warpAnim) {
      this.drawWarpAnimOverlay(state);
    }

    // HUD (not shown during title)
    this.drawHUD(state);

    // Hint text — fixed position below HUD bar
    if (state.hintText && state.phase === 'playing') {
      const alpha = state.hintTimer > 0 ? Math.min(1, state.hintTimer / 20) : 0.85;
      const tw = state.hintText.length * (FONT_W + 1) * PX + 12;
      const hx = CANVAS_W / 2;
      const hy = 36;
      const pill = new Graphics();
      pill.roundRect(hx - tw / 2, hy - 4, tw, 18, 6).fill({ color: 0x000000, alpha: alpha * 0.7 });
      this.hudContainer.addChild(pill);
      this.drawText(state.hintText, hx - tw / 2 + 6, hy, 0xFFDD00, this.hudContainer, 1, alpha);
    }
  }

  private drawWarpAnimOverlay(state: BonksState): void {
    const wa = state.warpAnim;
    if (!wa) return;

    const g = new Graphics();

    if (wa.phase === 'dig') {
      const cx = state.player.x - state.cameraX + state.player.width / 2;
      const cy = state.player.y - state.cameraY + state.player.height;
      const progress = 1 - wa.timer / 30;
      const numParticles = Math.floor(progress * 12);
      for (let i = 0; i < numParticles; i++) {
        const angle = (i / 12) * Math.PI * 2 + this.frameCount * 0.3;
        const radius = 10 + progress * 25;
        const px = cx + Math.cos(angle) * radius;
        const py = cy - Math.sin(angle) * radius * 0.6 - progress * 20;
        const size = 3 + Math.random() * 3;
        g.rect(px - size / 2, py - size / 2, size, size).fill({ color: 0x8B6534, alpha: 0.7 });
      }
      // Slight screen shake
      if (wa.timer % 4 < 2) {
        this.worldContainer.x = (Math.random() - 0.5) * 3;
        this.worldContainer.y = (Math.random() - 0.5) * 3;
      } else {
        this.worldContainer.x = 0;
        this.worldContainer.y = 0;
      }
    } else if (wa.phase === 'sink') {
      const progress = 1 - wa.timer / 20;
      const cx = state.player.x - state.cameraX + state.player.width / 2;
      const cy = state.player.y - state.cameraY + state.player.height / 2;
      const maxR = Math.max(CANVAS_W, CANVAS_H);
      const r = maxR * (1 - progress);
      // Draw black with a hole (approximate with 4 rects)
      if (r < maxR * 0.95) {
        const alpha = Math.min(1, progress * 1.5);
        // Top
        g.rect(0, 0, CANVAS_W, Math.max(0, cy - r)).fill({ color: 0x000000, alpha });
        // Bottom
        g.rect(0, cy + r, CANVAS_W, CANVAS_H - cy - r).fill({ color: 0x000000, alpha });
        // Left
        g.rect(0, cy - r, Math.max(0, cx - r), r * 2).fill({ color: 0x000000, alpha });
        // Right
        g.rect(cx + r, cy - r, CANVAS_W - cx - r, r * 2).fill({ color: 0x000000, alpha });
      }
      this.worldContainer.x = 0;
      this.worldContainer.y = 0;
    } else if (wa.phase === 'blackout') {
      // Full black screen
      g.rect(0, 0, CANVAS_W, CANVAS_H).fill({ color: 0x000000, alpha: 1 });
      // Text in center
      const text = wa.type === 'dig-down' ? 'GOING UNDERGROUND...' : 'RETURNING TO SURFACE...';
      const tw = text.length * (FONT_W + 1) * PX;
      this.drawText(text, CANVAS_W / 2 - tw / 2, CANVAS_H / 2 - 6, 0xFFDD00, this.overlayContainer);
      this.worldContainer.x = 0;
      this.worldContainer.y = 0;
    } else if (wa.phase === 'arrive') {
      const progress = 1 - wa.timer / 20;
      const cx = state.player.x - state.cameraX + state.player.width / 2;
      const cy = state.player.y - state.cameraY + state.player.height / 2;
      const maxR = Math.max(CANVAS_W, CANVAS_H);
      const r = maxR * progress;
      const alpha = Math.max(0, 1 - progress * 1.5);
      if (alpha > 0.01) {
        g.rect(0, 0, CANVAS_W, Math.max(0, cy - r)).fill({ color: 0x000000, alpha });
        g.rect(0, cy + r, CANVAS_W, CANVAS_H - cy - r).fill({ color: 0x000000, alpha });
        g.rect(0, cy - r, Math.max(0, cx - r), r * 2).fill({ color: 0x000000, alpha });
        g.rect(cx + r, cy - r, CANVAS_W - cx - r, r * 2).fill({ color: 0x000000, alpha });
      }
      this.worldContainer.x = 0;
      this.worldContainer.y = 0;
    }

    this.overlayContainer.addChild(g);
  }

  private renderGameplayWorld(state: BonksState): void {
    const cam = state.cameraX;
    const camY = state.cameraY;
    const bgColor = state.inSubLevel ? 0x222244 : (LEVELS[state.level]?.bgColor ?? 0x6699FF);

    // Sky
    const sky = new Graphics();
    sky.rect(0, 0, CANVAS_W, CANVAS_H).fill({ color: bgColor });
    this.bgContainer.addChild(sky);

    if (!state.inSubLevel) this.drawBackground(cam, state);
    this.drawWater(state, cam, camY);
    this.drawTiles(state, cam, camY);
    this.drawDigSpotIndicators(state, cam, camY);
    this.drawPowerUpItems(state, cam, camY);
    this.drawMovingPlatforms(state, cam, camY);
    this.drawCoins(state, cam, camY);
    this.drawEnemies(state, cam, camY);
    this.drawCompanion(state, cam, camY);

    if (state.player.alive) {
      this.drawPlayer(state, cam, camY);
    } else if (state.phase === 'dying') {
      if (Math.floor(state.transitionTimer / 4) % 2 === 0) {
        this.drawPlayer(state, cam, camY);
      }
    }

    this.drawFireballs(state, cam, camY);
    this.drawParticles(state, cam, camY);
    this.drawFlag(state, cam, camY);
  }

  // ═══════════════════════════════════════
  // BACKGROUND
  // ═══════════════════════════════════════

  private drawBackground(cam: number, state: BonksState): void {
    if (!this.texturesReady) return;

    const cloudTex = hasTex('bg-cloud') ? tex('bg-cloud') : null;
    if (cloudTex) {
      const cloudOffset = cam * 0.2;
      for (let i = 0; i < 8; i++) {
        const cx = (i * 250 + 100 - cloudOffset) % (state.levelWidth * 0.5 || 2000);
        if (cx < -150 || cx > CANVAS_W + 150) continue;
        const cy = 30 + (i % 3) * 40;
        const cloud = new Sprite(cloudTex);
        cloud.x = cx;
        cloud.y = cy;
        cloud.alpha = 0.6;
        cloud.scale.set(2);
        this.bgContainer.addChild(cloud);
      }
    }

    const hillTex = hasTex('bg-hill') ? tex('bg-hill') : null;
    if (hillTex) {
      const hillOffset = cam * 0.5;
      for (let i = 0; i < 6; i++) {
        const hx = (i * 350 + 50 - hillOffset) % (state.levelWidth * 0.7 || 2000);
        if (hx < -200 || hx > CANVAS_W + 200) continue;
        const hill = new Sprite(hillTex);
        hill.x = hx;
        hill.y = CANVAS_H - 50 - (i % 2) * 20;
        hill.alpha = 0.4;
        hill.scale.set(3);
        this.bgContainer.addChild(hill);
      }
    }

    const bushTex = hasTex('bg-bush') ? tex('bg-bush') : null;
    if (bushTex) {
      const bushOffset = cam * 0.5;
      for (let i = 0; i < 10; i++) {
        const bx = (i * 200 + 150 - bushOffset) % (state.levelWidth * 0.7 || 2000);
        if (bx < -100 || bx > CANVAS_W + 100) continue;
        const bush = new Sprite(bushTex);
        bush.x = bx;
        bush.y = CANVAS_H - 20;
        bush.alpha = 0.35;
        bush.scale.set(2);
        this.bgContainer.addChild(bush);
      }
    }
  }

  // ═══════════════════════════════════════
  // WATER (fills gaps in ground)
  // ═══════════════════════════════════════

  private drawWater(state: BonksState, cam: number, camY: number): void {
    if (state.inSubLevel) return;
    // Cloud Kingdom has no water — bottomless pits instead
    const level = LEVELS[state.level];
    if (level && level.world >= 2) return;
    // Main level ground is always at rows 11-12 regardless of total level height
    const groundRow = 11;
    const groundRow2 = 12;

    const startCol = Math.max(0, Math.floor(cam / TILE) - 1);
    const endCol = Math.min((state.tiles[0]?.length ?? 0), Math.ceil((cam + CANVAS_W) / TILE) + 1);
    // Offset water surface 6px below ground tile top so waves never peek above ground
    const waterSurface = groundRow * TILE - camY + 6;
    const waterBottom = CANVAS_H + 20;

    const g = new Graphics();
    for (let col = startCol; col < endCol; col++) {
      // Only draw water where both ground rows are empty (full gap)
      const t1 = getTile(state.tiles, col, groundRow);
      const t2 = getTile(state.tiles, col, groundRow2);
      if (isSolid(t1) || isSolid(t2)) continue;
      const x = col * TILE - cam;

      // Deep water body
      g.rect(x, waterSurface + 8, TILE, waterBottom - waterSurface).fill({ color: 0x1155AA, alpha: 0.85 });
      // Surface layer with wave (only oscillates downward)
      const wave = Math.abs(Math.sin(this.frameCount * 0.06 + col * 0.8)) * 4;
      g.rect(x, waterSurface + wave, TILE, 10).fill({ color: 0x3399DD, alpha: 0.7 });
      // Foam / highlights
      const foam = Math.abs(Math.sin(this.frameCount * 0.04 + col * 1.2)) * 2;
      g.rect(x + 4, waterSurface + wave + foam, TILE - 8, 3).fill({ color: 0x88CCFF, alpha: 0.5 });
    }
    this.bgContainer.addChild(g);

    // Sparkle dots
    const sparkles = new Graphics();
    for (let col = startCol; col < endCol; col++) {
      const t1 = getTile(state.tiles, col, groundRow);
      const t2 = getTile(state.tiles, col, groundRow2);
      if (isSolid(t1) || isSolid(t2)) continue;
      if ((col + Math.floor(this.frameCount / 20)) % 4 !== 0) continue;
      const x = col * TILE - cam + TILE / 2;
      const sparkY = waterSurface + 16 + Math.sin(this.frameCount * 0.05 + col) * 5;
      const alpha = (Math.sin(this.frameCount * 0.1 + col * 2) + 1) * 0.3;
      sparkles.circle(x, sparkY, 1.5).fill({ color: 0xFFFFFF, alpha });
    }
    this.bgContainer.addChild(sparkles);
  }

  // ═══════════════════════════════════════
  // MOVING PLATFORMS (Cloud Kingdom)
  // ═══════════════════════════════════════

  private drawMovingPlatforms(state: BonksState, cam: number, camY: number): void {
    if (state.movingPlatforms.length === 0) return;

    for (const mp of state.movingPlatforms) {
      const x = mp.x - cam;
      if (x < -mp.width || x > 900 + mp.width) continue;
      const y = mp.y - camY;

      const g = new Graphics();
      // Cloud platform body — fluffy cloud shape
      const w = mp.width;
      const h = 14;

      // Main cloud body (rounded rectangle)
      g.roundRect(x + 2, y + 2, w - 4, h, 6).fill({ color: 0xFFFFFF, alpha: 0.95 });

      // Cloud puffs on top
      const puffR = 10;
      g.circle(x + w * 0.2, y + 2, puffR).fill({ color: 0xFFFFFF });
      g.circle(x + w * 0.5, y - 2, puffR + 2).fill({ color: 0xFFFFFF });
      g.circle(x + w * 0.8, y + 2, puffR).fill({ color: 0xFFFFFF });

      // Light shading
      g.roundRect(x + 4, y + h - 4, w - 8, 4, 3).fill({ color: 0xDDDDEE, alpha: 0.5 });

      // Subtle outline
      g.roundRect(x + 2, y + 2, w - 4, h, 6).stroke({ color: 0xBBBBCC, width: 1, alpha: 0.4 });

      this.tileContainer.addChild(g);
    }
  }

  // ═══════════════════════════════════════
  // TILES
  // ═══════════════════════════════════════

  private drawTiles(state: BonksState, cam: number, camY: number): void {
    const startCol = Math.max(0, Math.floor(cam / TILE) - 1);
    const endCol = Math.min((state.tiles[0]?.length ?? 0), Math.ceil((cam + CANVAS_W) / TILE) + 1);
    const startRow = Math.max(0, Math.floor(camY / TILE) - 1);
    const endRow = Math.min(state.tiles.length, Math.ceil((camY + CANVAS_H) / TILE) + 1);

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const tile = getTile(state.tiles, col, row);
        if (tile === '.' || tile === 'S' || tile === 'E' || tile === 'C' || tile === 'G'
            || tile === 'k' || tile === 'D' || tile === 'W' || tile === 'V'
            || tile === 'L' || tile === 'M') continue;

        const x = col * TILE - cam;
        const y = row * TILE - camY;
        const texName = this.getTileTexture(tile, col, row, state);

        if (texName && this.texturesReady && hasTex(texName)) {
          const spr = new Sprite(tex(texName));
          spr.x = x;
          spr.y = y;
          this.tileContainer.addChild(spr);
        } else {
          const g = new Graphics();
          g.rect(x, y, TILE, TILE).fill({ color: this.getFallbackTileColor(tile) });
          this.tileContainer.addChild(g);
        }
      }
    }
  }

  private getTileTexture(tile: string, col: number, row: number, state: BonksState): string | null {
    switch (tile) {
      case '#': return 'tile-ground';
      case 'B': {
        const isUsed = state.questionBlocks.some(q => q.col === col && q.row === row && q.hit);
        return isUsed ? 'tile-used' : 'tile-brick';
      }
      case '?': case 'R': case 'X': {
        const qb = state.questionBlocks.find(q => q.col === col && q.row === row);
        if (qb?.hit) return 'tile-used';
        const frame = Math.floor(this.frameCount / 15) % 2;
        return frame === 0 ? 'tile-question1' : 'tile-question2';
      }
      case 'P': return 'tile-pipe-top';
      case 'p': return 'tile-pipe-body';
      case 'H': return 'tile-dig-spot'; // dig spot — dirt mound
      case 'I': return 'tile-platform'; // one-way platform
      case 'F': return null;
      default: return null;
    }
  }

  private drawDigSpotIndicators(state: BonksState, cam: number, camY: number): void {
    if (state.inSubLevel) return;
    for (const dig of state.digSpots) {
      const x = dig.x + TILE / 2 - cam;
      if (x < -TILE || x > CANVAS_W + TILE) continue;
      const bob = Math.sin(this.frameCount * 0.08) * 4;
      const y = dig.y - TILE - 8 + bob - camY;
      const g = new Graphics();
      g.moveTo(x, y + 12).lineTo(x - 6, y).lineTo(x + 6, y).closePath();
      g.fill({ color: 0xFFDD00, alpha: 0.8 });
      this.tileContainer.addChild(g);
    }
  }

  private getFallbackTileColor(tile: string): number {
    switch (tile) {
      case '#': return 0x8B6534;
      case 'B': return 0xC87533;
      case '?': case 'R': case 'X': return 0xF5C542;
      case 'P': case 'p': return 0x33AA33;
      case 'H': return 0x8B6534;
      case 'I': return 0x8B7355;
      default: return 0x888888;
    }
  }

  // ═══════════════════════════════════════
  // PLAYER
  // ═══════════════════════════════════════

  private drawPlayer(state: BonksState, cam: number, camY: number): void {
    const p = state.player;
    const x = p.x - cam;
    let y = p.y - camY;

    // When riding Chonk, lower player to sit into Chonk's body
    const mounted = state.companion?.mounted;
    if (mounted && state.companion) {
      const ch = state.companion;
      // Player bottom at ~45% down Chonk's body (riding, not standing on head)
      y = ch.y + Math.round(ch.height * 0.45) - p.height - camY;
    }

    if (p.invincible > 0 && Math.floor(p.invincible / 3) % 2 === 0) return;

    const prefix = CHAR_PREFIXES[p.character];
    const size = p.powerUp === 'none' ? 'sm' : (p.powerUp === 'fire' ? 'fire' : 'bg');
    // Use idle frame when mounted (sitting pose)
    const frame = mounted ? 'idle' : this.getPlayerFrame(p);
    const texKey = `${prefix}-${size}-${frame}`;

    const centerX = x + p.width / 2;

    if (this.texturesReady && hasTex(texKey)) {
      const spr = new Sprite(tex(texKey));
      spr.anchor.set(0.5, 1);
      spr.x = centerX;
      spr.y = y + p.height;
      spr.scale.x = p.facing === 'right' ? -SPRITE_SCALE : SPRITE_SCALE;
      // Squish vertically when mounted to suggest sitting pose
      spr.scale.y = mounted ? SPRITE_SCALE * 0.8 : SPRITE_SCALE;

      if (p.growTimer > 0 && Math.floor(p.growTimer / 3) % 2 === 0) {
        spr.alpha = 0.5;
      }

      this.entityContainer.addChild(spr);
    } else {
      const g = new Graphics();
      const color = p.character === 'bojangles' ? 0x33BB33 : 0xE91E8C;
      g.rect(x, y, p.width, p.height).fill({ color });
      this.entityContainer.addChild(g);
    }

    // BooBonks umbrella float visual (sprite)
    if (p.floating && p.character === 'boobonks' && this.texturesReady && hasTex('item-umbrella')) {
      const spr = new Sprite(tex('item-umbrella'));
      spr.anchor.set(0.5, 1);
      spr.x = centerX;
      spr.y = y - 2;
      spr.scale.set(SPRITE_SCALE);
      this.entityContainer.addChild(spr);
    }
  }

  private getPlayerFrame(p: { animState: string; frame: number }): string {
    switch (p.animState) {
      case 'idle': return 'idle';
      case 'walk': case 'run': case 'skid': {
        const walkCycle = Math.floor(p.frame / 8) % 2;
        return walkCycle === 0 ? 'walk1' : 'walk2';
      }
      case 'jump': case 'wallkick': return 'jump';
      case 'fall': return 'fall';
      case 'death': return 'death';
      case 'grow': case 'shrink': {
        return Math.floor(p.frame / 3) % 2 === 0 ? 'idle' : 'jump';
      }
      default: return 'idle';
    }
  }

  // ═══════════════════════════════════════
  // ENEMIES
  // ═══════════════════════════════════════

  private drawEnemies(state: BonksState, cam: number, camY: number): void {
    for (const e of state.enemies) {
      if (!e.alive && e.squished <= 0) continue;
      const x = e.x - cam;
      if (x < -TILE * 2 || x > CANVAS_W + TILE * 2) continue;

      if (e.type === 'plant') {
        this.drawPlantEnemy(e, x, camY);
        continue;
      }

      if (e.type === 'boss') {
        this.drawBoss(e, x, camY);
        continue;
      }

      const texKey = this.getEnemyTexture(e);
      const eCenterX = x + e.width / 2;
      const ey = e.y - camY;

      if (texKey && this.texturesReady && hasTex(texKey)) {
        const spr = new Sprite(tex(texKey));
        spr.anchor.set(0.5, 1);
        spr.x = eCenterX;
        spr.y = ey + e.height;
        const flipX = (e.vx > 0 && e.state !== 'shell' && e.state !== 'shell-slide') ? -1 : 1;
        spr.scale.x = flipX * SPRITE_SCALE;
        spr.scale.y = SPRITE_SCALE;
        this.entityContainer.addChild(spr);
      } else {
        const g = new Graphics();
        const color = e.type === 'goomba' ? 0x996644 : 0x44BB44;
        if (e.squished > 0) {
          g.ellipse(x + e.width / 2, ey + e.height - 4, e.width / 2, 4).fill({ color });
        } else {
          g.rect(x, ey, e.width, e.height).fill({ color });
        }
        this.entityContainer.addChild(g);
      }
    }
  }

  private drawPlantEnemy(e: { x: number; y: number; width: number; height: number; frame: number; startY: number }, screenX: number, camY: number): void {
    const phase = e.frame % PLANT_CYCLE;
    const halfCycle = PLANT_CYCLE / 2;
    const isUp = phase >= halfCycle;

    let visibleHeight: number;
    if (!isUp) {
      visibleHeight = 8;
    } else {
      const upProgress = (phase - halfCycle) / 15;
      visibleHeight = 8 + Math.min(1, upProgress) * PLANT_UP_HEIGHT;
    }

    const baseY = e.startY + TILE - 8 - camY;
    const topY = baseY - visibleHeight;
    const centerX = screenX + e.width / 2;

    const texKey = isUp && visibleHeight > 20 ? 'enemy-plant-up' : 'enemy-plant-hidden';
    if (this.texturesReady && hasTex(texKey)) {
      const spr = new Sprite(tex(texKey));
      spr.anchor.set(0.5, 1);
      spr.x = centerX;
      spr.y = baseY;
      spr.scale.set(SPRITE_SCALE);
      if (isUp && visibleHeight > 20) {
        spr.scale.y = SPRITE_SCALE * (visibleHeight / (TILE * 1.4));
      }
      this.entityContainer.addChild(spr);
    } else {
      const g = new Graphics();
      g.rect(centerX - 3, topY + 12, 6, visibleHeight - 12).fill({ color: 0x33AA33 });
      if (visibleHeight > 20) {
        g.circle(centerX, topY + 8, 8).fill({ color: 0x9933CC });
        g.circle(centerX - 3, topY + 7, 2).fill({ color: 0xFF3333 });
        g.circle(centerX + 3, topY + 7, 2).fill({ color: 0xFF3333 });
        g.circle(centerX - 8, topY + 4, 2).fill({ color: 0x664422 });
        g.circle(centerX + 8, topY + 4, 2).fill({ color: 0x664422 });
      }
      g.rect(centerX - 6, baseY - 6, 12, 6).fill({ color: 0x55AA22 });
      this.entityContainer.addChild(g);
    }
  }

  private drawBoss(e: EnemyState, screenX: number, camY: number): void {
    const g = new Graphics();
    const ey = e.y - camY;
    const cx = screenX + e.width / 2;
    const cy = ey + e.height / 2;
    const w = e.width;
    const h = e.height;

    // Stun flash — alpha oscillation
    const stunned = (e.stunTimer ?? 0) > 0;
    if (stunned && Math.floor(this.frameCount / 3) % 2 === 0) return;

    // Death animation — shrink
    if (e.squished > 0) {
      const shrink = e.squished / 60;
      const sw = w * shrink;
      const sh = h * shrink;
      g.rect(cx - sw / 2, ey + h - sh, sw, sh).fill({ color: 0x884422 });
      // Eyes X's
      g.moveTo(cx - 12, ey + h - sh + 10).lineTo(cx - 4, ey + h - sh + 18);
      g.moveTo(cx - 4, ey + h - sh + 10).lineTo(cx - 12, ey + h - sh + 18);
      g.stroke({ color: 0xFFFFFF, width: 2 });
      g.moveTo(cx + 4, ey + h - sh + 10).lineTo(cx + 12, ey + h - sh + 18);
      g.moveTo(cx + 12, ey + h - sh + 10).lineTo(cx + 4, ey + h - sh + 18);
      g.stroke({ color: 0xFFFFFF, width: 2 });
      this.entityContainer.addChild(g);
      return;
    }

    const phase = e.bossPhase ?? 0;

    // Body (large rounded rectangle)
    const bodyColor = [0x884422, 0xAA4422, 0xCC2200][phase] ?? 0x884422;
    g.roundRect(screenX + 4, ey + 8, w - 8, h - 8, 12).fill({ color: bodyColor });
    // Darker belly
    g.roundRect(screenX + 16, ey + h * 0.4, w - 32, h * 0.45, 8).fill({ color: 0xBB8855 });

    // Crown
    const crownY = ey - 4;
    g.rect(cx - 20, crownY, 40, 12).fill({ color: 0xFFDD00 });
    // Crown points
    g.moveTo(cx - 20, crownY).lineTo(cx - 16, crownY - 10).lineTo(cx - 10, crownY).fill({ color: 0xFFDD00 });
    g.moveTo(cx - 5, crownY).lineTo(cx, crownY - 14).lineTo(cx + 5, crownY).fill({ color: 0xFFDD00 });
    g.moveTo(cx + 10, crownY).lineTo(cx + 16, crownY - 10).lineTo(cx + 20, crownY).fill({ color: 0xFFDD00 });
    // Crown jewels
    g.circle(cx, crownY - 8, 3).fill({ color: 0xFF2222 });
    g.circle(cx - 14, crownY - 4, 2).fill({ color: 0x22FF22 });
    g.circle(cx + 14, crownY - 4, 2).fill({ color: 0x2222FF });

    // Eyes
    const eyeY = ey + 20;
    const blink = this.frameCount % 120 < 5;
    // Angry eyebrows
    g.moveTo(cx - 20, eyeY - 8).lineTo(cx - 8, eyeY - 4);
    g.stroke({ color: 0x000000, width: 3 });
    g.moveTo(cx + 8, eyeY - 4).lineTo(cx + 20, eyeY - 8);
    g.stroke({ color: 0x000000, width: 3 });
    if (blink) {
      g.rect(cx - 18, eyeY, 12, 3).fill({ color: 0x000000 });
      g.rect(cx + 6, eyeY, 12, 3).fill({ color: 0x000000 });
    } else {
      // White sclera
      g.ellipse(cx - 12, eyeY + 2, 9, 7).fill({ color: 0xFFFFFF });
      g.ellipse(cx + 12, eyeY + 2, 9, 7).fill({ color: 0xFFFFFF });
      // Pupils (look at player direction based on vx)
      const lookDir = e.vx < 0 ? -2 : e.vx > 0 ? 2 : 0;
      g.circle(cx - 12 + lookDir, eyeY + 2, 4).fill({ color: 0x000000 });
      g.circle(cx + 12 + lookDir, eyeY + 2, 4).fill({ color: 0x000000 });
      // Red tint for angry phases
      if (phase >= 1) {
        g.circle(cx - 12 + lookDir, eyeY + 2, 2).fill({ color: 0xFF0000 });
        g.circle(cx + 12 + lookDir, eyeY + 2, 2).fill({ color: 0xFF0000 });
      }
    }

    // Mouth — wider grimace when angrier
    const mouthY = ey + 42;
    const mouthW = 12 + phase * 6;
    g.roundRect(cx - mouthW, mouthY, mouthW * 2, 10, 4).fill({ color: 0x000000 });
    // Teeth
    for (let i = 0; i < 4 + phase; i++) {
      const tx = cx - mouthW + 4 + i * (mouthW * 2 - 8) / (3 + phase);
      g.rect(tx, mouthY, 4, 5).fill({ color: 0xFFFFFF });
    }

    // Arms (simple rectangles)
    const armWave = Math.sin(this.frameCount * 0.1) * 5;
    g.roundRect(screenX - 8, ey + 28 + armWave, 14, 30, 4).fill({ color: bodyColor });
    g.roundRect(screenX + w - 6, ey + 28 - armWave, 14, 30, 4).fill({ color: bodyColor });
    // Fists
    g.circle(screenX, ey + 58 + armWave, 8).fill({ color: bodyColor });
    g.circle(screenX + w + 2, ey + 58 - armWave, 8).fill({ color: bodyColor });

    // Feet
    g.ellipse(cx - 16, ey + h - 2, 14, 6).fill({ color: 0x442211 });
    g.ellipse(cx + 16, ey + h - 2, 14, 6).fill({ color: 0x442211 });

    this.entityContainer.addChild(g);

    // HP bar above boss
    const hp = e.hp ?? 3;
    const maxHp = 3;
    const barW = 60;
    const barH = 8;
    const barX = cx - barW / 2;
    const barY = ey - 24;

    const hpBar = new Graphics();
    // Background
    hpBar.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 3).fill({ color: 0x000000, alpha: 0.7 });
    // HP pips
    for (let i = 0; i < maxHp; i++) {
      const pipX = barX + 2 + i * ((barW - 4) / maxHp);
      const pipW = (barW - 8) / maxHp;
      const color = i < hp ? 0xFF3333 : 0x333333;
      hpBar.roundRect(pipX, barY + 1, pipW, barH - 2, 2).fill({ color });
    }
    this.entityContainer.addChild(hpBar);

    // Boss name label
    this.drawCenteredAt('KING GRUMBLE', cx, barY - 14, 0xFFDD00, this.entityContainer);
  }

  private getEnemyTexture(e: { type: string; state: string; squished: number; frame: number }): string | null {
    const walkFrame = Math.floor(e.frame / 12) % 2 + 1;
    switch (e.type) {
      case 'goomba':
        if (e.squished > 0) return 'enemy-goomba-squish';
        return `enemy-goomba-walk${walkFrame}`;
      case 'koopa':
        if (e.state === 'shell' || e.state === 'shell-slide') return 'enemy-koopa-shell';
        return `enemy-koopa-walk${walkFrame}`;
      case 'ladybug':
        if (e.squished > 0) return 'enemy-ladybug-squish';
        return `enemy-ladybug-fly${walkFrame}`;
      default:
        return null;
    }
  }

  // ═══════════════════════════════════════
  // COMPANION (CHONK)
  // ═══════════════════════════════════════

  private drawCompanion(state: BonksState, cam: number, camY: number): void {
    const ch = state.companion;
    if (!ch || !ch.alive) return;

    const x = ch.x - cam;
    if (x < -TILE * 2 || x > CANVAS_W + TILE * 2) return;

    const anim = ch.anim;
    let frame: string;
    switch (anim) {
      case 'walk': frame = Math.floor(ch.frame / 8) % 2 === 0 ? 'walk1' : 'walk2'; break;
      case 'jump': frame = 'jump'; break;
      case 'fall': case 'dive': frame = 'fall'; break;
      case 'tongue': frame = 'tongue'; break;
      case 'slam': frame = 'idle'; break;
      default: frame = 'idle'; break;
    }

    const texKey = `ch-sm-${frame}`;
    const centerX = x + ch.width / 2;
    const CHONK_SCALE = SPRITE_SCALE * 1.3;
    const cy = ch.y - camY;

    if (this.texturesReady && hasTex(texKey)) {
      const spr = new Sprite(tex(texKey));
      spr.anchor.set(0.5, 1);
      spr.x = centerX;
      spr.y = cy + ch.height;
      spr.scale.x = ch.facing === 'right' ? -CHONK_SCALE : CHONK_SCALE;
      spr.scale.y = CHONK_SCALE;

      if (ch.runningAway && Math.floor(ch.frame / 4) % 2 === 0) {
        spr.alpha = 0.4;
      }

      this.entityContainer.addChild(spr);
    } else {
      const g = new Graphics();
      g.rect(x, cy, ch.width, ch.height).fill({ color: 0xFFFFFF });
      this.entityContainer.addChild(g);
    }

    if (ch.tongueTimer > 0 && ch.mounted) {
      const progress = ch.tongueTimer / CHONK_TONGUE_FRAMES;
      const extend = Math.sin(progress * Math.PI) * CHONK_TONGUE_RANGE;
      const dir = ch.facing === 'right' ? 1 : -1;
      const tongueStartX = centerX + dir * (ch.width / 2);
      const tongueY = cy + ch.height * 0.55;
      const g = new Graphics();
      const tw = extend * dir;
      g.rect(
        Math.min(tongueStartX, tongueStartX + tw),
        tongueY - 3,
        Math.abs(tw),
        6,
      ).fill({ color: 0xFF6699, alpha: 0.9 });
      g.circle(tongueStartX + tw, tongueY, 5).fill({ color: 0xDD4477 });
      this.entityContainer.addChild(g);
    }

    // Dive slam shockwave visual
    if (ch.slamTimer > 0 && ch.mounted) {
      const progress = 1 - ch.slamTimer / 15;
      const radius = TILE * 3 * progress;
      const sg = new Graphics();
      sg.circle(centerX, cy + ch.height, radius).stroke({
        color: 0xFFAA00,
        width: 3 * (1 - progress),
        alpha: 0.7 * (1 - progress),
      });
      sg.circle(centerX, cy + ch.height, radius * 0.6).stroke({
        color: 0xFFDD44,
        width: 2 * (1 - progress),
        alpha: 0.5 * (1 - progress),
      });
      this.entityContainer.addChild(sg);
    }
  }

  // ═══════════════════════════════════════
  // COINS
  // ═══════════════════════════════════════

  private drawCoins(state: BonksState, cam: number, camY: number): void {
    for (const coin of state.coins) {
      if (coin.collected) continue;
      const x = coin.x - cam;
      if (x < -TILE || x > CANVAS_W + TILE) continue;
      const cy = coin.y - camY;

      if (this.texturesReady && hasTex('item-coin')) {
        const spr = new Sprite(tex('item-coin'));
        spr.x = x;
        spr.y = cy + (coin.floating ? Math.sin(this.frameCount * 0.08 + coin.x * 0.05) * 3 : 0);
        this.entityContainer.addChild(spr);
      } else {
        const g = new Graphics();
        g.circle(x + 8, cy + 8, 6).fill({ color: 0xFFD700 });
        this.entityContainer.addChild(g);
      }
    }
  }

  // ═══════════════════════════════════════
  // POWER-UP ITEMS
  // ═══════════════════════════════════════

  private drawPowerUpItems(state: BonksState, cam: number, camY: number): void {
    for (const item of state.powerUpItems) {
      if (!item.alive) continue;
      const x = item.x - cam;
      if (x < -TILE || x > CANVAS_W + TILE) continue;
      const iy = item.y - camY;

      const texKey = item.type === 'mushroom' ? 'item-mushroom' : 'item-flower';
      if (this.texturesReady && hasTex(texKey)) {
        const spr = new Sprite(tex(texKey));
        spr.x = x;
        spr.y = iy;
        this.entityContainer.addChild(spr);
      } else {
        const g = new Graphics();
        g.rect(x, iy, TILE, TILE).fill({ color: 0xFF00FF });
        this.entityContainer.addChild(g);
      }
    }
  }

  // ═══════════════════════════════════════
  // FIREBALLS
  // ═══════════════════════════════════════

  private drawFireballs(state: BonksState, cam: number, camY: number): void {
    for (const fb of state.player.fireballs) {
      if (!fb.alive) continue;
      const x = fb.x - cam;
      const fy = fb.y - camY;
      if (this.texturesReady && hasTex('fx-fireball')) {
        const spr = new Sprite(tex('fx-fireball'));
        spr.x = x + 6;
        spr.y = fy + 6;
        spr.rotation = this.frameCount * 0.4;
        spr.anchor.set(0.5);
        spr.scale.set(1.8);
        this.entityContainer.addChild(spr);
      } else {
        const g = new Graphics();
        g.circle(x + 6, fy + 6, 7).fill({ color: 0xFF8833 });
        g.circle(x + 6, fy + 6, 4).fill({ color: 0xFFDD44 });
        this.entityContainer.addChild(g);
      }
    }
  }

  // ═══════════════════════════════════════
  // FLAG
  // ═══════════════════════════════════════

  private drawFlag(state: BonksState, cam: number, camY: number): void {
    for (let row = 0; row < state.tiles.length; row++) {
      for (let col = 0; col < (state.tiles[row]?.length ?? 0); col++) {
        if (getTile(state.tiles, col, row) !== 'F') continue;
        const x = col * TILE - cam;
        if (x < -80 || x > CANVAS_W + 80) continue;

        const g = new Graphics();
        const poleX = x + TILE / 2;
        const baseY = (row + 1) * TILE - camY;
        const poleHeight = TILE * 7;
        const topY = baseY - poleHeight;

        // Pole
        g.rect(poleX - 2, topY, 4, poleHeight).fill({ color: 0x888888 });
        g.rect(poleX - 1, topY, 2, poleHeight).fill({ color: 0xAAAAAA }); // highlight

        // Gold ball on top
        g.circle(poleX, topY - 3, 5).fill({ color: 0xFFDD00 });
        g.circle(poleX - 1, topY - 4, 2).fill({ color: 0xFFFF88 }); // shine

        // Flag pennant (waves in the wind)
        const wave = Math.sin(this.frameCount * 0.08) * 4;
        const wave2 = Math.sin(this.frameCount * 0.08 + 1) * 3;
        const flagPY = state.flagReached ? baseY - TILE * 2 : topY + 4;
        g.moveTo(poleX + 2, flagPY);
        g.lineTo(poleX + 30 + wave, flagPY + 12 + wave2);
        g.lineTo(poleX + 2, flagPY + 24);
        g.closePath();
        g.fill({ color: 0xFF3333 });
        g.circle(poleX + 14, flagPY + 12, 3).fill({ color: 0xFFDD00 });

        // Base block
        g.rect(poleX - 8, baseY - 8, 16, 8).fill({ color: 0x666666 });
        g.rect(poleX - 10, baseY - 4, 20, 4).fill({ color: 0x555555 });

        this.entityContainer.addChild(g);
        return; // only one flag per level
      }
    }
  }

  // ═══════════════════════════════════════
  // PARTICLES
  // ═══════════════════════════════════════

  private drawParticles(state: BonksState, cam: number, camY: number): void {
    for (const p of state.particles) {
      const x = p.x - cam;
      const py = p.y - camY;
      const alpha = Math.min(1, p.life / 10);

      if (p.type === 'score' && p.text) {
        this.drawText(p.text, x, py, 0xFFDD00, this.fgContainer, 1, alpha);
        continue;
      }

      if (p.type === 'debris' && this.texturesReady && hasTex('fx-debris')) {
        const spr = new Sprite(tex('fx-debris'));
        spr.x = x;
        spr.y = py;
        spr.alpha = alpha;
        spr.rotation = this.frameCount * 0.1;
        spr.anchor.set(0.5);
        this.fgContainer.addChild(spr);
      } else {
        const g = new Graphics();
        g.rect(x - p.size / 2, py - p.size / 2, p.size, p.size);
        g.fill({ color: p.color, alpha });
        this.fgContainer.addChild(g);
      }
    }
  }

  // ═══════════════════════════════════════
  // HUD
  // ═══════════════════════════════════════

  private drawHUD(state: BonksState): void {
    const bar = new Graphics();
    bar.rect(0, 0, CANVAS_W, 28).fill({ color: 0x000000, alpha: 0.5 });
    this.hudContainer.addChild(bar);

    const y = 8;

    // Portrait
    const prefix = CHAR_PREFIXES[state.selectedCharacter];
    const portraitKey = `portrait-${prefix}`;
    if (this.texturesReady && hasTex(portraitKey)) {
      const portrait = new Sprite(tex(portraitKey));
      portrait.x = 8;
      portrait.y = 4;
      portrait.scale.set(1.2);
      this.hudContainer.addChild(portrait);
    }

    // Hearts
    const heartX = 32;
    if (this.texturesReady && hasTex('hud-heart')) {
      for (let i = 0; i < state.lives; i++) {
        const heart = new Sprite(tex('hud-heart'));
        heart.x = heartX + i * 18;
        heart.y = y;
        this.hudContainer.addChild(heart);
      }
    } else {
      this.drawText(`x${state.lives}`, heartX, y, 0xFF3333, this.hudContainer);
    }

    // Level name
    const levelName = LEVELS[state.level]?.name ?? `LEVEL ${state.level + 1}`;
    this.drawText(levelName.toUpperCase(), CANVAS_W / 2 - levelName.length * 3.5, y, 0xFFFFFF, this.hudContainer);

    // Coins
    if (this.texturesReady && hasTex('hud-coin')) {
      const coinIcon = new Sprite(tex('hud-coin'));
      coinIcon.x = CANVAS_W - 220;
      coinIcon.y = y;
      this.hudContainer.addChild(coinIcon);
    }
    this.drawText(`x${state.coinsCollected}`, CANVAS_W - 200, y, 0xFFDD00, this.hudContainer);

    // Timer
    if (this.texturesReady && hasTex('hud-clock')) {
      const clock = new Sprite(tex('hud-clock'));
      clock.x = CANVAS_W - 150;
      clock.y = y;
      this.hudContainer.addChild(clock);
    }
    const timeColor = state.timeLeft <= 50 ? 0xFF4444 : 0xFFFFFF;
    this.drawText(state.timeLeft.toString(), CANVAS_W - 130, y, timeColor, this.hudContainer);

    // Score
    this.drawText(
      `SCORE ${state.score.toString().padStart(6, '0')}`,
      CANVAS_W - 100, y, 0xFFFFFF, this.hudContainer,
    );
  }

  // ═══════════════════════════════════════
  // PHASE OVERLAYS
  // ═══════════════════════════════════════

  private renderCompleteOverlay(state: BonksState): void {
    const overlay = new Graphics();
    overlay.rect(0, 0, CANVAS_W, CANVAS_H).fill({ color: 0x000000, alpha: 0.6 });
    this.overlayContainer.addChild(overlay);

    // Decorative box
    const box = new Graphics();
    box.roundRect(CANVAS_W / 2 - 160, CANVAS_H / 2 - 70, 320, 160, 8);
    box.fill({ color: 0x0a0a2a, alpha: 0.9 });
    box.roundRect(CANVAS_W / 2 - 160, CANVAS_H / 2 - 70, 320, 160, 8);
    box.stroke({ color: 0xFFDD00, width: 2, alpha: 0.6 });
    this.overlayContainer.addChild(box);

    this.drawCentered('LEVEL COMPLETE!', CANVAS_H / 2 - 50, 0xFFDD00, this.overlayContainer, 1.5);
    this.drawCentered(`TIME BONUS: +${state.timeLeft * 5}`, CANVAS_H / 2 - 15, 0xFFFFFF, this.overlayContainer);
    this.drawCentered(`SCORE: ${state.score}`, CANVAS_H / 2 + 10, 0xFFFFFF, this.overlayContainer);

    if (Math.floor(this.frameCount / 30) % 2 === 0) {
      this.drawCentered('PRESS ENTER', CANVAS_H / 2 + 50, 0xFFFFFF, this.overlayContainer, 1, 0.7);
    }
  }

  private renderGameOverOverlay(state: BonksState): void {
    const bg = new Graphics();
    bg.rect(0, 0, CANVAS_W, CANVAS_H).fill({ color: 0x0a0a0a });
    this.overlayContainer.addChild(bg);

    // Red vignette
    const vig = new Graphics();
    vig.rect(0, 0, CANVAS_W, 3).fill({ color: 0xFF2222, alpha: 0.6 });
    vig.rect(0, CANVAS_H - 3, CANVAS_W, 3).fill({ color: 0xFF2222, alpha: 0.6 });
    this.overlayContainer.addChild(vig);

    this.drawCentered('GAME OVER', CANVAS_H / 2 - 50, 0xFF4444, this.overlayContainer, 2);
    this.drawCentered(`FINAL SCORE: ${state.score}`, CANVAS_H / 2 + 5, 0xFFFFFF, this.overlayContainer);
    this.drawCentered(STORY.gameOver, CANVAS_H / 2 + 30, 0x888888, this.overlayContainer);

    if (Math.floor(this.frameCount / 30) % 2 === 0) {
      this.drawCentered('PRESS ENTER', CANVAS_H / 2 + 70, 0xFFFFFF, this.overlayContainer, 1, 0.7);
    }
  }

  // ═══════════════════════════════════════
  // PIXEL FONT RENDERING
  // ═══════════════════════════════════════

  /** Draw text centered horizontally on the canvas */
  private drawCentered(text: string, y: number, color: number, container: Container, scale: number = 1, alpha: number = 1): void {
    const textW = text.length * (FONT_W + 1) * PX * scale;
    this.drawText(text, (CANVAS_W - textW) / 2, y, color, container, scale, alpha);
  }

  /** Draw text centered at a specific x position */
  private drawCenteredAt(text: string, cx: number, y: number, color: number, container: Container, scale: number = 1, alpha: number = 1): void {
    const textW = text.length * (FONT_W + 1) * PX * scale;
    this.drawText(text, cx - textW / 2, y, color, container, scale, alpha);
  }

  private drawText(text: string, x: number, y: number, color: number, container: Container, scale: number = 1, alpha: number = 1): void {
    if (!this.texturesReady) return;

    const isGold = color === 0xFFDD00;
    let cx = x;

    for (const ch of text) {
      const upper = ch.toUpperCase();
      const fontKey = isGold ? `font-gold-${upper}` : `font-${upper}`;

      if (hasTex(fontKey)) {
        const spr = new Sprite(tex(fontKey));
        spr.x = cx;
        spr.y = y;
        spr.alpha = alpha;
        if (scale !== 1) spr.scale.set(scale);
        if (!isGold && color !== 0xFFFFFF) {
          spr.tint = color;
        }
        container.addChild(spr);
      }
      cx += (FONT_W + 1) * PX * scale;
    }
  }

  // ═══════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════

  destroy(): void {
    this.worldContainer.destroy({ children: true });
    this.hudContainer.destroy({ children: true });
    this.overlayContainer.destroy({ children: true });
  }
}
