import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { applyCommand } from '../src/sim/commands';
import { SIM_DT, step } from '../src/sim/step';
import { popCap } from '../src/sim/stats';
import { carryOf } from '../src/sim/stats';
import { createWorld, spawnAnt } from '../src/sim/world';
import { deserialize, serialize } from '../src/save/save';
import type { World } from '../src/sim/types';

const run = (w: World, seconds: number) => {
  for (let i = 0; i < seconds / SIM_DT; i++) step(w);
};
const snap = (w: World) => JSON.stringify({ ...w, events: [] });

describe('simulation', () => {
  it('is deterministic for a given seed', () => {
    const a = createWorld(42);
    const b = createWorld(42);
    run(a, 120);
    run(b, 120);
    expect(snap(a)).toBe(snap(b));
    expect(snap(createWorld(43))).not.toBe(snap(createWorld(42)));
  });

  it('workers gather and deposit resources', () => {
    const w = createWorld(1);
    const before = w.res.food + w.res.twigs;
    run(w, 40);
    expect(w.res.food + w.res.twigs).toBeGreaterThan(before);
  });

  it('spawns the first wave on schedule and announces it', () => {
    const w = createWorld(1);
    run(w, BALANCE.firstWave - 1);
    expect(w.wave.number).toBe(0);
    run(w, 2);
    expect(w.wave.number).toBe(1);
    expect(w.events.some((e) => e.type === 'waveStart')).toBe(true);
  });

  it('loses when the nest is destroyed', () => {
    const w = createWorld(1);
    w.nest.hp = 0;
    step(w);
    expect(w.status).toBe('lost');
  });

  it('wins after the final wave is cleared', () => {
    const w = createWorld(1);
    w.wave.number = BALANCE.winWave;
    step(w);
    expect(w.status).toBe('won');
  });
});

describe('commands', () => {
  it('spawns an ant and deducts cost', () => {
    const w = createWorld(1);
    w.res.food = 100;
    const n = w.ants.length;
    expect(applyCommand(w, { type: 'spawnAnt', ant: 'worker' }).ok).toBe(true);
    expect(w.ants.length).toBe(n + 1);
    expect(w.res.food).toBe(90);
  });

  it('rejects when resources are short or population is capped', () => {
    const w = createWorld(1);
    w.res.food = 0;
    expect(applyCommand(w, { type: 'spawnAnt', ant: 'worker' })).toEqual({
      ok: false,
      reason: 'noResources',
    });
    w.res.food = 999;
    while (w.ants.length < popCap(w)) applyCommand(w, { type: 'spawnAnt', ant: 'worker' });
    expect(applyCommand(w, { type: 'spawnAnt', ant: 'worker' })).toEqual({
      ok: false,
      reason: 'popCap',
    });
  });

  it('upgrades the nest, raising pop cap and HP', () => {
    const w = createWorld(1);
    w.res.food = 999;
    w.res.twigs = 999;
    const cap = popCap(w);
    expect(applyCommand(w, { type: 'buyUpgrade', id: 'nest' }).ok).toBe(true);
    expect(popCap(w)).toBeGreaterThan(cap);
    expect(w.nest.maxHp).toBe(300);
  });

  it('stops upgrades at max level', () => {
    const w = createWorld(1);
    w.res.food = 1e6;
    w.res.twigs = 1e6;
    for (let i = 0; i < 10; i++) applyCommand(w, { type: 'buyUpgrade', id: 'carry' });
    expect(w.upgrades.carry).toBe(5);
  });
});

describe('save', () => {
  it('round-trips world state and continues identically', () => {
    const a = createWorld(7);
    run(a, 30);
    const b = deserialize(serialize(a))!;
    expect(snap(b)).toBe(snap(a));
    run(a, 30);
    run(b, 30);
    expect(snap(b)).toBe(snap(a));
  });

  it('rejects corrupt or future saves', () => {
    expect(deserialize('not json')).toBeNull();
    expect(deserialize(JSON.stringify({ v: 999, world: {} }))).toBeNull();
  });
});

