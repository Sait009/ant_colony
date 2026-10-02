import { Game } from './game/game';
import { PointerInput } from './input/pointer';
import { Renderer } from './render/renderer';
import { BALANCE } from './data/balance';
import { Hud } from './ui/hud';
import { Overlay } from './ui/overlay';
import { RoomsPanel } from './ui/rooms';
import { TechPanel } from './ui/tech';

async function main(): Promise<void> {
  const game = new Game();
  const renderer = new Renderer();
  await renderer.init();
  const cam = renderer.camera;

  const rooms: RoomsPanel = new RoomsPanel(game, () => tech.close());
  const tech: TechPanel = new TechPanel(game, () => rooms.close());
  const hud = new Hud(game, rooms, tech);
  const overlay = new Overlay(
    {
      onNew: () => start(() => game.newGame()),
      onContinue: () => start(() => game.continueGame()),
    },
    () => game.hasSave(),
  );

  const centerOnNest = () => {
    cam.x = game.world.nest.x;
    cam.y = game.world.nest.y;
    cam.z = Math.min(Math.max(Math.min(cam.width, cam.height) / 700, 0.6), 1.4);
  };

  function start(init: () => unknown): void {
    game.audio.unlock();
    init();
    renderer.reset();
    hud.resetControls();
    centerOnNest();
    overlay.hide();
    hud.refresh();
  }

  game.onEvent((e) => {
    hud.handleEvent(e);
    if (e.type === 'shot') renderer.shot(e.x1, e.y1, e.x2, e.y2);
    if (e.type === 'float') renderer.floatText(e.x, e.y, e.text, e.color);
    if (e.type === 'ended') overlay.showEnd(e.won, game.world.wave.number, game.world.time);
  });

  const input = new PointerInput(renderer.app.canvas, cam, {
    onPauseToggle: () => hud.togglePause(),
    onTap: (p) => {
      const w = game.world;
      if (!game.running || w.status !== 'playing' || game.paused) return;
      const hit = w.nodes.find((n) => Math.hypot(n.x - p.x, n.y - p.y) < 26);
      game.dispatch(hit ? { type: 'toggleMark', nodeId: hit.id } : { type: 'setRally', pos: p });
    },
  });

  document.addEventListener('visibilitychange', () => document.hidden && game.save());
  window.addEventListener('pagehide', () => game.save());

  centerOnNest();
  overlay.showStart();

  renderer.app.ticker.add((ticker) => {
    const sec = ticker.deltaMS / 1000;
    input.update(sec);
    game.update(sec);
    renderer.render(game.world, sec);
    hud.tick(sec);
  });

  // Debug/test handle
  (window as unknown as { __ant: unknown }).__ant = { game, BALANCE };
}

void main();
