import { create } from 'zustand';
import { Difficulty, GamePhase } from '../engine/types';
import { AIPersonality } from '../engine/AIPersonality';

export interface TimeControl {
  minutes: number;
  increment: number;
}

interface GameStoreState {
  currentGame: string | null;
  phase: GamePhase;
  difficulty: Difficulty;
  score: number;
  moveCount: number;
  elapsed: number;
  isPaused: boolean;
  selectedOpponent: AIPersonality | null;
  isMultiplayer: boolean;
  roomId: string | null;
  playerColor: 'w' | 'b';
  multiplayerOpponentName: string | null;
  inviteCode: string | null;
  timeControl: TimeControl | null;
  playerSeat: number;
  setCurrentGame: (game: string | null) => void;
  setPhase: (phase: GamePhase) => void;
  setDifficulty: (d: Difficulty) => void;
  setScore: (score: number) => void;
  incrementMoves: () => void;
  setElapsed: (t: number) => void;
  togglePause: () => void;
  setSelectedOpponent: (opponent: AIPersonality | null) => void;
  setMultiplayer: (isMultiplayer: boolean, roomId?: string) => void;
  setPlayerColor: (color: 'w' | 'b') => void;
  setPlayerSeat: (seat: number) => void;
  setMultiplayerOpponentName: (name: string | null) => void;
  setInviteCode: (code: string | null) => void;
  setTimeControl: (tc: TimeControl | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameStoreState>()((set) => ({
  currentGame: null,
  phase: 'setup',
  difficulty: 'medium',
  score: 0,
  moveCount: 0,
  elapsed: 0,
  isPaused: false,
  selectedOpponent: null,
  isMultiplayer: false,
  roomId: null,
  playerColor: 'w',
  multiplayerOpponentName: null,
  inviteCode: null,
  timeControl: null,
  playerSeat: 0,
  setCurrentGame: (game) => set({ currentGame: game }),
  setPhase: (phase) => set({ phase }),
  setDifficulty: (d) => set({ difficulty: d }),
  setScore: (score) => set({ score }),
  incrementMoves: () => set((s) => ({ moveCount: s.moveCount + 1 })),
  setElapsed: (t) => set({ elapsed: t }),
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
  setSelectedOpponent: (opponent) => set({ selectedOpponent: opponent }),
  setMultiplayer: (isMultiplayer, roomId) => set({ isMultiplayer, roomId: roomId ?? null }),
  setPlayerColor: (color) => set({ playerColor: color }),
  setPlayerSeat: (seat) => set({ playerSeat: seat }),
  setMultiplayerOpponentName: (name) => set({ multiplayerOpponentName: name }),
  setInviteCode: (code) => set({ inviteCode: code }),
  setTimeControl: (tc) => set({ timeControl: tc }),
  reset: () =>
    set({
      phase: 'setup',
      difficulty: 'medium',
      score: 0,
      moveCount: 0,
      elapsed: 0,
      isPaused: false,
      selectedOpponent: null,
      isMultiplayer: false,
      roomId: null,
      playerColor: 'w',
      playerSeat: 0,
      multiplayerOpponentName: null,
      inviteCode: null,
      timeControl: null,
    }),
}));
