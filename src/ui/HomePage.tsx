import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import GameCard from './components/GameCard';
import HowToPlaySection from './components/HowToPlaySection';
import AdBanner from './components/AdBanner';
import CastleLogo from './components/CastleLogo';
import { GameConfig } from '../engine/types';
import { useUserStore } from '../stores/userStore';
import { useAuthStore } from '../stores/authStore';

const GAMES: GameConfig[] = [
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
    name: 'Sea Battle',
    description: 'Place your fleet and hunt the enemy. Call your shots on the high seas.',
    minPlayers: 2,
    maxPlayers: 2,
    hasAI: true,
    thumbnail: '',
    color: '#0f4c5c',
  },
  {
    id: 'backgammon',
    name: 'Backgammon',
    description: 'Roll the dice and race your checkers home. The oldest board game in the world.',
    minPlayers: 2,
    maxPlayers: 2,
    hasAI: true,
    thumbnail: '',
    color: '#5c3a1a',
  },
  {
    id: 'bonks',
    name: 'BooBonks, BoJangles & Chonk',
    description: 'Pick your hero and save Fizzlewood! A pixel-art platformer adventure.',
    minPlayers: 1,
    maxPlayers: 1,
    hasAI: false,
    thumbnail: '',
    color: '#cc3399',
  },
  {
    id: 'gp2',
    name: 'Grand Prix II',
    description: 'MicroProse\'s legendary 1995 F1 racing sim via DOSBox emulation.',
    minPlayers: 1,
    maxPlayers: 1,
    hasAI: false,
    thumbnail: '',
    color: '#c41e3a',
  },
];

const NEW_GAMES = new Set<string>(['backgammon']);
const DEV_GAMES = new Set<string>(['bonks']);
const ADMIN_GAMES = new Set<string>(['gp2']);

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
      className="max-w-7xl mx-auto mt-8 mb-8 px-6"
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
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.profile?.role === 'admin');
  const visibleGames = GAMES.filter((g) => !ADMIN_GAMES.has(g.id) || isAdmin);

  return (
    <div>
      {/* Hero + Games side by side */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left: Welcome / About */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:w-[320px] flex-shrink-0"
          >
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-bold text-white mb-3 leading-tight">
              Castle &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                Cards
              </span>
            </h1>
            <p className="text-sm text-white/50 mb-4 leading-relaxed">
              We grew up playing cards with great-grandma — it's always been a family tradition.
              We built Castle & Cards to share our love for classic games with anyone who feels
              the same way.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => navigate('/lobby/chess')}
                className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2"
              >
                <span>{'\u265A'}</span> Play Chess
              </button>
              <button
                onClick={() => navigate('/friends')}
                className="btn-secondary text-sm px-4 py-2.5"
              >
                Find Friends
              </button>
            </div>

            {/* Quick stats */}
            <div className="flex gap-4 sm:gap-6 text-center">
              {[
                { value: '9', label: 'Games' },
                { value: '3', label: 'Categories' },
                { value: '\u221E', label: 'Family Fun' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-xl font-bold text-white">{stat.value}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Ad slot */}
            <div className="mt-6">
              <AdBanner slot="SLOT_ID_1" format="horizontal" />
            </div>
          </motion.div>

          {/* Right: Games Grid */}
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <h2 className="text-xl font-display font-bold text-white">All Games</h2>
              <p className="text-xs text-white/40">Cards, boards, and strategy</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleGames.map((game, i) => (
                <div key={game.id} className="relative">
                  {NEW_GAMES.has(game.id) && (
                    <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                      NEW
                    </div>
                  )}
                  {DEV_GAMES.has(game.id) && (
                    <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                      IN DEV
                    </div>
                  )}
                  {ADMIN_GAMES.has(game.id) && (
                    <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                      ADMIN
                    </div>
                  )}
                  <GameCard game={game} index={i} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Teaser */}
      <StatsTeaser />

      {/* How to Play */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <HowToPlaySection />
      </div>

      {/* Ad - above footer */}
      <div className="max-w-7xl mx-auto px-6 mt-4">
        <AdBanner slot="SLOT_ID_2" format="horizontal" />
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-8">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CastleLogo size={28} />
            <span className="text-sm text-white/40">Castle & Cards</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/30">
            <Link to="/stats" className="hover:text-white/60 transition-colors">Stats</Link>
            <Link to="/leaderboard" className="hover:text-white/60 transition-colors">Leaderboard</Link>
            <Link to="/help" className="hover:text-white/60 transition-colors">Help</Link>
            <Link to="/profile" className="hover:text-white/60 transition-colors">Profile</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
