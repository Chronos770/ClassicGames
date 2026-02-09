import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { multiplayerService } from '../lib/multiplayerService';

interface MultiplayerLobbyProps {
  gameId: string;
  onRoomReady: (roomId: string, isHost: boolean) => void;
}

export default function MultiplayerLobby({ gameId, onRoomReady }: MultiplayerLobbyProps) {
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const [joinCode, setJoinCode] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [openRooms, setOpenRooms] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 5000);
    return () => clearInterval(interval);
  }, [gameId]);

  const loadRooms = async () => {
    const rooms = await multiplayerService.getOpenRooms(gameId);
    setOpenRooms(rooms);
  };

  const handleCreate = async () => {
    if (!user) return;
    setError('');
    const id = await multiplayerService.createRoom(gameId, user.id);
    if (id) {
      setRoomId(id);
      setWaiting(true);

      multiplayerService.setHandlers({
        onPlayerJoined: () => {
          onRoomReady(id, true);
        },
      });
    } else {
      setError('Failed to create room');
    }
  };

  const handleJoin = async (targetRoomId: string) => {
    if (!user) return;
    setError('');
    const success = await multiplayerService.joinRoom(targetRoomId, user.id);
    if (success) {
      onRoomReady(targetRoomId, false);
    } else {
      setError('Failed to join room');
    }
  };

  if (isGuest || !user) {
    return (
      <div className="text-center py-8">
        <p className="text-white/50 mb-4">Sign in to play multiplayer games</p>
      </div>
    );
  }

  if (waiting && roomId) {
    return (
      <div className="text-center py-8">
        <div className="text-amber-400 animate-pulse text-lg mb-4">Waiting for opponent...</div>
        <div className="glass-panel inline-block px-6 py-3">
          <div className="text-xs text-white/40 mb-1">Room Code</div>
          <div className="text-white font-mono text-lg select-all">{roomId.slice(0, 8)}</div>
        </div>
        <p className="text-white/30 text-xs mt-4">Share this code with a friend</p>
        <button
          onClick={() => { setWaiting(false); multiplayerService.leaveRoom(); }}
          className="btn-secondary text-sm py-2 px-4 mt-4"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-3 mb-6">
        <button onClick={handleCreate} className="btn-primary flex-1 py-3">
          Create Room
        </button>
        <div className="flex flex-1 gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Room code..."
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-amber-500/50"
          />
          <button
            onClick={() => handleJoin(joinCode)}
            disabled={!joinCode}
            className="btn-secondary text-sm py-2 px-4"
          >
            Join
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

      {openRooms.length > 0 && (
        <div>
          <h4 className="text-sm text-white/40 uppercase tracking-wider mb-3">Open Rooms</h4>
          <div className="space-y-2">
            {openRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => handleJoin(room.id)}
                className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all text-left"
              >
                <span className="text-white/60 text-sm font-mono">{room.id.slice(0, 8)}</span>
                <span className="text-amber-400 text-sm">Join</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
