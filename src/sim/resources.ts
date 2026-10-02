import { storageCap } from './stats';
import type { ResourceId, World } from './types';

/** Add to a stockpile, clamped to storage capacity. Returns the amount actually stored. */
export function addResource(w: World, id: ResourceId, amount: number): number {
  const stored = Math.max(0, Math.min(amount, storageCap(w) - w.res[id]));
  w.res[id] += stored;
  return stored;
}
