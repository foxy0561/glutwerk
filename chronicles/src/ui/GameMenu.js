// Tab-Fenster für Inventar, Charakter, Fähigkeiten, Quests, Karte, Einstellungen (wie im Referenzbild).
import { h, frame, img, clear } from './dom.js';
import { t } from '../core/i18n.js';
import { iconURL } from '../art/iconArt.js';
import { keyLabel } from '../engine/Input.js';
import { audio } from '../engine/Audio.js';
import { InventoryTab } from './tabs/InventoryTab.js';
import { CharacterTab } from './tabs/CharacterTab.js';
import { SkillsTab } from './tabs/SkillsTab.js';
import { QuestsTab } from './tabs/QuestsTab.js';
import { MapTab } from './tabs/MapTab.js';
import { SettingsPanel } from './SettingsPanel.js';

const TABS = [
  ['inventory', 'ui_bag', InventoryTab], ['character', 'ui_char', CharacterTab], ['skills', 'ui_book', SkillsTab],
  ['quests', 'ui_scroll', QuestsTab], ['map', 'ui_map', MapTab], ['settings', 'ui_gear', null],
];

export class GameMenu {
  constructor(ui, tab) {
    this.ui = ui; this.g = ui.g; this.tab = tab;
    this.tabsEl = h('div', { class: 'tabs' });
    this.body = h('div', { class: 'gm-body' });
    const win = frame(h('div', { class: 'window gm' }, this.tabsEl, this.body));
    win.append(h('button', { class: 'iconbtn wclose pe', onclick: () => this.ui.pop(this) }, '✕'));
    this.el = h('div', { class: 'overlay', onmousedown: e => { if (e.target === this.el) this.ui.pop(this); } }, win);
    this.offs = [this.g.events.on('inventory', () => this.cur && this.cur.refresh && this.cur.refresh()), this.g.events.on('quests', () => this.cur && this.cur.refresh && this.cur.refresh())];
    this.select(tab);
  }
  onClose() { this.offs.forEach(f => f()); this.cur && this.cur.destroy && this.cur.destroy(); }
  relabel() { this.select(this.tab); }
  select(tab) {
    if (this.cur && this.cur.destroy) this.cur.destroy();
    this.tab = tab;
    clear(this.tabsEl);
    const B = this.g.input.bindings;
    const keyOf = { inventory: B.inventory, character: B.character, skills: B.skills, quests: B.quests, map: B.map };
    for (const [k, ic] of TABS) {
      this.tabsEl.append(h('button', { class: 'tab pe' + (k === tab ? ' on' : ''), onclick: () => { audio.sfx('click'); this.select(k); } },
        img(iconURL(ic, 2)), t(k), keyOf[k] ? h('span', { class: 'key' }, keyLabel(keyOf[k])) : null));
    }
    clear(this.body);
    const def = TABS.find(x => x[0] === tab);
    if (tab === 'settings') { this.cur = new SettingsPanel(this.ui, this.body); }
    else this.cur = new def[2](this, this.body);
  }
  update(dt) { this.cur && this.cur.update && this.cur.update(dt); }
}
