import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { multiplayerService } from '../../lib/multiplayerService';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';
import { getGameConfig } from '../gameConfigs';

interface FindMatchPanelProps {
  gameId: string;
}

export default function FindMatchPanel({ gameId }: FindMatchPanelProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const setMultiplayer = useGameStore((s) => s.setMultiplayer);
  const setCurrentGame = useGameStore((s) => s.setCurrentGame);
  const setPlayerColor = useGameStore((s) => s.setPlayerColor);
  const setPlayerSeat = useGameStore((s) => s.setPlayerSeat);
  const reset = useGameStore((s) => s.reset);

  const [searching, setSearching] = useState(false);

  const config = getGameConfig(gameId);
  const maxPlayers = config?.maxPlayers ?? 2;
  const userId = user?.id ?? 'guest';

  const handleFindMatch = async () => {
    setSearching(true);

    try {
      // Try to find an open room to join (poll twice to handle race conditions)
      let matchRoom: { id: string; game_id: string; host_id: string; created_at: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const openRooms = await multiplayerService.getOpenRooms(gameId);
        // Exclude rooms we created ourselves
        const otherRooms = openRooms.filter(r => r.host_id !== userId);
        if (otherRooms.length > 0) {
          matchRoom = otherRooms[0]; // Most recent room (query ordered DESC)
          break;
        }
        if (attempt === 0) await new Promise(r => setTimeout(r, 1500)); // Brief retry delay
      }

      if (matchRoom) {
        const room = matchRoom;

        if (maxPlayers > 2) {
          // 4-player game: join channel only (don't update guest_id/status)
          const joined = await multiplayerService.joinRoomChannel(room.id, userId);
          if (joined) {
            reset();
            setPlayerColor('b');
            setPlayerSeat(-1); // seat assigned by host later
            setMultiplayer(true, room.id);
            setCurrentGame(gameId);
            navigate(`/play/${gameId}`);
            return;
          }
        } else {
          // 2-player game: normal join
          const joined = await multiplayerService.joinRoom(room.id, userId);
          if (joined) {
            reset();
            setPlayerColor('b');
            setMultiplayer(true, room.id);
            setCurrentGame(gameId);
            navigate(`/play/${gameId}`);
            return;
          }
        }
      }

      // No rooms available — create one
      const roomId = await multiplayerService.createRoom(gameId, userId);
      if (roomId) {
        if (maxPlayers > 2) {
          // 4-player: navigate immediately, game page handles lobby
          reset();
          setPlayerColor('w');
          setPlayerSeat(0); // host is seat 0
          setMultiplayer(true, roomId);
          setCurrentGame(gameId);
          navigate(`/play/${gameId}`);
        } else {
          // 2-player: wait for opponent to join
          multiplayerService.updateHandlers({
            onPlayerJoined: () => {
              reset();
              setPlayerColor('w');
              setMultiplayer(true, roomId);
              setCurrentGame(gameId);
              navigate(`/play/${gameId}`);
            },
          });
        }
      } else {
        setSearching(false);
      }
    } catch {
      setSearching(false);
    }
  };

  const handleCancel = async () => {
    await multiplayerService.leaveRoom();
    setSearching(false);
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
        <div className="text-amber-400 animate-pulse mb-3">
          {maxPlayers > 2 ? 'Finding players...' : 'Finding opponent...'}
        </div>
        <p className="text-xs text-white/30 mb-3">Waiting for a match</p>
        <button onClick={handleCancel} className="btn-secondary text-xs">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button onClick={handleFindMatch} className="btn-primary w-full py-2.5 text-sm font-medium">
        Find Match
      </button>
      <p className="text-xs text-white/30 text-center">
        Auto-matched with available players
      </p>
    </div>
  );
}
