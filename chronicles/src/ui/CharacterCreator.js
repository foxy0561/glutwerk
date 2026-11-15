// Charaktererstellung mit Live-Vorschau (drehbar, Laufanimation), Spezies, Klasse und Aussehen.
import { h, frame, button, img, clear, canvasEl } from './dom.js';
import { t, L } from '../core/i18n.js';
import { getCharFrame, HAIR_STYLES, OUTFITS } from '../art/characterArt.js';
import { SKIN_TONES, HAIR_COLORS, EYE_COLORS, CLOTH_COLORS } from '../art/palette.js';
import { SPECIES, CLASSES, BASE_ATTR, ATTRS, OUTFIT_NAMES, HAIR_NAMES, FOXY } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { iconURL } from '../art/iconArt.js';
import { audio } from '../engine/Audio.js';

const DIRS = ['down', 'left', 'up', 'right'];

export class CharacterCreator {
  constructor(ui) {
    this.ui = ui; this.g = ui.g;
    this.mode = 'custom';
    this.c = { name: t('defaultName'), body: 'm', species: 'mensch', cls: 'krieger', hair: 'kurz', hairColor: HAIR_COLORS[0], eyes: EYE_COLORS[0], skin: SKIN_TONES[0], outfit: 'tunika', cloth: CLOTH_COLORS[0] };
    this.dir = 0; this.t = 0; this.outfitTouched = false;
  }
  show(layer) {
    this.el = h('div', { class: 'overlay', style: { background: 'rgba(6,3,10,.35)' } });
    layer.append(this.el);
    this.render();
  }
  destroy() { this.el && this.el.remove(); }
  app() {
    if (this.mode === 'foxy') return FOXY.app;
    const c = this.c;
    return { body: c.body, species: c.species, skin: c.skin, hair: c.hair, hairColor: c.hairColor, eyes: c.eyes, outfit: c.outfit, cloth: c.cloth };
  }
  attrs() {
    if (this.mode === 'foxy') return { ...FOXY.attrs };
    const sp = SPECIES[this.c.species], cl = CLASSES[this.c.cls], a = {};
    for (const k of ATTRS) a[k] = BASE_ATTR[k] + (sp.mod[k] || 0) + (cl.mod[k] || 0);
    return a;
  }
  set(k, v) { this.c[k] = v; if (k === 'cls' && !this.outfitTouched) this.c.outfit = CLASSES[v].outfit; if (k === 'outfit') this.outfitTouched = true; audio.sfx('click'); this.render(); }
  cycler(list, key, names) {
    const i = list.indexOf(this.c[key]);
    const lab = names ? L(names[this.c[key]]) : this.c[key];
    return h('div', { class: 'cycler' },
      h('button', { onclick: () => this.set(key, list[(i - 1 + list.length) % list.length]) }, '‹'),
      h('span', {}, lab),
      h('button', { onclick: () => this.set(key, list[(i + 1) % list.length]) }, '›'));
  }
  swatches(list, key) {
    return h('div', { class: 'swatches' }, list.map(col => h('div', { class: 'sw' + (this.c[key] === col ? ' on' : ''), style: { background: col }, onclick: () => this.set(key, col), title: col })));
  }
  random() {
    const pick = a => a[Math.floor(Math.random() * a.length)];
    Object.assign(this.c, { body: pick(['m', 'f']), species: pick(Object.keys(SPECIES)), hair: pick(HAIR_STYLES), hairColor: pick(HAIR_COLORS), eyes: pick(EYE_COLORS), skin: pick(SKIN_TONES), cloth: pick(CLOTH_COLORS) });
    if (!this.outfitTouched) this.c.outfit = CLASSES[this.c.cls].outfit;
    this.render();
  }
  render() {
    const foxy = this.mode === 'foxy';
    const unlocked = !!this.g.meta.unlocks.foxy;
    const c = this.c;
    clear(this.el);
    // Linke Spalte: Formular
    const left = frame(h('div', { class: 'cc-col scroll' }), true);
    if (!foxy) {
      const nameIn = h('input', { type: 'text', value: c.name, maxlength: 18, class: 'pe', oninput: e => { c.name = e.target.value; this.nameEl.textContent = c.name || '—'; } });
      left.append(
        h('div', { class: 'field' }, h('label', {}, t('name')), nameIn),
        h('div', { class: 'field' }, h('label', {}, t('appearance')), h('div', {},
          h('span', { class: 'radio' + (c.body === 'm' ? ' on' : ''), onclick: () => this.set('body', 'm') }, h('i'), t('male')),
          h('span', { class: 'radio' + (c.body === 'f' ? ' on' : ''), onclick: () => this.set('body', 'f') }, h('i'), t('female')))),
        h('div', { class: 'field' }, h('label', {}, t('species')), this.cycler(Object.keys(SPECIES), 'species', Object.fromEntries(Object.entries(SPECIES).map(([k, v]) => [k, v.name])))),
        h('div', { class: 'field' }, h('label', {}, t('class')), h('div', { class: 'classes' }, Object.entries(CLASSES).map(([k, v]) =>
          h('div', { class: 'classcard' + (c.cls === k ? ' on' : ''), onclick: () => this.set('cls', k) }, img(iconURL(ITEMS[v.weapon].icon, 2)), L(v.name))))),
        h('div', { class: 'field' }, h('label', {}, t('hairstyle')), this.cycler(HAIR_STYLES, 'hair', HAIR_NAMES)),
        h('div', { class: 'field' }, h('label', {}, t('hairColor')), this.swatches(HAIR_COLORS, 'hairColor')),
        h('div', { class: 'field' }, h('label', {}, t('eyeColor')), this.swatches(EYE_COLORS, 'eyes')),
        h('div', { class: 'field' }, h('label', {}, t('skinColor')), this.swatches(SKIN_TONES, 'skin')),
        h('div', { class: 'field' }, h('label', {}, t('clothing')), this.cycler(OUTFITS, 'outfit', OUTFIT_NAMES)),
        h('div', { class: 'field' }, h('label', {}, t('clothColor')), this.swatches(CLOTH_COLORS, 'cloth')),
        button('⟳ ' + t('randomize'), () => this.random(), 'sm'),
      );
    } else {
      left.append(h('div', { class: 'h-title' }, FOXY.name), h('div', { class: 'muted small' }, L(FOXY.title)), h('div', { class: 'sep' }),
        h('div', { class: 'field' }, h('label', {}, t('class')), h('div', { class: 'classes' }, Object.entries(CLASSES).map(([k, v]) =>
          h('div', { class: 'classcard' + (c.cls === k ? ' on' : ''), onclick: () => this.set('cls', k) }, img(iconURL(ITEMS[v.weapon].icon, 2)), L(v.name))))),
        h('div', { class: 'infobox frame thin' }, h('h4', {}, L({ de: 'Passiv', en: 'Passive' })), FOXY.passives.map(p => h('div', {}, '✦ ' + L(p)))),
        h('p', { class: 'small muted', style: { fontStyle: 'italic', lineHeight: 1.45 } }, L(FOXY.desc)));
    }
    // Mitte: Vorschau
    this.big = canvasEl(24, 32); this.big.style.width = '192px'; this.big.style.height = '256px';
    this.minis = DIRS.map(() => canvasEl(24, 32));
    this.nameEl = h('div', { class: 'cc-name' }, foxy ? FOXY.name : (c.name || '—'));
    const center = h('div', { class: 'cc-preview' },
      h('div', { class: 'cc-stage' }, this.big, h('div', { class: 'cc-turn' },
        h('button', { class: 'iconbtn pe', onclick: () => { this.dir = (this.dir + 3) % 4; } }, '⟲'),
        h('button', { class: 'iconbtn pe', onclick: () => { this.dir = (this.dir + 1) % 4; } }, '⟳'))),
      this.nameEl,
      h('div', { class: 'cc-sub' }, `${L(SPECIES[foxy ? 'fuchs' : c.species].name)} · ${L(CLASSES[c.cls].name)}`),
      h('div', { class: 'cc-minis' }, this.minis));
    // Rechts: Attribute + Beschreibung
    const a = this.attrs();
    const right = h('div', {},
      frame(h('div', { class: 'cc-col attrs' }, h('div', { class: 'h-title' }, t('startAttributes')),
        ATTRS.map(k => h('div', { class: 'a' }, img(iconURL('a_' + k, 1)), t('attr_' + k), h('b', {}, a[k]), h('span')))), true),
      frame(h('div', { class: 'infobox' }, h('h4', {}, t('species') + ': ' + L(SPECIES[foxy ? 'fuchs' : c.species].name)), L(SPECIES[foxy ? 'fuchs' : c.species].desc)), true),
      frame(h('div', { class: 'infobox' }, h('h4', {}, t('class') + ': ' + L(CLASSES[c.cls].name)), L(CLASSES[c.cls].desc),
        h('div', { class: 'row', style: { marginTop: '6px' } }, img(iconURL(ITEMS[CLASSES[c.cls].weapon].icon, 1)), h('span', { class: 'small muted' }, L(ITEMS[CLASSES[c.cls].weapon].name)))), true));
    const modeRow = unlocked ? h('div', { class: 'cc-mode' },
      h('button', { class: 'btn sm pe' + (!foxy ? ' on' : ''), onclick: () => { this.mode = 'custom'; this.render(); } }, t('custom')),
      h('button', { class: 'btn sm pe foxy' + (foxy ? ' on' : ''), onclick: () => { this.mode = 'foxy'; audio.sfx('magic'); this.render(); } }, '✦ ' + t('foxyCard'))) : null;
    const win = frame(h('div', { class: 'window cc' },
      h('div', { class: 'wtitle ribbon' }, t('charCreation')),
      modeRow,
      h('div', { class: 'cc-grid' }, left, center, right),
      h('div', { class: 'cc-actions' },
        button(t('back'), () => { this.destroy(); this.ui.creator = null; this.ui.showMainMenu(); }),
        button(t('begin'), () => this.begin(), 'primary'))));
    this.el.append(win);
    this.drawPreview(true);
  }
  begin() {
    const foxy = this.mode === 'foxy';
    const name = foxy ? FOXY.name : (this.c.name || '').trim() || t('defaultName');
    const data = { name, app: this.app(), species: foxy ? 'fuchs' : this.c.species, cls: this.c.cls, foxy, attrs: foxy ? { ...FOXY.attrs } : null };
    audio.sfx('magic');
    this.ui.fade(1.2, () => { this.destroy(); this.ui.creator = null; this.g.newGame(data); }, t('loading'));
  }
  update(dt) { this.t += dt; this.drawPreview(); }
  drawPreview(force) {
    if (!this.big) return;
    const app = this.app(), w = CLASSES[this.c.cls].weapon, wt = ITEMS[w].wtype;
    const f = Math.floor(this.t * 6) % 4;
    const draw = (cv, dir, pose, fr) => { const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 24, 32); x.drawImage(getCharFrame(app, dir, pose, fr, wt), 0, 0); };
    draw(this.big, DIRS[this.dir], 'idle', Math.floor(this.t * 2) % 2);
    this.minis.forEach((cv, i) => draw(cv, DIRS[i], 'walk', f));
  }
}
