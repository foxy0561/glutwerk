// Verborgene Gruft unter einem Teleportzirkel: zwei Ebenen in einer Karte.
// Ebene 1: Eingangsraum (Treppe hinauf) → Gang → zweiter Raum (Treppe hinab).
// Ebene 2: kleine Kammer, der Teleportzirkel liegt direkt am Fuß der Treppe.
import { THYRVENNA } from '../data/thyrvenna.js';
import { makeCanvas, hash2, valueNoise, bayer, mulberry32 } from '../engine/PixelUtil.js';
import * as P from '../art/propArt.js';
import * as R from '../art/ruinArt.js';
import { runeCircle } from './Overworld.js';
import { L } from '../core/i18n.js';

const T = 16;
export const CW = 92, CHH = 28;
const O2 = 45; // Versatz der unteren Ebene (weit genug weg, damit sie nie gleichzeitig im Bild ist)
function q(pal, t, x, y) { const n = pal.length, v = Math.max(0, Math.min(0.999, t)) * (n - 1), i = Math.floor(v); return pal[Math.min(n - 1, i + ((v - i) > bayer(x, y) ? 1 : 0))]; }
const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const STONE = R.STONE.map(rgb), BRICK = R.BRICK.map(rgb), MOSS = ['#2c4a2a', '#3c5a2e', '#4f7438'].map(rgb);

