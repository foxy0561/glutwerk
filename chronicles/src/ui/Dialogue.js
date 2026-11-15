// Dialogfenster mit Porträt, Schreibmaschinen-Text und Antwortoptionen (Maus oder Tasten 1–4 / E).
import { h, frame, clear, canvasEl } from './dom.js';
import { t, L } from '../core/i18n.js';
import { getPortrait } from '../art/characterArt.js';
import { audio } from '../engine/Audio.js';

export class DialogueBox {
  constructor(ui) {
    this.ui = ui; this.g = ui.g; this.open = false;
    window.addEventListener('keydown', e => this.key(e));
  }
  start(npc) {
    this.npc = npc; npc.talking = true; this.open = true;
    this.nodes = npc.def.dialogue(this.g.api);
    this.show('start');
  }
  show(id) {
    if (id === 'end' || !id) { this.close(); return; }
    // Knoten neu erzeugen, damit Bedingungen aktuell sind
    this.nodes = this.npc.def.dialogue(this.g.api);
    const n = this.nodes[id]; if (!n) { this.close(); return; }
    this.node = n; this.full = L(n.text); this.shown = 0; this.typing = true;
    const L0 = this.ui.layerDlg; clear(L0);
    const pc = canvasEl(64, 64); pc.getContext('2d').drawImage(getPortrait(this.npc.def.app, 64), 0, 0);
    this.txEl = h('div', { class: 'tx' });
    this.optEl = h('div', { class: 'opts' });
    this.el = frame(h('div', { class: 'dlg pe' }, h('div', { class: 'pt' }, pc),
      h('div', {}, h('div', { class: 'nm' }, L(this.npc.def.name), h('small', {}, L(this.npc.def.title))), this.txEl, this.optEl)));
    this.el.addEventListener('click', e => { if (this.typing && !e.target.closest('.opt')) this.finishTyping(); });
    L0.append(this.el);
  }
  finishTyping() { this.shown = this.full.length; this.typing = false; this.txEl.textContent = this.full; this.renderOpts(); }
  renderOpts() {
    clear(this.optEl);
    this.opts = (this.node.options || [{ text: { de: 'Weiter', en: 'Continue' }, next: 'end' }]).filter(o => !o.show || o.show());
    this.opts.forEach((o, i) => this.optEl.append(h('button', { class: 'opt', onclick: () => this.choose(i) }, h('b', {}, i + 1 + '.'), L(o.text))));
  }
  choose(i) {
    const o = this.opts && this.opts[i]; if (!o) return;
    audio.sfx('click');
    let next = o.next;
    if (o.action) next = o.action();
    if (next === null) { this.close(); return; }
    this.show(next || 'end');
  }
  key(e) {
    if (!this.open) return;
    if (this.typing && (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space')) { this.finishTyping(); e.preventDefault(); return; }
    const m = /^Digit([1-9])$/.exec(e.code);
    if (m && !this.typing) { this.choose(+m[1] - 1); e.preventDefault(); }
  }
  update(dt) {
    if (!this.open || !this.typing) return;
    this.shown += dt * 55;
    const n = Math.floor(this.shown);
    if (n >= this.full.length) { this.finishTyping(); return; }
    if (this.txEl.textContent.length !== n) { this.txEl.textContent = this.full.slice(0, n); if (n % 3 === 0) audio.sfx('talk'); }
  }
  close() {
    if (this.npc) this.npc.talking = false;
    this.open = false; this.typing = false; clear(this.ui.layerDlg);
  }
}
