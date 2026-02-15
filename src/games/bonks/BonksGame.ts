// ═══════════════════════════════════════════════════════════════════
// BonksGame.ts — Game logic for BooBonks, BoJangles & Chonk
// Clean rebuild: title → cinematic → select → playing
// ═══════════════════════════════════════════════════════════════════

import {
  TILE, GRAVITY, PLAYER_MAX_FALL, ENEMY_SPEED,
  COYOTE_FRAMES, JUMP_BUFFER_FRAMES,
  KOOPA_SHELL_SPEED, FIREBALL_SPEED, FIREBALL_GRAVITY,
  INVINCIBLE_FRAMES,
  FLOAT_FRAMES, FLOAT_GRAVITY_MULT,
  WALL_KICK_VX, WALL_KICK_VY,
  SHELL_REVERT_FRAMES, GROW_FREEZE_FRAMES,
  CHONK_FLUTTER_FRAMES, CHONK_RETURN_FRAMES,
  CHARACTERS, SELECTABLE_CHARACTERS, CINEMATIC_SCENES,
  BonksState, PlayerState, EnemyState, CoinState, QuestionBlock,
  Particle, PowerUpItem, SaveData, CompanionState,
  CharacterId, EnemyType, PowerUp, GamePhase,
  LEVELS, WORLD_MAP,
  getTile, isSolid, isQuestionLike, isOneWay,
  contentForTile, parseLevelEntities,
} from './rules';

export type SoundCallback = (id: string) => void;

const CINEMATIC_SCENE_FRAMES = 180; // 3 seconds per scene at 60fps

export class BonksGame {
  private state!: BonksState;
  private keys: Set<string> = new Set();
  private prevKeys: Set<string> = new Set();
  private flagX = 0;
  private flagY = 0;
  private onSound: SoundCallback = () => {};
  private hasSave = false;

  // Demo player for title screen
  private demoPlayer: PlayerState | null = null;
  private demoTimer = 0;

  constructor(hasSave = false) {
    this.hasSave = hasSave;
    this.initTitleScreen();
  }

  setSoundCallback(cb: SoundCallback): void {
    this.onSound = cb;
  }

  setHasSave(v: boolean): void {
    this.hasSave = v;
  }

  // ═══════════════════════════════════════
  // TITLE SCREEN
  // ═══════════════════════════════════════

  private initTitleScreen(): void {
    // Load level 0 in background for demo play
    const level = LEVELS[0];
    const tiles = [...level.tiles];
    const parsed = parseLevelEntities(tiles);

    const demoChar: CharacterId = 'boobonks';
    const charDef = CHARACTERS[demoChar];

    this.demoPlayer = {
      x: parsed.playerStart.x,
      y: parsed.playerStart.y,
      vx: charDef.speed, vy: 0,
      width: TILE - 10, height: TILE - 2,
      onGround: false, facing: 'right', alive: true,
      invincible: 0, frame: 0, character: demoChar,
      powerUp: 'none', animState: 'walk',
      coyoteTime: 0, jumpBuffer: 0,
      fireballs: [], wallSliding: false,
      growTimer: 0, floatTimer: 0,
    };

    const enemies: EnemyState[] = parsed.enemies.map(e => ({
      x: e.x, y: e.y,
      vx: -ENEMY_SPEED,
      vy: 0,
      width: TILE - 8, height: e.type === 'koopa' ? TILE + 4 : TILE - 2,
      type: e.type, state: 'walk' as const,
      alive: true, squished: 0, onGround: false, frame: 0,
      shellTimer: 0, startX: e.x, startY: e.y,
    }));

    const coins: CoinState[] = parsed.coins.map(c => ({
      x: c.x, y: c.y, collected: false, floating: true, popTimer: 0,
    }));

    const questionBlocks: QuestionBlock[] = parsed.questionBlocks.map(q => ({
      col: q.col, row: q.row, hit: false, popTimer: 0, content: q.content,
    }));

    this.state = {
      player: this.demoPlayer,
      companion: null,
      enemies,
      coins,
      questionBlocks,
      particles: [],
      powerUpItems: [],
      score: 0, coinsCollected: 0, lives: 3, level: 0,
      phase: 'title',
      cameraX: 0,
      timeLeft: level.timeLimit,
      levelWidth: (tiles[0]?.length ?? 0) * TILE,
      levelHeight: tiles.length * TILE,
      tiles,
      flagReached: false,
      transitionTimer: 0,
      selectedCharacter: 'boobonks',
      selectIndex: 0,
      timerFrames: 0,
      titleIndex: 0,
      cinematicScene: 0,
      cinematicTimer: 0,
      worldMapIndex: 0,
      completedLevels: [],
    };
  }

  // ═══════════════════════════════════════
  // LEVEL LOADING
  // ═══════════════════════════════════════

  loadLevel(levelIndex: number): void {
    const level = LEVELS[levelIndex] ?? LEVELS[0];
    const tiles = [...level.tiles];
    const parsed = parseLevelEntities(tiles);

    this.flagX = parsed.flagPos?.x ?? 0;
    this.flagY = parsed.flagPos?.y ?? 0;

    const charId = this.state.selectedCharacter;

    const player: PlayerState = {
      x: parsed.playerStart.x,
      y: parsed.playerStart.y,
      vx: 0, vy: 0,
      width: TILE - 10, height: TILE - 2,
      onGround: false, facing: 'right', alive: true,
      invincible: 0, frame: 0, character: charId,
      powerUp: 'none', animState: 'idle',
      coyoteTime: 0, jumpBuffer: 0,
      fireballs: [], wallSliding: false,
      growTimer: 0, floatTimer: FLOAT_FRAMES,
    };

    const enemies: EnemyState[] = parsed.enemies.map(e => ({
      x: e.x, y: e.y,
      vx: -ENEMY_SPEED,
      vy: 0,
      width: TILE - 8, height: e.type === 'koopa' ? TILE + 4 : TILE - 2,
      type: e.type, state: 'walk' as const,
      alive: true, squished: 0, onGround: false, frame: 0,
      shellTimer: 0, startX: e.x, startY: e.y,
    }));

    const coins: CoinState[] = parsed.coins.map(c => ({
      x: c.x, y: c.y, collected: false, floating: true, popTimer: 0,
    }));

    const questionBlocks: QuestionBlock[] = parsed.questionBlocks.map(q => ({
      col: q.col, row: q.row, hit: false, popTimer: 0, content: q.content,
    }));

    // Spawn Chonk companion if level has a 'D' tile
    const companion: CompanionState | null = parsed.chonkSpawn ? {
      x: parsed.chonkSpawn.x, y: parsed.chonkSpawn.y,
      vx: ENEMY_SPEED * 0.6, vy: 0,
      width: TILE - 4, height: TILE - 2,
      onGround: false, facing: 'right', alive: true,
      mounted: false, anim: 'idle', frame: 0,
      flutterTimer: CHONK_FLUTTER_FRAMES,
      spawnX: parsed.chonkSpawn.x, spawnY: parsed.chonkSpawn.y,
      returnTimer: 0, runningAway: false,
    } : null;

    this.state = {
      ...this.state,
      player,
      companion,
      enemies,
      coins,
      questionBlocks,
      particles: [],
      powerUpItems: [],
      level: levelIndex,
      phase: 'playing',
      cameraX: 0,
      timeLeft: level.timeLimit,
      levelWidth: (tiles[0]?.length ?? 0) * TILE,
      levelHeight: tiles.length * TILE,
      tiles,
      flagReached: false,
      transitionTimer: 0,
      timerFrames: 0,
    };
  }

