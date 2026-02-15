import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Application } from 'pixi.js';
import { motion } from 'framer-motion';
import { BackgammonGame } from './BackgammonGame';
import { BackgammonRenderer } from './BackgammonRenderer';
import { getBestMoves } from './BackgammonAI';
import { BackgammonState, BackgammonMove, pipCount } from './rules';
import { useGameStore } from '../../stores/gameStore';
import { useUserStore } from '../../stores/userStore';
import { SoundManager } from '../../engine/SoundManager';
import GameOverModal from '../../ui/GameOverModal';

const CANVAS_W = 940;
const CANVAS_H = 560;

export default function BackgammonPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const gameRef = useRef<BackgammonGame | null>(null);
  const rendererRef = useRef<BackgammonRenderer | null>(null);
  const navigate = useNavigate();

  const difficulty = useGameStore((s) => s.difficulty);
  const selectedOpponent = useGameStore((s) => s.selectedOpponent);
  const recordGame = useUserStore((s) => s.recordGame);

  const [state, setState] = useState<BackgammonState | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [playerWon, setPlayerWon] = useState(false);
  const [selectedFrom, setSelectedFrom] = useState<number | 'bar' | null>(null);
  const [validMoves, setValidMoves] = useState<BackgammonMove[]>([]);
  const [message, setMessage] = useState('');

  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;
  const recordGameRef = useRef(recordGame);
  recordGameRef.current = recordGame;
  const aiRunningRef = useRef(false);
  const selectedFromRef = useRef<number | 'bar' | null>(null);

  const opponentName = selectedOpponent?.name ?? 'AI';

  const updateDisplay = useCallback((game: BackgammonGame, renderer: BackgammonRenderer, from?: number | 'bar' | null) => {
    const s = game.getState();
    setState({ ...s });
    const moves = from !== null && from !== undefined
      ? game.getValidMoves().filter(m => m.from === from)
      : game.getValidMoves();
    setValidMoves(moves);
    renderer.render(s, moves, from ?? null);
  }, []);

  const doAITurn = useCallback(async (game: BackgammonGame, renderer: BackgammonRenderer) => {
    if (aiRunningRef.current) return;
    aiRunningRef.current = true;

    await new Promise(r => setTimeout(r, 400));

    // AI rolls
    const dice = game.roll();
    if (!dice) { aiRunningRef.current = false; return; }

    SoundManager.getInstance().play('dice-roll');
    const s = game.getState();
    setState({ ...s });
    renderer.render(s, [], null);

    await new Promise(r => setTimeout(r, 600));

    // Get AI moves
    const aiMoves = getBestMoves(game.getState(), difficultyRef.current);

    // Execute moves with animation delay
    for (const move of aiMoves) {
      game.makeMove(move);
      SoundManager.getInstance().play('board-move');
      const newS = game.getState();
      setState({ ...newS });
      renderer.render(newS, [], null);

      if (move.hitOpponent) {
        SoundManager.getInstance().play('piece-capture');
      }

      await new Promise(r => setTimeout(r, 350));
    }

    const finalState = game.getState();
    setState({ ...finalState });
    renderer.render(finalState, [], null);

    if (finalState.phase === 'finished') {
      setGameOver(true);
      const won = finalState.winner === 'white';
      setPlayerWon(won);
      const opName = useGameStore.getState().selectedOpponent?.name ?? 'AI';
      recordGameRef.current('backgammon', won, opName);
      SoundManager.getInstance().play(won ? 'game-win' : 'game-lose');
      if (won) renderer.showWin();
    }

    aiRunningRef.current = false;
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    let destroyed = false;

    const init = async () => {
      const app = new Application();
      await app.init({
        width: CANVAS_W,
        height: CANVAS_H,
        backgroundColor: 0x2a1810,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      if (destroyed) { app.destroy(); return; }

      canvasRef.current!.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      const game = new BackgammonGame();
      game.initialize();
      gameRef.current = game;

      const renderer = new BackgammonRenderer(app);
      rendererRef.current = renderer;

      // Roll button handler
      renderer.setOnRollClick(() => {
        if (aiRunningRef.current) return;
        const s = game.getState();
        if (s.phase !== 'rolling' || s.currentPlayer !== 'white') return;

        const dice = game.roll();
        if (dice) {
          SoundManager.getInstance().play('dice-roll');
          setSelectedFrom(null);
          selectedFromRef.current = null;
          updateDisplay(game, renderer);
          setMessage(`You rolled ${dice[0]} and ${dice[1]}`);

          // Check if no moves (auto-skip)
          const afterRoll = game.getState();
          if (afterRoll.phase === 'rolling' && afterRoll.currentPlayer === 'black') {
            setMessage(`No moves available. ${opponentName}'s turn.`);
            setTimeout(() => doAITurn(game, renderer), 500);
          }
        }
      });

      // Point click handler
      renderer.setOnPointClick((pointIndex: number) => {
        if (aiRunningRef.current) return;
        const s = game.getState();
        if (s.phase !== 'moving' || s.currentPlayer !== 'white') return;

        const currentFrom = selectedFromRef.current;

        // If a source is selected, try to move to this point
        if (currentFrom !== null) {
          const allMoves = game.getValidMoves();
          const matching = allMoves.filter(m =>
            m.from === currentFrom && m.to === pointIndex
          );

          if (matching.length > 0) {
            // Use the first matching die value
            const move = matching[0];
            game.makeMove(move);
            SoundManager.getInstance().play('board-move');
            if (move.hitOpponent) {
              SoundManager.getInstance().play('piece-capture');
              setMessage('Hit!');
            } else {
              setMessage('');
            }

            setSelectedFrom(null);
            selectedFromRef.current = null;
            updateDisplay(game, renderer);

            const newS = game.getState();
            if (newS.phase === 'finished') {
              setGameOver(true);
              setPlayerWon(newS.winner === 'white');
              recordGameRef.current('backgammon', newS.winner === 'white', opponentName);
              SoundManager.getInstance().play(newS.winner === 'white' ? 'game-win' : 'game-lose');
              if (newS.winner === 'white') renderer.showWin();
            } else if (newS.phase === 'rolling' && newS.currentPlayer === 'black') {
              doAITurn(game, renderer);
            }
            return;
          }
        }

        // Check if clicking on the bearing off tray area (handled via 'off' target below)

        // Select a source point
        const allMoves = game.getValidMoves();
        const movesFromPoint = allMoves.filter(m => m.from === pointIndex);

        if (movesFromPoint.length > 0) {
          SoundManager.getInstance().play('piece-click');
          setSelectedFrom(pointIndex);
          selectedFromRef.current = pointIndex;
          setValidMoves(movesFromPoint);
          renderer.render(s, movesFromPoint, pointIndex);
        } else {
          // Deselect
          setSelectedFrom(null);
          selectedFromRef.current = null;
          updateDisplay(game, renderer);
        }
      });

      // Bar click handler
      renderer.setOnBarClick(() => {
        if (aiRunningRef.current) return;
        const s = game.getState();
        if (s.phase !== 'moving' || s.currentPlayer !== 'white') return;
        if (s.bar[0] === 0) return; // No white pieces on bar

        const allMoves = game.getValidMoves();
        const barMoves = allMoves.filter(m => m.from === 'bar');

        if (barMoves.length > 0) {
          SoundManager.getInstance().play('piece-click');
          setSelectedFrom('bar');
          selectedFromRef.current = 'bar';
          setValidMoves(barMoves);
          renderer.render(s, barMoves, 'bar');
        }
      });

      const initialState = game.getState();
      setState({ ...initialState });
      renderer.render(initialState, [], null);
      setMessage('Roll the dice to start!');
    };

    init();
    return () => {
      destroyed = true;
      rendererRef.current?.destroy();
      if (appRef.current) { appRef.current.destroy(true); appRef.current = null; }
    };
  }, [doAITurn, updateDisplay, opponentName]);

  const handleBearOff = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer || aiRunningRef.current) return;

    const s = game.getState();
    if (s.phase !== 'moving' || s.currentPlayer !== 'white') return;

    const currentFrom = selectedFromRef.current;
    if (currentFrom === null) return;

    const allMoves = game.getValidMoves();
    const bearOffMove = allMoves.find(m => m.from === currentFrom && m.to === 'off');

    if (bearOffMove) {
      game.makeMove(bearOffMove);
      SoundManager.getInstance().play('board-move');
      setMessage('');
      setSelectedFrom(null);
      selectedFromRef.current = null;
      updateDisplay(game, renderer);

      const newS = game.getState();
      if (newS.phase === 'finished') {
        setGameOver(true);
        setPlayerWon(newS.winner === 'white');
        recordGameRef.current('backgammon', newS.winner === 'white', opponentName);
        SoundManager.getInstance().play(newS.winner === 'white' ? 'game-win' : 'game-lose');
        if (newS.winner === 'white') renderer.showWin();
      } else if (newS.phase === 'rolling' && newS.currentPlayer === 'black') {
        doAITurn(game, renderer);
      }
    }
  };

  const handleUndo = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer || aiRunningRef.current) return;

    if (game.undo()) {
      setSelectedFrom(null);
      selectedFromRef.current = null;
      setMessage('');
      updateDisplay(game, renderer);
    }
  };

  const handleNewGame = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;

    setGameOver(false);
    setSelectedFrom(null);
    selectedFromRef.current = null;
    setValidMoves([]);
    setMessage('Roll the dice to start!');
    aiRunningRef.current = false;
    renderer.stopCelebration();
    game.initialize();
    updateDisplay(game, renderer);
  };

  // Check if bear off is available
  const canBearOffNow = state && selectedFrom !== null &&
    validMoves.some(m => m.from === selectedFrom && m.to === 'off');

  const whitePip = state ? pipCount(state, 'white') : 167;
  const blackPip = state ? pipCount(state, 'black') : 167;

  return (
    <div className="min-h-screen flex flex-col items-center py-4 px-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[960px] flex items-center justify-between mb-3"
      >
        <button
          onClick={() => navigate('/lobby/backgammon')}
          className="text-sm text-white/50 hover:text-white/80 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg"
        >
          {'\u2190'} Back
        </button>
        <h2 className="text-lg font-display font-bold text-white">Backgammon</h2>
        <span className="text-sm text-white/60">
          {state?.phase === 'rolling' && state.currentPlayer === 'white' ? 'Your turn - roll!' :
           state?.phase === 'moving' && state.currentPlayer === 'white' ? 'Your turn - move' :
           state?.phase === 'finished' ? (state.winner === 'white' ? 'You Win!' : 'You Lose!') :
           `${opponentName}'s turn...`}
        </span>
      </motion.div>

      {/* Player info bar */}
      <div className="w-full max-w-[960px] flex justify-between items-center mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm">
            {selectedOpponent?.avatar ?? '\u{1F916}'}
          </div>
          <div className="text-xs text-white/60">{opponentName} (Black)</div>
          <div className="text-xs text-white/40 ml-1">
            Pip: <span className="text-white font-bold">{blackPip}</span>
          </div>
          <div className="text-xs text-white/40">
            Off: <span className="text-white font-bold">{state?.borneOff[1] ?? 0}/15</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-white/40">
            Off: <span className="text-white font-bold">{state?.borneOff[0] ?? 0}/15</span>
          </div>
          <div className="text-xs text-white/40 mr-1">
            Pip: <span className="text-white font-bold">{whitePip}</span>
          </div>
          <div className="text-xs text-white/60">You (White)</div>
          <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-sm">{'\u265A'}</div>
        </div>
      </div>

      {message && (
        <div className="w-full max-w-[960px] text-center text-sm text-amber-400 mb-2">{message}</div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="game-canvas-container"
        style={{ maxWidth: CANVAS_W, aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
      >
        <div ref={canvasRef} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[960px] flex items-center justify-center gap-3 mt-3 flex-wrap"
      >
        <button onClick={handleUndo} className="btn-secondary text-sm py-2 px-4" disabled={aiRunningRef.current || gameOver}>
          Undo
        </button>
        {canBearOffNow && (
          <button onClick={handleBearOff} className="btn-primary text-sm py-2 px-4">
            Bear Off
          </button>
        )}
        <button onClick={handleNewGame} className="btn-secondary text-sm py-2 px-4">
          New Game
        </button>
      </motion.div>

      <GameOverModal
        isOpen={gameOver}
        won={playerWon}
        title={playerWon ? 'Victory!' : 'Defeat!'}
        gameId="backgammon"
        stats={[
          { label: 'Pieces Off', value: `${state?.borneOff[0] ?? 0}/15` },
          { label: `${opponentName} Off`, value: `${state?.borneOff[1] ?? 0}/15` },
          { label: 'Difficulty', value: difficulty },
        ]}
        onPlayAgain={handleNewGame}
      />
    </div>
  );
}
