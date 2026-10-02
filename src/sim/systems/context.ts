import { SpatialGrid } from '../spatial';
import type { Ant, Enemy, ResourceNode, World } from '../types';

/** Per-tick derived lookups. Built once, shared by all systems. */
export interface TickContext {
  nodeById: Map<number, ResourceNode>;
  /** workers currently assigned to each node */
  crowd: Map<number, number>;
  antGrid: SpatialGrid<Ant>;
  enemyGrid: SpatialGrid<Enemy>;
}

const antGrid = new SpatialGrid<Ant>();
const enemyGrid = new SpatialGrid<Enemy>();

export function buildContext(w: World): TickContext {
  const nodeById = new Map<number, ResourceNode>();
  for (const n of w.nodes) nodeById.set(n.id, n);

  const crowd = new Map<number, number>();
  antGrid.clear();
  for (const a of w.ants) {
    antGrid.insert(a);
    if (a.targetId !== null && nodeById.has(a.targetId)) {
      crowd.set(a.targetId, (crowd.get(a.targetId) ?? 0) + 1);
    }
  }
  enemyGrid.clear();
  for (const e of w.enemies) enemyGrid.insert(e);

  return { nodeById, crowd, antGrid, enemyGrid };
}
