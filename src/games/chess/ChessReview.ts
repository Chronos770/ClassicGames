import { Chess } from 'chess.js';
import { ChessMoveResult, Square } from './rules';
import { evaluateBoard } from './ChessAI';

export type MoveQuality = 'brilliant' | 'great' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'blunder';

export interface ReviewedMove {
  move: ChessMoveResult;
  moveNumber: number;
  evalBefore: number;
  evalAfter: number;
  quality: MoveQuality;
  isWhite: boolean;
}

export interface GameReviewResult {
  moves: ReviewedMove[];
  summary: {
    brilliant: number;
    great: number;
    good: number;
    book: number;
    inaccuracy: number;
    mistake: number;
    blunder: number;
  };
  averageAccuracy: number;
}

function classifyMove(evalBefore: number, evalAfter: number, isWhite: boolean): MoveQuality {
  // Eval is from white's perspective
  // For white: positive is good, for black: negative is good
  const evalDiff = isWhite ? (evalAfter - evalBefore) : (evalBefore - evalAfter);

  // Positive evalDiff means the position improved for the moving player
  if (evalDiff > 200) return 'brilliant';
  if (evalDiff > 80) return 'great';
  if (evalDiff > -10) return 'good';
  if (evalDiff > -50) return 'book';
  if (evalDiff > -100) return 'inaccuracy';
  if (evalDiff > -250) return 'mistake';
  return 'blunder';
}

export function reviewGame(moves: ChessMoveResult[]): GameReviewResult {
  const chess = new Chess();
  const reviewedMoves: ReviewedMove[] = [];

  const summary = {
    brilliant: 0,
    great: 0,
    good: 0,
    book: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const isWhite = i % 2 === 0;
    const moveNumber = Math.floor(i / 2) + 1;

    // Evaluate position before the move
    const evalBefore = evaluateBoard(chess);

    // Make the move
    chess.move(move.san);

    // Evaluate position after the move
    const evalAfter = evaluateBoard(chess);

    const quality = classifyMove(evalBefore, evalAfter, isWhite);
    summary[quality]++;

    reviewedMoves.push({
      move,
      moveNumber,
      evalBefore,
      evalAfter,
      quality,
      isWhite,
    });
  }

  // Calculate accuracy (simplified): percentage of moves that are good or better
  const totalMoves = moves.length;
  const goodMoves = summary.brilliant + summary.great + summary.good + summary.book;
  const averageAccuracy = totalMoves > 0 ? Math.round((goodMoves / totalMoves) * 100) : 100;

  return { moves: reviewedMoves, summary, averageAccuracy };
}

export const QUALITY_COLORS: Record<MoveQuality, string> = {
  brilliant: '#26c6da',
  great: '#66bb6a',
  good: '#81c784',
  book: '#a5d6a7',
  inaccuracy: '#ffb74d',
  mistake: '#ff8a65',
  blunder: '#ef5350',
};

export const QUALITY_SYMBOLS: Record<MoveQuality, string> = {
  brilliant: '!!',
  great: '!',
  good: '',
  book: '',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};
