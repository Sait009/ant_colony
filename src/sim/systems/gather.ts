import { dist } from '../../core/math';
import { BALANCE } from '../../data/balance';
import { ANTS } from '../../data/defs';
import { moveToward } from '../movement';
import { addResource } from '../resources';
import { antSpeed, carryOf, nestRadius } from '../stats';
import type { Ant, ResourceNode, World } from '../types';
import type { TickContext } from './context';

const CROWD_PENALTY = 60;
const MARK_BONUS = 500;

function findNode(w: World, ant: Ant, ctx: TickContext): ResourceNode | null {
  let best: ResourceNode | null = null;
  let bestScore = Infinity;
  for (const n of w.nodes) {
    if (n.amount <= 0) continue;
    const crowd = ctx.crowd.get(n.id) ?? 0;
    const score = dist(ant, n) + crowd * CROWD_PENALTY - (n.marked ? MARK_BONUS : 0);
    if (score < bestScore) {
      bestScore = score;
      best = n;
    }
  }
  return best;
}

function updateGatherer(w: World, a: Ant, dt: number, ctx: TickContext): void {
  const speed = antSpeed(w, a);

  if (a.carry > 0 && a.carryType) {
    if (moveToward(a, w.nest.x, w.nest.y, speed, dt, nestRadius(w) * 0.7)) {
      addResource(w, a.carryType, a.carry);
      w.events.push({
        type: 'float',
        x: a.x,
        y: a.y - 10,
        text: `+${a.carry}`,
        color: a.carryType === 'food' ? '#ff8a7a' : '#d9b27a',
      });
      w.events.push({ type: 'sfx', id: 'deposit' });
      a.carry = 0;
      a.carryType = null;
    }
    return;
  }

  let target = a.targetId === null ? undefined : ctx.nodeById.get(a.targetId);
  if (target && target.amount <= 0) target = undefined;

  if (a.gatherTimer > 0) {
    a.gatherTimer -= dt;
    if (a.gatherTimer <= 0 && target) {
      const n = Math.min(carryOf(w, a), Math.ceil(target.amount));
      target.amount -= n;
      a.carry = n;
      a.carryType = target.type;
    }
    return;
  }

  if (!target) {
    target = findNode(w, a, ctx) ?? undefined;
    a.targetId = target?.id ?? null;
    if (target) ctx.crowd.set(target.id, (ctx.crowd.get(target.id) ?? 0) + 1);
  }
  if (!target) {
    moveToward(a, w.nest.x + a.off.x * 2, w.nest.y + a.off.y * 2, speed * 0.4, dt, 4);
    return;
  }
  if (moveToward(a, target.x, target.y, speed, dt, 6)) a.gatherTimer = BALANCE.gatherTime;
}

export function gatherSystem(w: World, dt: number, ctx: TickContext): void {
  for (const a of w.ants) {
    if (ANTS[a.kind].role === 'gatherer') updateGatherer(w, a, dt, ctx);
  }
}
