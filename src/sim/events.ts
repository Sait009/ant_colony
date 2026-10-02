export type SfxId = 'deposit' | 'hit' | 'spawn' | 'wave' | 'upgrade' | 'error' | 'win' | 'lose';
export type Direction = 'east' | 'south' | 'west' | 'north';

/** Sim → host notifications (UI toasts, audio, floating text). */
export type GameEvent =
  | {
      type: 'toast';
      key: string;
      params?: Record<string, string | number>;
      level?: 'info' | 'danger';
    }
  | { type: 'float'; x: number; y: number; text: string; color: string }
  | { type: 'sfx'; id: SfxId }
  | { type: 'waveStart'; number: number; dir: Direction }
  | { type: 'ended'; won: boolean };
