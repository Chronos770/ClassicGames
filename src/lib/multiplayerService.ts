import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface MultiplayerHandlers {
  onMoveReceived?: (move: any) => void;
  onPlayerJoined?: (userId: string) => void;
  onPlayerLeft?: (userId: string) => void;
  onStateSync?: (state: any) => void;
}

interface CreatePrivateRoomResult {
  roomId: string;
  inviteCode: string;
}

export class MultiplayerService {
  private channel: RealtimeChannel | null = null;
  private roomId: string | null = null;
  private handlers: MultiplayerHandlers = {};
  private channelReady = false;

  async createRoom(gameId: string, hostId: string): Promise<string | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('rooms')
      .insert({ game_id: gameId, host_id: hostId, status: 'waiting' })
      .select('id')
      .single();

    if (error || !data) return null;

    this.roomId = data.id;
    this.subscribeToRoom(data.id);
    return data.id;
  }

  async joinRoom(roomId: string, guestId: string): Promise<boolean> {
    if (!supabase) return false;

    // Try to join as the first guest (sets guest_id, status → playing)
    await supabase
      .from('rooms')
      .update({ guest_id: guestId, status: 'playing' })
      .eq('id', roomId)
      .eq('status', 'waiting');

    // Always subscribe to channel (for multi-player games like Hearts,
    // the room may already be 'playing' from a prior joiner — that's OK)
    this.roomId = roomId;
    this.subscribeToRoom(roomId);
    const ready = await this.waitForReady(3000);

    if (!ready) {
      // Channel failed to subscribe — clean up and fail
      if (this.channel && supabase) supabase.removeChannel(this.channel);
      this.channel = null;
      this.roomId = null;
      return false;
    }

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

    // Clean up existing channel if any
    if (this.channel) {
      supabase.removeChannel(this.channel);
    }

    this.channelReady = false;
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.channelReady = true;
        }
      });
  }

  /** Wait for the channel to reach SUBSCRIBED state */
  async waitForReady(timeoutMs = 5000): Promise<boolean> {
    if (this.channelReady) return true;
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (this.channelReady) { resolve(true); return; }
        if (Date.now() - start > timeoutMs) { resolve(false); return; }
        setTimeout(check, 100);
      };
      check();
    });
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

  /** Replace all handlers (for full resets) */
  setHandlers(handlers: MultiplayerHandlers): void {
    this.handlers = handlers;
  }

  /** Merge new handlers with existing ones (preserves handlers not specified) */
  updateHandlers(handlers: Partial<MultiplayerHandlers>): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /** Join a room's broadcast channel without updating the rooms table.
   *  Used for 4-player games where only the host row matters for discovery. */
  async joinRoomChannel(roomId: string, playerId: string): Promise<boolean> {
    this.roomId = roomId;
    this.subscribeToRoom(roomId);

    // Wait for channel to be fully subscribed before sending
    await this.waitForReady(3000);

    this.channel?.send({
      type: 'broadcast',
      event: 'player-joined',
      payload: { userId: playerId },
    });

    return true;
  }

  /** Update room status (e.g. host marks room as 'playing' when full) */
  async updateRoomStatus(roomId: string, status: string): Promise<void> {
    if (!supabase) return;
    await supabase.from('rooms').update({ status }).eq('id', roomId);
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
    this.handlers = {};
  }

  async getOpenRooms(gameId: string): Promise<{ id: string; game_id: string; host_id: string; created_at: string }[]> {
    if (!supabase) return [];

    // Only show public rooms (no invite code) that are less than 30 minutes old
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('rooms')
      .select('id, game_id, host_id, created_at')
      .eq('game_id', gameId)
      .eq('status', 'waiting')
      .is('invite_code', null)
      .gte('created_at', thirtyMinAgo)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[MultiplayerService] getOpenRooms error:', error.message);
    }

    return data ?? [];
  }

  async createPrivateRoom(gameId: string, hostId: string): Promise<CreatePrivateRoomResult | null> {
    if (!supabase) return null;

    // Generate simple 4-digit code
    const inviteCode = String(Math.floor(1000 + Math.random() * 9000));

    const { data, error } = await supabase
      .from('rooms')
      .insert({ game_id: gameId, host_id: hostId, invite_code: inviteCode })
      .select('id')
      .single();

    if (error || !data) return null;

    this.roomId = data.id;
    this.subscribeToRoom(data.id);
    return { roomId: data.id, inviteCode };
  }

  async joinByInviteCode(code: string, guestId: string): Promise<boolean> {
    if (!supabase) return false;

    // Find room by invite code (any status — multi-player games may already be 'playing')
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: room } = await supabase
      .from('rooms')
      .select('id')
      .eq('invite_code', code.toUpperCase())
      .gte('created_at', thirtyMinAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!room) return false;

    return this.joinRoom(room.id, guestId);
  }

  getRoomId(): string | null {
    return this.roomId;
  }
}

export const multiplayerService = new MultiplayerService();
