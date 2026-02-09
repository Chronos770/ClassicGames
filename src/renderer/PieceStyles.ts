import { Graphics, Container, Text, TextStyle } from 'pixi.js';
import { ChessPieceStyle } from '../stores/settingsStore';

const CHESS_SYMBOLS: Record<string, Record<string, string>> = {
  white: { k: '\u2654', q: '\u2655', r: '\u2656', b: '\u2657', n: '\u2658', p: '\u2659' },
  black: { k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F' },
};

function createClassicPiece(type: string, color: 'white' | 'black', size: number): Container {
  const container = new Container();
  const symbol = CHESS_SYMBOLS[color]?.[type] ?? '?';

  // Shadow
  const shadowStyle = new TextStyle({
    fontSize: size * 0.8,
    fontFamily: 'serif',
    fill: '#000000',
  });
  const shadow = new Text({ text: symbol, style: shadowStyle });
  shadow.anchor.set(0.5);
  shadow.x = 2;
  shadow.y = 2;
  shadow.alpha = 0.3;
  container.addChild(shadow);

  // Piece
  const pieceStyle = new TextStyle({
    fontSize: size * 0.8,
    fontFamily: 'serif',
    fill: color === 'white' ? '#ffffff' : '#1a1a1a',
    stroke: { color: color === 'white' ? '#333333' : '#666666', width: 1 },
  });
  const piece = new Text({ text: symbol, style: pieceStyle });
  piece.anchor.set(0.5);
  container.addChild(piece);

  return container;
}

function createMinimalistPiece(type: string, color: 'white' | 'black', size: number): Container {
  const container = new Container();
  const symbol = CHESS_SYMBOLS[color]?.[type] ?? '?';

  const pieceStyle = new TextStyle({
    fontSize: size * 0.65,
    fontFamily: 'Helvetica, Arial, sans-serif',
    fill: color === 'white' ? '#e8e8e8' : '#2a2a2a',
    stroke: { color: color === 'white' ? '#aaaaaa' : '#555555', width: 0.5 },
  });
  const piece = new Text({ text: symbol, style: pieceStyle });
  piece.anchor.set(0.5);
  container.addChild(piece);

  return container;
}

function createBoldPiece(type: string, color: 'white' | 'black', size: number): Container {
  const container = new Container();
  const symbol = CHESS_SYMBOLS[color]?.[type] ?? '?';

  // Heavy shadow
  const shadowStyle = new TextStyle({
    fontSize: size * 0.9,
    fontFamily: 'serif',
    fill: '#000000',
    fontWeight: 'bold',
  });
  const shadow = new Text({ text: symbol, style: shadowStyle });
  shadow.anchor.set(0.5);
  shadow.x = 3;
  shadow.y = 3;
  shadow.alpha = 0.5;
  container.addChild(shadow);

  // Piece with thick stroke
  const pieceStyle = new TextStyle({
    fontSize: size * 0.9,
    fontFamily: 'serif',
    fontWeight: 'bold',
    fill: color === 'white' ? '#ffffff' : '#111111',
    stroke: { color: color === 'white' ? '#222222' : '#888888', width: 2.5 },
  });
  const piece = new Text({ text: symbol, style: pieceStyle });
  piece.anchor.set(0.5);
  container.addChild(piece);

  return container;
}

function createPixelPiece(type: string, color: 'white' | 'black', size: number): Container {
  const container = new Container();
  const g = new Graphics();
  const s = size * 0.35;
  const fill = color === 'white' ? 0xf0f0f0 : 0x222222;
  const outline = color === 'white' ? 0x444444 : 0x999999;

  switch (type) {
    case 'k': {
      // King: square base + cross on top
      g.rect(-s * 0.6, -s * 0.2, s * 1.2, s * 0.8);
      g.fill({ color: fill });
      g.rect(-s * 0.6, -s * 0.2, s * 1.2, s * 0.8);
      g.stroke({ color: outline, width: 1.5 });
      // Cross
      g.rect(-s * 0.1, -s * 0.8, s * 0.2, s * 0.6);
      g.fill({ color: fill });
      g.rect(-s * 0.1, -s * 0.8, s * 0.2, s * 0.6);
      g.stroke({ color: outline, width: 1.5 });
      g.rect(-s * 0.35, -s * 0.65, s * 0.7, s * 0.2);
      g.fill({ color: fill });
      g.rect(-s * 0.35, -s * 0.65, s * 0.7, s * 0.2);
      g.stroke({ color: outline, width: 1.5 });
      break;
    }
    case 'q': {
      // Queen: square base + circle crown
      g.rect(-s * 0.6, -s * 0.1, s * 1.2, s * 0.7);
      g.fill({ color: fill });
      g.rect(-s * 0.6, -s * 0.1, s * 1.2, s * 0.7);
      g.stroke({ color: outline, width: 1.5 });
      g.circle(0, -s * 0.4, s * 0.35);
      g.fill({ color: fill });
      g.circle(0, -s * 0.4, s * 0.35);
      g.stroke({ color: outline, width: 1.5 });
      // Crown dots
      for (const dx of [-s * 0.4, 0, s * 0.4]) {
        g.circle(dx, -s * 0.75, s * 0.1);
        g.fill({ color: 0xd4af37 });
      }
      break;
    }
    case 'r': {
      // Rook: rectangle with battlements
      g.rect(-s * 0.5, -s * 0.3, s * 1.0, s * 0.9);
      g.fill({ color: fill });
      g.rect(-s * 0.5, -s * 0.3, s * 1.0, s * 0.9);
      g.stroke({ color: outline, width: 1.5 });
      // Battlements
      for (const dx of [-s * 0.4, -s * 0.1, s * 0.2]) {
        g.rect(dx, -s * 0.6, s * 0.2, s * 0.3);
        g.fill({ color: fill });
        g.rect(dx, -s * 0.6, s * 0.2, s * 0.3);
        g.stroke({ color: outline, width: 1.5 });
      }
      break;
    }
    case 'b': {
      // Bishop: tall diamond shape
      g.rect(-s * 0.5, s * 0.1, s * 1.0, s * 0.4);
      g.fill({ color: fill });
      g.rect(-s * 0.5, s * 0.1, s * 1.0, s * 0.4);
      g.stroke({ color: outline, width: 1.5 });
      // Diamond body
      g.moveTo(0, -s * 0.7);
      g.lineTo(s * 0.35, 0);
      g.lineTo(0, s * 0.1);
      g.lineTo(-s * 0.35, 0);
      g.closePath();
      g.fill({ color: fill });
      g.moveTo(0, -s * 0.7);
      g.lineTo(s * 0.35, 0);
      g.lineTo(0, s * 0.1);
      g.lineTo(-s * 0.35, 0);
      g.closePath();
      g.stroke({ color: outline, width: 1.5 });
      break;
    }
    case 'n': {
      // Knight: L-shaped
      g.rect(-s * 0.5, s * 0.0, s * 1.0, s * 0.5);
      g.fill({ color: fill });
      g.rect(-s * 0.5, s * 0.0, s * 1.0, s * 0.5);
      g.stroke({ color: outline, width: 1.5 });
      g.rect(-s * 0.5, -s * 0.7, s * 0.5, s * 0.7);
      g.fill({ color: fill });
      g.rect(-s * 0.5, -s * 0.7, s * 0.5, s * 0.7);
      g.stroke({ color: outline, width: 1.5 });
      g.rect(-s * 0.5, -s * 0.7, s * 0.8, s * 0.3);
      g.fill({ color: fill });
      g.rect(-s * 0.5, -s * 0.7, s * 0.8, s * 0.3);
      g.stroke({ color: outline, width: 1.5 });
      // Eye
      g.circle(-s * 0.1, -s * 0.5, s * 0.08);
      g.fill({ color: outline });
      break;
    }
    case 'p': {
      // Pawn: small circle on pedestal
      g.rect(-s * 0.4, s * 0.0, s * 0.8, s * 0.5);
      g.fill({ color: fill });
      g.rect(-s * 0.4, s * 0.0, s * 0.8, s * 0.5);
      g.stroke({ color: outline, width: 1.5 });
      g.circle(0, -s * 0.2, s * 0.3);
      g.fill({ color: fill });
      g.circle(0, -s * 0.2, s * 0.3);
      g.stroke({ color: outline, width: 1.5 });
      break;
    }
  }

  container.addChild(g);
  return container;
}

function createFilledPiece(type: string, color: 'white' | 'black', size: number): Container {
  const container = new Container();
  // Use the SAME Unicode chess symbols as classic, but both colors use the FILLED (black) symbols
  // White pieces: filled white, Black pieces: filled dark
  const FILLED_SYMBOLS: Record<string, string> = {
    k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F',
  };
  const symbol = FILLED_SYMBOLS[type] ?? '?';

  // Shadow
  const shadowStyle = new TextStyle({
    fontSize: size * 0.8,
    fontFamily: 'serif',
    fill: '#000000',
  });
  const shadow = new Text({ text: symbol, style: shadowStyle });
  shadow.anchor.set(0.5);
  shadow.x = 2;
  shadow.y = 2;
  shadow.alpha = 0.3;
  container.addChild(shadow);

  // Piece - solid filled look
  const pieceStyle = new TextStyle({
    fontSize: size * 0.8,
    fontFamily: 'serif',
    fill: color === 'white' ? '#f0e8d8' : '#1a1a1a',
    stroke: { color: color === 'white' ? '#444444' : '#777777', width: 1.5 },
  });
  const piece = new Text({ text: symbol, style: pieceStyle });
  piece.anchor.set(0.5);
  container.addChild(piece);

  return container;
}

export function createStyledChessPiece(
  type: string,
  color: 'white' | 'black',
  size: number,
  style: ChessPieceStyle
): Container {
  switch (style) {
    case 'minimalist':
      return createMinimalistPiece(type, color, size);
    case 'bold':
      return createBoldPiece(type, color, size);
    case 'pixel':
      return createPixelPiece(type, color, size);
    case 'filled':
      return createFilledPiece(type, color, size);
    case 'classic':
    default:
      return createClassicPiece(type, color, size);
  }
}
