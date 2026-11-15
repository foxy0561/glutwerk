// Questlog: Liste aktiver/abgeschlossener Quests, Details, Ziele, Belohnungen, Verfolgen.
import { h, frame, img, clear, button } from '../dom.js';
import { t, L } from '../../core/i18n.js';
import { QUESTS } from '../../data/quests.js';
import { ITEMS } from '../../data/items.js';
import { iconURL } from '../../art/iconArt.js';

export class QuestsTab {
  constructor(menu, body) { this.g = menu.g; this.body = body; this.sel = this.g.quests.tracked || this.g.quests.active()[0] || null; this.refresh(); }
  refresh() {
    const Q = this.g.quests; clear(this.body);
    const list = frame(h('div', { class: 'qlist scroll' }), true);
    const item = id => {
      const d = QUESTS[id];
      return h('div', { class: `qitem ${d.type}` + (id === this.sel ? ' on' : ''), onclick: () => { this.sel = id; this.refresh(); } },
        h('div', { class: 'qk' }, d.type === 'main' ? t('mainQuest') : d.type === 'secret' ? t('secret') : t('sideQuest')), h('div', { class: 'qt' }, L(d.title) + (id === Q.tracked ? '  ◆' : '')));
    };
    const act = Q.active(), done = Q.done();
    list.append(h('div', { class: 'h-title' }, t('activeQuests')));
    act.length ? act.forEach(id => list.append(item(id))) : list.append(h('div', { class: 'muted small' }, t('noQuests')));
    if (done.length) { list.append(h('div', { class: 'sep' }), h('div', { class: 'h-title' }, t('doneQuests'))); done.forEach(id => list.append(item(id))); }
    const det = frame(h('div', { class: 'qdetail scroll' }), true);
    if (this.sel && QUESTS[this.sel]) {
      const d = QUESTS[this.sel], s = Q.q[this.sel];
      det.append(h('h2', {}, L(d.title)), h('p', {}, L(d.desc)), h('div', { class: 'qsub' }, L({ de: 'Ziele', en: 'Objectives' })));
      d.stages.forEach((st, i) => {
        if (i > s.stage && s.status !== 'done') return;
        const isDone = s.status === 'done' || i < s.stage;
        let txt = L(st.text);
        if (!isDone && st.count > 1) { const [a, b] = Q.progress(this.sel); txt += ` (${a}/${b})`; }
        det.append(h('div', { class: 'obj' + (isDone ? ' done' : '') }, h('i'), txt));
      });
      const r = d.reward || {};
      det.append(h('div', { class: 'qsub' }, t('rewards')));
      const rw = h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '12px' } });
      if (r.xp) rw.append(h('span', { style: { color: '#d6b8ff' } }, `${r.xp} XP`));
      if (r.gold) rw.append(h('span', { class: 'row', style: { color: 'var(--gold2)', gap: '4px' } }, img(iconURL('coin', 1)), `${r.gold}`));
      (r.items || []).forEach(([id, n]) => rw.append(h('span', { class: 'row', style: { gap: '4px' } }, img(iconURL(ITEMS[id].icon, 2)), `${n}× ${L(ITEMS[id].name)}`)));
      det.append(rw);
      if (s.status === 'done' && d.next) det.append(h('p', { class: 'muted small', style: { marginTop: '14px', fontStyle: 'italic' } }, L(d.next)));
      if (s.status === 'active') det.append(h('div', { style: { marginTop: '14px' } }, this.sel === Q.tracked ? h('span', { class: 'muted' }, '◆ ' + t('tracked')) : button(t('track'), () => { Q.tracked = this.sel; Q.changed(); }, 'sm')));
    } else det.append(h('div', { class: 'muted' }, t('noQuests')));
    this.body.append(h('div', { class: 'ql' }, list, det));
  }
}
