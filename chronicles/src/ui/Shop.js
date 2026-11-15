// Händlerfenster: Kaufen (Angebot) und Verkaufen (eigene Gegenstände).
import { h, frame, img, clear, button } from './dom.js';
import { t, L } from '../core/i18n.js';
import { iconURL } from '../art/iconArt.js';
import { ITEMS, RARITY } from '../data/items.js';
import { NPCS } from '../data/npcs.js';
import { audio } from '../engine/Audio.js';

export class ShopWindow {
  constructor(ui, npcId) {
    this.ui = ui; this.g = ui.g; this.def = typeof npcId === 'string' ? NPCS[npcId] : npcId;
    this.body = h('div', { class: 'gm-body', style: { padding: '0' } });
    const win = frame(h('div', { class: 'window shop' }, h('div', { class: 'wtitle ribbon' }, `${L(this.def.name)} – ${t('trade')}`), this.body));
    win.append(h('button', { class: 'iconbtn wclose pe', onclick: () => this.ui.pop(this) }, '✕'));
    this.el = h('div', { class: 'overlay' }, win);
    this.off = this.g.events.on('inventory', () => this.refresh());
    this.refresh();
  }
  onClose() { this.off(); }
  relabel() { this.refresh(); }
  row(id, price, label, act) {
    const d = ITEMS[id];
    return h('div', { class: 'srowi' }, img(iconURL(d.icon, 2)),
      h('div', {}, h('div', { style: { color: RARITY[d.rarity].color } }, L(d.name)), h('div', { class: 'small muted' }, L(d.desc).slice(0, 60) + (L(d.desc).length > 60 ? '…' : ''))),
      h('span', { class: 'pr' }, price, img(iconURL('coin', 1))), button(label, act, 'sm'));
  }
  refresh() {
    const inv = this.g.inventory; clear(this.body);
    const buy = frame(h('div', { class: 'shop-list scroll' }, h('div', { class: 'h-title' }, t('merchantStock'))), true);
    for (const [id, price] of this.def.shop.stock) buy.append(this.row(id, price, t('buy'), () => {
      if (inv.gold < price) { this.ui.toast(t('notEnoughGold'), 'warn'); audio.sfx('error'); return; }
      if (inv.add(id, 1)) { this.ui.toast(t('invFull'), 'warn'); return; }
      inv.gold -= price; audio.sfx('coin'); inv.changed(); this.g.quests.check();
    }));
    const sell = frame(h('div', { class: 'shop-list scroll' }, h('div', { class: 'h-title' }, t('yourItems'))), true);
    inv.slots.forEach((s, i) => {
      if (!s) return; const d = ITEMS[s.id];
      const price = Math.max(1, Math.floor(d.value * this.def.shop.sellRate));
      const r = this.row(s.id, price, t('sell'), () => {
        if (d.noSell || d.cat === 'quest' || d.cat === 'artifact') { this.ui.toast(t('cantSell'), 'warn'); return; }
        inv.removeAt(i, 1); inv.gold += price; audio.sfx('coin'); inv.changed();
      });
      if (s.n > 1) r.children[1].firstChild.textContent += ` ×${s.n}`;
      if (d.noSell || d.cat === 'quest' || d.cat === 'artifact') r.lastChild.disabled = true;
      sell.append(r);
    });
    this.body.append(h('div', { class: 'shop-grid' }, buy, sell),
      h('div', { class: 'inv-foot' }, h('span', {}, L({ de: `Verkauf zu ${Math.round(this.def.shop.sellRate * 100)} % des Werts`, en: `Sells at ${Math.round(this.def.shop.sellRate * 100)}% of value` })), h('span', { class: 'gold' }, inv.gold, img(iconURL('coin', 1)))));
  }
}
