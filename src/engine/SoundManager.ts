import { useSettingsStore } from '../stores/settingsStore';

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

interface SoundDefinition {
  type: 'tone' | 'noise' | 'chord';
  freq?: number;
  freqs?: number[];
  duration: number;
  oscillator?: OscillatorType;
  volume?: number;
}

const SOUND_DEFINITIONS: Record<string, SoundDefinition> = {
  // Chess
  'chess-move': { type: 'tone', freq: 200, duration: 80, oscillator: 'sine', volume: 0.3 },
  'chess-capture': { type: 'noise', duration: 100, volume: 0.4 },
  'chess-check': { type: 'chord', freqs: [440, 880], duration: 200, oscillator: 'sine', volume: 0.4 },
  'chess-castle': { type: 'chord', freqs: [300, 400], duration: 100, oscillator: 'sine', volume: 0.3 },
  'chess-gameover': { type: 'chord', freqs: [261.63, 329.63, 392], duration: 500, oscillator: 'sine', volume: 0.5 },

  // Cards
  'card-deal': { type: 'noise', duration: 40, volume: 0.2 },
  'card-flip': { type: 'noise', duration: 60, volume: 0.25 },
  'card-place': { type: 'tone', freq: 400, duration: 40, oscillator: 'sine', volume: 0.15 },
  'card-shuffle': { type: 'noise', duration: 200, volume: 0.3 },
  'card-select': { type: 'tone', freq: 500, duration: 30, oscillator: 'sine', volume: 0.1 },

  // Board
  'piece-click': { type: 'tone', freq: 300, duration: 50, oscillator: 'sine', volume: 0.2 },
  'piece-capture': { type: 'noise', duration: 100, volume: 0.35 },
  'board-move': { type: 'tone', freq: 250, duration: 60, oscillator: 'sine', volume: 0.2 },
  'dice-roll': { type: 'noise', duration: 180, volume: 0.3 },

  // Battleship
  'explosion': { type: 'noise', duration: 300, volume: 0.5 },
  'splash': { type: 'noise', duration: 150, volume: 0.3 },

  // Platformer (BooBonks, BoJangles & Chonk)
  'bonks-jump': { type: 'tone', freq: 500, duration: 100, oscillator: 'square', volume: 0.2 },
  'bonks-stomp': { type: 'tone', freq: 200, duration: 80, oscillator: 'square', volume: 0.25 },
  'bonks-coin': { type: 'chord', freqs: [988, 1319], duration: 100, oscillator: 'square', volume: 0.2 },
  'bonks-block': { type: 'tone', freq: 300, duration: 60, oscillator: 'square', volume: 0.2 },
  'bonks-die': { type: 'tone', freq: 200, duration: 400, oscillator: 'sawtooth', volume: 0.3 },
  'bonks-brick': { type: 'noise', duration: 80, volume: 0.25 },
  'bonks-powerup': { type: 'chord', freqs: [523, 659, 784], duration: 200, oscillator: 'square', volume: 0.25 },
  'bonks-grow': { type: 'chord', freqs: [262, 330, 392, 523], duration: 300, oscillator: 'square', volume: 0.2 },
  'bonks-shrink': { type: 'chord', freqs: [523, 392, 330, 262], duration: 250, oscillator: 'square', volume: 0.2 },
  'bonks-fireball': { type: 'tone', freq: 800, duration: 60, oscillator: 'sawtooth', volume: 0.15 },
  'bonks-shell-kick': { type: 'tone', freq: 350, duration: 70, oscillator: 'square', volume: 0.2 },
  'bonks-1up': { type: 'chord', freqs: [523, 659, 784, 1047], duration: 350, oscillator: 'square', volume: 0.25 },
  'bonks-pipe': { type: 'tone', freq: 120, duration: 200, oscillator: 'sine', volume: 0.2 },
  'bonks-checkpoint': { type: 'chord', freqs: [440, 554, 659], duration: 250, oscillator: 'square', volume: 0.2 },
  'bonks-star': { type: 'chord', freqs: [784, 988, 1175, 1568], duration: 400, oscillator: 'square', volume: 0.2 },
  'bonks-flag': { type: 'chord', freqs: [392, 494, 587, 784], duration: 500, oscillator: 'square', volume: 0.25 },
  'bonks-warning': { type: 'tone', freq: 880, duration: 100, oscillator: 'square', volume: 0.2 },
  'bonks-tongue': { type: 'tone', freq: 250, duration: 80, oscillator: 'sine', volume: 0.15 },
  'bonks-flutter': { type: 'tone', freq: 600, duration: 50, oscillator: 'triangle', volume: 0.1 },
  'bonks-wallkick': { type: 'tone', freq: 450, duration: 70, oscillator: 'square', volume: 0.2 },
  'bonks-spit': { type: 'tone', freq: 700, duration: 60, oscillator: 'sawtooth', volume: 0.15 },

  // UI
  'ui-click': { type: 'tone', freq: 600, duration: 30, oscillator: 'sine', volume: 0.15 },
  'game-win': { type: 'chord', freqs: [261.63, 329.63, 392, 523.25], duration: 600, oscillator: 'sine', volume: 0.5 },
  'game-lose': { type: 'chord', freqs: [392, 329.63, 261.63, 196], duration: 600, oscillator: 'sawtooth', volume: 0.3 },
};

export class SoundManager {
  private static instance: SoundManager;
  private ctx: AudioContext | null = null;

  private constructor() {}

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private getContext(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  play(soundId: string): void {
    const settings = useSettingsStore.getState();
    if (!settings.soundEnabled) return;

    const def = SOUND_DEFINITIONS[soundId];
    if (!def) return;

    const masterVolume = settings.soundVolume;
    const vol = (def.volume ?? 0.3) * masterVolume;

    switch (def.type) {
      case 'tone':
        this.playTone(def.freq!, def.duration, def.oscillator ?? 'sine', vol);
        break;
      case 'noise':
        this.playNoise(def.duration, vol);
        break;
      case 'chord':
        this.playChord(def.freqs!, def.duration, def.oscillator ?? 'sine', vol);
        break;
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType, volume: number): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  }

  private playNoise(duration: number, volume: number): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * (duration / 1000);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

    // High-pass filter for crisper percussive sounds
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(ctx.currentTime);
    source.stop(ctx.currentTime + duration / 1000);
  }

  private playChord(freqs: number[], duration: number, type: OscillatorType, volume: number): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const perNoteVolume = volume / freqs.length;

    for (let i = 0; i < freqs.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freqs[i], ctx.currentTime);

      gain.gain.setValueAtTime(perNoteVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.03); // Slight stagger for richness
      osc.stop(ctx.currentTime + duration / 1000);
    }
  }
}
