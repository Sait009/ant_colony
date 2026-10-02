import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { applyCommand } from '../src/sim/commands';
import { SIM_DT, step } from '../src/sim/step';
import { popCap } from '../src/sim/stats';
import { createWorld } from '../src/sim/world';
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
