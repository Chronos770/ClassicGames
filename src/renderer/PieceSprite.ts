import { Graphics, Container, Text, TextStyle } from 'pixi.js';
import { createStyledChessPiece } from './PieceStyles';
import { useSettingsStore } from '../stores/settingsStore';

export interface PieceConfig {
  type: string;
  color: 'white' | 'black';
  size: number;
}

export function createChessPiece(type: string, color: 'white' | 'black', size: number): Container {
  const style = useSettingsStore.getState().chessPieceStyle;
  const container = createStyledChessPiece(type, color, size, style);
  container.eventMode = 'static';
  container.cursor = 'grab';
  return container;
}

export function createCheckerPiece(color: 'white' | 'black', size: number, isKing: boolean = false): Container {
  const container = new Container();
  const radius = size * 0.4;

  // Shadow
  const shadow = new Graphics();
  shadow.circle(2, 3, radius);
  shadow.fill({ color: 0x000000, alpha: 0.3 });
  container.addChild(shadow);

  // Main disc
  const disc = new Graphics();
  const fillColor = color === 'white' ? 0xf5e6cc : 0x2a1508;
  disc.circle(0, 0, radius);
  disc.fill({ color: fillColor });

  // Rim highlight
  disc.circle(0, 0, radius);
  disc.stroke({ color: color === 'white' ? 0xd4a563 : 0x4a2916, width: 2 });

  // Inner ring
  disc.circle(0, 0, radius * 0.7);
  disc.stroke({ color: color === 'white' ? 0xc49653 : 0x3d1f0a, width: 1 });

  container.addChild(disc);

  if (isKing) {
    const crownStyle = new TextStyle({
      fontSize: size * 0.35,
      fontFamily: 'serif',
      fill: color === 'white' ? '#8b5423' : '#d4af37',
    });
    const crown = new Text({ text: '\u265A', style: crownStyle });
    crown.anchor.set(0.5);
    container.addChild(crown);
  }

  container.eventMode = 'static';
  container.cursor = 'grab';

  return container;
}
