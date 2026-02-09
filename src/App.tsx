import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './ui/Layout';
import HomePage from './ui/HomePage';
import GameLandingPage from './ui/GameLandingPage';
import StatsPage from './ui/StatsPage';
import LeaderboardPage from './ui/LeaderboardPage';
import ProfilePage from './ui/ProfilePage';
import SolitairePage from './games/solitaire/SolitairePage';
import ChessPage from './games/chess/ChessPage';
import HeartsPage from './games/hearts/HeartsPage';
import CheckersPage from './games/checkers/CheckersPage';
import RummyPage from './games/rummy/RummyPage';
import BattleshipPage from './games/battleship/BattleshipPage';
import TowerDefensePage from './games/towerdefense/TowerDefensePage';

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
          <Route path="play/solitaire" element={<SolitairePage />} />
          <Route path="play/chess" element={<ChessPage />} />
          <Route path="play/hearts" element={<HeartsPage />} />
          <Route path="play/checkers" element={<CheckersPage />} />
          <Route path="play/rummy" element={<RummyPage />} />
          <Route path="play/battleship" element={<BattleshipPage />} />
          <Route path="play/towerdefense" element={<TowerDefensePage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}
