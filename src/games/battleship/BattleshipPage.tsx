import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Application } from 'pixi.js';
import { motion } from 'framer-motion';
import { BattleshipGame } from './BattleshipGame';
import { BattleshipRenderer } from './BattleshipRenderer';
import { BattleshipState } from './rules';
import { getAIShot, processResult, resetAI } from './BattleshipAI';
import { useGameStore } from '../../stores/gameStore';
import { useUserStore } from '../../stores/userStore';
import { SoundManager } from '../../engine/SoundManager';
import { MultiplayerGameAdapter } from '../../lib/multiplayerGameAdapter';
import GameOverModal from '../../ui/GameOverModal';

export default function BattleshipPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const gameRef = useRef<BattleshipGame | null>(null);
  const rendererRef = useRef<BattleshipRenderer | null>(null);
  const navigate = useNavigate();

  const difficulty = useGameStore((s) => s.difficulty);
  const recordGame = useUserStore((s) => s.recordGame);

  // Use refs to avoid stale closures in the PixiJS click handler.
  // The init useEffect captures these refs once, and they always
  // point to the latest values.
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;
  const recordGameRef = useRef(recordGame);
  recordGameRef.current = recordGame;

  const [state, setState] = useState<BattleshipState | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('Place your ships');

  const doAITurn = useCallback(async (game: BattleshipGame, renderer: BattleshipRenderer) => {
    await new Promise((r) => setTimeout(r, 500));

    const currentState = game.getState();
    if (currentState.phase !== 'playing' || currentState.currentPlayer !== 'ai') return;

    const playerBoard = game.getPlayerBoard();
    const shot = getAIShot(playerBoard, difficultyRef.current);
    const result = game.aiFire(shot.row, shot.col);

    // Defensive: if AI somehow fires on already-shot cell, retry
    if (result === 'already-shot') {
      doAITurn(game, renderer);
      return;
    }

    processResult(shot.row, shot.col, result);
    const isHit = result === 'hit' || result === 'sunk';

    // Play attack animation before updating state
    renderer.playAttackAnimation(shot.row, shot.col, 'player', isHit, () => {
      if (result === 'hit') { setMessage(`AI hit at ${String.fromCharCode(65 + shot.col)}${shot.row + 1}!`); SoundManager.getInstance().play('explosion'); }
      else if (result === 'sunk') { setMessage(`AI sank your ship!`); SoundManager.getInstance().play('explosion'); }
      else { setMessage(`AI missed at ${String.fromCharCode(65 + shot.col)}${shot.row + 1}`); SoundManager.getInstance().play('splash'); }

      const newState = game.getState();
      setState({ ...newState });
      renderer.render(newState);

      if (newState.phase === 'finished') {
        setGameOver(true);
        SoundManager.getInstance().play(newState.winner === 'player' ? 'game-win' : 'game-lose');
        const opName = useGameStore.getState().selectedOpponent?.name ?? 'AI';
        recordGameRef.current('battleship', newState.winner === 'player', opName);
      }
    });
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    let destroyed = false;

    const init = async () => {
      const app = new Application();
      await app.init({
        width: 550,
        height: 830,
        backgroundColor: 0x0a3d5c,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      if (destroyed) { app.destroy(); return; }

      canvasRef.current!.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      const game = new BattleshipGame();
      game.initialize();
      gameRef.current = game;
      resetAI();

      const renderer = new BattleshipRenderer(app);
      rendererRef.current = renderer;

      renderer.setOnCellClick((row, col, board) => {
        const s = game.getState();

        if (s.phase === 'placement' && board === 'player') {
          if (game.placePlayerShip(row, col)) {
            const newState = game.getState();
            setState({ ...newState });
            if (newState.playerShipsToPlace.length > 0) {
              setMessage(`Place your ${newState.playerShipsToPlace[0].name} (${newState.playerShipsToPlace[0].size} cells)`);
            } else {
              setMessage('All ships placed! Fire at will!');
            }
            renderer.render(newState);
          }
        } else if (s.phase === 'playing' && board === 'ai' && s.currentPlayer === 'player') {
          const result = game.playerFire(row, col);
          if (result === 'already-shot') return;
          if (result === null) return;

          const isHit = result === 'hit' || result === 'sunk';

          // Animate the shot before updating state
          renderer.playAttackAnimation(row, col, 'ai', isHit, () => {
            if (result === 'hit') { setMessage(`Hit at ${String.fromCharCode(65 + col)}${row + 1}!`); SoundManager.getInstance().play('explosion'); }
            else if (result === 'sunk') { setMessage(`You sank a ship!`); SoundManager.getInstance().play('explosion'); }
            else { setMessage(`Miss at ${String.fromCharCode(65 + col)}${row + 1}`); SoundManager.getInstance().play('splash'); }

            const newState = game.getState();
            setState({ ...newState });
            renderer.render(newState);

            if (newState.phase === 'finished') {
              setGameOver(true);
              SoundManager.getInstance().play(newState.winner === 'player' ? 'game-win' : 'game-lose');
              const opName2 = useGameStore.getState().selectedOpponent?.name ?? 'AI';
              recordGameRef.current('battleship', newState.winner === 'player', opName2);
            } else if (newState.currentPlayer === 'ai') {
              doAITurn(game, renderer);
            }
          });
        }
      });

      // Set up hover tracking for placement preview
      renderer.setOnCellHover((row, col, board) => {
        const s = game.getState();
        if (s.phase === 'placement' && board === 'player' && s.playerShipsToPlace.length > 0) {
          const ship = s.playerShipsToPlace[0];
          const horizontal = s.placementOrientation === 'horizontal';
          const valid = game.canPlaceAt(row, col);
          renderer.render(s, { row, col, size: ship.size, horizontal, valid });
        }
      });

      renderer.setOnCellHoverOut(() => {
        const s = game.getState();
        if (s.phase === 'placement') {
          renderer.render(s);
        }
      });

      const s = game.getState();
      setState({ ...s });
      renderer.render(s);
    };

    init();
    return () => {
      destroyed = true;
      rendererRef.current?.destroy();
      if (appRef.current) { appRef.current.destroy(true); appRef.current = null; }
    };
  }, [doAITurn]);

  // Keyboard handler for rotation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        gameRef.current?.toggleOrientation();
        const s = gameRef.current?.getState();
        if (s) {
          setState({ ...s });
          rendererRef.current?.render(s);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleRandomPlace = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;
    game.randomPlaceAll();
    const s = game.getState();
    setState({ ...s });
    setMessage('Ships placed randomly! Fire at will!');
    renderer.render(s);
  };

  const handleNewGame = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;
    setGameOver(false);
    resetAI();
    game.initialize();
    const s = game.getState();
    setState({ ...s });
    setMessage('Place your ships');
    renderer.render(s);
  };

  const getStatusText = () => {
    if (!state) return '';
    if (state.phase === 'placement') return 'Place Ships';
    if (state.phase === 'finished') return state.winner === 'player' ? 'You Win!' : 'You Lose!';
    return state.currentPlayer === 'player' ? 'Your Turn' : 'AI Firing...';
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-4 px-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[550px] flex items-center justify-between mb-3">
        <button onClick={() => navigate('/lobby/battleship')} className="text-sm text-white/40 hover:text-white/70 transition-colors">&#8592; Back</button>
        <h2 className="text-lg font-display font-bold text-white">Battleship</h2>
        <span className="text-sm text-white/60">{getStatusText()}</span>
      </motion.div>

      {message && <div className="w-full max-w-[550px] text-center text-sm text-amber-400 mb-2">{message}</div>}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="game-canvas-container" style={{ width: 550, height: 830 }}>
        <div ref={canvasRef} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[550px] flex items-center justify-center gap-3 mt-3">
        {state?.phase === 'placement' && (
          <>
            <button onClick={handleRandomPlace} className="btn-primary text-sm py-2 px-4">Random Placement</button>
            <button onClick={() => { gameRef.current?.toggleOrientation(); const s = gameRef.current?.getState(); if (s) { setState({ ...s }); rendererRef.current?.render(s); } }} className="btn-secondary text-sm py-2 px-4">
              Rotate ({state.placementOrientation === 'horizontal' ? 'H' : 'V'})
            </button>
          </>
        )}
        <button onClick={handleNewGame} className="btn-secondary text-sm py-2 px-4">New Game</button>
      </motion.div>

      <GameOverModal
        isOpen={gameOver}
        won={state?.winner === 'player'}
        title={state?.winner === 'player' ? 'Victory!' : 'Defeat!'}
        gameId="battleship"
        stats={[
          { label: 'Enemy Ships Sunk', value: (state?.aiBoard.ships.filter((s) => s.sunk).length ?? 0).toString() },
          { label: 'Your Ships Lost', value: (state?.playerBoard.ships.filter((s) => s.sunk).length ?? 0).toString() },
        ]}
        onPlayAgain={handleNewGame}
      />
    </div>
  );
}
