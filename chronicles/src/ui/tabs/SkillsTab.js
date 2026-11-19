// Magie-Menü: Schulen links, Fertigkeitsbaum nach Rängen in der Mitte, Details rechts.
import { h, frame, img, clear, button } from '../dom.js';
import { L } from '../../core/i18n.js';
import { SCHOOLS, GROUPS, SPELLS, RANKS, HIGH, RANK_XP, SILENT_CASTS, BOOKS } from '../../data/magic.js';
import { spellIconURL } from '../../art/spellArt.js';
import { ITEMS } from '../../data/items.js';
import { THYRVENNA } from '../../data/thyrvenna.js';
import { audio } from '../../engine/Audio.js';

export class SkillsTab {
  constructor(menu, body) {
    this.g = menu.g; this.body = body; this.ui = menu.ui;
    const T = this.g.magic.teacher();
    const firstTaught = T && Object.keys(T.teach)[0];
    this.school = firstTaught || this.lastSchool || 'wasser';
    this.sel = null;
    this.ui.magicFocusBook = id => this.focusBook(id);
    this.off = this.g.events.on('magic', () => this.refresh());
    if (this.ui.pendingBook) { const b = this.ui.pendingBook; this.ui.pendingBook = null; this.focusBook(b); } else this.refresh();
  }
  destroy() { this.off && this.off(); this.ui.magicFocusBook = null; }
  focusBook(id) { const b = BOOKS[id]; if (b) this.school = Object.keys(b)[0]; this.sel = null; this.refresh(); }
  visibleSchools() { const P = this.g.state.player; return Object.keys(SCHOOLS).filter(k => !SCHOOLS[k].unique || (SCHOOLS[k].unique === 'foxy' && P.foxy)); }

