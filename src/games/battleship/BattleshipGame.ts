import {
  BattleshipState,
  BattleshipBoard,
  createEmptyBoard,
  placeShip,
  fireShot,
  allShipsSunk,
  randomPlacement,
  SHIP_TYPES,
  canPlaceShip,
} from './rules';

export class BattleshipGame {
  private state: BattleshipState;
  private listeners: Set<(state: BattleshipState) => void> = new Set();

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): BattleshipState {
    return {
      playerBoard: createEmptyBoard(),
      aiBoard: createEmptyBoard(),
      currentPlayer: 'player',
      phase: 'placement',
      winner: null,
      playerShipsToPlace: [...SHIP_TYPES],
      placementOrientation: 'horizontal',
    };
  }

  initialize(): void {
    this.state = this.createInitialState();
    // AI places ships randomly
    randomPlacement(this.state.aiBoard);
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

  placePlayerShip(row: number, col: number): boolean {
    if (this.state.phase !== 'placement') return false;
    if (this.state.playerShipsToPlace.length === 0) return false;

    const ship = this.state.playerShipsToPlace[0];
    const horizontal = this.state.placementOrientation === 'horizontal';

    if (!placeShip(this.state.playerBoard, ship.name, row, col, ship.size, horizontal)) {
      return false;
    }

    this.state.playerShipsToPlace = this.state.playerShipsToPlace.slice(1);

    // If all ships placed, start playing
    if (this.state.playerShipsToPlace.length === 0) {
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

  randomPlaceAll(): void {
    // Reset player board
    this.state.playerBoard = createEmptyBoard();
    this.state.playerShipsToPlace = [...SHIP_TYPES];
    randomPlacement(this.state.playerBoard);
    this.state.playerShipsToPlace = [];
    this.state.phase = 'playing';
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
}
