// Spiel-HUD: Porträt + Leisten, Minimap, Questverfolgung, Schnellleiste, Menütasten.
import { h, frame, img, clear, canvasEl } from './dom.js';
import { t, L } from '../core/i18n.js';
import { iconURL } from '../art/iconArt.js';
import { getPortrait } from '../art/characterArt.js';
import { ITEMS } from '../data/items.js';
import { QUESTS } from '../data/quests.js';
import { NPCS } from '../data/npcs.js';
import { xpForLevel } from '../data/characters.js';
import { keyLabel } from '../engine/Input.js';
import { TS } from '../world/WorldMap.js';
import { audio } from '../engine/Audio.js';

export class HUD {
  constructor(ui) { this.ui = ui; this.g = ui.g; this.built = false; this.mmT = 0; }
  build() {
    const L0 = this.ui.layerHUD; clear(L0);
    const g = this.g;
    this.portraitCv = canvasEl(64, 64);
    this.lvl = h('div', { class: 'lvl' });
    this.bars = {};
    const bar = k => { const el = h('div', { class: 'bar ' + k }, h('div', { class: 'fill' }), h('span')); this.bars[k] = el; return el; };
    this.xp = h('div', { class: 'xpbar' }, h('div'));
    L0.append(h('div', { class: 'hud-tl' }, h('div', { class: 'portrait' }, this.portraitCv), this.lvl, h('div', { class: 'bars' }, bar('hp'), bar('mp'), bar('st'), this.xp)));
    // Minimap
    this.mmCv = canvasEl(150, 150, '');
    this.mmRegion = h('b'); this.mmTime = h('span');
    L0.append(h('div', { class: 'hud-tr' }, h('div', { class: 'minimap' }, this.mmCv, h('div', { class: 'north' }, 'N')), h('div', { class: 'mm-info' }, this.mmRegion, h('br'), this.mmTime)));
    // Quest-Tracker
    this.tracker = frame(h('div', { class: 'tracker' }), true);
    L0.append(this.tracker);
    // Schnellleiste + Menüs
    this.hot = h('div', { class: 'hotbar' });
    frame(this.hot, true);
    this.hslots = [];
    for (let i = 0; i < 10; i++) { const s = h('div', { class: 'hslot' + (i === 0 ? ' weapon' : '') }); this.hslots.push(s); this.hot.append(s); }
    const B = g.input.bindings;
    const menus = [['inventory', 'ui_bag', B.inventory], ['character', 'ui_char', B.character], ['skills', 'ui_book', B.skills], ['quests', 'ui_scroll', B.quests], ['map', 'ui_map', B.map]];
    const mbox = h('div', { class: 'hud-menus' }, menus.map(([tab, ic, key]) => h('div', { class: 'hmenu pe', title: t(tab === 'quests' ? 'quests' : tab), onclick: () => { audio.init(); audio.sfx('click'); this.ui.openMenu(tab); } }, img(iconURL(ic, 2)), h('span', { class: 'k' }, keyLabel(key)))));
    L0.append(h('div', { class: 'hud-bottom' }, this.hot, mbox));
    this.fpsEl = h('div', { class: 'fps' }); L0.append(this.fpsEl);
    this.built = true;
    this.unsub && this.unsub.forEach(f => f());
    this.unsub = [g.events.on('inventory', () => this.refreshHotbar()), g.events.on('quests', () => this.refreshTracker()), g.events.on('player', () => this.refreshPortrait())];
    this.refreshHotbar(); this.refreshTracker(); this.refreshPortrait();
    this.setMemory(g.state && g.state.world.memoryMode);
  }
  setMemory(on) { this.ui.layerHUD.classList.toggle('memory', !!on); }
  refreshPortrait() {
    const g = this.g; if (!g.state) return;
    const x = this.portraitCv.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 64, 64);
    x.drawImage(getPortrait(g.state.world.memoryMode ? g.memoryApp : g.state.player.app, 64), 0, 0);
    this.lvl.textContent = `${t('lv')} ${g.state.player.level}`;
  }
  refreshHotbar() {
    const inv = this.g.inventory; if (!inv) return;
    this.hslots.forEach((s, i) => {
      clear(s);
      s.append(h('span', { class: 'k' }, String((i + 1) % 10)));
      const id = inv.hotbar[i];
      if (id && ITEMS[id]) {
        s.append(img(iconURL(ITEMS[id].icon, 3)));
        const n = inv.count(id); if (ITEMS[id].stack > 1) s.append(h('span', { class: 'n' }, n));
        s.title = L(ITEMS[id].name);
      } else s.title = '';
    });
  }
  flashHotbar(i) { const s = this.hslots[i]; if (!s) return; s.classList.remove('flash'); void s.offsetWidth; s.classList.add('flash'); }
  flashBar(k) { const b = this.bars[k]; if (!b) return; b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); }
  refreshTracker() {
    const g = this.g, Q = g.quests; if (!Q) return;
    clear(this.tracker);
    const mem = g.state.world.memoryMode;
    let id = Q.tracked && Q.q[Q.tracked].status === 'active' ? Q.tracked : Q.active()[0];
    if (!id) { this.tracker.style.display = 'none'; return; }
    this.tracker.style.display = '';
    const def = QUESTS[id], s = Q.q[id];
    this.tracker.append(h('h3', {}, mem ? t('memory') : L(def.title)));
    // abgeschlossene Vorstufe kurz zeigen + aktuelle
    if (s.stage > 0 && !mem) this.tracker.append(h('div', { class: 'obj done' }, h('i'), L(def.stages[s.stage - 1].text)));
    const st = def.stages[s.stage];
    const [a, b] = Q.progress(id);
    this.tracker.append(h('div', { class: 'obj' }, h('i'), L(st.text) + (b > 1 || st.collect ? ` (${a}/${b})` : ' (0/1)')));
    const others = Q.active().filter(k => k !== id).length;
    if (others && !mem) this.tracker.append(h('div', { class: 'more' }, L({ de: `+${others} weitere Quest${others > 1 ? 's' : ''} (J)`, en: `+${others} more quest${others > 1 ? 's' : ''} (J)` })));
  }
  update(dt) {
    const g = this.g; if (!g.state || !this.built) return;
    const P = g.state.player, d = g.stats();
    const set = (k, v, m) => { const b = this.bars[k]; b.firstChild.style.width = (100 * Math.max(0, v) / m).toFixed(1) + '%'; b.lastChild.textContent = `${Math.round(v)} / ${m}`; };
    set('hp', P.hp, d.maxHp); set('mp', P.mp, d.maxMp); set('st', P.st, d.maxSt);
    this.xp.firstChild.style.width = (100 * P.xp / xpForLevel(P.level)) + '%';
    this.fpsEl.textContent = g.settings.fps ? `${g.fps} ${t('fps')}` : '';
    this.mmT -= dt;
    if (this.mmT <= 0) { this.mmT = 0.08; this.drawMinimap(); }
    const reg = g.world.regionAt(g.player.x, g.player.y);
    const name = g.state.world.memoryMode ? t('memory') : reg ? L(reg.name) : L(g.world.def.name);
    if (this.mmRegion.textContent !== name) this.mmRegion.textContent = name;
    this.mmTime.textContent = `${t('day')} · ${g.day.label()}`;
  }
  questTargets() {
    // Weltpositionen (Pixel) der aktuellen Questziele
    const g = this.g, Q = g.quests, out = [], W = g.world;
    for (const id of Q.active()) {
      const st = QUESTS[id].stages[Q.q[id].stage]; if (!st || !st.target) continue;
      const tr = st.target, main = id === Q.tracked;
      if (W.id !== 'farnlager') { if (W.entrance && !out.length) out.push({ x: W.entrance.x, y: W.entrance.y, main: true }); continue; }
      if (tr.npc) { const n = W.npcs.find(n => n.id === tr.npc); if (n) out.push({ x: n.x, y: n.y, main }); }
      if (tr.pos) out.push({ x: tr.pos[0] * TS, y: tr.pos[1] * TS, main });
      if (tr.item) for (const it of W.interactables) if (it.kind === 'pickup' && it.item === tr.item) out.push({ x: it.x, y: it.y, main, small: true });
      if (tr.lanterns) for (const it of W.interactables) if (it.kind === 'lantern' && !(g.state.world.memLit || {})[it.id]) out.push({ x: it.x, y: it.y, main });
    }
    return out;
  }
  drawMinimap() {
    const g = this.g, W = g.world, cv = this.mmCv, x = cv.getContext('2d');
    const S = W.minimapScale, zoom = W.minimapZoom || 2.2;
    const fd = g.fogDims(W.id), fc = fd.c * S;
    x.imageSmoothingEnabled = false;
    x.fillStyle = '#0b120c'; x.fillRect(0, 0, 150, 150);
    const px = g.player.x / TS * S, py = g.player.y / TS * S;
    x.save(); x.translate(75, 75); x.scale(zoom, zoom); x.translate(-px, -py);
    x.drawImage(W.minimap, 0, 0);
    // Nebel des Unerforschten
    x.fillStyle = 'rgba(6,8,10,0.82)';
    const span = Math.ceil(80 / zoom / fc) + 1, fx = Math.floor(px / fc), fy = Math.floor(py / fc);
    for (let ty = Math.max(0, fy - span); ty < Math.min(fd.h, fy + span); ty++) for (let tx = Math.max(0, fx - span); tx < Math.min(fd.w, fx + span); tx++)
      if (!g.discovered[ty * fd.w + tx]) x.fillRect(tx * fc, ty * fc, fc, fc);
    // Orte
    for (const m of W.mapMarkers()) { const mx = m.x / TS * S, my = m.y / TS * S; x.fillStyle = m.type === 'tele' ? '#c49af5' : m.type === 'dungeon' ? '#c8504a' : '#efe3c8'; x.fillRect(mx - 1.5, my - 1.5, 3, 3); x.fillStyle = '#1a1020'; x.fillRect(mx - 0.5, my - 0.5, 1, 1); }
    // NPCs
    if (!(g.state.world.memoryMode && W.id === 'farnlager')) for (const n of W.npcs) { x.fillStyle = '#f0d27a'; x.fillRect(n.x / TS * S - 1, n.y / TS * S - 1, 2, 2); }
    // Questziele
    const tt = performance.now() / 300;
    for (const q of this.questTargets()) {
      const qx = q.x / TS * S, qy = q.y / TS * S;
      x.fillStyle = q.main ? '#ffd24a' : '#c49af5';
      const r = (q.small ? 1.4 : 2.2 + Math.sin(tt) * 0.4) * (W.id === 'farnlager' ? 1 : 1.4);
      x.beginPath(); x.moveTo(qx, qy - r); x.lineTo(qx + r, qy); x.lineTo(qx, qy + r); x.lineTo(qx - r, qy); x.fill();
    }
    x.restore();
    // Spielerpfeil
    const ang = Math.atan2(g.player.face.y, g.player.face.x);
    x.save(); x.translate(75, 75); x.rotate(ang);
    x.fillStyle = '#fff'; x.strokeStyle = '#1a1020'; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(6, 0); x.lineTo(-4, -4); x.lineTo(-2, 0); x.lineTo(-4, 4); x.closePath(); x.stroke(); x.fill();
    x.restore();
    const gr = x.createRadialGradient(75, 75, 50, 75, 75, 76); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.6)');
    x.fillStyle = gr; x.fillRect(0, 0, 150, 150);
  }
}