  refresh() {
    const g = this.g, m = g.magic, M = m.M;
    clear(this.body);
    // linke Spalte: Schulen nach Gruppen
    const left = h('div', { class: 'mg-schools scroll' });
    let grp = null;
    for (const k of this.visibleSchools()) {
      const sc = SCHOOLS[k];
      if (sc.group !== grp) { grp = sc.group; left.append(h('div', { class: 'mg-grp' }, L(GROUPS[grp]))); }
      const r = m.schoolRank(k);
      left.append(h('button', { class: 'mg-sch pe' + (k === this.school ? ' on' : '') + (sc.forbidden ? ' forb' : ''), onclick: () => { audio.sfx('click'); this.school = k; this.sel = null; this.refresh(); } },
        img(spellIconURL(k, 2)), h('span', {}, L(sc.name)), h('small', {}, sc.forbidden ? '—' : r >= 0 ? L(RANKS[r]) : '')));
    }
    // Mitte: Baum
    const sc = SCHOOLS[this.school], mid = h('div', { class: 'mg-tree scroll' });
    const T = m.teacher();
    const head = h('div', { class: 'mg-head' }, h('h3', {}, L(sc.name)));
    if (!sc.forbidden && !sc.unique) {
      const xp = m.xp(this.school), next = RANK_XP.find(v => v > xp) || RANK_XP[6], casts = M.casts[this.school] || 0;
      head.append(
        h('div', { class: 'mg-stat' }, L({ de: 'Übung', en: 'Practice' }), h('div', { class: 'mg-bar' }, h('i', { style: { width: Math.min(100, xp / next * 100) + '%' } })), h('b', {}, `${xp}/${next}`)),
        h('div', { class: 'mg-stat' }, L({ de: 'Stilles Zaubern', en: 'Silent casting' }), h('div', { class: 'mg-bar v' }, h('i', { style: { width: Math.min(100, (g.state.player.foxy ? SILENT_CASTS : casts) / SILENT_CASTS * 100) + '%' } })), h('b', {}, m.silent(this.school) ? '✓' : `${casts}/${SILENT_CASTS}`)));
    }
    mid.append(head);
    if (sc.forbidden) {
      const found = THYRVENNA.places.filter(p => p.type === 'tele' && g.state.ow.tele[p.id]).length, all = THYRVENNA.places.filter(p => p.type === 'tele').length;
      mid.append(frame(h('div', { class: 'mg-forb' },
        h('p', {}, L({ de: 'Verbotene Magie. Teleportation wurde nach der Katastrophe geächtet, ihre Lehrer verschwanden. Niemand in Thyrvenna unterrichtet sie noch.', en: 'Forbidden magic. Teleportation was outlawed after the catastrophe, and its teachers vanished. No one in Thyrvenna teaches it anymore.' })),
        h('p', {}, L({ de: 'Nur die alten Zirkel tief unter verborgenen Ruinen funktionieren noch. Wer sich daraufstellt, wird fortgetragen.', en: 'Only the old circles deep beneath hidden ruins still work. Whoever steps onto one is carried away.' })),
        h('p', { class: 'mg-count' }, L({ de: `Gefundene Zirkel: ${found} / ${all}`, en: `Circles found: ${found} / ${all}` })))), true);
    } else {
      const maxR = sc.unique ? 1 : 7;
      for (let r = 0; r < maxR; r++) {
        const row = h('div', { class: 'mg-row' }, h('div', { class: 'mg-rank' }, L(RANKS[r])));
        const spells = Object.values(SPELLS).filter(s => s.school === this.school && s.rank === r);
        const nodes = h('div', { class: 'mg-nodes' });
        for (const sp of spells) {
          const learned = m.learned(sp.id), c = learned ? null : m.check(sp.id);
          const st = learned ? 'learned' : c.ok ? 'ready' : c.via ? 'near' : 'locked';
          nodes.append(h('button', { class: `mg-node pe ${st}` + (this.sel === sp.id ? ' sel' : ''), title: L(sp.name), onclick: () => { audio.sfx('click'); this.sel = sp.id; this.refresh(); } },
            img(spellIconURL(sp.id, 3)), h('span', {}, L(sp.name)), sp.combo ? h('em', {}, '✦') : null, M.bar.includes(sp.id) ? h('i', { class: 'onbar' }) : null));
        }
        if (!spells.length && HIGH[this.school] && r >= 3) {
          const n = HIGH[this.school][r - 3];
          nodes.append(h('div', { class: 'mg-node far', title: L({ de: 'Kein Lehrer dieses Rangs bekannt', en: 'No teacher of this rank known' }) }, h('div', { class: 'q' }, '?'), h('span', {}, L({ de: n[0], en: n[1] }))));
        }
        row.append(nodes); mid.append(row);
      }
      if (!sc.unique) mid.append(h('div', { class: 'mg-hint small muted' }, L({ de: 'Höhere Ränge lehrt dir niemand, den du bisher kennst.', en: 'No one you know so far can teach the higher ranks.' })));
    }
    // rechts: Details
    const right = frame(h('div', { class: 'mg-detail scroll' }), true), det = right;
    const src = h('div', { class: 'mg-src small' });
    if (T) src.append(h('div', { class: 'teach' }, L({ de: 'Lehrer: ', en: 'Teacher: ' }), h('b', {}, L(T.name))));
    const books = Object.keys(BOOKS).filter(b => g.inventory.count(b));
    src.append(h('div', {}, books.length ? books.map(b => L(ITEMS[b].name)).join(', ') : L({ de: 'Keine Magiebücher', en: 'No spellbooks' })));
    det.append(src, h('div', { class: 'sep' }));
    if (this.sel) {
      const sp = SPELLS[this.sel], learned = m.learned(sp.id), c = learned ? null : m.check(sp.id);
      det.append(h('div', { class: 'mg-dtop' }, img(spellIconURL(sp.id, 4)), h('div', {}, h('div', { class: 'nm' }, L(sp.name)), h('div', { class: 'ty' }, `${L(sc.name)} · ${L(RANKS[sp.rank])}`))),
        h('p', { class: 'ds' }, L(sp.desc)),
        sp.kind !== 'custom' ? h('div', { class: 'small muted' }, `${sp.mp} ${L({ de: 'Mana', en: 'mana' })} · ${sp.cd}s ${L({ de: 'Abklingzeit', en: 'cooldown' })}` + (m.silent(sp.school) ? '' : ` · ${L({ de: 'mit Spruch', en: 'chanted' })}`)) : null);
      if (c) { const ul = h('div', { class: 'mg-reqs' }); for (const q of c.reqs) ul.append(h('div', { class: q.ok ? 'ok' : 'no' }, q.ok ? '✓ ' : '✗ ', L(q.text))); det.append(ul); }
      const acts = h('div', { class: 'acts' });
      if (!learned && c && c.ok) acts.append(button(c.via === 'teacher' ? L({ de: `Lernen (${c.cost} Gold)`, en: `Learn (${c.cost} gold)` }) : L({ de: 'Aus dem Buch lernen', en: 'Learn from the book' }), () => m.learn(sp.id), 'primary'));
      if (learned) acts.append(button(M.bar.includes(sp.id) ? L({ de: 'Aus Zauberleiste nehmen', en: 'Remove from spell bar' }) : L({ de: 'In Zauberleiste', en: 'Add to spell bar' }), () => m.toggleBar(sp.id), M.bar.includes(sp.id) ? '' : 'gold'));
      if (learned && M.bar.includes(sp.id)) acts.append(button(L({ de: 'Auswählen', en: 'Select' }), () => { M.active = M.bar.indexOf(sp.id); g.events.emit('magic'); }));
      det.append(acts);
    } else {
      det.append(h('div', { class: 'small muted mg-help' },
        h('p', {}, L({ de: 'Zauber lernst du aus einem Magiebuch oder bei einem Lehrer in den Städten. Höhere Ränge brauchen Übung – wirke die Zauber der Schule oft.', en: 'You learn spells from a spellbook or from a teacher in the cities. Higher ranks need practice – cast the school\'s spells often.' })),
        h('p', {}, L({ de: 'Anfangs braucht jeder Zauber einen Spruch. Nach vielen Würfen gelingt er still und sofort. Wer Mana verbraucht, dessen Mana wächst.', en: 'At first every spell needs an incantation. After many casts it comes silently and instantly. Spending mana makes your mana grow.' })),
        h('p', {}, L({ de: `Mana-Bonus durch Übung: +${M.bonus}`, en: `Mana bonus from practice: +${M.bonus}` })),
        h('p', {}, L({ de: 'Rechtsklick: Zauber wirken · Mausrad / Tab: wechseln', en: 'Right click: cast · Mouse wheel / Tab: switch' }))));
    }
    this.body.append(h('div', { class: 'mg' }, frame(left, true), mid, right));
  }
}
