import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Difficulty } from '../engine/types';

export type ChessPieceStyle = 'classic' | 'minimalist' | 'bold' | 'pixel' | 'filled';
export type CardTheme = 'classic-blue' | 'royal-red' | 'forest-green' | 'midnight-purple';
export type ChessBoardTheme = 'classic' | 'blue' | 'green' | 'red' | 'purple' | 'icy';

interface SettingsState {
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
  defaultDifficulty: Difficulty;
  animationSpeed: 'slow' | 'normal' | 'fast';
  showHints: boolean;
  chessPieceStyle: ChessPieceStyle;
  chessBoardTheme: ChessBoardTheme;
  cardTheme: CardTheme;
  chessCommentary: boolean;
  toggleSound: () => void;
  toggleMusic: () => void;
  setSoundVolume: (vol: number) => void;
  setMusicVolume: (vol: number) => void;
  setDifficulty: (d: Difficulty) => void;
  setAnimationSpeed: (s: 'slow' | 'normal' | 'fast') => void;
  toggleHints: () => void;
  setChessPieceStyle: (s: ChessPieceStyle) => void;
  setChessBoardTheme: (t: ChessBoardTheme) => void;
  setCardTheme: (t: CardTheme) => void;
  toggleChessCommentary: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      musicEnabled: true,
      soundVolume: 0.7,
      musicVolume: 0.3,
      defaultDifficulty: 'medium',
      animationSpeed: 'normal',
      showHints: true,
      chessPieceStyle: 'classic',
      chessBoardTheme: 'classic',
      cardTheme: 'classic-blue',
      chessCommentary: true,
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
      setSoundVolume: (vol) => set({ soundVolume: vol }),
      setMusicVolume: (vol) => set({ musicVolume: vol }),
      setDifficulty: (d) => set({ defaultDifficulty: d }),
      setAnimationSpeed: (s) => set({ animationSpeed: s }),
      toggleHints: () => set((s) => ({ showHints: !s.showHints })),
      setChessPieceStyle: (s) => set({ chessPieceStyle: s }),
      setChessBoardTheme: (t) => set({ chessBoardTheme: t }),
      setCardTheme: (t) => set({ cardTheme: t }),
      toggleChessCommentary: () => set((s) => ({ chessCommentary: !s.chessCommentary })),
    }),
    { name: 'game-settings' }
  )
);
