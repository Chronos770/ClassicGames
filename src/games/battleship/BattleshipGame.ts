import {
  BattleshipState,
  BattleshipBoard,
  GameMode,
  WeaponType,
  createEmptyBoard,
  placeShip,
  fireShot,
  fireMultiShot,
  allShipsSunk,
  randomPlacement,
  canPlaceShip,
  getGridSize,
  getShipTypes,
  STARTING_WEAPONS,
  WEAPON_DEFS,
} from './rules';

export class BattleshipGame {
  private state: BattleshipState;
  private listeners: Set<(state: BattleshipState) => void> = new Set();
  private _isMultiplayer = false;

  constructor() {
    this.state = this.createInitialState('classic');
  }

  setMultiplayer(mp: boolean): void {
    this._isMultiplayer = mp;
  }

  private createInitialState(mode: GameMode): BattleshipState {
    const gridSize = getGridSize(mode);
    const shipTypes = getShipTypes(mode);
    return {
      playerBoard: createEmptyBoard(gridSize),
      aiBoard: createEmptyBoard(gridSize),
      currentPlayer: 'player',
      phase: 'placement',
      winner: null,
      playerShipsToPlace: [...shipTypes],
      placementOrientation: 'horizontal',
      mode,
      gridSize,
      playerWeapons: mode === 'advanced' ? { ...STARTING_WEAPONS } : { torpedo: 0, 'depth-charge': 0, airstrike: 0 },
      aiWeapons: mode === 'advanced' ? { ...STARTING_WEAPONS } : { torpedo: 0, 'depth-charge': 0, airstrike: 0 },
      selectedWeapon: 'standard',
    };
  }

  initialize(mode: GameMode = 'classic'): void {
    this.state = this.createInitialState(mode);
    randomPlacement(this.state.aiBoard, getShipTypes(mode));
    this.notify();
  }

  getState(): BattleshipState {
    return this.state;
  }

