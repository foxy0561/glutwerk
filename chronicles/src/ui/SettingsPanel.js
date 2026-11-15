// Einstellungen: Sprache, Lautstärke, Grafik, frei belegbare Tasten. Wird im Hauptmenü und im Spielmenü genutzt.
import { h, frame, clear, button } from './dom.js';
import { t } from '../core/i18n.js';
import { keyLabel, DEFAULT_BINDINGS } from '../engine/Input.js';
import { audio } from '../engine/Audio.js';

export class SettingsPanel {
  constructor(ui, body) { this.ui = ui; this.g = ui.g; this.body = body; this.render(); }
  refresh() {}
  seg(opts, cur, on) { return h('div', { class: 'seg' }, opts.map(([v, lab]) => h('button', { class: cur === v ? 'on' : '', onclick: () => { audio.sfx('click'); on(v); } }, lab))); }
  slider(v, on) { return h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: v, class: 'pe', oninput: e => on(+e.target.value), onchange: () => this.g.saveSettings() }); }
  render() {
    const S = this.g.settings, B = this.body;
    clear(B);
    const set = (k, v, re = true) => { S[k] = v; this.g.saveSettings(); if (re) this.render(); };
    const left = frame(h('div', { class: 'sbox scroll' },
      h('div', { class: 'h-title' }, t('language')),
      h('div', { class: 'srow' }, t('language'), this.seg([['de', 'Deutsch'], ['en', 'English']], S.lang, v => set('lang', v))),
      h('div', { class: 'h-title', style: { marginTop: '12px' } }, t('audio')),
      h('div', { class: 'srow' }, t('masterVol'), this.slider(S.master, v => { S.master = v; audio.setVolume({ master: v }); })),
      h('div', { class: 'srow' }, t('musicVol'), this.slider(S.music, v => { S.music = v; audio.setVolume({ music: v }); })),
      h('div', { class: 'srow' }, t('sfxVol'), this.slider(S.sfx, v => { S.sfx = v; audio.setVolume({ sfx: v }); audio.sfx('click'); })),
      h('div', { class: 'h-title', style: { marginTop: '12px' } }, t('graphics')),
      h('div', { class: 'srow' }, t('pixelScale'), this.seg([['auto', t('auto')], ['2', '2×'], ['3', '3×'], ['4', '4×']], String(S.scale), v => set('scale', v))),
      h('div', { class: 'srow' }, t('particles'), this.seg([[true, t('on')], [false, t('off')]], S.particles, v => set('particles', v))),
      h('div', { class: 'srow' }, t('screenShake'), this.seg([[true, t('on')], [false, t('off')]], S.shake, v => set('shake', v))),
      h('div', { class: 'srow' }, t('showFps'), this.seg([[true, t('on')], [false, t('off')]], S.fps, v => set('fps', v))),
    ), true);
    const binds = { ...DEFAULT_BINDINGS, ...(S.bindings || {}) };
    const rows = Object.keys(DEFAULT_BINDINGS).map(act => {
      const b = h('button', { class: 'keybtn' }, keyLabel(binds[act]));
      b.onclick = () => {
        b.textContent = t('pressKey'); b.classList.add('wait');
        this.g.input.captureNext(code => {
          if (code !== 'Escape' || act === 'pause') { S.bindings = { ...binds, [act]: code }; this.g.saveSettings(); }
          this.render(); if (this.g.mode === 'play') this.ui.hud.build();
        });
      };
      return h('div', { class: 'srow' }, t('act_' + act), b);
    });
    const right = frame(h('div', { class: 'sbox scroll' }, h('div', { class: 'h-title' }, t('controls')), rows,
      h('div', { class: 'small muted', style: { margin: '8px 0' } }, t('mouseAttack'), h('br'), t('hotkeys')),
      button(t('resetKeys'), () => { S.bindings = null; this.g.saveSettings(); this.render(); if (this.g.mode === 'play') this.ui.hud.build(); }, 'sm')), true);
    B.append(h('div', { class: 'settings' }, left, right));
  }
}
