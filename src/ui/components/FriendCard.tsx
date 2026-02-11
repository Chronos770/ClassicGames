import { isOnline, type Friendship } from '../../lib/friendsService';

interface FriendCardProps {
  friendship: Friendship;
  onMessage: (friendId: string) => void;
  onChallenge: (friendId: string) => void;
  onUnfriend: (friendshipId: string) => void;
}

export default function FriendCard({ friendship, onMessage, onChallenge, onUnfriend }: FriendCardProps) {
  const { profile } = friendship;
  const online = isOnline(profile.online_at);

  return (
    <div className="bg-white/5 hover:bg-white/10 transition-colors rounded-lg p-4 flex items-center gap-4">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl">
          {profile.avatar_emoji || '🎮'}
        </div>
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-navy-950 ${
            online ? 'bg-green-500' : 'bg-white/20'
          }`}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium truncate">{profile.display_name}</div>
        <div className="text-xs text-white/40">
          {online ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onMessage(profile.id)}
          className="text-xs text-white/60 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          Message
        </button>
        <button
          onClick={() => onChallenge(profile.id)}
          className="text-xs text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
        >
          Challenge
        </button>
        <button
          onClick={() => onUnfriend(friendship.id)}
          className="text-xs text-white/30 hover:text-red-400 px-2 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
          title="Unfriend"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