  getState(): BonksState {
    return this.state;
  }

  setKeys(keys: Set<string>): void {
    this.prevKeys = this.keys;
    this.keys = new Set(keys);
  }

  private justPressed(key: string): boolean {
    return this.keys.has(key) && !this.prevKeys.has(key);
  }

  // ═══════════════════════════════════════
  // SAVE / LOAD
  // ═══════════════════════════════════════

  getSaveData(): SaveData {
    return {
      character: this.state.selectedCharacter,
      level: this.state.level,
      lives: this.state.lives,
      score: this.state.score,
      coins: this.state.coinsCollected,
      completedLevels: [...this.state.completedLevels],
      timestamp: Date.now(),
    };
  }

  continueGame(save: SaveData): void {
    this.state.selectedCharacter = save.character;
    this.state.score = save.score;
    this.state.coinsCollected = save.coins;
    this.state.lives = save.lives;
    this.state.completedLevels = save.completedLevels ?? [];
    // Find the world map node for the saved level
    const nodeIdx = WORLD_MAP.findIndex(n => n.id === save.level);
    this.state.worldMapIndex = nodeIdx >= 0 ? nodeIdx : 0;
    this.state.phase = 'world';
  }

  // ═══════════════════════════════════════
  // START / RESTART
  // ═══════════════════════════════════════

  startGame(): void {
    this.state.score = 0;
    this.state.coinsCollected = 0;
    this.state.lives = 3;
    this.state.completedLevels = [];
    this.state.worldMapIndex = 0;
    this.state.phase = 'world';
  }

  restart(): void {
    this.initTitleScreen();
  }

  retryLevel(): void {
    this.loadLevel(this.state.level);
  }

  nextLevel(): boolean {
    if (this.state.level + 1 < LEVELS.length) {
      this.loadLevel(this.state.level + 1);
      return true;
    }
    this.state.phase = 'complete';
    return false;
  }

  // ═══════════════════════════════════════
  // MAIN UPDATE
  // ═══════════════════════════════════════

  update(): void {
    const emit = (s: string) => { this.onSound(s); };

    switch (this.state.phase) {
      case 'title':
        this.updateTitle(emit);
        this.updateDemoPlayer();
        break;
      case 'cinematic':
        this.updateCinematic(emit);
        break;
      case 'select':
        this.updateSelect(emit);
        break;
      case 'world':
        this.updateWorld(emit);
        break;
      case 'playing':
        if (this.state.player.growTimer > 0) {
          this.state.player.growTimer--;
          this.state.player.frame++;
          return;
        }
        this.updatePlayer(emit);
        this.updateCompanion(emit);
        this.updateEnemies(emit);
        this.updateCoins(emit);
        this.updatePowerUpItems(emit);
        this.updateFireballs(emit);
        this.updateParticles();
        this.updateCamera();
        this.updateTimer(emit);
        this.checkFlagReached(emit);
        break;
      case 'dying':
        this.updateDying();
        break;
      case 'complete':
        this.state.transitionTimer++;
        if (this.state.transitionTimer > 30 && (this.justPressed('Enter') || this.justPressed(' '))) {
          // Mark level as completed and return to world map
          if (!this.state.completedLevels.includes(this.state.level)) {
            this.state.completedLevels.push(this.state.level);
          }
          this.state.phase = 'world';
        }
        break;
      case 'game-over':
        this.state.transitionTimer++;
        if (this.state.transitionTimer > 30 && (this.justPressed('Enter') || this.justPressed(' '))) {
          // Back to world map with reset lives instead of title
          this.state.lives = 3;
          this.state.phase = 'world';
        }
        break;
    }
  }

  // ═══════════════════════════════════════
  // TITLE SCREEN
  // ═══════════════════════════════════════

  private updateTitle(emit: (s: string) => void): void {
    // Navigate menu — accept Up/Down AND Left/Right for intuitiveness
    if (this.justPressed('ArrowUp') || this.justPressed('ArrowLeft')
      || this.justPressed('w') || this.justPressed('W')
      || this.justPressed('a') || this.justPressed('A')) {
      this.state.titleIndex = 0;
      emit('ui-click');
    }
    if (this.justPressed('ArrowDown') || this.justPressed('ArrowRight')
      || this.justPressed('s') || this.justPressed('S')
      || this.justPressed('d') || this.justPressed('D')) {
      if (this.hasSave) {
        this.state.titleIndex = 1;
        emit('ui-click');
      }
    }
    if (this.justPressed('Enter') || this.justPressed(' ')) {
      if (this.state.titleIndex === 0) {
        // START → cinematic
        this.state.phase = 'cinematic';
        this.state.cinematicScene = 0;
        this.state.cinematicTimer = 0;
        emit('bonks-coin');
      } else if (this.state.titleIndex === 1 && this.hasSave) {
        // CONTINUE → signal to page to load save
        // Page handles this by checking phase change
        this.state.phase = 'select'; // temporary, page overrides with continueGame
        this.state.titleIndex = -1; // sentinel for "continue requested"
        emit('bonks-coin');
      }
    }
  }

