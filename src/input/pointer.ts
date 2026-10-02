import type { Vec2 } from '../core/math';
import type { Camera } from '../render/camera';

export interface InputHandlers {
  onTap(world: Vec2): void;
  onPauseToggle(): void;
}

/** Drag-pan, wheel/pinch zoom, tap, keyboard pan. Mutates the camera only; gameplay goes via onTap. */
export class PointerInput {
  private ptrs = new Map<number, { x: number; y: number }>();
  private moved = 0;
  private multi = false;
  private pinchD = 1;
  private pinchZ = 1;
  private keys = new Set<string>();

  constructor(
    private readonly el: HTMLElement,
    private readonly cam: Camera,
    private readonly h: InputHandlers,
  ) {
    el.addEventListener('pointerdown', this.down);
    el.addEventListener('pointermove', this.move);
    el.addEventListener('pointerup', this.up);
    el.addEventListener('pointercancel', this.up);
    el.addEventListener('wheel', this.wheel, { passive: false });
    window.addEventListener('keydown', this.keydown);
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
  }

  /** Call once per frame for held-key panning. */
  update(dtSec: number): void {
    const pan = (500 * dtSec) / this.cam.z;
    const k = this.keys;
    if (k.has('w') || k.has('arrowup')) this.cam.y -= pan;
    if (k.has('s') || k.has('arrowdown')) this.cam.y += pan;
    if (k.has('a') || k.has('arrowleft')) this.cam.x -= pan;
    if (k.has('d') || k.has('arrowright')) this.cam.x += pan;
    this.cam.clampView();
  }

  private pinchDist(): number {
    const [a, b] = [...this.ptrs.values()];
    return Math.hypot(a!.x - b!.x, a!.y - b!.y) || 1;
  }

  private down = (e: PointerEvent): void => {
    this.el.setPointerCapture(e.pointerId);
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.ptrs.size === 1) {
      this.moved = 0;
      this.multi = false;
    }
    if (this.ptrs.size === 2) {
      this.multi = true;
      this.pinchD = this.pinchDist();
      this.pinchZ = this.cam.z;
    }
  };

  private move = (e: PointerEvent): void => {
    const p = this.ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (this.ptrs.size === 2) {
      this.cam.z = this.pinchZ * (this.pinchDist() / this.pinchD);
    } else {
      this.moved += Math.abs(dx) + Math.abs(dy);
      this.cam.x -= dx / this.cam.z;
      this.cam.y -= dy / this.cam.z;
    }
    this.cam.clampView();
  };

  private up = (e: PointerEvent): void => {
    if (!this.ptrs.has(e.pointerId)) return;
    const tap = this.ptrs.size === 1 && !this.multi && this.moved < 8 && e.type === 'pointerup';
    this.ptrs.delete(e.pointerId);
    if (tap) this.h.onTap(this.cam.screenToWorld(e.clientX, e.clientY));
  };

  private wheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.cam.z *= e.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.cam.clampView();
  };

  private keydown = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      e.preventDefault();
      this.h.onPauseToggle();
      return;
    }
    this.keys.add(e.key.toLowerCase());
  };
}
