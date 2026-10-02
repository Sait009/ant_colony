import { nextFloat, randRange } from '../../core/rng';
import { BALANCE } from '../../data/balance';
import { ENEMIES, type EnemyDef } from '../../data/defs';
import type { Direction } from '../events';
import type { World } from '../types';

const DIRS: Direction[] = ['east', 'south', 'west', 'north'];

function pickEnemy(w: World, wave: number): EnemyDef {
  const pool = Object.values(ENEMIES).filter((d) => d.minWave <= wave);
  let roll = nextFloat(w) * pool.reduce((s, d) => s + d.weight, 0);
  for (const d of pool) {
    roll -= d.weight;
    if (roll <= 0) return d;
  }
  return pool[0]!;
}

export function spawnWave(w: World): void {
  const n = ++w.wave.number;
  const count = Math.round(BALANCE.waveCountBase + n * BALANCE.waveCountPerWave);
  const ang = randRange(w, 0, Math.PI * 2);
  const radius = BALANCE.worldSize / 2 - 80;
  const hpScale = 1 + n * BALANCE.enemyHpPerWave;
  const dmgScale = 1 + n * BALANCE.enemyDmgPerWave;

  for (let i = 0; i < count; i++) {
    const def = pickEnemy(w, n);
    w.enemies.push({
      id: w.nextId++,
      kind: def.id,
      x: w.nest.x + Math.cos(ang) * radius + randRange(w, -70, 70),
      y: w.nest.y + Math.sin(ang) * radius + randRange(w, -70, 70),
      angle: ang + Math.PI,
      walk: 0,
      hp: def.hp * hpScale,
      maxHp: def.hp * hpScale,
      dmg: def.dmg * dmgScale,
      cd: 0,
    });
  }
  const dir =
    DIRS[Math.round((((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2)) % 4]!;
  w.events.push({ type: 'waveStart', number: n, dir });
  w.events.push({ type: 'sfx', id: 'wave' });
  w.wave.timer = n >= BALANCE.winWave ? Infinity : BALANCE.waveInterval;
}

export function wavesSystem(w: World, dt: number): void {
  if ((w.wave.timer -= dt) <= 0) spawnWave(w);
}
