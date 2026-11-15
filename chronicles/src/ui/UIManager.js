// Verwaltet alle Oberflächen-Ebenen: Hauptmenü, HUD, Fenster, Dialoge, Meldungen, Überblendungen.
import { h, frame, button, img, clear, CORNER_SVG } from './dom.js';
import { t, L, onLang } from '../core/i18n.js';
import { audio } from '../engine/Audio.js';
import { iconURL } from '../art/iconArt.js';
import { MainMenu } from './MainMenu.js';
import { CharacterCreator } from './CharacterCreator.js';
import { HUD } from './HUD.js';
import { GameMenu } from './GameMenu.js';
import { DialogueBox } from './Dialogue.js';
import { ShopWindow } from './Shop.js';
import { SaveLoadWindow } from './SaveLoad.js';
import { SettingsPanel } from './SettingsPanel.js';

export class UIManager {
  constructor(game, root) {
    this.g = game; this.root = root;
    this.stack = []; // offene Fenster (oberstes zuletzt)
    this.pointerOverUI = false;
  }
  init() {
    document.documentElement.style.setProperty('--corner', `url("${CORNER_SVG}")`);
    const R = this.root;
    this.layerMenu = h('div', { id: 'menulayer' });
    this.layerHUD = h('div', { id: 'hud' });
    this.layerDlg = h('div', { id: 'dialogue' });
    this.layerWin = h('div', { id: 'windows' });
    this.layerBanner = h('div', { id: 'banner' });
    this.layerToast = h('div', { id: 'toasts' });
    this.lbTop = h('div', { class: 'letterbox top' }); this.lbBot = h('div', { class: 'letterbox bot' });
    this.layerFX = h('div', { id: 'fx', style: { position: 'absolute', inset: 0 } });
    this.fadeEl = h('div', { id: 'fade' });
    R.append(this.layerHUD, this.lbTop, this.lbBot, this.layerFX, this.layerDlg, this.layerBanner, this.layerToast, this.layerMenu, this.layerWin, this.fadeEl);
    for (const el of [this.layerHUD, this.layerDlg, this.layerWin, this.layerMenu]) {
      el.addEventListener('mouseover', e => { if (e.target.closest('.pe, .frame, .hmenu, .btn')) this.pointerOverUI = true; });
      el.addEventListener('mouseout', () => { this.pointerOverUI = false; });
    }
    this.mainMenu = new MainMenu(this);
    this.hud = new HUD(this);
    this.dialogue = new DialogueBox(this);
    onLang(() => this.relabel());
    // Audio erst nach Nutzerinteraktion
    const unlock = () => { audio.init(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
  }
  relabel() {
    if (this.g.mode === 'menu' && this.mainMenu.el) this.mainMenu.show();
    if (this.g.mode === 'play') this.hud.build();
    this.stack.forEach(w => w.relabel && w.relabel());
  }

  // ---------- Modi ----------
  showMainMenu() {
    this.closeAll(true);
    clear(this.layerHUD); this.dialogue.close();
    this.mainMenu.show();
  }
  showCreator() { this.mainMenu.dim(); this.creator = new CharacterCreator(this); this.creator.show(this.layerMenu); }
  showHUD() { this.mainMenu.hide(); if (this.creator) { this.creator.destroy(); this.creator = null; } clear(this.layerMenu); this.closeAll(true); this.hud.build(); }
  updateMenu(dt) { if (this.mainMenu.visible) this.mainMenu.update(dt); if (this.creator) this.creator.update(dt); }
  update(dt) {
    if (this.g.mode === 'play') this.hud.update(dt);
    this.dialogue.update(dt);
    for (const w of this.stack) w.update && w.update(dt);
  }

  // ---------- Fenster ----------
  push(win) { this.stack.push(win); this.layerWin.append(win.el); audio.sfx('open'); }
  pop(win) {
    const i = this.stack.indexOf(win); if (i < 0) return;
    this.stack.splice(i, 1); win.el.remove(); win.onClose && win.onClose();
    audio.sfx('close'); this.pointerOverUI = false;
  }
  closeAll(silent) { [...this.stack].forEach(w => { const i = this.stack.indexOf(w); this.stack.splice(i, 1); w.el.remove(); w.onClose && w.onClose(); }); if (!silent) audio.sfx('close'); this.pointerOverUI = false; }
  blocksGame() { return this.stack.length > 0 || this.dialogue.open || this.cine || this.fading; }

  openMenu(tab) {
    if (this.g.mode !== 'play' || this.dialogue.open) return;
    const ex = this.stack.find(w => w instanceof GameMenu);
    if (ex) { if (ex.tab === tab) this.pop(ex); else ex.select(tab); return; }
    if (this.stack.length) return;
    this.push(new GameMenu(this, tab));
  }
  openDialogue(npc) { this.dialogue.start(npc); }
  openShop(id) { this.dialogue.close(); this.push(new ShopWindow(this, id)); }
  openSaveLoad(mode, onDone) { this.push(new SaveLoadWindow(this, mode, onDone)); }
  openSettings() {
    const win = { el: null };
    const body = h('div', { class: 'gm-body', style: { padding: '0' } });
    const panel = new SettingsPanel(this, body);
    const w = frame(h('div', { class: 'window gm', style: { height: 'auto', padding: '28px 18px 18px' } }, h('div', { class: 'wtitle ribbon' }, t('settings')), body));
    w.append(h('button', { class: 'iconbtn wclose pe', onclick: () => this.pop(win) }, '✕'));
    win.el = h('div', { class: 'overlay' }, w); win.relabel = () => panel.render();
    this.push(win);
  }
  escape() {
    if (this.dialogue.open) { this.dialogue.close(); return; }
    if (this.stack.length) { this.pop(this.stack[this.stack.length - 1]); return; }
    if (this.g.mode === 'play' && !this.fading) this.openPause();
  }
  openPause() {
    const win = {};
    const resume = () => this.pop(win);
    const mem = this.g.state.world.memoryMode;
    const box = frame(h('div', { class: 'window pause' },
      h('div', { class: 'wtitle ribbon' }, t('paused')),
      button(t('resume'), resume, 'primary'),
      button(t('save'), () => { if (mem) { this.toast(t('cantUseNow'), 'warn'); return; } this.openSaveLoad('save'); }),
      button(t('load'), () => this.openSaveLoad('load')),
      button(t('settings'), () => this.openSettings()),
      button(t('mainMenu'), () => this.confirm(L({ de: 'Zurück zum Hauptmenü? Ungespeicherter Fortschritt geht verloren.', en: 'Return to main menu? Unsaved progress will be lost.' }), () => { this.closeAll(true); this.g.toMenu(); })),
    ));
    win.el = h('div', { class: 'overlay' }, box);
    this.push(win);
  }
  choice(title, text, options) {
    const win = {};
    const box = frame(h('div', { class: 'window confirm', style: { width: '420px' } }, h('div', { class: 'h-title' }, title), text ? h('p', {}, text) : null,
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
        ...options.map(o => button(o.label, () => { this.pop(win); o.action(); }, 'primary')),
        button(t('cancel'), () => this.pop(win)))));
    win.el = h('div', { class: 'overlay', style: { zIndex: 40 } }, box);
    this.push(win);
  }
  confirm(text, yes, no) {
    const win = {};
    const box = frame(h('div', { class: 'window confirm' }, h('p', {}, text),
      h('div', { class: 'row' }, button(t('yes'), () => { this.pop(win); yes && yes(); }, 'primary'), button(t('no'), () => { this.pop(win); no && no(); }))));
    win.el = h('div', { class: 'overlay', style: { zIndex: 50 } }, box);
    this.push(win);
  }

  // ---------- Meldungen ----------
  toast(msg, type = 'info', dur = 3, icon = null) {
    const el = h('div', { class: 'toast ' + type }, icon ? img(iconURL(icon, 2)) : null, h('span', {}, msg));
    this.layerToast.append(el);
    while (this.layerToast.children.length > 5) this.layerToast.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, dur * 1000);
  }
  banner(title, sub, type = 'quest', dur = 4) {
    // Warteschlange, damit sich Banner nicht gegenseitig überschreiben
    const now = performance.now();
    this._bq = Math.max(this._bq || 0, now);
    const delay = this._bq - now;
    this._bq += Math.min(dur, 3.2) * 1000;
    if (delay > 30) { setTimeout(() => this._banner(title, sub, type, dur), delay); return; }
    this._banner(title, sub, type, dur);
  }
  _banner(title, sub, type, dur) {
    clear(this.layerBanner);
    const el = h('div', { class: 'bnr ' + type, style: { animationDuration: dur + 's' } },
      h('div', { class: 't' }, title), h('div', { class: 'line' }), type === 'region' && sub && sub.length > 40 ? null : h('div', { class: 's' }, sub || ''));
    if (type === 'region' && sub && sub.length > 40) { el.querySelector('.t').textContent = ''; el.prepend(h('div', { class: 's' }, title)); el.append(h('div', { class: 'sub2' }, sub)); }
    this.layerBanner.append(el);
    setTimeout(() => el.remove(), dur * 1000 + 100);
  }
  fade(dur, mid, label) {
    this.fading = true; this.fadeEl.classList.remove('dark');
    this.fadeEl.textContent = '';
    if (label) this.fadeEl.append(h('div', { style: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontFamily: 'var(--f-title)', fontSize: '22px', color: '#5b3a7a' } }, label));
    this.fadeEl.style.transition = `opacity ${dur / 2}s ease`; this.fadeEl.style.opacity = 1;
    setTimeout(() => { try { mid && mid(); } catch (e) { console.error(e); this.toast('Fehler: ' + e.message, 'error', 6); } this.fadeEl.style.opacity = 0; setTimeout(() => { this.fading = false; }, dur * 500); }, dur * 500 + 60);
  }
  cinematic(sec) {
    this.cine = true; this.lbTop.classList.add('on'); this.lbBot.classList.add('on');
    setTimeout(() => { this.cine = false; this.lbTop.classList.remove('on'); this.lbBot.classList.remove('on'); }, sec * 1000);
  }
  memoryCaption(text) { const el = h('div', { class: 'memcap' }, text); this.layerFX.append(el); setTimeout(() => el.remove(), 6200); }
  memoryQuote(text, cb) {
    this.cine = true;
    const el = h('div', { class: 'memquote' }, h('div', {}, text)); this.layerFX.append(el);
    setTimeout(() => { el.remove(); this.cine = false; cb && cb(); }, 4300);
  }
}
