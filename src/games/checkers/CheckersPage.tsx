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
import { useAuthStore } from '../../stores/authStore';
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
  const playerColor = useGameStore((s) => s.playerColor);
  const selectedOpponent = useGameStore((s) => s.selectedOpponent);
  const recordGame = useUserStore((s) => s.recordGame);
  const adapterRef = useRef<MultiplayerGameAdapter | null>(null);

  const [state, setState] = useState<CheckersState | null>(null);
  const [validMoves, setValidMoves] = useState<CheckerMove[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [playerWon, setPlayerWon] = useState<boolean | null>(null);
  const [thinking, setThinking] = useState(false);

  const validMovesRef = useRef<CheckerMove[]>([]);
  const thinkingRef = useRef(false);
  const recordGameRef = useRef(recordGame);
  const difficultyRef = useRef(difficulty);

  useEffect(() => { validMovesRef.current = validMoves; }, [validMoves]);
  useEffect(() => { thinkingRef.current = thinking; }, [thinking]);
  useEffect(() => { recordGameRef.current = recordGame; }, [recordGame]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  const aiRunningRef = useRef(false);

  // In multiplayer: 'w' = red (host), 'b' = black (joiner)
  const localColor = isMultiplayer ? (playerColor === 'w' ? 'red' : 'black') : 'red';
  const remoteColor = localColor === 'red' ? 'black' : 'red';
  const multiplayerOpponentName = useGameStore((s) => s.multiplayerOpponentName);
  const opponentName = isMultiplayer ? (multiplayerOpponentName || 'Opponent') : (selectedOpponent?.name ?? 'AI');

  const doAIMove = useCallback(async (game: CheckersGame, renderer: CheckersRenderer) => {
    if (aiRunningRef.current) return;
    aiRunningRef.current = true;
    setThinking(true);
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));

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
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    let destroyed = false;

    const init = async () => {
      const app = new Application();
      await app.init({
        width: 800,
        height: 800,
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

      const storeState = useGameStore.getState();
      const myColor = storeState.isMultiplayer ? (storeState.playerColor === 'w' ? 'red' : 'black') : 'red';

      renderer.setOnCellClick((row, col) => {
        if (thinkingRef.current) return;
        const s = game.getState();
        if (s.currentPlayer !== myColor || s.phase === 'finished') return;

        const piece = s.board[row][col];

        const currentValidMoves = validMovesRef.current;
        const matchingMove = currentValidMoves.find((m) => m.toRow === row && m.toCol === col);
        if (matchingMove) {
          game.makeMove(matchingMove);
          SoundManager.getInstance().play(matchingMove.isJump ? 'piece-capture' : 'board-move');
          const newState = game.getState();
          setState({ ...newState });
          setValidMoves([]);

          // Send move to remote player
          if (adapterRef.current) {
            adapterRef.current.sendMove({
              fromRow: matchingMove.fromRow,
              fromCol: matchingMove.fromCol,
              toRow: matchingMove.toRow,
              toCol: matchingMove.toCol,
            });
          }

          // Check for multi-jump
          if (newState.jumpingPiece && newState.currentPlayer === myColor) {
            const nextMoves = game.selectPiece(newState.jumpingPiece.row, newState.jumpingPiece.col);
            setValidMoves(nextMoves);
            renderer.render(newState, nextMoves);
            return;
          }

          renderer.render(newState);

          if (newState.phase === 'finished') {
            setGameOver(true);
            const mp = useGameStore.getState().isMultiplayer;
            const localWon = mp ? newState.winner === myColor : newState.winner === 'red';
            const opName2 = mp ? (useGameStore.getState().multiplayerOpponentName || 'Opponent') : (useGameStore.getState().selectedOpponent?.name ?? 'AI');
            recordGameRef.current('checkers', localWon, opName2);
            SoundManager.getInstance().play(localWon ? 'game-win' : 'game-lose');
            renderer.showWin();
          } else if (!adapterRef.current && newState.currentPlayer === 'black') {
            doAIMove(game, renderer);
          }
          return;
        }

        // Select a piece
        if (piece && piece.color === myColor) {
          SoundManager.getInstance().play('piece-click');
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
      if (storeState.isMultiplayer) {
        const adapter = new MultiplayerGameAdapter('checkers');
        adapterRef.current = adapter;
        adapter.connect((moveData: any) => {
          // Handle name exchange
          if (moveData.type === 'player-info') {
            useGameStore.getState().setMultiplayerOpponentName(moveData.name || 'Opponent');
            return;
          }
          // Handle resign
          if (moveData.type === 'resign') {
            setPlayerWon(true);
            setGameOver(true);
            recordGameRef.current('checkers', true, useGameStore.getState().multiplayerOpponentName || 'Opponent');
            SoundManager.getInstance().play('game-win');
            renderer.showWin();
            return;
          }
          const moves = game.selectPiece(moveData.fromRow, moveData.fromCol);
          const move = moves.find((m: CheckerMove) => m.toRow === moveData.toRow && m.toCol === moveData.toCol);
          if (move) {
            game.makeMove(move);
            SoundManager.getInstance().play(move.isJump ? 'piece-capture' : 'board-move');
            const newState = game.getState();
            setState({ ...newState });
            setValidMoves([]);
            renderer.render(newState);
            if (newState.phase === 'finished') {
              setGameOver(true);
              const localWon = newState.winner === myColor;
              recordGameRef.current('checkers', localWon, useGameStore.getState().multiplayerOpponentName || 'Opponent');
              SoundManager.getInstance().play(localWon ? 'game-win' : 'game-lose');
              if (localWon) renderer.showWin();
            }
          }
        });

        // Announce our name
        const profile = useAuthStore.getState().profile;
        const myName = profile?.display_name || 'Player';
        setTimeout(() => adapter.sendMove({ type: 'player-info', name: myName }), 300);
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
    setPlayerWon(null);
    setValidMoves([]);
    setThinking(false);
    aiRunningRef.current = false;
    renderer.stopCelebration();
    game.initialize();
    const s = game.getState();
    setState({ ...s });
    renderer.render(s);
  };

  const handleUndo = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer || thinking) return;
    game.undoTurn();
    game.undoTurn();
    setValidMoves([]);
    setGameOver(false);
    renderer.stopCelebration();
    const s = game.getState();
    setState({ ...s });
    renderer.render(s);
  };

  const handleResign = () => {
    if (!isMultiplayer || gameOver) return;
    adapterRef.current?.sendMove({ type: 'resign' });
    setPlayerWon(false);
    setGameOver(true);
    SoundManager.getInstance().play('game-lose');
    recordGameRef.current('checkers', false, multiplayerOpponentName || 'Opponent');
  };

  const isLocalTurn = state ? state.currentPlayer === localColor : false;

  return (
    <div className="min-h-screen flex flex-col items-center py-4 px-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[800px] flex items-center justify-between mb-3">
        <button onClick={() => {
          if (isMultiplayer && !gameOver) {
            if (!window.confirm('Leaving will count as a resignation. Are you sure?')) return;
            adapterRef.current?.sendMove({ type: 'resign' });
          }
          navigate('/lobby/checkers');
        }} className="text-sm text-white/50 hover:text-white/80 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg">{'\u2190'} Back</button>
        <h2 className="text-lg font-display font-bold text-white">Checkers</h2>
        <span className="text-sm text-white/60">
          {thinking && !isMultiplayer ? (
            <span className="text-amber-400 animate-pulse">
              {selectedOpponent ? `${selectedOpponent.avatar} thinking...` : 'AI thinking...'}
            </span>
          ) : isLocalTurn ? 'Your turn' : `${opponentName}'s turn`}
        </span>
      </motion.div>

      {/* Player info bar */}
      <div className="w-full max-w-[800px] flex justify-between items-center mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm">
            {isMultiplayer ? '\u{1F464}' : (selectedOpponent?.avatar ?? '\u{1F916}')}
          </div>
          <div className="text-xs text-white/60">{opponentName} ({remoteColor === 'red' ? 'Red' : 'Black'})</div>
          <div className="text-xs text-white/40 ml-1">Pieces: {remoteColor === 'red' ? state?.redCount ?? 0 : state?.blackCount ?? 0}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-white/40 mr-1">Pieces: {localColor === 'red' ? state?.redCount ?? 0 : state?.blackCount ?? 0}</div>
          <div className="text-xs text-white/60">You ({localColor === 'red' ? 'Red' : 'Black'})</div>
          <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-sm">{'\u265A'}</div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="game-canvas-container" style={{ maxWidth: 800, aspectRatio: '800 / 800' }}>
        <div ref={canvasRef} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[800px] flex items-center justify-center gap-3 mt-3">
        {!isMultiplayer && (
          <button onClick={handleUndo} className="btn-secondary text-sm py-2 px-4" disabled={thinking || gameOver}>Undo</button>
        )}
        {isMultiplayer && !gameOver && (
          <button onClick={handleResign} className="text-sm py-2 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors">
            Resign
          </button>
        )}
        {!isMultiplayer && (
          <button onClick={handleNewGame} className="btn-secondary text-sm py-2 px-4">New Game</button>
        )}
      </motion.div>

      <GameOverModal
        isOpen={gameOver}
        won={playerWon ?? (state ? state.winner === localColor : false)}
        title={playerWon === true
          ? 'Opponent Resigned - You Win!'
          : playerWon === false
            ? 'You Resigned'
            : state ? (state.winner === localColor ? 'You Win!' : `${opponentName} Wins!`) : ''}
        gameId="checkers"
        stats={[
          { label: 'Your Pieces', value: (localColor === 'red' ? state?.redCount ?? 0 : state?.blackCount ?? 0).toString() },
          { label: `${opponentName} Pieces`, value: (remoteColor === 'red' ? state?.redCount ?? 0 : state?.blackCount ?? 0).toString() },
          ...(isMultiplayer ? [] : [{ label: 'Difficulty', value: difficulty }]),
        ]}
        onPlayAgain={isMultiplayer ? undefined : handleNewGame}
      />
    </div>
  );
}
