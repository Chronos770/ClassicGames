import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DirectMessage } from '../../lib/messagingService';

interface ChatThreadProps {
  messages: DirectMessage[];
  currentUserId: string;
  partnerName: string;
  onSend: (content: string) => void;
  loading?: boolean;
  sending?: boolean;
}

export default function ChatThread({ messages, currentUserId, partnerName, onSend, loading, sending }: ChatThreadProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/30">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-white/30 mt-8">
            No messages yet. Say hello to {partnerName}!
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUserId;
          const isChallenge = msg.message_type === 'challenge';

          if (isChallenge) {
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-xs bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-lg p-3">
                  <div className="text-sm text-amber-400 font-medium mb-1">{'\u2694\uFE0F'} Game Challenge</div>
                  <div className="text-sm text-white/70 mb-2">{msg.content}</div>
                  {!isOwn && msg.metadata?.gameId && (
                    <button
                      onClick={() => navigate(`/lobby/${msg.metadata.gameId}`)}
                      className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-medium px-3 py-1.5 rounded transition-colors"
                    >
                      Join Game
                    </button>
                  )}
                  <div className="text-[10px] text-white/20 mt-2">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs rounded-lg px-3 py-2 ${
                  isOwn
                    ? 'bg-amber-500/20 text-amber-100'
                    : 'bg-white/10 text-white/80'
                }`}
              >
                <div className="text-sm break-words">{msg.content}</div>
                <div className="text-[10px] text-white/20 mt-1 text-right">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-white/10 p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 500))}
          placeholder={`Message ${partnerName}...`}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-black text-sm font-medium rounded-lg transition-colors"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
