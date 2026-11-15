// Weltkarte der aktuellen Region mit Nebel des Unerforschten, Orten, Personen und Questzielen.
import { h, frame, clear, canvasEl } from '../dom.js';
import { t, L } from '../../core/i18n.js';
import { TS } from '../../world/WorldMap.js';

export class MapTab {
  constructor(menu, body) { this.g = menu.g; this.ui = menu.ui; this.body = body; this.t = 0; this.refresh(); }
  refresh() {
    clear(this.body);
    const W = this.g.world, S = W.w > 200 ? 1 : 8;
    this.S = S;
    this.cv = canvasEl(W.w * S, W.h * S);
    const legend = frame(h('div', { class: 'legend' }, h('div', { class: 'h-title' }, L(W.def.name)),
      h('div', {}, h('i', { style: { background: '#fff' } }), t('you')),
      h('div', {}, h('i', { style: { background: '#ffd24a', borderRadius: '0', transform: 'rotate(45deg) scale(.8)' } }), t('questTarget')),
      h('div', {}, h('i', { style: { background: '#f0d27a' } }), t('people')),
      h('div', {}, h('i', { style: { background: '#1a1c1e', border: '1px solid #444' } }), t('unknownArea')),
      h('div', { class: 'sep' }),
      ...W.def.regions.filter(r => this.g.state.flags['reg_' + r.id]).map(r => h('div', { class: 'small' }, '◆ ' + L(r.name))),
      ...(W.id === 'world' ? [h('div', { class: 'small muted', style: { lineHeight: 1.4 } }, L({ de: `${W.mapMarkers().length} von ${W.places.filter(p => p.type !== 'spot').length} Orten entdeckt. Schiffe und verborgene Zirkel bringen dich weit herum.`, en: `${W.mapMarkers().length} of ${W.places.filter(p => p.type !== 'spot').length} places discovered. Ships and hidden circles take you far.` }))] : [])), true);
    this.body.append(h('div', { class: 'mapwrap' }, h('div', { class: 'mapview' }, this.cv), legend));
    this.draw();
  }
  update(dt) { this.t += dt; if ((this.t * 4 | 0) !== this._lt) { this._lt = this.t * 4 | 0; this.draw(); } }
  draw() {
    const g = this.g, W = g.world, S = this.S, x = this.cv.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(W.minimap, 0, 0, W.w * S, W.h * S);
    x.fillStyle = 'rgba(80,50,20,0.12)'; x.fillRect(0, 0, this.cv.width, this.cv.height);
    const fd = g.fogDims(W.id), fc = fd.c * S;
    x.fillStyle = W.id === 'world' ? 'rgba(18,20,22,0.8)' : '#121416';
    for (let ty = 0; ty < fd.h; ty++) for (let tx = 0; tx < fd.w; tx++) if (!g.discovered[ty * fd.w + tx]) x.fillRect(tx * fc, ty * fc, fc, fc);
    const big = W.id === 'world';
    x.textAlign = 'center';
    const label = (s2, lx, ly, size) => { x.font = `600 ${size}px "Alegreya Sans", sans-serif`; x.fillStyle = 'rgba(10,6,14,0.8)'; x.fillText(s2, lx + 1, ly + 1); x.fillStyle = '#f6e6c4'; x.fillText(s2, lx, ly); };
    if (!big) for (const r of W.def.regions) if (g.state.flags['reg_' + r.id]) label(L(r.name), r.x * S, r.y * S - 18, 15);
    for (const m of W.mapMarkers()) {
      const mx = m.x / TS * S, my = m.y / TS * S;
      x.fillStyle = m.type === 'tele' ? '#c49af5' : m.type === 'dungeon' ? '#c8504a' : m.type === 'capital' ? '#f0d27a' : '#efe3c8';
      const r = m.type === 'capital' ? 5 : m.type === 'city' ? 4 : 3;
      x.strokeStyle = '#1a1020'; x.lineWidth = 1.5; x.beginPath(); x.arc(mx, my, r, 0, 7); x.stroke(); x.fill();
      label(L(m.name), mx, my - r - 4, m.type === 'capital' ? 13 : 11);
    }
    if (!big) for (const n of W.npcs) if (g.discovered[(n.y / TS | 0) * fd.w + (n.x / TS | 0)]) { x.fillStyle = '#f0d27a'; x.beginPath(); x.arc(n.x / TS * S, n.y / TS * S, 4, 0, 7); x.fill(); }
    for (const q of this.ui.hud.questTargets()) { const qx = q.x / TS * S, qy = q.y / TS * S, r = (q.small ? 4 : 7 + Math.sin(this.t * 4) * 1.5) * (big ? 0.8 : 1); x.fillStyle = q.main ? '#ffd24a' : '#c49af5'; x.strokeStyle = '#1a1020'; x.lineWidth = 2; x.beginPath(); x.moveTo(qx, qy - r); x.lineTo(qx + r, qy); x.lineTo(qx, qy + r); x.lineTo(qx - r, qy); x.closePath(); x.stroke(); x.fill(); }
    const px = g.player.x / TS * S, py = g.player.y / TS * S;
    x.fillStyle = '#fff'; x.strokeStyle = '#1a1020'; x.lineWidth = 2; x.beginPath(); x.arc(px, py, big ? 4 : 6, 0, 7); x.stroke(); x.fill();
  }
}
