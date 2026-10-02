import type { AntId, Cost, EnemyId, ResourceId, UpgradeId } from '../sim/types';

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
