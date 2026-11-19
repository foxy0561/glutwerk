// Zauber wirken, lernen und üben. Zustand liegt in state.player.magic (wird gespeichert).
import { SPELLS, SCHOOLS, RANK_XP, SILENT_CASTS, BOOKS, TEACH_COST, RANKS } from '../data/magic.js';
import { L } from '../core/i18n.js';
import { audio } from '../engine/Audio.js';
import { ITEMS } from '../data/items.js';
import { PixelGrid, valueNoise, bayer } from '../engine/PixelUtil.js';

const EARTH = ['#2a1c10', '#3a2616', '#563a20', '#6a4a2a', '#8a6438', '#9a7448', '#b8955e', '#d0b080'];
function earthWall(w, h) {
  const H = h + 24, G = new PixelGrid(w + 2, H), sd = Math.random() * 99;
  for (let x = 0; x < w; x++) {
    const top = 2 + Math.round(valueNoise(x * 0.25, 0, sd) * 5);
    for (let y = top; y < H; y++) {
      const face = y > top + h, n = valueNoise(x * 0.4, y * 0.4, sd + 3);
      let l = face ? 0.55 - (y - top - h) / 50 + (n - 0.5) * 0.4 : 0.8 + (n - 0.5) * 0.3;
      if (y === top) l = 0.95; if (face && (x * 5 + y * 3) % 17 === 0) l -= 0.25;
      const v = Math.max(0, Math.min(0.999, l)) * (EARTH.length - 1), i = Math.floor(v);
      G.set(x + 1, y, EARTH[Math.min(EARTH.length - 1, i + ((v - i) > bayer(x, y) ? 1 : 0))]);
    }
  }
  G.outline(0.5); return G.toCanvas();
}

const TS = 16;
const PART = { feuer: ['#ffd070', '#f0802a', '#c8401c'], wasser: ['#bfe6ff', '#4fa0e8', '#2a6ab8'], wind: ['#e0fff2', '#8ad0b0', '#ffffff'], erde: ['#d0b080', '#9a7448', '#6a4a2a'], heilung: ['#e8ffc0', '#8ad060', '#ffffff'], entgiftung: ['#d0fff0', '#6ac09a'], barriere: ['#eef0ff', '#9aaae8'], beschwoerung: ['#f0d8ff', '#b07ad0'] };
const LIGHT = { feuer: [255, 150, 70], wasser: [120, 180, 255], wind: [200, 255, 230], erde: [220, 180, 120], heilung: [180, 255, 140], entgiftung: [150, 255, 210], barriere: [190, 200, 255], beschwoerung: [220, 170, 255] };

export class Magic {
  constructor(g) { this.g = g; this.reset(); }
  reset() { this.bolts = []; this.zones = []; this.walls = []; this.summons = []; this.cd = {}; this.chant = null; this.shield = null; this.buffs = {}; }

