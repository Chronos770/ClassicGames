import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { useUserStore } from './userStore';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  profile: { display_name: string; avatar_emoji: string; avatar_url: string | null } | null;
  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isGuest: true,
  profile: null,

  initialize: async () => {
    if (!supabase) {
      set({ isLoading: false, isGuest: true });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      set({ user: session.user, session, isGuest: false });
      get().fetchProfile();
    }
    set({ isLoading: false });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        user: session?.user ?? null,
        session,
        isGuest: !session,
      });
      if (session) {
        get().fetchProfile();
      } else {
        set({ profile: null });
      }
    });
  },

  signInWithEmail: async (email, password) => {
    if (!supabase) return { error: 'Supabase not configured' };
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      // Merge local stats to Supabase
      await mergeLocalStats(data.user.id);
    }
    return { error: error?.message ?? null };
  },

  signUpWithEmail: async (email, password, name) => {
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ user: null, session: null, isGuest: true, profile: null });
  },

  fetchProfile: async () => {
    if (!supabase) return;
    const user = get().user;
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_emoji, avatar_url')
      .eq('id', user.id)
      .single();

    if (data) {
      set({ profile: data });
    }
  },
}));

/** Merge local guest stats to Supabase when user logs in */
async function mergeLocalStats(userId: string): Promise<void> {
  if (!supabase) return;
  const localStats = useUserStore.getState().stats;

  for (const [gameId, stats] of Object.entries(localStats)) {
    if (stats.played === 0) continue;

    // Upsert: add local stats to whatever exists on server
    const { data: existing } = await supabase
      .from('game_stats')
      .select('played, won, streak, best_streak')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .single();

    const merged = {
      user_id: userId,
      game_id: gameId,
      played: (existing?.played ?? 0) + stats.played,
      won: (existing?.won ?? 0) + stats.won,
      streak: stats.streak,
      best_streak: Math.max(existing?.best_streak ?? 0, stats.bestStreak),
    };

    await supabase
      .from('game_stats')
      .upsert(merged, { onConflict: 'user_id,game_id' });
  }
}
