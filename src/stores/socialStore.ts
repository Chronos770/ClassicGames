import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  getFriends,
  getIncomingRequests,
  getOutgoingRequests,
  type Friendship,
} from '../lib/friendsService';
import {
  getConversations,
  getUnreadCount,
  subscribeToDMs,
  type Conversation,
  type DirectMessage,
} from '../lib/messagingService';

interface SocialState {
  friends: Friendship[];
  incomingRequests: Friendship[];
  outgoingRequests: Friendship[];
  conversations: Conversation[];
  unreadMessageCount: number;
  pendingRequestCount: number;

  // Internal
  _dmChannel: RealtimeChannel | null;
  _initialized: boolean;

  initialize: (userId: string) => Promise<void>;
  cleanup: () => void;
  refreshFriends: (userId: string) => Promise<void>;
  refreshConversations: (userId: string) => Promise<void>;
  refreshUnreadCount: (userId: string) => Promise<void>;
}

export const useSocialStore = create<SocialState>()(
  persist(
    (set, get) => ({
      friends: [],
      incomingRequests: [],
      outgoingRequests: [],
      conversations: [],
      unreadMessageCount: 0,
      pendingRequestCount: 0,
      _dmChannel: null,
      _initialized: false,

      initialize: async (userId: string) => {
        if (get()._initialized) return;

        // Fetch all social data in parallel — each wrapped so one failure doesn't block others
        const [friends, incoming, outgoing, conversations, unread] = await Promise.all([
          getFriends(userId).catch(() => [] as Friendship[]),
          getIncomingRequests(userId).catch(() => [] as Friendship[]),
          getOutgoingRequests(userId).catch(() => [] as Friendship[]),
          getConversations(userId).catch(() => [] as Conversation[]),
          getUnreadCount(userId).catch(() => 0),
        ]);

        // Subscribe to realtime DMs
        let channel: RealtimeChannel | null = null;
        try {
          channel = subscribeToDMs(userId, (msg: DirectMessage) => {
            set((s) => ({
              unreadMessageCount: s.unreadMessageCount + 1,
              conversations: updateConversationWithMessage(s.conversations, msg, userId),
            }));
          });
        } catch {
          // DM subscription may fail if direct_messages table doesn't exist
        }

        set({
          friends,
          incomingRequests: incoming,
          outgoingRequests: outgoing,
          conversations,
          unreadMessageCount: unread,
          pendingRequestCount: incoming.length,
          _dmChannel: channel,
          _initialized: true,
        });
      },

      cleanup: () => {
        const channel = get()._dmChannel;
        if (channel && supabase) {
          supabase.removeChannel(channel);
        }
        set({
          friends: [],
          incomingRequests: [],
          outgoingRequests: [],
          conversations: [],
          unreadMessageCount: 0,
          pendingRequestCount: 0,
          _dmChannel: null,
          _initialized: false,
        });
      },

      refreshFriends: async (userId: string) => {
        const [friends, incoming, outgoing] = await Promise.all([
          getFriends(userId).catch(() => [] as Friendship[]),
          getIncomingRequests(userId).catch(() => [] as Friendship[]),
          getOutgoingRequests(userId).catch(() => [] as Friendship[]),
        ]);
        set({
          friends,
          incomingRequests: incoming,
          outgoingRequests: outgoing,
          pendingRequestCount: incoming.length,
        });
      },

      refreshConversations: async (userId: string) => {
        const conversations = await getConversations(userId).catch(() => [] as Conversation[]);
        set({ conversations });
      },

      refreshUnreadCount: async (userId: string) => {
        const unreadMessageCount = await getUnreadCount(userId).catch(() => 0);
        set({ unreadMessageCount });
      },
    }),
    {
      name: 'gambit-social',
      partialize: (state) => ({
        unreadMessageCount: state.unreadMessageCount,
        pendingRequestCount: state.pendingRequestCount,
      }),
    }
  )
);

function updateConversationWithMessage(
  conversations: Conversation[],
  msg: DirectMessage,
  currentUserId: string
): Conversation[] {
  const partnerId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
  const existing = conversations.find(c => c.partnerId === partnerId);

  if (existing) {
    return conversations.map(c =>
      c.partnerId === partnerId
        ? { ...c, lastMessage: msg.content, lastMessageAt: msg.created_at, unreadCount: c.unreadCount + 1 }
        : c
    ).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  // New conversation — we'll refresh to get the profile data
  return [
    {
      partnerId,
      partnerName: 'Player',
      partnerEmoji: '🎮',
      lastMessage: msg.content,
      lastMessageAt: msg.created_at,
      unreadCount: 1,
    },
    ...conversations,
  ];
}
