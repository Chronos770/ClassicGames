import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { AIPersonality, getAIsForGame } from '../engine/AIPersonality';

const GAME_NAMES: Record<string, string> = {
  solitaire: 'Solitaire',
  chess: 'Chess',
  hearts: 'Hearts',
  checkers: 'Checkers',
  rummy: 'Gin Rummy',
  battleship: 'Battleship',
  towerdefense: 'Tower Defense',
};

const GAME_DESCRIPTIONS: Record<string, string> = {
  solitaire: 'Classic Klondike solitaire. Move all cards to the foundation.',
  chess: 'Play against the powerful chess engine.',
  hearts: 'Avoid collecting hearts and the Queen of Spades.',
  checkers: 'Jump and capture to eliminate all opponent pieces.',
  rummy: 'Form melds of sets and runs. Be first to go gin!',
  battleship: 'Hide your fleet and sink the enemy ships.',
  towerdefense: 'Build towers, stop the waves! A real-time strategy challenge.',
};

export default function GameLobby() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [selectedAI, setSelectedAI] = useState<AIPersonality | null>(null);
  const setGameDifficulty = useGameStore((s) => s.setDifficulty);
  const setCurrentGame = useGameStore((s) => s.setCurrentGame);
  const setSelectedOpponent = useGameStore((s) => s.setSelectedOpponent);
  const reset = useGameStore((s) => s.reset);

  const gameName = GAME_NAMES[gameId ?? ''] ?? 'Unknown Game';
  const gameDesc = GAME_DESCRIPTIONS[gameId ?? ''] ?? '';
  const isSolitaire = gameId === 'solitaire';
  const isTowerDefense = gameId === 'towerdefense';
  const isSinglePlayer = isSolitaire || isTowerDefense;
  const availableAIs = isSinglePlayer ? [] : getAIsForGame(gameId ?? '');

  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const startGame = () => {
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

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel"
      >
        <button
          onClick={() => navigate('/')}
          className="text-sm text-white/40 hover:text-white/70 transition-colors mb-6 flex items-center gap-1"
        >
          &#8592; Back to Games
        </button>

        <h2 className="text-3xl font-display font-bold text-white mb-2">{gameName}</h2>
        <p className="text-white/50 mb-8">{gameDesc}</p>

        {isTowerDefense && (
          <div className="mb-8">
            <label className="block text-sm text-white/60 mb-3 uppercase tracking-wider">
              Difficulty
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`p-4 rounded-lg text-center transition-all border-2 capitalize ${
                    selectedDifficulty === diff
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className={`text-sm font-medium ${
                    diff === 'easy' ? 'text-green-400' :
                    diff === 'medium' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {diff}
                  </div>
                  <div className="text-xs text-white/40 mt-1">
                    {diff === 'easy' ? 'Fewer, weaker enemies' :
                     diff === 'medium' ? 'Balanced challenge' :
                     'More, stronger enemies'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!isSinglePlayer && (
          <div className="mb-8">
            <label className="block text-sm text-white/60 mb-3 uppercase tracking-wider">
              Choose Your Opponent
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableAIs.map((ai) => (
                <button
                  key={ai.id}
                  onClick={() => setSelectedAI(ai)}
                  className={`text-left p-4 rounded-lg transition-all border-2 ${
                    selectedAI?.id === ai.id
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{ai.avatar}</span>
                    <div>
                      <div className="text-white font-medium text-sm">{ai.name}</div>
                      <div className="text-white/40 text-xs">{ai.title}</div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${
                        ai.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                        ai.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {ai.difficulty}
                      </div>
                      <div className="text-white/30 text-xs mt-0.5">ELO {ai.eloEstimate}</div>
                    </div>
                  </div>
                  <p className="text-white/40 text-xs">{ai.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={startGame}
          disabled={!isSinglePlayer && !selectedAI}
          className={`btn-primary w-full text-lg py-4 font-semibold ${
            !isSinglePlayer && !selectedAI ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isSinglePlayer ? 'Start Game' : selectedAI ? `Play vs ${selectedAI.name}` : 'Select an Opponent'}
        </button>
      </motion.div>
    </div>
  );
}
