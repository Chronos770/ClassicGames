import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './ui/Layout';
import HomePage from './ui/HomePage';

// Lazy-load all game pages and heavy routes
const GameLandingPage = lazy(() => import('./ui/GameLandingPage'));
const StatsPage = lazy(() => import('./ui/StatsPage'));
const LeaderboardPage = lazy(() => import('./ui/LeaderboardPage'));
const ProfilePage = lazy(() => import('./ui/ProfilePage'));
const ResetPasswordPage = lazy(() => import('./ui/ResetPasswordPage'));
const FriendsPage = lazy(() => import('./ui/FriendsPage'));
const MessagesPage = lazy(() => import('./ui/MessagesPage'));
const HelpPage = lazy(() => import('./ui/HelpPage'));
const AdminPage = lazy(() => import('./ui/AdminPage'));

// Game pages (heaviest — each pulls in PixiJS renderer + game logic)
const SolitairePage = lazy(() => import('./games/solitaire/SolitairePage'));
const ChessPage = lazy(() => import('./games/chess/ChessPage'));
const ChessAcademyPage = lazy(() => import('./games/chess/ChessAcademyPage'));
const ChessTrainingPage = lazy(() => import('./games/chess/ChessTrainingPage'));
const HeartsPage = lazy(() => import('./games/hearts/HeartsPage'));
const CheckersPage = lazy(() => import('./games/checkers/CheckersPage'));
const RummyPage = lazy(() => import('./games/rummy/RummyPage'));
const BattleshipPage = lazy(() => import('./games/battleship/BattleshipPage'));
const BackgammonPage = lazy(() => import('./games/backgammon/BackgammonPage'));
const BonksPage = lazy(() => import('./games/bonks/BonksPage'));
const Quest3DPage = lazy(() => import('./games/quest3d/Quest3DPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-white/40 animate-pulse text-sm">Loading...</div>
    </div>
  );
}

export default function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="lobby/:gameId" element={<Suspense fallback={<PageLoader />}><GameLandingPage /></Suspense>} />
          <Route path="stats" element={<Suspense fallback={<PageLoader />}><StatsPage /></Suspense>} />
          <Route path="leaderboard" element={<Suspense fallback={<PageLoader />}><LeaderboardPage /></Suspense>} />
          <Route path="profile" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
          <Route path="reset-password" element={<Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense>} />
          <Route path="friends" element={<Suspense fallback={<PageLoader />}><FriendsPage /></Suspense>} />
          <Route path="messages" element={<Suspense fallback={<PageLoader />}><MessagesPage /></Suspense>} />
          <Route path="help" element={<Suspense fallback={<PageLoader />}><HelpPage /></Suspense>} />
          <Route path="play/solitaire" element={<Suspense fallback={<PageLoader />}><SolitairePage /></Suspense>} />
          <Route path="play/chess" element={<Suspense fallback={<PageLoader />}><ChessPage /></Suspense>} />
          <Route path="academy/chess" element={<Suspense fallback={<PageLoader />}><ChessAcademyPage /></Suspense>} />
          <Route path="academy/chess/:courseId/:lessonId" element={<Suspense fallback={<PageLoader />}><ChessTrainingPage /></Suspense>} />
          <Route path="learn/chess" element={<Suspense fallback={<PageLoader />}><ChessAcademyPage /></Suspense>} />
          <Route path="play/hearts" element={<Suspense fallback={<PageLoader />}><HeartsPage /></Suspense>} />
          <Route path="play/checkers" element={<Suspense fallback={<PageLoader />}><CheckersPage /></Suspense>} />
          <Route path="play/rummy" element={<Suspense fallback={<PageLoader />}><RummyPage /></Suspense>} />
          <Route path="play/battleship" element={<Suspense fallback={<PageLoader />}><BattleshipPage /></Suspense>} />
          <Route path="play/backgammon" element={<Suspense fallback={<PageLoader />}><BackgammonPage /></Suspense>} />
          <Route path="play/bonks" element={<Suspense fallback={<PageLoader />}><BonksPage /></Suspense>} />
          <Route path="play/quest3d" element={<Suspense fallback={<PageLoader />}><Quest3DPage /></Suspense>} />
          <Route path="admin" element={<Suspense fallback={<PageLoader />}><AdminPage /></Suspense>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}
