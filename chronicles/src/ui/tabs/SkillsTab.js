// Fähigkeitenbaum-Vorschau. Die Talente selbst kommen mit v0.3 – hier deutlich als gesperrt gekennzeichnet.
import { h, frame, img, clear } from '../dom.js';
import { t, L } from '../../core/i18n.js';
import { iconURL } from '../../art/iconArt.js';

const PATHS = {
  krieger: { icon: 'sword', nodes: [{ de: 'Schwerthieb', en: 'Sword Strike' }, { de: 'Schildwall', en: 'Shield Wall' }, { de: 'Wirbelklinge', en: 'Whirling Blade' }] },
  magier: { icon: 'staff', nodes: [{ de: 'Funkenstoß', en: 'Spark' }, { de: 'Wasserschild', en: 'Water Ward' }, { de: 'Mondquelle', en: 'Moonspring' }] },
  waldlaeufer: { icon: 'bow', nodes: [{ de: 'Gezielter Schuss', en: 'Aimed Shot' }, { de: 'Fallensteller', en: 'Trapper' }, { de: 'Nebelschritt', en: 'Mist Step' }] },
};

export class SkillsTab {
  constructor(menu, body) { this.g = menu.g; this.body = body; this.refresh(); }
  refresh() {
    clear(this.body);
    const cols = Object.entries(PATHS).map(([k, p]) => frame(h('div', { class: 'path' },
      img(iconURL(p.icon, 3)), h('h4', {}, t('path_' + k)),
      p.nodes.map((n, i) => [i ? h('div', { class: 'ln' }) : null, h('div', { class: 'node', title: L(n) + ' – ' + t('locked') }, img(iconURL(p.icon, 2))), h('div', { class: 'small muted' }, L(n))]),
    ), true));
    this.body.append(h('div', { class: 'skills' }, cols), frame(h('div', { class: 'lockinfo' }, t('skillsInfo')), true));
  }
}
