import { BALANCE } from '../data/balance';
import { ANTS, UPGRADES } from '../data/defs';
import { canAfford } from '../sim/commands';
import type { GameEvent } from '../sim/events';
import { popCap, storageCap } from '../sim/stats';
import type { Command } from '../sim/commands';
import type { Cost, World } from '../sim/types';
import type { Game } from '../game/game';
import { t } from './i18n';
import type { RoomsPanel } from './rooms';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

interface ActionBtn {
  el: HTMLButtonElement;
  cmd: Command;
  cost: (w: World) => Cost;
  available: (w: World) => boolean;
  sub: (w: World) => string;
}

const costText = (c: Cost): string =>
  [c.food && `🍓${c.food}`, c.twigs && `🪵${c.twigs}`].filter(Boolean).join(' ') || '-';

export class Hud {
  private actions: ActionBtn[] = [];
  private acc = 0;

  constructor(
    private readonly game: Game,
    private readonly rooms: RoomsPanel,
  ) {
    this.buildPanel();
    this.bindControls();
  }

  private addAction(icon: string, name: string, a: Omit<ActionBtn, 'el'>): void {
    const el = document.createElement('button');
    el.innerHTML = `<span class="n">${icon} ${name}</span><span class="s"></span><span class="c"></span>`;
    el.addEventListener('click', () => {
      this.game.audio.unlock();
      this.game.dispatch(a.cmd);
      this.refresh();
    });
    $('panel').appendChild(el);
    this.actions.push({ el, ...a });
  }

  private buildPanel(): void {
    for (const def of Object.values(ANTS)) {
      this.addAction(def.icon, t(`ant.${def.id}.name`), {
        cmd: { type: 'spawnAnt', ant: def.id },
        cost: () => def.cost,
        available: (w) => w.ants.length < popCap(w),
        sub: () => t(`ant.${def.id}.desc`),
      });
    }
    for (const def of Object.values(UPGRADES)) {
      this.addAction(def.icon, t(`upgrade.${def.id}.name`), {
        cmd: { type: 'buyUpgrade', id: def.id },
        cost: (w) => def.cost(w.upgrades[def.id]),
        available: (w) => w.upgrades[def.id] < def.max,
        sub: (w) =>
          `Lv ${w.upgrades[def.id] + (def.id === 'nest' ? 1 : 0)}/${def.max + (def.id === 'nest' ? 1 : 0)}`,
      });
    }
    const roomsBtn = document.createElement('button');
    roomsBtn.innerHTML = `<span class="n">🏛️ ${t('ui.rooms')}</span><span class="s">${t('rooms.title')}</span><span class="c">&nbsp;</span>`;
    roomsBtn.addEventListener('click', () => this.rooms.toggle());
    $('panel').appendChild(roomsBtn);
    this.addAction('🔧', t('action.repair.name'), {
      cmd: { type: 'repair' },
      cost: () => BALANCE.repair.cost,
      available: (w) => w.nest.hp < w.nest.maxHp,
      sub: () => t('action.repair.desc', { amount: BALANCE.repair.amount }),
    });
  }

  private bindControls(): void {
    $('btnPause').addEventListener('click', () => this.togglePause());
    $('btnSpeed').addEventListener('click', () => {
      this.game.speed = this.game.speed === 1 ? 2 : this.game.speed === 2 ? 3 : 1;
      $('btnSpeed').textContent = `${this.game.speed}×`;
    });
    $('btnMute').addEventListener('click', () => {
      this.game.audio.unlock();
      this.game.audio.setMuted(!this.game.audio.muted);
      this.syncMute();
    });
    this.syncMute();
  }

  private syncMute(): void {
    $('btnMute').textContent = this.game.audio.muted ? '🔇' : '🔊';
  }

  togglePause(): void {
    if (!this.game.running || this.game.world.status !== 'playing') return;
    this.game.paused = !this.game.paused;
    $('btnPause').textContent = this.game.paused ? '▶' : '⏸';
  }

  resetControls(): void {
    $('btnPause').textContent = '⏸';
    $('btnSpeed').textContent = '1×';
  }

  handleEvent(e: GameEvent): void {
    if (e.type === 'toast') {
      const params =
        e.params && 'room' in e.params
          ? { ...e.params, room: t(`room.${e.params.room}.name`) }
          : e.params;
      this.toast(t(e.key, params), e.level === 'danger');
    } else if (e.type === 'waveStart') {
      this.toast(
        t('toast.wave', { n: e.number, max: BALANCE.winWave, dir: t(`dir.${e.dir}`) }),
        true,
      );
    }
  }

  toast(msg: string, danger = false): void {
    const el = document.createElement('div');
    el.className = 'toast' + (danger ? ' danger' : '');
    el.textContent = msg;
    $('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3300);
  }

  /** Throttled DOM refresh; call every frame. */
  tick(frameSec: number): void {
    if ((this.acc += frameSec) < 0.2) return;
    this.acc = 0;
    this.refresh();
  }

  refresh(): void {
    const w = this.game.world;
    const cap = storageCap(w);
    $('food').textContent = `${Math.floor(w.res.food)}/${cap}`;
    $('twigs').textContent = `${Math.floor(w.res.twigs)}/${cap}`;
    this.rooms.refresh();
    $('pop').textContent = `${w.ants.length}/${popCap(w)}`;
    const timer = w.wave.number >= BALANCE.winWave ? '' : ` · ${Math.ceil(w.wave.timer)}s`;
    $('wave').textContent = `${w.wave.number}/${BALANCE.winWave}${timer}`;
    const hp = Math.max(0, w.nest.hp);
    $('hpbar').style.width = `${(hp / w.nest.maxHp) * 100}%`;
    $('hptext').textContent = `${t('ui.nest')} ${Math.ceil(hp)}/${w.nest.maxHp}`;
    for (const a of this.actions) {
      const cost = a.cost(w);
      const ok = a.available(w);
      a.el.disabled = !ok || !canAfford(w, cost);
      a.el.querySelector('.s')!.textContent = a.sub(w);
      a.el.querySelector('.c')!.textContent = ok ? costText(cost) : t('ui.full');
    }
  }
}
