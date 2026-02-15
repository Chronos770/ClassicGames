import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Application } from 'pixi.js';
import { motion } from 'framer-motion';
import { BonksGame } from './BonksGame';
import { BonksRenderer } from './BonksRenderer';
import { BonksState } from './rules';
import { SoundManager } from '../../engine/SoundManager';
import { useUserStore } from '../../stores/userStore';

const CANVAS_W = 900;
const CANVAS_H = 500;

export default function BonksPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const gameRef = useRef<BonksGame | null>(null);
  const rendererRef = useRef<BonksRenderer | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  const [state, setState] = useState<BonksState | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  const bonksSave = useUserStore((s) => s.bonksSave);
  const saveBonks = useUserStore((s) => s.saveBonks);

  // Refs so the game loop closure always has the latest
  const bonksSaveRef = useRef(bonksSave);
  bonksSaveRef.current = bonksSave;
  const saveBonksRef = useRef(saveBonks);
  saveBonksRef.current = saveBonks;

  useEffect(() => {
    if (!canvasRef.current) return;
    let destroyed = false;

    const init = async () => {
      const app = new Application();
      await app.init({
        width: CANVAS_W,
        height: CANVAS_H,
        backgroundColor: 0x111122,
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      if (destroyed) { app.destroy(); return; }

      canvasRef.current!.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      const renderer = new BonksRenderer(app);
      rendererRef.current = renderer;

      const hasSave = bonksSaveRef.current !== null;
      const game = new BonksGame(hasSave);
      gameRef.current = game;

      // Wire up sound callback
      const sound = SoundManager.getInstance();
      game.setSoundCallback((id: string) => sound.play(id));

      const completeFiredRef = { current: false };
      const gameOverFiredRef = { current: false };

      // Track previous phase for save-on-complete
      let prevPhase = game.getState().phase;

      // Game loop
      app.ticker.add(() => {
        if (pausedRef.current) return;

        game.setKeys(keysRef.current);
        game.update();

        const s = game.getState();

        // Handle "continue requested" sentinel
        if (s.titleIndex === -1 && s.phase === 'select') {
          const save = bonksSaveRef.current;
          if (save) {
            game.continueGame(save);
          }
        }

        // Save on level complete (mark level as completed in state first)
        if (s.phase === 'complete' && prevPhase !== 'complete') {
          completeFiredRef.current = true;
          sound.play('game-win');
          // Mark level completed in state before saving
          if (!s.completedLevels.includes(s.level)) {
            s.completedLevels.push(s.level);
          }
          saveBonksRef.current(game.getSaveData());
        }

        // Save when returning to world map (preserves progress)
        if (s.phase === 'world' && prevPhase !== 'world' && prevPhase !== 'select' && prevPhase !== 'cinematic') {
          saveBonksRef.current(game.getSaveData());
        }

        // Game over sound
        if (s.phase === 'game-over' && !gameOverFiredRef.current) {
          gameOverFiredRef.current = true;
          sound.play('game-lose');
        }

        // Reset flags when going back to title
        if (s.phase === 'title') {
          completeFiredRef.current = false;
          gameOverFiredRef.current = false;
          // Update hasSave in case it changed
          game.setHasSave(bonksSaveRef.current !== null);
        }

        prevPhase = s.phase;

        renderer.render(s);
        setState({ ...s });
      });

      // Initial render
      const s = game.getState();
      setState({ ...s });
      renderer.render(s);
    };

    init();

    // Keyboard handlers
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault();
      }
      keysRef.current.add(e.key);

      if (e.key === 'Escape') {
        const game = gameRef.current;
        if (!game) return;
        const s = game.getState();
        if (s.phase === 'playing') {
          pausedRef.current = !pausedRef.current;
          setPaused(pausedRef.current);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      destroyed = true;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      rendererRef.current?.destroy();
      if (appRef.current) { appRef.current.destroy(true); appRef.current = null; }
    };
  }, []);

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const isPlaying = state?.phase === 'playing';

  return (
    <div className="min-h-screen flex flex-col items-center py-4 px-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[920px] flex items-center justify-between mb-3"
      >
        <button
          onClick={() => navigate('/lobby/bonks')}
          className="text-sm text-white/50 hover:text-white/80 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg"
        >
          {'\u2190'} Back
        </button>
        <h2 className="text-lg font-display font-bold text-white">BooBonks, BoJangles & Chonk</h2>
        <div />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="game-canvas-container relative"
        style={{ maxWidth: CANVAS_W, aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
      >
        <div ref={canvasRef} />

        {/* Pause overlay */}
        {paused && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 rounded-lg">
            <div className="text-3xl font-display font-bold text-white mb-4">PAUSED</div>
            <button
              onClick={togglePause}
              className="btn-primary text-sm px-6 py-2 mb-2"
            >
              Resume
            </button>
            <button
              onClick={() => navigate('/lobby/bonks')}
              className="btn-secondary text-sm px-6 py-2"
            >
              Quit
            </button>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[920px] flex items-center justify-center gap-3 mt-3 flex-wrap"
      >
        {isPlaying && (
          <button onClick={togglePause} className="btn-secondary text-sm py-2 px-4">
            Pause
          </button>
        )}
      </motion.div>

      {/* Controls help */}
      <div className="w-full max-w-[920px] mt-4 text-center text-xs text-white/30">
        Arrow keys/WASD to move &middot; Up/W/Space to jump &middot; Z for fireball &middot; Shift to run &middot; ESC to pause
      </div>
    </div>
  );
}
