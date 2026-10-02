import { BALANCE } from '../data/balance';
import { ANTS, ROOMS, TECHS, type Mods, type TechMods } from '../data/defs';
import type { AntId, Ant, World } from './types';

export const nestLevel = (w: World): number => 1 + w.upgrades.nest;
export const nestRadius = (w: World): number => 34 + nestLevel(w) * 6;
export const roomSlots = (w: World): number => BALANCE.baseRoomSlots + nestLevel(w);

/** Sum of all room effects (level-scaled). */
export function roomMods(w: World): Mods {
  const m: Mods = { foodPerSec: 0, eggSpeed: 0, storage: 0, popCap: 0, soldierHp: 0 };
  for (const r of w.rooms) {
    const per = ROOMS[r.kind].perLevel;
    for (const k of Object.keys(per) as Array<keyof Mods>) m[k] += (per[k] ?? 0) * r.level;
  }
  return m;
}

export const popCap = (w: World): number =>
  BALANCE.baseCap + w.upgrades.nest * BALANCE.capPerNestLevel + roomMods(w).popCap;
export const storageCap = (w: World): number => BALANCE.baseStorage + roomMods(w).storage;

/** Sum of all researched technology effects. */
export function techMods(w: World): TechMods {
  const m: TechMods = { carry: 0, gatherSpeed: 0, hp: 0, damage: 0 };
  for (const id of w.techs) {
    const mods = TECHS[id].mods;
    if (!mods) continue;
    for (const k of Object.keys(mods) as Array<keyof TechMods>) m[k] += mods[k] ?? 0;
  }
  return m;
}

export const isUnlocked = (w: World, ant: AntId): boolean => {
  const req = ANTS[ant].requires;
  return !req || w.techs.includes(req);
};

/** Amount one trip of `a` can carry. */
export const carryOf = (w: World, a: Ant): number =>
  Math.round(
    (BALANCE.carryBase + w.upgrades.carry * BALANCE.carryPerLevel + techMods(w).carry) *
      ANTS[a.kind].carryMul,
  );

export const damageMul = (w: World): number =>
  1 + w.upgrades.weapon * BALANCE.damagePerWeaponLevel + techMods(w).damage;

export const antSpeed = (w: World, a: Ant): number => {
  const def = ANTS[a.kind];
  return def.role === 'gatherer' ? def.speed * (1 + techMods(w).gatherSpeed) : def.speed;
};