  static ensure(P) {
    const M = P.magic = P.magic || {};
    for (const k of ['learned', 'xp', 'casts']) M[k] = M[k] || {};
    M.bar = M.bar || []; M.active = M.active || 0; M.bonus = M.bonus || 0; M.spent = M.spent || 0;
    if (P.foxy) for (const id of ['mondquelle', 'mondlicht', 'schleierbruch', 'wasserkugel', 'heilung']) if (!M.learned[id]) { M.learned[id] = 1; if (M.bar.length < 6 && !M.bar.includes(id)) M.bar.push(id); }
    if (P.spells && P.spells.veil && !M.learned.schleierbruch) { M.learned.schleierbruch = 1; M.bar.push('schleierbruch'); }
    return M;
  }
  get M() { return Magic.ensure(this.g.state.player); }
  learned(id) { return !!this.M.learned[id]; }
  schoolRank(s) { let r = -1; for (const id in this.M.learned) { const sp = SPELLS[id]; if (sp && sp.school === s && !sp.combo) r = Math.max(r, sp.rank); } return r; }
  xp(s) { return this.M.xp[s] || 0; }
  silent(s) { return this.g.state.player.foxy || (this.M.casts[s] || 0) >= SILENT_CASTS; }
  teacher() {
    const T = this.g.ui.teacher; if (!T || !T.npc) return null;
    if (!this.g.world.npcs.includes(T.npc) || Math.hypot(T.npc.x - this.g.player.x, T.npc.y - this.g.player.y) > 80) { this.g.ui.teacher = null; return null; }
    return T;
  }
  bookFor(sp) { for (const id in BOOKS) if (BOOKS[id][sp.school] !== undefined && BOOKS[id][sp.school] >= sp.rank && this.g.inventory.count(id)) return id; return null; }
  prereq(sp) {
    if (sp.combo) return Object.values(SPELLS).filter(s => s.school === sp.school && s.rank === sp.rank - 1 && !s.combo);
    if (sp.rank === 0) return [];
    return Object.values(SPELLS).filter(s => s.school === sp.school && s.rank === sp.rank - 1 && !s.combo);
  }
  // Prüft alle Bedingungen; liefert Liste für die Anzeige
  check(id) {
    const sp = SPELLS[id], out = { reqs: [], via: null, cost: 0 };
    if (this.learned(id)) { out.done = true; return out; }
    const sc = SCHOOLS[sp.school];
    if (sc.unique === 'foxy') { out.reqs.push({ ok: false, text: { de: 'Nur Foxy beherrscht diese Magie.', en: 'Only Foxy knows this magic.' } }); return out; }
    const book = this.bookFor(sp), T = this.teacher(), tOk = T && T.teach[sp.school] !== undefined && T.teach[sp.school] >= sp.rank;
    if (book) out.via = 'book';
    else if (tOk) { out.via = 'teacher'; out.cost = TEACH_COST[sp.rank] || 200; }
    out.reqs.push({ ok: !!out.via, text: book ? { de: 'Quelle: ' + ITEMS[book].name.de, en: 'Source: ' + ITEMS[book].name.en } : tOk ? { de: `Lehrer: ${L(T.name)} (${out.cost} Gold)`, en: `Teacher: ${L(T.name)} (${out.cost} gold)` } : { de: 'Magiebuch oder Lehrer nötig', en: 'Needs a magic book or a teacher' } });
    const need = RANK_XP[sp.rank], have = this.xp(sp.school);
    if (need > 0) out.reqs.push({ ok: have >= need, text: { de: `Übung in ${sc.name.de}: ${Math.min(have, need)}/${need}`, en: `${sc.name.en} practice: ${Math.min(have, need)}/${need}` } });
    for (const p of this.prereq(sp)) out.reqs.push({ ok: this.learned(p.id), text: { de: 'Vorher: ' + p.name.de, en: 'First: ' + p.name.en } });
    if (sp.combo) for (const s in sp.combo) out.reqs.push({ ok: this.schoolRank(s) >= sp.combo[s], text: { de: `${SCHOOLS[s].name.de}: ${RANKS[sp.combo[s]].de}`, en: `${SCHOOLS[s].name.en}: ${RANKS[sp.combo[s]].en}` } });
    if (out.via === 'teacher') out.reqs.push({ ok: this.g.inventory.gold >= out.cost, text: { de: `Gold: ${this.g.inventory.gold}/${out.cost}`, en: `Gold: ${this.g.inventory.gold}/${out.cost}` } });
    out.ok = out.reqs.every(r => r.ok);
    return out;
  }
  learn(id) {
    const c = this.check(id); if (!c.ok) return false;
    if (c.via === 'teacher') { this.g.inventory.gold -= c.cost; this.g.inventory.changed(); }
    this.M.learned[id] = 1;
    if (this.M.bar.length < 6 && !this.M.bar.includes(id)) this.M.bar.push(id);
    audio.sfx('magic');
    this.g.ui.toast(L({ de: 'Zauber gelernt: ', en: 'Spell learned: ' }) + L(SPELLS[id].name), 'secret', 3);
    this.g.events.emit('magic');
    return true;
  }
  toggleBar(id) {
    const b = this.M.bar, i = b.indexOf(id);
    if (i >= 0) { b.splice(i, 1); if (this.M.active >= b.length) this.M.active = Math.max(0, b.length - 1); }
    else if (b.length < 6) b.push(id);
    this.g.events.emit('magic');
  }
  cycle(d) { const b = this.M.bar; if (!b.length) return; this.M.active = (this.M.active + d + b.length) % b.length; this.g.events.emit('magic'); }
  activeId() { return this.M.bar[this.M.active]; }

