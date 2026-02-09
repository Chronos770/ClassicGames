import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import SettingsPanel from './SettingsPanel';
import UserMenu from './UserMenu';

export default function Layout() {
  const location = useLocation();
  const isInGame = location.pathname.startsWith('/play/');
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {!isInGame && (
        <header className="relative z-10 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                <span className="text-xl">&#9824;</span>
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-white tracking-wide group-hover:text-amber-400 transition-colors">
                  Premium Games
                </h1>
                <p className="text-xs text-white/40 -mt-0.5">Card & Board Games</p>
              </div>
            </Link>

            <nav className="flex items-center gap-4">
              <Link
                to="/"
                className="text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
              >
                Games
              </Link>
              <Link
                to="/stats"
                className="text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
              >
                Stats
              </Link>
              <Link
                to="/leaderboard"
                className="text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
              >
                Leaderboard
              </Link>
              <button
                onClick={() => setSettingsOpen(true)}
                className="text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
              >
                Settings
              </button>
              <UserMenu />
            </nav>
          </div>
        </header>
      )}

      <main className="flex-1">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          <Outlet />
        </motion.div>
      </main>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
