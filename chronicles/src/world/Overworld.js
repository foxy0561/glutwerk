// Die offene Welt Thyrvenna (1000×700 Kacheln). Sie wird in Chunks zu 32×32 Kacheln geladen:
// Bodenpixel rechnet ein Web Worker, Objekte/Kollision werden beim Betreten deterministisch erzeugt.
import { THYRVENNA } from '../data/thyrvenna.js';
import { buildMasks, Gen, WW, WH, T, M, SOLID, PLACE_R, REGIONS } from './WorldGen.js';
import { buildSettlements, ROUTES } from './Settlements.js';
import * as P from '../art/propArt.js';
import * as B from '../art/buildingArt.js';
import { makeCanvas, hash2, PixelGrid } from '../engine/PixelUtil.js';
import { NPC } from '../entities/NPC.js';
import { PAL } from '../art/palette.js';

export const CH = 32;
const CPX = CH * T;
let SHARED = null;
const WATER = new Set([M.SEA, M.SHALLOW, M.WATER]);

function runeCircle(lit) {
  const key = 'rune' + lit;
  runeCircle.c = runeCircle.c || {};
  if (runeCircle.c[key]) return runeCircle.c[key];
  const G = new PixelGrid(72, 52);
  for (let a = 0; a < 140; a++) { const t = a / 140 * 6.283; G.set(36 + Math.cos(t) * 30, 26 + Math.sin(t) * 21, lit ? '#b98cf0' : '#4d4a58'); G.set(36 + Math.cos(t) * 26, 26 + Math.sin(t) * 18, lit ? '#7039b8' : '#3b3844'); }
  for (let i = 0; i < 6; i++) { const t = i / 6 * 6.283; for (let k = 0; k < 22; k++) G.set(36 + Math.cos(t) * k * 1.1, 26 + Math.sin(t) * k * 0.78, lit ? '#c49af5' : '#3b3844'); }
  G.ellipse(36, 26, 4, 3, lit ? '#ead9ff' : '#4d4a58');
  return (runeCircle.c[key] = G.toCanvas());
}

export class Overworld {
  constructor(game, state) {
    this.id = 'world'; this.game = game; this.state = state;
    this.w = WW; this.h = WH; this.pw = WW * T; this.ph = WH * T;
    this.fogCell = 4; this.minimapScale = 1; this.minimapZoom = 2;
    this.def = { name: { de: 'Thyrvenna', en: 'Thyrvenna' }, regions: [] };
    if (!SHARED) { const masks = buildMasks(THYRVENNA); SHARED = { masks, gen: new Gen(masks) }; }
    this.gen = SHARED.gen;
    this.places = THYRVENNA.places.filter(p => p.layer === 'surf');
    this.realms = Object.fromEntries(THYRVENNA.realms.map(r => [r.id, r]));
    this.chunks = new Map(); this.ground = new Map(); this.pending = new Set(); this.lru = [];
    this.lights = []; this.interactables = []; this._npcs = [];
    this.campfire = null;
    // Siedlungen
    const st = this.settle = buildSettlements(THYRVENNA, this.gen, () => game.day.darkness > 0.3);
    this.entrance = st.entrance;
    this.settleByChunk = new Map();
    for (const o of st.objects) { const k = this.key(Math.floor(o.x / CPX), Math.floor(o.y / CPX)); if (!this.settleByChunk.has(k)) this.settleByChunk.set(k, []); this.settleByChunk.get(k).push(o); }
    this.allNpcs = st.npcs.map(n => new NPC(game, n.id, this.npcDef(n), n.x, n.y));
    this.allNpcs.forEach(n => n.home = n.def.home);
    // Minikarte (Übersicht) – kommt aus dem Worker
    [this.minimap, this.mctx] = makeCanvas(WW, WH);
    this.mctx.fillStyle = '#123650'; this.mctx.fillRect(0, 0, WW, WH);
    this.initWorker();
    this._shimmer = [0, 1, 2, 3].map(f => { const [c, x] = makeCanvas(16, 16); x.fillStyle = 'rgba(200,236,240,0.55)'; for (let i = 0; i < 3; i++) { const yy = (i * 5 + f * 2) % 16, xx = (i * 7 + f * 3) % 12; x.fillRect(xx, yy, 3 + (f % 2), 1); } return c; });
  }
  key(cx, cy) { return cy * 1000 + cx; }

