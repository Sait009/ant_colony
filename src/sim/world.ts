import { clamp } from '../core/math';
import { nextFloat, randRange } from '../core/rng';
import { BALANCE } from '../data/balance';
import { ANTS, RESOURCES } from '../data/defs';
import { nestRadius, roomMods, techMods } from './stats';
import type { Ant, AntId, ResourceId, ResourceNode, World } from './types';

/** Bump when the shape of `World` changes and add a migration in save/migrations.ts. */
export const WORLD_VERSION = 3;

export function createWorld(seed: number): World {
  const c = BALANCE.worldSize / 2;
  const w: World = {
    version: WORLD_VERSION,
    rng: seed | 0,
    nextId: 1,
    tick: 0,
    time: 0,
    status: 'playing',
    res: { food: BALANCE.start.food, twigs: BALANCE.start.twigs },
    upgrades: { nest: 0, carry: 0, weapon: 0 },
    nest: { x: c, y: c, hp: 200, maxHp: 200 },
    rooms: [],
    techs: [],
    rally: { x: c + 110, y: c + 40 },
    ants: [],
    enemies: [],
    nodes: [],
    wave: { number: 0, timer: BALANCE.firstWave },
    timers: { nodeRespawn: BALANCE.nodeRespawn, egg: BALANCE.eggInterval },
    events: [],
  };
  for (let i = 0; i < BALANCE.initialNodes; i++) spawnNode(w, 150, 700);
  for (let i = 0; i < BALANCE.start.workers; i++) spawnAnt(w, 'worker');
  for (let i = 0; i < BALANCE.start.soldiers; i++) spawnAnt(w, 'soldier');
  return w;
}

export function spawnNode(w: World, rMin: number, rMax: number): ResourceNode {
  const a = randRange(w, 0, Math.PI * 2);
  const r = randRange(w, rMin, rMax);
  const type = pickResource(w);
  const [lo, hi] = RESOURCES[type].amount;
  const amount = randRange(w, lo, hi);
  const size = BALANCE.worldSize;
  const node: ResourceNode = {
    id: w.nextId++,
    x: clamp(w.nest.x + Math.cos(a) * r, 40, size - 40),
    y: clamp(w.nest.y + Math.sin(a) * r, 40, size - 40),
    type,
    amount,
    max: amount,
    marked: false,
    rot: randRange(w, 0, Math.PI),
  };
  w.nodes.push(node);
  return node;
}

function pickResource(w: World): ResourceId {
  const defs = Object.values(RESOURCES);
  let roll = nextFloat(w) * defs.reduce((s, d) => s + d.weight, 0);
  for (const d of defs) {
    roll -= d.weight;
    if (roll <= 0) return d.id;
  }
  return defs[0]!.id;
}

export function spawnAnt(w: World, kind: AntId): Ant {
  const def = ANTS[kind];
  const a = randRange(w, 0, Math.PI * 2);
  const r = nestRadius(w);
  const hp = def.hp * (1 + techMods(w).hp + (def.role === 'fighter' ? roomMods(w).soldierHp : 0));
  const ant: Ant = {
    id: w.nextId++,
    kind,
    x: w.nest.x + Math.cos(a) * r,
    y: w.nest.y + Math.sin(a) * r,
    angle: a,
    walk: randRange(w, 0, 6),
    hp,
    maxHp: hp,
    cd: 0,
    carry: 0,
    carryType: null,
    gatherTimer: 0,
    targetId: null,
    off: { x: randRange(w, -45, 45), y: randRange(w, -45, 45) },
  };
  w.ants.push(ant);
  return ant;
}
