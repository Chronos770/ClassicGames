import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { useUserStore } from './userStore';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  profile: { display_name: string; avatar_emoji: string; avatar_url: string | null; role: string } | null;
  _presenceInterval: ReturnType<typeof setInterval> | null;
  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  updateEmail: (newEmail: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

async function initSocial(userId: string): Promise<void> {
  const { useSocialStore } = await import('./socialStore');
  useSocialStore.getState().initialize(userId);
}

async function cleanupSocial(): Promise<void> {
  const { useSocialStore } = await import('./socialStore');
  useSocialStore.getState().cleanup();
}

async function startPresenceHeartbeat(userId: string): Promise<ReturnType<typeof setInterval>> {
  const { updatePresence } = await import('../lib/friendsService');
  updatePresence(userId);
  return setInterval(() => updatePresence(userId), 2 * 60 * 1000);
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isGuest: true,
  profile: null,
  _presenceInterval: null,

  initialize: async () => {
    if (!supabase) {
      set({ isLoading: false, isGuest: true });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      set({ user: session.user, session, isGuest: false });
      get().fetchProfile();
      initSocial(session.user.id);
      startPresenceHeartbeat(session.user.id).then(interval => {
        set({ _presenceInterval: interval });
      });
    }
    set({ isLoading: false });

    supabase.auth.onAuthStateChange((event, session) => {
      // Handle password recovery: redirect to reset page instead of normal sign-in
      if (event === 'PASSWORD_RECOVERY') {
        set({
          user: session?.user ?? null,
          session,
          isGuest: !session,
        });
        window.location.replace('/reset-password');
        return;
      }

      const prev = get().user;
      set({
        user: session?.user ?? null,
        session,
        isGuest: !session,
      });
      if (session) {
        get().fetchProfile();
        if (!prev) {
          initSocial(session.user.id);
          startPresenceHeartbeat(session.user.id).then(interval => {
            set({ _presenceInterval: interval });
          });
        }
      } else {
        set({ profile: null });
        cleanupSocial().catch(() => {});
        const interval = get()._presenceInterval;
        if (interval) {
          clearInterval(interval);
          set({ _presenceInterval: null });
        }
      }
    });
  },

  signInWithEmail: async (email, password) => {
    if (!supabase) return { error: 'Supabase not configured' };
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      // Merge local stats to Supabase
      try {
        await mergeLocalStats(data.user.id);
      } catch {
        // Non-fatal: stats merge failure shouldn't block login
      }
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

  resetPassword: async (email) => {
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  },

  updatePassword: async (newPassword) => {
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  },

  updateEmail: async (newEmail) => {
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    if (!supabase) return;
    const interval = get()._presenceInterval;
    if (interval) {
      clearInterval(interval);
      set({ _presenceInterval: null });
    }
    await cleanupSocial();
    await supabase.auth.signOut();
    set({ user: null, session: null, isGuest: true, profile: null });
  },

  fetchProfile: async () => {
    if (!supabase) return;
    const user = get().user;
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_emoji, avatar_url, role')
      .eq('id', user.id)
      .single();

    if (data) {
      set({ profile: { ...data, role: data.role ?? 'user' } });
    } else if (error) {
      // Fallback: role column may not exist yet (pre-migration)
      const { data: fallback } = await supabase
        .from('profiles')
        .select('display_name, avatar_emoji, avatar_url')
        .eq('id', user.id)
        .single();
      if (fallback) {
        set({ profile: { ...fallback, role: 'user' } });
      }
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
      streak: Math.max(existing?.streak ?? 0, stats.streak),
      best_streak: Math.max(existing?.best_streak ?? 0, stats.bestStreak),
    };

    await supabase
      .from('game_stats')
      .upsert(merged, { onConflict: 'user_id,game_id' });
  }
}
