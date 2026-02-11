import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchUsers, sendFriendRequest, type FriendProfile } from '../../lib/friendsService';
import { useAuthStore } from '../../stores/authStore';
import { useSocialStore } from '../../stores/socialStore';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddFriendModal({ isOpen, onClose }: AddFriendModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);
  const friends = useSocialStore((s) => s.friends);
  const outgoingRequests = useSocialStore((s) => s.outgoingRequests);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const friendIds = new Set(friends.map(f => f.profile.id));
  const pendingIds = new Set(outgoingRequests.map(r => r.friend_id));

  useEffect(() => {
    if (!query.trim() || !user) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await searchUsers(query, user.id);
      setResults(res);
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, user]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSentIds(new Set());
      setError(null);
    }
  }, [isOpen]);

  const handleAdd = async (friendId: string) => {
    if (!user) return;
    setError(null);
    const { error: err } = await sendFriendRequest(user.id, friendId);
    if (err) {
      setError(err);
    } else {
      setSentIds(new Set([...sentIds, friendId]));
      useSocialStore.getState().refreshFriends(user.id);
    }
  };

  const getStatus = (profileId: string) => {
    if (friendIds.has(profileId)) return 'friends';
    if (pendingIds.has(profileId) || sentIds.has(profileId)) return 'pending';
    return 'none';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-navy-900 border border-white/10 rounded-xl w-full max-w-md p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-bold text-white">Add Friend</h2>
              <button onClick={onClose} className="text-white/40 hover:text-white text-xl">&times;</button>
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by display name..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 mb-4"
              autoFocus
            />

            {error && (
              <div className="text-red-400 text-sm mb-3">{error}</div>
            )}

            <div className="max-h-64 overflow-y-auto space-y-2">
              {loading && (
                <div className="text-center text-white/30 text-sm py-4">Searching...</div>
              )}
              {!loading && query.trim() && results.length === 0 && (
                <div className="text-center text-white/30 text-sm py-4">No players found</div>
              )}
              {results.map((profile) => {
                const status = getStatus(profile.id);
                return (
                  <div key={profile.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">
                      {profile.avatar_emoji || '🎮'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">{profile.display_name}</div>
                    </div>
                    {status === 'friends' && (
                      <span className="text-xs text-green-400 px-3 py-1.5">Already Friends</span>
                    )}
                    {status === 'pending' && (
                      <span className="text-xs text-amber-400 px-3 py-1.5">Request Sent</span>
                    )}
                    {status === 'none' && (
                      <button
                        onClick={() => handleAdd(profile.id)}
                        className="text-xs text-black bg-amber-500 hover:bg-amber-400 px-3 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        Add Friend
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
