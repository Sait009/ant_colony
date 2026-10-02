import type { Vec2 } from '../core/math';
import type { GameEvent } from './events';

export type ResourceId = 'food' | 'twigs';
export type AntId = 'worker' | 'soldier';
export type EnemyId = 'spider' | 'beetle' | 'wasp';
export type UpgradeId = 'nest' | 'carry' | 'weapon';
export type Cost = Partial<Record<ResourceId, number>>;

export interface Body extends Vec2 {
  id: number;
  angle: number;
  walk: number;
  hp: number;
  maxHp: number;
  /** attack cooldown (seconds) */
  cd: number;
}

export interface Ant extends Body {
  kind: AntId;
  carry: number;
  carryType: ResourceId | null;
  gatherTimer: number;
  targetId: number | null;
  /** idle offset around rally/nest so units do not stack */
  off: Vec2;
}

export interface Enemy extends Body {
  kind: EnemyId;
  dmg: number;
}

export interface ResourceNode extends Vec2 {
  id: number;
  type: ResourceId;
  amount: number;
  max: number;
  marked: boolean;
  rot: number;
}

export interface Nest extends Vec2 {
  hp: number;
  maxHp: number;
}

export type GameStatus = 'playing' | 'won' | 'lost';

/** Whole simulation state. Plain data only (JSON-serializable) except `events`. */
export interface World {
  version: number;
  rng: number;
  nextId: number;
  tick: number;
  time: number;
  status: GameStatus;
  res: Record<ResourceId, number>;
  upgrades: Record<UpgradeId, number>;
  nest: Nest;
  rally: Vec2;
  ants: Ant[];
  enemies: Enemy[];
  nodes: ResourceNode[];
  wave: { number: number; timer: number };
  timers: { nodeRespawn: number; egg: number };
  /** transient output queue, drained by the host each frame; never saved */
  events: GameEvent[];
}