describe('rooms', () => {
  const rich = () => {
    const w = createWorld(1);
    w.res.food = 250;
    w.res.twigs = 250;
    return w;
  };

  it('builds a room into a free slot and pays for it', () => {
    const w = rich();
    expect(applyCommand(w, { type: 'buildRoom', kind: 'farm' }).ok).toBe(true);
    expect(w.rooms).toHaveLength(1);
    expect(w.res.food).toBeLessThan(250);
  });

  it('respects slot count and nest level requirements', () => {
    const w = rich();
    expect(applyCommand(w, { type: 'buildRoom', kind: 'barracks' })).toEqual({
      ok: false,
      reason: 'locked',
    });
    for (let i = 0; i < 3; i++) applyCommand(w, { type: 'buildRoom', kind: 'storage' });
    expect(applyCommand(w, { type: 'buildRoom', kind: 'storage' })).toEqual({
      ok: false,
      reason: 'noSlot',
    });
  });

  it('farm produces food and storage raises the stockpile cap', () => {
    const w = rich();
    w.res.food = 0;
    w.rooms.push({ id: 900, kind: 'farm', level: 2 });
    w.ants = [];
    run(w, 10);
    expect(w.res.food).toBeCloseTo(0.6 * 2 * 10, 0);

    const capped = createWorld(1);
    capped.res.twigs = 0;
    capped.ants = [];
    capped.rooms.push({ id: 901, kind: 'farm', level: 3 });
    capped.res.food = 299;
    run(capped, 10);
    expect(capped.res.food).toBe(300);
  });

  it('upgrades a room up to its max level', () => {
    const w = rich();
    w.res.food = 9999;
    w.res.twigs = 9999;
    applyCommand(w, { type: 'buildRoom', kind: 'nursery' });
    const id = w.rooms[0]!.id;
    for (let i = 0; i < 5; i++) applyCommand(w, { type: 'upgradeRoom', roomId: id });
    expect(w.rooms[0]!.level).toBe(3);
  });
});

describe('save migration', () => {
  it('upgrades a v1 save by adding rooms', () => {
    const w = createWorld(3);
    const old = JSON.parse(serialize(w));
    old.v = 1;
    delete old.world.rooms;
    const loaded = deserialize(JSON.stringify(old))!;
    expect(loaded.rooms).toEqual([]);
    expect(loaded.version).toBe(3);
  });
});

describe('technology & unit variety', () => {
  const rich = () => {
    const w = createWorld(1);
    w.res.food = 999;
    w.res.twigs = 999;
    return w;
  };

  it('gates units behind their technology', () => {
    const w = rich();
    expect(applyCommand(w, { type: 'spawnAnt', ant: 'spitter' })).toEqual({
      ok: false,
      reason: 'locked',
    });
    expect(applyCommand(w, { type: 'research', id: 'acid' }).ok).toBe(true);
    expect(applyCommand(w, { type: 'spawnAnt', ant: 'spitter' }).ok).toBe(true);
  });

  it('enforces tech prerequisites and prevents double research', () => {
    const w = rich();
    expect(applyCommand(w, { type: 'research', id: 'logistics' })).toEqual({
      ok: false,
      reason: 'locked',
    });
    applyCommand(w, { type: 'research', id: 'foraging' });
    expect(applyCommand(w, { type: 'research', id: 'foraging' })).toEqual({
      ok: false,
      reason: 'owned',
    });
    expect(applyCommand(w, { type: 'research', id: 'logistics' }).ok).toBe(true);
  });

  it('chitin boosts HP of newly trained ants only', () => {
    const w = rich();
    const before = w.ants.find((a) => a.kind === 'soldier')!.maxHp;
    applyCommand(w, { type: 'research', id: 'chitin' });
    applyCommand(w, { type: 'spawnAnt', ant: 'soldier' });
    const fresh = w.ants[w.ants.length - 1]!;
    expect(fresh.maxHp).toBeCloseTo(before * 1.2);
    expect(w.ants.find((a) => a.kind === 'soldier')!.maxHp).toBe(before);
  });

  it('spitters attack from range without closing in', () => {
    const w = createWorld(5);
    w.ants = [];
    w.techs.push('acid');
    const s = spawnAnt(w, 'spitter');
    s.x = 1000;
    s.y = 1000;
    w.enemies.push({
      id: 999,
      kind: 'beetle',
      x: 1070,
      y: 1000,
      angle: 0,
      walk: 0,
      hp: 120,
      maxHp: 120,
      cd: 5,
      dmg: 0,
    });
    for (let i = 0; i < 30; i++) step(w);
    const e = w.enemies[0]!;
    expect(e.hp).toBeLessThan(120);
    // already inside its 85px range, so the spitter shoots without moving
    expect(s.x).toBeCloseTo(1000);
    expect(s.y).toBeCloseTo(1000);
    expect(w.events.some((ev) => ev.type === 'shot')).toBe(true);
  });

  it('foragers carry more than workers', () => {
    const w = createWorld(1);
    const forager = spawnAnt(w, 'forager');
    const worker = w.ants.find((a) => a.kind === 'worker')!;
    expect(carryOf(w, forager)).toBeGreaterThan(carryOf(w, worker));
  });

  it('migrates v2 saves by adding techs', () => {
    const old = JSON.parse(serialize(createWorld(3)));
    old.v = 2;
    delete old.world.techs;
    const loaded = deserialize(JSON.stringify(old))!;
    expect(loaded.techs).toEqual([]);
    expect(loaded.version).toBe(3);
  });
});
