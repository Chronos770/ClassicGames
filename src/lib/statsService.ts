import { supabase } from './supabase';

interface GameStats {
  played: number;
  won: number;
  lost: number;
  drawn: number;
  streak: number;
  best_streak: number;
  total_time_seconds: number;
}

export async function fetchUserStats(userId: string): Promise<Record<string, GameStats> | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('game_stats')
    .select('*')
    .eq('user_id', userId);

  if (error || !data) return null;

  const result: Record<string, GameStats> = {};
  for (const row of data) {
    result[row.game_id] = {
      played: row.played,
      won: row.won,
      lost: row.lost,
      drawn: row.drawn,
      streak: row.streak,
      best_streak: row.best_streak,
      total_time_seconds: row.total_time_seconds,
    };
  }
  return result;
}

export async function upsertGameStats(
  userId: string,
  gameId: string,
  stats: Partial<GameStats>
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('game_stats')
    .upsert(
      { user_id: userId, game_id: gameId, ...stats },
      { onConflict: 'user_id,game_id' }
    );

  return !error;
}

export async function mergeLocalStats(
  userId: string,
  localStats: Record<string, { played: number; won: number; streak: number; bestStreak: number }>
): Promise<void> {
  if (!supabase) return;

  const remote = await fetchUserStats(userId);

  for (const [gameId, local] of Object.entries(localStats)) {
    const remoteGame = remote?.[gameId];
    const merged = {
      played: Math.max(local.played, remoteGame?.played ?? 0),
      won: Math.max(local.won, remoteGame?.won ?? 0),
      lost: Math.max(0, (remoteGame?.lost ?? 0)),
      drawn: remoteGame?.drawn ?? 0,
      streak: Math.max(local.streak, remoteGame?.streak ?? 0),
      best_streak: Math.max(local.bestStreak, remoteGame?.best_streak ?? 0),
      total_time_seconds: remoteGame?.total_time_seconds ?? 0,
    };

    await upsertGameStats(userId, gameId, merged);
  }
}
