import { multiplayerService } from './multiplayerService';

export interface GameMovePayload {
  gameType: string;
  moveData: any;
  timestamp: number;
}

export class MultiplayerGameAdapter {
  private gameType: string;
  private onRemoteMove?: (moveData: any) => void;

  constructor(gameType: string) {
    this.gameType = gameType;
  }

  /** Start listening for remote moves (merges with existing handlers) */
  connect(onRemoteMove: (moveData: any) => void): void {
    this.onRemoteMove = onRemoteMove;
    multiplayerService.updateHandlers({
      onMoveReceived: (payload: GameMovePayload) => {
        if (payload.gameType === this.gameType) {
          this.onRemoteMove?.(payload.moveData);
        }
      },
      onPlayerLeft: () => {
        // Could trigger a forfeit/disconnect UI
      },
    });
  }

  /** Send a local move to the remote player */
  sendMove(moveData: any): void {
    const payload: GameMovePayload = {
      gameType: this.gameType,
      moveData,
      timestamp: Date.now(),
    };
    multiplayerService.sendMove(payload);
  }

  /** Send full state sync (for reconnection) */
  sendState(state: any): void {
    multiplayerService.sendStateSync({ gameType: this.gameType, state });
  }

  /** Disconnect and clean up */
  async disconnect(): Promise<void> {
    await multiplayerService.leaveRoom();
  }
}
