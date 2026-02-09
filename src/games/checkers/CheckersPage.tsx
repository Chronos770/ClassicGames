import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Application } from 'pixi.js';
import { motion } from 'framer-motion';
import { CheckersGame } from './CheckersGame';
import { CheckersRenderer } from './CheckersRenderer';
import { getBestMove } from './CheckersAI';
import { CheckersState, CheckerMove } from './rules';
import { useGameStore } from '../../stores/gameStore';
import { useUserStore } from '../../stores/userStore';
import { SoundManager } from '../../engine/SoundManager';
import { MultiplayerGameAdapter } from '../../lib/multiplayerGameAdapter';
import GameOverModal from '../../ui/GameOverModal';

export default function CheckersPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const gameRef = useRef<CheckersGame | null>(null);
  const rendererRef = useRef<CheckersRenderer | null>(null);
  const navigate = useNavigate();

  const difficulty = useGameStore((s) => s.difficulty);
  const isMultiplayer = useGameStore((s) => s.isMultiplayer);
  const recordGame = useUserStore((s) => s.recordGame);
  const adapterRef = useRef<MultiplayerGameAdapter | null>(null);

  const [state, setState] = useState<CheckersState | null>(null);
  const [validMoves, setValidMoves] = useState<CheckerMove[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [thinking, setThinking] = useState(false);

  // FIX BUG 2: Use refs to hold mutable values that the PixiJS click callback needs.
  // This avoids stale closures -- the callback reads from the ref, which always
  // points to the latest value.
  const validMovesRef = useRef<CheckerMove[]>([]);
  const thinkingRef = useRef(false);
  const recordGameRef = useRef(recordGame);
  const difficultyRef = useRef(difficulty);

  // Keep refs in sync with state/props
  useEffect(() => { validMovesRef.current = validMoves; }, [validMoves]);
  useEffect(() => { thinkingRef.current = thinking; }, [thinking]);
  useEffect(() => { recordGameRef.current = recordGame; }, [recordGame]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  // FIX BUG 7: Use a ref to prevent concurrent AI move executions
  const aiRunningRef = useRef(false);

  const doAIMove = useCallback(async (game: CheckersGame, renderer: CheckersRenderer) => {
    if (aiRunningRef.current) return;
    aiRunningRef.current = true;
    setThinking(true);
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));

    // FIX BUG 6: Mark start of AI turn for proper undo
    game.markTurnStart();

    let madeMove = true;
    while (madeMove) {
      const currentState = game.getState();
      if (currentState.currentPlayer !== 'black' || currentState.phase === 'finished') break;

      const move = getBestMove(currentState, difficultyRef.current);
      if (move) {
        game.makeMove(move);
        const newState = game.getState();
        setState({ ...newState });
        renderer.render(newState);

        // Check if multi-jump continues
        if (newState.jumpingPiece && newState.currentPlayer === 'black') {
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }
      }
      madeMove = false;
    }

    const finalState = game.getState();
    if (finalState.phase === 'finished') {
      setGameOver(true);
      const opName = useGameStore.getState().selectedOpponent?.name ?? 'AI';
      recordGameRef.current('checkers', finalState.winner === 'red', opName);
      SoundManager.getInstance().play(finalState.winner === 'red' ? 'game-win' : 'game-lose');
      renderer.showWin();
    }
    setThinking(false);
    aiRunningRef.current = false;
  // FIX BUG 1: Remove all volatile deps. doAIMove now reads from refs,
  // so it never needs to change identity.
  }, []);

  // FIX BUG 1: The useEffect dependency array must contain ONLY stable values.
  // Previously it included [doAIMove, thinking, validMoves, recordGame] which
  // caused the entire PixiJS app to be destroyed and recreated on every state change.
  // Now it only depends on [] (mount/unmount).
  useEffect(() => {
    if (!canvasRef.current) return;
    let destroyed = false;

    const init = async () => {
      const app = new Application();
      await app.init({
        width: 720,
        height: 650,
        backgroundColor: 0x3d2b1f,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      if (destroyed) { app.destroy(); return; }

      canvasRef.current!.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      const game = new CheckersGame();
      game.initialize();
      gameRef.current = game;

      const renderer = new CheckersRenderer(app);
      rendererRef.current = renderer;

      // FIX BUG 2: The click handler reads from refs instead of closed-over
      // React state variables. This ensures it always sees the latest values.
      renderer.setOnCellClick((row, col) => {
        if (thinkingRef.current) return;
        const s = game.getState();
        if (s.currentPlayer !== 'red' || s.phase === 'finished') return;

        const piece = s.board[row][col];

        // If clicking a valid move target
        const currentValidMoves = validMovesRef.current;
        const matchingMove = currentValidMoves.find((m) => m.toRow === row && m.toCol === col);
        if (matchingMove) {
          game.makeMove(matchingMove);
          SoundManager.getInstance().play(matchingMove.isJump ? 'piece-capture' : 'board-move');
          const newState = game.getState();
          setState({ ...newState });
          setValidMoves([]);

          // Check for multi-jump
          if (newState.jumpingPiece && newState.currentPlayer === 'red') {
            const nextMoves = game.selectPiece(newState.jumpingPiece.row, newState.jumpingPiece.col);
            setValidMoves(nextMoves);
            renderer.render(newState, nextMoves);
            return;
          }

          renderer.render(newState);

          if (newState.phase === 'finished') {
            setGameOver(true);
            const opName2 = useGameStore.getState().selectedOpponent?.name ?? 'AI';
            recordGameRef.current('checkers', newState.winner === 'red', opName2);
            SoundManager.getInstance().play(newState.winner === 'red' ? 'game-win' : 'game-lose');
            renderer.showWin();
          } else if (newState.currentPlayer === 'black') {
            doAIMove(game, renderer);
          }
          return;
        }

        // Select a piece
        if (piece && piece.color === 'red') {
          SoundManager.getInstance().play('piece-click');
          // FIX BUG 6: Mark start of player turn when they select their first piece
          // (only if not already in a multi-jump)
          if (!s.jumpingPiece) {
            game.markTurnStart();
          }
          const moves = game.selectPiece(row, col);
          setValidMoves(moves);
          renderer.render(game.getState(), moves);
        }
      });

      const initialState = game.getState();
      setState({ ...initialState });
      renderer.render(initialState);

      // Multiplayer adapter
      if (useGameStore.getState().isMultiplayer) {
        const adapter = new MultiplayerGameAdapter('checkers');
        adapterRef.current = adapter;
        adapter.connect((moveData: { fromRow: number; fromCol: number; toRow: number; toCol: number }) => {
          const moves = game.selectPiece(moveData.fromRow, moveData.fromCol);
          const move = moves.find(m => m.toRow === moveData.toRow && m.toCol === moveData.toCol);
          if (move) {
            game.makeMove(move);
            const newState = game.getState();
            setState({ ...newState });
            renderer.render(newState);
            if (newState.phase === 'finished') {
              setGameOver(true);
            }
          }
        });
      }
    };

    init();
    return () => {
      destroyed = true;
      adapterRef.current?.disconnect();
      rendererRef.current?.destroy();
      if (appRef.current) { appRef.current.destroy(true); appRef.current = null; }
    };
  }, [doAIMove]);

  const handleNewGame = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;
    setGameOver(false);
    setValidMoves([]);
    setThinking(false);
    aiRunningRef.current = false;
    // FIX BUG 5: Stop the celebration effect before starting a new game
    renderer.stopCelebration();
    game.initialize();
    const s = game.getState();
    setState({ ...s });
    renderer.render(s);
  };

  // FIX BUG 4/6: Undo uses undoTurn() to properly undo an entire turn
  // (including multi-jump sequences), then does it twice to undo both
  // the AI's turn and the player's turn.
  const handleUndo = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer || thinking) return;
    // Undo AI turn
    game.undoTurn();
    // Undo player turn
    game.undoTurn();
    setValidMoves([]);
    setGameOver(false);
    // FIX BUG 5: Stop celebration if undoing from a finished game
    renderer.stopCelebration();
    const s = game.getState();
    setState({ ...s });
    renderer.render(s);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-4 px-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[720px] flex items-center justify-between mb-3">
        <button onClick={() => navigate('/lobby/checkers')} className="text-sm text-white/40 hover:text-white/70 transition-colors">&#8592; Back</button>
        <h2 className="text-lg font-display font-bold text-white">Checkers</h2>
        <span className="text-sm text-white/60">
          {thinking ? <span className="text-amber-400 animate-pulse">AI thinking...</span> : state?.currentPlayer === 'red' ? 'Your turn (Red)' : ''}
        </span>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="game-canvas-container" style={{ width: 720, height: 650 }}>
        <div ref={canvasRef} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[720px] flex items-center justify-center gap-3 mt-3">
        <button onClick={handleUndo} className="btn-secondary text-sm py-2 px-4" disabled={thinking}>Undo</button>
        <button onClick={handleNewGame} className="btn-secondary text-sm py-2 px-4">New Game</button>
      </motion.div>

      <GameOverModal
        isOpen={gameOver}
        won={state?.winner === 'red'}
        title={state?.winner === 'red' ? 'You Win!' : 'AI Wins!'}
        gameId="checkers"
        stats={[
          { label: 'Your Pieces', value: (state?.redCount ?? 0).toString() },
          { label: 'AI Pieces', value: (state?.blackCount ?? 0).toString() },
        ]}
        onPlayAgain={handleNewGame}
      />
    </div>
  );
}
