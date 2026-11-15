// Charakterübersicht: Vorschau, Stufe/XP, Attribute (Punkte verteilen), abgeleitete Werte, Ausrüstung.
import { h, frame, img, clear, canvasEl } from '../dom.js';
import { t, L } from '../../core/i18n.js';
import { iconURL } from '../../art/iconArt.js';
import { getCharFrame } from '../../art/characterArt.js';
import { ITEMS } from '../../data/items.js';
import { SPECIES, CLASSES, ATTRS, xpForLevel, FOXY } from '../../data/characters.js';
import { audio } from '../../engine/Audio.js';

export class CharacterTab {
  constructor(menu, body) { this.menu = menu; this.g = menu.g; this.body = body; this.t = 0; this.refresh(); }
  refresh() {
    const g = this.g, P = g.state.player, B = this.body, d = g.stats(), inv = g.inventory;
    clear(B);
    this.cv = canvasEl(24, 32); this.cv.style.width = '144px'; this.cv.style.height = '192px';
    const eq = h('div', { class: 'eqslots' });
    for (const slot of ['weapon', 'armor', 'trinket']) {
      const id = inv.equip[slot];
      const s = h('div', { class: 'slot pe', title: id ? L(ITEMS[id].name) : t('slot_' + slot), onclick: () => { if (id && !inv.unequip(slot)) g.ui.toast(t('invFull'), 'warn'); } }, id ? img(iconURL(ITEMS[id].icon, 3)) : h('span', { class: 'muted small' }, '—'));
      eq.append(h('div', {}, s, h('div', { class: 'lbl' }, t('slot_' + slot))));
    }
    const pv = frame(h('div', { class: 'pv' }, this.cv,
      h('div', { class: 'cc-name' }, P.name),
      h('div', { class: 'cc-sub' }, `${L(SPECIES[P.species].name)} · ${L(CLASSES[P.cls].name)} · ${t('level')} ${P.level}`),
      h('div', { class: 'xpline' }, `${t('xp')}: ${P.xp} / ${xpForLevel(P.level)}`, h('div', { class: 'xpbar' }, h('div', { style: { width: (100 * P.xp / xpForLevel(P.level)) + '%' } }))),
      eq, h('div', { class: 'small muted', style: { marginTop: '6px', textAlign: 'center' } }, L({ de: 'Klick auf Ausrüstung: ablegen', en: 'Click equipment to unequip' }))), true);
    const attrs = frame(h('div', { class: 'cc-col attrs' }, h('div', { class: 'h-title' }, L({ de: 'Attribute', en: 'Attributes' })),
      P.points ? h('div', { class: 'small', style: { color: 'var(--gold2)', marginBottom: '4px' } }, t('attrPoints', { n: P.points })) : null,
      ATTRS.map(k => h('div', { class: 'a' }, img(iconURL('a_' + k, 1)), t('attr_' + k), h('b', {}, P.attrs[k]),
        P.points ? h('button', { class: 'plus', onclick: () => { P.attrs[k]++; P.points--; audio.sfx('click'); g.events.emit('player'); this.refresh(); } }, '+') : h('span')))), true);
    const kv = h('div', { class: 'kv' });
    const row = (a, b) => kv.append(h('span', {}, a), h('span', {}, b));
    row(t('hp'), `${Math.round(P.hp)} / ${d.maxHp}`); row(t('mp'), `${Math.round(P.mp)} / ${d.maxMp}`); row(t('st'), `${Math.round(P.st)} / ${d.maxSt}`);
    const w = inv.equipped('weapon');
    row(t('damage'), w ? `${w.def.stats.dmg + Math.floor(P.attrs[w.def.wtype === 'staff' ? 'int' : w.def.wtype === 'bow' || w.def.wtype === 'dagger' ? 'dex' : 'str'] / 2)}` : '—');
    row(t('armor'), d.armor); row(L({ de: 'Lauftempo', en: 'Move speed' }), Math.round(d.speed));
    row(t('gold'), inv.gold); row(t('playtime'), fmtTime(g.state.playtime));
    const stats = frame(h('div', { class: 'cc-col' }, h('div', { class: 'h-title' }, L({ de: 'Werte', en: 'Stats' })), kv,
      P.foxy ? h('div', { class: 'infobox frame thin', style: { marginTop: '12px' } }, h('h4', {}, L(FOXY.title)), FOXY.passives.map(p => h('div', { class: 'small' }, '✦ ' + L(p)))) : null,
      h('div', { class: 'small muted', style: { marginTop: '12px', lineHeight: 1.4 } }, L({ de: 'Kampfwerte wirken ab v0.2 (Kampf & Kreaturen).', en: 'Combat stats take effect from v0.2 (Combat & Creatures).' }))), true);
    B.append(h('div', { class: 'chr' }, pv, attrs, stats));
  }
  update(dt) {
    this.t += dt;
    const g = this.g, w = g.inventory.equipped('weapon');
    const x = this.cv.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 24, 32);
    const dirs = ['down', 'right', 'up', 'left'];
    x.drawImage(getCharFrame(g.state.player.app, dirs[Math.floor(this.t / 2) % 4], 'walk', Math.floor(this.t * 6) % 4, w ? w.def.wtype : null), 0, 0);
  }
}
export function fmtTime(s) { s = Math.floor(s || 0); const hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60); return `${hh}h ${String(mm).padStart(2, '0')}m`; }
