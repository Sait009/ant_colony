import { ANTS, ENEMIES } from '../../data/defs';
import { moveToward } from '../movement';
import { damageMul, nestRadius } from '../stats';
import type { Ant, Enemy, World } from '../types';
import type { TickContext } from './context';

const AGGRO_RANGE = 200;
const NEST_GUARD_RANGE = 220;
const ENEMY_SIGHT = 90;
const ENEMY_COOLDOWN = 1;

function updateFighter(w: World, a: Ant, dt: number, ctx: TickContext): void {
  const def = ANTS[a.kind];
  a.cd -= dt;
  const e =
    ctx.enemyGrid.nearest(a.x, a.y, AGGRO_RANGE) ??
    ctx.enemyGrid.nearest(w.nest.x, w.nest.y, nestRadius(w) + NEST_GUARD_RANGE);
  if (e) {
    const arrived = moveToward(a, e.x, e.y, def.speed * 1.1, dt, ENEMIES[e.kind].radius + 6);
    if (arrived && a.cd <= 0) {
      e.hp -= def.damage * damageMul(w);
      a.cd = def.cooldown;
      w.events.push({ type: 'sfx', id: 'hit' });
    }
    return;
  }
  moveToward(a, w.rally.x + a.off.x, w.rally.y + a.off.y, def.speed, dt, 4);
}

function updateEnemy(w: World, e: Enemy, dt: number, ctx: TickContext): void {
  const def = ENEMIES[e.kind];
  e.cd -= dt;
  const prey = ctx.antGrid.nearest(e.x, e.y, ENEMY_SIGHT);
  if (prey) {
    if (moveToward(e, prey.x, prey.y, def.speed, dt, def.radius + 4) && e.cd <= 0) {
      prey.hp -= e.dmg;
      e.cd = ENEMY_COOLDOWN;
    }
    return;
  }
  if (
    moveToward(e, w.nest.x, w.nest.y, def.speed, dt, nestRadius(w) + def.radius - 6) &&
    e.cd <= 0
  ) {
    w.nest.hp -= e.dmg;
    e.cd = ENEMY_COOLDOWN;
  }
}

export function combatSystem(w: World, dt: number, ctx: TickContext): void {
  for (const a of w.ants) if (ANTS[a.kind].role === 'fighter') updateFighter(w, a, dt, ctx);
  for (const e of w.enemies) updateEnemy(w, e, dt, ctx);
}
