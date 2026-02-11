import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { useSocialStore } from '../stores/socialStore';
import {
  getConversation,
  sendMessage,
  markAsRead,
  subscribeToDMs,
  type DirectMessage,
} from '../lib/messagingService';
import { supabase } from '../lib/supabase';
import ChatThread from './components/ChatThread';
import type { RealtimeChannel } from '@supabase/supabase-js';

export default function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const { conversations, refreshConversations, refreshUnreadCount } = useSocialStore();
  const [activePartnerId, setActivePartnerId] = useState<string | null>(searchParams.get('partner'));
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Load messages when partner changes
  useEffect(() => {
    if (!activePartnerId || !user) return;

    setLoadingMessages(true);
    setSendError(null);
    getConversation(user.id, activePartnerId).then((msgs) => {
      setMessages(msgs);
      setLoadingMessages(false);
      markAsRead(user.id, activePartnerId).then(() => {
        refreshUnreadCount(user.id);
        refreshConversations(user.id);
      });
    }).catch(() => {
      setLoadingMessages(false);
    });
  }, [activePartnerId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to realtime messages for active conversation
  useEffect(() => {
    if (!activePartnerId || !user) return;

    // Subscribe to new messages FROM this partner
    const channel = subscribeToDMs(user.id, (msg: DirectMessage) => {
      if (msg.sender_id === activePartnerId) {
        setMessages(prev => [...prev, msg]);
        // Auto-mark as read since we're viewing this conversation
        markAsRead(user.id, activePartnerId).then(() => {
          refreshUnreadCount(user.id);
        });
      }
    });
    channelRef.current = channel;

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      channelRef.current = null;
    };
  }, [activePartnerId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectConversation = useCallback((partnerId: string) => {
    setActivePartnerId(partnerId);
    setSearchParams({ partner: partnerId });
    setMobileShowChat(true);
    setSendError(null);
  }, [setSearchParams]);

  const handleSend = useCallback(async (content: string) => {
    if (!user || !activePartnerId) return;
    setSending(true);
    setSendError(null);
    const { data, error } = await sendMessage(user.id, activePartnerId, content);
    setSending(false);
    if (error) {
      setSendError('Failed to send message. Please try again.');
    } else if (data) {
      setMessages(prev => [...prev, data]);
      refreshConversations(user.id);
    }
  }, [user, activePartnerId, refreshConversations]);

  if (isGuest || !user) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="text-6xl mb-4">{'\u{1F4AC}'}</div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">Messages</h1>
        <p className="text-white/50 mb-6">Sign in to message your friends.</p>
      </div>
    );
  }

  const activeConversation = conversations.find(c => c.partnerId === activePartnerId);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold text-white mb-6">Messages</h1>

        <div className="flex bg-white/5 rounded-xl overflow-hidden border border-white/10" style={{ height: 'calc(100vh - 220px)' }}>
          {/* Conversation list */}
          <div className={`w-80 border-r border-white/10 flex flex-col flex-shrink-0 ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-3 border-b border-white/10">
              <div className="text-sm font-medium text-white/60">Conversations</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="text-center text-white/30 text-sm py-8 px-4">
                  No conversations yet. Message a friend to get started!
                </div>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.partnerId}
                    onClick={() => handleSelectConversation(conv.partnerId)}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                      activePartnerId === conv.partnerId
                        ? 'bg-white/10'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl flex-shrink-0">
                      {conv.partnerEmoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white font-medium truncate">{conv.partnerName}</span>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5">
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/30 truncate">{conv.lastMessage}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className={`flex-1 flex flex-col ${!mobileShowChat && !activePartnerId ? 'hidden md:flex' : 'flex'}`}>
            {activePartnerId ? (
              <>
                {/* Chat header */}
                <div className="p-3 border-b border-white/10 flex items-center gap-3">
                  <button
                    onClick={() => { setMobileShowChat(false); setActivePartnerId(null); }}
                    className="md:hidden text-white/40 hover:text-white mr-1"
                  >
                    {'\u2190'}
                  </button>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg">
                    {activeConversation?.partnerEmoji || '\u{1F3AE}'}
                  </div>
                  <div className="text-sm text-white font-medium">
                    {activeConversation?.partnerName || 'Player'}
                  </div>
                </div>
                {sendError && (
                  <div className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs text-center">
                    {sendError}
                  </div>
                )}
                <ChatThread
                  messages={messages}
                  currentUserId={user.id}
                  partnerName={activeConversation?.partnerName || 'Player'}
                  onSend={handleSend}
                  loading={loadingMessages}
                  sending={sending}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
                Select a conversation to start chatting
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
