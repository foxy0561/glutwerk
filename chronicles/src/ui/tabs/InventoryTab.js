// Inventar: Raster mit Drag-and-drop (Plätze tauschen/stapeln, auf Schnellleiste ziehen), Detailansicht rechts.
import { h, frame, img, clear, button } from '../dom.js';
import { t, L } from '../../core/i18n.js';
import { iconURL } from '../../art/iconArt.js';
import { ITEMS, RARITY, CATEGORY, WEAPON_TYPE } from '../../data/items.js';
import { INV_SIZE } from '../../systems/Inventory.js';
import { audio } from '../../engine/Audio.js';

export class InventoryTab {
  constructor(menu, body) {
    this.menu = menu; this.g = menu.g; this.body = body; this.sel = null; // {from:'inv'|'equip', i|slot}
    this.drag = null;
    this.onMove = e => this.dragMove(e); this.onUp = e => this.dragEnd(e);
    window.addEventListener('pointermove', this.onMove); window.addEventListener('pointerup', this.onUp);
    this.refresh();
  }
  destroy() { window.removeEventListener('pointermove', this.onMove); window.removeEventListener('pointerup', this.onUp); this.ghost && this.ghost.remove(); }
  selItem() {
    const inv = this.g.inventory;
    if (!this.sel) return null;
    if (this.sel.from === 'inv') { const s = inv.slots[this.sel.i]; return s ? { id: s.id, n: s.n } : null; }
    const id = inv.equip[this.sel.slot]; return id ? { id, n: 1, equipped: true } : null;
  }
  slotEl(s, i, kind) {
    const el = h('div', { class: 'slot', 'data-kind': kind, 'data-i': i });
    if (s) {
      const def = ITEMS[s.id];
      el.append(img(iconURL(def.icon, 3)));
      if (s.n > 1) el.append(h('span', { class: 'n' }, s.n));
      el.append(h('span', { class: 'rar', style: { background: RARITY[def.rarity].color } }));
      el.title = L(def.name);
    }
    return el;
  }
  refresh() {
    const inv = this.g.inventory, B = this.body;
    clear(B);
    const grid = h('div', { class: 'grid' });
    for (let i = 0; i < INV_SIZE; i++) {
      const s = inv.slots[i]; const el = this.slotEl(s, i, 'inv');
      if (this.sel && this.sel.from === 'inv' && this.sel.i === i) el.classList.add('sel');
      el.addEventListener('pointerdown', e => this.dragStart(e, 'inv', i));
      el.addEventListener('dblclick', () => { if (inv.slots[i]) this.g.api.useItem(inv.slots[i].id); });
      el.addEventListener('contextmenu', e => { e.preventDefault(); if (inv.slots[i]) this.g.api.useItem(inv.slots[i].id); });
      grid.append(el);
    }
    // Schnellleiste als Ablageziel
    const hot = h('div', { class: 'grid' });
    inv.hotbar.forEach((id, i) => {
      const el = this.slotEl(id ? { id, n: ITEMS[id].stack > 1 ? inv.count(id) : 1 } : null, i, 'hot');
      el.prepend(h('span', { class: 'k' }, String((i + 1) % 10)));
      if (i === 0) el.style.borderColor = 'var(--gold)';
      el.addEventListener('contextmenu', e => { e.preventDefault(); if (i > 0) { inv.hotbar[i] = null; inv.changed(); } });
      el.title = i === 0 ? t('slot_weapon') : (id ? L(ITEMS[id].name) + ' – ' + L({ de: 'Rechtsklick: entfernen', en: 'Right-click: remove' }) : '');
      hot.append(el);
    });
    const left = h('div', {},
      grid,
      h('div', { class: 'inv-hot' }, h('div', { class: 'small muted', style: { marginBottom: '4px' } }, L({ de: 'Schnellleiste – Gegenstände hierher ziehen', en: 'Hotbar – drag items here' })), hot),
      h('div', { class: 'inv-foot' },
        h('span', {}, img(iconURL('ui_bag', 1)), ` ${inv.usedSlots()} / ${INV_SIZE}   ·   ${t('weight')}: ${inv.weight()} / ${inv.maxWeight()}`),
        h('span', { class: 'row' }, button(t('sort'), () => { inv.sort(); this.sel = null; }, 'sm'), h('span', { class: 'gold' }, inv.gold, img(iconURL('coin', 1))))));
    B.append(h('div', { class: 'inv' }, left, this.detail()));
  }
  detail() {
    const it = this.selItem();
    const box = frame(h('div', { class: 'detail' }), true);
    if (!it) { box.append(h('div', { class: 'muted', style: { margin: 'auto', textAlign: 'center' } }, t('emptySlot'))); return box; }
    const def = ITEMS[it.id], inv = this.g.inventory;
    const r = RARITY[def.rarity];
    box.append(h('div', { class: 'top' }, h('div', { class: 'ic', style: { borderColor: r.color } }, img(iconURL(def.icon, 4))),
      h('div', {}, h('div', { class: 'nm', style: { color: r.color } }, L(def.name)), h('div', { class: 'ty' }, L(CATEGORY[def.cat]) + (def.wtype ? ` (${L(WEAPON_TYPE[def.wtype])})` : '') + (it.equipped ? ' · ' + t('equipped') : '')))));
    box.append(h('div', { class: 'ds' }, L(def.desc)));
    const kv = h('div', { class: 'kv' });
    const row = (k, v) => kv.append(h('span', {}, k), h('span', {}, v));
    if (def.stats?.dmg) row(t('damage'), def.stats.dmg);
    if (def.stats?.spd) row(t('atkSpeed'), def.stats.spd.toFixed(1));
    if (def.stats?.armor) row(t('armor'), '+' + def.stats.armor);
    if (def.stats?.mp) row(t('mp'), '+' + def.stats.mp);
    if (def.use?.hp) row(t('hp'), '+' + def.use.hp); if (def.use?.mp) row(t('mp'), '+' + def.use.mp); if (def.use?.st) row(t('st'), '+' + def.use.st);
    row(t('rarity'), L(r)); row(t('quantity'), it.n); row(t('weight'), def.weight.toFixed(1)); row(t('value'), def.value + ' ' + t('gold'));
    box.append(kv);
    const acts = h('div', { class: 'acts' });
    if (it.equipped) acts.append(button(t('unequip'), () => { if (!inv.unequip(this.sel.slot)) this.g.ui.toast(t('invFull'), 'warn'); this.sel = null; this.refresh(); }, 'sm'));
    else if (def.slot) acts.append(button(t('equip'), () => { inv.equipFrom(this.sel.i); this.sel = null; }, 'sm primary'));
    else if (def.use) acts.append(button(t('use'), () => this.g.api.useItem(it.id), 'sm primary'));
    if (!it.equipped && (def.use || def.slot) && !def.slot) acts.append(button(t('toHotbar'), () => { const free = inv.hotbar.findIndex((x, i) => i > 0 && !x); inv.setHotbar(free > 0 ? free : 9, it.id); }, 'sm'));
    if (!it.equipped && def.cat !== 'quest' && def.cat !== 'artifact') acts.append(button(t('drop'), () => this.g.ui.confirm(L({ de: `${L(def.name)} wegwerfen?`, en: `Drop ${L(def.name)}?` }), () => { inv.removeAt(this.sel.i, inv.slots[this.sel.i].n); this.sel = null; }), 'sm danger'));
    box.append(acts);
    return box;
  }
  // ---------- Drag & Drop ----------
  dragStart(e, kind, i) {
    if (e.button !== 0) return;
    const inv = this.g.inventory; const s = inv.slots[i];
    this.sel = { from: 'inv', i }; audio.sfx('click');
    if (!s) { this.refresh(); return; }
    this.drag = { kind, i, id: s.id, x0: e.clientX, y0: e.clientY, active: false };
    this.refresh();
  }
  dragMove(e) {
    const d = this.drag; if (!d) return;
    if (!d.active && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 5) {
      d.active = true;
      this.ghost = h('img', { id: 'dragghost', src: iconURL(ITEMS[d.id].icon, 3) });
      document.body.append(this.ghost);
    }
    if (d.active) {
      this.ghost.style.left = e.clientX - 22 + 'px'; this.ghost.style.top = e.clientY - 22 + 'px';
      this.body.querySelectorAll('.slot.drop').forEach(x => x.classList.remove('drop'));
      const tgt = document.elementFromPoint(e.clientX, e.clientY)?.closest('.slot');
      if (tgt) tgt.classList.add('drop');
    }
  }
  dragEnd(e) {
    const d = this.drag; this.drag = null;
    if (!d) return;
    if (this.ghost) { this.ghost.remove(); this.ghost = null; }
    if (!d.active) return;
    const tgt = document.elementFromPoint(e.clientX, e.clientY)?.closest('.slot');
    const inv = this.g.inventory;
    if (tgt) {
      const kind = tgt.dataset.kind, j = +tgt.dataset.i;
      if (kind === 'inv') { inv.move(d.i, j); this.sel = { from: 'inv', i: j }; audio.sfx('click'); }
      else if (kind === 'hot') {
        const def = ITEMS[d.id];
        if (j === 0) { if (def.slot === 'weapon') { inv.equipFrom(d.i); this.sel = null; } else this.g.ui.toast(L({ de: 'Platz 1 ist für deine Waffe.', en: 'Slot 1 is for your weapon.' }), 'warn'); }
        else if (def.use || def.slot) { inv.setHotbar(j, d.id); audio.sfx('click'); }
        else this.g.ui.toast(L({ de: 'Das kann nicht benutzt werden.', en: 'This cannot be used.' }), 'warn');
      }
    }
    this.refresh();
  }
}
