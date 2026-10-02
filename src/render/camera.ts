import { clamp, type Vec2 } from '../core/math';

export class Camera {
  x = 0;
  y = 0;
  z = 1;
  width = 0;
  height = 0;

  constructor(private readonly worldSize: number) {}

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
  }

  clampView(): void {
    this.z = clamp(this.z, 0.35, 2.2);
    this.x = clamp(this.x, 0, this.worldSize);
    this.y = clamp(this.y, 0, this.worldSize);
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    return {
      x: (sx - this.width / 2) / this.z + this.x,
      y: (sy - this.height / 2) / this.z + this.y,
    };
  }
}
