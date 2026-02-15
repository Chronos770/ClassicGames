import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  display_name?: string;
  created_at: string;
}

interface ChatPanelProps {
  roomId: string;
}

export default function ChatPanel({ roomId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    if (!supabase) return;

    // Load recent messages
    supabase
      .from('chat_messages')
      .select('id, user_id, message, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data);
      });

    // Subscribe to new messages
    const channel = supabase.channel(`chat:${roomId}`)
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        setMessages((prev) => [...prev, payload as ChatMessage]);
      })
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    // Sanitize: strip control characters, zero-width, RTL overrides
    const sanitized = input.replace(/[\x00-\x1F\x7F\u200B-\u200F\u202A-\u202E\uFEFF]/g, '').trim();
    if (!sanitized || !supabase || !user) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: user.id,
      message: sanitized,
      display_name: profile?.display_name ?? 'Player',
      created_at: new Date().toISOString(),
    };

    // Broadcast for instant display
    const channel = supabase.channel(`chat:${roomId}`);
    channel.send({
      type: 'broadcast',
      event: 'chat',
      payload: msg,
    });

    // Persist to DB
    await supabase.from('chat_messages').insert({
      room_id: roomId,
      user_id: user.id,
      message: msg.message,
    });

    setInput('');
  };

  return (
    <div className="glass-panel flex flex-col" style={{ width: collapsed ? 40 : 250, height: 400 }}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="text-white/40 hover:text-white/60 text-xs p-2 self-end"
      >
        {collapsed ? '\u{1F4AC}' : '\u{2796}'}
      </button>

      {!collapsed && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 space-y-2 text-xs">
            {messages.map((msg) => (
              <div key={msg.id}>
                <span className={`font-medium ${msg.user_id === user?.id ? 'text-amber-400' : 'text-blue-400'}`}>
                  {msg.display_name ?? 'Player'}:
                </span>{' '}
                <span className="text-white/70">{msg.message}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-1 p-2 border-t border-white/10">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Chat..."
              className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white placeholder-white/30 focus:outline-none"
              maxLength={200}
            />
            <button
              onClick={sendMessage}
              className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs hover:bg-amber-500/30"
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}
