import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { useUserStore } from '../stores/userStore';
import { useSettingsStore, ChessPieceStyle, ChessBoardTheme, CardTheme } from '../stores/settingsStore';
import { CHESS_BOARD_THEMES } from '../renderer/BoardSprite';
import { AIPersonality, getAIsForGame } from '../engine/AIPersonality';
import { getGameConfig } from './gameConfigs';
import PlayOptionCard from './components/PlayOptionCard';
import MiniLeaderboard from './components/MiniLeaderboard';
import GameRulesSection from './components/GameRulesSection';
import FindMatchPanel from './components/FindMatchPanel';
import PrivateRoomPanel from './components/PrivateRoomPanel';
import MatchHistory from './components/MatchHistory';

export default function GameLandingPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const config = getGameConfig(gameId ?? '');

  const setGameDifficulty = useGameStore((s) => s.setDifficulty);
  const setCurrentGame = useGameStore((s) => s.setCurrentGame);
  const setSelectedOpponent = useGameStore((s) => s.setSelectedOpponent);
  const reset = useGameStore((s) => s.reset);
  const stats = useUserStore((s) => s.stats);
  const chessPieceStyle = useSettingsStore((s) => s.chessPieceStyle);
  const setChessPieceStyle = useSettingsStore((s) => s.setChessPieceStyle);
  const chessBoardTheme = useSettingsStore((s) => s.chessBoardTheme);
  const setChessBoardTheme = useSettingsStore((s) => s.setChessBoardTheme);
  const cardTheme = useSettingsStore((s) => s.cardTheme);
  const setCardTheme = useSettingsStore((s) => s.setCardTheme);

  const [selectedAI, setSelectedAI] = useState<AIPersonality | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white/40 text-center">
          <p className="text-xl mb-2">Game not found</p>
          <button onClick={() => navigate('/')} className="btn-secondary text-sm">
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  const isSinglePlayer = config.playModes.length === 1 && config.playModes[0] === 'solo';
  const isTowerDefense = gameId === 'towerdefense';
  const isChess = gameId === 'chess';
  const isCardGame = config.category === 'card';
  const getMatchHistory = useUserStore((s) => s.getMatchHistory);
  const matchHistory = getMatchHistory(gameId ?? '');
  const availableAIs = isSinglePlayer ? [] : getAIsForGame(gameId ?? '');
  const gameStats = stats[gameId ?? ''] ?? { played: 0, won: 0, streak: 0, bestStreak: 0 };
  const winRate = gameStats.played > 0 ? Math.round((gameStats.won / gameStats.played) * 100) : 0;

  const startAIGame = () => {
    reset();
    if (isTowerDefense) {
      setGameDifficulty(selectedDifficulty);
    } else if (selectedAI) {
      setGameDifficulty(selectedAI.difficulty);
      setSelectedOpponent(selectedAI);
    }
    setCurrentGame(gameId ?? null);
    navigate(`/play/${gameId}`);
  };

  const startSoloGame = () => {
    reset();
    if (isTowerDefense) {
      setGameDifficulty(selectedDifficulty);
    }
    setCurrentGame(gameId ?? null);
    navigate(`/play/${gameId}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Back button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-white/40 hover:text-white/70 transition-colors mb-6 flex items-center gap-1"
        >
          {'\u2190'} Back to Games
        </button>
      </motion.div>

      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-8 mb-8 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${config.color}dd, ${config.color}66)`,
        }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)' }}
        />
        <div className="relative z-10 flex items-center gap-6">
          <span className="text-7xl drop-shadow-lg">{config.icon}</span>
          <div>
            <h1 className="text-4xl font-display font-bold text-white mb-1">{config.name}</h1>
            <p className="text-white/70">{config.description}</p>
            <div className="flex gap-2 mt-3">
              <span className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded capitalize">{config.category}</span>
              {config.minPlayers === config.maxPlayers ? (
                <span className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded">{config.minPlayers} Player</span>
              ) : (
                <span className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded">{config.minPlayers}-{config.maxPlayers} Players</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Play options + Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Player Stats Row */}
          {gameStats.played > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-4 gap-3"
            >
              {[
                { label: 'Played', value: gameStats.played },
                { label: 'Won', value: gameStats.won },
                { label: 'Win Rate', value: `${winRate}%` },
                { label: 'Best Streak', value: gameStats.bestStreak },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-lg font-mono font-bold text-white">{stat.value}</div>
                  <div className="text-[10px] text-white/40 uppercase">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Play Options */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-3"
          >
            <h2 className="text-sm text-white/50 uppercase tracking-wider">Play</h2>

            {/* Solo / AI Play */}
            {isSinglePlayer ? (
              <div className="space-y-4">
                {isTowerDefense && (
                  <div className="glass-panel !p-4">
                    <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Difficulty</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['easy', 'medium', 'hard'] as const).map((diff) => (
                        <button
                          key={diff}
                          onClick={() => setSelectedDifficulty(diff)}
                          className={`p-3 rounded-lg text-center transition-all border capitalize ${
                            selectedDifficulty === diff
                              ? 'border-amber-500 bg-amber-500/10'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className={`text-sm font-medium ${
                            diff === 'easy' ? 'text-green-400' : diff === 'medium' ? 'text-yellow-400' : 'text-red-400'
                          }`}>{diff}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={startSoloGame} className="btn-primary w-full text-lg py-4 font-semibold">
                  Start Game
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Play vs AI */}
                <PlayOptionCard
                  icon={'\u{1F916}'}
                  title="Play vs AI"
                  description="Choose an AI opponent and difficulty"
                  accentColor={config.color}
                  expandable
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableAIs.map((ai) => (
                        <button
                          key={ai.id}
                          onClick={() => setSelectedAI(ai)}
                          className={`text-left p-3 rounded-lg transition-all border ${
                            selectedAI?.id === ai.id
                              ? 'border-amber-500 bg-amber-500/10'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{ai.avatar}</span>
                            <div className="flex-1">
                              <div className="text-white text-xs font-medium">{ai.name}</div>
                              <div className="text-white/30 text-[10px]">{ai.title}</div>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                              ai.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                              ai.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>{ai.difficulty}</span>
                          </div>
                          <p className="text-white/30 text-[10px]">{ai.description}</p>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={startAIGame}
                      disabled={!selectedAI}
                      className={`btn-primary w-full py-3 font-semibold ${!selectedAI ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {selectedAI ? `Play vs ${selectedAI.name}` : 'Select an Opponent'}
                    </button>
                  </div>
                </PlayOptionCard>

                {/* Find Match */}
                <PlayOptionCard
                  icon={'\u{1F30D}'}
                  title="Find Match"
                  description="Play against another player online"
                  accentColor="#4488ff"
                  expandable
                >
                  <FindMatchPanel gameId={gameId ?? ''} />
                </PlayOptionCard>

                {/* Private Room */}
                <PlayOptionCard
                  icon={'\u{1F510}'}
                  title="Private Room"
                  description="Create or join a private game with an invite code"
                  accentColor="#44bb88"
                  expandable
                >
                  <PrivateRoomPanel gameId={gameId ?? ''} />
                </PlayOptionCard>
              </div>
            )}
          </motion.div>

          {/* Game-specific settings */}
          {(isChess || isCardGame || isTowerDefense) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-sm text-white/50 uppercase tracking-wider mb-3">Settings</h2>
              <div className="glass-panel !p-4 space-y-4">
                {isChess && (
                  <>
                    <div>
                      <label className="text-xs text-white/50 mb-2 block">Piece Style</label>
                      <div className="grid grid-cols-5 gap-2">
                        {([
                          { id: 'classic' as ChessPieceStyle, label: 'Classic' },
                          { id: 'filled' as ChessPieceStyle, label: 'Filled' },
                          { id: 'minimalist' as ChessPieceStyle, label: 'Minimal' },
                          { id: 'bold' as ChessPieceStyle, label: 'Bold' },
                          { id: 'pixel' as ChessPieceStyle, label: 'Pixel' },
                        ]).map((style) => (
                          <button
                            key={style.id}
                            onClick={() => setChessPieceStyle(style.id)}
                            className={`py-2 rounded-lg text-xs transition-all ${
                              chessPieceStyle === style.id
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500'
                                : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {style.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-white/50 mb-2 block">Board Colors</label>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {(Object.entries(CHESS_BOARD_THEMES) as [ChessBoardTheme, typeof CHESS_BOARD_THEMES[ChessBoardTheme]][]).map(([id, theme]) => (
                          <button
                            key={id}
                            onClick={() => setChessBoardTheme(id)}
                            className={`py-2 px-2 rounded-lg text-xs flex items-center gap-2 transition-all ${
                              chessBoardTheme === id
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500'
                                : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex flex-shrink-0">
                              <div className="w-3 h-3" style={{ backgroundColor: `#${theme.lightColor.toString(16).padStart(6, '0')}` }} />
                              <div className="w-3 h-3" style={{ backgroundColor: `#${theme.darkColor.toString(16).padStart(6, '0')}` }} />
                            </div>
                            {theme.label}
                          </button>
                        ))}
                      </div>
                      {/* Board preview */}
                      <div className="flex justify-center">
                        <div className="inline-grid grid-cols-4 gap-0 rounded overflow-hidden border border-white/10">
                          {Array.from({ length: 16 }).map((_, i) => {
                            const row = Math.floor(i / 4);
                            const col = i % 4;
                            const isLight = (row + col) % 2 === 0;
                            const theme = CHESS_BOARD_THEMES[chessBoardTheme];
                            const color = isLight ? theme.lightColor : theme.darkColor;
                            return (
                              <div
                                key={i}
                                className="w-8 h-8"
                                style={{ backgroundColor: `#${color.toString(16).padStart(6, '0')}` }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {isCardGame && (
                  <div>
                    <label className="text-xs text-white/50 mb-2 block">Card Theme</label>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { id: 'classic-blue' as CardTheme, label: 'Blue', color: '#1e3a5f' },
                        { id: 'royal-red' as CardTheme, label: 'Red', color: '#7a1a1a' },
                        { id: 'forest-green' as CardTheme, label: 'Green', color: '#1a4a2a' },
                        { id: 'midnight-purple' as CardTheme, label: 'Purple', color: '#2e1a4a' },
                      ]).map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => setCardTheme(theme.id)}
                          className={`py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all ${
                            cardTheme === theme.id
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500'
                              : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <div className="w-3 h-4 rounded-sm" style={{ backgroundColor: theme.color }} />
                          {theme.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* How to Play */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <GameRulesSection rules={config.rules} gameName={config.name} />
          </motion.div>
        </div>

        {/* Right column - Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <MatchHistory matches={matchHistory} />
          <MiniLeaderboard gameId={gameId ?? ''} />
        </motion.div>
      </div>
    </div>
  );
}
