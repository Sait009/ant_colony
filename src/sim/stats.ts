import { BALANCE } from '../data/balance';
import type { World } from './types';

export const nestLevel = (w: World): number => 1 + w.upgrades.nest;
export const nestRadius = (w: World): number => 34 + nestLevel(w) * 6;
export const popCap = (w: World): number =>
  BALANCE.baseCap + w.upgrades.nest * BALANCE.capPerNestLevel;
export const carryCap = (w: World): number =>
  BALANCE.carryBase + w.upgrades.carry * BALANCE.carryPerLevel;
export const damageMul = (w: World): number => 1 + w.upgrades.weapon * BALANCE.damagePerWeaponLevel;
