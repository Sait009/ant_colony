import { BALANCE } from '../data/balance';
import { ROOMS, type Mods } from '../data/defs';
import type { World } from './types';

export const nestLevel = (w: World): number => 1 + w.upgrades.nest;
export const nestRadius = (w: World): number => 34 + nestLevel(w) * 6;
export const roomSlots = (w: World): number => BALANCE.baseRoomSlots + nestLevel(w);
export const carryCap = (w: World): number =>
  BALANCE.carryBase + w.upgrades.carry * BALANCE.carryPerLevel;
export const damageMul = (w: World): number => 1 + w.upgrades.weapon * BALANCE.damagePerWeaponLevel;

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
