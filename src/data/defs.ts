import type { AntId, Cost, EnemyId, ResourceId, RoomId, TechId, UpgradeId } from '../sim/types';

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
  /** body colour (render) */
  color: number;
  hp: number;
  speed: number;
  cost: Cost;
  /** render scale */
  scale: number;
  damage: number;
  cooldown: number;
  /** attack range in px; 0 = melee */
  range: number;
  /** multiplies carried amount (gatherers) */
  carryMul: number;
  /** technology required before this ant can be trained */
  requires?: TechId;
}

export const ANTS: Record<AntId, AntDef> = {
  worker: {
    id: 'worker',
    role: 'gatherer',
    icon: '🐜',
    color: 0x2b1a12,
    hp: 10,
    speed: 62,
    cost: { food: 10 },
    scale: 1,
    damage: 0,
    cooldown: 0,
    range: 0,
    carryMul: 1,
  },
  forager: {
    id: 'forager',
    role: 'gatherer',
    icon: '🧺',
    color: 0x6b4a22,
    hp: 8,
    speed: 92,
    cost: { food: 18 },
    scale: 0.9,
    damage: 0,
    cooldown: 0,
    range: 0,
    carryMul: 1.5,
    requires: 'foraging',
  },
  soldier: {
    id: 'soldier',
    role: 'fighter',
    icon: '⚔️',
    color: 0x8c2a1c,
    hp: 40,
    speed: 55,
    cost: { food: 25, twigs: 5 },
    scale: 1.25,
    damage: 8,
    cooldown: 0.6,
    range: 0,
    carryMul: 1,
  },
  spitter: {
    id: 'spitter',
    role: 'fighter',
    icon: '💦',
    color: 0x2f7f8c,
    hp: 25,
    speed: 55,
    cost: { food: 30, twigs: 15 },
    scale: 1.1,
    damage: 6,
    cooldown: 0.9,
    range: 85,
    carryMul: 1,
    requires: 'acid',
  },
  bulldog: {
    id: 'bulldog',
    role: 'fighter',
    icon: '🪖',
    color: 0x4a1010,
    hp: 130,
    speed: 42,
    cost: { food: 55, twigs: 35 },
    scale: 1.7,
    damage: 16,
    cooldown: 0.8,
    range: 0,
    carryMul: 1,
    requires: 'heavy',
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

/** Additive modifiers granted by technologies. */
export interface TechMods {
  /** flat extra carry per trip */
  carry: number;
  /** fraction faster gatherer movement */
  gatherSpeed: number;
  /** fraction bonus HP for newly trained ants */
  hp: number;
  /** fraction bonus damage for all fighters */
  damage: number;
}

export interface TechDef {
  id: TechId;
  icon: string;
  /** column in the tree (display) */
  tier: number;
  cost: Cost;
  requires: TechId[];
  mods?: Partial<TechMods>;
}

export const TECHS: Record<TechId, TechDef> = {
  foraging: { id: 'foraging', icon: '🧭', tier: 1, cost: { food: 40 }, requires: [] },
  acid: { id: 'acid', icon: '🧪', tier: 1, cost: { food: 50, twigs: 30 }, requires: [] },
  chitin: {
    id: 'chitin',
    icon: '🦴',
    tier: 1,
    cost: { food: 60, twigs: 40 },
    requires: [],
    mods: { hp: 0.2 },
  },
  logistics: {
    id: 'logistics',
    icon: '🎒',
    tier: 2,
    cost: { food: 60, twigs: 30 },
    requires: ['foraging'],
    mods: { carry: 2, gatherSpeed: 0.15 },
  },
  venom: {
    id: 'venom',
    icon: '☠️',
    tier: 2,
    cost: { food: 80, twigs: 60 },
    requires: ['acid'],
    mods: { damage: 0.2 },
  },
  heavy: {
    id: 'heavy',
    icon: '🪲',
    tier: 3,
    cost: { food: 100, twigs: 80 },
    requires: ['chitin', 'acid'],
  },
};
