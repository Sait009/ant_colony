import { BALANCE } from '../../data/balance';
import { addResource } from '../resources';
import { popCap, roomMods } from '../stats';
import type { World } from '../types';
import { spawnAnt, spawnNode } from '../world';

/** Node respawn, room income and the queen's egg laying. */
export function economySystem(w: World, dt: number): void {
  const mods = roomMods(w);
  if (mods.foodPerSec > 0) addResource(w, 'food', mods.foodPerSec * dt);

  if ((w.timers.nodeRespawn -= dt) <= 0) {
    w.timers.nodeRespawn = BALANCE.nodeRespawn;
    if (w.nodes.length < BALANCE.maxNodes) spawnNode(w, 250, 1000);
  }
  if ((w.timers.egg -= dt * (1 + mods.eggSpeed)) <= 0) {
    w.timers.egg = BALANCE.eggInterval;
    if (w.ants.length < popCap(w)) {
      spawnAnt(w, 'worker');
      w.events.push({ type: 'toast', key: 'toast.egg' });
    }
  }
}
