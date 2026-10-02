import type { Body } from './types';

/** Move `b` toward a point. Returns true once within `stop` of it. */
export function moveToward(
  b: Body,
  tx: number,
  ty: number,
  speed: number,
  dt: number,
  stop = 2,
): boolean {
  const dx = tx - b.x;
  const dy = ty - b.y;
  const d = Math.hypot(dx, dy);
  if (d <= stop) return true;
  const step = Math.min(speed * dt, d - stop + 0.01);
  b.x += (dx / d) * step;
  b.y += (dy / d) * step;
  b.angle = Math.atan2(dy, dx);
  b.walk += speed * dt * 0.25;
  return false;
}
