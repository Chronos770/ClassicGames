import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { multiplayerService } from '../../lib/multiplayerService';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';
import { getGameConfig } from '../gameConfigs';

interface PrivateRoomPanelProps {
  gameId: string;
}

export default function PrivateRoomPanel({ gameId }: PrivateRoomPanelProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const setMultiplayer = useGameStore((s) => s.setMultiplayer);
  const setCurrentGame = useGameStore((s) => s.setCurrentGame);
  const setPlayerColor = useGameStore((s) => s.setPlayerColor);
  const setPlayerSeat = useGameStore((s) => s.setPlayerSeat);
  const setMultiplayerOpponentName = useGameStore((s) => s.setMultiplayerOpponentName);
  const setStoreInviteCode = useGameStore((s) => s.setInviteCode);
  const reset = useGameStore((s) => s.reset);

  const [inviteCode, setInviteCode] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinedHost, setJoinedHost] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const config = getGameConfig(gameId);
  const maxPlayers = config?.maxPlayers ?? 2;
  const userId = user?.id ?? 'guest';

  const handleCreate = async () => {
    setError(null);
    const result = await multiplayerService.createPrivateRoom(gameId, userId);
    if (result) {
      setCreatedCode(result.inviteCode);

      if (maxPlayers > 2) {
        // 4-player: navigate immediately, game page handles lobby
        setWaiting(true);
        setTimeout(() => {
          reset();
          setPlayerColor('w');
          setPlayerSeat(0);
          setStoreInviteCode(result.inviteCode);
          setMultiplayer(true, result.roomId);
          setCurrentGame(gameId);
          navigate(`/play/${gameId}`);
        }, 100);
      } else {
        // 2-player: wait for opponent
        setWaiting(true);
        multiplayerService.updateHandlers({
          onPlayerJoined: (joinedUserId: string) => {
            // Host marks room as 'playing' (host has UPDATE permission via RLS)
            multiplayerService.updateRoomStatus(result.roomId, 'playing');
            reset();
            setPlayerColor('w');
            setMultiplayerOpponentName(joinedUserId);
            setMultiplayer(true, result.roomId);
            setCurrentGame(gameId);
            navigate(`/play/${gameId}`);
          },
        });
      }
    } else {
      setError('Could not create room. Try again.');
    }
  };

  const handleJoin = async () => {
    setError(null);
    const code = inviteCode.trim();
    if (!code) {
      setError('Enter a room code');
      return;
    }
    if (!/^\d{4}$/.test(code)) {
      setError('Code must be 4 digits');
      return;
    }

    if (maxPlayers > 2) {
      // 4-player: join by finding the room, then join the channel
      const success = await multiplayerService.joinByInviteCode(code, userId);
      if (success) {
        setJoined(true);
        setJoinedHost('Host');
        setTimeout(() => {
          reset();
          setPlayerColor('b');
          setPlayerSeat(-1); // seat assigned by host
          const roomId = multiplayerService.getRoomId();
          setMultiplayer(true, roomId ?? undefined);
          setCurrentGame(gameId);
          navigate(`/play/${gameId}`);
        }, 800);
      } else {
        setError('Invalid code or room is full');
      }
    } else {
      // 2-player: normal flow
      const success = await multiplayerService.joinByInviteCode(code, userId);
      if (success) {
        setJoined(true);
        setJoinedHost('Host');
        setTimeout(() => {
          reset();
          setPlayerColor('b');
          const roomId = multiplayerService.getRoomId();
          setMultiplayer(true, roomId ?? undefined);
          setCurrentGame(gameId);
          navigate(`/play/${gameId}`);
        }, 1000);
      } else {
        setError('Invalid code or room is full');
      }
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

  if (joined) {
    return (
      <div className="text-center py-4">
        <div className="text-green-400 text-lg mb-1">Joined!</div>
        <div className="text-white/60 text-sm">Playing against {joinedHost}</div>
        <div className="text-amber-400/60 text-xs animate-pulse mt-2">Starting game...</div>
      </div>
    );
  }

  if (waiting && createdCode) {
    return (
      <div className="text-center py-4">
        <div className="text-xs text-white/40 mb-2">
          Share this code with {maxPlayers > 2 ? 'your friends' : 'your friend'}
        </div>
        <div className="text-4xl font-mono font-bold text-amber-400 mb-3 tracking-[0.3em]">{createdCode}</div>
        <div className="text-amber-400/60 text-xs animate-pulse mb-3">
          {maxPlayers > 2 ? `Waiting for ${maxPlayers - 1} players...` : 'Waiting for player...'}
        </div>
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
        <label className="text-xs text-white/50 mb-1.5 block">Join with Room Code</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="1234"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:border-amber-500 focus:outline-none font-mono tracking-[0.2em] text-center text-lg"
            maxLength={4}
            inputMode="numeric"
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
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
