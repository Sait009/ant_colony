import { AudioManager } from '../audio/audio';
import { BALANCE } from '../data/balance';
import { loadGame, saveGame, localStorageAdapter } from '../save/save';
import { applyCommand, type Command, type CommandResult } from '../sim/commands';
import type { GameEvent } from '../sim/events';
import { SIM_DT, step } from '../sim/step';
import type { World } from '../sim/types';
import { createWorld } from '../sim/world';

const MAX_STEPS_PER_FRAME = 8;
const AUTOSAVE_SECONDS = 15;

/** Owns the world, the fixed-timestep loop, pause/speed, autosave and the event fan-out. */
export class Game {
  world: World = createWorld(1);
  running = false;
  paused = false;
  speed = 1;
  readonly audio = new AudioManager();
  private acc = 0;
  private sinceSave = 0;
  private listeners: Array<(e: GameEvent) => void> = [];

  onEvent(fn: (e: GameEvent) => void): void {
    this.listeners.push(fn);
  }

  hasSave(): boolean {
    return loadGame() !== null;
  }

  newGame(seed = (Math.random() * 2 ** 31) | 0): void {
    this.world = createWorld(seed);
    this.begin();
  }

  continueGame(): boolean {
    const w = loadGame();
    if (!w || w.status !== 'playing') return false;
    this.world = w;
    this.begin();
    return true;
  }

  private begin(): void {
    this.running = true;
    this.paused = false;
    this.speed = 1;
    this.acc = 0;
    this.sinceSave = 0;
  }

  dispatch(cmd: Command): CommandResult {
    const res = applyCommand(this.world, cmd);
    this.flushEvents();
    return res;
  }

  save(): void {
    if (this.world.status === 'playing') saveGame(this.world);
  }

  /** Advance by real elapsed seconds; runs as many fixed ticks as needed. */
  update(frameSec: number): void {
    if (!this.running || this.paused || this.world.status !== 'playing') return;
    this.acc += Math.min(frameSec, 0.1) * this.speed;
    let steps = 0;
    while (this.acc >= SIM_DT && steps < MAX_STEPS_PER_FRAME) {
      step(this.world);
      this.acc -= SIM_DT;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.acc = 0;
    this.flushEvents();

    if ((this.sinceSave += frameSec) >= AUTOSAVE_SECONDS) {
      this.sinceSave = 0;
      this.save();
    }
    if (this.world.status !== 'playing') localStorageAdapter.clear();
  }

  private flushEvents(): void {
    const evs = this.world.events;
    if (!evs.length) return;
    this.world.events = [];
    for (const e of evs) {
      if (e.type === 'sfx') this.audio.play(e.id);
      for (const fn of this.listeners) fn(e);
    }
  }

  get winWave(): number {
    return BALANCE.winWave;
  }
}
