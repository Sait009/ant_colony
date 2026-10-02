import { ROOMS } from '../data/defs';
import { canAfford } from '../sim/commands';
import { nestLevel, roomSlots } from '../sim/stats';
import type { Cost, RoomId } from '../sim/types';
import type { Game } from '../game/game';
import { t } from './i18n';

const costText = (c: Cost): string =>
  [c.food && `🍓${c.food}`, c.twigs && `🪵${c.twigs}`].filter(Boolean).join(' ') || '-';

/** Nest room management panel. DOM is rebuilt only when its visible state changes. */
export class RoomsPanel {
  private readonly el = document.getElementById('rooms') as HTMLDivElement;
  private sig = '';

  constructor(private readonly game: Game) {
    this.el.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('button');
      if (!btn || btn.disabled) return;
      this.game.audio.unlock();
      if (btn.dataset.build)
        this.game.dispatch({ type: 'buildRoom', kind: btn.dataset.build as RoomId });
      else if (btn.dataset.up)
        this.game.dispatch({ type: 'upgradeRoom', roomId: Number(btn.dataset.up) });
      this.refresh();
    });
  }

  toggle(): void {
    this.el.hidden = !this.el.hidden;
    this.sig = '';
    this.refresh();
  }

  refresh(): void {
    if (this.el.hidden) return;
    const w = this.game.world;
    const slots = roomSlots(w);
    const lvl = nestLevel(w);
    const parts: string[] = [];
    let sig = `${slots}|${lvl}`;

    parts.push(
      `<h3>${t('rooms.title')} <small>${t('rooms.slots', { used: w.rooms.length, max: slots })}</small></h3>`,
    );
    if (!w.rooms.length) parts.push(`<div class="hint">${t('rooms.empty')}</div>`);
    for (const r of w.rooms) {
      const def = ROOMS[r.kind];
      const maxed = r.level >= def.max;
      const cost = def.cost(r.level);
      const disabled = maxed || !canAfford(w, cost);
      sig += `|r${r.id}.${r.level}.${disabled ? 1 : 0}`;
      parts.push(`<div class="room">
        <span>${def.icon} <b>${t(`room.${r.kind}.name`)}</b> Lv ${r.level}/${def.max}</span>
        <button data-up="${r.id}" ${disabled ? 'disabled' : ''}>${maxed ? t('rooms.maxed') : `${t('rooms.upgrade')}<span class="c">${costText(cost)}</span>`}</button>
        <span class="d">${t(`room.${r.kind}.desc`)}</span></div>`);
    }

    parts.push(`<h4>${t('rooms.build')}</h4>`);
    for (const def of Object.values(ROOMS)) {
      const cost = def.cost(0);
      const locked = lvl < def.minNestLevel;
      const full = w.rooms.length >= slots;
      const disabled = locked || full || !canAfford(w, cost);
      const note = locked
        ? t('rooms.locked', { level: def.minNestLevel })
        : full
          ? t('rooms.noSlot')
          : costText(cost);
      sig += `|b${def.id}.${disabled ? 1 : 0}`;
      parts.push(`<div class="room">
        <span>${def.icon} <b>${t(`room.${def.id}.name`)}</b></span>
        <button data-build="${def.id}" ${disabled ? 'disabled' : ''}><span class="c">${note}</span></button>
        <span class="d">${t(`room.${def.id}.desc`)}</span></div>`);
    }

    if (sig === this.sig) return;
    this.sig = sig;
    this.el.innerHTML = parts.join('');
  }
}
