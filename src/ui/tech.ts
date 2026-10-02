import { TECHS } from '../data/defs';
import { canAfford } from '../sim/commands';
import type { Cost, TechId } from '../sim/types';
import type { Game } from '../game/game';
import { t } from './i18n';

const costText = (c: Cost): string =>
  [c.food && `🍓${c.food}`, c.twigs && `🪵${c.twigs}`].filter(Boolean).join(' ') || '-';

/** Technology tree panel. DOM is rebuilt only when its visible state changes. */
export class TechPanel {
  private readonly el = document.getElementById('tech') as HTMLDivElement;
  private sig = '';

  constructor(
    private readonly game: Game,
    /** closes the sibling panel so the two do not overlap */
    private readonly onOpen: () => void,
  ) {
    this.el.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('button');
      if (!btn || btn.disabled || !btn.dataset.tech) return;
      this.game.audio.unlock();
      this.game.dispatch({ type: 'research', id: btn.dataset.tech as TechId });
      this.refresh();
    });
  }

  close(): void {
    this.el.hidden = true;
  }

  toggle(): void {
    this.el.hidden = !this.el.hidden;
    if (!this.el.hidden) this.onOpen();
    this.sig = '';
    this.refresh();
  }

  refresh(): void {
    if (this.el.hidden) return;
    const w = this.game.world;
    const parts: string[] = [`<h3>${t('tech.title')}</h3>`];
    let sig = '';
    let tier = 0;
    for (const def of Object.values(TECHS).sort((a, b) => a.tier - b.tier)) {
      if (def.tier !== tier) {
        tier = def.tier;
        parts.push(`<h4>${t('tech.tier', { n: tier })}</h4>`);
      }
      const owned = w.techs.includes(def.id);
      const missing = def.requires.filter((r) => !w.techs.includes(r));
      const locked = missing.length > 0;
      const disabled = owned || locked || !canAfford(w, def.cost);
      sig += `|${def.id}.${owned ? 2 : locked ? 1 : 0}.${disabled ? 1 : 0}`;
      const label = owned
        ? t('tech.owned')
        : locked
          ? t('tech.needs', { list: missing.map((m) => t(`tech.${m}.name`)).join(', ') })
          : `${t('tech.research')}<span class="c">${costText(def.cost)}</span>`;
      parts.push(`<div class="room ${owned ? 'owned' : locked ? 'locked' : ''}">
        <span class="n">${def.icon} <b>${t(`tech.${def.id}.name`)}</b></span>
        <button data-tech="${def.id}" ${disabled ? 'disabled' : ''}>${label}</button>
        <span class="d">${t(`tech.${def.id}.desc`)}</span></div>`);
    }
    if (sig === this.sig) return;
    this.sig = sig;
    this.el.innerHTML = parts.join('');
  }
}