export class Crypt {
  constructor(game, placeId) {
    this.game = game; this.place = THYRVENNA.places.find(p => p.id === placeId);
    this.id = 'crypt:' + placeId; this.places = THYRVENNA.places;
    this.w = CW; this.h = CHH; this.pw = CW * T; this.ph = CHH * T;
    this.fogCell = 1; this.minimapZoom = 2.4; this.minimapScale = 2;
    this.indoor = true; this.darkness = 0.8; this.def = { regions: [] };
    this.state = game.state.ow; this.npcs = [];
    this.objects = []; this.flats = []; this.colliders = []; this.lights = []; this.interactables = [];
    this.seed = Math.abs(placeId.split('').reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7));
    this.rng = mulberry32(this.seed);
    this.grid = new Uint8Array(CW * CHH);
    this.layout();
    this.buildGround();
    this.decorate();
    this.buildMinimap();
  }

  // ---------- Grundriss ----------
  room(x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.grid[y * CW + x] = 1; }
  floor(x, y) { x |= 0; y |= 0; return x >= 0 && y >= 0 && x < CW && y < CHH && this.grid[y * CW + x] === 1; }
  layout() {
    const v = this.seed % 3;
    // Ebene 1 – Raum A (Eingang)
    this.A = [3, 3, 12, 10];
    // Raum B, je nach Ruine etwas anders gelegen
    this.B = v === 0 ? [17, 12, 27, 21] : v === 1 ? [18, 4, 28, 13] : [16, 14, 26, 23];
    this.room(...this.A); this.room(...this.B);
    const [bx0, by0, bx1, by1] = this.B;
    // Gang (Z-förmig)
    if (v === 1) { this.room(13, 6, 17, 7); }
    else { const cx = bx0 + 3; this.room(13, 8, cx + 1, 9); this.room(cx, 8, cx + 1, by0 - 1); }
    // kleine Nische im Eingangsraum
    if (v !== 2) this.room(5, 11, 7, 12);
    this.upStair = { x: 7, y: 2 };                                 // Wandkacheln (2 breit) in Raum A
    this.downStair = { x: bx1 - 3, y: by1 - 3 };                   // 2×2 Loch in Raum B
    // Ebene 2
    this.C = [33 + O2, 4, 42 + O2, 12];
    this.room(...this.C);
    this.room(36 + O2, 13, 39 + O2, 14);                                    // kleine Apsis
    this.upStair2 = { x: 37 + O2, y: 3 };
    this.circle = { x: (38 + O2) * T, y: 7.4 * T };
    this.spots = {
      top: [8 * T, 4.4 * T],
      fromBelow: [(this.downStair.x - 0.6) * T, (this.downStair.y + 1) * T],
      bottom: [(38 + O2) * T, 5.2 * T],
      tele: [(38 + O2) * T, 9.6 * T],
    };
  }

  // ---------- Boden ----------
  buildGround() {
    const [cv, ctx] = makeCanvas(this.pw, this.ph), img = ctx.createImageData(this.pw, this.ph), d = img.data, s = this.seed;
    const F = (x, y) => this.floor(x, y);
    for (let py = 0; py < this.ph; py++) for (let px = 0; px < this.pw; px++) {
      const tx = px >> 4, ty = py >> 4, lx = px & 15, ly = py & 15;
      let c = [10, 8, 12];
      if (F(tx, ty)) {
        // Steinplatten mit Versatz
        const row = ty, off = (row & 1) ? 8 : 0, sx = Math.floor((px + off) / 16), slx = (px + off) & 15;
        const h = hash2(sx, row, s);
        let l = 0.5 + (h - 0.5) * 0.25 + (valueNoise(px * 0.15, py * 0.15, s + 3) - 0.5) * 0.3;
        if (slx === 0 || ly === 0) l -= 0.35; else if (slx === 1 || ly === 1) l += 0.08;
        if (h > 0.8 && Math.abs((slx - 8) - (ly - 8) * (h - 0.8) * 8) < 0.7) l -= 0.25; // Riss
        // Schatten unter Nordwänden
        if (!F(tx, ty - 1)) l -= Math.max(0, (6 - ly) / 6) * 0.35;
        if (!F(tx - 1, ty)) l -= Math.max(0, (3 - lx) / 3) * 0.2;
        if (!F(tx + 1, ty)) l -= Math.max(0, (lx - 12) / 3) * 0.2;
        c = q(STONE.slice(1, 6), l, px, py);
        // Moos nahe den Wänden
        const nearWall = !F(tx - 1, ty) || !F(tx + 1, ty) || !F(tx, ty - 1) || !F(tx, ty + 1);
        if (nearWall && valueNoise(px * 0.2, py * 0.2, s + 9) > 0.66) c = MOSS[(valueNoise(px * 0.5, py * 0.5, s) * 3) | 0];
      } else if (F(tx, ty + 1)) {
        // Wandfläche (Nordwand) mit Ziegeln
        const by = ly >> 2, bx = Math.floor((px + (by & 1) * 4) / 8);
        const mortar = (ly & 3) === 0 || ((px + (by & 1) * 4) & 7) === 0;
        let l = 0.55 + (hash2(bx, ty * 4 + by, s + 5) - 0.5) * 0.3 - ly / 40;
        if (mortar) l -= 0.35;
        if (ly < 2) l = 0.85;
        c = q(BRICK, l, px, py);
        if (ly > 4 && valueNoise(px * 0.25, py * 0.3, s + 11) > 0.72) c = MOSS[(px + py) % 3];
      } else if (F(tx, ty + 2)) {
        // Mauerkrone über der Nordwand
        if (ly >= 11) c = q(STONE, 0.72 - (ly - 11) * 0.05, px, py);
      } else if (F(tx, ty - 1)) {
        if (ly < 5) c = q(STONE, 0.7 - ly * 0.08, px, py); // Südmauer-Kante
      }
      // Seitenmauern (Kante 4 px)
      if (!F(tx, ty)) {
        if (F(tx + 1, ty) && lx >= 12) c = q(STONE, 0.6 + (lx - 12) * 0.05, px, py);
        if (F(tx - 1, ty) && lx < 4) c = q(STONE, 0.75 - lx * 0.05, px, py);
      }
      const i = (py * this.pw + px) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    this.drawUpStairs(ctx, this.upStair.x, this.upStair.y);
    this.drawUpStairs(ctx, this.upStair2.x, this.upStair2.y);
    this.drawDownStairs(ctx, this.downStair.x, this.downStair.y);
    // Spinnweben in Ecken, Knochen, Runen an der Wand der unteren Kammer
    const r = this.rng;
    for (const [x0, y0, x1, y1] of [this.A, this.B, this.C]) {
      for (const [cx, cy, fx] of [[x0, y0, 1], [x1 + 1, y0, -1]]) if (r() < 0.75) this.web(ctx, cx * T, cy * T, fx);
    }
    for (let i = 0; i < 6; i++) {
      const rm = [this.A, this.B, this.B, this.C][i % 4], x = rm[0] + 1 + r() * (rm[2] - rm[0] - 1), y = rm[1] + 1 + r() * (rm[3] - rm[1] - 1);
      if (Math.hypot(x * T - this.circle.x, y * T - this.circle.y) < 50) continue;
      ctx.drawImage(R.bones(i), Math.round(x * T - 8), Math.round(y * T - 5));
    }
    ctx.fillStyle = '#8a5fd0';
    for (let i = 0; i < 9; i++) { const x = (this.C[0] + 0.5 + i) * T + 4, y = (this.C[1] - 1) * T + 6; if (i === 4 || i === 5) continue; ctx.fillRect(x, y, 1, 5); ctx.fillRect(x - 2, y + 2, 5, 1); ctx.fillRect(x + 2, y, 1, 2); }
    this.ground = cv;
  }
  web(ctx, x, y, fx) {
    ctx.strokeStyle = 'rgba(210,205,220,0.35)'; ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + 0.5, y + 0.5); ctx.lineTo(x + fx * (14 - k * 3) + 0.5, y + k * 4 + 0.5); ctx.stroke(); }
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.arc(x, y, k * 4, fx > 0 ? 0 : Math.PI / 2, fx > 0 ? Math.PI / 2 : Math.PI); ctx.stroke(); }
  }
  // Treppe nach oben: Bogenöffnung in der Nordwand, Stufen steigen ins Dunkel
  drawUpStairs(ctx, tx, ty) {
    const x = tx * T, y = ty * T - 12, w = 32, h = 28;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const dx = (i - 15.5) / 16, arch = j < 10 ? Math.sqrt(Math.max(0, 1 - ((10 - j) / 10) ** 2)) : 1;
      const inside = Math.abs(dx) < arch * 0.78;
      let c;
      if (inside) { const step = Math.floor(j / 4), l = j < 8 ? 0 : 0.15 + step * 0.1 + ((j & 3) === 0 ? 0.12 : 0); c = q(STONE, l, x + i, y + j); }
      else if (Math.abs(dx) < arch * 0.95 || (j < 10 && Math.abs(dx) < 1)) c = q(R.BRICK.map(rgb), 0.85 - Math.abs(dx) * 0.4, x + i, y + j);
      else continue;
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
  // Treppe nach unten: Loch im Boden, Stufen werden dunkler
  drawDownStairs(ctx, tx, ty) {
    const x = tx * T, y = ty * T, w = 32, h = 32;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const rim = i < 3 || i > w - 4 || j < 3 || j > h - 3;
      let c;
      if (rim) c = q(STONE, 0.78 - (j < 3 ? 0 : 0.15), x + i, y + j);
      else { const s = Math.floor((j - 3) / 4); c = q(STONE, 0.62 - s * 0.11 + ((j - 3) % 4 === 0 ? 0.1 : 0), x + i, y + j); }
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.fillRect(x + i, y + j, 1, 1);
    }
    const g = ctx.createLinearGradient(0, y + 4, 0, y + h - 2); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(4,2,6,0.6)');
    ctx.fillStyle = g; ctx.fillRect(x + 3, y + 3, w - 6, h - 5);
  }

  // ---------- Objekte ----------
  addObj(o, col) { this.objects.push(o); if (col) { o.collider = { x: col[0], y: col[1], w: col[2], h: col[3], obj: o }; this.colliders.push(o.collider); } return o; }
  sconce(tx, ty) { const x = tx * T + 8, y = (ty + 1) * T; this.addObj({ type: 'torch', x, y, ox: 5, oy: 26, anim: 8, sprite: f => R.sconce(f % 4) }); this.lights.push({ x, y: y - 20, r: 96, color: [255, 170, 90], a: 0.9, flicker: 0.12 }); }
  decorate() {
    const g = this.game, r = this.rng, pl = this.place, S = this.state;
    const name = L({ de: pl.n, en: (pl.en && pl.en.n) || pl.n });
    // Treppen
    const go = (fn) => () => fn();
    this.interactables.push({ id: 'up1', kind: 'stairs', x: (this.upStair.x + 1) * T, y: (this.upStair.y + 1) * T + 6, r: 22, obj: { y: (this.upStair.y + 1) * T, oy: 26 }, label: { de: 'Hinaufsteigen', en: 'Climb up' },
      go: go(() => g.leaveCrypt(pl)) });
    this.interactables.push({ id: 'down1', kind: 'stairs', x: (this.downStair.x + 1) * T, y: (this.downStair.y + 1) * T, r: 24, obj: { y: (this.downStair.y + 1) * T, oy: 14 }, label: { de: 'Hinabsteigen', en: 'Descend' },
      go: go(() => g.travel(this.id, this.spots.bottom, null)) });
    this.interactables.push({ id: 'up2', kind: 'stairs', x: (this.upStair2.x + 1) * T, y: (this.upStair2.y + 1) * T + 6, r: 22, obj: { y: (this.upStair2.y + 1) * T, oy: 26 }, label: { de: 'Hinaufsteigen', en: 'Climb up' },
      go: go(() => g.travel(this.id, this.spots.fromBelow, null)) });
    // Teleportzirkel
    const lit = () => g.teleLock !== pl.id;
    this.flats.push({ x: this.circle.x, y: this.circle.y, ox: 36, oy: 26, sprite: () => runeCircle(lit()) });
    this.lights.push({ x: this.circle.x, y: this.circle.y - 6, r: 80, color: [190, 130, 255], a: 0.75, flicker: 0.08, pulse: true, on: lit });
    // Feuerschalen neben dem Zirkel
    for (const dx of [-3.4, 3.4]) { const x = this.circle.x + dx * T, y = this.circle.y + 8; this.addObj({ type: 'brazier', x, y, ox: 9, oy: 29, anim: 8, sprite: f => R.brazier(f % 4) }, [x - 6, y - 4, 12, 4]); this.lights.push({ x, y: y - 26, r: 84, color: [255, 160, 80], a: 0.85, flicker: 0.15 }); }
    // Wandleuchter
    const [ax0, ay0, ax1] = this.A, [bx0, by0, bx1] = this.B;
    this.sconce(ax0 + 1, ay0 - 1); this.sconce(ax1 - 1, ay0 - 1);
    this.sconce(bx0 + 1, by0 - 1); this.sconce(bx1 - 1, by0 - 1);
    this.sconce(this.C[0] + 1, this.C[1] - 1); this.sconce(this.C[2] - 1, this.C[1] - 1);
    // Säulen in Raum B
    for (const [fx, fy] of [[0.25, 0.35], [0.75, 0.35], [0.25, 0.75]]) {
      const x = Math.round((bx0 + (bx1 - bx0) * fx) * T) + 8, y = Math.round((by0 + (this.B[3] - by0) * fy) * T) + 8, br = r() < 0.4 ? 1 : 0;
      if (Math.hypot(x - (this.downStair.x + 1) * T, y - (this.downStair.y + 1) * T) < 40) continue;
      this.addObj({ type: 'pillar', x, y, ox: 9, oy: (br ? 30 : 46) - 1, sprite: () => P.pillar(br) }, [x - 8, y - 6, 16, 6]);
    }
    // Geröll, Urnen
    const freeAt = (x, y, rad) => this.floor(x / T, y / T) && !this.colliders.some(c => x > c.x - rad && x < c.x + c.w + rad && y > c.y - rad && y < c.y + c.h + rad)
      && Math.hypot(x - (this.downStair.x + 1) * T, y - (this.downStair.y + 1) * T) > 34 && Math.hypot(x - this.spots.top[0], y - this.spots.top[1]) > 30;
    for (let i = 0; i < 3; i++) { const rm = i ? this.B : this.A; const x = (rm[0] + 0.5 + r() * (rm[2] - rm[0])) * T, y = (rm[1] + 1 + r() * (rm[3] - rm[1] - 1)) * T; if (freeAt(x, y, 10)) this.addObj({ type: 'rubble', x, y, ox: 13, oy: 12, sprite: (v => () => R.rubble(v))(i + this.seed) }, [x - 11, y - 6, 22, 6]); }
    let urns = 0;
    for (let k = 0; k < 30 && urns < 5; k++) {
      const rm = k % 2 ? this.A : this.B, side = r() < 0.5;
      const x = (side ? rm[0] + 0.5 + r() * 0.3 : rm[2] + 0.5 - r() * 0.3) * T, y = (rm[1] + 1 + r() * (rm[3] - rm[1])) * T;
      if (!freeAt(x, y, 6)) continue;
      urns++;
      const o = this.addObj({ type: 'urn', x, y, ox: 7, oy: 17, sprite: (v => () => R.urn(v))(k), cuttable: true, loot: true }, [x - 5, y - 4, 10, 4]);
      o.collider && (o.collider.obj = o);
    }
    // Truhe in Raum B
    const cid = 'crypt_' + pl.id, cx = (bx0 + 1) * T + 4, cy = (this.B[3]) * T + 8;
    const chest = this.addObj({ type: 'chest', id: cid, x: cx, y: cy, ox: 10, oy: 17, sprite: () => P.chest(!!(S.opened && S.opened[cid])) }, [cx - 9, cy - 6, 18, 6]);
    this.interactables.push({ id: cid, kind: 'cryptchest', x: cx, y: cy - 4, r: 20, obj: chest });
    this.label = name;
  }

  buildMinimap() {
    const s = 2, [cv, ctx] = makeCanvas(this.w * s, this.h * s);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(this.ground, 0, 0, cv.width, cv.height);
    ctx.fillStyle = '#c49af5'; ctx.fillRect(this.circle.x / T * s - 2, this.circle.y / T * s - 2, 4, 4);
    this.minimap = cv;
  }

  // ---------- Schnittstelle ----------
  update() {}
  drawGround(ctx, cam) { ctx.drawImage(this.ground, cam.ix, cam.iy, cam.w, cam.h, 0, 0, cam.w, cam.h); }
  visibleFlats() { return this.flats; }
  visibleObjects(cam) { return this.objects.filter(o => o.x > cam.x - 70 && o.x < cam.x + cam.w + 70 && o.y > cam.y - 20 && o.y < cam.y + cam.h + 120); }
  objectsNear(x, y, r) { return this.objects.filter(o => Math.hypot(o.x - x, o.y - y) < r); }
  removeObject(o) {
    const i = this.objects.indexOf(o); if (i >= 0) this.objects.splice(i, 1);
    this.colliders = this.colliders.filter(c => c.obj !== o); this.interactables = this.interactables.filter(it => it.obj !== o);
  }
  blocked(x, y, w, h) {
    for (let ty = Math.floor(y / T); ty <= Math.floor((y + h) / T); ty++) for (let tx = Math.floor(x / T); tx <= Math.floor((x + w) / T); tx++) if (!this.floor(tx, ty)) return true;
    for (const c of this.colliders) if (x < c.x + c.w && x + w > c.x && y < c.y + c.h && y + h > c.y) return true;
    return false;
  }
  findWalkable(tx, ty) { return [tx * T, ty * T]; }
  mapMarkers() { return []; }
  matAt() { return 0; }
  regionAt() { return { id: this.id, name: { de: 'Verborgene Gruft', en: 'Hidden Crypt' } }; }
}
