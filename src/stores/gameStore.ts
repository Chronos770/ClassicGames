import { create } from 'zustand';
import { Difficulty, GamePhase } from '../engine/types';
import { AIPersonality } from '../engine/AIPersonality';

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
  setCurrentGame: (game: string | null) => void;
  setPhase: (phase: GamePhase) => void;
  setDifficulty: (d: Difficulty) => void;
  setScore: (score: number) => void;
  incrementMoves: () => void;
  setElapsed: (t: number) => void;
  togglePause: () => void;
  setSelectedOpponent: (opponent: AIPersonality | null) => void;
  setMultiplayer: (isMultiplayer: boolean, roomId?: string) => void;
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
  setCurrentGame: (game) => set({ currentGame: game }),
  setPhase: (phase) => set({ phase }),
  setDifficulty: (d) => set({ difficulty: d }),
  setScore: (score) => set({ score }),
  incrementMoves: () => set((s) => ({ moveCount: s.moveCount + 1 })),
  setElapsed: (t) => set({ elapsed: t }),
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
  setSelectedOpponent: (opponent) => set({ selectedOpponent: opponent }),
  setMultiplayer: (isMultiplayer, roomId) => set({ isMultiplayer, roomId: roomId ?? null }),
  reset: () =>
    set({
      phase: 'setup',
      score: 0,
      moveCount: 0,
      elapsed: 0,
      isPaused: false,
      selectedOpponent: null,
      isMultiplayer: false,
      roomId: null,
    }),
}));
