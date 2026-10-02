import type { SfxId } from '../sim/events';

interface Tone {
  freq: number;
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  /** minimum seconds between plays, to avoid spam */
  gap?: number;
}

/** Procedural placeholder SFX. Swap `play` for sample playback when real assets arrive. */
const TONES: Record<SfxId, Tone> = {
  deposit: { freq: 660, to: 880, dur: 0.08, type: 'triangle', gain: 0.05, gap: 0.12 },
  hit: { freq: 180, to: 90, dur: 0.07, type: 'square', gain: 0.04, gap: 0.08 },
  spawn: { freq: 440, to: 660, dur: 0.12, type: 'sine', gain: 0.08 },
  wave: { freq: 140, to: 100, dur: 0.6, type: 'sawtooth', gain: 0.1 },
  upgrade: { freq: 520, to: 1040, dur: 0.2, type: 'triangle', gain: 0.09 },
  error: { freq: 130, dur: 0.12, type: 'square', gain: 0.05, gap: 0.15 },
  win: { freq: 523, to: 1046, dur: 0.8, type: 'triangle', gain: 0.1 },
  lose: { freq: 200, to: 50, dur: 1, type: 'sawtooth', gain: 0.1 },
};

export class AudioManager {
  muted = false;
  private ctx: AudioContext | null = null;
  private lastPlayed = new Map<SfxId, number>();

  constructor() {
    try {
      this.muted = localStorage.getItem('ant-colony:muted') === '1';
    } catch {
      /* ignore */
    }
  }

  /** Browsers require a user gesture before audio can start. */
  unlock(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return;
      }
    }
    void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    try {
      localStorage.setItem('ant-colony:muted', m ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  play(id: SfxId): void {
    const ctx = this.ctx;
    if (!ctx || this.muted || ctx.state !== 'running') return;
    const tone = TONES[id];
    const now = ctx.currentTime;
    if (now - (this.lastPlayed.get(id) ?? -1) < (tone.gap ?? 0)) return;
    this.lastPlayed.set(id, now);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type ?? 'sine';
    osc.frequency.setValueAtTime(tone.freq, now);
    if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, now + tone.dur);
    gain.gain.setValueAtTime(tone.gain ?? 0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + tone.dur);
  }
}
