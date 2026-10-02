import { BALANCE } from '../../data/balance';
import { popCap } from '../stats';
import type { World } from '../types';
import { spawnAnt, spawnNode } from '../world';

/** Resource node respawn + free worker from the queen. */
export function economySystem(w: World, dt: number): void {
  if ((w.timers.nodeRespawn -= dt) <= 0) {
    w.timers.nodeRespawn = BALANCE.nodeRespawn;
    if (w.nodes.length < BALANCE.maxNodes) spawnNode(w, 250, 1000);
  }
  if ((w.timers.egg -= dt) <= 0) {
    w.timers.egg = BALANCE.eggInterval;
    if (w.ants.length < popCap(w)) {
      spawnAnt(w, 'worker');
      w.events.push({ type: 'toast', key: 'toast.egg' });
    }
  }
}
