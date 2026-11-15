// Hauptmenü mit animierter Fantasy-Landschaft.
import { h, frame, button, clear } from './dom.js';
import { t, L, setLang, getLang } from '../core/i18n.js';
import { TitleScene } from './titleArt.js';
import { audio } from '../engine/Audio.js';

const SIGIL = `<svg viewBox="0 0 64 56" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#f0d27a" stroke-width="2.4" stroke-linejoin="round"><path d="M32 4 L58 50 L6 50 Z"/><path d="M32 18 L46 44 L18 44 Z"/><circle cx="32" cy="35" r="7"/></g><path d="M32 4 L58 50 L6 50 Z" fill="none" stroke="#7a4a14" stroke-width=".8"/></svg>`;

export class MainMenu {
  constructor(ui) { this.ui = ui; this.g = ui.g; this.scene = null; this.visible = false; }
  show() {
    const L1 = this.ui.layerMenu; clear(L1);
    this.scene = this.scene || new TitleScene();
    this.bg = h('canvas', { class: 'bg' });
    this.el = h('div', { id: 'mainmenu' }, this.bg);
    const btns = h('div', { class: 'mm-buttons' });
    btns.append(
      button(t('newGame'), () => this.ui.showCreator(), 'primary'),
      this.loadBtn = button(t('loadGame'), () => this.ui.openSaveLoad('load')),
      button(t('settings'), () => this.ui.openSettings()),
      button(t('credits'), () => this.credits()),
      button(t('quit'), () => this.quit()),
    );
    this.el.append(h('div', { class: 'mm-wrap' },
      h('div', { class: 'mm-logo' }, h('div', { class: 'sig', html: SIGIL }), h('div', { class: 'l1' }, 'Chronicles of the'), h('div', { class: 'l2' }, 'Forgotten'),
        h('div', { class: 'tag' }, L({ de: 'Ein Abenteuer in Thyrvenna', en: 'An adventure in Thyrvenna' }))),
      btns));
    this.el.append(h('div', { class: 'mm-ver' }, h('b', {}, t('version')), h('br'), 'Glutwerk'));
    const lang = h('div', { class: 'mm-lang' });
    for (const l of ['de', 'en']) lang.append(h('button', { class: 'btn sm pe' + (getLang() === l ? ' primary' : ''), onclick: () => { audio.init(); this.g.settings.lang = l; this.g.saveSettings(); } }, l.toUpperCase()));
    this.el.append(lang);
    if (this.g.meta.unlocks.foxy) this.el.append(h('div', { class: 'secret-badge' }, '✦ ' + L({ de: 'Etwas Fuchsiges wartet in der Charaktererstellung …', en: 'Something foxy awaits in character creation …' })));
    L1.append(this.el);
    this.visible = true;
    this.g.saves.list().then(list => { const any = Object.values(list).some(Boolean); this.loadBtn.disabled = !any; });
    this.resize();
  }
  resize() { if (!this.bg) return; this.bg.width = Math.ceil(window.innerWidth / 3); this.bg.height = Math.ceil(window.innerHeight / 3); }
  hide() { this.visible = false; if (this.el) this.el.remove(); }
  // Nur Logo/Buttons ausblenden, Hintergrund weiterlaufen lassen (für die Charaktererstellung)
  dim() { if (!this.el) return; this.el.querySelectorAll('.mm-wrap, .mm-lang, .secret-badge').forEach(e => e.style.display = 'none'); }
  update(dt) {
    if (!this.visible || !this.bg) return;
    if (this.bg.width !== Math.ceil(window.innerWidth / 3)) this.resize();
    this.scene.render(this.bg, dt);
  }
  credits() {
    const win = {};
    const box = frame(h('div', { class: 'window credits' },
      h('div', { class: 'wtitle ribbon' }, t('credits')),
      h('div', { style: { fontFamily: 'var(--f-title)', fontSize: '24px', color: 'var(--gold2)' } }, 'Chronicles of the Forgotten'),
      h('div', { class: 'muted' }, t('version')),
      h('h3', {}, L({ de: 'Idee, Welt & Lore', en: 'Idea, world & lore' })), h('div', {}, 'foxy0561 · Thyrvenna'),
      h('h3', {}, L({ de: 'Entwicklung', en: 'Development' })), h('div', {}, L({ de: 'Glutwerk – mit Claude (Anthropic)', en: 'Glutwerk – with Claude (Anthropic)' })),
      h('h3', {}, L({ de: 'Grafik & Klang', en: 'Art & sound' })), h('div', {}, L({ de: 'Komplett prozedural im Code erzeugt – Pixel-Art, Musik und Geräusche.', en: 'Fully procedural – pixel art, music and sounds generated in code.' })),
      h('h3', {}, L({ de: 'Schriften', en: 'Fonts' })), h('div', {}, 'IM Fell English · Alegreya Sans (SIL OFL)'),
      h('div', { style: { marginTop: '18px' } }, button(t('close'), () => this.ui.pop(win)))));
    win.el = h('div', { class: 'overlay' }, box);
    this.ui.push(win);
  }
  quit() {
    const win = {};
    const box = frame(h('div', { class: 'window confirm' }, h('div', { class: 'h-title' }, t('quitTitle')), h('p', {}, t('quitText')),
      h('div', { class: 'row' },
        h('a', { class: 'btn primary pe', href: 'https://foxy0561.github.io/glutwerk/', target: '_top', rel: 'noopener', style: { textDecoration: 'none' } }, t('toGlutwerk')),
        button(t('back'), () => this.ui.pop(win)))));
    win.el = h('div', { class: 'overlay' }, box);
    this.ui.push(win);
  }
}
