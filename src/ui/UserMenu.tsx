import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import AuthModal from './AuthModal';

export default function UserMenu() {
  const navigate = useNavigate();
  const { user, isGuest, profile, signOut } = useAuthStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isGuest || !user) {
    return (
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          <span className="text-lg">&#128100;</span>
          <span>Guest</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 glass-panel py-2 z-50">
            <button
              onClick={() => { setAuthOpen(true); setMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-amber-400 hover:bg-white/5 transition-colors font-medium"
            >
              Sign Up to Save Progress
            </button>
            <div className="px-4 py-2 text-xs text-white/30">
              Data saved in this browser only
            </div>
          </div>
        )}

        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} guestUpgrade />
      </div>
    );
  }

  const displayName = profile?.display_name ?? 'Player';
  const emoji = profile?.avatar_emoji ?? '\u{1F3AE}';

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
      >
        <span className="text-lg">{emoji}</span>
        <span>{displayName}</span>
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 glass-panel py-2 z-50">
          <button
            onClick={() => { navigate('/profile'); setMenuOpen(false); }}
            className="w-full text-left px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            Profile
          </button>
          <button
            onClick={() => { navigate('/stats'); setMenuOpen(false); }}
            className="w-full text-left px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            Stats
          </button>
          <div className="h-px bg-white/10 my-1" />
          <button
            onClick={() => { signOut(); setMenuOpen(false); }}
            className="w-full text-left px-4 py-2 text-sm text-red-400/60 hover:text-red-400 hover:bg-white/5 transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
