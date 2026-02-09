import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Application } from 'pixi.js';
import { Chess } from 'chess.js';
import { motion } from 'framer-motion';
import { ChessGame } from './ChessGame';
import { ChessRenderer } from './ChessRenderer';
import { getBestMove, evaluateBoard } from './ChessAI';
import { generateCommentary, getPersonalityComment } from './ChessCommentary';
import { reviewGame, GameReviewResult } from './ChessReview';
import { ChessGameState, ChessMoveResult, Square, PieceSymbol } from './rules';
import { useGameStore } from '../../stores/gameStore';
import { useUserStore } from '../../stores/userStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { SoundManager } from '../../engine/SoundManager';
import GameOverModal from '../../ui/GameOverModal';
import MoveHistoryPanel from '../../ui/components/MoveHistoryPanel';
import CommentaryBubble from '../../ui/components/CommentaryBubble';
import GameReviewPanel from '../../ui/components/GameReviewPanel';
import MovePlannerPanel from '../../ui/components/MovePlannerPanel';
import { MultiplayerGameAdapter } from '../../lib/multiplayerGameAdapter';

function getMoveSound(result: ChessMoveResult, newState: ChessGameState): string {
  if (newState.isGameOver) return 'chess-gameover';
  if (newState.isCheck) return 'chess-check';
  if (result.san.startsWith('O-')) return 'chess-castle';
  if (result.captured) return 'chess-capture';
  return 'chess-move';
}

