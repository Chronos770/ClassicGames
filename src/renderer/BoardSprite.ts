import { Graphics, Container } from 'pixi.js';
import { ChessBoardTheme } from '../stores/settingsStore';

export interface BoardConfig {
  rows: number;
  cols: number;
  cellSize: number;
  lightColor: number;
  darkColor: number;
  borderColor: number;
  borderWidth: number;
}

export interface BoardThemeColors {
  lightColor: number;
  darkColor: number;
  borderColor: number;
  label: string;
}

export const CHESS_BOARD_THEMES: Record<ChessBoardTheme, BoardThemeColors> = {
  classic: { lightColor: 0xe8d5a8, darkColor: 0x8b5e3c, borderColor: 0x4a2916, label: 'Classic' },
  blue:    { lightColor: 0xdce5ed, darkColor: 0x5b7ea1, borderColor: 0x2e4a66, label: 'Ocean' },
  green:   { lightColor: 0xe8edce, darkColor: 0x6d8b3c, borderColor: 0x3a4a1e, label: 'Forest' },
  red:     { lightColor: 0xeddddd, darkColor: 0xa15b5b, borderColor: 0x662e2e, label: 'Ruby' },
  purple:  { lightColor: 0xe5dced, darkColor: 0x7e5ba1, borderColor: 0x4a2e66, label: 'Royal' },
  icy:     { lightColor: 0xeaf3f7, darkColor: 0x6aabc2, borderColor: 0x2d5a6e, label: 'Ice' },
};

export const CHESS_BOARD_CONFIG: BoardConfig = {
  rows: 8,
  cols: 8,
  cellSize: 70,
  lightColor: 0xe8d5a8,
  darkColor: 0x8b5e3c,
  borderColor: 0x4a2916,
  borderWidth: 16,
};

export function getThemedChessBoardConfig(theme: ChessBoardTheme): BoardConfig {
  const t = CHESS_BOARD_THEMES[theme];
  return { ...CHESS_BOARD_CONFIG, lightColor: t.lightColor, darkColor: t.darkColor, borderColor: t.borderColor };
}

export const CHECKERS_BOARD_CONFIG: BoardConfig = {
  rows: 8,
  cols: 8,
  cellSize: 70,
  lightColor: 0xf0d9b5,
  darkColor: 0x769656,
  borderColor: 0x3d2b1f,
  borderWidth: 16,
};

export function createBoard(config: BoardConfig): Container {
  const container = new Container();
  const { rows, cols, cellSize, lightColor, darkColor, borderColor, borderWidth } = config;
  const boardWidth = cols * cellSize;
  const boardHeight = rows * cellSize;

  // Border / frame
  const border = new Graphics();
  border.roundRect(-borderWidth, -borderWidth, boardWidth + borderWidth * 2, boardHeight + borderWidth * 2, 4);
  border.fill({ color: borderColor });

  // Wood grain on border
  for (let i = 0; i < 10; i++) {
    const y = -borderWidth + Math.random() * (boardHeight + borderWidth * 2);
    border.rect(-borderWidth, y, boardWidth + borderWidth * 2, 1);
    border.fill({ color: 0x5a3219, alpha: 0.2 });
  }

  // Inner shadow
  border.rect(0, 0, boardWidth, 3);
  border.fill({ color: 0x000000, alpha: 0.15 });
  border.rect(0, 0, 3, boardHeight);
  border.fill({ color: 0x000000, alpha: 0.15 });

  container.addChild(border);

  // Board squares
  const squares = new Graphics();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const isLight = (row + col) % 2 === 0;
      squares.rect(col * cellSize, row * cellSize, cellSize, cellSize);
      squares.fill({ color: isLight ? lightColor : darkColor });
    }
  }
  container.addChild(squares);

  return container;
}

export function highlightCell(
  container: Container,
  row: number,
  col: number,
  cellSize: number,
  color: number = 0x44ff44,
  alpha: number = 0.35
): Graphics {
  const highlight = new Graphics();
  highlight.circle(col * cellSize + cellSize / 2, row * cellSize + cellSize / 2, cellSize * 0.2);
  highlight.fill({ color, alpha });
  container.addChild(highlight);
  return highlight;
}
