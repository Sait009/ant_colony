import { WORLD_VERSION } from '../sim/world';
import type { World } from '../sim/types';

const KEY = 'ant-colony:save';

export interface SaveFile {
  v: number;
  savedAt: number;
  world: Omit<World, 'events'>;
}

/** Storage abstraction so a cloud backend can replace localStorage later. */
export interface SaveStorage {
  get(): string | null;
  set(data: string): void;
  clear(): void;
}

export const localStorageAdapter: SaveStorage = {
  get: () => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set: (d) => {
    try {
      localStorage.setItem(KEY, d);
    } catch {
      /* storage full or blocked: saving is best-effort */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
};

/** Each entry upgrades a world saved at version N to N+1. */
export const MIGRATIONS: Record<number, (w: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 -> v2: rooms were added
  1: (w) => ({ ...w, rooms: [] }),
};

export function serialize(w: World, now = Date.now()): string {
  const rest: Partial<World> = { ...w };
  delete rest.events;
  const file: SaveFile = { v: WORLD_VERSION, savedAt: now, world: rest as SaveFile['world'] };
  return JSON.stringify(file);
}

export function deserialize(raw: string): World | null {
  try {
    const file = JSON.parse(raw) as { v?: number; world?: Record<string, unknown> };
    if (typeof file.v !== 'number' || !file.world || file.v > WORLD_VERSION) return null;
    let world = file.world;
    for (let v = file.v; v < WORLD_VERSION; v++) {
      const migrate = MIGRATIONS[v];
      if (!migrate) return null;
      world = migrate(world);
      world.version = v + 1;
    }
    return { ...(world as unknown as Omit<World, 'events'>), events: [] };
  } catch {
    return null;
  }
}

export const saveGame = (w: World, store: SaveStorage = localStorageAdapter): void =>
  store.set(serialize(w));

export function loadGame(store: SaveStorage = localStorageAdapter): World | null {
  const raw = store.get();
  return raw ? deserialize(raw) : null;
}