  private updateDemoPlayer(): void {
    if (!this.demoPlayer) return;
    const p = this.demoPlayer;
    this.demoTimer++;

    // Simple AI: move right, jump at walls/gaps
    p.vx = CHARACTERS[p.character].speed;
    p.facing = 'right';
    p.frame++;

    // Apply gravity
    p.vy += GRAVITY;
    if (p.vy > PLAYER_MAX_FALL) p.vy = PLAYER_MAX_FALL;

    // Move horizontally
    p.x += p.vx;
    const rightCol = Math.floor((p.x + p.width) / TILE);
    const topRow = Math.floor(p.y / TILE);
    const botRow = Math.floor((p.y + p.height - 1) / TILE);
    for (let r = topRow; r <= botRow; r++) {
      if (isSolid(getTile(this.state.tiles, rightCol, r))) {
        p.x = rightCol * TILE - p.width;
        // Jump when hitting wall
        if (p.onGround) {
          p.vy = CHARACTERS[p.character].jump;
          p.onGround = false;
        }
        break;
      }
    }

    // Move vertically
    p.y += p.vy;
    p.onGround = false;
    if (p.vy >= 0) {
      const bRow = Math.floor((p.y + p.height) / TILE);
      const lCol = Math.floor((p.x + 2) / TILE);
      const rCol = Math.floor((p.x + p.width - 2) / TILE);
      for (let c = lCol; c <= rCol; c++) {
        if (isSolid(getTile(this.state.tiles, c, bRow))) {
          p.y = bRow * TILE - p.height;
          p.vy = 0;
          p.onGround = true;
          break;
        }
      }
    }

    // Jump over gaps
    if (p.onGround) {
      const aheadCol = Math.floor((p.x + p.width + 8) / TILE);
      const belowRow = Math.floor((p.y + p.height + 2) / TILE);
      if (!isSolid(getTile(this.state.tiles, aheadCol, belowRow))) {
        p.vy = CHARACTERS[p.character].jump;
        p.onGround = false;
      }
    }

    // Wrap on death / flag / off-screen
    if (p.y > this.state.levelHeight + TILE || p.x > this.state.levelWidth - TILE * 3) {
      const parsed = parseLevelEntities(this.state.tiles);
      p.x = parsed.playerStart.x;
      p.y = parsed.playerStart.y;
      p.vx = 0; p.vy = 0;
    }

    // Update anim
    p.animState = p.onGround ? (Math.abs(p.vx) > 0.3 ? 'walk' : 'idle') : (p.vy < 0 ? 'jump' : 'fall');

    // Camera follows demo
    const targetX = p.x - 400;
    this.state.cameraX += (targetX - this.state.cameraX) * 0.1;
    if (this.state.cameraX < 0) this.state.cameraX = 0;
    const maxCam = this.state.levelWidth - 900;
    if (maxCam > 0 && this.state.cameraX > maxCam) this.state.cameraX = maxCam;
  }

  // ═══════════════════════════════════════
  // CINEMATIC
  // ═══════════════════════════════════════

  private updateCinematic(emit: (s: string) => void): void {
    this.state.cinematicTimer++;

    // Enter/Space/Right arrow → advance to next scene
    if (this.justPressed('Enter') || this.justPressed(' ') || this.justPressed('ArrowRight') || this.justPressed('d') || this.justPressed('D')) {
      this.state.cinematicScene++;
      this.state.cinematicTimer = 0;
      emit('ui-click');
      if (this.state.cinematicScene >= CINEMATIC_SCENES.length) {
        this.state.phase = 'select';
        this.state.selectIndex = 0;
      }
      return;
    }

    // Left arrow → go back to previous scene
    if (this.justPressed('ArrowLeft') || this.justPressed('a') || this.justPressed('A')) {
      if (this.state.cinematicScene > 0) {
        this.state.cinematicScene--;
        this.state.cinematicTimer = 0;
        emit('ui-click');
      }
      return;
    }

    // Auto-advance after timer
    if (this.state.cinematicTimer >= CINEMATIC_SCENE_FRAMES) {
      this.state.cinematicScene++;
      this.state.cinematicTimer = 0;
      if (this.state.cinematicScene >= CINEMATIC_SCENES.length) {
        this.state.phase = 'select';
        this.state.selectIndex = 0;
      }
    }
  }

  // ═══════════════════════════════════════
  // CHARACTER SELECT
  // ═══════════════════════════════════════

  private updateSelect(emit: (s: string) => void): void {
    if (this.justPressed('ArrowLeft') || this.justPressed('a') || this.justPressed('A')) {
      this.state.selectIndex = (this.state.selectIndex + SELECTABLE_CHARACTERS.length - 1) % SELECTABLE_CHARACTERS.length;
      emit('ui-click');
    }
    if (this.justPressed('ArrowRight') || this.justPressed('d') || this.justPressed('D')) {
      this.state.selectIndex = (this.state.selectIndex + 1) % SELECTABLE_CHARACTERS.length;
      emit('ui-click');
    }
    if (this.justPressed('Enter') || this.justPressed(' ')) {
      this.state.selectedCharacter = SELECTABLE_CHARACTERS[this.state.selectIndex];
      this.startGame(); // goes to world phase
      emit('bonks-coin');
    }
  }

  // ═══════════════════════════════════════
  // WORLD MAP
  // ═══════════════════════════════════════

  private updateWorld(emit: (s: string) => void): void {
    const current = WORLD_MAP[this.state.worldMapIndex];
    if (!current) return;

    // Navigate between connected nodes
    const wantLeft = this.justPressed('ArrowLeft') || this.justPressed('a') || this.justPressed('A');
    const wantRight = this.justPressed('ArrowRight') || this.justPressed('d') || this.justPressed('D');
    const wantUp = this.justPressed('ArrowUp') || this.justPressed('w') || this.justPressed('W');
    const wantDown = this.justPressed('ArrowDown') || this.justPressed('s') || this.justPressed('S');

    if (wantLeft || wantRight || wantUp || wantDown) {
      // Find the best connected node in the desired direction
      let bestIdx = -1;
      let bestScore = Infinity;

      for (const connIdx of current.connections) {
        const conn = WORLD_MAP[connIdx];
        if (!conn) continue;

        // Check if the node is reachable (unlocked)
        if (!this.isNodeUnlocked(connIdx)) continue;

        const dx = conn.x - current.x;
        const dy = conn.y - current.y;

        let score = Infinity;
        if (wantLeft && dx < 0) score = Math.abs(dx) + Math.abs(dy) * 0.5;
        else if (wantRight && dx > 0) score = Math.abs(dx) + Math.abs(dy) * 0.5;
        else if (wantUp && dy < 0) score = Math.abs(dy) + Math.abs(dx) * 0.5;
        else if (wantDown && dy > 0) score = Math.abs(dy) + Math.abs(dx) * 0.5;

        if (score < bestScore) {
          bestScore = score;
          bestIdx = connIdx;
        }
      }

      if (bestIdx >= 0) {
        this.state.worldMapIndex = bestIdx;
        emit('ui-click');
      }
    }

    // Enter to start level
    if (this.justPressed('Enter') || this.justPressed(' ')) {
      const node = WORLD_MAP[this.state.worldMapIndex];
      if (node.available && node.id >= 0 && this.isNodeUnlocked(this.state.worldMapIndex)) {
        this.loadLevel(node.id);
        emit('bonks-coin');
      } else {
        // Coming soon or locked
        emit('bonks-die');
      }
    }

    // Escape to return to title
    if (this.justPressed('Escape')) {
      this.initTitleScreen();
      emit('ui-click');
    }
  }

