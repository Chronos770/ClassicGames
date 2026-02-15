import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { SaveData } from '../games/bonks/rules';

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

interface AcademyProgress {
  completedLessons: string[];   // "courseId/lessonId"
  completedCourses: string[];   // courseId
  certificates: string[];       // courseId
}

interface UserState {
  displayName: string;
  isGuest: boolean;
  guestId: string;
  guestBannerDismissed: boolean;
  stats: Record<string, GameStats>;
  matchHistory: MatchRecord[];
  academyProgress: AcademyProgress;
  bonksSave: SaveData | null;
  setDisplayName: (name: string) => void;
  dismissGuestBanner: () => void;
  recordGame: (gameId: string, won: boolean, opponent?: string, details?: string) => void;
  getStats: (gameId: string) => GameStats;
  getMatchHistory: (gameId: string) => MatchRecord[];
  completeLesson: (courseId: string, lessonId: string, totalLessons: number) => void;
  isLessonComplete: (courseId: string, lessonId: string) => boolean;
  getCourseProgress: (courseId: string, totalLessons: number) => { completed: number; total: number; percent: number };
  saveBonks: (data: SaveData) => void;
  clearBonksSave: () => void;
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

/** Update ELO rating after a multiplayer game */
async function updateEloForMultiplayer(gameId: string, won: boolean): Promise<void> {
  // Only update ELO for multiplayer games
  const { useGameStore } = await import('./gameStore');
  if (!useGameStore.getState().isMultiplayer) return;

  const { useAuthStore } = await import('./authStore');
  const user = useAuthStore.getState().user;
  if (!user) return;

  try {
    const { updateEloAfterGame } = await import('../lib/eloService');
    // Use 1200 as default opponent ELO (we don't track opponent's actual ELO)
    await updateEloAfterGame(user.id, gameId, 1200, won ? 'win' : 'loss');
  } catch {
    // Silently fail
  }
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      displayName: 'Player',
      isGuest: true,
      guestId: crypto.randomUUID(),
      guestBannerDismissed: false,
      stats: {},
      matchHistory: [],
      academyProgress: { completedLessons: [], completedCourses: [], certificates: [] },
      bonksSave: null,
      setDisplayName: (name) => set({ displayName: name }),
      dismissGuestBanner: () => set({ guestBannerDismissed: true }),
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
          // Update ELO for multiplayer games
          updateEloForMultiplayer(gameId, won);

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
      completeLesson: (courseId, lessonId, totalLessons) =>
        set((s) => {
          const key = `${courseId}/${lessonId}`;
          if (s.academyProgress.completedLessons.includes(key)) return s;
          const completedLessons = [...s.academyProgress.completedLessons, key];
          const courseLessonsCompleted = completedLessons.filter((l) => l.startsWith(`${courseId}/`)).length;
          const courseComplete = courseLessonsCompleted >= totalLessons;
          const completedCourses = courseComplete && !s.academyProgress.completedCourses.includes(courseId)
            ? [...s.academyProgress.completedCourses, courseId]
            : s.academyProgress.completedCourses;
          const certificates = courseComplete && !s.academyProgress.certificates.includes(courseId)
            ? [...s.academyProgress.certificates, courseId]
            : s.academyProgress.certificates;
          return { academyProgress: { completedLessons, completedCourses, certificates } };
        }),
      isLessonComplete: (courseId, lessonId) =>
        get().academyProgress.completedLessons.includes(`${courseId}/${lessonId}`),
      getCourseProgress: (courseId, totalLessons) => {
        const completed = get().academyProgress.completedLessons.filter((l) => l.startsWith(`${courseId}/`)).length;
        return { completed, total: totalLessons, percent: totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0 };
      },
      saveBonks: (data) => set({ bonksSave: data }),
      clearBonksSave: () => set({ bonksSave: null }),
    }),
    { name: 'user-data' }
  )
);
