import { BALANCE } from '../data/balance';
import { t } from './i18n';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export interface OverlayActions {
  onNew(): void;
  onContinue(): void;
}

export class Overlay {
  constructor(
    private readonly actions: OverlayActions,
    private readonly hasSave: () => boolean,
  ) {
    $('btnStart').addEventListener('click', () => this.actions.onNew());
    $('btnContinue').addEventListener('click', () => this.actions.onContinue());
  }

  showStart(): void {
    const saved = this.hasSave();
    $('ovTitle').textContent = t('ov.title');
    $('ovDesc').textContent = t('ov.desc');
    const help = $('ovHelp');
    help.hidden = false;
    help.innerHTML = [1, 2, 3, 4]
      .map((i) => `<li>${t(`ov.help${i}`, { max: BALANCE.winWave })}</li>`)
      .join('');
    $('btnStart').textContent = saved ? t('ov.newGame') : t('ov.start');
    $('btnStart').classList.toggle('ghost', saved);
    const cont = $('btnContinue');
    cont.hidden = !saved;
    cont.textContent = t('ov.continue');
    $('overlay').classList.remove('hidden');
  }

  showEnd(won: boolean, wave: number, seconds: number): void {
    $('ovTitle').textContent = t(won ? 'ov.win' : 'ov.lose');
    $('ovDesc').textContent = won
      ? t('ov.winDesc', { max: BALANCE.winWave })
      : t('ov.loseDesc', { wave, secs: Math.floor(seconds) });
    $('ovHelp').hidden = true;
    $('btnContinue').hidden = true;
    $('btnStart').classList.remove('ghost');
    $('btnStart').textContent = t('ov.again');
    $('overlay').classList.remove('hidden');
  }

  hide(): void {
    $('overlay').classList.add('hidden');
  }
}
