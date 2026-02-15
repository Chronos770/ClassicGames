import {
  CheckersState,
  CheckerMove,
  PieceColor,
  createInitialBoard,
  getAllMoves,
  getValidMoves,
  applyMove,
  countPieces,
} from './rules';

export class CheckersGame {
  private state: CheckersState;
  private listeners: Set<(state: CheckersState) => void> = new Set();
  private undoStack: CheckersState[] = [];
  // FIX BUG 6: Track turn boundaries so undo can revert an entire turn
  private turnBoundaries: number[] = [];

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): CheckersState {
    const board = createInitialBoard();
    const counts = countPieces(board);
    return {
      board,
      currentPlayer: 'red',
      phase: 'playing',
      selectedPiece: null,
      mustJump: false,
      jumpingPiece: null,
      winner: null,
      redCount: counts.red,
      blackCount: counts.black,
    };
  }

  initialize(): void {
    this.state = this.createInitialState();
    this.undoStack = [];
    this.turnBoundaries = [];
    this.notify();
  }

  getState(): CheckersState {
    return this.state;
  }

  subscribe(listener: (state: CheckersState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private pushUndo(): void {
    this.undoStack.push(JSON.parse(JSON.stringify(this.state)));
  }

  // FIX BUG 6: Mark the start of a new logical turn for undo purposes
  markTurnStart(): void {
    this.turnBoundaries.push(this.undoStack.length);
  }

  // FIX BUG 4/6: Undo an entire turn (potentially multiple moves for multi-jumps)
  undoTurn(): boolean {
    const boundary = this.turnBoundaries.pop();
    if (boundary === undefined) return false;
    if (boundary >= this.undoStack.length) return false;

    // undoStack[boundary] is the state saved before the first move of this turn
    const target = JSON.parse(JSON.stringify(this.undoStack[boundary]));
    this.undoStack.length = boundary;
    this.state = target;

    this.notify();
    return true;
  }

  undo(): boolean {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.state = prev;
    this.notify();
    return true;
  }

  selectPiece(row: number, col: number): CheckerMove[] {
    const piece = this.state.board[row][col];
    if (!piece || piece.color !== this.state.currentPlayer) return [];

    const moves = getValidMoves(this.state.board, row, col, this.state.jumpingPiece);
    const allMoves = getAllMoves(this.state.board, this.state.currentPlayer, this.state.jumpingPiece);
    const hasJumps = allMoves.some((m) => m.isJump);

    // If forced jumps exist, only show pieces that can jump
    if (hasJumps && !moves.some((m) => m.isJump)) return [];

    this.state.selectedPiece = { row, col };
    this.notify();
    return hasJumps ? moves.filter((m) => m.isJump) : moves;
  }

  makeMove(move: CheckerMove): boolean {
    this.pushUndo();

    // FIX BUG 8: Track whether piece was already a king before this move
    const pieceBeforeMove = this.state.board[move.fromRow][move.fromCol];
    const wasKingBefore = pieceBeforeMove?.isKing ?? false;

    this.state.board = applyMove(this.state.board, move);
    const counts = countPieces(this.state.board);
    this.state.redCount = counts.red;
    this.state.blackCount = counts.black;
    this.state.selectedPiece = null;

    // Check for multi-jump
    if (move.isJump) {
      // FIX BUG 8: If the piece was just promoted to king, it cannot continue jumping
      const pieceAfterMove = this.state.board[move.toRow][move.toCol];
      const justPromoted = pieceAfterMove?.isKing && !wasKingBefore;

      if (!justPromoted) {
        const furtherJumps = getValidMoves(this.state.board, move.toRow, move.toCol, { row: move.toRow, col: move.toCol });
        const jumps = furtherJumps.filter((m) => m.isJump);
        if (jumps.length > 0) {
          this.state.jumpingPiece = { row: move.toRow, col: move.toCol };
          this.state.mustJump = true;
          this.notify();
          return true;
        }
      }
    }

    this.state.jumpingPiece = null;
    this.state.mustJump = false;

    // Switch player
    this.state.currentPlayer = this.state.currentPlayer === 'red' ? 'black' : 'red';

    // Check win conditions
    if (counts.red === 0) {
      this.state.winner = 'black';
      this.state.phase = 'finished';
    } else if (counts.black === 0) {
      this.state.winner = 'red';
      this.state.phase = 'finished';
    } else {
      // Check if current player has any moves
      const availMoves = getAllMoves(this.state.board, this.state.currentPlayer);
      if (availMoves.length === 0) {
        this.state.winner = this.state.currentPlayer === 'red' ? 'black' : 'red';
        this.state.phase = 'finished';
      }
    }

    this.notify();
    return true;
  }

  getAllValidMoves(): CheckerMove[] {
    return getAllMoves(this.state.board, this.state.currentPlayer, this.state.jumpingPiece);
  }
}
