import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(s: string): boolean { return UUID_RE.test(s); }

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'challenge';
  metadata: Record<string, any>;
  read_at: string | null;
  created_at: string;
}

export interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerEmoji: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string,
  messageType: 'text' | 'challenge' = 'text',
  metadata: Record<string, any> = {}
): Promise<{ data: DirectMessage | null; error: string | null }> {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  if (!isValidUUID(senderId) || !isValidUUID(receiverId)) return { data: null, error: 'Invalid user ID' };
  if (!content.trim() || content.length > 500) return { data: null, error: 'Message must be 1-500 characters' };

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      message_type: messageType,
      metadata,
    })
    .select()
    .single();

  return { data, error: error?.message ?? null };
}

export async function getConversation(
  userId: string,
  partnerId: string,
  limit = 50
): Promise<DirectMessage[]> {
  if (!supabase) return [];
  if (!isValidUUID(userId) || !isValidUUID(partnerId)) return [];

  const { data } = await supabase
    .from('direct_messages')
    .select('*')
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`
    )
    .order('created_at', { ascending: true })
    .limit(limit);

  return data ?? [];
}

export async function getConversations(userId: string): Promise<Conversation[]> {
  if (!supabase) return [];
  if (!isValidUUID(userId)) return [];

  // Get all messages involving this user
  const { data: messages } = await supabase
    .from('direct_messages')
    .select('id, sender_id, receiver_id, content, read_at, created_at')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (!messages || messages.length === 0) return [];

  // Group by conversation partner
  const convMap = new Map<string, { lastMsg: typeof messages[0]; unread: number }>();
  for (const msg of messages) {
    const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
    if (!convMap.has(partnerId)) {
      convMap.set(partnerId, { lastMsg: msg, unread: 0 });
    }
    if (msg.receiver_id === userId && !msg.read_at) {
      convMap.get(partnerId)!.unread++;
    }
  }

  // Fetch partner profiles
  const partnerIds = Array.from(convMap.keys());
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_emoji')
    .in('id', partnerIds);

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

  const conversations: Conversation[] = [];
  for (const [partnerId, { lastMsg, unread }] of convMap) {
    const profile = profileMap.get(partnerId);
    conversations.push({
      partnerId,
      partnerName: profile?.display_name ?? 'Player',
      partnerEmoji: profile?.avatar_emoji ?? '🎮',
      lastMessage: lastMsg.content,
      lastMessageAt: lastMsg.created_at,
      unreadCount: unread,
    });
  }

  // Sort by most recent
  conversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  return conversations;
}

export async function markAsRead(userId: string, partnerId: string): Promise<void> {
  if (!supabase) return;

  await supabase
    .from('direct_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', partnerId)
    .eq('receiver_id', userId)
    .is('read_at', null);
}

export async function getUnreadCount(userId: string): Promise<number> {
  if (!supabase) return 0;

  const { count } = await supabase
    .from('direct_messages')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .is('read_at', null);

  return count ?? 0;
}

export function subscribeToDMs(
  userId: string,
  onNewMessage: (msg: DirectMessage) => void
): RealtimeChannel | null {
  if (!supabase) return null;

  const channel = supabase
    .channel(`dms:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        onNewMessage(payload.new as DirectMessage);
      }
    )
    .subscribe();

  return channel;
}

export async function sendChallenge(
  senderId: string,
  receiverId: string,
  gameId: string,
  inviteCode: string
): Promise<{ error: string | null }> {
  const gameName = gameId.charAt(0).toUpperCase() + gameId.slice(1);
  const { error } = await sendMessage(
    senderId,
    receiverId,
    `Come play ${gameName} with me!`,
    'challenge',
    { gameId, inviteCode }
  );
  return { error };
}
