import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SettingsPanel from './SettingsPanel';
import UserMenu from './UserMenu';
import AuthModal from './AuthModal';
import { useSocialStore } from '../stores/socialStore';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { getActiveAnnouncements, type Announcement } from '../lib/adminService';

export default function Layout() {
  const location = useLocation();
  const isInGame = location.pathname.startsWith('/play/');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bannerAuthOpen, setBannerAuthOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<string>>(new Set());

  useEffect(() => {
    getActiveAnnouncements().then(setAnnouncements).catch(() => {});
  }, []);
  const pendingRequestCount = useSocialStore((s) => s.pendingRequestCount);
  const unreadMessageCount = useSocialStore((s) => s.unreadMessageCount);
  const isGuest = useAuthStore((s) => s.isGuest);
  const isAdmin = useAuthStore((s) => s.profile?.role === 'admin');
  const guestBannerDismissed = useUserStore((s) => s.guestBannerDismissed);
  const dismissGuestBanner = useUserStore((s) => s.dismissGuestBanner);

  const navLinks = [
    { to: '/', label: 'Games' },
    { to: '/friends', label: 'Friends', badge: pendingRequestCount },
    { to: '/messages', label: 'Messages', badge: unreadMessageCount },
    { to: '/academy/chess', label: 'Academy' },
    { to: '/stats', label: 'Stats' },
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/help', label: 'Help' },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {!isInGame && (
        <header className="relative z-20 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                <span className="text-lg sm:text-xl">{'\u265E'}</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-display font-bold text-white tracking-wide group-hover:text-amber-400 transition-colors">
                  Castle & Cards
                </h1>
                <p className="text-[10px] sm:text-xs text-white/40 -mt-0.5 hidden sm:block">Classic Family Games</p>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-4">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="relative text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                >
                  {link.label}
                  {(link.badge ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                      {link.badge! > 9 ? '9+' : link.badge}
                    </span>
                  )}
                </Link>
              ))}
              <button
                onClick={() => setSettingsOpen(true)}
                className="text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
              >
                Settings
              </button>
              <UserMenu />
            </nav>

            {/* Mobile: user menu + hamburger */}
            <div className="flex lg:hidden items-center gap-2">
              <UserMenu />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-white/60 hover:text-white transition-colors"
                aria-label="Toggle menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  {mobileMenuOpen ? (
                    <>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </>
                  ) : (
                    <>
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu dropdown */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.nav
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="lg:hidden overflow-hidden border-t border-white/5 bg-black/30 backdrop-blur-sm"
              >
                <div className="px-4 py-3 space-y-1">
                  {navLinks.map(link => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <span>{link.label}</span>
                      {(link.badge ?? 0) > 0 && (
                        <span className="min-w-[20px] h-[20px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5">
                          {link.badge! > 9 ? '9+' : link.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                  <button
                    onClick={() => { setSettingsOpen(true); setMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    Settings
                  </button>
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </header>
      )}

      {/* Guest upgrade banner */}
      {!isInGame && isGuest && !guestBannerDismissed && (
        <div className="bg-amber-500/10 border-b border-amber-500/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2">
            <p className="text-xs sm:text-sm text-amber-200/80">
              Playing as Guest —{' '}
              <button
                onClick={() => setBannerAuthOpen(true)}
                className="text-amber-400 font-semibold hover:text-amber-300 underline underline-offset-2 transition-colors"
              >
                Sign up to save progress
              </button>
            </p>
            <button
              onClick={dismissGuestBanner}
              className="text-white/40 hover:text-white/60 transition-colors text-lg leading-none flex-shrink-0"
              aria-label="Dismiss banner"
            >
              &#10005;
            </button>
          </div>
        </div>
      )}

      {/* Announcements banner */}
      {!isInGame && announcements.filter((a) => !dismissedAnnouncements.has(a.id)).length > 0 && (
        <div className="space-y-0">
          {announcements.filter((a) => !dismissedAnnouncements.has(a.id)).map((ann) => {
            const colors: Record<string, string> = {
              info: 'bg-blue-500/10 border-blue-500/20 text-blue-200/80',
              warning: 'bg-amber-500/10 border-amber-500/20 text-amber-200/80',
              update: 'bg-green-500/10 border-green-500/20 text-green-200/80',
              maintenance: 'bg-red-500/10 border-red-500/20 text-red-200/80',
            };
            return (
              <div key={ann.id} className={`border-b ${colors[ann.type] || colors.info}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold uppercase opacity-60">{ann.type}</span>
                    <span className="text-sm font-medium">{ann.title}</span>
                    {ann.content && <span className="text-xs opacity-60 truncate hidden sm:inline">— {ann.content}</span>}
                  </div>
                  <button
                    onClick={() => setDismissedAnnouncements((prev) => new Set([...prev, ann.id]))}
                    className="opacity-40 hover:opacity-60 transition-opacity text-lg leading-none flex-shrink-0"
                  >
                    &#10005;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AuthModal isOpen={bannerAuthOpen} onClose={() => setBannerAuthOpen(false)} guestUpgrade />

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
