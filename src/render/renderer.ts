import { Application, Container, Graphics, Sprite, Text, TilingSprite } from 'pixi.js';
import { BALANCE } from '../data/balance';
import { ANTS, ROOMS } from '../data/defs';
import { nestRadius } from '../sim/stats';
import type { Body, World } from '../sim/types';
import { Camera } from './camera';
import { buildTextures, type TextureSet } from './textures';

interface Floater {
  text: Text;
  life: number;
}

/** Keeps a map of id → display object in sync with an array of sim entities. */
class EntityLayer<T extends { id: number }, D extends Container> {
  private map = new Map<number, D>();
  constructor(
    readonly container: Container,
    private readonly create: (e: T) => D,
    private readonly update: (d: D, e: T) => void,
  ) {}

  sync(items: readonly T[]): void {
    const live = new Set<number>();
    for (const e of items) {
      let d = this.map.get(e.id);
      if (!d) {
        d = this.create(e);
        this.map.set(e.id, d);
        this.container.addChild(d);
      }
      this.update(d, e);
      live.add(e.id);
    }
    for (const [id, d] of this.map) {
      if (!live.has(id)) {
        d.destroy({ children: true });
        this.map.delete(id);
      }
    }
  }

  get(id: number): D | undefined {
    return this.map.get(id);
  }

  clear(): void {
    for (const d of this.map.values()) d.destroy({ children: true });
    this.map.clear();
  }
}

const frameOf = (b: Body): 0 | 1 => (Math.sin(b.walk) > 0 ? 1 : 0);

export class Renderer {
  readonly app = new Application();
  readonly camera = new Camera(BALANCE.worldSize);
  private tex!: TextureSet;
  private world = new Container();
  private nodes!: EntityLayer<World['nodes'][number], Container>;
  private ants!: EntityLayer<World['ants'][number], Container>;
  private enemies!: EntityLayer<World['enemies'][number], Sprite>;
  private rooms!: EntityLayer<World['rooms'][number], Container>;
  private nestSprite!: Sprite;
  private queen!: Sprite;
  private flag!: Sprite;
  private hpBars = new Graphics();
  private floaters: Floater[] = [];
  private floatLayer = new Container();

