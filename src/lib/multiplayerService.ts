import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface MultiplayerHandlers {
  onMoveReceived?: (move: any) => void;
  onPlayerJoined?: (userId: string) => void;
  onPlayerLeft?: (userId: string) => void;
  onStateSync?: (state: any) => void;
}

export class MultiplayerService {
  private channel: RealtimeChannel | null = null;
  private roomId: string | null = null;
  private handlers: MultiplayerHandlers = {};

  async createRoom(gameId: string, hostId: string): Promise<string | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('rooms')
      .insert({ game_id: gameId, host_id: hostId })
      .select('id')
      .single();

    if (error || !data) return null;

    this.roomId = data.id;
    this.subscribeToRoom(data.id);
    return data.id;
  }

  async joinRoom(roomId: string, guestId: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase
      .from('rooms')
      .update({ guest_id: guestId, status: 'playing' })
      .eq('id', roomId)
      .eq('status', 'waiting');

    if (error) return false;

    this.roomId = roomId;
    this.subscribeToRoom(roomId);

    // Notify host
    this.channel?.send({
      type: 'broadcast',
      event: 'player-joined',
      payload: { userId: guestId },
    });

    return true;
  }

  private subscribeToRoom(roomId: string): void {
    if (!supabase) return;

    this.channel = supabase.channel(`room:${roomId}`)
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        this.handlers.onMoveReceived?.(payload);
      })
      .on('broadcast', { event: 'player-joined' }, ({ payload }) => {
        this.handlers.onPlayerJoined?.(payload.userId);
      })
      .on('broadcast', { event: 'player-left' }, ({ payload }) => {
        this.handlers.onPlayerLeft?.(payload.userId);
      })
      .on('broadcast', { event: 'state-sync' }, ({ payload }) => {
        this.handlers.onStateSync?.(payload);
      })
      .subscribe();
  }

  sendMove(move: any): void {
    this.channel?.send({
      type: 'broadcast',
      event: 'move',
      payload: move,
    });
  }

  sendStateSync(state: any): void {
    this.channel?.send({
      type: 'broadcast',
      event: 'state-sync',
      payload: state,
    });
  }

  setHandlers(handlers: MultiplayerHandlers): void {
    this.handlers = handlers;
  }

  async leaveRoom(): Promise<void> {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'player-left',
        payload: { userId: 'local' },
      });
      supabase?.removeChannel(this.channel);
      this.channel = null;
    }
    this.roomId = null;
  }

  async getOpenRooms(gameId: string): Promise<{ id: string; game_id: string; host_id: string; created_at: string }[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('rooms')
      .select('id, game_id, host_id, created_at')
      .eq('game_id', gameId)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(20);

    return data ?? [];
  }

  async createPrivateRoom(gameId: string, hostId: string): Promise<string | null> {
    if (!supabase) return null;

    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const { data, error } = await supabase
      .from('rooms')
      .insert({ game_id: gameId, host_id: hostId, invite_code: inviteCode })
      .select('id')
      .single();

    if (error || !data) return null;

    this.roomId = data.id;
    this.subscribeToRoom(data.id);
    return data.id;
  }

  async joinByInviteCode(code: string, guestId: string): Promise<boolean> {
    if (!supabase) return false;

    const { data: room } = await supabase
      .from('rooms')
      .select('id')
      .eq('invite_code', code.toUpperCase())
      .eq('status', 'waiting')
      .single();

    if (!room) return false;

    return this.joinRoom(room.id, guestId);
  }

  getRoomId(): string | null {
    return this.roomId;
  }
}

export const multiplayerService = new MultiplayerService();
