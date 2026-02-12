import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Application } from 'pixi.js';
import { motion } from 'framer-motion';
import { BattleshipGame } from './BattleshipGame';
import { BattleshipRenderer } from './BattleshipRenderer';
import { BattleshipState, GameMode, WeaponType, WEAPON_DEFS } from './rules';
import { getAIShot, processResult, resetAI } from './BattleshipAI';
import { useGameStore } from '../../stores/gameStore';
import { useUserStore } from '../../stores/userStore';
import { SoundManager } from '../../engine/SoundManager';
import { useAuthStore } from '../../stores/authStore';
import { MultiplayerGameAdapter } from '../../lib/multiplayerGameAdapter';
import GameOverModal from '../../ui/GameOverModal';

const CANVAS_W = 960;
const CANVAS_H = 520;

export default function BattleshipPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const gameRef = useRef<BattleshipGame | null>(null);
  const rendererRef = useRef<BattleshipRenderer | null>(null);
  const adapterRef = useRef<MultiplayerGameAdapter | null>(null);
  const navigate = useNavigate();

  const difficulty = useGameStore((s) => s.difficulty);
  const isMultiplayer = useGameStore((s) => s.isMultiplayer);
  const playerColor = useGameStore((s) => s.playerColor);
  const recordGame = useUserStore((s) => s.recordGame);

  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;
  const recordGameRef = useRef(recordGame);
  recordGameRef.current = recordGame;

  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [state, setState] = useState<BattleshipState | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [playerWon, setPlayerWon] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const [appReady, setAppReady] = useState(false);

  // Multiplayer state
  const [opponentReady, setOpponentReady] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const [waitingForMode, setWaitingForMode] = useState(false);
  const opponentReadyRef = useRef(false);
  const localReadyRef = useRef(false);

  const isHost = playerColor === 'w';
  const multiplayerOpponentName = useGameStore((s) => s.multiplayerOpponentName);
  const opponentName = isMultiplayer ? (multiplayerOpponentName || 'Opponent') : (useGameStore.getState().selectedOpponent?.name ?? 'AI');

  // ─── AI turn ─────────────────────────────────────────────────────────

  const doAITurn = useCallback(async (game: BattleshipGame, renderer: BattleshipRenderer) => {
    await new Promise((r) => setTimeout(r, 500));

    const currentState = game.getState();
    if (currentState.phase !== 'playing' || currentState.currentPlayer !== 'ai') return;

    let result: ReturnType<typeof game.aiFire>;
    let shot: ReturnType<typeof getAIShot>;
    let retries = 0;
    do {
      const playerBoard = game.getPlayerBoard();
      shot = getAIShot(playerBoard, difficultyRef.current);
      result = game.aiFire(shot.row, shot.col);
      retries++;
    } while (result === 'already-shot' && retries < 100);

    if (result === 'already-shot') return;

    processResult(shot.row, shot.col, result, currentState.gridSize);
    const isHit = result === 'hit' || result === 'sunk';

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

  // ─── Handle multiplayer messages ────────────────────────────────────

  const handleRemoteMessage = useCallback((data: any) => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;

    if (data.type === 'player-info') {
      useGameStore.getState().setMultiplayerOpponentName(data.name || 'Opponent');
      return;
    } else if (data.type === 'resign') {
      setPlayerWon(true);
      setGameOver(true);
      recordGameRef.current('battleship', true, useGameStore.getState().multiplayerOpponentName || 'Opponent');
      SoundManager.getInstance().play('game-win');
      return;
    } else if (data.type === 'mode') {
      // Joiner receives mode from host
      setSelectedMode(data.mode as GameMode);
    } else if (data.type === 'ready') {
      // Opponent finished placing ships
      opponentReadyRef.current = true;
      setOpponentReady(true);
      // If we're also ready, both start playing
      if (localReadyRef.current) {
        setMessage(isHost ? 'Your turn - fire!' : "Opponent's turn...");
        // Host goes first
        if (isHost) {
          game.setCurrentPlayer('player');
        } else {
          game.switchToOpponent();
        }
        game.startPlaying();
        const s = game.getState();
        setState({ ...s });
        renderer.render(s);
      } else {
        setMessage('Opponent is ready! Finish placing your ships.');
      }
    } else if (data.type === 'fire') {
      // Opponent fires at our board
      const result = game.applyRemoteShot(data.row, data.col);
      if (result === 'already-shot') return;

      const isHit = result === 'hit' || result === 'sunk';
      const allSunk = game.getState().phase === 'finished';

      // Send result back
      adapterRef.current?.sendMove({
        type: 'result',
        row: data.row,
        col: data.col,
        result,
        allSunk,
      });

      // Show animation on our board
      renderer.playAttackAnimation(data.row, data.col, 'player', isHit, () => {
        if (result === 'hit') { setMessage(`Opponent hit at ${String.fromCharCode(65 + data.col)}${data.row + 1}!`); SoundManager.getInstance().play('explosion'); }
        else if (result === 'sunk') { setMessage(`Opponent sank your ship!`); SoundManager.getInstance().play('explosion'); }
        else { setMessage(`Opponent missed! Your turn.`); SoundManager.getInstance().play('splash'); }

        const newState = game.getState();
        setState({ ...newState });
        renderer.render(newState);

        if (allSunk) {
          setGameOver(true);
          SoundManager.getInstance().play('game-lose');
          recordGameRef.current('battleship', false, opponentName);
        }
      });
    } else if (data.type === 'result') {
      // Result of our shot on opponent's board
      game.applyRemoteResult(data.row, data.col, data.result);
      const isHit = data.result === 'hit' || data.result === 'sunk';

      renderer.playAttackAnimation(data.row, data.col, 'ai', isHit, () => {
        if (data.result === 'sunk') { setMessage('You sank a ship!'); SoundManager.getInstance().play('explosion'); }
        else if (data.result === 'hit') { setMessage('Hit!'); SoundManager.getInstance().play('explosion'); }
        else { setMessage('Miss. Opponent\'s turn...'); SoundManager.getInstance().play('splash'); }

        if (data.allSunk) {
          game.setPlayerWins();
          setGameOver(true);
          SoundManager.getInstance().play('game-win');
          recordGameRef.current('battleship', true, opponentName);
        } else {
          // Switch to opponent's turn
          game.switchToOpponent();
        }

        const newState = game.getState();
        setState({ ...newState });
        renderer.render(newState);
      });
    }
  }, [isHost]);

  // ─── Initialize PixiJS (once on mount) ────────────────────────────────

  useEffect(() => {
    if (!canvasRef.current) return;
    let destroyed = false;

    const init = async () => {
      const app = new Application();
      await app.init({
        width: CANVAS_W,
        height: CANVAS_H,
        backgroundColor: 0x0a3d5c,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      if (destroyed) { app.destroy(); return; }

      canvasRef.current!.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      const storeState = useGameStore.getState();
      const mp = storeState.isMultiplayer;

      const game = new BattleshipGame();
      game.setMultiplayer(mp);
      gameRef.current = game;

      const renderer = new BattleshipRenderer(app);
      rendererRef.current = renderer;

      // ── Wire callbacks ──

      renderer.onShipPlace = (name, row, col, horizontal) => {
        if (game.placeSpecificShip(name, row, col, horizontal)) {
          const newState = game.getState();
          setState({ ...newState });
          SoundManager.getInstance().play('place');
          if (newState.playerShipsToPlace.length > 0) {
            setMessage(`Drag your ${newState.playerShipsToPlace[0].name} to the grid`);
          } else {
            if (mp) {
              setMessage('All ships placed! Waiting for opponent...');
            } else {
              setMessage('All ships placed! Fire at will!');
            }
          }
          renderer.render(newState);
        }
      };

      renderer.setOnCellClick((row, col, board) => {
        const s = game.getState();

        if (s.phase === 'placement' && board === 'player') {
          if (game.placePlayerShip(row, col)) {
            const newState = game.getState();
            setState({ ...newState });
            SoundManager.getInstance().play('place');
            if (newState.playerShipsToPlace.length > 0) {
              setMessage(`Place your ${newState.playerShipsToPlace[0].name} (${newState.playerShipsToPlace[0].size} cells)`);
            } else {
              if (mp) {
                setMessage('All ships placed! Waiting for opponent...');
              } else {
                setMessage('All ships placed! Fire at will!');
              }
            }
            renderer.render(newState);
          }
        } else if (s.phase === 'playing' && board === 'ai' && s.currentPlayer === 'player') {
          if (mp) {
            // Multiplayer: send fire command, don't process locally
            const cellState = s.aiBoard.grid[row][col];
            if (cellState === 'hit' || cellState === 'miss') return; // already shot
            adapterRef.current?.sendMove({ type: 'fire', row, col });
            // Disable further clicks until result comes back
            game.switchToOpponent();
            setMessage('Waiting for result...');
            const ns = game.getState();
            setState({ ...ns });
          } else {
            // AI mode: use weapon system
            const results = game.playerFireWeapon(row, col);
            if (!results) return;

            const actualResults = results.filter(r => r.result !== 'already-shot');
            if (actualResults.length === 0) return;

            const hasHit = actualResults.some(r => r.result === 'hit' || r.result === 'sunk');
            const hasSunk = actualResults.some(r => r.result === 'sunk');

            const targets = actualResults.map(r => ({
              row: r.row,
              col: r.col,
              isHit: r.result === 'hit' || r.result === 'sunk',
            }));

            const animFn = targets.length === 1
              ? () => renderer.playAttackAnimation(targets[0].row, targets[0].col, 'ai', targets[0].isHit, afterAnim)
              : () => renderer.playMultiAttackAnimation(targets, 'ai', afterAnim);

            function afterAnim() {
              if (hasSunk) { setMessage('You sank a ship!'); SoundManager.getInstance().play('explosion'); }
              else if (hasHit) { setMessage(`Hit!`); SoundManager.getInstance().play('explosion'); }
              else { setMessage(`Miss`); SoundManager.getInstance().play('splash'); }

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
            }

            animFn();
          }
        }
      });

      // Hover: use lightweight preview methods (no full re-render)
      renderer.setOnCellHover((row, col, board) => {
        const s = game.getState();
        if (s.phase === 'placement' && board === 'player' && s.playerShipsToPlace.length > 0 && !renderer.isDragging) {
          const ship = s.playerShipsToPlace[0];
          const horizontal = s.placementOrientation === 'horizontal';
          const valid = game.canPlaceAt(row, col);
          renderer.showPlacementPreview(row, col, ship.size, horizontal, valid);
        } else if (s.phase === 'playing' && board === 'ai' && s.currentPlayer === 'player') {
          const weapon = WEAPON_DEFS[s.selectedWeapon];
          if (weapon.pattern.length > 1) {
            renderer.showWeaponPreview(row, col, weapon);
          }
        }
      });

      renderer.setOnCellHoverOut(() => {
        renderer.clearPreview();
      });

      // Set up multiplayer adapter
      if (mp) {
        const adapter = new MultiplayerGameAdapter('battleship');
        adapterRef.current = adapter;
        // handleRemoteMessage ref is captured here but uses refs internally
        adapter.connect((moveData: any) => {
          handleRemoteMessageRef.current?.(moveData);
        });

        // Announce our name
        const profile = useAuthStore.getState().profile;
        const myName = profile?.display_name || 'Player';
        setTimeout(() => adapter.sendMove({ type: 'player-info', name: myName }), 300);

        // If joiner, show waiting for mode
        if (storeState.playerColor !== 'w') {
          setWaitingForMode(true);
          setMessage('Waiting for host to choose game mode...');
        }
      }

      setAppReady(true);
    };

    init();
    return () => {
      destroyed = true;
      adapterRef.current?.disconnect();
      rendererRef.current?.destroy();
      if (appRef.current) { appRef.current.destroy(true); appRef.current = null; }
    };
  }, [doAITurn]);

  // Ref for handleRemoteMessage so the adapter callback always gets latest
  const handleRemoteMessageRef = useRef(handleRemoteMessage);
  handleRemoteMessageRef.current = handleRemoteMessage;

  // ─── Start game when mode selected ───────────────────────────────────

  useEffect(() => {
    if (!appReady || !selectedMode) return;
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;

    if (isMultiplayer) {
      game.initializeMultiplayer(selectedMode);
      // If host, broadcast mode to joiner
      if (isHost) {
        adapterRef.current?.sendMove({ type: 'mode', mode: selectedMode });
      }
      setWaitingForMode(false);
    } else {
      game.initialize(selectedMode);
      resetAI();
    }
    const s = game.getState();
    setState({ ...s });
    setMessage(s.playerShipsToPlace.length > 0 ? `Drag your ${s.playerShipsToPlace[0].name} to the grid` : '');
    renderer.render(s);
  }, [appReady, selectedMode, isMultiplayer, isHost]);

  // ─── Multiplayer: signal ready when all ships placed ───────────────

  const handleReady = () => {
    if (!isMultiplayer) return;
    localReadyRef.current = true;
    setLocalReady(true);
    adapterRef.current?.sendMove({ type: 'ready' });

    if (opponentReadyRef.current) {
      // Both ready, start game
      const game = gameRef.current;
      const renderer = rendererRef.current;
      if (!game || !renderer) return;
      setMessage(isHost ? 'Your turn - fire!' : "Opponent's turn...");
      if (isHost) {
        game.setCurrentPlayer('player');
      } else {
        game.switchToOpponent();
      }
      game.startPlaying();
      const s = game.getState();
      setState({ ...s });
      renderer.render(s);
    } else {
      setMessage('Waiting for opponent to place ships...');
    }
  };

  // ─── Keyboard handler ────────────────────────────────────────────────

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        const renderer = rendererRef.current;
        const game = gameRef.current;
        if (!game || !renderer) return;
        const s = game.getState();
        if (s.phase !== 'placement') return;

        if (renderer.isDragging) {
          renderer.rotateDrag();
        } else {
          game.toggleOrientation();
          const ns = game.getState();
          setState({ ...ns });
          const dir = ns.placementOrientation === 'horizontal' ? 'Horizontal' : 'Vertical';
          setMessage(`Orientation: ${dir} \u2022 Press R to rotate`);
          renderer.render(ns);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // ─── Actions ─────────────────────────────────────────────────────────

  const handleRandomPlace = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;
    game.randomPlaceAll();
    const s = game.getState();
    setState({ ...s });
    if (isMultiplayer) {
      setMessage('Ships placed randomly! Click Ready when done.');
    } else {
      setMessage('Ships placed randomly! Fire at will!');
    }
    renderer.render(s);
  };

  const handleUndo = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;
    if (game.undoLastShip()) {
      const s = game.getState();
      setState({ ...s });
      setMessage(`Place your ${s.playerShipsToPlace[s.playerShipsToPlace.length - 1].name}`);
      renderer.render(s);
    }
  };

  const handleResetPlacement = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;
    game.resetPlacement();
    const s = game.getState();
    setState({ ...s });
    setMessage('Drag ships to your grid');
    renderer.render(s);
  };

  const handleRotate = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;

    if (renderer.isDragging) {
      renderer.rotateDrag();
    } else {
      game.toggleOrientation();
      const s = game.getState();
      setState({ ...s });
      const dir = s.placementOrientation === 'horizontal' ? 'Horizontal' : 'Vertical';
      setMessage(`Orientation: ${dir} \u2022 Press R to rotate`);
      renderer.render(s);
    }
  };

  const handleResign = () => {
    if (!isMultiplayer || gameOver) return;
    adapterRef.current?.sendMove({ type: 'resign' });
    setPlayerWon(false);
    setGameOver(true);
    SoundManager.getInstance().play('game-lose');
    recordGameRef.current('battleship', false, opponentName);
  };

  const handleNewGame = () => {
    setGameOver(false);
    setSelectedMode(null);
    setState(null);
    setMessage('');
    setOpponentReady(false);
    setLocalReady(false);
    opponentReadyRef.current = false;
    localReadyRef.current = false;
  };

  const handleSelectWeapon = (weapon: WeaponType) => {
    const game = gameRef.current;
    if (!game) return;
    game.selectWeapon(weapon);
    const s = game.getState();
    setState({ ...s });
  };

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
  };

  const getStatusText = () => {
    if (!state) return '';
    if (state.phase === 'placement') return 'Place Ships';
    if (state.phase === 'finished') return state.winner === 'player' ? 'You Win!' : 'You Lose!';
    if (isMultiplayer) {
      return state.currentPlayer === 'player' ? 'Your Turn' : "Opponent's Turn...";
    }
    return state.currentPlayer === 'player' ? 'Your Turn' : 'AI Firing...';
  };

  const shipsPlaced = state?.playerShipsToPlace.length === 0 && state?.phase === 'placement';

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center py-4 px-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[960px] flex items-center justify-between mb-3">
        <button onClick={() => {
          if (isMultiplayer && !gameOver) {
            if (!window.confirm('Leaving will count as a resignation. Are you sure?')) return;
            adapterRef.current?.sendMove({ type: 'resign' });
          }
          navigate('/lobby/battleship');
        }} className="text-sm text-white/50 hover:text-white/80 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg">{'\u2190'} Back</button>
        <h2 className="text-lg font-display font-bold text-white">Sea Battle{selectedMode === 'advanced' ? ' Advanced' : ''}</h2>
        <span className="text-sm text-white/60">{getStatusText()}</span>
      </motion.div>

      {/* Player info bar (multiplayer or AI) */}
      {selectedMode && (
        <div className="w-full max-w-[960px] flex justify-between items-center mb-2 px-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm">
              {isMultiplayer ? '\u{1F464}' : (useGameStore.getState().selectedOpponent?.avatar ?? '\u{1F916}')}
            </div>
            <div className="text-xs text-white/60">{opponentName}</div>
            {state && (
              <div className="text-xs text-white/40 ml-1">
                Ships: {state.aiBoard.ships.filter(s => s.sunk).length} sunk
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {state && (
              <div className="text-xs text-white/40 mr-1">
                Ships: {state.playerBoard.ships.filter(s => s.sunk).length} lost
              </div>
            )}
            <div className="text-xs text-white/60">You</div>
            <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-sm">{'\u265A'}</div>
          </div>
        </div>
      )}

      {/* Mode selector */}
      {!selectedMode && !waitingForMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6 py-12"
        >
          <h3 className="text-xl font-display font-bold text-white">Choose Mode</h3>
          <div className="flex gap-4">
            <button
              onClick={() => handleModeSelect('classic')}
              className="w-56 p-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/50 transition-all text-left group"
            >
              <div className="text-3xl mb-2">{'\u2693'}</div>
              <div className="text-white font-bold text-lg">Classic</div>
              <div className="text-white/50 text-sm mt-1">10x10 grid</div>
              <div className="text-white/40 text-xs mt-1">5 ships, standard shots</div>
            </button>
            <button
              onClick={() => handleModeSelect('advanced')}
              className="w-56 p-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/50 transition-all text-left group"
            >
              <div className="text-3xl mb-2">{'\u{1F680}'}</div>
              <div className="text-white font-bold text-lg">Advanced</div>
              <div className="text-white/50 text-sm mt-1">12x12 grid</div>
              <div className="text-white/40 text-xs mt-1">6 ships + special weapons</div>
            </button>
          </div>
        </motion.div>
      )}

      {/* Waiting for mode (joiner) */}
      {waitingForMode && !selectedMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 py-16"
        >
          <div className="text-4xl animate-pulse">{'\u2693'}</div>
          <h3 className="text-xl font-display font-bold text-white">Waiting for host...</h3>
          <p className="text-white/50 text-sm">Host is choosing the game mode</p>
        </motion.div>
      )}

      {message && selectedMode && <div className="w-full max-w-[960px] text-center text-sm text-amber-400 mb-2">{message}</div>}

      {/* Canvas */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: selectedMode ? 1 : 0 }}
        className="game-canvas-container"
        style={{ maxWidth: CANVAS_W, aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, display: selectedMode ? 'block' : 'none' }}
      >
        <div ref={canvasRef} />
      </motion.div>

      {/* Controls */}
      {selectedMode && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[960px] flex flex-col items-center gap-3 mt-3">
          {/* Placement controls */}
          {state?.phase === 'placement' && (
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button onClick={handleRotate} className="btn-primary text-sm py-2 px-4">
                {'\u21BB'} Rotate ({state.placementOrientation === 'horizontal' ? 'H' : 'V'})
              </button>
              <button onClick={handleRandomPlace} className="btn-secondary text-sm py-2 px-4">Random</button>
              {state.playerBoard.ships.length > 0 && (
                <button onClick={handleUndo} className="btn-secondary text-sm py-2 px-4">{'\u21A9'} Undo</button>
              )}
              {state.playerBoard.ships.length > 0 && (
                <button onClick={handleResetPlacement} className="btn-secondary text-sm py-2 px-4">Reset</button>
              )}
              {/* Multiplayer ready button */}
              {isMultiplayer && shipsPlaced && !localReady && (
                <button onClick={handleReady} className="btn-primary text-sm py-2 px-4 animate-pulse">
                  Ready!
                </button>
              )}
              {isMultiplayer && localReady && !opponentReady && (
                <span className="text-xs text-amber-400 animate-pulse">Waiting for opponent...</span>
              )}
            </div>
          )}

          {/* Weapon selector (advanced mode, playing phase, not multiplayer) */}
          {state?.phase === 'playing' && state.mode === 'advanced' && state.currentPlayer === 'player' && !isMultiplayer && (
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="text-xs text-white/40 mr-1">Weapons:</span>
              {(['standard', 'torpedo', 'depth-charge', 'airstrike'] as WeaponType[]).map((wt) => {
                const def = WEAPON_DEFS[wt];
                const count = wt === 'standard' ? -1 : state.playerWeapons[wt];
                const selected = state.selectedWeapon === wt;
                const disabled = wt !== 'standard' && count <= 0;

                return (
                  <button
                    key={wt}
                    onClick={() => !disabled && handleSelectWeapon(wt)}
                    disabled={disabled}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${selected ? 'bg-amber-500/30 border-amber-400/60 text-amber-300' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}
                      ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                      border
                    `}
                    title={def.description}
                  >
                    {def.icon} {def.name}
                    {count > 0 && <span className="ml-1 text-xs opacity-70">x{count}</span>}
                    {count === 0 && wt !== 'standard' && <span className="ml-1 text-xs opacity-50">x0</span>}
                  </button>
                );
              })}
            </div>
          )}

          {isMultiplayer && !gameOver && state?.phase === 'playing' && (
            <button onClick={handleResign} className="text-sm py-2 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors">
              Resign
            </button>
          )}
          <button onClick={handleNewGame} className="btn-secondary text-sm py-2 px-4">New Game</button>
        </motion.div>
      )}

      <GameOverModal
        isOpen={gameOver}
        won={playerWon ?? (state?.winner === 'player') ?? false}
        title={playerWon === true
          ? 'Opponent Resigned - Victory!'
          : playerWon === false
            ? 'You Resigned'
            : state?.winner === 'player' ? 'Victory!' : 'Defeat!'}
        gameId="battleship"
        stats={[
          { label: 'Enemy Ships Sunk', value: (state?.aiBoard.ships.filter((s) => s.sunk).length ?? 0).toString() },
          { label: 'Your Ships Lost', value: (state?.playerBoard.ships.filter((s) => s.sunk).length ?? 0).toString() },
        ]}
        onPlayAgain={isMultiplayer ? undefined : handleNewGame}
      />
    </div>
  );
}
