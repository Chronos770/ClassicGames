import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Application } from 'pixi.js';
import { motion } from 'framer-motion';
import { TowerDefenseGame, GameEvent } from './TowerDefenseGame';
import { TowerDefenseRenderer } from './TowerDefenseRenderer';
import {
  TowerDefenseState,
  TowerType,
  TOWER_DEFS,
  MAPS,
  TOTAL_WAVES,
  getUpgradeCost,
  getSellValue,
  getTowerDamage,
  getTowerRange,
  getTowerFireRate,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  Difficulty,
} from './rules';
import { useGameStore } from '../../stores/gameStore';
import { useUserStore } from '../../stores/userStore';
import { SoundManager } from '../../engine/SoundManager';
import GameOverModal from '../../ui/GameOverModal';

const TOWER_TYPES: TowerType[] = ['arrow', 'cannon', 'ice', 'lightning'];

export default function TowerDefensePage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const gameRef = useRef<TowerDefenseGame | null>(null);
  const rendererRef = useRef<TowerDefenseRenderer | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const navigate = useNavigate();

  const difficulty = useGameStore((s) => s.difficulty) as Difficulty;
  const recordGame = useUserStore((s) => s.recordGame);
  const recordGameRef = useRef(recordGame);
  recordGameRef.current = recordGame;

  const [state, setState] = useState<TowerDefenseState | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [playerWon, setPlayerWon] = useState(false);
  const [message, setMessage] = useState('Place towers and start the first wave!');
  const [mapIndex, setMapIndex] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [speed, setSpeed] = useState(1);

  const speedRef = useRef(speed);
  speedRef.current = speed;

  const handleEvents = useCallback((events: GameEvent[]) => {
    const sound = SoundManager.getInstance();
    for (const event of events) {
      switch (event.type) {
        case 'fire':
          if (event.towerType === 'cannon') sound.play('explosion');
          else if (event.towerType === 'lightning') sound.play('td-zap');
          else sound.play('td-shoot');
          rendererRef.current?.renderFiringFlash(event.x, event.y, event.towerType);
          break;
        case 'kill':
          sound.play('td-kill');
          rendererRef.current?.renderKillEffect(event.x, event.y);
          break;
        case 'explosion':
          rendererRef.current?.renderExplosion(event.x, event.y);
          break;
        case 'leak':
          sound.play('td-leak');
          break;
        case 'wave-complete':
          sound.play('td-wave-complete');
          setMessage(`Wave ${event.wave} complete! +${event.bonus} gold bonus`);
          break;
        case 'game-over':
          if (event.won) {
            sound.play('game-win');
            setPlayerWon(true);
            recordGameRef.current('towerdefense', true);
          } else {
            sound.play('game-lose');
            setPlayerWon(false);
            recordGameRef.current('towerdefense', false);
          }
          setGameOver(true);
          break;
      }
    }
  }, []);

  // Game loop
  const gameLoop = useCallback((time: number) => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;

    const delta = lastTimeRef.current ? time - lastTimeRef.current : 16;
    lastTimeRef.current = time;

    const s = game.getState();
    if (s.phase === 'wave') {
      const { events } = game.update(delta * speedRef.current);
      handleEvents(events);
    }

    const newState = game.getState();
    renderer.render(newState, game.getMap());
    setState({ ...newState });

    if (newState.phase !== 'won' && newState.phase !== 'lost') {
      rafRef.current = requestAnimationFrame(gameLoop);
    }
  }, [handleEvents]);

  // Initialize PixiJS
  useEffect(() => {
    if (!canvasRef.current || !gameStarted) return;
    let destroyed = false;

    const init = async () => {
      const app = new Application();
      await app.init({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x2D5A27,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (destroyed) { app.destroy(); return; }

      canvasRef.current!.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      const game = new TowerDefenseGame();
      game.initialize(mapIndex, difficulty);
      gameRef.current = game;

      const renderer = new TowerDefenseRenderer(app);
      rendererRef.current = renderer;

      renderer.renderBackground(game.getMap());

      renderer.setOnCellClick((row, col) => {
        const s = game.getState();

        if (s.selectedTower) {
          // Try to place tower
          if (game.placeTower(row, col, s.selectedTower)) {
            SoundManager.getInstance().play('td-place');
            setMessage(`${TOWER_DEFS[s.selectedTower].name} placed!`);
          } else {
            setMessage('Cannot place tower here!');
          }
        } else {
          // Check if clicking on an existing tower
          const tower = s.towers.find(t => t.row === row && t.col === col);
          if (tower) {
            game.selectPlacedTower(tower.id);
          } else {
            game.selectPlacedTower(null);
          }
        }

        const newState = game.getState();
        setState({ ...newState });
        renderer.render(newState, game.getMap());
      });

      const initialState = game.getState();
      setState({ ...initialState });
      renderer.render(initialState, game.getMap());

      // Start the render loop
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(gameLoop);
    };

    init();

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafRef.current);
      rendererRef.current?.destroy();
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
      if (canvasRef.current) {
        canvasRef.current.innerHTML = '';
      }
    };
  }, [gameStarted, mapIndex, difficulty, gameLoop]);

  const handleStartWave = () => {
    const game = gameRef.current;
    if (!game) return;
    if (game.startWave()) {
      const s = game.getState();
      setMessage(`Wave ${s.wave} incoming!`);
      SoundManager.getInstance().play('td-wave-start');
    }
  };

  const handleSelectTower = (type: TowerType) => {
    const game = gameRef.current;
    if (!game) return;
    const s = game.getState();
    game.selectTowerType(s.selectedTower === type ? null : type);
    setState({ ...game.getState() });
  };

  const handleUpgrade = () => {
    const game = gameRef.current;
    if (!game) return;
    const s = game.getState();
    if (s.selectedPlacedTower !== null) {
      if (game.upgradeTower(s.selectedPlacedTower)) {
        SoundManager.getInstance().play('td-upgrade');
        setMessage('Tower upgraded!');
      } else {
        setMessage('Cannot upgrade - not enough gold or max level');
      }
      setState({ ...game.getState() });
    }
  };

  const handleSell = () => {
    const game = gameRef.current;
    if (!game) return;
    const s = game.getState();
    if (s.selectedPlacedTower !== null) {
      const tower = s.towers.find(t => t.id === s.selectedPlacedTower);
      if (tower) {
        const value = getSellValue(tower);
        game.sellTower(s.selectedPlacedTower);
        setMessage(`Tower sold for $${value}`);
        setState({ ...game.getState() });
      }
    }
  };

  const handleNewGame = () => {
    setGameOver(false);
    setPlayerWon(false);
    setMessage('Place towers and start the first wave!');
    setSpeed(1);
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (game && renderer) {
      game.initialize(mapIndex, difficulty);
      renderer.renderBackground(game.getMap());
      const s = game.getState();
      setState({ ...s });
      renderer.render(s, game.getMap());
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(gameLoop);
    }
  };

  // Map selection screen
  if (!gameStarted) {
    return (
      <div className="min-h-screen flex flex-col items-center py-8 px-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
          <button onClick={() => navigate('/lobby/towerdefense')} className="text-sm text-white/40 hover:text-white/70 transition-colors mb-6 flex items-center gap-1">
            &#8592; Back to Lobby
          </button>

          <h2 className="text-3xl font-display font-bold text-white mb-2">Select Map</h2>
          <p className="text-white/50 mb-8">Choose your battlefield</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {MAPS.map((map, i) => (
              <button
                key={map.name}
                onClick={() => setMapIndex(i)}
                className={`text-left p-5 rounded-xl transition-all border-2 ${
                  mapIndex === i
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-lg font-bold text-white mb-1">{map.name}</div>
                <p className="text-sm text-white/50">{map.description}</p>
                {i === 1 && (
                  <span className="inline-block mt-2 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                    Multi-path
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => setGameStarted(true)}
            className="btn-primary w-full text-lg py-4 font-semibold"
          >
            Start Game
          </button>
        </motion.div>
      </div>
    );
  }

  const selectedTowerInfo = state?.selectedPlacedTower !== null
    ? state?.towers.find(t => t.id === state.selectedPlacedTower)
    : null;

  return (
    <div className="min-h-screen flex flex-col items-center py-4 px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[900px] flex items-center justify-between mb-2"
      >
        <button onClick={() => navigate('/lobby/towerdefense')} className="text-sm text-white/40 hover:text-white/70 transition-colors">
          &#8592; Back
        </button>
        <h2 className="text-lg font-display font-bold text-white">Tower Defense</h2>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-amber-400">Wave {state?.wave ?? 0}/{TOTAL_WAVES}</span>
          <span className="text-red-400">{'\u2764'} {state?.lives ?? 0}</span>
          <span className="text-yellow-400">$ {state?.gold ?? 0}</span>
        </div>
      </motion.div>

      {message && <div className="w-full max-w-[900px] text-center text-sm text-amber-400 mb-2">{message}</div>}

      <div className="flex flex-col lg:flex-row gap-3 items-start">
        {/* Canvas */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="game-canvas-container"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        >
          <div ref={canvasRef} />
        </motion.div>

        {/* Side Panel */}
        <div className="w-full lg:w-56 space-y-3">
          {/* Tower Selection */}
          <div className="glass-panel !p-3">
            <h3 className="text-xs text-white/50 uppercase tracking-wider mb-2">Towers</h3>
            <div className="grid grid-cols-2 gap-2">
              {TOWER_TYPES.map((type) => {
                const def = TOWER_DEFS[type];
                const isSelected = state?.selectedTower === type;
                const canAfford = (state?.gold ?? 0) >= def.cost;
                return (
                  <button
                    key={type}
                    onClick={() => handleSelectTower(type)}
                    disabled={!canAfford}
                    className={`p-2 rounded-lg text-center transition-all border ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/20'
                        : canAfford
                          ? 'border-white/10 bg-white/5 hover:bg-white/10'
                          : 'border-white/5 bg-white/[0.02] opacity-50'
                    }`}
                  >
                    <div className="text-xl">{def.symbol}</div>
                    <div className="text-xs text-white/80 mt-0.5">{def.name.replace(' Tower', '')}</div>
                    <div className="text-xs text-yellow-400">${def.cost}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Tower Info */}
          {selectedTowerInfo && (
            <div className="glass-panel !p-3">
              <h3 className="text-xs text-white/50 uppercase tracking-wider mb-2">
                {TOWER_DEFS[selectedTowerInfo.type].name} Lv.{selectedTowerInfo.level}
              </h3>
              <div className="space-y-1 text-xs text-white/60">
                <div>Damage: {getTowerDamage(selectedTowerInfo)}</div>
                <div>Range: {getTowerRange(selectedTowerInfo).toFixed(1)}</div>
                <div>Fire Rate: {getTowerFireRate(selectedTowerInfo).toFixed(1)}/s</div>
              </div>
              <div className="flex gap-2 mt-2">
                {selectedTowerInfo.level < 3 && (
                  <button
                    onClick={handleUpgrade}
                    disabled={(state?.gold ?? 0) < getUpgradeCost(selectedTowerInfo)}
                    className="btn-primary text-xs py-1.5 px-3 flex-1"
                  >
                    Upgrade (${getUpgradeCost(selectedTowerInfo)})
                  </button>
                )}
                <button onClick={handleSell} className="btn-secondary text-xs py-1.5 px-3 flex-1">
                  Sell (${getSellValue(selectedTowerInfo)})
                </button>
              </div>
            </div>
          )}

          {/* Wave Control */}
          <div className="glass-panel !p-3">
            {state?.phase === 'building' && (state?.wave ?? 0) < TOTAL_WAVES && (
              <button onClick={handleStartWave} className="btn-primary w-full text-sm py-2 font-semibold">
                Start Wave {(state?.wave ?? 0) + 1}
              </button>
            )}
            {state?.phase === 'wave' && (
              <div className="text-center">
                <div className="text-sm text-white/60 mb-2">Enemies remaining: {state.waveEnemiesRemaining}</div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setSpeed(1)}
                    className={`text-xs py-1 px-3 rounded ${speed === 1 ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/40'}`}
                  >
                    1x
                  </button>
                  <button
                    onClick={() => setSpeed(2)}
                    className={`text-xs py-1 px-3 rounded ${speed === 2 ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/40'}`}
                  >
                    2x
                  </button>
                  <button
                    onClick={() => setSpeed(3)}
                    className={`text-xs py-1 px-3 rounded ${speed === 3 ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/40'}`}
                  >
                    3x
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Score */}
          <div className="glass-panel !p-3 text-center">
            <div className="text-xs text-white/40 uppercase">Score</div>
            <div className="text-xl font-mono font-bold text-white">{state?.score ?? 0}</div>
          </div>

          <button onClick={handleNewGame} className="btn-secondary w-full text-sm py-2">
            Restart
          </button>
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        won={playerWon}
        title={playerWon ? 'Victory!' : 'Defeat!'}
        gameId="towerdefense"
        stats={[
          { label: 'Waves Survived', value: (state?.wave ?? 0).toString() },
          { label: 'Score', value: (state?.score ?? 0).toString() },
          { label: 'Towers Built', value: (state?.towers.length ?? 0).toString() },
          { label: 'Lives Left', value: (state?.lives ?? 0).toString() },
        ]}
        onPlayAgain={handleNewGame}
      />
    </div>
  );
}