  subscribe(listener: (state: BattleshipState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  toggleOrientation(): void {
    this.state.placementOrientation =
      this.state.placementOrientation === 'horizontal' ? 'vertical' : 'horizontal';
    this.notify();
  }

  selectWeapon(weapon: WeaponType): void {
    if (weapon === 'standard') {
      this.state.selectedWeapon = weapon;
    } else if (this.state.playerWeapons[weapon] > 0) {
      this.state.selectedWeapon = weapon;
    }
    this.notify();
  }

  placePlayerShip(row: number, col: number): boolean {
    if (this.state.phase !== 'placement') return false;
    if (this.state.playerShipsToPlace.length === 0) return false;

    const ship = this.state.playerShipsToPlace[0];
    const horizontal = this.state.placementOrientation === 'horizontal';

    if (!placeShip(this.state.playerBoard, ship.name, row, col, ship.size, horizontal)) {
      return false;
    }

    this.state.playerShipsToPlace = this.state.playerShipsToPlace.slice(1);

    if (this.state.playerShipsToPlace.length === 0 && !this._isMultiplayer) {
      this.state.phase = 'playing';
    }

    this.notify();
    return true;
  }

  canPlaceAt(row: number, col: number): boolean {
    if (this.state.playerShipsToPlace.length === 0) return false;
    const ship = this.state.playerShipsToPlace[0];
    return canPlaceShip(
      this.state.playerBoard,
      row, col, ship.size,
      this.state.placementOrientation === 'horizontal'
    );
  }

  canPlaceSpecific(name: string, row: number, col: number, horizontal: boolean): boolean {
    const ship = this.state.playerShipsToPlace.find(s => s.name === name);
    if (!ship) return false;
    return canPlaceShip(this.state.playerBoard, row, col, ship.size, horizontal);
  }

  placeSpecificShip(name: string, row: number, col: number, horizontal: boolean): boolean {
    if (this.state.phase !== 'placement') return false;
    const idx = this.state.playerShipsToPlace.findIndex(s => s.name === name);
    if (idx === -1) return false;

    const ship = this.state.playerShipsToPlace[idx];
    if (!placeShip(this.state.playerBoard, ship.name, row, col, ship.size, horizontal)) {
      return false;
    }

    this.state.playerShipsToPlace = [
      ...this.state.playerShipsToPlace.slice(0, idx),
      ...this.state.playerShipsToPlace.slice(idx + 1),
    ];

    if (this.state.playerShipsToPlace.length === 0 && !this._isMultiplayer) {
      this.state.phase = 'playing';
    }

    this.notify();
    return true;
  }

  undoLastShip(): boolean {
    if (this.state.phase !== 'placement') return false;
    const board = this.state.playerBoard;
    if (board.ships.length === 0) return false;

    const lastShip = board.ships.pop()!;
    for (const pos of lastShip.positions) {
      board.grid[pos.row][pos.col] = 'empty';
    }
    this.state.playerShipsToPlace.push({ name: lastShip.name, size: lastShip.size });
    this.notify();
    return true;
  }

  resetPlacement(): void {
    const gridSize = this.state.gridSize;
    this.state.playerBoard = createEmptyBoard(gridSize);
    this.state.playerShipsToPlace = [...getShipTypes(this.state.mode)];
    this.state.phase = 'placement';
    this.notify();
  }

  randomPlaceAll(): void {
    const mode = this.state.mode;
    const gridSize = this.state.gridSize;
    this.state.playerBoard = createEmptyBoard(gridSize);
    this.state.playerShipsToPlace = [...getShipTypes(mode)];
    randomPlacement(this.state.playerBoard, getShipTypes(mode));
    this.state.playerShipsToPlace = [];
    if (!this._isMultiplayer) {
      this.state.phase = 'playing';
    }
    this.notify();
  }

  playerFire(row: number, col: number): 'hit' | 'miss' | 'already-shot' | 'sunk' | null {
    if (this.state.phase !== 'playing' || this.state.currentPlayer !== 'player') return null;

    const result = fireShot(this.state.aiBoard, row, col);
    if (result === 'already-shot') return result;

    if (allShipsSunk(this.state.aiBoard)) {
      this.state.winner = 'player';
      this.state.phase = 'finished';
    } else {
      this.state.currentPlayer = 'ai';
    }

    this.notify();
    return result;
  }

  playerFireWeapon(row: number, col: number): { row: number; col: number; result: 'hit' | 'miss' | 'already-shot' | 'sunk' }[] | null {
    if (this.state.phase !== 'playing' || this.state.currentPlayer !== 'player') return null;

    const weaponType = this.state.selectedWeapon;
    const weapon = WEAPON_DEFS[weaponType];

    // Consume special weapon
    if (weaponType !== 'standard') {
      if (this.state.playerWeapons[weaponType] <= 0) return null;
      this.state.playerWeapons[weaponType]--;
      this.state.selectedWeapon = 'standard';
    }

    const results = fireMultiShot(this.state.aiBoard, row, col, weapon);

    // All shots were already-shot — refund weapon but return results for UI feedback
    const actualShots = results.filter(r => r.result !== 'already-shot');
    if (actualShots.length === 0) {
      if (weaponType !== 'standard') {
        this.state.playerWeapons[weaponType]++;
        this.state.selectedWeapon = weaponType;
      }
      return results;
    }

    if (allShipsSunk(this.state.aiBoard)) {
      this.state.winner = 'player';
      this.state.phase = 'finished';
    } else {
      this.state.currentPlayer = 'ai';
    }

    this.notify();
    return results;
  }

  getAIBoard(): BattleshipBoard {
    return this.state.aiBoard;
  }

  getPlayerBoard(): BattleshipBoard {
    return this.state.playerBoard;
  }

  setCurrentPlayer(player: 'player' | 'ai'): void {
    this.state.currentPlayer = player;
    this.notify();
  }

  aiFire(row: number, col: number): 'hit' | 'miss' | 'sunk' | 'already-shot' {
    const result = fireShot(this.state.playerBoard, row, col);
    if (result === 'already-shot') return result;

    if (allShipsSunk(this.state.playerBoard)) {
      this.state.winner = 'ai';
      this.state.phase = 'finished';
    } else {
      this.state.currentPlayer = 'player';
    }

    this.notify();
    return result;
  }

  // ── Multiplayer helpers ────────────────────────────────────

  /** Process an incoming shot from the remote player against our board */
  applyRemoteShot(row: number, col: number): 'hit' | 'miss' | 'sunk' | 'already-shot' {
    const result = fireShot(this.state.playerBoard, row, col);
    if (result === 'already-shot') return result;

    if (allShipsSunk(this.state.playerBoard)) {
      this.state.winner = 'ai'; // 'ai' = remote opponent
      this.state.phase = 'finished';
    } else {
      this.state.currentPlayer = 'player';
    }

    this.notify();
    return result;
  }

  /** Apply the result of our shot on the remote player's board (we don't have their board) */
  applyRemoteResult(row: number, col: number, result: 'hit' | 'miss' | 'sunk'): void {
    if (result === 'hit' || result === 'sunk') {
      this.state.aiBoard.grid[row][col] = 'hit';
    } else {
      this.state.aiBoard.grid[row][col] = 'miss';
    }
    // If sunk, we mark a virtual ship as sunk for display
    if (result === 'sunk') {
      // Create or update a tracking ship entry
      const existingShip = this.state.aiBoard.ships.find(s => !s.sunk && s.positions.some(p => p.row === row && p.col === col));
      if (existingShip) {
        existingShip.sunk = true;
      }
    }
    this.notify();
  }

  /** Mark the game as won by us (when remote says all ships sunk) */
  setPlayerWins(): void {
    this.state.winner = 'player';
    this.state.phase = 'finished';
    this.notify();
  }

  /** Mark the game as lost (when remote sinks all our ships) */
  setOpponentWins(): void {
    this.state.winner = 'ai';
    this.state.phase = 'finished';
    this.notify();
  }

  /** Switch turn to opponent without affecting board */
  switchToOpponent(): void {
    this.state.currentPlayer = 'ai';
    this.notify();
  }

  /** Begin playing phase (both players have placed ships) */
  startPlaying(): void {
    this.state.phase = 'playing';
    this.notify();
  }

  /** Initialize for multiplayer (no AI board placement) */
  initializeMultiplayer(mode: GameMode): void {
    const gridSize = getGridSize(mode);
    const shipTypes = getShipTypes(mode);
    this.state = {
      playerBoard: createEmptyBoard(gridSize),
      aiBoard: createEmptyBoard(gridSize), // tracking board (empty, we mark as shots land)
      currentPlayer: 'player',
      phase: 'placement',
      winner: null,
      playerShipsToPlace: [...shipTypes],
      placementOrientation: 'horizontal',
      mode,
      gridSize,
      playerWeapons: mode === 'advanced' ? { ...STARTING_WEAPONS } : { torpedo: 0, 'depth-charge': 0, airstrike: 0 },
      aiWeapons: mode === 'advanced' ? { ...STARTING_WEAPONS } : { torpedo: 0, 'depth-charge': 0, airstrike: 0 },
      selectedWeapon: 'standard',
    };
    // Don't place AI ships — opponent does their own
    this.notify();
  }
}
