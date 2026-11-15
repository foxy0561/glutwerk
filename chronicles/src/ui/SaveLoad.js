// Speichern/Laden-Fenster mit Autosave + 3 Speicherplätzen.
import { h, frame, clear, button, canvasEl } from './dom.js';
import { t, L } from '../core/i18n.js';
import { SLOTS } from '../save/SaveManager.js';
import { getPortrait } from '../art/characterArt.js';
import { fmtTime } from './tabs/CharacterTab.js';

export class SaveLoadWindow {
  constructor(ui, mode, onDone) {
    this.ui = ui; this.g = ui.g; this.mode = mode; this.onDone = onDone;
    this.body = h('div', { class: 'scroll', style: { minHeight: '120px' } }, h('div', { class: 'muted' }, '…'));
    const win = frame(h('div', { class: 'window saves' }, h('div', { class: 'wtitle ribbon' }, mode === 'save' ? t('save') : t('load')), this.body));
    win.append(h('button', { class: 'iconbtn wclose pe', onclick: () => this.ui.pop(this) }, '✕'));
    this.el = h('div', { class: 'overlay', style: { zIndex: 20 } }, win);
    this.refresh();
  }
  relabel() { this.refresh(); }
  async refresh() {
    const list = await this.g.saves.list();
    clear(this.body);
    const slots = this.mode === 'save' ? SLOTS.filter(s => s !== 'auto') : SLOTS;
    if (this.mode === 'load' && !slots.some(s => list[s])) this.body.append(h('p', { class: 'muted' }, t('noSaves')));
    for (const s of slots) {
      const d = list[s];
      const cv = canvasEl(64, 64);
      if (d && d.app) cv.getContext('2d').drawImage(getPortrait(d.app, 64), 0, 0);
      const title = s === 'auto' ? t('autosave') : t('slot', { n: s.slice(-1) });
      const info = d && !d.error ? `${d.name} · ${t('lv')} ${d.level} · ${L(d.region || '')}` : d?.error ? L({ de: 'Beschädigt', en: 'Corrupted' }) : t('empty');
      const when = d && d.savedAt ? new Date(d.savedAt).toLocaleString() + ' · ' + t('playtime') + ' ' + fmtTime(d.playtime) : '';
      const acts = h('div', { class: 'acts' });
      if (this.mode === 'save') acts.append(button(t('save'), async () => {
        const go = async () => { if (await this.g.save(s)) { this.refresh(); } };
        if (d) this.ui.confirm(t('overwrite'), go); else go();
      }, 'sm primary'));
      else if (d && !d.error) acts.append(button(t('load'), async () => {
        const doLoad = async () => { this.ui.closeAll(true); const ok = await this.g.loadGame(s); if (!ok && this.g.mode !== 'play') this.ui.showMainMenu(); };
        if (this.g.mode === 'play') this.ui.confirm(L({ de: 'Aktuellen Fortschritt verwerfen und laden?', en: 'Discard current progress and load?' }), () => this.ui.fade(1, doLoad, t('loading')));
        else this.ui.fade(1, doLoad, t('loading'));
      }, 'sm primary'));
      if (d) acts.append(button(t('delete'), () => this.ui.confirm(t('confirmDelete'), async () => { try { await this.g.saves.remove(s); } catch (e) { this.ui.toast(e.message, 'error'); } this.refresh(); if (this.g.mode === 'menu') this.ui.mainMenu.show(); }), 'sm danger'));
      this.body.append(frame(h('div', { class: 'saveslot' }, cv, h('div', {}, h('div', { class: 't1' }, title), h('div', { class: 't2' }, info), h('div', { class: 't2' }, when)), acts), true));
    }
  }
}