  /** Check if a world map node is unlocked (first node always unlocked, others need previous completed) */
  private isNodeUnlocked(nodeIndex: number): boolean {
    if (nodeIndex === 0) return true;
    const node = WORLD_MAP[nodeIndex];
    if (!node) return false;

    // For available (real) levels: unlock when the previous real level is completed
    // For placeholder nodes: unlock when all previous real levels are completed
    // Simple rule: node N is unlocked if all connected nodes with lower index are completed or unlocked
    // More specifically: walk the chain from node 0 — each node unlocks when the previous is completed
    for (let i = 0; i < nodeIndex; i++) {
      const prevNode = WORLD_MAP[i];
      if (prevNode.available && prevNode.id >= 0) {
        if (!this.state.completedLevels.includes(prevNode.id)) return false;
      }
    }
    return true;
  }

  // ═══════════════════════════════════════
  // PLAYER PHYSICS
  // ═══════════════════════════════════════

  private updatePlayer(emit: (s: string) => void): void {
    const p = this.state.player;
    if (!p.alive) return;
    p.frame++;
    if (p.invincible > 0) p.invincible--;

    const charDef = CHARACTERS[p.character];
    const isRunning = this.keys.has('Shift') || this.keys.has('z') || this.keys.has('Z');
    const maxSpeed = isRunning ? charDef.runSpeed : charDef.speed;
    const accel = p.onGround ? charDef.accel : charDef.airAccel;
    const decel = charDef.decel;

    // ── Horizontal movement ──
    const wantLeft = this.keys.has('ArrowLeft') || this.keys.has('a') || this.keys.has('A');
    const wantRight = this.keys.has('ArrowRight') || this.keys.has('d') || this.keys.has('D');

    if (wantLeft) {
      p.vx -= accel;
      if (p.vx < -maxSpeed) p.vx = -maxSpeed;
      if (p.onGround && p.vx > 0.5) p.animState = 'skid';
      else p.facing = 'left';
    } else if (wantRight) {
      p.vx += accel;
      if (p.vx > maxSpeed) p.vx = maxSpeed;
      if (p.onGround && p.vx < -0.5) p.animState = 'skid';
      else p.facing = 'right';
    } else {
      if (Math.abs(p.vx) < decel) p.vx = 0;
      else if (p.vx > 0) p.vx -= decel;
      else p.vx += decel;
    }

    // ── Coyote time ──
    if (p.onGround) {
      p.coyoteTime = COYOTE_FRAMES;
    } else if (p.coyoteTime > 0) {
      p.coyoteTime--;
    }

    // ── Jump ──
    const jumpPress = this.justPressed('ArrowUp') || this.justPressed('w') || this.justPressed('W') || this.justPressed(' ');
    const jumpHeld = this.keys.has('ArrowUp') || this.keys.has('w') || this.keys.has('W') || this.keys.has(' ');

    if (jumpPress) p.jumpBuffer = JUMP_BUFFER_FRAMES;
    else if (p.jumpBuffer > 0) p.jumpBuffer--;

    let didJump = false;
    if (p.jumpBuffer > 0 && p.coyoteTime > 0) {
      p.vy = charDef.jump;
      p.onGround = false;
      p.coyoteTime = 0;
      p.jumpBuffer = 0;
      p.floatTimer = FLOAT_FRAMES;
      didJump = true;
      emit('bonks-jump');
    }

    // ── Variable jump height ──
    if (!jumpHeld && p.vy < -3) {
      p.vy *= 0.6;
    }

    // ── BoJangles float ──
    if (p.character === 'bojangles' && !p.onGround && jumpHeld && p.vy > -1 && p.floatTimer > 0) {
      p.floatTimer--;
    }

    // ── Gravity ──
    let grav = GRAVITY;
    if (p.character === 'bojangles' && !p.onGround && jumpHeld && p.vy > -1 && p.floatTimer > 0) {
      grav *= FLOAT_GRAVITY_MULT;
    }
    p.vy += grav;
    if (p.vy > PLAYER_MAX_FALL) p.vy = PLAYER_MAX_FALL;

    // ── Wall kick (BooBonks) — only if we didn't just do a regular jump ──
    if (p.character === 'boobonks' && !p.onGround && jumpPress && !didJump) {
      const dir = p.facing === 'right' ? 1 : -1;
      const checkCol = dir > 0
        ? Math.floor((p.x + p.width + 2) / TILE)
        : Math.floor((p.x - 2) / TILE);
      const tRow = Math.floor(p.y / TILE);
      const bRow = Math.floor((p.y + p.height - 1) / TILE);
      let touchingWall = false;
      for (let r = tRow; r <= bRow; r++) {
        if (isSolid(getTile(this.state.tiles, checkCol, r))) {
          touchingWall = true;
          break;
        }
      }
      if (touchingWall) {
        p.vx = -dir * WALL_KICK_VX;
        p.vy = WALL_KICK_VY;
        p.facing = dir > 0 ? 'left' : 'right';
        p.animState = 'wallkick';
        p.floatTimer = 0;
        emit('bonks-jump');
      }
    }

    // ── Fireball (fire power) ──
    if (p.powerUp === 'fire') {
      if (this.justPressed('z') || this.justPressed('Z')) {
        if (p.fireballs.length < 2) {
          const dir = p.facing === 'right' ? 1 : -1;
          p.fireballs.push({
            x: p.x + (dir > 0 ? p.width : -8),
            y: p.y + p.height / 2,
            vx: dir * FIREBALL_SPEED,
            vy: 0,
            bounces: 0,
            alive: true,
          });
          emit('bonks-block');
        }
      }
    }

    // ── Move and collide ──
    this.movePlayer(p, emit);

    // ── One-way platforms ──
    if (p.vy >= 0 && !p.onGround) {
      const btRow = Math.floor((p.y + p.height) / TILE);
      const lCol = Math.floor((p.x + 2) / TILE);
      const rCol = Math.floor((p.x + p.width - 2) / TILE);
      for (let c = lCol; c <= rCol; c++) {
        if (isOneWay(getTile(this.state.tiles, c, btRow))) {
          const platTop = btRow * TILE;
          if (p.y + p.height <= platTop + 6 && p.vy >= 0) {
            p.y = platTop - p.height;
            p.vy = 0;
            p.onGround = true;
            break;
          }
        }
      }
    }

    // ── Death pit ──
    if (p.y > this.state.levelHeight + TILE) {
      this.killPlayer(emit);
    }

    // ── Reset float on ground ──
    if (p.onGround) {
      p.floatTimer = FLOAT_FRAMES;
      p.wallSliding = false;
    }

    // ── Anim state ──
    this.updateAnimState(p);
  }

  private updateAnimState(p: PlayerState): void {
    if (p.growTimer > 0) { p.animState = p.powerUp !== 'none' ? 'grow' : 'shrink'; return; }
    if (!p.alive) { p.animState = 'death'; return; }
    if (p.animState === 'wallkick' && !p.onGround) return;
    if (!p.onGround) {
      p.animState = p.vy < 0 ? 'jump' : 'fall';
    } else if (p.animState === 'skid') {
      if (Math.abs(p.vx) < 0.5 || (p.vx > 0 && p.facing === 'right') || (p.vx < 0 && p.facing === 'left')) {
        p.animState = Math.abs(p.vx) > 0.5 ? 'walk' : 'idle';
      }
    } else if (Math.abs(p.vx) > CHARACTERS[p.character].runSpeed * 0.8) {
      p.animState = 'run';
    } else if (Math.abs(p.vx) > 0.3) {
      p.animState = 'walk';
    } else {
      p.animState = 'idle';
    }
  }

