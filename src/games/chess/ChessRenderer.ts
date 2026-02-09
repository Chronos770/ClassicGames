import { Application, Container, Graphics, Text, TextStyle, FederatedPointerEvent } from 'pixi.js';
import { createBoard, CHESS_BOARD_CONFIG, getThemedChessBoardConfig, highlightCell } from '../../renderer/BoardSprite';
import { createChessPiece } from '../../renderer/PieceSprite';
import { createWoodSurface } from '../../renderer/TableSurface';
import { WinCelebration } from '../../renderer/effects/WinCelebration';
import { AnimationQueue, Easings } from '../../engine/AnimationQueue';
import { useSettingsStore } from '../../stores/settingsStore';
import { ChessGame } from './ChessGame';
import { ChessGameState, Square, squareToCoords, coordsToSquare } from './rules';

const CELL_SIZE = CHESS_BOARD_CONFIG.cellSize;
const BORDER = CHESS_BOARD_CONFIG.borderWidth;
const BOARD_X = 50;
const BOARD_Y = 50;

export class ChessRenderer {
  private app: Application;
  private game: ChessGame;
  private mainContainer: Container;
  private boardContainer: Container;
  private piecesContainer: Container;
  private highlightsContainer: Container;
  private animationContainer: Container;
  private arrowsContainer: Container;
  private celebration: WinCelebration | null = null;
  private animationQueue: AnimationQueue;
  private isAnimating: boolean = false;

  private selectedSquare: Square | null = null;
  private legalMoveSquares: Square[] = [];
  private onMove?: (from: Square, to: Square) => void;
  private onArrowsChange?: (arrows: { from: Square; to: Square; color: number }[]) => void;

  // Drag-and-drop state
  private dragSprite: Container | null = null;
  private dragFromSquare: Square | null = null;
  private lastState: ChessGameState | null = null;

  // Arrow overlay state
  private arrows: { from: Square; to: Square; color: number }[] = [];
  private arrowDragStart: Square | null = null;

  constructor(app: Application, game: ChessGame) {
    this.app = app;
    this.game = game;
    this.mainContainer = new Container();
    this.boardContainer = new Container();
    this.highlightsContainer = new Container();
    this.piecesContainer = new Container();
    this.animationContainer = new Container();
    this.arrowsContainer = new Container();
    this.animationQueue = new AnimationQueue();

    // Wood background
    const bg = createWoodSurface(app.screen.width, app.screen.height);
    this.mainContainer.addChild(bg);

    // Board (themed)
    const boardTheme = useSettingsStore.getState().chessBoardTheme;
    const boardConfig = getThemedChessBoardConfig(boardTheme);
    const board = createBoard(boardConfig);
    board.x = BOARD_X + BORDER;
    board.y = BOARD_Y + BORDER;
    this.boardContainer.addChild(board);
    this.boardContainer.x = 0;
    this.boardContainer.y = 0;

    this.mainContainer.addChild(this.boardContainer);
    this.mainContainer.addChild(this.highlightsContainer);
    this.mainContainer.addChild(this.piecesContainer);
    this.mainContainer.addChild(this.animationContainer);
    this.mainContainer.addChild(this.arrowsContainer);

    app.stage.addChild(this.mainContainer);

    // Right-click arrow drawing
    this.setupArrowHandlers();

    // Rank/file labels
    this.renderLabels();
  }

  setOnMove(cb: (from: Square, to: Square) => void): void {
    this.onMove = cb;
  }

  setOnArrowsChange(cb: (arrows: { from: Square; to: Square; color: number }[]) => void): void {
    this.onArrowsChange = cb;
  }

  private renderLabels(): void {
    const labelStyle = new TextStyle({
      fontSize: 11,
      fill: '#ccaa77',
      fontFamily: 'Georgia, serif',
    });

    for (let i = 0; i < 8; i++) {
      // File labels (a-h)
      const fileLabel = new Text({ text: String.fromCharCode(97 + i), style: labelStyle });
      fileLabel.anchor.set(0.5);
      fileLabel.x = BOARD_X + BORDER + i * CELL_SIZE + CELL_SIZE / 2;
      fileLabel.y = BOARD_Y + BORDER + 8 * CELL_SIZE + BORDER / 2 + 4;
      this.mainContainer.addChild(fileLabel);

      // Rank labels (8-1)
      const rankLabel = new Text({ text: (8 - i).toString(), style: labelStyle });
      rankLabel.anchor.set(0.5);
      rankLabel.x = BOARD_X + BORDER / 2 - 2;
      rankLabel.y = BOARD_Y + BORDER + i * CELL_SIZE + CELL_SIZE / 2;
      this.mainContainer.addChild(rankLabel);
    }
  }

