import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Application } from 'pixi.js';
import { motion } from 'framer-motion';
import { Card } from '../../engine/types';
import { HeartsGame } from './HeartsGame';
import { HeartsRenderer } from './HeartsRenderer';
import { HeartsState } from './rules';
import { selectPassCards, selectPlay } from './HeartsAI';
import { useUserStore } from '../../stores/userStore';
import { SoundManager } from '../../engine/SoundManager';
import GameOverModal from '../../ui/GameOverModal';

export default function HeartsPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const gameRef = useRef<HeartsGame | null>(null);
  const rendererRef = useRef<HeartsRenderer | null>(null);
  const navigate = useNavigate();

  const [state, setState] = useState<HeartsState | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('');
  const recordGame = useUserStore((s) => s.recordGame);

  // FIX: Use a ref to track selectedCards so the PixiJS click handler closure
  // always reads the current value instead of a stale copy from mount time.
  const selectedCardsRef = useRef<Set<string>>(selectedCards);
  // Keep the ref in sync whenever the state changes
  useEffect(() => {
    selectedCardsRef.current = selectedCards;
  }, [selectedCards]);

  // FIX: Use a ref for recordGame so we don't need it as an effect dependency
  const recordGameRef = useRef(recordGame);
  useEffect(() => {
    recordGameRef.current = recordGame;
  }, [recordGame]);

  const aiPassCards = useCallback((game: HeartsGame) => {
    for (let i = 1; i < 4; i++) {
      const s = game.getState();
      const cards = selectPassCards(s.hands[i]);
      for (const card of cards) {
        game.selectPassCard(i, card);
      }
    }
  }, []);

  const aiPlayTurn = useCallback(async (game: HeartsGame) => {
    const s = game.getState();
    if (s.phase !== 'playing' || s.currentPlayer === 0) return;

    await new Promise((r) => setTimeout(r, 400));

    // Re-check state after await -- game may have been reset while we waited
    const current = game.getState();
    if (current.phase !== 'playing' || current.currentPlayer === 0) return;

    const card = selectPlay(current, current.currentPlayer);
    if (card) {
      game.playCard(current.currentPlayer, card);
      SoundManager.getInstance().play('card-flip');
      const newState = game.getState();
      setState({ ...newState });
      rendererRef.current?.render(newState, new Set());

      // Continue AI play if still AI's turn
      if (newState.phase === 'playing' && newState.currentPlayer !== 0) {
        aiPlayTurn(game);
      } else if (newState.phase === 'round-over') {
        setMessage('Round over! Click "Next Round" to continue.');
      } else if (newState.phase === 'game-over') {
        const winner = game.getWinner();
        setGameOver(true);
        SoundManager.getInstance().play(winner === 0 ? 'game-win' : 'game-lose');
        recordGameRef.current('hearts', winner === 0);
      }
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    let destroyed = false;

    const init = async () => {
      const app = new Application();
      await app.init({
        width: 700,
        height: 600,
        backgroundColor: 0x155c2a,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      if (destroyed) { app.destroy(); return; }

      canvasRef.current!.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      const game = new HeartsGame();
      game.initialize();
      gameRef.current = game;

      const renderer = new HeartsRenderer(app);
      rendererRef.current = renderer;

      // FIX: The click handler reads selectedCardsRef.current instead of the
      // closed-over selectedCards variable. This eliminates the stale closure
      // bug where selecting a second card would lose the first selection.
      renderer.setOnCardClick((card: Card) => {
        const s = game.getState();
        if (s.phase === 'passing') {
          const currentSelected = selectedCardsRef.current;
          const newSelected = new Set(currentSelected);
          if (newSelected.has(card.id)) {
            newSelected.delete(card.id);
            game.deselectPassCard(0, card);
          } else if (newSelected.size < 3) {
            newSelected.add(card.id);
            game.selectPassCard(0, card);
          }
          setSelectedCards(newSelected);
          renderer.render(game.getState(), newSelected);
          setState({ ...game.getState() });
        } else if (s.phase === 'playing' && s.currentPlayer === 0) {
          if (game.playCard(0, card)) {
            SoundManager.getInstance().play('card-flip');
            setSelectedCards(new Set());
            const newState = game.getState();
            setState({ ...newState });
            renderer.render(newState, new Set());

            if (newState.phase === 'playing' && newState.currentPlayer !== 0) {
              aiPlayTurn(game);
            } else if (newState.phase === 'round-over') {
              setMessage('Round over!');
            } else if (newState.phase === 'game-over') {
              const winner = game.getWinner();
              setGameOver(true);
              SoundManager.getInstance().play(winner === 0 ? 'game-win' : 'game-lose');
              recordGameRef.current('hearts', winner === 0);
            }
          }
        }
      });

      // AI pass cards
      aiPassCards(game);

      const s = game.getState();
      setState({ ...s });
      renderer.render(s);

      if (s.phase === 'passing') {
        setMessage('Select 3 cards to pass, then click "Pass Cards"');
      }
    };

    init();
    return () => {
      destroyed = true;
      rendererRef.current?.destroy();
      if (appRef.current) { appRef.current.destroy(true); appRef.current = null; }
    };
  }, [aiPassCards, aiPlayTurn]);

  const handlePass = () => {
    const game = gameRef.current;
    if (!game || selectedCards.size !== 3) return;
    game.executePass();
    setSelectedCards(new Set());
    setMessage('');
    const s = game.getState();
    setState({ ...s });
    rendererRef.current?.render(s, new Set());

    if (s.currentPlayer !== 0) {
      aiPlayTurn(game);
    }
  };

  const handleNextRound = () => {
    const game = gameRef.current;
    if (!game) return;
    game.startNextRound();
    setSelectedCards(new Set());
    setMessage('');
    aiPassCards(game);
    const s = game.getState();
    setState({ ...s });
    rendererRef.current?.render(s);
    if (s.phase === 'passing') {
      setMessage('Select 3 cards to pass');
    } else if (s.currentPlayer !== 0) {
      aiPlayTurn(game);
    }
  };

  const handleNewGame = () => {
    const game = gameRef.current;
    if (!game) return;
    setGameOver(false);
    game.initialize();
    setSelectedCards(new Set());
    setMessage('Select 3 cards to pass');
    aiPassCards(game);
    const s = game.getState();
    setState({ ...s });
    rendererRef.current?.render(s);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-4 px-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[700px] flex items-center justify-between mb-3"
      >
        <button onClick={() => navigate('/lobby/hearts')} className="text-sm text-white/40 hover:text-white/70 transition-colors">
          &#8592; Back
        </button>
        <h2 className="text-lg font-display font-bold text-white">Hearts</h2>
        <span className="text-sm text-white/60">
          {state?.phase === 'passing' ? 'Pass Phase' : state?.phase === 'playing' ? (state.currentPlayer === 0 ? 'Your Turn' : 'AI Playing...') : ''}
        </span>
      </motion.div>

      {message && (
        <div className="w-full max-w-[700px] text-center text-sm text-amber-400 mb-2">{message}</div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="game-canvas-container" style={{ width: 700, height: 600 }}>
        <div ref={canvasRef} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[700px] flex items-center justify-center gap-3 mt-3">
        {state?.phase === 'passing' && (
          <button onClick={handlePass} className="btn-primary text-sm py-2 px-4" disabled={selectedCards.size !== 3}>
            Pass Cards ({selectedCards.size}/3)
          </button>
        )}
        {state?.phase === 'round-over' && (
          <button onClick={handleNextRound} className="btn-primary text-sm py-2 px-4">Next Round</button>
        )}
        <button onClick={handleNewGame} className="btn-secondary text-sm py-2 px-4">New Game</button>
      </motion.div>

      <GameOverModal
        isOpen={gameOver}
        won={state ? gameRef.current?.getWinner() === 0 : false}
        title={state ? (gameRef.current?.getWinner() === 0 ? 'You Win!' : 'Game Over') : ''}
        gameId="hearts"
        stats={state ? [
          { label: 'Your Score', value: state.totalScores[0].toString() },
          { label: 'Rounds', value: state.roundNumber.toString() },
        ] : []}
        onPlayAgain={handleNewGame}
      />
    </div>
  );
}
