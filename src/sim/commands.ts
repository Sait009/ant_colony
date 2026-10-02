import { clamp, type Vec2 } from '../core/math';
import { BALANCE } from '../data/balance';
import { ANTS, ROOMS, UPGRADES } from '../data/defs';
import { nestLevel, popCap, roomSlots } from './stats';
import type { AntId, Cost, RoomId, UpgradeId, World } from './types';
import { spawnAnt } from './world';

/** Every player intent goes through a command: easy to validate, record, replay and sync later. */
export type Command =
  | { type: 'spawnAnt'; ant: AntId }
  | { type: 'buyUpgrade'; id: UpgradeId }
  | { type: 'repair' }
  | { type: 'buildRoom'; kind: RoomId }
  | { type: 'upgradeRoom'; roomId: number }
  | { type: 'setRally'; pos: Vec2 }
  | { type: 'toggleMark'; nodeId: number };

export type CommandResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'notPlaying'
        | 'noResources'
        | 'popCap'
        | 'maxLevel'
        | 'notFound'
        | 'full'
        | 'noSlot'
        | 'locked';
    };

export const canAfford = (w: World, c: Cost): boolean =>
  (c.food ?? 0) <= w.res.food && (c.twigs ?? 0) <= w.res.twigs;

function pay(w: World, c: Cost): void {
  w.res.food -= c.food ?? 0;
  w.res.twigs -= c.twigs ?? 0;
}

const fail = (w: World, reason: Extract<CommandResult, { ok: false }>['reason']): CommandResult => {
  w.events.push({ type: 'sfx', id: 'error' });
  return { ok: false, reason };
};

export function applyCommand(w: World, cmd: Command): CommandResult {
  if (w.status !== 'playing') return { ok: false, reason: 'notPlaying' };

  switch (cmd.type) {
    case 'spawnAnt': {
      const def = ANTS[cmd.ant];
      if (w.ants.length >= popCap(w)) return fail(w, 'popCap');
      if (!canAfford(w, def.cost)) return fail(w, 'noResources');
      pay(w, def.cost);
      spawnAnt(w, cmd.ant);
      w.events.push({ type: 'sfx', id: 'spawn' });
      return { ok: true };
    }
    case 'buyUpgrade': {
      const def = UPGRADES[cmd.id];
      const level = w.upgrades[cmd.id];
      if (level >= def.max) return fail(w, 'maxLevel');
      const cost = def.cost(level);
      if (!canAfford(w, cost)) return fail(w, 'noResources');
      pay(w, cost);
      w.upgrades[cmd.id]++;
      if (cmd.id === 'nest') {
        w.nest.maxHp += 100;
        w.nest.hp += 100;
        w.events.push({
          type: 'toast',
          key: 'toast.nestUp',
          params: { level: nestLevel(w), cap: popCap(w) },
        });
      }
      w.events.push({ type: 'sfx', id: 'upgrade' });
      return { ok: true };
    }
    case 'repair': {
      if (w.nest.hp >= w.nest.maxHp) return fail(w, 'full');
      if (!canAfford(w, BALANCE.repair.cost)) return fail(w, 'noResources');
      pay(w, BALANCE.repair.cost);
      w.nest.hp = Math.min(w.nest.maxHp, w.nest.hp + BALANCE.repair.amount);
      w.events.push({ type: 'sfx', id: 'upgrade' });
      return { ok: true };
    }
    case 'buildRoom': {
      const def = ROOMS[cmd.kind];
      if (nestLevel(w) < def.minNestLevel) return fail(w, 'locked');
      if (w.rooms.length >= roomSlots(w)) return fail(w, 'noSlot');
      const cost = def.cost(0);
      if (!canAfford(w, cost)) return fail(w, 'noResources');
      pay(w, cost);
      w.rooms.push({ id: w.nextId++, kind: cmd.kind, level: 1 });
      w.events.push({ type: 'toast', key: 'toast.roomBuilt', params: { room: cmd.kind } });
      w.events.push({ type: 'sfx', id: 'upgrade' });
      return { ok: true };
    }
    case 'upgradeRoom': {
      const room = w.rooms.find((r) => r.id === cmd.roomId);
      if (!room) return fail(w, 'notFound');
      const def = ROOMS[room.kind];
      if (room.level >= def.max) return fail(w, 'maxLevel');
      const cost = def.cost(room.level);
      if (!canAfford(w, cost)) return fail(w, 'noResources');
      pay(w, cost);
      room.level++;
      w.events.push({ type: 'sfx', id: 'upgrade' });
      return { ok: true };
    }
    case 'setRally': {
      w.rally.x = clamp(cmd.pos.x, 0, BALANCE.worldSize);
      w.rally.y = clamp(cmd.pos.y, 0, BALANCE.worldSize);
      return { ok: true };
    }
    case 'toggleMark': {
      const n = w.nodes.find((x) => x.id === cmd.nodeId);
      if (!n) return fail(w, 'notFound');
      n.marked = !n.marked;
      w.events.push({ type: 'toast', key: n.marked ? 'toast.pinOn' : 'toast.pinOff' });
      return { ok: true };
    }
  }
}
