import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './ui/Layout';
import HomePage from './ui/HomePage';
import GameLandingPage from './ui/GameLandingPage';
import StatsPage from './ui/StatsPage';
import LeaderboardPage from './ui/LeaderboardPage';
import ProfilePage from './ui/ProfilePage';
import ResetPasswordPage from './ui/ResetPasswordPage';
import FriendsPage from './ui/FriendsPage';
import MessagesPage from './ui/MessagesPage';
import HelpPage from './ui/HelpPage';
import SolitairePage from './games/solitaire/SolitairePage';
import ChessPage from './games/chess/ChessPage';
import HeartsPage from './games/hearts/HeartsPage';
import CheckersPage from './games/checkers/CheckersPage';
import RummyPage from './games/rummy/RummyPage';
import BattleshipPage from './games/battleship/BattleshipPage';
import ChessTrainingPage from './games/chess/ChessTrainingPage';
import ChessAcademyPage from './games/chess/ChessAcademyPage';
import AdminPage from './ui/AdminPage';


export default function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="lobby/:gameId" element={<GameLandingPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="friends" element={<FriendsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="play/solitaire" element={<SolitairePage />} />
          <Route path="play/chess" element={<ChessPage />} />
          <Route path="academy/chess" element={<ChessAcademyPage />} />
          <Route path="academy/chess/:courseId/:lessonId" element={<ChessTrainingPage />} />
          <Route path="learn/chess" element={<ChessAcademyPage />} />
          <Route path="play/hearts" element={<HeartsPage />} />
          <Route path="play/checkers" element={<CheckersPage />} />
          <Route path="play/rummy" element={<RummyPage />} />
          <Route path="play/battleship" element={<BattleshipPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}
