import { Graphics, Container, Text, TextStyle } from 'pixi.js';
import { Card, suitColor, Suit } from '../engine/types';
import { getCardTheme } from './CardThemes';
import { useSettingsStore } from '../stores/settingsStore';

const CARD_WIDTH = 80;
const CARD_HEIGHT = 112;
const CARD_RADIUS = 6;

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

export function createCardGraphics(card: Card, faceUp?: boolean): Container {
  const container = new Container();
  const showFace = faceUp ?? card.faceUp;

  // Card body
  const body = new Graphics();

  if (showFace) {
    // White card face
    body.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
    body.fill({ color: 0xf5f0e8 });
    body.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
    body.stroke({ color: 0xcccccc, width: 1 });

    container.addChild(body);

    const color = suitColor(card.suit) === 'red' ? '#cc0000' : '#1a1a1a';
    const symbol = SUIT_SYMBOLS[card.suit];

    // Rank text top-left
    const rankStyle = new TextStyle({
      fontSize: 14,
      fontWeight: 'bold',
      fontFamily: 'Georgia, serif',
      fill: color,
    });
    const rankText = new Text({ text: card.rank, style: rankStyle });
    rankText.anchor.set(0.5, 0);
    rankText.x = 12;
    rankText.y = 5;
    container.addChild(rankText);

    // Suit symbol top-left
    const suitStyle = new TextStyle({
      fontSize: 12,
      fontFamily: 'Georgia, serif',
      fill: color,
    });
    const suitText = new Text({ text: symbol, style: suitStyle });
    suitText.anchor.set(0.5, 0);
    suitText.x = 12;
    suitText.y = 21;
    container.addChild(suitText);

    // Center suit (large)
    const centerStyle = new TextStyle({
      fontSize: 32,
      fontFamily: 'Georgia, serif',
      fill: color,
    });
    const centerText = new Text({ text: symbol, style: centerStyle });
    centerText.anchor.set(0.5);
    centerText.x = CARD_WIDTH / 2;
    centerText.y = CARD_HEIGHT / 2;
    container.addChild(centerText);

    // Bottom-right rank (inverted)
    const rankBottom = new Text({ text: card.rank, style: rankStyle });
    rankBottom.anchor.set(0.5, 0);
    rankBottom.rotation = Math.PI;
    rankBottom.x = CARD_WIDTH - 12;
    rankBottom.y = CARD_HEIGHT - 5;
    container.addChild(rankBottom);

    // Bottom-right suit (inverted)
    const suitBottom = new Text({ text: symbol, style: suitStyle });
    suitBottom.anchor.set(0.5, 0);
    suitBottom.rotation = Math.PI;
    suitBottom.x = CARD_WIDTH - 12;
    suitBottom.y = CARD_HEIGHT - 21;
    container.addChild(suitBottom);
  } else {
    // Card back - themed
    const theme = getCardTheme(useSettingsStore.getState().cardTheme);
    body.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
    body.fill({ color: theme.backColor });
    body.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
    body.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });

    container.addChild(body);

    // Inner border
    const inner = new Graphics();
    inner.roundRect(4, 4, CARD_WIDTH - 8, CARD_HEIGHT - 8, 4);
    inner.stroke({ color: theme.backAccent, width: 1.5 });

    // Diamond pattern
    inner.roundRect(8, 8, CARD_WIDTH - 16, CARD_HEIGHT - 16, 3);
    inner.fill({ color: theme.backInner });

    // Cross pattern
    for (let i = 0; i < 5; i++) {
      const y = 16 + i * (CARD_HEIGHT - 32) / 4;
      inner.moveTo(10, y);
      inner.lineTo(CARD_WIDTH - 10, y);
      inner.stroke({ color: theme.backColor, width: 0.5 });
    }
    for (let i = 0; i < 4; i++) {
      const x = 14 + i * (CARD_WIDTH - 28) / 3;
      inner.moveTo(x, 12);
      inner.lineTo(x, CARD_HEIGHT - 12);
      inner.stroke({ color: theme.backColor, width: 0.5 });
    }

    container.addChild(inner);
  }

  // Shadow
  const shadow = new Graphics();
  shadow.roundRect(2, 2, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
  shadow.fill({ color: 0x000000, alpha: 0.15 });
  container.addChildAt(shadow, 0);

  container.eventMode = 'static';
  container.cursor = 'pointer';

  return container;
}

export function getCardDimensions() {
  return { width: CARD_WIDTH, height: CARD_HEIGHT };
}
