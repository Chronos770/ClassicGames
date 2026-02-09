import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Application } from 'pixi.js';
import { motion } from 'framer-motion';
import { SolitaireGame } from './SolitaireGame';
import { SolitaireRenderer } from './SolitaireRenderer';
import { getHint, executeHint } from './SolitaireAI';
import { useGameStore } from '../../stores/gameStore';
import { useUserStore } from '../../stores/userStore';
import { SoundManager } from '../../engine/SoundManager';
import GameOverModal from '../../ui/GameOverModal';

export default function SolitairePage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const gameRef = useRef<SolitaireGame | null>(null);
  const rendererRef = useRef<SolitaireRenderer | null>(null);
  const timerRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  const [moveCount, setMoveCount] = useState(0);
  const [score, setScore] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [canAutoComplete, setCanAutoComplete] = useState(false);

  const recordGame = useUserStore((s) => s.recordGame);

  // BUG FIX #1 & #2: Use a ref to hold the latest updateUI callback so the
  // renderer always invokes the current version (no stale closures), and
  // the init useEffect does not depend on it (no re-initialization).
  const updateUIRef = useRef<() => void>(() => {});

  const updateUI = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    const state = game.getState();
    setMoveCount(state.moveCount);
    setScore(state.score);
    setCanAutoComplete(game.isAutoCompleteAvailable());

    if (game.isWon()) {
      setGameOver(true);
      recordGame('solitaire', true);
      SoundManager.getInstance().play('game-win');
      rendererRef.current?.showWin();
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      SoundManager.getInstance().play('card-place');
    }

    rendererRef.current?.render(state);
  }, [recordGame]);

  // Keep the ref always pointing to the latest updateUI
  useEffect(() => {
    updateUIRef.current = updateUI;
  }, [updateUI]);

  // BUG FIX #1: Init effect runs only on mount (empty deps).
  // BUG FIX #2: Pass a stable wrapper that delegates to updateUIRef.current
  // so the renderer never holds a stale closure.
  useEffect(() => {
    if (!canvasRef.current) return;

    let destroyed = false;

    const init = async () => {
      const app = new Application();
      await app.init({
        width: 700,
        height: 700,
        backgroundColor: 0x155c2a,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (destroyed) {
        app.destroy();
        return;
      }

      canvasRef.current!.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      const game = new SolitaireGame();
      game.initialize();
      gameRef.current = game;

      const renderer = new SolitaireRenderer(app, game);
      // Stable wrapper: always calls the latest updateUI via the ref
      renderer.setOnStateChange(() => updateUIRef.current());
      rendererRef.current = renderer;

      renderer.render(game.getState());

      // Start timer
      timerRef.current = 0;
      intervalRef.current = setInterval(() => {
        timerRef.current++;
        setElapsed(timerRef.current);
      }, 1000);
    };

    init();

    return () => {
      destroyed = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      rendererRef.current?.destroy();
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUndo = () => {
    if (gameRef.current?.undo()) {
      updateUI();
    }
  };

  const handleHint = () => {
    const game = gameRef.current;
    if (!game) return;
    const hint = getHint(game);
    if (hint) {
      executeHint(game, hint);
      updateUI();
    }
  };

  const handleAutoComplete = () => {
    const game = gameRef.current;
    if (!game) return;
    game.autoComplete();
    updateUI();
  };

  // BUG FIX #7: Reset renderer drag state on new game
  const handleNewGame = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setGameOver(false);
    setElapsed(0);
    timerRef.current = 0;

    const game = gameRef.current;
    if (game) {
      game.initialize();
      rendererRef.current?.reset();
      rendererRef.current?.render(game.getState());
      setMoveCount(0);
      setScore(0);
      setCanAutoComplete(false);

      intervalRef.current = setInterval(() => {
        timerRef.current++;
        setElapsed(timerRef.current);
      }, 1000);
    }
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-4 px-4">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[700px] flex items-center justify-between mb-3"
      >
        <button
          onClick={() => navigate('/lobby/solitaire')}
          className="text-sm text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
        >
          &#8592; Back
        </button>

        <h2 className="text-lg font-display font-bold text-white">Solitaire</h2>

        <div className="flex items-center gap-4 text-sm text-white/60">
          <span>Moves: <strong className="text-white">{moveCount}</strong></span>
          <span>Score: <strong className="text-amber-400">{score}</strong></span>
          <span>{formatTime(elapsed)}</span>
        </div>
      </motion.div>

      {/* Game canvas */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="game-canvas-container"
        style={{ width: 700, height: 700 }}
      >
        <div ref={canvasRef} />
      </motion.div>

      {/* Bottom controls */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-[700px] flex items-center justify-center gap-3 mt-3"
      >
        <button onClick={handleUndo} className="btn-secondary text-sm py-2 px-4">
          Undo
        </button>
        <button onClick={handleHint} className="btn-secondary text-sm py-2 px-4">
          Hint
        </button>
        {canAutoComplete && (
          <button onClick={handleAutoComplete} className="btn-primary text-sm py-2 px-4">
            Auto Complete
          </button>
        )}
        <button onClick={handleNewGame} className="btn-secondary text-sm py-2 px-4">
          New Game
        </button>
      </motion.div>

      <GameOverModal
        isOpen={gameOver}
        won={true}
        title="You Won!"
        gameId="solitaire"
        stats={[
          { label: 'Moves', value: moveCount.toString() },
          { label: 'Score', value: score.toString() },
          { label: 'Time', value: formatTime(elapsed) },
        ]}
        onPlayAgain={handleNewGame}
      />
    </div>
  );
}
