import { Graphics, Container } from 'pixi.js';

/** Draw a 3D-ish ship sprite for Battleship */
export function drawShipSprite(
  name: string,
  size: number,
  cellSize: number,
  horizontal: boolean
): Container {
  const container = new Container();
  const g = new Graphics();

  const length = size * cellSize;
  const width = cellSize * 0.7;
  const halfW = width / 2;
  const bowLen = cellSize * 0.6; // pointed bow length

  // Ship hull colors by type
  const hullColors: Record<string, { main: number; deck: number; accent: number }> = {
    Carrier:    { main: 0x4a5568, deck: 0x5a6578, accent: 0x6b7588 },
    Battleship: { main: 0x555555, deck: 0x666666, accent: 0x777777 },
    Cruiser:    { main: 0x5a6a5a, deck: 0x6a7a6a, accent: 0x7a8a7a },
    Submarine:  { main: 0x3a4a5a, deck: 0x4a5a6a, accent: 0x5a6a7a },
    Destroyer:  { main: 0x5a5a4a, deck: 0x6a6a5a, accent: 0x7a7a6a },
  };

  const colors = hullColors[name] ?? hullColors.Destroyer;

  // Draw in horizontal orientation, rotate later if needed
  // Hull body (rounded rectangle with pointed bow)
  const sternX = 0;
  const bowX = length;

  // Main hull shape
  g.moveTo(sternX + 4, cellSize / 2 - halfW);
  g.lineTo(bowX - bowLen, cellSize / 2 - halfW);
  g.lineTo(bowX, cellSize / 2); // bow point
  g.lineTo(bowX - bowLen, cellSize / 2 + halfW);
  g.lineTo(sternX + 4, cellSize / 2 + halfW);
  g.quadraticCurveTo(sternX - 2, cellSize / 2 + halfW, sternX - 2, cellSize / 2 + halfW * 0.5);
  g.lineTo(sternX - 2, cellSize / 2 - halfW * 0.5);
  g.quadraticCurveTo(sternX - 2, cellSize / 2 - halfW, sternX + 4, cellSize / 2 - halfW);
  g.closePath();
  g.fill({ color: colors.main });

  // Hull outline
  g.moveTo(sternX + 4, cellSize / 2 - halfW);
  g.lineTo(bowX - bowLen, cellSize / 2 - halfW);
  g.lineTo(bowX, cellSize / 2);
  g.lineTo(bowX - bowLen, cellSize / 2 + halfW);
  g.lineTo(sternX + 4, cellSize / 2 + halfW);
  g.quadraticCurveTo(sternX - 2, cellSize / 2 + halfW, sternX - 2, cellSize / 2 + halfW * 0.5);
  g.lineTo(sternX - 2, cellSize / 2 - halfW * 0.5);
  g.quadraticCurveTo(sternX - 2, cellSize / 2 - halfW, sternX + 4, cellSize / 2 - halfW);
  g.closePath();
  g.stroke({ color: 0x000000, width: 1, alpha: 0.3 });

  // Deck (slightly lighter, inset)
  const deckInset = 4;
  const deckW = halfW - deckInset;
  g.moveTo(sternX + 8, cellSize / 2 - deckW);
  g.lineTo(bowX - bowLen - 4, cellSize / 2 - deckW);
  g.lineTo(bowX - bowLen + cellSize * 0.2, cellSize / 2);
  g.lineTo(bowX - bowLen - 4, cellSize / 2 + deckW);
  g.lineTo(sternX + 8, cellSize / 2 + deckW);
  g.closePath();
  g.fill({ color: colors.deck });

  // Ship-specific details
  switch (name) {
    case 'Carrier': {
      // Flight deck stripe
      g.rect(cellSize * 0.3, cellSize / 2 - deckW + 2, length - cellSize * 1.2, deckW * 2 - 4);
      g.fill({ color: colors.accent, alpha: 0.4 });
      // Landing lines
      for (let i = 1; i < size; i++) {
        g.rect(i * cellSize - 1, cellSize / 2 - deckW + 3, 2, deckW * 2 - 6);
        g.fill({ color: 0xffffff, alpha: 0.2 });
      }
      // Control tower
      g.roundRect(cellSize * 0.5, cellSize / 2 - halfW - 3, cellSize * 0.4, 6, 2);
      g.fill({ color: 0x888888 });
      break;
    }
    case 'Battleship': {
      // Gun turrets (3 turrets)
      for (const tx of [cellSize * 0.4, cellSize * 1.4, cellSize * 2.5]) {
        // Turret base
        g.circle(tx, cellSize / 2, 5);
        g.fill({ color: 0x777777 });
        g.circle(tx, cellSize / 2, 5);
        g.stroke({ color: 0x555555, width: 1 });
        // Gun barrel
        g.rect(tx, cellSize / 2 - 1.5, 10, 3);
        g.fill({ color: 0x666666 });
      }
      // Superstructure
      g.roundRect(cellSize * 1.7, cellSize / 2 - 6, cellSize * 0.5, 12, 2);
      g.fill({ color: 0x888888 });
      break;
    }
    case 'Cruiser': {
      // Two turrets
      for (const tx of [cellSize * 0.4, cellSize * 1.8]) {
        g.circle(tx, cellSize / 2, 4);
        g.fill({ color: 0x777777 });
        g.rect(tx, cellSize / 2 - 1, 8, 2);
        g.fill({ color: 0x666666 });
      }
      // Bridge
      g.roundRect(cellSize * 0.9, cellSize / 2 - 5, cellSize * 0.4, 10, 2);
      g.fill({ color: 0x888888 });
      break;
    }
    case 'Submarine': {
      // Conning tower
      g.roundRect(cellSize * 0.8, cellSize / 2 - 6, cellSize * 0.5, 12, 3);
      g.fill({ color: colors.accent });
      g.roundRect(cellSize * 0.8, cellSize / 2 - 6, cellSize * 0.5, 12, 3);
      g.stroke({ color: 0x000000, width: 0.5, alpha: 0.3 });
      // Periscope
      g.rect(cellSize * 1.0, cellSize / 2 - 9, 2, 5);
      g.fill({ color: 0x888888 });
      break;
    }
    case 'Destroyer': {
      // Single turret
      g.circle(cellSize * 0.4, cellSize / 2, 3.5);
      g.fill({ color: 0x777777 });
      g.rect(cellSize * 0.4, cellSize / 2 - 1, 7, 2);
      g.fill({ color: 0x666666 });
      // Bridge
      g.roundRect(cellSize * 0.8, cellSize / 2 - 4, cellSize * 0.3, 8, 2);
      g.fill({ color: 0x888888 });
      break;
    }
  }

  // Highlight stripe along top edge (3D lighting effect)
  g.moveTo(sternX + 6, cellSize / 2 - halfW + 1);
  g.lineTo(bowX - bowLen, cellSize / 2 - halfW + 1);
  g.stroke({ color: 0xffffff, width: 1, alpha: 0.15 });

  // Shadow along bottom edge
  g.moveTo(sternX + 6, cellSize / 2 + halfW - 1);
  g.lineTo(bowX - bowLen, cellSize / 2 + halfW - 1);
  g.stroke({ color: 0x000000, width: 1, alpha: 0.2 });

  // Wake effect at bow
  g.moveTo(bowX, cellSize / 2);
  g.lineTo(bowX + 4, cellSize / 2 - 3);
  g.stroke({ color: 0xffffff, width: 0.5, alpha: 0.3 });
  g.moveTo(bowX, cellSize / 2);
  g.lineTo(bowX + 4, cellSize / 2 + 3);
  g.stroke({ color: 0xffffff, width: 0.5, alpha: 0.3 });

  container.addChild(g);

  // Rotate if vertical
  if (!horizontal) {
    container.rotation = Math.PI / 2;
    container.x += cellSize;
  }

  return container;
}