  render(state: ChessGameState): void {
    this.piecesContainer.removeChildren();
    this.highlightsContainer.removeChildren();
    this.lastState = state;

    const board = this.game.getBoard();

    // Render highlights
    if (this.selectedSquare) {
      const { row, col } = squareToCoords(this.selectedSquare);
      const selHighlight = new Graphics();
      selHighlight.rect(
        BOARD_X + BORDER + col * CELL_SIZE,
        BOARD_Y + BORDER + row * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE
      );
      selHighlight.fill({ color: 0xffff00, alpha: 0.3 });
      this.highlightsContainer.addChild(selHighlight);
    }

    for (const sq of this.legalMoveSquares) {
      const { row, col } = squareToCoords(sq);
      const dot = new Graphics();
      const cx = BOARD_X + BORDER + col * CELL_SIZE + CELL_SIZE / 2;
      const cy = BOARD_Y + BORDER + row * CELL_SIZE + CELL_SIZE / 2;

      // Check if there's a capturable piece
      const piece = board[row][col];
      if (piece) {
        dot.circle(cx, cy, CELL_SIZE * 0.45);
        dot.stroke({ color: 0x44ff44, width: 3, alpha: 0.5 });
      } else {
        dot.circle(cx, cy, CELL_SIZE * 0.15);
        dot.fill({ color: 0x44ff44, alpha: 0.4 });
      }
      this.highlightsContainer.addChild(dot);
    }

    // Check highlight
    if (state.isCheck) {
      const kingSquare = this.findKing(board, state.turn);
      if (kingSquare) {
        const { row, col } = squareToCoords(kingSquare);
        const checkHighlight = new Graphics();
        checkHighlight.rect(
          BOARD_X + BORDER + col * CELL_SIZE,
          BOARD_Y + BORDER + row * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE
        );
        checkHighlight.fill({ color: 0xff0000, alpha: 0.35 });
        this.highlightsContainer.addChild(checkHighlight);
      }
    }

    // Render pieces
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (!piece) continue;

        // Skip rendering the piece being dragged at its original position
        if (this.dragFromSquare && this.dragSprite) {
          const dragCoords = squareToCoords(this.dragFromSquare);
          if (dragCoords.row === row && dragCoords.col === col) continue;
        }

        const sprite = createChessPiece(
          piece.type,
          piece.color === 'w' ? 'white' : 'black',
          CELL_SIZE
        );

        sprite.x = BOARD_X + BORDER + col * CELL_SIZE + CELL_SIZE / 2;
        sprite.y = BOARD_Y + BORDER + row * CELL_SIZE + CELL_SIZE / 2;

        // Drag-and-drop + click for player's pieces
        const isPlayerPiece = piece.color === state.turn;
        if (isPlayerPiece) {
          sprite.cursor = 'grab';

          let dragStartX = 0;
          let dragStartY = 0;
          let isDragging = false;

          sprite.on('pointerdown', (e: FederatedPointerEvent) => {
            if (e.button !== 0) return;
            if (this.isAnimating || state.isGameOver) return;

            const local = e.getLocalPosition(this.mainContainer);
            dragStartX = local.x;
            dragStartY = local.y;
            isDragging = false;

            const square = coordsToSquare(row, col);

            // Select the piece and show legal moves immediately
            this.selectedSquare = square;
            const moves = this.game.getLegalMoves(square);
            this.legalMoveSquares = moves.map((m) => m.to as Square);
            this.clearArrows();
            this.dragFromSquare = square;

            // Render highlights
            this.render(state);
          });

          sprite.on('globalpointermove', (e: FederatedPointerEvent) => {
            if (!this.dragFromSquare || coordsToSquare(row, col) !== this.dragFromSquare) return;
            const local = e.getLocalPosition(this.mainContainer);
            const dx = local.x - dragStartX;
            const dy = local.y - dragStartY;

            // Start drag after moving 5px threshold
            if (!isDragging && Math.sqrt(dx * dx + dy * dy) > 5) {
              isDragging = true;
              const dragPiece = createChessPiece(piece.type, piece.color === 'w' ? 'white' : 'black', CELL_SIZE);
              dragPiece.alpha = 0.85;
              dragPiece.scale.set(1.1);
              dragPiece.x = local.x;
              dragPiece.y = local.y;
              this.animationContainer.addChild(dragPiece);
              this.dragSprite = dragPiece;
              this.render(state); // Re-render to hide original piece
            }

            if (isDragging && this.dragSprite) {
              this.dragSprite.x = local.x;
              this.dragSprite.y = local.y;
            }
          });
        }

        sprite.on('pointertap', () => {
          if (this.dragSprite) return;
          const square = coordsToSquare(row, col);
          this.handleSquareClick(square, state);
        });

        this.piecesContainer.addChild(sprite);
      }
    }

    // Click/drop on empty squares
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (board[row][col]) continue;

        const hitArea = new Graphics();
        hitArea.rect(
          BOARD_X + BORDER + col * CELL_SIZE,
          BOARD_Y + BORDER + row * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE
        );
        hitArea.fill({ color: 0x000000, alpha: 0.001 });
        hitArea.eventMode = 'static';
        hitArea.cursor = 'default';
        hitArea.on('pointertap', () => {
          if (this.dragSprite) return;
          const square = coordsToSquare(row, col);
          this.handleSquareClick(square, state);
        });
        this.piecesContainer.addChild(hitArea);
      }
    }

    // Set up stage-level drag listeners once
    if (!this.dragListenersSet) {
      this.setupDragListeners();
    }
  }

  private dragListenersSet = false;

  private setupDragListeners(): void {
    this.dragListenersSet = true;
    const stage = this.app.stage;
    stage.eventMode = 'static';
    stage.hitArea = this.app.screen;

    stage.on('pointerup', (e: FederatedPointerEvent) => {
      if (!this.dragFromSquare) return;

      if (this.dragSprite) {
        // Was dragging - resolve drop
        const local = e.getLocalPosition(this.mainContainer);
        const dropSquare = this.pixelToSquare(local.x, local.y);

        this.animationContainer.removeChild(this.dragSprite);
        this.dragSprite = null;

        if (dropSquare && dropSquare !== this.dragFromSquare && this.legalMoveSquares.includes(dropSquare)) {
          this.onMove?.(this.dragFromSquare, dropSquare);
          this.dragFromSquare = null;
          this.selectedSquare = null;
          this.legalMoveSquares = [];
        } else {
          this.dragFromSquare = null;
          if (this.lastState) this.render(this.lastState);
        }
      } else {
        // Was a click-select (no drag movement), keep selection active
        this.dragFromSquare = null;
      }
    });
  }

  private handleSquareClick(square: Square, state: ChessGameState): void {
    if (state.isGameOver) return;
    if (this.isAnimating) return;

    // Clear arrows on left click
    this.clearArrows();

    // If clicking a legal move target
    if (this.selectedSquare && this.legalMoveSquares.includes(square)) {
      this.onMove?.(this.selectedSquare, square);
      this.selectedSquare = null;
      this.legalMoveSquares = [];
      return;
    }

    // Select a piece
    const { row, col } = squareToCoords(square);
    const board = this.game.getBoard();
    const piece = board[row][col];

    if (piece && piece.color === state.turn) {
      this.selectedSquare = square;
      const moves = this.game.getLegalMoves(square);
      this.legalMoveSquares = moves.map((m) => m.to as Square);
      this.render(state);
    } else {
      this.selectedSquare = null;
      this.legalMoveSquares = [];
      this.render(state);
    }
  }

  private findKing(board: ({ type: string; color: string } | null)[][], color: string): Square | null {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const p = board[row][col];
        if (p && p.type === 'k' && p.color === color) {
          return coordsToSquare(row, col);
        }
      }
    }
    return null;
  }

  clearSelection(): void {
    this.selectedSquare = null;
    this.legalMoveSquares = [];
  }

  // ---- Animation methods (Phase 2) ----

  private getSquarePixel(square: Square): { x: number; y: number } {
    const { row, col } = squareToCoords(square);
    return {
      x: BOARD_X + BORDER + col * CELL_SIZE + CELL_SIZE / 2,
      y: BOARD_Y + BORDER + row * CELL_SIZE + CELL_SIZE / 2,
    };
  }

  animateMove(
    from: Square,
    to: Square,
    pieceType: string,
    pieceColor: string,
    onComplete: () => void
  ): void {
    this.isAnimating = true;

    const fromPos = this.getSquarePixel(from);
    const toPos = this.getSquarePixel(to);

    const sprite = createChessPiece(
      pieceType as any,
      pieceColor === 'w' ? 'white' : 'black',
      CELL_SIZE
    );
    sprite.x = fromPos.x;
    sprite.y = fromPos.y;
    this.animationContainer.addChild(sprite);

    const speed = useSettingsStore.getState().animationSpeed;
    const duration = speed === 'fast' ? 100 : speed === 'slow' ? 400 : 200;

    this.animationQueue.add({
      id: `move-${from}-${to}`,
      duration,
      easing: Easings.easeOutCubic,
      onUpdate: (progress: number) => {
        sprite.x = fromPos.x + (toPos.x - fromPos.x) * progress;
        sprite.y = fromPos.y + (toPos.y - fromPos.y) * progress;
      },
      onComplete: () => {
        this.animationContainer.removeChild(sprite);
        this.isAnimating = false;
        onComplete();
      },
    });
  }

  getIsAnimating(): boolean {
    return this.isAnimating;
  }

  // ---- Arrow overlay methods (Phase 4) ----

  private canvasToLogical(clientX: number, clientY: number): { x: number; y: number } {
    const canvas = this.app.canvas as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    // autoDensity scales CSS pixels to match logical size, so just use CSS ratio
    const x = (clientX - rect.left) * (this.app.screen.width / rect.width);
    const y = (clientY - rect.top) * (this.app.screen.height / rect.height);
    return { x, y };
  }

  private setupArrowHandlers(): void {
    const canvas = this.app.canvas as HTMLCanvasElement;

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 2) return; // Right-click only
      const { x, y } = this.canvasToLogical(e.clientX, e.clientY);
      const sq = this.pixelToSquare(x, y);
      if (sq) this.arrowDragStart = sq;
    });

    canvas.addEventListener('pointerup', (e) => {
      if (e.button !== 2 || !this.arrowDragStart) return;
      const { x, y } = this.canvasToLogical(e.clientX, e.clientY);
      const sq = this.pixelToSquare(x, y);

      if (sq && sq !== this.arrowDragStart) {
        // Only allow arrows that represent legal moves
        const legalMoves = this.game.getLegalMoves(this.arrowDragStart);
        const isLegal = legalMoves.some((m) => m.to === sq);
        if (!isLegal) {
          this.arrowDragStart = null;
          return;
        }

        // Determine color based on modifier keys
        let color = 0xff8c00; // orange default
        if (e.shiftKey) color = 0x44ff44; // green
        else if (e.ctrlKey) color = 0x4488ff; // blue
        else if (e.altKey) color = 0xff4444; // red

        // Toggle: remove if same arrow exists
        const idx = this.arrows.findIndex(
          (a) => a.from === this.arrowDragStart && a.to === sq
        );
        if (idx >= 0) {
          this.arrows.splice(idx, 1);
        } else {
          this.arrows.push({ from: this.arrowDragStart, to: sq, color });
        }
        this.renderArrows();
        this.onArrowsChange?.([...this.arrows]);
      }
      this.arrowDragStart = null;
    });
  }

  private pixelToSquare(x: number, y: number): Square | null {
    const col = Math.floor((x - BOARD_X - BORDER) / CELL_SIZE);
    const row = Math.floor((y - BOARD_Y - BORDER) / CELL_SIZE);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return coordsToSquare(row, col);
  }

  private renderArrows(): void {
    this.arrowsContainer.removeChildren();

    for (const arrow of this.arrows) {
      const from = this.getSquarePixel(arrow.from);
      const to = this.getSquarePixel(arrow.to);

      const g = new Graphics();
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const headLen = 18;

      // Shaft (line from center of 'from' to near center of 'to')
      const shaftEndX = to.x - Math.cos(angle) * headLen;
      const shaftEndY = to.y - Math.sin(angle) * headLen;

      g.moveTo(from.x, from.y);
      g.lineTo(shaftEndX, shaftEndY);
      g.stroke({ color: arrow.color, width: 8, alpha: 0.7 });

      // Arrowhead triangle
      const tipX = to.x;
      const tipY = to.y;
      const left = angle + Math.PI * 0.75;
      const right = angle - Math.PI * 0.75;

      g.moveTo(tipX, tipY);
      g.lineTo(tipX + Math.cos(left) * headLen, tipY + Math.sin(left) * headLen);
      g.lineTo(tipX + Math.cos(right) * headLen, tipY + Math.sin(right) * headLen);
      g.closePath();
      g.fill({ color: arrow.color, alpha: 0.7 });

      this.arrowsContainer.addChild(g);
    }
  }

  clearArrows(): void {
    this.arrows = [];
    this.arrowsContainer.removeChildren();
    this.onArrowsChange?.([]);
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