  npcDef(n) {
    const self = this;
    const roleTitle = { merchant: { de: 'Händler', en: 'Merchant' }, guard: { de: 'Wache', en: 'Guard' }, villager: { de: '', en: '' } }[n.role] || { de: '', en: '' };
    const def = {
      name: n.name, title: roleTitle, app: n.app, weapon: n.weapon, wander: n.role === 'guard' ? 1.5 : 3.5,
      schedule: [[0, [n.x, n.y]]], home: [n.x, n.y],
      shop: n.shop ? { stock: n.shop, sellRate: 0.4 } : null,
      dialogue: G => ({ start: { text: n.line, options: [
        ...(n.shop ? [{ text: { de: 'Zeig mir deine Waren.', en: 'Show me your wares.' }, action: () => { G.openShop(def); return null; } }] : []),
        { text: { de: 'Leb wohl.', en: 'Farewell.' }, next: 'end' }] } }),
    };
    return def;
  }

  initWorker() {
    this.worker = null;
    try {
      this.worker = new Worker(new URL('./chunkWorker.js', import.meta.url), { type: 'module' });
      this.worker.onmessage = e => this.onWorker(e.data);
      this.worker.onerror = () => { this.worker = null; };
      this.worker.postMessage({ type: 'init', masks: SHARED.masks });
      this.worker.postMessage({ type: 'overview' });
    } catch (e) { this.worker = null; }
    if (!this.worker) this.buildOverviewSync();
  }
  buildOverviewSync() { const d = this.gen.overview(); this.mctx.putImageData(new ImageData(d, WW, WH), 0, 0); }
  onWorker(m) {
    if (m.type === 'chunk') {
      const k = this.key(m.cx, m.cy);
      const [c, x] = makeCanvas(CPX, CPX);
      x.putImageData(new ImageData(m.data, CPX, CPX), 0, 0);
      this.ground.set(k, c); this.pending.delete(k); this.touch(k);
    }
    if (m.type === 'overview') this.mctx.putImageData(new ImageData(m.data, WW, WH), 0, 0);
  }
  touch(k) { const i = this.lru.indexOf(k); if (i >= 0) this.lru.splice(i, 1); this.lru.push(k); while (this.lru.length > 56) { const old = this.lru.shift(); this.ground.delete(old); } }
  requestGround(cx, cy) {
    const k = this.key(cx, cy);
    if (this.ground.has(k) || this.pending.has(k)) return;
    if (cx < 0 || cy < 0 || cx * CH >= WW || cy * CH >= WH) return;
    this.pending.add(k);
    if (this.worker) this.worker.postMessage({ type: 'chunk', cx, cy, size: CH });
    else this.syncQueue = (this.syncQueue || []).concat([[cx, cy]]);
  }

