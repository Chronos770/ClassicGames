import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Application } from 'pixi.js';
import { motion } from 'framer-motion';
import { Card } from '../../engine/types';
import { RummyGame } from './RummyGame';
import { RummyRenderer } from './RummyRenderer';
import { RummyState } from './rules';
import { aiDecideDraw, aiSelectDiscard, aiShouldKnock, aiSelectKnockDiscard } from './RummyAI';
import { useUserStore } from '../../stores/userStore';
import { SoundManager } from '../../engine/SoundManager';
import GameOverModal from '../../ui/GameOverModal';

export default function RummyPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const gameRef = useRef<RummyGame | null>(null);
  const rendererRef = useRef<RummyRenderer | null>(null);
  const navigate = useNavigate();

  const [state, setState] = useState<RummyState | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [roundOver, setRoundOver] = useState(false);
  const [message, setMessage] = useState('');
  const recordGame = useUserStore((s) => s.recordGame);

  // Use refs to avoid stale closures in the PixiJS callback set once at mount.
  // The callback captures the ref objects (stable), not the function values (which change).
  const recordGameRef = useRef(recordGame);
  recordGameRef.current = recordGame;

  const aiTurnRef = useRef<(game: RummyGame, renderer: RummyRenderer) => Promise<void>>();

  const aiTurn = useCallback(async (game: RummyGame, renderer: RummyRenderer) => {
    await new Promise((r) => setTimeout(r, 500));

    const s = game.getState();
    if (s.currentPlayer !== 1 || s.phase === 'finished' || s.phase === 'round-over') return;

    // AI draws
    const drawChoice = aiDecideDraw(s);
    if (drawChoice === 'discard') {
      game.drawFromDiscard();
    } else {
      if (!game.drawFromPile()) {
        // Draw pile was empty, game ended as draw
        const newState = game.getState();
        setState({ ...newState });
        renderer.render(newState);
        setMessage(newState.lastAction);
        if (newState.phase === 'round-over') {
          setRoundOver(true);
        }
        return;
      }
    }

    const afterDraw = game.getState();
    setState({ ...afterDraw });
    renderer.render(afterDraw);

    await new Promise((r) => setTimeout(r, 300));

    // AI checks if should knock (evaluate on 11-card hand, pick best discard)
    const aiHand = game.getState().hands[1];
    if (aiShouldKnock(aiHand)) {
      // AI needs to select a discard card for the knock
      const knockDiscard = aiSelectKnockDiscard(aiHand);
      if (knockDiscard && game.knockWithDiscard(knockDiscard)) {
        const newState = game.getState();
        setState({ ...newState });
        renderer.render(newState);
        setMessage(newState.lastAction);
        if (newState.phase === 'finished') {
          setGameOver(true);
          recordGameRef.current('rummy', newState.winner === 0);
        } else if (newState.phase === 'round-over') {
          setRoundOver(true);
        }
        return;
      }
    }

    // AI discards normally
    const discard = aiSelectDiscard(game.getState().hands[1]);
    game.discard(discard);

    const newState = game.getState();
    setState({ ...newState });
    renderer.render(newState);
    setMessage(newState.lastAction);

    if (newState.phase === 'finished') {
      setGameOver(true);
      recordGameRef.current('rummy', newState.winner === 0);
    } else if (newState.phase === 'round-over') {
      setRoundOver(true);
    }
  }, []);

  // Keep the ref in sync so the PixiJS click handler always calls the latest version
  aiTurnRef.current = aiTurn;

  useEffect(() => {
    if (!canvasRef.current) return;
    let destroyed = false;

    const init = async () => {
      const app = new Application();
      await app.init({
        width: 700,
        height: 550,
        backgroundColor: 0x155c2a,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      if (destroyed) { app.destroy(); return; }

      canvasRef.current!.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      const game = new RummyGame();
      game.initialize();
      gameRef.current = game;

      const renderer = new RummyRenderer(app);
      rendererRef.current = renderer;

      renderer.setOnCardClick((card: Card, source: string) => {
        const s = game.getState();
        if (s.currentPlayer !== 0) return;
        if (s.phase === 'finished' || s.phase === 'round-over') return;

        if (s.phase === 'draw') {
          if (source === 'draw') {
            SoundManager.getInstance().play('card-deal');
            if (!game.drawFromPile()) {
              // Draw pile empty
              const newState = game.getState();
              setState({ ...newState });
              renderer.render(newState);
              setMessage(newState.lastAction);
              if (newState.phase === 'round-over') {
                setRoundOver(true);
              }
              return;
            }
          } else if (source === 'discard') {
            SoundManager.getInstance().play('card-deal');
            game.drawFromDiscard();
          } else {
            return; // clicking hand card during draw phase does nothing
          }
          const newState = game.getState();
          setState({ ...newState });
          renderer.render(newState);
        } else if (s.phase === 'knock-discard' && source === 'hand') {
          // Player is in knock-discard mode: the clicked hand card is the discard for knock
          if (game.knockWithDiscard(card)) {
            SoundManager.getInstance().play('card-place');
            const newState = game.getState();
            setState({ ...newState });
            renderer.render(newState);
            setMessage(newState.lastAction);
            if (newState.phase === 'finished') {
              setGameOver(true);
              SoundManager.getInstance().play(newState.winner === 0 ? 'game-win' : 'game-lose');
              recordGameRef.current('rummy', newState.winner === 0);
            } else if (newState.phase === 'round-over') {
              setRoundOver(true);
            }
          } else {
            // That discard didn't result in a valid knock; let user pick another
            setMessage('That discard would not allow a valid knock. Pick another card.');
          }
        } else if (s.phase === 'discard' && source === 'hand') {
          SoundManager.getInstance().play('card-flip');
          game.discard(card);
          const newState = game.getState();
          setState({ ...newState });
          renderer.render(newState);
          setMessage(newState.lastAction);

          if (newState.phase === 'finished') {
            setGameOver(true);
            SoundManager.getInstance().play(newState.winner === 0 ? 'game-win' : 'game-lose');
            recordGameRef.current('rummy', newState.winner === 0);
          } else if (newState.phase === 'round-over') {
            setRoundOver(true);
          } else if (newState.currentPlayer === 1) {
            aiTurnRef.current?.(game, renderer);
          }
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
  }, []);

  const handleKnock = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;

    // Enter knock-discard phase: player must now click a hand card to discard
    if (game.enterKnockPhase()) {
      const s = game.getState();
      setState({ ...s });
      renderer.render(s);
      setMessage('Knock! Select a card to discard.');
    }
  };

  const handleCancelKnock = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;
    game.cancelKnock();
    const s = game.getState();
    setState({ ...s });
    renderer.render(s);
    setMessage('');
  };

  const handleNewRound = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;
    setRoundOver(false);
    setMessage('');
    game.newRound();
    const s = game.getState();
    setState({ ...s });
    renderer.render(s);
  };

  const handleNewGame = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;
    setGameOver(false);
    setRoundOver(false);
    setMessage('');
    game.initialize();
    const s = game.getState();
    setState({ ...s });
    renderer.render(s);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-4 px-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[700px] flex items-center justify-between mb-3">
        <button onClick={() => navigate('/lobby/rummy')} className="text-sm text-white/40 hover:text-white/70 transition-colors">&#8592; Back</button>
        <h2 className="text-lg font-display font-bold text-white">Gin Rummy</h2>
        <span className="text-sm text-white/60">
          {state?.phase === 'draw' && state.currentPlayer === 0
            ? 'Draw a card'
            : state?.phase === 'discard' && state.currentPlayer === 0
              ? 'Discard a card'
              : state?.phase === 'knock-discard' && state.currentPlayer === 0
                ? 'Discard for knock'
                : ''}
        </span>
      </motion.div>

      {message && <div className="w-full max-w-[700px] text-center text-sm text-amber-400 mb-2">{message}</div>}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="game-canvas-container" style={{ width: 700, height: 550 }}>
        <div ref={canvasRef} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[700px] flex items-center justify-center gap-3 mt-3">
        {state?.phase === 'discard' && state.currentPlayer === 0 && gameRef.current?.canKnock() && (
          <button onClick={handleKnock} className="btn-primary text-sm py-2 px-4">
            {gameRef.current?.isGin() ? 'Gin!' : 'Knock'}
          </button>
        )}
        {state?.phase === 'knock-discard' && state.currentPlayer === 0 && (
          <button onClick={handleCancelKnock} className="btn-secondary text-sm py-2 px-4">
            Cancel Knock
          </button>
        )}
        {state?.phase === 'round-over' && !gameOver && (
          <button onClick={handleNewRound} className="btn-primary text-sm py-2 px-4">
            Next Round
          </button>
        )}
        <button onClick={handleNewGame} className="btn-secondary text-sm py-2 px-4">New Game</button>
      </motion.div>

      <GameOverModal
        isOpen={gameOver}
        won={state?.winner === 0}
        title={state?.winner === 0 ? 'You Win!' : state?.winner === 1 ? 'AI Wins!' : 'Draw!'}
        gameId="rummy"
        stats={state ? [
          { label: 'Your Score', value: state.scores[0].toString() },
          { label: 'AI Score', value: state.scores[1].toString() },
        ] : []}
        onPlayAgain={handleNewGame}
      />
    </div>
  );
}
