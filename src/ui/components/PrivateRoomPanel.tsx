import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { multiplayerService } from '../../lib/multiplayerService';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';

interface PrivateRoomPanelProps {
  gameId: string;
}

export default function PrivateRoomPanel({ gameId }: PrivateRoomPanelProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const setMultiplayer = useGameStore((s) => s.setMultiplayer);
  const setCurrentGame = useGameStore((s) => s.setCurrentGame);
  const reset = useGameStore((s) => s.reset);

  const [inviteCode, setInviteCode] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    const roomId = await multiplayerService.createPrivateRoom?.(gameId, user?.id ?? 'guest');
    if (roomId) {
      setCreatedCode(roomId.slice(0, 8).toUpperCase());
      setWaiting(true);
      multiplayerService.setHandlers({
        onPlayerJoined: () => {
          reset();
          setMultiplayer(true, roomId);
          setCurrentGame(gameId);
          navigate(`/play/${gameId}`);
        },
      });
    } else {
      // Fallback: create regular room
      const regularRoomId = await multiplayerService.createRoom(gameId, user?.id ?? 'guest');
      if (regularRoomId) {
        setCreatedCode(regularRoomId.slice(0, 8).toUpperCase());
        setWaiting(true);
        multiplayerService.setHandlers({
          onPlayerJoined: () => {
            reset();
            setMultiplayer(true, regularRoomId);
            setCurrentGame(gameId);
            navigate(`/play/${gameId}`);
          },
        });
      }
    }
  };

  const handleJoin = async () => {
    setError(null);
    if (!inviteCode.trim()) {
      setError('Enter an invite code');
      return;
    }

    // Try joining by invite code
    const joined = await multiplayerService.joinByInviteCode?.(inviteCode.trim(), user?.id ?? 'guest');
    if (joined) {
      const roomId = multiplayerService.getRoomId();
      reset();
      setMultiplayer(true, roomId ?? undefined);
      setCurrentGame(gameId);
      navigate(`/play/${gameId}`);
    } else {
      setError('Invalid code or room is full');
    }
  };

  const handleCancel = async () => {
    await multiplayerService.leaveRoom();
    setCreatedCode(null);
    setWaiting(false);
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

  if (waiting && createdCode) {
    return (
      <div className="text-center py-4">
        <div className="text-xs text-white/40 mb-2">Share this code with your friend</div>
        <div className="text-3xl font-mono font-bold text-amber-400 mb-3 tracking-wider">{createdCode}</div>
        <div className="text-amber-400/60 text-xs animate-pulse mb-3">Waiting for player...</div>
        <button onClick={handleCancel} className="btn-secondary text-xs">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={handleCreate} className="btn-primary w-full py-2.5 text-sm font-medium">
        Create Private Room
      </button>

      <div className="text-center text-xs text-white/30">or</div>

      <div>
        <label className="text-xs text-white/50 mb-1.5 block">Join with Invite Code</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="ABCD1234"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:border-amber-500 focus:outline-none font-mono tracking-wider"
            maxLength={8}
          />
          <button onClick={handleJoin} className="btn-secondary text-sm px-4">
            Join
          </button>
        </div>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
    </div>
  );
}
