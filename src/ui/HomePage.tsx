import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import GameCard from './components/GameCard';
import HeroSection from './components/HeroSection';
import HowToPlaySection from './components/HowToPlaySection';
import { GameConfig } from '../engine/types';
import { useUserStore } from '../stores/userStore';

const GAMES: GameConfig[] = [
  {
    id: 'towerdefense',
    name: 'Tower Defense',
    description: 'Build towers, defend the path! Survive 15 waves of enemies in this real-time strategy game.',
    minPlayers: 1,
    maxPlayers: 1,
    hasAI: false,
    thumbnail: '',
    color: '#2D5A27',
  },
  {
    id: 'chess',
    name: 'Chess',
    description: 'The king of strategy games. Play against AI at any difficulty.',
    minPlayers: 2,
    maxPlayers: 2,
    hasAI: true,
    thumbnail: '',
    color: '#5a3219',
  },
  {
    id: 'solitaire',
    name: 'Solitaire',
    description: 'Classic Klondike solitaire. Sort all cards into foundation piles by suit.',
    minPlayers: 1,
    maxPlayers: 1,
    hasAI: false,
    thumbnail: '',
    color: '#166534',
  },
  {
    id: 'hearts',
    name: 'Hearts',
    description: 'Classic trick-taking card game. Avoid hearts and the Queen of Spades.',
    minPlayers: 4,
    maxPlayers: 4,
    hasAI: true,
    thumbnail: '',
    color: '#991b1b',
  },
  {
    id: 'checkers',
    name: 'Checkers',
    description: 'Jump and capture your way to victory on the classic 8x8 board.',
    minPlayers: 2,
    maxPlayers: 2,
    hasAI: true,
    thumbnail: '',
    color: '#713f12',
  },
  {
    id: 'rummy',
    name: 'Gin Rummy',
    description: 'Form melds and go gin! Classic 2-player draw and discard card game.',
    minPlayers: 2,
    maxPlayers: 2,
    hasAI: true,
    thumbnail: '',
    color: '#1e3a5f',
  },
  {
    id: 'battleship',
    name: 'Battleship',
    description: 'Place your fleet and hunt the enemy. Call your shots on the high seas.',
    minPlayers: 2,
    maxPlayers: 2,
    hasAI: true,
    thumbnail: '',
    color: '#0f4c5c',
  },
];

const NEW_GAMES = new Set<string>();

function StatsTeaser() {
  const stats = useUserStore((s) => s.stats);
  const totalPlayed = Object.values(stats).reduce((sum, s) => sum + s.played, 0);
  const totalWon = Object.values(stats).reduce((sum, s) => sum + s.won, 0);

  if (totalPlayed === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="max-w-4xl mx-auto mt-16 mb-8"
    >
      <div className="bg-white/5 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-display font-bold text-white">Your Progress</h3>
          <p className="text-sm text-white/40">
            You've played <span className="text-amber-400 font-medium">{totalPlayed}</span> games
            and won <span className="text-green-400 font-medium">{totalWon}</span>
          </p>
        </div>
        <Link
          to="/stats"
          className="btn-secondary text-sm px-4 py-2 whitespace-nowrap"
        >
          View Full Stats
        </Link>
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <HeroSection />

      {/* Games Grid */}
      <div id="games-grid" className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
            All Games
          </h2>
          <p className="text-white/40">
            7 games across cards, boards, and strategy
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {GAMES.map((game, i) => (
            <div key={game.id} className="relative">
              {NEW_GAMES.has(game.id) && (
                <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                  NEW
                </div>
              )}
              <GameCard game={game} index={i} />
            </div>
          ))}
        </div>
      </div>

      {/* Stats Teaser */}
      <StatsTeaser />

      {/* How to Play */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <HowToPlaySection />
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-8">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <span className="text-sm">{'\u2660'}</span>
            </div>
            <span className="text-sm text-white/40">Premium Games</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/30">
            <Link to="/stats" className="hover:text-white/60 transition-colors">Stats</Link>
            <Link to="/leaderboard" className="hover:text-white/60 transition-colors">Leaderboard</Link>
            <Link to="/profile" className="hover:text-white/60 transition-colors">Profile</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
