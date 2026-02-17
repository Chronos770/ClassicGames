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
const IS_TOUCH = typeof window !== 'undefined' &&
  ('ontouchstart' in window || matchMedia('(pointer: coarse)').matches);

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
  const updateBonksHighScore = useUserStore((s) => s.updateBonksHighScore);

  // Refs so the game loop closure always has the latest
  const bonksSaveRef = useRef(bonksSave);
  bonksSaveRef.current = bonksSave;
  const saveBonksRef = useRef(saveBonks);
  saveBonksRef.current = saveBonks;
  const updateHighScoreRef = useRef(updateBonksHighScore);
  updateHighScoreRef.current = updateBonksHighScore;

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

      let prevPhase = game.getState().phase;
      let musicStarted = false;

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
          updateHighScoreRef.current(s.score);
        }

        // Save when returning to world map (preserves progress)
        if (s.phase === 'world' && prevPhase !== 'world' && prevPhase !== 'select' && prevPhase !== 'cinematic') {
          saveBonksRef.current(game.getSaveData());
        }

        // Game over sound + save high score
        if (s.phase === 'game-over' && !gameOverFiredRef.current) {
          gameOverFiredRef.current = true;
          sound.play('game-lose');
          updateHighScoreRef.current(s.score);
        }

        // Start/stop background music based on phase
        if (s.phase === 'playing' && !musicStarted) {
          musicStarted = true;
          // Different music per world/level
          const musicId = s.level === 3 ? 'bonks-music-cave'
            : s.level >= 5 ? 'bonks-music-clouds'
            : 'bonks-music';
          sound.startMusic(musicId);
        } else if (s.phase !== 'playing' && musicStarted) {
          musicStarted = false;
          sound.stopMusic();
        }

        // Reset flags when going back to title
        if (s.phase === 'title') {
          completeFiredRef.current = false;
          gameOverFiredRef.current = false;
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

    // Clear all keys when window loses focus (prevents stuck keys)
    const onBlur = () => { keysRef.current.clear(); };
    const onVisChange = () => { if (document.hidden) keysRef.current.clear(); };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisChange);

    return () => {
      destroyed = true;
      SoundManager.getInstance().stopMusic();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisChange);
      rendererRef.current?.destroy();
      if (appRef.current) { appRef.current.destroy(true); appRef.current = null; }
    };
  }, []);

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const isPlaying = state?.phase === 'playing';

  // ── Robust touch system: track active touches by ID ──
  const touchMapRef = useRef<Map<number, string>>(new Map()); // touchId → key

  const touchStart = (key: string, e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      touchMapRef.current.set(e.changedTouches[i].identifier, key);
    }
    keysRef.current.add(key);
  };

  const touchEnd = (key: string, e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      touchMapRef.current.delete(e.changedTouches[i].identifier);
    }
    // Only release key if no other touch is holding it
    let stillHeld = false;
    touchMapRef.current.forEach((v) => { if (v === key) stillHeld = true; });
    if (!stillHeld) keysRef.current.delete(key);
  };

  const touchCancel = (key: string) => {
    // Remove all touches for this key
    touchMapRef.current.forEach((v, id) => { if (v === key) touchMapRef.current.delete(id); });
    let stillHeld = false;
    touchMapRef.current.forEach((v) => { if (v === key) stillHeld = true; });
    if (!stillHeld) keysRef.current.delete(key);
  };

  // Clear all touch keys when phase changes (prevents stuck keys on phase transitions)
  const prevPhaseRef = useRef(state?.phase);
  if (state && state.phase !== prevPhaseRef.current) {
    prevPhaseRef.current = state.phase;
    touchMapRef.current.clear();
    // Clear only touch-injected keys, not keyboard keys
    keysRef.current.clear();
  }

  const TB = 'select-none border border-white/15'; // shared touch button style

  const dpadBtn = (label: string, key: string, size = 'w-11 h-11') => (
    <button
      onTouchStart={(e) => touchStart(key, e)}
      onTouchEnd={(e) => touchEnd(key, e)}
      onTouchCancel={() => touchCancel(key)}
      className={`${size} rounded-xl bg-white/10 active:bg-white/30 flex items-center justify-center text-white/70 text-lg font-bold ${TB}`}
      style={{ touchAction: 'none' }}
    >
      {label}
    </button>
  );

  const actionBtn = (label: string, key: string, color: string, size: string) => (
    <button
      onTouchStart={(e) => touchStart(key, e)}
      onTouchEnd={(e) => touchEnd(key, e)}
      onTouchCancel={() => touchCancel(key)}
      className={`${size} rounded-full ${color} active:brightness-125 flex items-center justify-center text-white font-bold ${TB}`}
      style={{ touchAction: 'none' }}
    >
      {label}
    </button>
  );

  const confirmBtn = (label: string, size = 'h-12 px-6') => (
    <button
      onTouchStart={(e) => touchStart('Enter', e)}
      onTouchEnd={(e) => touchEnd('Enter', e)}
      onTouchCancel={() => touchCancel('Enter')}
      className={`${size} rounded-xl bg-amber-500/40 active:bg-amber-500/70 flex items-center justify-center text-white text-sm font-bold ${TB}`}
      style={{ touchAction: 'none' }}
    >
      {label}
    </button>
  );

  // Shared touch overlay content (used in both mobile and desktop layouts)
  const touchOverlay = IS_TOUCH && !paused && state && state.phase !== 'dying' && (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Back button — top left (always visible on touch) */}
      <div className="absolute top-1 left-1 pointer-events-auto">
        <button
          onClick={() => navigate('/lobby/bonks')}
          className="w-8 h-8 rounded-lg bg-black/30 active:bg-black/50 flex items-center justify-center text-white/40 text-sm select-none border border-white/10"
        >{'\u2190'}</button>
      </div>

      {/* === PLAYING: full gamepad === */}
      {state.phase === 'playing' && (<>
        {/* Left side: D-pad with left, right, and down */}
        <div className="absolute bottom-2 left-2 pointer-events-auto">
          <div className="flex items-center gap-1">
            {dpadBtn('\u25C0', 'ArrowLeft')}
            {dpadBtn('\u25BC', 'ArrowDown')}
            {dpadBtn('\u25B6', 'ArrowRight')}
          </div>
        </div>
        {/* Right side: Z (special ability) + A (jump) */}
        <div className="absolute bottom-2 right-2 pointer-events-auto">
          <div className="flex items-end gap-2">
            {actionBtn('Z', 'z', 'bg-red-500/30', 'w-10 h-10 text-xs')}
            {actionBtn('A', ' ', 'bg-amber-500/30', 'w-14 h-14 text-base')}
          </div>
        </div>
        {/* Pause button */}
        <div className="absolute top-1 right-1 pointer-events-auto">
          <button
            onClick={togglePause}
            className="w-8 h-8 rounded-lg bg-black/30 active:bg-black/50 flex items-center justify-center text-white/40 text-sm select-none border border-white/10"
          >&#9646;&#9646;</button>
        </div>
      </>)}

      {/* === TITLE: up/down + confirm === */}
      {state.phase === 'title' && (
        <div className="absolute bottom-2 inset-x-0 flex justify-center gap-3 pointer-events-auto">
          {dpadBtn('\u25B2', 'ArrowUp')}
          {dpadBtn('\u25BC', 'ArrowDown')}
          {confirmBtn('OK')}
        </div>
      )}

      {/* === SELECT: left/right + confirm === */}
      {state.phase === 'select' && (
        <div className="absolute bottom-2 inset-x-0 flex justify-center gap-3 pointer-events-auto">
          {dpadBtn('\u25C0', 'ArrowLeft')}
          {dpadBtn('\u25B6', 'ArrowRight')}
          {confirmBtn('OK')}
        </div>
      )}

      {/* === WORLD MAP: 4-way arrows + confirm === */}
      {state.phase === 'world' && (
        <div className="absolute bottom-2 inset-x-0 flex justify-center gap-2 pointer-events-auto">
          {dpadBtn('\u25C0', 'ArrowLeft')}
          <div className="flex flex-col gap-1">
            {dpadBtn('\u25B2', 'ArrowUp')}
            {dpadBtn('\u25BC', 'ArrowDown')}
          </div>
          {dpadBtn('\u25B6', 'ArrowRight')}
          {confirmBtn('GO')}
        </div>
      )}

      {/* === CINEMATIC / COMPLETE / GAME-OVER: tap to continue === */}
      {(state.phase === 'cinematic' || state.phase === 'complete' || state.phase === 'game-over') && (
        <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-auto">
          {confirmBtn('Tap to Continue', 'h-11 px-8')}
        </div>
      )}
    </div>
  );

  // ── MOBILE: fullscreen immersive layout ──
  if (IS_TOUCH) {
    return (
      <div
        className="fixed inset-0 bg-[#111122] flex items-center justify-center"
        style={{ touchAction: 'none' }}
      >
        <div
          className="relative w-full h-full"
          style={{ maxWidth: `calc(100dvh * ${CANVAS_W / CANVAS_H})`, maxHeight: `calc(100vw * ${CANVAS_H / CANVAS_W})`, aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
        >
          <div ref={canvasRef} className="w-full h-full [&_canvas]:!w-full [&_canvas]:!h-full" />

          {/* Pause overlay */}
          {paused && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 rounded-lg">
              <div className="text-3xl font-display font-bold text-white mb-4">PAUSED</div>
              <button onClick={togglePause} className="btn-primary text-sm px-6 py-2 mb-2">Resume</button>
              <button onClick={() => navigate('/lobby/bonks')} className="btn-secondary text-sm px-6 py-2">Quit</button>
            </div>
          )}

          {touchOverlay}
        </div>
      </div>
    );
  }

  // ── DESKTOP: original layout with header ──
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
            <button onClick={togglePause} className="btn-primary text-sm px-6 py-2 mb-2">Resume</button>
            <button onClick={() => navigate('/lobby/bonks')} className="btn-secondary text-sm px-6 py-2">Quit</button>
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
        Arrow keys/WASD to move &middot; Up/W/Space to jump &middot; Z for fireball/tongue &middot; Shift to run &middot; ESC to pause
      </div>
    </div>
  );
}
