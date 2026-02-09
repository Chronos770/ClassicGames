import { supabase } from './supabase';

const K_FACTOR = 32;

export function calculateNewElo(
  playerElo: number,
  opponentElo: number,
  result: 'win' | 'loss' | 'draw'
): number {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const actual = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  return Math.round(playerElo + K_FACTOR * (actual - expected));
}

export async function updateEloAfterGame(
  userId: string,
  gameId: string,
  opponentElo: number,
  result: 'win' | 'loss' | 'draw'
): Promise<{ newElo: number; change: number } | null> {
  if (!supabase) return null;

  // Get current ELO
  const { data: current } = await supabase
    .from('elo_ratings')
    .select('rating, peak_rating, games_rated')
    .eq('user_id', userId)
    .eq('game_id', gameId)
    .single();

  const currentElo = current?.rating ?? 1200;
  const newElo = calculateNewElo(currentElo, opponentElo, result);
  const peakRating = Math.max(current?.peak_rating ?? 1200, newElo);
  const gamesRated = (current?.games_rated ?? 0) + 1;

  await supabase
    .from('elo_ratings')
    .upsert(
      {
        user_id: userId,
        game_id: gameId,
        rating: newElo,
        peak_rating: peakRating,
        games_rated: gamesRated,
      },
      { onConflict: 'user_id,game_id' }
    );

  return { newElo, change: newElo - currentElo };
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_emoji: string;
  rating: number;
  peak_rating: number;
  games_rated: number;
}

export async function getLeaderboard(
  gameId: string,
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('elo_ratings')
    .select(`
      user_id,
      rating,
      peak_rating,
      games_rated,
      profiles:user_id (display_name, avatar_emoji)
    `)
    .eq('game_id', gameId)
    .order('rating', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row: any) => ({
    user_id: row.user_id,
    display_name: row.profiles?.display_name ?? 'Player',
    avatar_emoji: row.profiles?.avatar_emoji ?? '\u{1F3AE}',
    rating: row.rating,
    peak_rating: row.peak_rating,
    games_rated: row.games_rated,
  }));
}
