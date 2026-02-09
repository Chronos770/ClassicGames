import { SolitaireGame } from './SolitaireGame';
import { SolitaireMove } from './rules';

export function getHint(game: SolitaireGame): SolitaireMove | null {
  return game.getHint();
}

export function executeHint(game: SolitaireGame, move: SolitaireMove): boolean {
  switch (move.type) {
    case 'draw':
    case 'recycle':
      return game.drawCard();
    case 'waste-to-tableau':
      return game.moveWasteToTableau(move.toCol!);
    case 'waste-to-foundation':
      return game.moveWasteToFoundation() >= 0;
    case 'tableau-to-tableau':
      return game.moveTableauToTableau(move.fromCol!, move.cardIndex!, move.toCol!);
    case 'tableau-to-foundation':
      return game.moveTableauToFoundation(move.fromCol!) >= 0;
    default:
      return false;
  }
}
