import { Graphics, Rectangle, Texture, type Renderer } from 'pixi.js';
import { ANTS } from '../data/defs';
import type { AntId } from '../sim/types';
import { rand } from './util';

/**
 * Texture registry. Everything is generated procedurally for now; to use real sprites,
 * build the same TextureSet from an atlas loaded via `Assets.load` instead.
 */
export interface TextureSet {
  grass: Texture;
  nest: Texture;
  ant: Record<AntId | 'queen', [Texture, Texture]>;
  enemy: Record<'spider' | 'beetle' | 'wasp', [Texture, Texture]>;
  node: Record<'food' | 'twigs', Texture>;
  carry: Texture;
  chamber: Texture;
  ring: Texture;
  flag: Texture;
}

type Draw = (g: Graphics) => void;

function bake(r: Renderer, half: number, draw: Draw, resolution = 2): Texture {
  const g = new Graphics();
  draw(g);
  const tex = r.generateTexture({
    target: g,
    frame: new Rectangle(-half, -half, half * 2, half * 2),
    resolution,
  });
  g.destroy();
  return tex;
}

const pair = (
  r: Renderer,
  half: number,
  draw: (g: Graphics, phase: 0 | 1) => void,
): [Texture, Texture] => [bake(r, half, (g) => draw(g, 0)), bake(r, half, (g) => draw(g, 1))];

function drawAnt(g: Graphics, phase: 0 | 1, color: number): void {
  const sw = phase ? 3 : -3;
  for (let i = -1; i <= 1; i++) {
    const k = (i % 2 ? 1 : -1) * sw;
    g.moveTo(i * 3, 0).lineTo(i * 3 + k, 8);
    g.moveTo(i * 3, 0).lineTo(i * 3 - k, -8);
  }
  g.stroke({ width: 1.2, color: 0x140d0a });
  g.ellipse(-6, 0, 5, 3.8).fill(color);
  g.ellipse(0, 0, 3.2, 2.6).fill(color);
  g.circle(5.5, 0, 3).fill(color);
}

function makeGrass(): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#3d5c2b';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) {
    g.fillStyle = `hsla(${rand(85, 115)}, ${rand(30, 45)}%, ${rand(22, 38)}%, .55)`;
    g.fillRect(rand(0, 256), rand(0, 256), rand(1, 3), rand(2, 6));
  }
  return Texture.from(c);
}

export function buildTextures(r: Renderer): TextureSet {
  const ant = { queen: pair(r, 16, (g, p) => drawAnt(g, p, 0x7a1f3d)) } as TextureSet['ant'];
  for (const def of Object.values(ANTS)) {
    ant[def.id] = pair(r, 16, (g, p) => drawAnt(g, p, def.color));
  }
  return {
    grass: makeGrass(),
    nest: bake(
      r,
      104,
      (g) => {
        g.circle(0, 0, 100).fill(0x6d4f31).stroke({ width: 3, color: 0x3a2a18 });
        g.circle(0, 0, 80).fill(0x8a6540);
        g.circle(0, 0, 50).fill(0x7b5a38);
        g.ellipse(0, 0, 38, 28).fill(0x1e130b);
      },
      1,
    ),
    ant,
    enemy: {
      spider: pair(r, 20, (g, p) => {
        const sw = p ? 3 : -3;
        for (let i = 0; i < 4; i++) {
          const x = -4 + i * 3;
          const k = (i % 2 ? 1 : -1) * sw;
          g.moveTo(x, 0).lineTo(x + k + 3, 12);
          g.moveTo(x, 0).lineTo(x - k + 3, -12);
        }
        g.stroke({ width: 1.5, color: 0x1c1420 });
        g.ellipse(-4, 0, 7, 6).fill(0x2a1f33);
        g.circle(5, 0, 4).fill(0x2a1f33);
        g.rect(7, -2, 1.5, 1.5).fill(0xe03b3b);
        g.rect(7, 1, 1.5, 1.5).fill(0xe03b3b);
      }),
      beetle: pair(r, 20, (g, p) => {
        g.ellipse(-2, 0, 13, 9).fill(0x2f6f4f);
        g.moveTo(-14, 0).lineTo(10, 0).stroke({ width: 1.2, color: 0x1b3f2d });
        g.circle(11, 0, 4.5).fill(0x1f4a35);
        const sw = p ? 2 : -2;
        g.moveTo(2, 8)
          .lineTo(2 + sw, 13)
          .moveTo(2, -8)
          .lineTo(2 - sw, -13)
          .stroke({ width: 1.5, color: 0x1b3f2d });
      }),
      wasp: pair(r, 20, (g, p) => {
        const f = p ? 8 : 6;
        g.ellipse(-1, f, 6, 3).fill({ color: 0xdcf0ff, alpha: 0.55 });
        g.ellipse(-1, -f, 6, 3).fill({ color: 0xdcf0ff, alpha: 0.55 });
        g.ellipse(-3, 0, 8, 4.5).fill(0xe8c020);
        g.rect(-6, -4, 2, 8).fill(0x1a1a1a);
        g.rect(-1, -4, 2, 8).fill(0x1a1a1a);
        g.circle(6, 0, 3.2).fill(0x1a1a1a);
      }),
    },
    node: {
      food: bake(r, 16, (g) => {
        for (const [dx, dy] of [
          [-7, 3],
          [6, 4],
          [0, -6],
          [-1, 4],
        ] as const) {
          g.circle(dx, dy, 7).fill(0xc93a3a);
          g.circle(dx - 2, dy - 2, 1.8).fill({ color: 0xffffff, alpha: 0.5 });
        }
      }),
      twigs: bake(r, 20, (g) => {
        for (const [dx, dy] of [
          [0, 0],
          [-3, 6],
          [3, -6],
        ] as const) {
          g.rect(-16 + dx, dy - 2, 32, 4)
            .fill(0x7a5530)
            .stroke({ width: 1, color: 0x4b3219 });
        }
      }),
    },
    chamber: bake(r, 18, (g) => {
      g.circle(0, 0, 16).fill(0xffffff).stroke({ width: 3, color: 0x3a2a18 });
    }),
    carry: bake(r, 4, (g) => g.circle(0, 0, 3).fill(0xffffff)),
    ring: bake(r, 22, (g) => {
      for (let i = 0; i < 12; i++) {
        const a0 = (i / 12) * Math.PI * 2;
        g.arc(0, 0, 20, a0, a0 + 0.3).stroke({ width: 2, color: 0xf2b441 });
      }
    }),
    flag: bake(r, 24, (g) => {
      g.moveTo(0, 0).lineTo(0, -22).stroke({ width: 2, color: 0xf2f2f2 });
      g.poly([0, -22, 14, -17, 0, -12]).fill(0xe0594a);
    }),
  };
}