  // ═══════════════════════════════════════
  // PLAYER COLLISION
  // ═══════════════════════════════════════

  private movePlayer(p: PlayerState, emit: (s: string) => void): void {
    const tiles = this.state.tiles;

    // Horizontal
    p.x += p.vx;

    if (p.vx < 0) {
      const leftCol = Math.floor(p.x / TILE);
      const topRow = Math.floor(p.y / TILE);
      const botRow = Math.floor((p.y + p.height - 1) / TILE);
      for (let r = topRow; r <= botRow; r++) {
        if (isSolid(getTile(tiles, leftCol, r))) {
          p.x = (leftCol + 1) * TILE;
          p.vx = 0;
          break;
        }
      }
    } else if (p.vx > 0) {
      const rightCol = Math.floor((p.x + p.width) / TILE);
      const topRow = Math.floor(p.y / TILE);
      const botRow = Math.floor((p.y + p.height - 1) / TILE);
      for (let r = topRow; r <= botRow; r++) {
        if (isSolid(getTile(tiles, rightCol, r))) {
          p.x = rightCol * TILE - p.width;
          p.vx = 0;
          break;
        }
      }
    }

    if (p.x < 0) { p.x = 0; p.vx = 0; }

    // Vertical
    p.y += p.vy;
    p.onGround = false;

    if (p.vy < 0) {
      const topRow = Math.floor(p.y / TILE);
      const leftCol = Math.floor((p.x - 2) / TILE);
      const rightCol = Math.floor((p.x + p.width + 2) / TILE);
      for (let c = leftCol; c <= rightCol; c++) {
        const tile = getTile(tiles, c, topRow);
        if (isSolid(tile)) {
          p.y = (topRow + 1) * TILE;
          p.vy = 0;
          if (isQuestionLike(tile)) {
            this.hitQuestionBlock(c, topRow, emit);
          } else if (tile === 'B') {
            this.hitBrick(c, topRow, emit);
          }
          break;
        }
      }
    } else if (p.vy >= 0) {
      const botRow = Math.floor((p.y + p.height) / TILE);
      const leftCol = Math.floor((p.x + 2) / TILE);
      const rightCol = Math.floor((p.x + p.width - 2) / TILE);
      for (let c = leftCol; c <= rightCol; c++) {
        const tile = getTile(tiles, c, botRow);
        if (isSolid(tile)) {
          p.y = botRow * TILE - p.height;
          p.vy = 0;
          p.onGround = true;
          break;
        }
      }
    }
  }

  // ═══════════════════════════════════════
  // ENEMIES
  // ═══════════════════════════════════════

  private updateEnemies(emit: (s: string) => void): void {
    const p = this.state.player;

    for (const e of this.state.enemies) {
      if (e.squished > 0) {
        e.squished--;
        if (e.squished <= 0) e.alive = false;
        continue;
      }
      if (!e.alive) continue;
      if (Math.abs(e.x - this.state.cameraX) > 1200) continue;

      e.frame++;

      if (e.type === 'goomba') {
        this.updateGoomba(e);
      } else if (e.type === 'koopa') {
        this.updateKoopa(e);
      }

      // Player collision
      if (!p.alive || p.invincible > 0) continue;
      if (!this.overlaps(p, e)) continue;

      // Shell state
      if (e.type === 'koopa' && e.state === 'shell') {
        e.state = 'shell-slide';
        e.vx = p.x < e.x ? KOOPA_SHELL_SPEED : -KOOPA_SHELL_SPEED;
        e.shellTimer = 0;
        emit('bonks-stomp');
        p.invincible = 10;
        continue;
      }

      if (e.type === 'koopa' && e.state === 'shell-slide') {
        this.hurtPlayer(emit);
        continue;
      }

      // Stomp check — generous: player feet in top 60% of enemy
      if (p.vy > 0 && p.y + p.height - 6 < e.y + e.height * 0.6) {
        if (e.type === 'koopa') {
          if (e.state === 'walk') {
            e.state = 'shell';
            e.vx = 0;
            e.shellTimer = SHELL_REVERT_FRAMES;
            p.vy = CHARACTERS[p.character].jump * 0.6;
            emit('bonks-stomp');
            this.state.score += 100;
            this.spawnScorePopup(e.x, e.y, '+100');
          }
        } else {
          // Stomp goomba
          e.squished = 20;
          e.vx = 0;
          p.vy = CHARACTERS[p.character].jump * 0.6;
          emit('bonks-stomp');
          this.state.score += 100;
          this.spawnScorePopup(e.x, e.y, '+100');
        }
      } else {
        this.hurtPlayer(emit);
      }
    }
  }

  private updateGoomba(e: EnemyState): void {
    e.vy += GRAVITY;
    if (e.vy > PLAYER_MAX_FALL) e.vy = PLAYER_MAX_FALL;
    this.moveEnemy(e);
  }

  private updateKoopa(e: EnemyState): void {
    if (e.state === 'shell') {
      e.shellTimer--;
      if (e.shellTimer <= 0) {
        e.state = 'walk';
        e.vx = -ENEMY_SPEED;
      }
      return;
    }
    if (e.state === 'shell-slide') {
      e.vy += GRAVITY;
      if (e.vy > PLAYER_MAX_FALL) e.vy = PLAYER_MAX_FALL;
      this.moveShell(e);
      for (const other of this.state.enemies) {
        if (other === e || !other.alive) continue;
        if (this.overlaps(e, other)) {
          other.alive = false;
          this.state.score += 100;
          this.spawnParticles(other.x + other.width / 2, other.y, 0xffcc00, 6);
        }
      }
      return;
    }
    e.vy += GRAVITY;
    if (e.vy > PLAYER_MAX_FALL) e.vy = PLAYER_MAX_FALL;
    this.moveEnemy(e);
  }