export default function ChessPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const gameRef = useRef<ChessGame | null>(null);
  const rendererRef = useRef<ChessRenderer | null>(null);
  const navigate = useNavigate();

  const difficulty = useGameStore((s) => s.difficulty);
  const selectedOpponent = useGameStore((s) => s.selectedOpponent);
  const isMultiplayer = useGameStore((s) => s.isMultiplayer);
  const recordGame = useUserStore((s) => s.recordGame);

  const [state, setState] = useState<ChessGameState | null>(null);
  const [thinking, setThinking] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [resultText, setResultText] = useState('');
  const [playerWon, setPlayerWon] = useState(false);
  const [commentary, setCommentary] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewResult, setReviewResult] = useState<GameReviewResult | null>(null);
  const [reviewMoveIndex, setReviewMoveIndex] = useState(0);
  const [plannedArrows, setPlannedArrows] = useState<{ from: string; to: string; color: number }[]>([]);

  const commentaryEnabled = useSettingsStore((s) => s.chessCommentary);

  // ---- Refs to hold latest values, accessible from PixiJS callbacks ----
  const thinkingRef = useRef(thinking);
  thinkingRef.current = thinking;

  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;

  const recordGameRef = useRef(recordGame);
  recordGameRef.current = recordGame;

  const lastEvalRef = useRef(0);
  const adapterRef = useRef<MultiplayerGameAdapter | null>(null);

  // ---- Stable callbacks that read from refs, never change identity ----

  const handleGameOver = useCallback((s: ChessGameState) => {
    setGameOver(true);
    const opName = useGameStore.getState().selectedOpponent?.name ?? 'AI';
    const moveCount = s.moveHistory.length;
    if (s.isCheckmate) {
      const whiteWins = s.turn === 'b';
      setPlayerWon(whiteWins);
      setResultText(whiteWins ? 'Checkmate! You Win!' : 'Checkmate! AI Wins!');
      recordGameRef.current('chess', whiteWins, opName, `Checkmate in ${moveCount} moves`);
    } else if (s.isStalemate) {
      setResultText('Stalemate - Draw!');
      setPlayerWon(false);
      recordGameRef.current('chess', false, opName, `Stalemate after ${moveCount} moves`);
    } else {
      setResultText('Draw!');
      setPlayerWon(false);
      recordGameRef.current('chess', false, opName, `Draw after ${moveCount} moves`);
    }
  }, []);

  const doAIMove = useCallback(async (game: ChessGame, renderer: ChessRenderer) => {
    setThinking(true);
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));

    const evalBefore = evaluateBoard(game.getChess());
    const move = await getBestMove(game.getFEN(), difficultyRef.current);
    if (move) {
      // Capture piece info before making move for animation
      const board = game.getBoard();
      const { row, col } = { row: 8 - parseInt(move.from[1]), col: move.from.charCodeAt(0) - 97 };
      const piece = board[row]?.[col];

      const result = game.makeMove(move.from, move.to);
      const newState = game.getState();
      setState(newState);
      renderer.clearSelection();

      // Generate commentary for AI move
      const evalAfter = evaluateBoard(game.getChess());
      if (useSettingsStore.getState().chessCommentary) {
        const comment = generateCommentary({
          move: result!,
          evalBefore,
          evalAfter,
          isPlayerMove: false,
          moveNumber: Math.ceil(newState.moveHistory.length / 2),
        });
        if (comment) setCommentary(comment);
      }
      lastEvalRef.current = evalAfter;

      if (piece && result) {
        renderer.animateMove(move.from as Square, move.to as Square, piece.type, piece.color, () => {
          renderer.render(newState);
          SoundManager.getInstance().play(getMoveSound(result, newState));
          if (newState.isGameOver) {
            handleGameOver(newState);
          }
        });
      } else {
        renderer.render(newState);
        if (newState.isGameOver) {
          handleGameOver(newState);
        }
      }
    }
    setThinking(false);
  }, [handleGameOver]);

  // ---- PixiJS initialization: runs exactly ONCE on mount ----
  useEffect(() => {
    if (!canvasRef.current) return;
    let destroyed = false;

    const init = async () => {
      const app = new Application();
      await app.init({
        width: 700,
        height: 700,
        backgroundColor: 0x3d2b1f,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (destroyed) { app.destroy(); return; }

      canvasRef.current!.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      const game = new ChessGame();
      game.initialize();
      gameRef.current = game;

      const renderer = new ChessRenderer(app, game);
      rendererRef.current = renderer;

      renderer.setOnArrowsChange((arrows) => setPlannedArrows(arrows));

      renderer.setOnMove((from: Square, to: Square) => {
        if (thinkingRef.current) return;
        if (renderer.getIsAnimating()) return;

        // Evaluate position before move for commentary
        const evalBefore = evaluateBoard(game.getChess());

        // Capture piece info before making move
        const board = game.getBoard();
        const { row, col } = { row: 8 - parseInt(from[1]), col: from.charCodeAt(0) - 97 };
        const piece = board[row]?.[col];

        const result = game.makeMove(from, to);
        if (result) {
          const newState = game.getState();
          setState(newState);
          renderer.clearSelection();

          // Generate commentary for player move
          const evalAfter = evaluateBoard(game.getChess());
          if (useSettingsStore.getState().chessCommentary) {
            const comment = generateCommentary({
              move: result,
              evalBefore,
              evalAfter,
              isPlayerMove: true,
              moveNumber: Math.ceil(newState.moveHistory.length / 2),
            });
            if (comment) setCommentary(comment);
          }
          lastEvalRef.current = evalAfter;

          // In multiplayer, send move to remote player
          if (adapterRef.current) {
            adapterRef.current.sendMove({ from, to, san: result.san });
          }

          if (piece) {
            renderer.animateMove(from, to, piece.type, piece.color, () => {
              renderer.render(newState);
              SoundManager.getInstance().play(getMoveSound(result, newState));
              if (newState.isGameOver) {
                handleGameOver(newState);
              } else if (!adapterRef.current) {
                doAIMove(game, renderer);
              }
            });
          } else {
            renderer.render(newState);
            if (newState.isGameOver) {
              handleGameOver(newState);
            } else if (!adapterRef.current) {
              doAIMove(game, renderer);
            }
          }
        }
      });

      // Set up multiplayer adapter if in multiplayer mode
      if (useGameStore.getState().isMultiplayer) {
        const adapter = new MultiplayerGameAdapter('chess');
        adapterRef.current = adapter;
        adapter.connect((moveData: { from: string; to: string }) => {
          const result = game.makeMove(moveData.from as Square, moveData.to as Square);
          if (result) {
            const newState = game.getState();
            setState(newState);
            renderer.clearSelection();
            renderer.render(newState);
            SoundManager.getInstance().play(getMoveSound(result, newState));
            if (newState.isGameOver) {
              handleGameOver(newState);
            }
          }
        });
      }

      const initialState = game.getState();
      setState(initialState);
      renderer.render(initialState);
    };

    init();

    return () => {
      destroyed = true;
      rendererRef.current?.destroy();
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
      if (canvasRef.current) {
        canvasRef.current.innerHTML = '';
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUndo = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer || thinking) return;
    game.undo();
    game.undo();
    const newState = game.getState();
    setState(newState);
    renderer.clearSelection();
    renderer.render(newState);
  };

  const handleNewGame = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;
    setGameOver(false);
    setThinking(false);
    setCommentary(null);
    setReviewMode(false);
    setReviewResult(null);
    game.initialize();
    const newState = game.getState();
    setState(newState);
    renderer.clearSelection();
    renderer.clearArrows();
    renderer.render(newState);
  };

  const handleReviewGame = () => {
    if (!state || state.moveHistory.length === 0) return;
    const result = reviewGame(state.moveHistory);
    setReviewResult(result);
    setReviewMode(true);
    setReviewMoveIndex(result.moves.length - 1);
    setGameOver(false);
  };

  const handleReviewSelectMove = (index: number) => {
    setReviewMoveIndex(index);
    // Replay the game up to this move
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer || !reviewResult) return;

    const chess = game.getChess();
    const ogFen = chess.fen();
    // Reset and replay
    chess.reset();
    for (let i = 0; i <= index; i++) {
      chess.move(reviewResult.moves[i].move.san);
    }
    const replayState = game.getState();
    setState(replayState);
    renderer.clearSelection();
    renderer.render(replayState);
  };

  const handleExitReview = () => {
    setReviewMode(false);
    setReviewResult(null);
    // Restore game to final position
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;
    game.initialize();
    // We can't easily restore, so just show new game state
    const newState = game.getState();
    setState(newState);
    renderer.render(newState);
  };

  const capturedPieceSymbols = (pieces: PieceSymbol[], color: 'w' | 'b'): string => {
    const symbols: Record<string, Record<string, string>> = {
      w: { p: '\u2659', n: '\u2658', b: '\u2657', r: '\u2656', q: '\u2655' },
      b: { p: '\u265F', n: '\u265E', b: '\u265D', r: '\u265C', q: '\u265B' },
    };
    return pieces.map((p) => symbols[color][p] ?? '').join(' ');
  };

  const opponentName = selectedOpponent?.name ?? 'AI';

  return (
    <div className="min-h-screen flex flex-col items-center py-4 px-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[900px] flex items-center justify-between mb-3"
      >
        <button
          onClick={() => navigate('/lobby/chess')}
          className="text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          &#8592; Back
        </button>
        <h2 className="text-lg font-display font-bold text-white">Chess</h2>
        <div className="flex items-center gap-3 text-sm">
          {thinking && (
            <span className="text-amber-400 animate-pulse">
              {selectedOpponent ? `${selectedOpponent.avatar} ${selectedOpponent.name} thinking...` : 'AI thinking...'}
            </span>
          )}
          <span className="text-white/60">
            {state?.turn === 'w' ? 'Your turn' : `${opponentName}'s turn`}
          </span>
        </div>
      </motion.div>

      {/* Player info + captured pieces */}
      <div className="w-full max-w-[900px] flex justify-between items-center mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg">
            {selectedOpponent?.avatar ?? '\u{1F916}'}
          </div>
          <div>
            <div className="text-xs text-white/60">{opponentName} (Black)</div>
            <div className="text-sm h-5">{state ? capturedPieceSymbols(state.capturedWhite, 'w') : ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs text-white/60">You (White)</div>
            <div className="text-sm h-5">{state ? capturedPieceSymbols(state.capturedBlack, 'b') : ''}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-lg">
            {'\u265A'}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="game-canvas-container"
          style={{ width: 700, height: 700 }}
        >
          <div ref={canvasRef} />
        </motion.div>

        {/* Side panel - move history, commentary, review */}
        <div className="w-full lg:w-56 space-y-3">
          {reviewMode && reviewResult ? (
            <>
              <GameReviewPanel
                review={reviewResult}
                onSelectMove={handleReviewSelectMove}
                currentMoveIndex={reviewMoveIndex}
              />
              <button onClick={handleExitReview} className="btn-secondary w-full text-sm py-2">
                Exit Review
              </button>
            </>
          ) : (
            <>
              <MoveHistoryPanel moves={state?.moveHistory ?? []} />
              <MovePlannerPanel
                arrows={plannedArrows}
                onClear={() => {
                  rendererRef.current?.clearArrows();
                  setPlannedArrows([]);
                }}
              />
              {commentaryEnabled && (
                <CommentaryBubble
                  message={commentary}
                  avatar={selectedOpponent?.avatar}
                  name={selectedOpponent?.name ?? 'AI'}
                />
              )}
            </>
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[700px] flex items-center justify-center gap-3 mt-3"
      >
        <button onClick={handleUndo} className="btn-secondary text-sm py-2 px-4" disabled={thinking}>
          Undo
        </button>
        <button onClick={handleNewGame} className="btn-secondary text-sm py-2 px-4">
          New Game
        </button>
      </motion.div>

      <GameOverModal
        isOpen={gameOver}
        won={playerWon}
        title={resultText}
        gameId="chess"
        stats={[
          { label: 'Moves', value: (state?.moveHistory.length ?? 0).toString() },
          { label: 'Difficulty', value: difficulty },
        ]}
        onPlayAgain={handleNewGame}
        extraButton={
          <button onClick={handleReviewGame} className="btn-secondary flex-1">
            Review Game
          </button>
        }
      />
    </div>
  );
}
