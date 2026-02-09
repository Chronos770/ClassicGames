import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface GameStats {
  played: number;
  won: number;
  streak: number;
  bestStreak: number;
}

export interface MatchRecord {
  gameId: string;
  won: boolean;
  opponent: string;
  date: number; // timestamp
  details?: string; // e.g. "Checkmate in 24 moves"
}

interface UserState {
  displayName: string;
  isGuest: boolean;
  stats: Record<string, GameStats>;
  matchHistory: MatchRecord[];
  setDisplayName: (name: string) => void;
  recordGame: (gameId: string, won: boolean, opponent?: string, details?: string) => void;
  getStats: (gameId: string) => GameStats;
  getMatchHistory: (gameId: string) => MatchRecord[];
}

const defaultStats: GameStats = { played: 0, won: 0, streak: 0, bestStreak: 0 };

/** Sync game stats to Supabase when user is authenticated */
async function syncStatsToSupabase(gameId: string, stats: GameStats): Promise<void> {
  if (!supabase) return;
  // Lazy import to avoid circular deps
  const { useAuthStore } = await import('./authStore');
  const user = useAuthStore.getState().user;
  if (!user) return;

  try {
    await supabase.from('game_stats').upsert(
      {
        user_id: user.id,
        game_id: gameId,
        played: stats.played,
        won: stats.won,
        streak: stats.streak,
        best_streak: stats.bestStreak,
      },
      { onConflict: 'user_id,game_id' }
    );
  } catch {
    // Silently fail - local stats are source of truth
  }
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      displayName: 'Player',
      isGuest: true,
      stats: {},
      matchHistory: [],
      setDisplayName: (name) => set({ displayName: name }),
      recordGame: (gameId, won, opponent, details) =>
        set((s) => {
          const current = s.stats[gameId] ?? { ...defaultStats };
          const streak = won ? current.streak + 1 : 0;
          const updated = {
            played: current.played + 1,
            won: current.won + (won ? 1 : 0),
            streak,
            bestStreak: Math.max(streak, current.bestStreak),
          };

          // Sync to Supabase if authenticated
          syncStatsToSupabase(gameId, updated);

          // Add to match history (keep last 50)
          const record: MatchRecord = {
            gameId,
            won,
            opponent: opponent ?? 'AI',
            date: Date.now(),
            details,
          };
          const newHistory = [record, ...s.matchHistory].slice(0, 50);

          return {
            stats: {
              ...s.stats,
              [gameId]: updated,
            },
            matchHistory: newHistory,
          };
        }),
      getStats: (gameId) => get().stats[gameId] ?? { ...defaultStats },
      getMatchHistory: (gameId) => get().matchHistory.filter((m) => m.gameId === gameId),
    }),
    { name: 'user-data' }
  )
);
