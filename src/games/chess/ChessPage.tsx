import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Application } from 'pixi.js';
import { Chess } from 'chess.js';
import { motion } from 'framer-motion';
import { ChessGame } from './ChessGame';
import { ChessRenderer } from './ChessRenderer';
import { getBestMove, evaluateBoard } from './ChessAI';
import { generateCommentary, getPersonalityComment } from './ChessCommentary';
import { reviewGame, GameReviewResult, QUALITY_COLORS_HEX } from './ChessReview';
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
import { useAuthStore } from '../../stores/authStore';
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
  const playerColor = useGameStore((s) => s.playerColor);
  const timeControl = useGameStore((s) => s.timeControl);
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
  const [hinting, setHinting] = useState(false);
  const [reviewEval, setReviewEval] = useState(0);
  const savedFenRef = useRef<string | null>(null);

  const commentaryEnabled = useSettingsStore((s) => s.chessCommentary);

  // ---- Chess clock state ----
  const initialTimeMs = timeControl ? timeControl.minutes * 60 * 1000 : 0;
  const incrementMs = timeControl ? timeControl.increment * 1000 : 0;
  const [whiteTime, setWhiteTime] = useState(initialTimeMs);
  const [blackTime, setBlackTime] = useState(initialTimeMs);
  const clockRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const gameStartedRef = useRef(false);

  // ---- Refs to hold latest values, accessible from PixiJS callbacks ----
  const thinkingRef = useRef(thinking);
  thinkingRef.current = thinking;

  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;

  const recordGameRef = useRef(recordGame);
  recordGameRef.current = recordGame;

  const whiteTimeRef = useRef(whiteTime);
  whiteTimeRef.current = whiteTime;
  const blackTimeRef = useRef(blackTime);
  blackTimeRef.current = blackTime;
  const gameOverRef = useRef(gameOver);
  gameOverRef.current = gameOver;
  const incrementMsRef = useRef(incrementMs);
  incrementMsRef.current = incrementMs;
  const timeControlRef = useRef(timeControl);
  timeControlRef.current = timeControl;

  const lastEvalRef = useRef(0);
  const adapterRef = useRef<MultiplayerGameAdapter | null>(null);

  // Determine display names based on mode
  const multiplayerOpponentName = useGameStore((s) => s.multiplayerOpponentName);
  const opponentName = isMultiplayer ? (multiplayerOpponentName || 'Opponent') : (selectedOpponent?.name ?? 'AI');
  const localColorLabel = isMultiplayer ? (playerColor === 'w' ? 'White' : 'Black') : 'White';
  const opponentColorLabel = isMultiplayer ? (playerColor === 'w' ? 'Black' : 'White') : 'Black';
  const isLocalTurn = state ? (isMultiplayer ? state.turn === playerColor : state.turn === 'w') : false;

  // ---- Clock helpers ----
  const stopClock = useCallback(() => {
    if (clockRef.current !== null) {
      cancelAnimationFrame(clockRef.current);
      clockRef.current = null;
    }
  }, []);

  const startClock = useCallback((turn: 'w' | 'b') => {
    if (!timeControl) return;
    stopClock();
    lastTickRef.current = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;
      if (turn === 'w') {
        setWhiteTime((prev) => Math.max(0, prev - dt));
      } else {
        setBlackTime((prev) => Math.max(0, prev - dt));
      }
      clockRef.current = requestAnimationFrame(tick);
    };
    clockRef.current = requestAnimationFrame(tick);
  }, [timeControl, stopClock]);

  const startClockRef = useRef(startClock);
  startClockRef.current = startClock;
  const stopClockRef = useRef(stopClock);
  stopClockRef.current = stopClock;

  // Timeout detection
  useEffect(() => {
    if (!timeControl || gameOverRef.current) return;
    const localColor = useGameStore.getState().playerColor;
    const mp = useGameStore.getState().isMultiplayer;

    if (whiteTime <= 0) {
      stopClock();
      setGameOver(true);
      const localWon = mp ? localColor !== 'w' : false;
      setPlayerWon(localWon);
      setResultText(localWon ? 'Time out! You Win!' : 'Time out! You Lose!');
      const moveCount = state?.moveHistory.length ?? 0;
      recordGameRef.current('chess', localWon, opponentName, `${localWon ? 'Won' : 'Lost'} on time after ${moveCount} moves`);
    } else if (blackTime <= 0) {
      stopClock();
      setGameOver(true);
      const localWon = mp ? localColor !== 'b' : true;
      setPlayerWon(localWon);
      setResultText(localWon ? 'Time out! You Win!' : 'Time out! You Lose!');
      const moveCount = state?.moveHistory.length ?? 0;
      recordGameRef.current('chess', localWon, opponentName, `${localWon ? 'Won' : 'Lost'} on time after ${moveCount} moves`);
    }
  }, [whiteTime, blackTime, timeControl, stopClock, opponentName, state?.moveHistory.length]);

  // Cleanup clock on unmount
  useEffect(() => {
    return () => stopClock();
  }, [stopClock]);

  // ---- Stable callbacks that read from refs, never change identity ----

  const handleGameOver = useCallback((s: ChessGameState) => {
    stopClockRef.current();
    setGameOver(true);
    const mp = useGameStore.getState().isMultiplayer;
    const localColor = useGameStore.getState().playerColor;
    const opName = mp ? (useGameStore.getState().multiplayerOpponentName || 'Opponent') : (useGameStore.getState().selectedOpponent?.name ?? 'AI');
    const moveCount = s.moveHistory.length;

    if (s.isCheckmate) {
      // The side whose turn it is has been checkmated (they lost)
      const localWon = s.turn !== localColor;
      setPlayerWon(localWon);
      setResultText(localWon ? 'Checkmate! You Win!' : 'Checkmate! You Lose!');
      recordGameRef.current('chess', localWon, opName, `Checkmate in ${moveCount} moves`);
      SoundManager.getInstance().play(localWon ? 'game-win' : 'game-lose');
      if (localWon) rendererRef.current?.showWin();
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
    const move = await getBestMove(game.getFEN(), difficultyRef.current, timeControlRef.current ? blackTimeRef.current : undefined);
    if (move) {
      // Capture piece info before making move for animation
      const board = game.getBoard();
      const { row, col } = { row: 8 - parseInt(move.from[1]), col: move.from.charCodeAt(0) - 97 };
      const piece = board[row]?.[col];

      const result = game.makeMove(move.from, move.to);
      const newState = game.getState();
      setState(newState);
      renderer.clearSelection();

      // Generate commentary for AI move (only in single player)
      const evalAfter = evaluateBoard(game.getChess());
      if (useSettingsStore.getState().chessCommentary && !useGameStore.getState().isMultiplayer) {
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
          } else if (timeControlRef.current) {
            setBlackTime((prev) => prev + incrementMsRef.current);
            startClockRef.current('w');
          }
        });
      } else {
        renderer.render(newState);
        if (newState.isGameOver) {
          handleGameOver(newState);
        } else if (timeControlRef.current) {
          setBlackTime((prev) => prev + incrementMsRef.current);
          startClockRef.current('w');
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

      const game = new ChessGame();
      game.initialize();
      gameRef.current = game;

      const renderer = new ChessRenderer(app, game);
      rendererRef.current = renderer;

      // Set up board orientation for multiplayer
      const storeState = useGameStore.getState();
      if (storeState.isMultiplayer && storeState.playerColor === 'b') {
        renderer.setFlipped(true);
        renderer.setPlayerColor('b');
      } else if (storeState.isMultiplayer) {
        renderer.setPlayerColor('w');
      }

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

          // Generate commentary for player move (only in single player)
          const evalAfter = evaluateBoard(game.getChess());
          if (useSettingsStore.getState().chessCommentary && !useGameStore.getState().isMultiplayer) {
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
              } else {
                if (timeControlRef.current) {
                  const localCol = useGameStore.getState().playerColor;
                  if (localCol === 'w') {
                    setWhiteTime((prev) => prev + incrementMsRef.current);
                    startClockRef.current('b');
                  } else {
                    setBlackTime((prev) => prev + incrementMsRef.current);
                    startClockRef.current('w');
                  }
                  gameStartedRef.current = true;
                }
                if (!adapterRef.current) {
                  doAIMove(game, renderer);
                }
              }
            });
          } else {
            renderer.render(newState);
            if (newState.isGameOver) {
              handleGameOver(newState);
            } else {
              if (timeControlRef.current) {
                const localCol = useGameStore.getState().playerColor;
                if (localCol === 'w') {
                  setWhiteTime((prev) => prev + incrementMsRef.current);
                  startClockRef.current('b');
                } else {
                  setBlackTime((prev) => prev + incrementMsRef.current);
                  startClockRef.current('w');
                }
                gameStartedRef.current = true;
              }
              if (!adapterRef.current) {
                doAIMove(game, renderer);
              }
            }
          }
        }
      });

      // Set up multiplayer adapter if in multiplayer mode
      if (storeState.isMultiplayer) {
        const adapter = new MultiplayerGameAdapter('chess');
        adapterRef.current = adapter;
        adapter.connect((moveData: any) => {
          // Handle name exchange
          if (moveData.type === 'player-info') {
            useGameStore.getState().setMultiplayerOpponentName(moveData.name || 'Opponent');
            return;
          }
          // Handle resign
          if (moveData.type === 'resign') {
            stopClockRef.current();
            setGameOver(true);
            setPlayerWon(true);
            setResultText('Opponent resigned - You win!');
            SoundManager.getInstance().play('game-win');
            recordGameRef.current('chess', true, useGameStore.getState().multiplayerOpponentName || 'Opponent');
            return;
          }

          const board = game.getBoard();
          const { row, col } = { row: 8 - parseInt(moveData.from[1]), col: moveData.from.charCodeAt(0) - 97 };
          const piece = board[row]?.[col];

          const result = game.makeMove(moveData.from as Square, moveData.to as Square);
          if (result) {
            const newState = game.getState();
            setState(newState);
            renderer.clearSelection();

            if (piece) {
              renderer.animateMove(moveData.from as Square, moveData.to as Square, piece.type, piece.color, () => {
                renderer.render(newState);
                SoundManager.getInstance().play(getMoveSound(result, newState));
                if (newState.isGameOver) {
                  handleGameOver(newState);
                } else if (timeControlRef.current) {
                  // Opponent just moved, start local player's clock
                  const localCol = useGameStore.getState().playerColor;
                  if (localCol === 'w') {
                    setBlackTime((prev) => prev + incrementMsRef.current);
                    startClockRef.current('w');
                  } else {
                    setWhiteTime((prev) => prev + incrementMsRef.current);
                    startClockRef.current('b');
                  }
                }
              });
            } else {
              renderer.render(newState);
              SoundManager.getInstance().play(getMoveSound(result, newState));
              if (newState.isGameOver) {
                handleGameOver(newState);
              }
            }
          }
        });

        // Announce our name to the opponent
        const profile = useAuthStore.getState().profile;
        const myName = profile?.display_name || 'Player';
        setTimeout(() => adapter.sendMove({ type: 'player-info', name: myName }), 300);
      }

      const initialState = game.getState();
      setState(initialState);
      renderer.render(initialState);
    };

    init();

    return () => {
      destroyed = true;
      adapterRef.current?.disconnect();
      rendererRef.current?.destroy();
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
      if (canvasRef.current) {
        canvasRef.current.textContent = '';
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHint = async () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer || thinking || hinting) return;
    if (!isLocalTurn || state?.isGameOver) return;

    setHinting(true);
    // Always use 'medium' (depth 3) for hints — fast enough for a suggestion
    const hintPromise = getBestMove(game.getFEN(), 'medium');
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    const hint = await Promise.race([hintPromise, timeoutPromise]);
    setHinting(false);

    if (hint && renderer) {
      renderer.render(game.getState());
      renderer.showHint(hint.from, hint.to);
    }
  };

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

  const handleResign = () => {
    if (!isMultiplayer || gameOver) return;
    stopClock();
    adapterRef.current?.sendMove({ type: 'resign' });
    setGameOver(true);
    setPlayerWon(false);
    setResultText('You resigned');
    SoundManager.getInstance().play('game-lose');
    recordGameRef.current('chess', false, multiplayerOpponentName || 'Opponent');
  };

  const handleNewGame = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;
    stopClock();
    setGameOver(false);
    setThinking(false);
    setCommentary(null);
    setReviewMode(false);
    setReviewResult(null);
    if (timeControl) {
      setWhiteTime(timeControl.minutes * 60 * 1000);
      setBlackTime(timeControl.minutes * 60 * 1000);
      gameStartedRef.current = false;
    }
    game.initialize();
    const newState = game.getState();
    setState(newState);
    renderer.clearSelection();
    renderer.clearArrows();
    renderer.render(newState);
  };

  const handleReviewGame = () => {
    if (!state || state.moveHistory.length === 0) return;
    const game = gameRef.current;
    if (!game) return;

    // Save current position so we can restore on exit
    savedFenRef.current = game.getFEN();

    const result = reviewGame(state.moveHistory);
    setReviewResult(result);
    setReviewMode(true);
    const lastIdx = result.moves.length - 1;
    setReviewMoveIndex(lastIdx);
    setReviewEval(result.moves[lastIdx]?.evalAfter ?? 0);
    setGameOver(false);
  };

  const handleReviewSelectMove = (index: number) => {
    setReviewMoveIndex(index);
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer || !reviewResult) return;

    const chess = game.getChess();
    chess.reset();
    for (let i = 0; i <= index; i++) {
      chess.move(reviewResult.moves[i].move.san);
    }
    const replayState = game.getState();
    setState(replayState);
    renderer.clearSelection();
    renderer.render(replayState);

    // Show quality-colored highlight on the move
    const rm = reviewResult.moves[index];
    renderer.showReviewMove(
      rm.move.from as Square,
      rm.move.to as Square,
      QUALITY_COLORS_HEX[rm.quality]
    );
    setReviewEval(rm.evalAfter);
  };

  const handleExitReview = () => {
    setReviewMode(false);
    setReviewResult(null);
    setReviewEval(0);
    setGameOver(true); // Restore game-over state (review only available after game ends)
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;

    // Restore to the saved position
    if (savedFenRef.current) {
      game.getChess().load(savedFenRef.current);
      savedFenRef.current = null;
    }
    const restoredState = game.getState();
    setState(restoredState);
    renderer.clearSelection();
    renderer.render(restoredState);
  };

  const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

  const capturedPieceSymbols = (pieces: PieceSymbol[], color: 'w' | 'b'): string => {
    const symbols: Record<string, Record<string, string>> = {
      w: { p: '\u2659', n: '\u2658', b: '\u2657', r: '\u2656', q: '\u2655' },
      b: { p: '\u265F', n: '\u265E', b: '\u265D', r: '\u265C', q: '\u265B' },
    };
    // Sort by value (descending) for nicer display
    const sorted = [...pieces].sort((a, b) => (PIECE_VALUES[b] ?? 0) - (PIECE_VALUES[a] ?? 0));
    return sorted.map((p) => symbols[color][p] ?? '').join('');
  };

  const materialValue = (pieces: PieceSymbol[]): number =>
    pieces.reduce((sum, p) => sum + (PIECE_VALUES[p] ?? 0), 0);

  const formatTime = (ms: number): string => {
    if (ms <= 0) return '0:00.0';
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (totalSeconds < 10) {
      return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
    }
    return `${minutes}:${Math.floor(seconds).toString().padStart(2, '0')}`;
  };

  const getClockStyle = (timeMs: number, isActive: boolean): string => {
    if (timeMs <= 0) return 'bg-red-500/30 text-red-500 border-red-500';
    if (timeMs < 30000 && isActive) return 'bg-red-500/20 text-red-400 border-red-500 animate-pulse';
    if (isActive) return 'bg-amber-500/20 text-amber-400 border-amber-500';
    return 'bg-white/5 text-white/30 border-white/10';
  };

  // Determine which color is "top" (opponent) and "bottom" (local player)
  const topColor: 'w' | 'b' = isMultiplayer ? (playerColor === 'w' ? 'b' : 'w') : 'b';
  const bottomColor: 'w' | 'b' = isMultiplayer ? playerColor : 'w';
  const topTime = topColor === 'w' ? whiteTime : blackTime;
  const bottomTime = bottomColor === 'w' ? whiteTime : blackTime;
  // "Top captured" = pieces captured BY the top player (opponent's lost pieces)
  const topCaptured = topColor === 'w' ? state?.capturedBlack : state?.capturedWhite;
  const bottomCaptured = bottomColor === 'w' ? state?.capturedBlack : state?.capturedWhite;
  const topCapturedColor: 'w' | 'b' = topColor === 'w' ? 'b' : 'w';
  const bottomCapturedColor: 'w' | 'b' = bottomColor === 'w' ? 'b' : 'w';

  // Material advantage: positive means that player is up
  const topMaterial = materialValue(topCaptured ?? []);
  const bottomMaterial = materialValue(bottomCaptured ?? []);
  const topAdv = topMaterial - bottomMaterial;
  const bottomAdv = bottomMaterial - topMaterial;

  const userName = useAuthStore.getState().profile?.display_name || 'You';

  return (
    <div className="min-h-screen flex flex-col items-center py-4 px-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[1080px] flex items-center justify-between mb-3"
      >
        <button
          onClick={() => {
            if (isMultiplayer && !gameOver) {
              if (!window.confirm('Leaving will count as a resignation. Are you sure?')) return;
              adapterRef.current?.sendMove({ type: 'resign' });
            }
            navigate('/lobby/chess');
          }}
          className="text-sm text-white/50 hover:text-white/80 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg"
        >
          {'\u2190'} Back
        </button>
        <h2 className="text-lg font-display font-bold text-white">Chess</h2>
        <div className="flex items-center gap-3 text-sm">
          {thinking && !isMultiplayer && (
            <span className="text-amber-400 animate-pulse">
              {selectedOpponent ? `${selectedOpponent.avatar} ${selectedOpponent.name} thinking...` : 'AI thinking...'}
            </span>
          )}
          <span className="text-white/60">
            {isLocalTurn ? 'Your turn' : `${opponentName}'s turn`}
          </span>
        </div>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="flex flex-col gap-0">
          {/* Top player bar = opponent */}
          <div className="flex items-center gap-2 mb-1 px-1">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm">
              {isMultiplayer ? '\u{1F464}' : (selectedOpponent?.avatar ?? '\u{1F916}')}
            </div>
            <div className="text-xs text-white/60 font-medium">{opponentName}</div>
            <div className="text-xs text-white/30">({opponentColorLabel})</div>
            <div className="text-sm h-5 flex items-center gap-0.5">
              <span className="tracking-tight">{state ? capturedPieceSymbols(topCaptured ?? [], topCapturedColor) : ''}</span>
              {topAdv > 0 && <span className="text-xs text-white/40 ml-1">+{topAdv}</span>}
            </div>
            {timeControl && (
              <div className={`ml-auto px-3 py-0.5 rounded border font-mono text-sm tabular-nums ${getClockStyle(topTime, state?.turn === topColor && !gameOver)}`}>
                {formatTime(topTime)}
              </div>
            )}
          </div>

          <div className="flex gap-1 items-stretch">
          {/* Vertical eval bar - visible during review */}
          {reviewMode && (
            <div className="w-6 rounded-lg overflow-hidden flex flex-col self-stretch">
              {(() => {
                // Clamp eval to a reasonable display range (-1000 to 1000 centipawns)
                const clampedEval = Math.max(-1000, Math.min(1000, reviewEval));
                const blackPercent = Math.max(3, Math.min(97, 50 - (clampedEval / 1000) * 50));
                const evalDisplay = reviewEval >= 0
                  ? `+${(reviewEval / 100).toFixed(1)}`
                  : (reviewEval / 100).toFixed(1);
                return (
                  <>
                    <div
                      className="bg-gray-700 transition-all duration-300 relative flex items-center justify-center"
                      style={{ height: `${blackPercent}%` }}
                    >
                      {blackPercent > 15 && (
                        <span className="text-[9px] font-mono text-white/60 rotate-0">
                          {reviewEval < 0 ? evalDisplay : ''}
                        </span>
                      )}
                    </div>
                    <div
                      className="bg-white transition-all duration-300 relative flex items-center justify-center"
                      style={{ height: `${100 - blackPercent}%` }}
                    >
                      {(100 - blackPercent) > 15 && (
                        <span className="text-[9px] font-mono text-gray-700 rotate-0">
                          {reviewEval >= 0 ? evalDisplay : ''}
                        </span>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="game-canvas-container"
            style={{ maxWidth: 800, aspectRatio: '1 / 1' }}
          >
            <div ref={canvasRef} />
          </motion.div>
        </div>

          {/* Bottom player bar = you */}
          <div className="flex items-center gap-2 mt-1 px-1">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-sm">
              {'\u265A'}
            </div>
            <div className="text-xs text-white/80 font-medium">{userName}</div>
            <div className="text-xs text-white/30">({localColorLabel})</div>
            <div className="text-sm h-5 flex items-center gap-0.5">
              <span className="tracking-tight">{state ? capturedPieceSymbols(bottomCaptured ?? [], bottomCapturedColor) : ''}</span>
              {bottomAdv > 0 && <span className="text-xs text-white/40 ml-1">+{bottomAdv}</span>}
            </div>
            {timeControl && (
              <div className={`ml-auto px-3 py-0.5 rounded border font-mono text-sm tabular-nums ${getClockStyle(bottomTime, state?.turn === bottomColor && !gameOver)}`}>
                {formatTime(bottomTime)}
              </div>
            )}
          </div>
        </div>

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
              {commentaryEnabled && !isMultiplayer && (
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
        className="w-full max-w-[800px] flex items-center justify-center gap-3 mt-3"
      >
        {!isMultiplayer && (
          <button onClick={handleUndo} className="btn-secondary text-sm py-2 px-4" disabled={thinking || gameOver}>
            Undo
          </button>
        )}
        {!isMultiplayer && (
          <button onClick={handleHint} className="btn-secondary text-sm py-2 px-4" disabled={thinking || hinting || !isLocalTurn || gameOver}>
            {hinting ? 'Thinking...' : 'Hint'}
          </button>
        )}
        {isMultiplayer && !gameOver && (
          <button onClick={handleResign} className="text-sm py-2 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors">
            Resign
          </button>
        )}
        {!isMultiplayer && (
          <button onClick={handleNewGame} className="btn-secondary text-sm py-2 px-4">
            New Game
          </button>
        )}
      </motion.div>

      <GameOverModal
        isOpen={gameOver}
        won={playerWon}
        title={resultText}
        gameId="chess"
        stats={[
          { label: 'Moves', value: (state?.moveHistory.length ?? 0).toString() },
          ...(isMultiplayer ? [] : [{ label: 'Difficulty', value: difficulty }]),
          ...(timeControl ? [{ label: 'Time', value: `${timeControl.minutes}+${timeControl.increment}` }] : []),
        ]}
        onPlayAgain={isMultiplayer ? undefined : handleNewGame}
        extraButton={
          <button onClick={handleReviewGame} className="btn-secondary flex-1">
            Review Game
          </button>
        }
      />
    </div>
  );
}
