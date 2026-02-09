import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { createBoard, CHECKERS_BOARD_CONFIG } from '../../renderer/BoardSprite';
import { createCheckerPiece } from '../../renderer/PieceSprite';
import { createWoodSurface } from '../../renderer/TableSurface';
import { WinCelebration } from '../../renderer/effects/WinCelebration';
import { CheckersState, CheckerMove } from './rules';

const CELL = CHECKERS_BOARD_CONFIG.cellSize;
const BORDER = CHECKERS_BOARD_CONFIG.borderWidth;
const BOARD_X = 50;
const BOARD_Y = 50;

export class CheckersRenderer {
  private app: Application;
  private mainContainer: Container;
  private piecesContainer: Container;
  private highlightsContainer: Container;
  private celebration: WinCelebration | null = null;
  private onCellClick?: (row: number, col: number) => void;

  constructor(app: Application) {
    this.app = app;
    this.mainContainer = new Container();
    this.highlightsContainer = new Container();
    this.piecesContainer = new Container();

    const bg = createWoodSurface(app.screen.width, app.screen.height);
    this.mainContainer.addChild(bg);

    const board = createBoard(CHECKERS_BOARD_CONFIG);
    board.x = BOARD_X + BORDER;
    board.y = BOARD_Y + BORDER;
    this.mainContainer.addChild(board);
    this.mainContainer.addChild(this.highlightsContainer);
    this.mainContainer.addChild(this.piecesContainer);

    app.stage.addChild(this.mainContainer);
  }

  setOnCellClick(cb: (row: number, col: number) => void): void {
    this.onCellClick = cb;
  }

  render(state: CheckersState, validMoves: CheckerMove[] = []): void {
    this.piecesContainer.removeChildren();
    this.highlightsContainer.removeChildren();

    // Highlight selected piece
    if (state.selectedPiece) {
      const { row, col } = state.selectedPiece;
      const highlight = new Graphics();
      highlight.rect(
        BOARD_X + BORDER + col * CELL,
        BOARD_Y + BORDER + row * CELL,
        CELL, CELL
      );
      highlight.fill({ color: 0xffff00, alpha: 0.3 });
      this.highlightsContainer.addChild(highlight);
    }

    // Highlight valid move targets
    for (const move of validMoves) {
      const dot = new Graphics();
      const cx = BOARD_X + BORDER + move.toCol * CELL + CELL / 2;
      const cy = BOARD_Y + BORDER + move.toRow * CELL + CELL / 2;

      if (move.isJump) {
        dot.circle(cx, cy, CELL * 0.35);
        dot.stroke({ color: 0xff4444, width: 3, alpha: 0.5 });
      } else {
        dot.circle(cx, cy, CELL * 0.15);
        dot.fill({ color: 0x44ff44, alpha: 0.4 });
      }
      this.highlightsContainer.addChild(dot);
    }

    // Render pieces and click areas
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        // Clickable area for all dark squares
        if ((row + col) % 2 === 1) {
          const hitArea = new Graphics();
          hitArea.rect(
            BOARD_X + BORDER + col * CELL,
            BOARD_Y + BORDER + row * CELL,
            CELL, CELL
          );
          hitArea.fill({ color: 0x000000, alpha: 0.001 });
          hitArea.eventMode = 'static';
          hitArea.cursor = 'pointer';
          hitArea.on('pointertap', () => this.onCellClick?.(row, col));
          this.piecesContainer.addChild(hitArea);
        }

        const piece = state.board[row][col];
        if (!piece) continue;

        const sprite = createCheckerPiece(
          piece.color === 'red' ? 'white' : 'black',
          CELL,
          piece.isKing
        );
        sprite.x = BOARD_X + BORDER + col * CELL + CELL / 2;
        sprite.y = BOARD_Y + BORDER + row * CELL + CELL / 2;

        sprite.on('pointertap', () => this.onCellClick?.(row, col));
        this.piecesContainer.addChild(sprite);
      }
    }

    // Piece count display
    const countStyle = new TextStyle({ fontSize: 14, fill: '#ffffff', fontFamily: 'Inter, sans-serif' });
    const redCount = new Text({ text: `Red: ${state.redCount}`, style: countStyle });
    redCount.x = BOARD_X + BORDER + 8 * CELL + 30;
    redCount.y = BOARD_Y + BORDER + 20;
    this.piecesContainer.addChild(redCount);

    const blackCount = new Text({ text: `Black: ${state.blackCount}`, style: countStyle });
    blackCount.x = BOARD_X + BORDER + 8 * CELL + 30;
    blackCount.y = BOARD_Y + BORDER + 45;
    this.piecesContainer.addChild(blackCount);
  }

  showWin(): void {
    if (!this.celebration) {
      this.celebration = new WinCelebration(this.app.stage);
    }
    this.celebration.start(this.app.screen.width / 2, this.app.screen.height / 2);
  }

  // FIX BUG 5: Allow stopping the celebration effect for new game
  stopCelebration(): void {
    if (this.celebration) {
      this.celebration.destroy();
      this.celebration = null;
    }
  }

  destroy(): void {
    this.celebration?.destroy();
    this.app.stage.removeChildren();
  }
}