  // ---------- Chunk-Logik ----------
  getChunk(cx, cy) {
    const k = this.key(cx, cy);
    let c = this.chunks.get(k);
    if (c) return c;
    c = { cx, cy, mats: new Uint8Array(CH * CH), objects: [], flats: [], colliders: [], lights: [], its: [], water: [] };
    const g = this.gen, S = this.state;
    const x0 = cx * CH, y0 = cy * CH;
    for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) {
      const tx = x0 + x, ty = y0 + y;
      const m = (tx >= WW || ty >= WH) ? M.SEA : g.tileMat(tx, ty);
      c.mats[y * CH + x] = m;
      if (WATER.has(m) && hash2(tx, ty, 5) < 0.45) c.water.push(y * CH + x);
    }
    const near = (tx, ty, r) => this.places.some(p => Math.hypot(p.x - tx, p.y - ty) < (PLACE_R[p.type] || 3) + r) || (this.entrance && Math.hypot(this.entrance.x / T - tx, this.entrance.y / T - ty) < 4);
    const addObj = (o, col) => { c.objects.push(o); if (col) c.colliders.push({ x: col[0], y: col[1], w: col[2], h: col[3], obj: o }); return o; };
    // Natur
    for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) {
      const tx = x0 + x, ty = y0 + y, m = c.mats[y * CH + x];
      if (SOLID.has(m) && m !== M.ROCK && m !== M.SNOWROCK) continue;
      const h = hash2(tx, ty, 77), h2 = hash2(tx, ty, 78);
      const px = (tx + 0.2 + hash2(tx, ty, 79) * 0.6) * T, py = (ty + 0.3 + hash2(tx, ty, 80) * 0.6) * T;
      const reg = g.regionAt(tx, ty);
      if (m === M.ROCK || m === M.SNOWROCK) {
        if ((tx % 4 === (ty % 8 < 4 ? 0 : 2)) && (ty % 4 === 0) && h < 0.55) addObj({ type: 'peak', x: px, y: py + 8, ox: 28, oy: 58, sprite: (v => () => B.peak(v, m === M.SNOWROCK || (reg === 'brennvald' && ty < 105), reg === 'asche'))(Math.floor(h2 * 6)) });
        continue;
      }
      if (m === M.ROAD || m === M.PAVE || m === M.BRIDGE) continue;
      const town = h < 0.5 && near(tx, ty, 1);
      if (town) continue;
      const v = Math.floor(h2 * 4);
      if (m === M.FOREST) {
        if (tx % 2 === 0 && ty % 2 === 0 && h < 0.82) {
          const pine = g.m.pine[ty * WW + tx] > 100 || reg === 'brennvald';
          const spr = reg === 'brennvald' && ty < 110 ? () => B.snowPine(v) : reg === 'asche' ? () => B.deadTree(v, true) : () => P.tree(v, pine ? 'pine' : 'oak');
          const o = addObj({ type: 'tree', x: px, y: py, ox: 28, oy: 68, sprite: spr, tree: true, shadow: true }, [px - 5, py - 6, 10, 6]);
          o.canopy = { x: px - 24, y: py - 64, w: 48, h: 48 };
        } else if (h2 < 0.06) c.flats.push({ x: px, y: py, ox: 9, oy: 13, sprite: (vv => () => P.fern(vv, false))(v % 3) });
        else if (h2 > 0.985) this.pickup(c, tx, ty, px, py, reg === 'fennwyrd' && h > 0.5 ? 'mondfarn' : h > 0.6 ? 'waldpilz' : 'ast');
        continue;
      }
      if (m === M.GRASS || m === M.SNOW || m === M.DESERT || m === M.BEACH || m === M.ASH || m === M.MARSH || m === M.FIELD) {
        if (m === M.FIELD) { if (h < 0.02) addObj({ type: 'prop', x: px, y: py, ox: 11, oy: 16, sprite: () => B.haystack() }, [px - 9, py - 6, 18, 6]); continue; }
        if (m === M.MARSH) { if (h < 0.015) addObj({ type: 'tree', x: px, y: py, ox: 18, oy: 49, sprite: (vv => () => B.deadTree(vv))(v) }, [px - 3, py - 4, 6, 4]); else if (h < 0.3) c.flats.push({ x: px, y: py, ox: 7, oy: 15, sway: true, ph: h * 6, sprite: (vv => fr => B.reeds(vv, fr))(v) }); continue; }
        if (m === M.ASH) { if (h < 0.012) addObj({ type: 'tree', x: px, y: py, ox: 18, oy: 49, sprite: (vv => () => B.deadTree(vv, true))(v) }, [px - 3, py - 4, 6, 4]); else if (h < 0.02) { const o = addObj({ type: 'prop', x: px, y: py, ox: 10, oy: 9, anim: 3, sprite: f => B.lavaVent(f % 2) }); c.lights.push({ x: px, y: py - 4, r: 30, color: [255, 120, 40], a: 0.7, flicker: 0.2 }); } continue; }
        if (m === M.DESERT) { if (h < 0.004) addObj({ type: 'prop', x: px, y: py, ox: 11, oy: 29, sprite: (vv => () => B.cactus(vv))(v) }, [px - 4, py - 4, 8, 4]); else if (h < 0.008) addObj({ type: 'rock', x: px, y: py, ox: 8, oy: 11, sprite: (vv => () => P.rock(vv, false))(v) }, [px - 6, py - 4, 12, 4]); continue; }
        if (m === M.BEACH) { if (h < 0.006) addObj({ type: 'rock', x: px, y: py, ox: 8, oy: 11, sprite: (vv => () => P.rock(vv, false))(v) }, [px - 6, py - 4, 12, 4]); else if (h < 0.01 && (reg === 'sarkhazim' || reg === 'saltrivo')) addObj({ type: 'tree', x: px, y: py, ox: 22, oy: 58, sprite: (vv => () => B.palm(vv))(v) }, [px - 4, py - 4, 8, 4]); continue; }
        if (m === M.SNOW) { if (h < 0.035) addObj({ type: 'tree', x: px, y: py, ox: 28, oy: 68, sprite: (vv => () => B.snowPine(vv))(v), tree: true, shadow: true }, [px - 5, py - 6, 10, 6]); else if (h < 0.045) addObj({ type: 'rock', x: px, y: py, ox: 8, oy: 11, sprite: (vv => () => P.rock(vv, false))(v) }, [px - 6, py - 4, 12, 4]); continue; }
        // Gras
        const fr = g.m.forest[ty * WW + tx] / 255;
        if (h < 0.012 + fr * 0.05) {
          const spr = reg === 'sarkhazim' ? () => B.palm(v) : reg === 'brennvald' ? () => P.tree(v, 'pine') : () => P.tree(v, h2 < 0.25 ? 'pine' : 'oak');
          const o = addObj({ type: 'tree', x: px, y: py, ox: reg === 'sarkhazim' ? 22 : 28, oy: reg === 'sarkhazim' ? 58 : 68, sprite: spr, tree: reg !== 'sarkhazim', shadow: reg !== 'sarkhazim' }, [px - 5, py - 6, 10, 6]);
          o.canopy = { x: px - 24, y: py - 64, w: 48, h: 48 };
        } else if (h < 0.035) { const o = addObj({ type: 'bush', x: px, y: py, ox: 12, oy: 17, sprite: (vv => () => P.bush(vv, h2 < 0.4))(v), cuttable: true }); o.collider = { x: px - 9, y: py - 6, w: 18, h: 6, obj: o }; c.colliders.push(o.collider); }
        else if (h < 0.04) addObj({ type: 'rock', x: px, y: py, ox: 8, oy: 11, sprite: (vv => () => P.rock(vv, false))(v) }, [px - 6, py - 4, 12, 4]);
        else if (h < 0.043) this.pickup(c, tx, ty, px, py, reg === 'brennvald' ? 'eisenerz' : reg === 'fennwyrd' || reg === 'valcrest' ? 'glimmerbeere' : 'ast');
        else if (h < 0.08 && reg !== 'brennvald') { const fv = Math.floor(h2 * 7); for (let k = 0; k < 3; k++) c.flats.push({ x: px + (hash2(tx, ty, k) - 0.5) * 14, y: py + (hash2(tx, ty, k + 9) - 0.5) * 10, ox: 3, oy: 8, sway: true, ph: h * 9, sprite: (vv => fr2 => P.flower(vv, fr2))(fv) }); }
        else if (h < 0.4) c.flats.push({ x: px, y: py, ox: 5, oy: 8, sway: true, ph: h * 9, sprite: (vv => fr2 => P.grassTuft(vv, fr2))(v % 2) });
      }
    }
    // Siedlungsobjekte
    for (const o of this.settleByChunk.get(k) || []) {
      if (o.flat) { c.flats.push({ x: o.x, y: o.y, ox: 36, oy: 26, sprite: () => runeCircle(!!(S.tele && S.tele[o.it.place.id])) }); }
      else { c.objects.push(o); if (o.col) c.colliders.push({ x: o.col[0], y: o.col[1], w: o.col[2], h: o.col[3], obj: o }); }
      if (o.light) c.lights.push(o.light);
      if (o.it) c.its.push({ id: (o.it.place && o.it.place.id) || o.it.port || ('it_' + o.x + '_' + o.y), x: o.x, y: o.y - (o.flat ? 0 : 6), r: o.it.r || 24, obj: o, kind: o.it.kind, ...o.it });
      if (o.anim && o.spriteF) o.sprite = o.spriteF;
    }
    this.chunks.set(k, c);
    this._dirty = true;
    return c;
  }
  pickup(c, tx, ty, px, py, item) {
    const id = `ow_${tx}_${ty}`;
    if (this.state.collected && this.state.collected[id]) return;
    let sprite, ox = 8, oy = 12;
    if (item === 'mondfarn') { sprite = () => P.fern(1, true); ox = 9; oy = 13; c.lights.push({ x: px, y: py - 6, r: 22, color: [140, 240, 230], a: 0.55, flicker: 0.06, pulse: true, on: () => !(this.state.collected && this.state.collected[id]) }); }
    else if (item === 'ast') { sprite = () => P.branchPickup(); oy = 6; }
    else if (item === 'waldpilz') { sprite = () => P.mushroom(1); ox = 5; oy = 8; }
    else if (item === 'eisenerz') { sprite = () => P.rock(5, false); }
    else sprite = () => P.bush(7, true);
    const o = { type: 'pickup', id, item, x: px, y: py, ox, oy, sprite, small: true };
    c.objects.push(o);
    c.its.push({ id, x: px, y: py - 4, r: 18, obj: o, kind: 'pickup', item });
  }

  // ---------- Aktualisierung ----------
  update(dt) {
    const p = this.game.player, cam = this.game.cam;
    const pcx = Math.floor(p.x / CPX), pcy = Math.floor(p.y / CPX);
    for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) this.getChunk(pcx + x, pcy + y);
    // Boden anfordern: sichtbarer Bereich + Rand
    const gx0 = Math.floor((cam.x - CPX * 0.5) / CPX), gx1 = Math.floor((cam.x + cam.w + CPX * 0.5) / CPX);
    const gy0 = Math.floor((cam.y - CPX * 0.5) / CPX), gy1 = Math.floor((cam.y + cam.h + CPX * 0.5) / CPX);
    for (let y = gy0; y <= gy1; y++) for (let x = gx0; x <= gx1; x++) this.requestGround(x, y);
    if (this.syncQueue && this.syncQueue.length) { const [cx, cy] = this.syncQueue.shift(); this.onWorker({ type: 'chunk', cx, cy, data: this.gen.chunkPixels(cx, cy, CH) }); }
    // weit entfernte Chunks entladen
    for (const [k, c] of this.chunks) if (Math.abs(c.cx - pcx) > 3 || Math.abs(c.cy - pcy) > 3) { this.chunks.delete(k); this._dirty = true; }
    if (this._dirty) {
      this._dirty = false;
      this.lights = []; this.interactables = [];
      for (const c of this.chunks.values()) { this.lights.push(...c.lights); this.interactables.push(...c.its); }
    }
    this._npcT = (this._npcT || 0) - dt;
    if (this._npcT <= 0) { this._npcT = 0.5; this._npcs = this.allNpcs.filter(n => Math.abs(n.x - p.x) < 900 && Math.abs(n.y - p.y) < 700); }
  }
  get npcs() { return this._npcs; }

  // ---------- Kollision ----------
  blocked(x, y, w, h) {
    if (x < 0 || y < 0 || x + w >= this.pw || y + h >= this.ph) return true;
    const tx0 = Math.floor(x / T), tx1 = Math.floor((x + w) / T), ty0 = Math.floor(y / T), ty1 = Math.floor((y + h) / T);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const c = this.getChunk(Math.floor(tx / CH), Math.floor(ty / CH));
      if (SOLID.has(c.mats[(ty - c.cy * CH) * CH + (tx - c.cx * CH)])) return true;
    }
    const cx0 = Math.floor(x / CPX), cx1 = Math.floor((x + w) / CPX), cy0 = Math.floor(y / CPX), cy1 = Math.floor((y + h) / CPX);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const c = this.getChunk(cx, cy);
      for (const k of c.colliders) if (!k.off && x < k.x + k.w && x + w > k.x && y < k.y + k.h && y + h > k.y) return true;
    }
    return false;
  }
  matAt(x, y) { const tx = Math.floor(x / T), ty = Math.floor(y / T); const c = this.getChunk(Math.floor(tx / CH), Math.floor(ty / CH)); return c.mats[(ty - c.cy * CH) * CH + (tx - c.cx * CH)]; }
  findWalkable(tx, ty, maxR = 12) {
    for (let r = 0; r < maxR; r++) for (let a = 0; a < Math.max(1, r * 8); a++) {
      const t = a / Math.max(1, r * 8) * 6.283, x = (tx + Math.cos(t) * r) * T, y = (ty + Math.sin(t) * r) * T;
      if (!this.blocked(x - 6, y - 6, 12, 6)) return [x, y];
    }
    return [tx * T, ty * T];
  }

  // ---------- Zeichnen ----------
  drawGround(ctx, cam, t) {
    const cx0 = Math.floor(cam.x / CPX), cx1 = Math.floor((cam.x + cam.w) / CPX), cy0 = Math.floor(cam.y / CPX), cy1 = Math.floor((cam.y + cam.h) / CPX);
    const ix = cam.ix, iy = cam.iy;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const k = this.key(cx, cy), g = this.ground.get(k);
      const dx = cx * CPX - ix, dy = cy * CPX - iy;
      if (g) { ctx.drawImage(g, dx, dy); this.touch(k); }
      else ctx.drawImage(this.minimap, cx * CH, cy * CH, CH, CH, dx, dy, CPX, CPX);
    }
    // Wasser glitzert
    const f = Math.floor(t * 3);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const c = this.chunks.get(this.key(cx, cy)); if (!c || !this.ground.has(this.key(cx, cy))) continue;
      for (const i of c.water) {
        const tx = c.cx * CH + (i % CH), ty = c.cy * CH + Math.floor(i / CH);
        const x = tx * T - ix, y = ty * T - iy;
        if (x < -16 || y < -16 || x > cam.w || y > cam.h) continue;
        ctx.drawImage(this._shimmer[(f + tx * 3 + ty) & 3], x, y);
      }
    }
  }
  forChunksInView(cam, m, fn) {
    const cx0 = Math.floor((cam.x - m) / CPX), cx1 = Math.floor((cam.x + cam.w + m) / CPX), cy0 = Math.floor((cam.y - m) / CPX), cy1 = Math.floor((cam.y + cam.h + m * 2) / CPX);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) { const c = this.chunks.get(this.key(cx, cy)) || (Math.abs(cx * CPX - cam.x) < CPX * 2 && Math.abs(cy * CPX - cam.y) < CPX * 2 ? this.getChunk(cx, cy) : null); if (c) fn(c); }
  }
  visibleFlats(cam) { const out = []; this.forChunksInView(cam, 20, c => { for (const f of c.flats) if (f.x > cam.x - 40 && f.x < cam.x + cam.w + 40 && f.y > cam.y - 10 && f.y < cam.y + cam.h + 40) out.push(f); }); return out; }
  visibleObjects(cam) { const out = []; this.forChunksInView(cam, 80, c => { for (const o of c.objects) if (o.x > cam.x - 90 && o.x < cam.x + cam.w + 90 && o.y > cam.y - 20 && o.y < cam.y + cam.h + 140) out.push(o); }); return out; }
  objectsNear(x, y, r) { const out = []; const c = this.getChunk(Math.floor(x / CPX), Math.floor(y / CPX)); for (const cc of [c, ...[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([a, b]) => this.chunks.get(this.key(c.cx + a, c.cy + b))).filter(Boolean)]) for (const o of cc.objects) if (Math.hypot(o.x - x, o.y - y) < r) out.push(o); return out; }
  removeObject(o) {
    for (const c of this.chunks.values()) {
      const i = c.objects.indexOf(o); if (i < 0) continue;
      c.objects.splice(i, 1); c.colliders = c.colliders.filter(k => k.obj !== o); c.its = c.its.filter(it => it.obj !== o);
    }
    this._dirty = true;
  }

  // ---------- Orte ----------
  placeAt(x, y) { const tx = x / T, ty = y / T; for (const p of this.places) { const r = PLACE_R[p.type]; if (r && Math.hypot(tx - p.x, ty - p.y) < r) return p; } return null; }
  regionAt(x, y) {
    const p = this.placeAt(x, y);
    if (p && p.type !== 'tele') return { id: p.id, name: { de: p.n, en: (p.en && p.en.n) || p.n }, place: p };
    const r = this.gen.regionAt(x / T, y / T), R = this.realms[r] || { n: r, en: r };
    return { id: 'realm_' + r, name: { de: R.n, en: R.en }, realm: true };
  }
  mapMarkers() {
    const F = this.game.state.flags;
    return this.places.filter(p => F['reg_' + p.id] && p.type !== 'spot').map(p => ({ x: p.x * T, y: p.y * T, type: p.type, name: { de: p.n, en: (p.en && p.en.n) || p.n }, id: p.id }));
  }
  routes(port) { return (ROUTES[port] || []).filter(d => this.settle.ports[d]); }
}
