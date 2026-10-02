import type { Vec2 } from '../core/math';

/** Uniform grid for neighbourhood queries; rebuilt every tick. */
export class SpatialGrid<T extends Vec2 & { hp: number }> {
  private cells = new Map<number, T[]>();

  constructor(private readonly size = 128) {}

  private key(cx: number, cy: number): number {
    return (cx + 512) * 1024 + (cy + 512);
  }

  clear(): void {
    this.cells.clear();
  }

  insert(o: T): void {
    const k = this.key(Math.floor(o.x / this.size), Math.floor(o.y / this.size));
    const cell = this.cells.get(k);
    if (cell) cell.push(o);
    else this.cells.set(k, [o]);
  }

  /** Nearest living entity within `range` of (x, y), or null. */
  nearest(x: number, y: number, range: number): T | null {
    const x0 = Math.floor((x - range) / this.size);
    const x1 = Math.floor((x + range) / this.size);
    const y0 = Math.floor((y - range) / this.size);
    const y1 = Math.floor((y + range) / this.size);
    let best: T | null = null;
    let bd = range;
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const cell = this.cells.get(this.key(cx, cy));
        if (!cell) continue;
        for (const o of cell) {
          if (o.hp <= 0) continue;
          const d = Math.hypot(o.x - x, o.y - y);
          if (d < bd) {
            bd = d;
            best = o;
          }
        }
      }
    }
    return best;
  }
}
