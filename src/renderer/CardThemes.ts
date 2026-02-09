import { CardTheme } from '../stores/settingsStore';

export interface CardThemeConfig {
  id: CardTheme;
  name: string;
  backColor: number;
  backAccent: number;
  backInner: number;
  feltBase: number;
  feltHighlight: number;
  feltVignette: number;
}

export const CARD_THEMES: Record<CardTheme, CardThemeConfig> = {
  'classic-blue': {
    id: 'classic-blue',
    name: 'Classic Blue',
    backColor: 0x1e3a5f,
    backAccent: 0xd4af37,
    backInner: 0x162d4a,
    feltBase: 0x1a5c2a,
    feltHighlight: 0x2d8a4e,
    feltVignette: 0x0a2e14,
  },
  'royal-red': {
    id: 'royal-red',
    name: 'Royal Red',
    backColor: 0x7a1a1a,
    backAccent: 0xd4af37,
    backInner: 0x5c1010,
    feltBase: 0x1a5c2a,
    feltHighlight: 0x2d8a4e,
    feltVignette: 0x0a2e14,
  },
  'forest-green': {
    id: 'forest-green',
    name: 'Forest Green',
    backColor: 0x1a4a2a,
    backAccent: 0xc0a050,
    backInner: 0x123820,
    feltBase: 0x2a3a20,
    feltHighlight: 0x3d5a30,
    feltVignette: 0x0a1a08,
  },
  'midnight-purple': {
    id: 'midnight-purple',
    name: 'Midnight Purple',
    backColor: 0x2e1a4a,
    backAccent: 0xc0a0e0,
    backInner: 0x221238,
    feltBase: 0x1a1a3a,
    feltHighlight: 0x2d2d5a,
    feltVignette: 0x0a0a1e,
  },
};

export function getCardTheme(id: CardTheme): CardThemeConfig {
  return CARD_THEMES[id];
}