  private moveEnemy(e: EnemyState): void {
    const tiles = this.state.tiles;

    e.x += e.vx;

    if (e.vx < 0) {
      const leftCol = Math.floor(e.x / TILE);
      const topRow = Math.floor(e.y / TILE);
      const botRow = Math.floor((e.y + e.height - 1) / TILE);
      for (let r = topRow; r <= botRow; r++) {
        if (isSolid(getTile(tiles, leftCol, r))) {
          e.x = (leftCol + 1) * TILE;
          e.vx = -e.vx;
          break;
        }
      }
    } else if (e.vx > 0) {
      const rightCol = Math.floor((e.x + e.width) / TILE);
      const topRow = Math.floor(e.y / TILE);
      const botRow = Math.floor((e.y + e.height - 1) / TILE);
      for (let r = topRow; r <= botRow; r++) {
        if (isSolid(getTile(tiles, rightCol, r))) {
          e.x = rightCol * TILE - e.width;
          e.vx = -e.vx;
          break;
        }
      }
    }

    if (e.x < 0) { e.x = 0; e.vx = -e.vx; }

    e.y += e.vy;
    e.onGround = false;

    if (e.vy >= 0) {
      const botRow = Math.floor((e.y + e.height) / TILE);
      const leftCol = Math.floor((e.x + 2) / TILE);
      const rightCol = Math.floor((e.x + e.width - 2) / TILE);
      for (let c = leftCol; c <= rightCol; c++) {
        if (isSolid(getTile(tiles, c, botRow))) {
          e.y = botRow * TILE - e.height;
          e.vy = 0;
          e.onGround = true;
          break;
        }
      }
    }

    // Edge detection
    if (e.onGround && e.state === 'walk') {
      const checkCol = e.vx < 0
        ? Math.floor(e.x / TILE)
        : Math.floor((e.x + e.width) / TILE);
      const belowRow = Math.floor((e.y + e.height + 2) / TILE);
      if (!isSolid(getTile(tiles, checkCol, belowRow))) {
        e.vx = -e.vx;
      }
    }
  }

  private moveShell(e: EnemyState): void {
    const tiles = this.state.tiles;
    e.x += e.vx;

    if (e.vx < 0) {
      const leftCol = Math.floor(e.x / TILE);
      const topRow = Math.floor(e.y / TILE);
      const botRow = Math.floor((e.y + e.height - 1) / TILE);
      for (let r = topRow; r <= botRow; r++) {
        if (isSolid(getTile(tiles, leftCol, r))) {
          e.x = (leftCol + 1) * TILE;
          e.vx = -e.vx;
          break;
        }
      }
    } else if (e.vx > 0) {
      const rightCol = Math.floor((e.x + e.width) / TILE);
      const topRow = Math.floor(e.y / TILE);
      const botRow = Math.floor((e.y + e.height - 1) / TILE);
      for (let r = topRow; r <= botRow; r++) {
        if (isSolid(getTile(tiles, rightCol, r))) {
          e.x = rightCol * TILE - e.width;
          e.vx = -e.vx;
          break;
        }
      }
    }

    e.y += e.vy;
    e.onGround = false;
    if (e.vy >= 0) {
      const botRow = Math.floor((e.y + e.height) / TILE);
      const leftCol = Math.floor((e.x + 2) / TILE);
      const rightCol = Math.floor((e.x + e.width - 2) / TILE);
      for (let c = leftCol; c <= rightCol; c++) {
        if (isSolid(getTile(tiles, c, botRow))) {
          e.y = botRow * TILE - e.height;
          e.vy = 0;
          e.onGround = true;
          break;
        }
      }
    }

    if (e.y > this.state.levelHeight + TILE * 2) e.alive = false;
  }

  // ═══════════════════════════════════════
  // FIREBALLS
  // ═══════════════════════════════════════

  private updateFireballs(emit: (s: string) => void): void {
    const p = this.state.player;
    for (const fb of p.fireballs) {
      if (!fb.alive) continue;
      fb.x += fb.vx;
      fb.vy += FIREBALL_GRAVITY;
      fb.y += fb.vy;

      const botRow = Math.floor((fb.y + 8) / TILE);
      const col = Math.floor((fb.x + 4) / TILE);
      if (isSolid(getTile(this.state.tiles, col, botRow))) {
        fb.y = botRow * TILE - 8;
        fb.vy = -5;
        fb.bounces++;
        if (fb.bounces >= 6) fb.alive = false;
      }

      const wallCol = fb.vx > 0
        ? Math.floor((fb.x + 8) / TILE)
        : Math.floor(fb.x / TILE);
      const wallRow = Math.floor((fb.y + 4) / TILE);
      if (isSolid(getTile(this.state.tiles, wallCol, wallRow))) {
        fb.alive = false;
      }

      for (const e of this.state.enemies) {
        if (!e.alive) continue;
        if (this.overlaps({ x: fb.x, y: fb.y, width: 8, height: 8 }, e)) {
          e.alive = false;
          this.state.score += 200;
          this.spawnParticles(e.x + e.width / 2, e.y, 0xffcc00, 6);
          this.spawnScorePopup(e.x, e.y, '+200');
          emit('bonks-stomp');
          fb.alive = false;
          break;
        }
      }

      if (fb.x < this.state.cameraX - 100 || fb.x > this.state.cameraX + 1000) {
        fb.alive = false;
      }
    }
    p.fireballs = p.fireballs.filter(fb => fb.alive);
  }

  // ═══════════════════════════════════════
  // COINS
  // ═══════════════════════════════════════

  private updateCoins(emit: (s: string) => void): void {
    const p = this.state.player;

    for (const coin of this.state.coins) {
      if (coin.collected) continue;

      if (coin.popTimer > 0) {
        coin.popTimer--;
        coin.y -= 3;
        if (coin.popTimer <= 0) {
          coin.collected = true;
          this.state.score += 200;
          this.state.coinsCollected++;
          this.spawnParticles(coin.x, coin.y, 0xffd700, 8);
          emit('bonks-coin');
        }
        continue;
      }

      if (coin.floating && this.overlapsCoin(p, coin)) {
        coin.collected = true;
        this.state.score += 100;
        this.state.coinsCollected++;
        this.spawnParticles(coin.x, coin.y, 0xffd700, 5);
        emit('bonks-coin');
      }
    }

    if (this.state.coinsCollected >= 100) {
      this.state.coinsCollected -= 100;
      this.state.lives++;
      emit('bonks-coin');
    }
  }

  // ═══════════════════════════════════════
  // POWER-UP ITEMS
  // ═══════════════════════════════════════

  private updatePowerUpItems(emit: (s: string) => void): void {
    const p = this.state.player;

    for (const item of this.state.powerUpItems) {
      if (!item.alive) continue;

      if (item.rising > 0) {
        item.y -= 1;
        item.rising--;
        continue;
      }

      // Mushroom walks
      if (item.type === 'mushroom') {
        item.vy += GRAVITY;
        if (item.vy > PLAYER_MAX_FALL) item.vy = PLAYER_MAX_FALL;
        item.x += item.vx;
        item.y += item.vy;
        item.onGround = false;

        const dir = item.vx > 0 ? 1 : -1;
        const checkCol = dir > 0
          ? Math.floor((item.x + 16) / TILE)
          : Math.floor(item.x / TILE);
        const checkRow = Math.floor((item.y + 8) / TILE);
        if (isSolid(getTile(this.state.tiles, checkCol, checkRow))) {
          item.vx = -item.vx;
        }

        const botRow = Math.floor((item.y + 16) / TILE);
        const leftCol = Math.floor((item.x + 2) / TILE);
        const rightCol = Math.floor((item.x + 14) / TILE);
        for (let c = leftCol; c <= rightCol; c++) {
          if (isSolid(getTile(this.state.tiles, c, botRow))) {
            item.y = botRow * TILE - 16;
            item.vy = 0;
            item.onGround = true;
            break;
          }
        }
      }

      // Collection
      if (this.overlaps(p, { x: item.x, y: item.y, width: 16 * 2, height: 16 * 2 })) {
        item.alive = false;
        this.collectPowerUp(item.type, emit);
      }

      if (item.y > this.state.levelHeight + TILE * 2) item.alive = false;
    }

    this.state.powerUpItems = this.state.powerUpItems.filter(i => i.alive);
  }

