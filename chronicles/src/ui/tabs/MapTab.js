// Weltkarte der aktuellen Region mit Nebel des Unerforschten, Orten, Personen und Questzielen.
import { h, frame, clear, canvasEl } from '../dom.js';
import { t, L } from '../../core/i18n.js';
import { TS } from '../../world/WorldMap.js';

export class MapTab {
  constructor(menu, body) { this.g = menu.g; this.ui = menu.ui; this.body = body; this.t = 0; this.refresh(); }
  refresh() {
    clear(this.body);
    const W = this.g.world, S = 8;
    this.cv = canvasEl(W.w * S, W.h * S);
    const legend = frame(h('div', { class: 'legend' }, h('div', { class: 'h-title' }, L(W.def.name)),
      h('div', {}, h('i', { style: { background: '#fff' } }), t('you')),
      h('div', {}, h('i', { style: { background: '#ffd24a', borderRadius: '0', transform: 'rotate(45deg) scale(.8)' } }), t('questTarget')),
      h('div', {}, h('i', { style: { background: '#f0d27a' } }), t('people')),
      h('div', {}, h('i', { style: { background: '#1a1c1e', border: '1px solid #444' } }), t('unknownArea')),
      h('div', { class: 'sep' }),
      ...W.def.regions.filter(r => this.g.state.flags['reg_' + r.id]).map(r => h('div', { class: 'small' }, '◆ ' + L(r.name)))), true);
    this.body.append(h('div', { class: 'mapwrap' }, h('div', { class: 'mapview' }, this.cv), legend));
    this.draw();
  }
  update(dt) { this.t += dt; if ((this.t * 4 | 0) !== this._lt) { this._lt = this.t * 4 | 0; this.draw(); } }
  draw() {
    const g = this.g, W = g.world, S = 8, x = this.cv.getContext('2d');
    x.imageSmoothingEnabled = false;
    // Pergament-Ton
    x.drawImage(W.minimap, 0, 0, W.w * S, W.h * S);
    x.fillStyle = 'rgba(80,50,20,0.12)'; x.fillRect(0, 0, this.cv.width, this.cv.height);
    for (let ty = 0; ty < W.h; ty++) for (let tx = 0; tx < W.w; tx++) if (!g.discovered[ty * W.w + tx]) { x.fillStyle = '#121416'; x.fillRect(tx * S, ty * S, S, S); }
    x.font = '600 15px "Alegreya Sans", sans-serif'; x.textAlign = 'center';
    for (const r of W.def.regions) if (g.state.flags['reg_' + r.id]) { x.fillStyle = 'rgba(10,6,14,0.75)'; const s = L(r.name); x.fillText(s, r.x * S + 1, r.y * S - 18 + 1); x.fillStyle = '#f6e6c4'; x.fillText(s, r.x * S, r.y * S - 18); }
    for (const n of g.npcs) if (g.discovered[(n.y / TS | 0) * W.w + (n.x / TS | 0)]) { x.fillStyle = '#f0d27a'; x.beginPath(); x.arc(n.x / TS * S, n.y / TS * S, 4, 0, 7); x.fill(); }
    for (const q of this.ui.hud.questTargets()) { const qx = q.x / TS * S, qy = q.y / TS * S, r = q.small ? 4 : 7 + Math.sin(this.t * 4) * 1.5; x.fillStyle = q.main ? '#ffd24a' : '#c49af5'; x.strokeStyle = '#1a1020'; x.lineWidth = 2; x.beginPath(); x.moveTo(qx, qy - r); x.lineTo(qx + r, qy); x.lineTo(qx, qy + r); x.lineTo(qx - r, qy); x.closePath(); x.stroke(); x.fill(); }
    const px = g.player.x / TS * S, py = g.player.y / TS * S;
    x.fillStyle = '#fff'; x.strokeStyle = '#1a1020'; x.lineWidth = 2; x.beginPath(); x.arc(px, py, 6, 0, 7); x.stroke(); x.fill();
  }
}
