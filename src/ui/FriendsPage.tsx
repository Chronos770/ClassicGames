import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { useSocialStore } from '../stores/socialStore';
import {
  acceptFriendRequest,
  rejectFriendRequest,
  unfriend,
  isOnline,
  searchUsers,
  sendFriendRequest,
  type FriendProfile,
} from '../lib/friendsService';
import { sendChallenge } from '../lib/messagingService';
import { multiplayerService } from '../lib/multiplayerService';
import FriendCard from './components/FriendCard';
import AddFriendModal from './components/AddFriendModal';

type Tab = 'friends' | 'requests' | 'find';

const GAME_OPTIONS = [
  { id: 'chess', name: 'Chess', icon: '\u265A' },
  { id: 'checkers', name: 'Checkers', icon: '\u26C0' },
  { id: 'hearts', name: 'Hearts', icon: '\u2665' },
  { id: 'rummy', name: 'Gin Rummy', icon: '\u2666' },
  { id: 'battleship', name: 'Sea Battle', icon: '\u2693' },
];

export default function FriendsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const { friends, incomingRequests, outgoingRequests, refreshFriends } = useSocialStore();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [challengeTarget, setChallengeTarget] = useState<string | null>(null);

  // Find Players tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  if (isGuest || !user) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="text-6xl mb-4">{'\u{1F465}'}</div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">Friends</h1>
        <p className="text-white/50 mb-6">Sign in to add friends and play together.</p>
      </div>
    );
  }

  const sortedFriends = [...friends].sort((a, b) => {
    const aOnline = isOnline(a.profile.online_at) ? 1 : 0;
    const bOnline = isOnline(b.profile.online_at) ? 1 : 0;
    return bOnline - aOnline;
  });

  const handleAccept = async (friendshipId: string) => {
    await acceptFriendRequest(friendshipId);
    refreshFriends(user.id);
  };

  const handleReject = async (friendshipId: string) => {
    await rejectFriendRequest(friendshipId);
    refreshFriends(user.id);
  };

  const handleUnfriend = async (friendshipId: string) => {
    await unfriend(friendshipId);
    refreshFriends(user.id);
  };

  const handleChallenge = async (friendId: string, gameId: string) => {
    const result = await multiplayerService.createPrivateRoom(gameId, user.id);
    if (result) {
      await sendChallenge(user.id, friendId, gameId, result.inviteCode);
      navigate(`/lobby/${gameId}`);
    }
    setChallengeTarget(null);
  };

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const results = await searchUsers(q, user.id);
      setSearchResults(results);
      setSearchLoading(false);
    }, 300);
  };

  const handleSendRequest = async (friendId: string) => {
    const { error } = await sendFriendRequest(user.id, friendId);
    if (!error) {
      setSentIds(new Set([...sentIds, friendId]));
      refreshFriends(user.id);
    }
  };

  const friendIds = new Set(friends.map(f => f.profile.id));
  const pendingIds = new Set(outgoingRequests.map(r => r.friend_id));

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'friends', label: 'Friends', count: friends.length },
    { key: 'requests', label: 'Requests', count: incomingRequests.length },
    { key: 'find', label: 'Find Players' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-display font-bold text-white">Friends</h1>
          <button
            onClick={() => setAddModalOpen(true)}
            className="btn-primary text-sm px-4 py-2"
          >
            + Add Friend
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 text-sm py-2 rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-amber-500 text-black font-medium'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1.5 text-xs ${activeTab === tab.key ? 'text-black/60' : 'text-white/30'}`}>
                  ({tab.count})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="space-y-2">
            {sortedFriends.length === 0 ? (
              <div className="text-center text-white/30 py-12">
                <div className="text-4xl mb-3">{'\u{1F465}'}</div>
                No friends yet. Search for players to add!
              </div>
            ) : (
              sortedFriends.map(f => (
                <FriendCard
                  key={f.id}
                  friendship={f}
                  onMessage={(id) => navigate(`/messages?partner=${id}`)}
                  onChallenge={(id) => setChallengeTarget(id)}
                  onUnfriend={handleUnfriend}
                />
              ))
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {incomingRequests.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-white/60 mb-2">Incoming Requests</h3>
                <div className="space-y-2">
                  {incomingRequests.map(req => (
                    <div key={req.id} className="bg-white/5 rounded-lg p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">
                        {req.profile.avatar_emoji || '🎮'}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium">{req.profile.display_name}</div>
                        <div className="text-xs text-white/40">Wants to be friends</div>
                      </div>
                      <button
                        onClick={() => handleAccept(req.id)}
                        className="text-xs bg-green-500 hover:bg-green-400 text-black font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        className="text-xs text-white/40 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {outgoingRequests.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-white/60 mb-2">Sent Requests</h3>
                <div className="space-y-2">
                  {outgoingRequests.map(req => (
                    <div key={req.id} className="bg-white/5 rounded-lg p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">
                        {req.profile.avatar_emoji || '🎮'}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium">{req.profile.display_name}</div>
                        <div className="text-xs text-white/40">Pending</div>
                      </div>
                      <button
                        onClick={() => handleReject(req.id)}
                        className="text-xs text-white/40 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
              <div className="text-center text-white/30 py-12">
                No pending requests
              </div>
            )}
          </div>
        )}

        {/* Find Players Tab */}
        {activeTab === 'find' && (
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by display name..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 mb-4"
              autoFocus
            />
            <div className="space-y-2">
              {searchLoading && (
                <div className="text-center text-white/30 text-sm py-4">Searching...</div>
              )}
              {!searchLoading && searchQuery.trim() && searchResults.length === 0 && (
                <div className="text-center text-white/30 text-sm py-4">No players found</div>
              )}
              {searchResults.map((profile) => {
                const isFriend = friendIds.has(profile.id);
                const isPending = pendingIds.has(profile.id) || sentIds.has(profile.id);
                return (
                  <div key={profile.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">
                      {profile.avatar_emoji || '🎮'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">{profile.display_name}</div>
                    </div>
                    {isFriend && <span className="text-xs text-green-400 px-3 py-1.5">Already Friends</span>}
                    {isPending && <span className="text-xs text-amber-400 px-3 py-1.5">Request Sent</span>}
                    {!isFriend && !isPending && (
                      <button
                        onClick={() => handleSendRequest(profile.id)}
                        className="text-xs text-black bg-amber-500 hover:bg-amber-400 px-3 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        Add Friend
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* Challenge Game Picker */}
      {challengeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setChallengeTarget(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-navy-900 border border-white/10 rounded-xl w-full max-w-sm p-6 shadow-2xl"
          >
            <h3 className="text-lg font-display font-bold text-white mb-4">Choose a Game</h3>
            <div className="space-y-2">
              {GAME_OPTIONS.map(game => (
                <button
                  key={game.id}
                  onClick={() => handleChallenge(challengeTarget, game.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                >
                  <span className="text-xl">{game.icon}</span>
                  <span className="text-white font-medium">{game.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setChallengeTarget(null)}
              className="w-full mt-4 text-sm text-white/40 hover:text-white py-2"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}

      <AddFriendModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </div>
  );
}