  private collectPowerUp(type: PowerUpItem['type'], emit: (s: string) => void): void {
    const p = this.state.player;

    if (type === 'mushroom') {
      if (p.powerUp === 'none') {
        p.powerUp = 'big';
        p.height = TILE * 1.5;
        p.y -= TILE * 0.5;
        p.growTimer = GROW_FREEZE_FRAMES;
        emit('bonks-block');
      } else {
        this.state.score += 1000;
      }
    } else if (type === 'flower') {
      if (p.powerUp === 'none') {
        p.powerUp = 'big';
        p.height = TILE * 1.5;
        p.y -= TILE * 0.5;
        p.growTimer = GROW_FREEZE_FRAMES;
      } else {
        p.powerUp = 'fire';
      }
      emit('bonks-block');
    }
  }

  // ═══════════════════════════════════════
  // QUESTION BLOCKS & BRICKS
  // ═══════════════════════════════════════

  private hitQuestionBlock(col: number, row: number, emit: (s: string) => void): void {
    const qb = this.state.questionBlocks.find(q => q.col === col && q.row === row);
    if (!qb || qb.hit) return;

    qb.hit = true;
    qb.popTimer = 10;

    const tiles = this.state.tiles;
    const line = tiles[row];
    tiles[row] = line.substring(0, col) + 'B' + line.substring(col + 1);

    if (qb.content === 'coin') {
      this.state.coins.push({
        x: col * TILE + TILE / 4,
        y: row * TILE - TILE,
        collected: false, floating: false, popTimer: 15,
      });
      this.state.score += 50;
      emit('bonks-coin');
    } else {
      this.spawnPowerUpFromBlock(col, row, qb.content);
      emit('bonks-block');
    }
  }

  private hitBrick(col: number, row: number, emit: (s: string) => void): void {
    const p = this.state.player;
    if (p.powerUp !== 'none') {
      const tiles = this.state.tiles;
      const line = tiles[row];
      tiles[row] = line.substring(0, col) + '.' + line.substring(col + 1);

      for (let i = 0; i < 4; i++) {
        this.state.particles.push({
          x: col * TILE + TILE / 2,
          y: row * TILE + TILE / 2,
          vx: (Math.random() - 0.5) * 6,
          vy: -Math.random() * 6 - 2,
          life: 30, color: 0x8b4513, size: 6,
          type: 'debris',
        });
      }
      this.state.score += 25;
      emit('bonks-brick');
    }
  }

  private spawnPowerUpFromBlock(col: number, row: number, type: PowerUpItem['type']): void {
    const startVx = type === 'mushroom' ? ENEMY_SPEED : 0;
    this.state.powerUpItems.push({
      x: col * TILE,
      y: row * TILE,
      vx: startVx, vy: 0,
      type,
      alive: true,
      rising: 16,
      onGround: false,
    });
  }

  // ═══════════════════════════════════════
  // PARTICLES
  // ═══════════════════════════════════════

