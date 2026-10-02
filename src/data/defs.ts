import type { AntId, Cost, EnemyId, ResourceId, RoomId, UpgradeId } from '../sim/types';

export interface ResourceDef {
  id: ResourceId;
  icon: string;
  color: string;
  /** spawn amount range for a node */
  amount: [number, number];
  weight: number;
}

export const RESOURCES: Record<ResourceId, ResourceDef> = {
  food: { id: 'food', icon: '🍓', color: '#ff8a7a', amount: [60, 120], weight: 0.6 },
  twigs: { id: 'twigs', icon: '🪵', color: '#d9b27a', amount: [40, 80], weight: 0.4 },
};

export type AntRole = 'gatherer' | 'fighter';

export interface AntDef {
  id: AntId;
  role: AntRole;
  icon: string;
  hp: number;
  speed: number;
  cost: Cost;
  /** render scale */
  scale: number;
  damage: number;
  cooldown: number;
}

export const ANTS: Record<AntId, AntDef> = {
  worker: {
    id: 'worker',
    role: 'gatherer',
    icon: '🐜',
    hp: 10,
    speed: 62,
    cost: { food: 10 },
    scale: 1,
    damage: 0,
    cooldown: 0,
  },
  soldier: {
    id: 'soldier',
    role: 'fighter',
    icon: '⚔️',
    hp: 40,
    speed: 55,
    cost: { food: 25, twigs: 5 },
    scale: 1.25,
    damage: 8,
    cooldown: 0.6,
  },
};

export interface EnemyDef {
  id: EnemyId;
  hp: number;
  dmg: number;
  speed: number;
  radius: number;
  /** first wave this enemy may appear in */
  minWave: number;
  /** relative spawn weight among eligible enemies */
  weight: number;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  spider: { id: 'spider', hp: 40, dmg: 6, speed: 42, radius: 9, minWave: 1, weight: 0.45 },
  beetle: { id: 'beetle', hp: 120, dmg: 10, speed: 26, radius: 13, minWave: 3, weight: 0.25 },
  wasp: { id: 'wasp', hp: 30, dmg: 5, speed: 78, radius: 8, minWave: 5, weight: 0.3 },
};

export interface UpgradeDef {
  id: UpgradeId;
  icon: string;
  max: number;
  /** cost to go from `level` to `level + 1` */
  cost: (level: number) => Cost;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  nest: {
    id: 'nest',
    icon: '🏰',
    max: 4,
    cost: (l) => ({ food: 20 * (l + 1), twigs: 30 * (l + 1) }),
  },
  carry: { id: 'carry', icon: '🎒', max: 5, cost: (l) => ({ food: 30 * (l + 1) }) },
  weapon: {
    id: 'weapon',
    icon: '🗡️',
    max: 5,
    cost: (l) => ({ food: 25 * (l + 1), twigs: 10 * (l + 1) }),
  },
};

/** Additive stat modifiers granted by rooms (per level). */
export interface Mods {
  /** passive food income per second */
  foodPerSec: number;
  /** fraction faster egg laying */
  eggSpeed: number;
  storage: number;
  popCap: number;
  /** fraction bonus HP for newly trained soldiers */
  soldierHp: number;
}

export interface RoomDef {
  id: RoomId;
  icon: string;
  color: number;
  max: number;
  minNestLevel: number;
  /** cost to build (level 0) or to go from `level` to `level + 1` */
  cost: (level: number) => Cost;
  perLevel: Partial<Mods>;
}

export const ROOMS: Record<RoomId, RoomDef> = {
  farm: {
    id: 'farm',
    icon: '🍄',
    color: 0x8a6fb0,
    max: 3,
    minNestLevel: 1,
    cost: (l) => ({ food: 20 + 20 * l, twigs: 30 + 20 * l }),
    perLevel: { foodPerSec: 0.6 },
  },
  nursery: {
    id: 'nursery',
    icon: '🥚',
    color: 0xe8d9a8,
    max: 3,
    minNestLevel: 1,
    cost: (l) => ({ food: 30, twigs: 40 * (l + 1) }),
    perLevel: { eggSpeed: 0.35 },
  },
  storage: {
    id: 'storage',
    icon: '📦',
    color: 0xb08a55,
    max: 3,
    minNestLevel: 1,
    cost: (l) => ({ twigs: 30 * (l + 1) }),
    perLevel: { storage: 150 },
  },
  barracks: {
    id: 'barracks',
    icon: '🛡️',
    color: 0xb5493a,
    max: 3,
    minNestLevel: 2,
    cost: (l) => ({ food: 40 * (l + 1), twigs: 40 * (l + 1) }),
    perLevel: { popCap: 4, soldierHp: 0.5 },
  },
};
