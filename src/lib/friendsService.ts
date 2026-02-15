import { supabase } from './supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(s: string): boolean { return UUID_RE.test(s); }
function escapeIlike(s: string): string { return s.replace(/[%_\\]/g, '\\$&'); }

export interface FriendProfile {
  id: string;
  display_name: string;
  avatar_emoji: string;
  avatar_url: string | null;
  online_at: string | null;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  profile: FriendProfile;
}

function toProfile(p: any): FriendProfile {
  if (!p) return { id: '', display_name: 'Player', avatar_emoji: '🎮', avatar_url: null, online_at: null };
  return {
    id: p.id ?? '',
    display_name: p.display_name ?? 'Player',
    avatar_emoji: p.avatar_emoji ?? '🎮',
    avatar_url: p.avatar_url ?? null,
    online_at: p.online_at ?? null,
  };
}

export async function getFriends(userId: string): Promise<Friendship[]> {
  if (!supabase) return [];

  // Get friendships where we sent or received (accepted only)
  const { data: sent } = await supabase
    .from('friendships')
    .select('id, user_id, friend_id, status, created_at, profile:profiles!friendships_friend_id_fkey(id, display_name, avatar_emoji, avatar_url, online_at)')
    .eq('user_id', userId)
    .eq('status', 'accepted') as any;

  const { data: received } = await supabase
    .from('friendships')
    .select('id, user_id, friend_id, status, created_at, profile:profiles!friendships_user_id_fkey(id, display_name, avatar_emoji, avatar_url, online_at)')
    .eq('friend_id', userId)
    .eq('status', 'accepted') as any;

  const friends: Friendship[] = [];
  const seenProfileIds = new Set<string>();
  for (const f of sent ?? []) {
    const profile = toProfile(f.profile);
    if (profile.id && !seenProfileIds.has(profile.id)) {
      seenProfileIds.add(profile.id);
      friends.push({ ...f, profile });
    }
  }
  for (const f of received ?? []) {
    const profile = toProfile(f.profile);
    if (profile.id && !seenProfileIds.has(profile.id)) {
      seenProfileIds.add(profile.id);
      friends.push({ ...f, profile });
    }
  }
  return friends;
}

export async function getIncomingRequests(userId: string): Promise<Friendship[]> {
  if (!supabase) return [];

  const { data } = await supabase
    .from('friendships')
    .select('id, user_id, friend_id, status, created_at, profile:profiles!friendships_user_id_fkey(id, display_name, avatar_emoji, avatar_url, online_at)')
    .eq('friend_id', userId)
    .eq('status', 'pending') as any;

  return (data ?? []).map((f: any) => ({ ...f, profile: toProfile(f.profile) }));
}

export async function getOutgoingRequests(userId: string): Promise<Friendship[]> {
  if (!supabase) return [];

  const { data } = await supabase
    .from('friendships')
    .select('id, user_id, friend_id, status, created_at, profile:profiles!friendships_friend_id_fkey(id, display_name, avatar_emoji, avatar_url, online_at)')
    .eq('user_id', userId)
    .eq('status', 'pending') as any;

  return (data ?? []).map((f: any) => ({ ...f, profile: toProfile(f.profile) }));
}

export async function sendFriendRequest(userId: string, friendId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' };
  if (userId === friendId) return { error: 'Cannot add yourself' };
  if (!isValidUUID(userId) || !isValidUUID(friendId)) return { error: 'Invalid user ID' };

  // Check if friendship already exists in either direction
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'accepted') return { error: 'Already friends' };
    if (existing.status === 'pending') return { error: 'Request already pending' };
    if (existing.status === 'blocked') return { error: 'Unable to send request' };
  }

  const { error } = await supabase
    .from('friendships')
    .insert({ user_id: userId, friend_id: friendId });

  return { error: error?.message ?? null };
}

export async function acceptFriendRequest(friendshipId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' };

  // Get the original request so we know user_id and friend_id
  const { data: request } = await supabase
    .from('friendships')
    .select('user_id, friend_id')
    .eq('id', friendshipId)
    .single();

  if (!request) return { error: 'Request not found' };

  // Update the original request to accepted
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId);

  if (error) return { error: error.message };

  // Create the reverse friendship row so both users see each other
  await supabase
    .from('friendships')
    .upsert(
      { user_id: request.friend_id, friend_id: request.user_id, status: 'accepted' },
      { onConflict: 'user_id,friend_id' }
    );

  return { error: null };
}

export async function rejectFriendRequest(friendshipId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' };

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);

  return { error: error?.message ?? null };
}

export async function blockUser(userId: string, blockedId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' };
  if (!isValidUUID(userId) || !isValidUUID(blockedId)) return { error: 'Invalid user ID' };

  // Delete existing friendship if any, then create blocked entry
  await supabase
    .from('friendships')
    .delete()
    .or(`and(user_id.eq.${userId},friend_id.eq.${blockedId}),and(user_id.eq.${blockedId},friend_id.eq.${userId})`);

  const { error } = await supabase
    .from('friendships')
    .insert({ user_id: userId, friend_id: blockedId, status: 'blocked' });

  return { error: error?.message ?? null };
}

export async function unfriend(friendshipId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' };

  // Get the friendship so we can delete both directions
  const { data: friendship } = await supabase
    .from('friendships')
    .select('user_id, friend_id')
    .eq('id', friendshipId)
    .single();

  if (!friendship) return { error: 'Friendship not found' };

  // Delete both directions
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(user_id.eq.${friendship.user_id},friend_id.eq.${friendship.friend_id}),and(user_id.eq.${friendship.friend_id},friend_id.eq.${friendship.user_id})`);

  return { error: error?.message ?? null };
}

export async function searchUsers(query: string, currentUserId: string): Promise<FriendProfile[]> {
  if (!supabase || !query.trim()) return [];

  const escaped = escapeIlike(query.trim());

  // Try with online_at first (requires 002_social.sql migration)
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_emoji, avatar_url, online_at')
    .ilike('display_name', `%${escaped}%`)
    .neq('id', currentUserId)
    .limit(20);

  if (!error) return (data ?? []) as FriendProfile[];

  // Fallback: query without online_at if column doesn't exist yet
  const { data: fallbackData, error: fallbackError } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_emoji, avatar_url')
    .ilike('display_name', `%${escaped}%`)
    .neq('id', currentUserId)
    .limit(20);

  if (fallbackError) {
    return [];
  }

  return (fallbackData ?? []).map(p => ({ ...p, online_at: null })) as FriendProfile[];
}

export async function updatePresence(userId: string): Promise<void> {
  if (!supabase) return;

  try {
    await supabase
      .from('profiles')
      .update({ online_at: new Date().toISOString() })
      .eq('id', userId);
  } catch {
    // online_at column may not exist if 002_social migration hasn't been run
  }
}

export function isOnline(onlineAt: string | null): boolean {
  if (!onlineAt) return false;
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  return new Date(onlineAt).getTime() > fiveMinAgo;
}