  private updateParticles(): void {
    for (const p of this.state.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.type !== 'score') {
        p.vy += 0.3;
      } else {
        p.vy = -0.8;
      }
      p.life--;
    }
    this.state.particles = this.state.particles.filter(p => p.life > 0);
  }

  private spawnParticles(x: number, y: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.state.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 4 - 1,
        life: 20 + Math.random() * 15,
        color, size: 3 + Math.random() * 3,
      });
    }
  }

  private spawnScorePopup(x: number, y: number, text: string): void {
    this.state.particles.push({
      x, y, vx: 0, vy: -1.5,
      life: 40, color: 0xFFDD00, size: 0,
      type: 'score', text,
    });
  }

  // ═══════════════════════════════════════
  // COMPANION (CHONK)
  // ═══════════════════════════════════════

  private updateCompanion(emit: (s: string) => void): void {
    const ch = this.state.companion;
    if (!ch || !ch.alive) return;
    const p = this.state.player;

    ch.frame++;

    // Running away after being hit — count down and return to spawn
    if (ch.runningAway) {
      ch.returnTimer--;
      ch.vy += GRAVITY;
      if (ch.vy > PLAYER_MAX_FALL) ch.vy = PLAYER_MAX_FALL;
      ch.x += ch.vx;
      ch.y += ch.vy;
      this.collideCompanion(ch);
      ch.anim = 'walk';
      if (ch.returnTimer <= 0) {
        ch.runningAway = false;
        ch.x = ch.spawnX;
        ch.y = ch.spawnY;
        ch.vx = ENEMY_SPEED * 0.6;
        ch.vy = 0;
        ch.facing = 'right';
        ch.flutterTimer = CHONK_FLUTTER_FRAMES;
      }
      return;
    }

    if (ch.mounted) {
      // Chonk follows player exactly
      ch.x = p.x - 2;
      ch.y = p.y + p.height - ch.height;
      ch.facing = p.facing;
      ch.onGround = p.onGround;

      // Flutter ability while mounted: hold jump in air to slow descent
      const jumpHeld = this.keys.has('ArrowUp') || this.keys.has('w') || this.keys.has('W') || this.keys.has(' ');
      if (!p.onGround && jumpHeld && p.vy > 0 && ch.flutterTimer > 0) {
        ch.flutterTimer--;
        ch.anim = 'flutter';
        // Reduce player's fall speed significantly
        p.vy = Math.min(p.vy, 1.5);
      } else {
        ch.anim = p.onGround ? (Math.abs(p.vx) > 0.3 ? 'walk' : 'idle') : (p.vy < 0 ? 'jump' : 'fall');
      }

      // Reset flutter on ground
      if (p.onGround) {
        ch.flutterTimer = CHONK_FLUTTER_FRAMES;
      }

      // Dismount: press Down
      const wantDown = this.keys.has('ArrowDown') || this.keys.has('s') || this.keys.has('S');
      if (wantDown && p.onGround) {
        this.dismountChonk(false);
        emit('bonks-jump');
      }
      return;
    }

    // Free-roaming Chonk — stands still digging in the ground
    ch.vx = 0;
    ch.vy += GRAVITY;
    if (ch.vy > PLAYER_MAX_FALL) ch.vy = PLAYER_MAX_FALL;
    ch.y += ch.vy;
    this.collideCompanion(ch);

    ch.facing = 'right';
    // Alternate between tongue (digging) and idle every ~40 frames
    ch.anim = Math.floor(ch.frame / 20) % 2 === 0 ? 'tongue' : 'idle';

    // Check if player lands on Chonk to mount
    if (p.alive && p.vy >= 0 && !p.onGround) {
      if (this.overlaps(p, ch) && p.y + p.height < ch.y + ch.height * 0.6) {
        this.mountChonk();
        p.vy = CHARACTERS[p.character].jump * 0.3;
        emit('bonks-stomp');
      }
    }
  }

  private mountChonk(): void {
    const ch = this.state.companion;
    if (!ch) return;
    ch.mounted = true;
    ch.flutterTimer = CHONK_FLUTTER_FRAMES;
  }

  private dismountChonk(fromHit: boolean): void {
    const ch = this.state.companion;
    const p = this.state.player;
    if (!ch) return;
    ch.mounted = false;

    if (fromHit) {
      // Chonk runs away, returns after a delay
      ch.runningAway = true;
      ch.returnTimer = CHONK_RETURN_FRAMES;
      ch.vx = p.facing === 'right' ? -3 : 3; // run opposite direction
      ch.vy = -5;
      p.invincible = INVINCIBLE_FRAMES / 2;
    }
  }

  private collideCompanion(ch: CompanionState): void {
    const tiles = this.state.tiles;

    // Horizontal
    if (ch.vx < 0) {
      const leftCol = Math.floor(ch.x / TILE);
      const topRow = Math.floor(ch.y / TILE);
      const botRow = Math.floor((ch.y + ch.height - 1) / TILE);
      for (let r = topRow; r <= botRow; r++) {
        if (isSolid(getTile(tiles, leftCol, r))) {
          ch.x = (leftCol + 1) * TILE;
          ch.vx = -ch.vx;
          break;
        }
      }
    } else if (ch.vx > 0) {
      const rightCol = Math.floor((ch.x + ch.width) / TILE);
      const topRow = Math.floor(ch.y / TILE);
      const botRow = Math.floor((ch.y + ch.height - 1) / TILE);
      for (let r = topRow; r <= botRow; r++) {
        if (isSolid(getTile(tiles, rightCol, r))) {
          ch.x = rightCol * TILE - ch.width;
          ch.vx = -ch.vx;
          break;
        }
      }
    }

    // Vertical
    ch.onGround = false;
    if (ch.vy >= 0) {
      const botRow = Math.floor((ch.y + ch.height) / TILE);
      const leftCol = Math.floor((ch.x + 2) / TILE);
      const rightCol = Math.floor((ch.x + ch.width - 2) / TILE);
      for (let c = leftCol; c <= rightCol; c++) {
        if (isSolid(getTile(tiles, c, botRow))) {
          ch.y = botRow * TILE - ch.height;
          ch.vy = 0;
          ch.onGround = true;
          break;
        }
      }
    }

    // Fall off screen → return to spawn
    if (ch.y > this.state.levelHeight + TILE * 2) {
      ch.x = ch.spawnX;
      ch.y = ch.spawnY;
      ch.vx = ENEMY_SPEED * 0.6;
      ch.vy = 0;
      ch.runningAway = false;
      ch.mounted = false;
    }
  }

  // ═══════════════════════════════════════
  // CAMERA
  // ═══════════════════════════════════════

  private updateCamera(): void {
    const p = this.state.player;
    const targetX = p.x - 400;
    this.state.cameraX += (targetX - this.state.cameraX) * 0.1;
    if (this.state.cameraX < 0) this.state.cameraX = 0;
    const maxCam = this.state.levelWidth - 900;
    if (maxCam > 0 && this.state.cameraX > maxCam) this.state.cameraX = maxCam;
  }

  // ═══════════════════════════════════════
  // TIMER
  // ═══════════════════════════════════════

  private updateTimer(emit: (s: string) => void): void {
    this.state.timerFrames++;
    if (this.state.timerFrames >= 60) {
      this.state.timerFrames = 0;
      this.state.timeLeft--;
      if (this.state.timeLeft <= 0) {
        this.killPlayer(emit);
      }
    }
  }

  // ═══════════════════════════════════════
  // FLAG / LEVEL END
  // ═══════════════════════════════════════

  private checkFlagReached(emit: (s: string) => void): void {
    if (this.state.flagReached) return;
    const p = this.state.player;
    if (p.x + p.width > this.flagX && p.x < this.flagX + TILE * 2) {
      this.state.flagReached = true;
      this.state.phase = 'complete';
      this.state.score += 1000;
      this.state.score += this.state.timeLeft * 5;
      this.state.transitionTimer = 0;
      emit('game-win');
    }
  }

  // ═══════════════════════════════════════
  // DAMAGE / DEATH
  // ═══════════════════════════════════════

  private hurtPlayer(emit: (s: string) => void): void {
    const p = this.state.player;
    if (p.invincible > 0) return;

    // If riding Chonk, dismount instead of taking damage
    if (this.state.companion?.mounted) {
      this.dismountChonk(true);
      emit('bonks-die');
      return;
    }

    if (p.powerUp === 'fire') {
      p.powerUp = 'big';
      p.invincible = INVINCIBLE_FRAMES;
      emit('bonks-die');
    } else if (p.powerUp === 'big') {
      p.powerUp = 'none';
      const baseH = TILE - 2;
      p.y += p.height - baseH;
      p.height = baseH;
      p.invincible = INVINCIBLE_FRAMES;
      p.growTimer = GROW_FREEZE_FRAMES;
      emit('bonks-die');
    } else {
      this.killPlayer(emit);
    }
  }

  private killPlayer(emit: (s: string) => void): void {
    const p = this.state.player;
    if (p.invincible > 0) return;
    p.alive = false;
    p.vx = 0;
    p.vy = 0;
    this.state.phase = 'dying';
    this.state.lives--;
    this.state.transitionTimer = 0;
    emit('bonks-die');
  }

  private updateDying(): void {
    this.state.transitionTimer++;
    // Brief pause then respawn or game over
    if (this.state.transitionTimer > 60) {
      if (this.state.lives <= 0) {
        this.state.phase = 'game-over';
        this.state.transitionTimer = 0;
      } else {
        this.retryLevel();
      }
    }
  }

  // ═══════════════════════════════════════
  // COLLISION HELPERS
  // ═══════════════════════════════════════

  private overlaps(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
  ): boolean {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }

  private overlapsCoin(
    p: { x: number; y: number; width: number; height: number },
    c: { x: number; y: number },
  ): boolean {
    const coinSize = TILE / 2;
    return p.x < c.x + coinSize &&
           p.x + p.width > c.x &&
           p.y < c.y + coinSize &&
           p.y + p.height > c.y;
  }
}