  // ---------- Wirken ----------
  castActive() {
    const id = this.activeId();
    if (!id) { this.g.ui.toast(L({ de: 'Kein Zauber gewählt – lerne einen im Magie-Menü (K).', en: 'No spell selected – learn one in the magic menu (K).' }), 'info', 2.5); return; }
    this.cast(id);
  }
  cast(id) {
    const g = this.g, sp = SPELLS[id], P = g.state.player;
    if (!sp || !this.learned(id) || this.chant) return;
    if (sp.kind === 'custom') { g[sp.fn](); return; }
    if ((this.cd[id] || 0) > 0) return;
    if (P.mp < sp.mp) { g.ui.hud.flashBar('mp'); return; }
    if (this.silent(sp.school)) this.execute(sp);
    else { this.chant = { sp, t: 0, dur: 0.35 + sp.rank * 0.25 }; audio.sfx('click'); }
  }
  aim() { const [mx, my] = this.g.mouseWorld(), p = this.g.player; const dx = mx - p.x, dy = my - (p.y - 10), d = Math.hypot(dx, dy) || 1; return { mx, my, dx: dx / d, dy: dy / d, d }; }
  target(maxD = 170) { const a = this.aim(), p = this.g.player, d = Math.min(a.d, maxD); return [p.x + a.dx * d, p.y - 10 + a.dy * d + 10]; }
  execute(sp) {
    const g = this.g, P = g.state.player, p = g.player, a = this.aim(), S = sp.school;
    if (P.mp < sp.mp) return;
    P.mp -= sp.mp; this.cd[sp.id] = sp.cd; g.castGlow = 0.6;
    this.train(sp);
    audio.sfx('magic');
    if (Math.abs(a.dx) > Math.abs(a.dy)) p.dir = a.dx > 0 ? 'right' : 'left'; else p.dir = a.dy > 0 ? 'down' : 'up';
    p.face = { x: Math.abs(a.dx) > Math.abs(a.dy) ? Math.sign(a.dx) : 0, y: Math.abs(a.dx) > Math.abs(a.dy) ? 0 : Math.sign(a.dy) };
    const col = PART[S] || ['#ffffff'];
    switch (sp.kind) {
      case 'bolt': this.bolts.push({ sp, x: p.x + a.dx * 8, y: p.y - 12 + a.dy * 6, vx: a.dx * sp.speed, vy: a.dy * sp.speed, dist: 0, hit: new Set() }); break;
      case 'cone': {
        const ang = Math.atan2(a.dy, a.dx);
        for (let i = 0; i < (sp.wave ? 70 : 50); i++) { const t = ang + (Math.random() - 0.5) * 1.2, s = 60 + Math.random() * 90; g.particles.spawn({ x: p.x + Math.cos(t) * 6, y: p.y - 10 + Math.sin(t) * 6, vx: Math.cos(t) * s, vy: Math.sin(t) * s, life: sp.range / s, max: sp.range / s, color: col[i % col.length], glow: S === 'feuer', size: sp.wave ? 2 : 1, drag: 0.5 }); }
        for (const o of g.world.objectsNear(p.x, p.y, sp.range + 10)) { const dx = o.x - p.x, dy = o.y - 6 - (p.y - 10), d = Math.hypot(dx, dy); if (o.cuttable && d < sp.range && Math.abs(((Math.atan2(dy, dx) - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.65) g.breakObject(o); }
        this.zones.push({ sp, x: p.x + a.dx * sp.range * 0.5, y: p.y - 4 + a.dy * sp.range * 0.5, t: 0.5, max: 0.5, light: true });
        break;
      }
      case 'burst': { const [tx, ty] = this.target(); this.zones.push({ sp, x: tx, y: ty, t: sp.dur, max: sp.dur, burst: true, tick: 0 }); this.smash(tx, ty, sp.radius); if (g.settings.shake) g.cam.shake = 2; break; }
      case 'zone': { const [tx, ty] = sp.heal ? [p.x, p.y] : this.target(); this.zones.push({ sp, x: tx, y: ty, t: sp.dur, max: sp.dur }); break; }
      case 'wall': {
        const [tx, ty] = this.target(120), horiz = Math.abs(a.dy) >= Math.abs(a.dx), w = horiz ? sp.len : 12, h = horiz ? 10 : sp.len;
        let box = { x: tx - w / 2, y: ty - h / 2, w, h };
        const b = g.playerBox(); if (b[0] < box.x + box.w && b[0] + b[2] > box.x && b[1] < box.y + box.h && b[1] + b[3] > box.y) { box.x += a.dx * 24; box.y += a.dy * 24; }
        this.walls.push({ sp, ...box, t: sp.dur, max: sp.dur, kind: sp.wall });
        g.particles.burst(tx, ty, 24, { color: col, speed: 40, life: 0.6, up: -20 });
        break;
      }
      case 'heal': {
        const st = g.stats(), v = Math.min(sp.amount, st.maxHp - P.hp); P.hp += v;
        if (sp.regen) this.buffs.regen = { v: sp.regen, t: sp.dur };
        g.particles.burst(p.x, p.y - 12, 26, { color: col, speed: 30, life: 1, up: -30, glow: true });
        g.ui.toast(`+${Math.round(v)} ${L({ de: 'LP', en: 'HP' })}`, 'info', 1.2);
        break;
      }
      case 'cleanse': {
        const st = g.stats(); P.st = Math.min(st.maxSt, P.st + sp.st);
        if (sp.ward) this.buffs.ward = { t: sp.ward };
        g.particles.burst(p.x, p.y - 12, 22, { color: col, speed: 26, life: 1, up: -24, glow: true });
        break;
      }
      case 'shield': this.shield = { hp: sp.hp, max: sp.hp, t: sp.dur, regen: sp.regen || 0, sp }; g.particles.burst(p.x, p.y - 12, 20, { color: col, speed: 30, life: 0.8, glow: true }); break;
      case 'dash': {
        const steps = 16, sx = a.dx * sp.dist / steps, sy = a.dy * sp.dist / steps;
        for (let i = 0; i < steps; i++) {
          const nx = p.x + sx, ny = p.y + sy;
          if (g.blockedAt(nx - p.w / 2, ny - p.h, p.w, p.h)) break;
          p.x = nx; p.y = ny;
          g.particles.spawn({ x: p.x + (Math.random() - 0.5) * 10, y: p.y - 8 - Math.random() * 14, vx: -sx * 4, vy: -sy * 4, life: 0.5, max: 0.5, color: col[i % col.length], drag: 2 });
        }
        break;
      }
      case 'summon': {
        this.summons = this.summons.filter(s => s.type !== sp.summon);
        this.summons.push({ type: sp.summon, t: sp.dur, x: p.x, y: p.y - 20, ang: 0, cd: 0, sp });
        g.particles.burst(p.x, p.y - 20, 30, { color: col, speed: 40, life: 0.9, glow: true });
        break;
      }
    }
    g.events.emit('player');
  }
  // Übung: Erfahrung in der Schule, stilles Zaubern, Mana-Kapazität wächst durch Verbrauch
  train(sp) {
    const M = this.M, s = sp.school, sc = SCHOOLS[s];
    const before = M.xp[s] || 0;
    M.xp[s] = before + 2 + sp.rank * 2;
    M.casts[s] = (M.casts[s] || 0) + 1;
    if (M.casts[s] === SILENT_CASTS && !this.g.state.player.foxy) { audio.sfx('memory'); this.g.ui.toast(L({ de: `Stilles Zaubern gemeistert: ${sc.name.de} – kein Spruch mehr nötig!`, en: `Silent casting mastered: ${sc.name.en} – no more incantation!` }), 'secret', 4); }
    for (let r = 1; r < 3; r++) if (before < RANK_XP[r] && M.xp[s] >= RANK_XP[r]) this.g.ui.toast(L({ de: `${sc.name.de}: genug Übung für die ${RANKS[r].de}`, en: `${sc.name.en}: enough practice for ${RANKS[r].en}` }), 'info', 3);
    M.spent += sp.mp;
    while (M.spent >= 40 && M.bonus < 150) { M.spent -= 40; M.bonus++; this.g.ui.toast(L({ de: '+1 Mana-Kapazität', en: '+1 mana capacity' }), 'xp', 1.5); }
  }
  smash(x, y, r) { for (const o of this.g.world.objectsNear(x, y, r + 12)) if (o.cuttable && Math.hypot(o.x - x, o.y - y) < r) this.g.breakObject(o); }

  // ---------- Aktualisieren ----------
  update(dt) {
    const g = this.g, P = g.state.player, st = g.stats(), p = g.player;
    for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt);
    if (this.chant) {
      const c = this.chant; c.t += dt;
      if (Math.random() < dt * 30) { const a = Math.random() * 6.283; g.particles.spawn({ x: p.x + Math.cos(a) * 14, y: p.y + Math.sin(a) * 6, vx: 0, vy: -20, life: 0.6, max: 0.6, color: (PART[c.sp.school] || ['#fff'])[0], glow: true }); }
      if (c.t >= c.dur) { this.chant = null; this.execute(c.sp); }
    }
    // Geschosse
    const W = g.world;
    for (const b of this.bolts) {
      const n = 3;
      for (let i = 0; i < n && !b.dead; i++) {
        b.x += b.vx * dt / n; b.y += b.vy * dt / n; b.dist += Math.hypot(b.vx, b.vy) * dt / n;
        if (b.dist > b.sp.range) { b.dead = true; break; }
        if (b.dist > 10 && W.blocked(b.x - 1, b.y + 10, 2, 2)) { b.dead = true; break; }
        for (const o of W.objectsNear(b.x, b.y + 12, 16)) if (!b.hit.has(o) && Math.abs(o.x - b.x) < 9 && Math.abs(o.y - 4 - (b.y + 12)) < 9) {
          if (o.cuttable) { b.hit.add(o); g.breakObject(o); if (!b.sp.pierce) b.dead = true; }
          else if (o.collider || o.col) { if (!b.sp.pierce) b.dead = true; }
        }
      }
      const col = PART[b.sp.school];
      if (Math.random() < dt * 40) g.particles.spawn({ x: b.x, y: b.y, vx: -b.vx * 0.05 + (Math.random() - 0.5) * 10, vy: -b.vy * 0.05 + (Math.random() - 0.5) * 10, life: 0.35, max: 0.35, color: col[(Math.random() * col.length) | 0], glow: b.sp.school === 'feuer', drag: 1 });
      if (b.dead) g.particles.burst(b.x, b.y, 12, { color: col, speed: 40, life: 0.5, glow: b.sp.school !== 'erde' });
    }
    this.bolts = this.bolts.filter(b => !b.dead);
    // Zonen
    for (const z of this.zones) {
      z.t -= dt; const sp = z.sp, col = PART[sp.school] || ['#fff'];
      if (sp.heal && Math.hypot(p.x - z.x, p.y - z.y) < sp.radius) P.hp = Math.min(st.maxHp, P.hp + sp.heal * dt);
      if (z.burst) {
        z.tick -= dt;
        if (sp.id === 'wirbelsturm' && z.tick <= 0) { z.tick = 0.5; this.smash(z.x, z.y, sp.radius); }
        const rate = sp.id === 'feuersaeule' ? 60 : sp.id === 'wirbelsturm' ? 50 : 30;
        for (let i = 0; i < rate * dt; i++) {
          const a = Math.random() * 6.283, r = Math.random() * sp.radius;
          if (sp.id === 'wirbelsturm') g.particles.spawn({ x: z.x + Math.cos(a) * r, y: z.y + Math.sin(a) * r * 0.6, vx: -Math.sin(a) * 90, vy: Math.cos(a) * 50 - 20, life: 0.6, max: 0.6, color: col[i % col.length], drag: 1 });
          else if (sp.id === 'feuersaeule') g.particles.spawn({ x: z.x + Math.cos(a) * r * 0.5, y: z.y + Math.sin(a) * r * 0.3, vx: 0, vy: -80 - Math.random() * 80, life: 0.7, max: 0.7, color: col[i % col.length], glow: true, size: 2, drag: 0.5 });
          else g.particles.spawn({ x: z.x + Math.cos(a) * r, y: z.y + Math.sin(a) * r * 0.6, vx: 0, vy: -60, life: 0.5, max: 0.5, color: col[i % col.length], g: 200, drag: 0.5, size: 2 });
        }
      } else if (Math.random() < dt * 12 && !z.light) { const a = Math.random() * 6.283, r = Math.random() * sp.radius; g.particles.spawn({ x: z.x + Math.cos(a) * r, y: z.y + Math.sin(a) * r * 0.55, vx: 0, vy: -10, life: 1, max: 1, color: col[0], glow: sp.school !== 'erde' }); }
    }
    this.zones = this.zones.filter(z => z.t > 0);
    for (const w of this.walls) w.t -= dt;
    this.walls = this.walls.filter(w => w.t > 0);
    // Puffer
    if (this.buffs.regen) { P.hp = Math.min(st.maxHp, P.hp + this.buffs.regen.v * dt); if ((this.buffs.regen.t -= dt) <= 0) delete this.buffs.regen; }
    if (this.buffs.ward && (this.buffs.ward.t -= dt) <= 0) delete this.buffs.ward;
    if (this.shield) { const s = this.shield; s.t -= dt; if (s.regen) P.hp = Math.min(st.maxHp, P.hp + s.regen * dt); if (s.t <= 0 || s.hp <= 0) this.shield = null; }
    // Beschwörungen
    for (const s of this.summons) {
      s.t -= dt; s.ang += dt * (s.type === 'waechter' ? 3 : 1.2);
      let tx = p.x - p.face.x * 16, ty = p.y - 30;
      if (s.type === 'waechter') { tx = p.x + Math.cos(s.ang) * 26; ty = p.y - 10 + Math.sin(s.ang) * 14; }
      if (s.type === 'vertrauter') {
        s.cd -= dt;
        const pick = W.interactables.find(it => it.kind === 'pickup' && Math.hypot(it.x - p.x, it.y - p.y) < 90);
        if (pick) { tx = pick.x; ty = pick.y - 10; if (Math.hypot(s.x - tx, s.y - ty) < 6 && s.cd <= 0) { s.cd = 0.4; g.interact({ kind: 'pickup', it: pick }); } }
        else { tx = p.x + 14 + Math.cos(s.ang) * 6; ty = p.y - 34 + Math.sin(s.ang * 2) * 3; }
      }
      const k = Math.min(1, dt * (s.type === 'waechter' ? 12 : 4));
      s.x += (tx - s.x) * k; s.y += (ty - s.y) * k;
      if (s.type === 'waechter') { s.cd -= dt; if (s.cd <= 0) { s.cd = 0.3; for (const o of W.objectsNear(s.x, s.y + 10, 18)) if (o.cuttable) { g.breakObject(o); break; } } }
      if (Math.random() < dt * 8) g.particles.spawn({ x: s.x, y: s.y, vx: 0, vy: -6, life: 0.6, max: 0.6, color: s.type === 'irrlicht' ? '#e8f4ff' : '#d0a8ff', glow: true });
    }
    this.summons = this.summons.filter(s => s.t > 0);
  }

  // ---------- Kollision der Wände ----------
  blocked(x, y, w, h) { for (const b of this.walls) if (x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y) return true; return false; }

  // ---------- Zeichnen ----------
  drawGround(ctx, cam) {
    const t = performance.now() / 1000;
    for (const z of this.zones) {
      const sp = z.sp, k = Math.min(1, z.t / 0.5, (z.max - z.t) / 0.3 + 0.2), x = Math.round(z.x - cam.ix), y = Math.round(z.y - cam.iy);
      if (sp.id === 'sumpf') { ctx.globalAlpha = 0.85 * k; ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.ellipse(x, y, sp.radius, sp.radius * 0.55, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#5a4228'; ctx.beginPath(); ctx.ellipse(x - 4, y - 2, sp.radius * 0.7, sp.radius * 0.35, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#7a6040'; for (let i = 0; i < 6; i++) ctx.fillRect(x + Math.cos(i * 2.1 + t) * sp.radius * 0.5 | 0, y + Math.sin(i * 1.7) * sp.radius * 0.25 | 0, 2, 1); }
      else if (sp.heal) { ctx.globalAlpha = 0.7 * k; ctx.strokeStyle = '#a8e870'; ctx.lineWidth = 1; for (const rr of [1, 0.75]) { ctx.beginPath(); ctx.ellipse(x, y, sp.radius * rr, sp.radius * rr * 0.55, 0, 0, 7); ctx.stroke(); } ctx.fillStyle = 'rgba(140,220,90,0.18)'; ctx.beginPath(); ctx.ellipse(x, y, sp.radius, sp.radius * 0.55, 0, 0, 7); ctx.fill(); }
      else if (z.burst && sp.id !== 'wirbelsturm') { ctx.globalAlpha = 0.5 * k; ctx.fillStyle = sp.school === 'feuer' ? '#4a1408' : '#2a1e14'; ctx.beginPath(); ctx.ellipse(x, y, sp.radius * 0.7, sp.radius * 0.38, 0, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    if (this.chant) {
      const p = this.g.player, c = this.chant, x = Math.round(p.x - cam.ix), y = Math.round(p.y - cam.iy), col = SCHOOLS[c.sp.school].color[2];
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.ellipse(x, y, 15, 6, 0, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, y, 15, 6, 0, -Math.PI / 2, -Math.PI / 2 + c.t / c.dur * 6.283); ctx.lineWidth = 2; ctx.stroke();
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + c.t * 3; ctx.fillStyle = col; ctx.fillRect(x + Math.cos(a) * 11 | 0, y + Math.sin(a) * 4 | 0, 1, 1); }
      ctx.globalAlpha = 1;
    }
  }
  sortables() {
    const out = [];
    for (const w of this.walls) out.push({ y: w.y + w.h, draw: (ctx, cam) => this.drawWall(ctx, cam, w) });
    for (const s of this.summons) if (s.type === 'vertrauter') out.push({ y: s.y + 34, draw: (ctx, cam) => this.drawBird(ctx, cam, s) });
    return out;
  }
  drawWall(ctx, cam, w) {
    const x = Math.round(w.x - cam.ix), y = Math.round(w.y - cam.iy), k = Math.min(1, (w.max - w.t) / 0.3, w.t / 0.6), hgt = Math.round(22 * k);
    if (w.kind === 'licht') {
      ctx.globalAlpha = 0.55; ctx.fillStyle = '#9aaae8'; ctx.fillRect(x, y + w.h - hgt - 4, w.w, hgt + 4);
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#eef0ff'; ctx.fillRect(x, y + w.h - hgt - 4, w.w, 1); ctx.fillRect(x, y + w.h - 1, w.w, 1);
      for (let i = 2; i < w.w; i += 6) { ctx.globalAlpha = 0.35; ctx.fillRect(x + i, y + w.h - hgt, 1, hgt - 2); }
      ctx.globalAlpha = 1; return;
    }
    if (!w.spr) w.spr = earthWall(w.w, w.h);
    const H = w.spr.height, vis = hgt + w.h;
    ctx.drawImage(w.spr, 0, H - vis, w.w + 2, vis, x - 1, y + w.h - vis, w.w + 2, vis);
  }
  drawBird(ctx, cam, s) {
    const x = Math.round(s.x - cam.ix), y = Math.round(s.y - cam.iy), f = Math.floor(performance.now() / 120) % 2;
    ctx.fillStyle = 'rgba(208,168,255,0.35)'; ctx.fillRect(x - 6, y - 4, 12, 7);
    ctx.fillStyle = '#e8d8ff'; ctx.fillRect(x - 2, y - 2, 5, 3); ctx.fillRect(x + 3, y - 3, 2, 2);
    ctx.fillStyle = '#b07ad0'; if (f) { ctx.fillRect(x - 5, y - 4, 4, 2); ctx.fillRect(x + 1, y - 4, 3, 2); } else { ctx.fillRect(x - 5, y, 4, 1); ctx.fillRect(x + 1, y, 3, 1); }
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 4, y - 3, 1, 1);
  }
  draw(ctx, cam) {
    for (const b of this.bolts) {
      const x = Math.round(b.x - cam.ix), y = Math.round(b.y - cam.iy), c = SCHOOLS[b.sp.school].color, r = b.sp.size;
      if (b.sp.school === 'wind') { ctx.strokeStyle = c[3]; ctx.globalAlpha = 0.8; ctx.lineWidth = 1; ctx.beginPath(); const a = Math.atan2(b.vy, b.vx); ctx.arc(x, y, 6, a - 1.2, a + 1.2); ctx.stroke(); ctx.globalAlpha = 1; continue; }
      if (b.sp.id === 'eisspeer') { const a = Math.atan2(b.vy, b.vx); ctx.strokeStyle = c[3]; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 9, y - Math.sin(a) * 9); ctx.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); ctx.stroke(); continue; }
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 12, r, r * 0.4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = c[1]; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.fillStyle = c[2]; ctx.beginPath(); ctx.arc(x - 1, y - 1, r * 0.65, 0, 7); ctx.fill();
      ctx.fillStyle = c[3]; ctx.fillRect(x - 2, y - 2, 2, 2);
    }
    const p = this.g.player;
    if (this.shield) {
      const s = this.shield, x = Math.round(p.x - cam.ix), y = Math.round(p.y - 14 - cam.iy), k = Math.min(1, s.t / 1.5), big = s.max > 50;
      ctx.globalAlpha = 0.25 * k + Math.sin(performance.now() / 200) * 0.05; ctx.fillStyle = big ? '#f0e0a0' : '#9aaae8'; ctx.beginPath(); ctx.ellipse(x, y, 15, 19, 0, 0, 7); ctx.fill();
      ctx.globalAlpha = 0.7 * k; ctx.strokeStyle = big ? '#fff4d0' : '#eef0ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 15, 19, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    }
    for (const s of this.summons) {
      if (s.type === 'vertrauter') continue;
      const x = Math.round(s.x - cam.ix), y = Math.round(s.y - cam.iy);
      if (s.type === 'irrlicht') { ctx.fillStyle = 'rgba(220,240,255,0.35)'; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = '#f4f8ff'; ctx.fillRect(x - 1, y - 2, 2, 4); ctx.fillRect(x - 2, y - 1, 4, 2); }
      else { ctx.fillStyle = 'rgba(200,150,255,0.3)'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#ead9ff'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); ctx.fillStyle = '#7039b8'; ctx.fillRect(x - 1, y - 1, 1, 1); ctx.fillRect(x + 1, y - 1, 1, 1); }
    }
  }
  lights() {
    const out = [];
    for (const b of this.bolts) out.push({ x: b.x, y: b.y, r: b.sp.school === 'feuer' ? 46 : 26, color: LIGHT[b.sp.school], a: 0.75, flicker: 0.1 });
    for (const z of this.zones) if (z.burst || z.light || z.sp.heal) out.push({ x: z.x, y: z.y - 10, r: (z.sp.radius || 40) * 1.8, color: LIGHT[z.sp.school], a: 0.7 * Math.min(1, z.t / 0.4), flicker: 0.15 });
    for (const s of this.summons) out.push({ x: s.x, y: s.y, r: s.type === 'irrlicht' ? 100 : 36, color: s.type === 'irrlicht' ? [220, 235, 255] : [210, 170, 255], a: 0.85, flicker: 0.04 });
    for (const w of this.walls) if (w.kind === 'licht') out.push({ x: w.x + w.w / 2, y: w.y, r: 40, color: [190, 200, 255], a: 0.6 });
    if (this.shield) out.push({ x: this.g.player.x, y: this.g.player.y - 14, r: 34, color: [190, 200, 255], a: 0.5 });
    return out;
  }
}
