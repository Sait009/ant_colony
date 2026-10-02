import { BALANCE } from '../data/balance';
import { buildContext } from './systems/context';
import { combatSystem } from './systems/combat';
import { economySystem } from './systems/economy';
import { gatherSystem } from './systems/gather';
import { wavesSystem } from './systems/waves';
import type { World } from './types';

/** Fixed simulation timestep (seconds). */
export const SIM_DT = 1 / 30;

function endGame(w: World, won: boolean): void {
  w.status = won ? 'won' : 'lost';
  w.events.push({ type: 'ended', won });
  w.events.push({ type: 'sfx', id: won ? 'win' : 'lose' });
}

/** Advance the world by one fixed tick. Pure with respect to `w` (all randomness via w.rng). */
export function step(w: World, dt: number = SIM_DT): void {
  if (w.status !== 'playing') return;
  w.tick++;
  w.time += dt;

  wavesSystem(w, dt);
  economySystem(w, dt);
  const ctx = buildContext(w);
  gatherSystem(w, dt, ctx);
  combatSystem(w, dt, ctx);

  w.ants = w.ants.filter((a) => a.hp > 0);
  w.enemies = w.enemies.filter((e) => e.hp > 0);
  w.nodes = w.nodes.filter((n) => n.amount > 0.5);

  if (w.nest.hp <= 0) endGame(w, false);
  else if (w.wave.number >= BALANCE.winWave && w.enemies.length === 0) endGame(w, true);
}
