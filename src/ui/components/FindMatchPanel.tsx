import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { multiplayerService } from '../../lib/multiplayerService';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';

interface FindMatchPanelProps {
  gameId: string;
}

export default function FindMatchPanel({ gameId }: FindMatchPanelProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const setMultiplayer = useGameStore((s) => s.setMultiplayer);
  const setCurrentGame = useGameStore((s) => s.setCurrentGame);
  const reset = useGameStore((s) => s.reset);

  const [rooms, setRooms] = useState<{ id: string; host_id: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [waitingRoom, setWaitingRoom] = useState<string | null>(null);

  useEffect(() => {
    refreshRooms();
  }, [gameId]);

  const refreshRooms = async () => {
    setLoading(true);
    const openRooms = await multiplayerService.getOpenRooms(gameId);
    setRooms(openRooms);
    setLoading(false);
  };

  const handleQuickJoin = async () => {
    if (rooms.length > 0) {
      const room = rooms[0];
      const joined = await multiplayerService.joinRoom(room.id, user?.id ?? 'guest');
      if (joined) {
        reset();
        setMultiplayer(true, room.id);
        setCurrentGame(gameId);
        navigate(`/play/${gameId}`);
      }
    } else {
      await handleCreateAndWait();
    }
  };

  const handleCreateAndWait = async () => {
    setSearching(true);
    const roomId = await multiplayerService.createRoom(gameId, user?.id ?? 'guest');
    if (roomId) {
      setWaitingRoom(roomId);
      multiplayerService.setHandlers({
        onPlayerJoined: () => {
          reset();
          setMultiplayer(true, roomId);
          setCurrentGame(gameId);
          navigate(`/play/${gameId}`);
        },
      });
    }
  };

  const handleCancelWait = async () => {
    if (waitingRoom) {
      await multiplayerService.leaveRoom();
      setWaitingRoom(null);
    }
    setSearching(false);
  };

  const handleJoinRoom = async (roomId: string) => {
    const joined = await multiplayerService.joinRoom(roomId, user?.id ?? 'guest');
    if (joined) {
      reset();
      setMultiplayer(true, roomId);
      setCurrentGame(gameId);
      navigate(`/play/${gameId}`);
    }
  };

  if (isGuest) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-white/40 mb-2">Sign in to play online</p>
        <button onClick={() => navigate('/profile')} className="btn-secondary text-xs">
          Sign In
        </button>
      </div>
    );
  }

  if (searching) {
    return (
      <div className="text-center py-4">
        <div className="text-amber-400 animate-pulse mb-3">Waiting for opponent...</div>
        <button onClick={handleCancelWait} className="btn-secondary text-xs">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button onClick={handleQuickJoin} className="btn-primary w-full py-2.5 text-sm font-medium">
        {rooms.length > 0 ? 'Quick Join' : 'Create & Wait'}
      </button>

      {rooms.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs text-white/40">Open Rooms ({rooms.length})</div>
          {rooms.slice(0, 5).map((room) => (
            <button
              key={room.id}
              onClick={() => handleJoinRoom(room.id)}
              className="w-full text-left p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between"
            >
              <span className="text-xs text-white/60">Room {room.id.slice(0, 8)}...</span>
              <span className="text-xs text-amber-400">Join</span>
            </button>
          ))}
        </div>
      )}

      <button onClick={refreshRooms} disabled={loading} className="text-xs text-white/30 hover:text-white/50 transition-colors">
        {loading ? 'Refreshing...' : 'Refresh rooms'}
      </button>
    </div>
  );
}