  async init(): Promise<void> {
    await this.app.init({
      background: '#16200f',
      resizeTo: window,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    document.body.prepend(this.app.canvas);
    this.tex = buildTextures(this.app.renderer);
    this.camera.resize(window.innerWidth, window.innerHeight);
    this.app.renderer.on('resize', (w: number, h: number) => this.camera.resize(w, h));

    const size = BALANCE.worldSize;
    const ground = new TilingSprite({ texture: this.tex.grass, width: size, height: size });
    this.nestSprite = new Sprite(this.tex.nest);
    this.nestSprite.anchor.set(0.5);
    this.queen = new Sprite(this.tex.ant.queen[0]);
    this.queen.anchor.set(0.5);
    this.queen.scale.set(1.6);
    this.queen.rotation = Math.PI / 2;
    this.flag = new Sprite(this.tex.flag);
    this.flag.anchor.set(0.5);

    const roomLayer = new Container();
    const nodeLayer = new Container();
    const antLayer = new Container();
    const enemyLayer = new Container();

    this.rooms = new EntityLayer(
      roomLayer,
      (r) => {
        const c = new Container();
        const base = new Sprite(this.tex.chamber);
        base.anchor.set(0.5);
        base.tint = ROOMS[r.kind].color;
        const icon = new Text({ text: ROOMS[r.kind].icon, style: { fontSize: 16 } });
        icon.anchor.set(0.5);
        const lvl = new Text({
          text: '',
          style: {
            fill: '#fff',
            fontSize: 10,
            fontWeight: '700',
            stroke: { color: '#000', width: 2 },
          },
        });
        lvl.anchor.set(0.5);
        lvl.position.set(0, 20);
        c.addChild(base, icon, lvl);
        return c;
      },
      (c, r) => {
        const lvl = c.children[2] as Text;
        const text = `Lv${r.level}`;
        if (lvl.text !== text) lvl.text = text;
      },
    );
    this.nodes = new EntityLayer(
      nodeLayer,
      (n) => this.createNode(n),
      (c, n) => this.updateNode(c, n),
    );
    this.ants = new EntityLayer(
      antLayer,
      (a) => this.createAnt(a),
      (c, a) => this.updateAnt(c, a),
    );
    this.enemies = new EntityLayer(
      enemyLayer,
      (e) => {
        const s = new Sprite(this.tex.enemy[e.kind][0]);
        s.anchor.set(0.5);
        return s;
      },
      (s, e) => {
        s.texture = this.tex.enemy[e.kind][frameOf(e)];
        s.position.set(e.x, e.y);
        s.rotation = e.angle;
      },
    );

    this.world.addChild(
      ground,
      nodeLayer,
      this.nestSprite,
      roomLayer,
      this.queen,
      this.flag,
      antLayer,
      enemyLayer,
      this.hpBars,
      this.floatLayer,
    );
    this.app.stage.addChild(this.world);
  }

  private createNode(n: World['nodes'][number]): Container {
    const c = new Container();
    const body = new Sprite(this.tex.node[n.type]);
    body.anchor.set(0.5);
    body.rotation = n.type === 'twigs' ? n.rot : 0;
    const ring = new Sprite(this.tex.ring);
    ring.anchor.set(0.5);
    ring.visible = false;
    c.addChild(body, ring);
    c.position.set(n.x, n.y);
    return c;
  }

  private updateNode(c: Container, n: World['nodes'][number]): void {
    const body = c.children[0] as Sprite;
    const ring = c.children[1] as Sprite;
    body.scale.set(0.5 + 0.5 * (n.amount / n.max));
    ring.visible = n.marked;
    ring.rotation += 0.01;
  }

  private createAnt(a: World['ants'][number]): Container {
    const c = new Container();
    const body = new Sprite(this.tex.ant[a.kind][0]);
    body.anchor.set(0.5);
    body.scale.set(ANTS[a.kind].scale);
    const carry = new Sprite(this.tex.carry);
    carry.anchor.set(0.5);
    carry.visible = false;
    c.addChild(body, carry);
    return c;
  }

  private updateAnt(c: Container, a: World['ants'][number]): void {
    const body = c.children[0] as Sprite;
    const carry = c.children[1] as Sprite;
    c.position.set(a.x, a.y);
    body.texture = this.tex.ant[a.kind][frameOf(a)];
    body.rotation = a.angle;
    carry.visible = a.carry > 0;
    if (carry.visible) {
      carry.tint = a.carryType === 'food' ? 0xc93a3a : 0x7a5530;
      carry.position.set(Math.cos(a.angle) * 9, Math.sin(a.angle) * 9);
    }
  }

  /** Spawn a floating label (resource pickup etc.). */
  floatText(x: number, y: number, text: string, color: string): void {
    const t = new Text({
      text,
      style: {
        fill: color,
        fontSize: 13,
        fontWeight: '700',
        fontFamily: 'system-ui, sans-serif',
        stroke: { color: '#000', width: 2 },
      },
    });
    t.anchor.set(0.5);
    t.position.set(x, y);
    this.floatLayer.addChild(t);
    this.floaters.push({ text: t, life: 1 });
    if (this.floaters.length > 40) {
      const old = this.floaters.shift()!;
      old.text.destroy();
    }
  }

  render(w: World, frameDt: number): void {
    const cam = this.camera;
    this.world.scale.set(cam.z);
    this.world.position.set(cam.width / 2 - cam.x * cam.z, cam.height / 2 - cam.y * cam.z);

    const r = nestRadius(w);
    this.nestSprite.position.set(w.nest.x, w.nest.y);
    this.nestSprite.scale.set(r / 100);
    this.queen.position.set(w.nest.x, w.nest.y - 2);
    this.flag.position.set(w.rally.x, w.rally.y);

    this.rooms.sync(w.rooms);
    const ringR = r + 24;
    w.rooms.forEach((room, i) => {
      const c = this.rooms.get(room.id);
      if (!c) return;
      const ang = -Math.PI / 2 + i * ((Math.PI * 2) / 7);
      c.position.set(w.nest.x + Math.cos(ang) * ringR, w.nest.y + Math.sin(ang) * ringR);
    });
    this.nodes.sync(w.nodes);
    this.ants.sync(w.ants);
    this.enemies.sync(w.enemies);

    const g = this.hpBars;
    g.clear();
    const bar = (b: Body, width: number) => {
      if (b.hp >= b.maxHp) return;
      g.rect(b.x - width / 2, b.y - 16, width, 3).fill({ color: 0x000000, alpha: 0.6 });
      g.rect(b.x - width / 2, b.y - 16, (width * b.hp) / b.maxHp, 3).fill(0xe0594a);
    };
    for (const a of w.ants) bar(a, 14);
    for (const e of w.enemies) bar(e, 22);

    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i]!;
      f.life -= frameDt;
      f.text.y -= 18 * frameDt;
      f.text.alpha = Math.min(1, f.life * 2);
      if (f.life <= 0) {
        f.text.destroy();
        this.floaters.splice(i, 1);
      }
    }
  }

  /** Drop every sprite (call when a new world replaces the current one). */
  reset(): void {
    this.rooms.clear();
    this.nodes.clear();
    this.ants.clear();
    this.enemies.clear();
    for (const f of this.floaters) f.text.destroy();
    this.floaters = [];
  }
}
