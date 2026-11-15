// Baut aus einer Kartendefinition die komplette Spielwelt: Boden (pixelgenau generiert), Wasser-Animation,
// Bäume, Deko, Kollisionen, Lichtquellen und interaktive Objekte.
import { makeCanvas, valueNoise, fbm, hash2, bayer, mulberry32, hexToRgb, clamp } from '../engine/PixelUtil.js';
import { PAL } from '../art/palette.js';
import * as P from '../art/propArt.js';

export const TS = 16;

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const x = ax + dx * t, y = ay + dy * t;
  return Math.hypot(px - x, py - y);
}
function polyDist(px, py, pts) {
  let d = 1e9;
  for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  return d;
}
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Palettenwerte vorab in RGB umrechnen
const RGB = {};
for (const k of ['grass', 'dirt', 'stone', 'moss', 'water', 'sand', 'forest']) RGB[k] = PAL[k].map(hexToRgb);
function pick(pal, t, x, y) {
  const n = pal.length, v = clamp(t, 0, 0.999) * (n - 1), i = Math.floor(v);
  return pal[Math.min(n - 1, i + ((v - i) > bayer(x, y) ? 1 : 0))];
}

export class WorldMap {
  constructor(def, state = {}) {
    this.def = def;
    this.w = def.w; this.h = def.h;
    this.pw = def.w * TS; this.ph = def.h * TS;
    this.state = state; // Weltzustände (eingesammelt, geöffnet, ...)
    this.solid = new Uint8Array(this.w * this.h);
    this.terrain = new Uint8Array(this.w * this.h); // 0 Gras 1 Weg 2 Stein 3 Wasser 4 Ufer 5 Wald
    this.objects = [];   // y-sortierte Objekte
    this.flats = [];     // flache Deko (Blumen, Gras) unter Figuren
    this.colliders = []; // {x,y,w,h,obj}
    this.lights = [];
    this.interactables = [];
    this.rng = mulberry32(def.seed);
    this.buildForestMask();
    this.buildGround();
    this.buildWater();
    this.buildBridge();
    this.placeProps();
    this.placeVegetation();
    this.placePickups();
    this.buildColliderGrid();
    this.buildMinimap();
  }

  // ---------- Felder ----------
  buildForestMask() {
    const d = this.def, F = new Float32Array(this.w * this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      let f = 1;
      for (const [cx, cy, rx, ry] of d.clearings) {
        const dd = ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2;
        f = Math.min(f, 1 - smoothstep(1.25, 0.65, dd));
      }
      for (const p of d.paths) if (polyDist(x + .5, y + .5, p.pts) < p.w + 1.2) f = Math.min(f, 0.15);
      f += (valueNoise(x * 0.35, y * 0.35, d.seed + 7) - 0.5) * 0.45;
      const edge = Math.min(x, y, this.w - 1 - x, this.h - 1 - y);
      if (edge < 3) f = Math.max(f, 1 - edge * 0.12);
      F[y * this.w + x] = clamp(f, 0, 1);
    }
    this.forest = F;
  }
  forestAt(tx, ty) { tx |= 0; ty |= 0; if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return 1; return this.forest[ty * this.w + tx]; }

  inRect(r, x, y, pad = 0) { return x >= r.x0 - pad && x <= r.x1 + pad && y >= r.y0 - pad && y <= r.y1 + pad; }

  // ---------- Boden ----------
  buildGround() {
    const d = this.def, W = this.pw, H = this.ph, seed = d.seed;
    const [cv, ctx] = makeCanvas(W, H);
    const img = ctx.createImageData(W, H), data = img.data;
    const riverPts = d.river.pts;
    this.waterMask = new Uint8Array(W * H);
    for (let py = 0; py < H; py++) {
      const ty = py / TS;
      for (let px = 0; px < W; px++) {
        const tx = px / TS;
        const n1 = valueNoise(px / 22, py / 22, seed), n2 = valueNoise(px / 6, py / 6, seed + 1);
        let col = null, ter = 0;
        // Wasser
        const dr = polyDist(tx, ty, riverPts);
        const rh = d.river.w / 2 + (n1 - 0.5) * 0.5;
        let wd = dr - rh; // <0 im Wasser
        for (const [cx, cy, rx, ry] of d.ponds) {
          const e = Math.sqrt(((tx - cx) / rx) ** 2 + ((ty - cy) / ry) ** 2);
          wd = Math.min(wd, (e - 1 + (n1 - 0.5) * 0.25) * Math.min(rx, ry));
        }
        if (wd < 0) {
          const depth = clamp(-wd / 1.2, 0, 1);
          col = pick(RGB.water.slice(0, 5), 0.85 - depth * 0.7 + (n2 - 0.5) * 0.2, px, py);
          ter = 3; this.waterMask[py * W + px] = 1;
        } else if (wd < 0.5 + n2 * 0.35) {
          col = pick([RGB.dirt[0], RGB.dirt[1], RGB.sand[0], RGB.sand[1]], 0.2 + (wd / 0.8) * 0.7 + (n2 - 0.5) * 0.3, px, py);
          if (hash2(px, py, 5) > 0.93) col = RGB.stone[4];
          ter = 4;
        }
        // Steinplatz
        if (!col) {
          const plazas = [d.plaza, ...(d.ruinFloor || [])];
          for (let i = 0; i < plazas.length; i++) {
            const r = plazas[i];
            const edgeN = (n1 - 0.5) * 2.2;
            if (!this.inRect(r, tx, ty, -0.3 + edgeN * 0.6)) continue;
            const row = Math.floor(py / 12), offs = (row % 2) * 8;
            const sx = Math.floor((px + offs) / 16), lx = (px + offs) % 16, ly = py % 12;
            const slabH = hash2(sx, row, 77 + i);
            const missing = slabH < (i === 0 ? 0.08 : 0.28);
            if (missing) break;
            let t = 0.48 + (slabH - 0.5) * 0.3 + (n2 - 0.5) * 0.18;
            if (lx === 0 || ly === 0) { t = 0.1; if (hash2(px, py, 9) > 0.55) { col = pick(RGB.moss, 0.4 + n2 * 0.4, px, py); } }
            else if (lx === 1 || ly === 1) t += 0.14;
            else if (lx === 15 || ly === 11) t -= 0.12;
            if (!col) col = pick(RGB.stone.slice(1, 6), t, px, py);
            // Risse
            if (hash2(sx * 3 + lx, row * 5 + ly, 12) > 0.985) col = RGB.stone[0];
            ter = 2;
            break;
          }
        }
        // Weg
        if (!col) {
          let dp = 99, pw = 1;
          for (const p of d.paths) { const v = polyDist(tx, ty, p.pts) / (p.w / 2); if (v < dp) { dp = v; pw = p.w; } }
          const edge = 1 + (n1 - 0.5) * 0.45 + (n2 - 0.5) * 0.2;
          if (dp < edge) {
            let t = 0.55 - dp * 0.25 + (n2 - 0.5) * 0.4;
            if (dp > edge - 0.18 && bayer(px, py) > 0.5) t -= 0.25;
            col = pick(RGB.dirt.slice(1), t, px, py);
            if (hash2(px >> 1, py >> 1, 21) > 0.975) col = RGB.stone[hash2(px, py, 3) > 0.5 ? 5 : 3];
            ter = 1;
          } else if (dp < edge + 0.25 && bayer(px, py) < (edge + 0.25 - dp) * 3) {
            col = RGB.dirt[3]; ter = 1;
          }
        }
        // Gras
        if (!col) {
          const f = this.forestAt(tx, ty);
          let t = 0.5 + (fbm(px / 64, py / 64, seed + 3, 3) - 0.5) * 0.7 + (n1 - 0.5) * 0.25 - f * 0.35;
          const blade = hash2(px, py >> 1, seed + 9);
          if (blade > 0.88) t += 0.16; else if (blade < 0.06) t -= 0.16;
          if (((px + (py >> 2)) % 5 === 0) && hash2(px >> 2, py >> 2, 3) > 0.7) t += 0.08;
          col = pick(RGB.grass, t, px, py);
          ter = f > 0.6 ? 5 : 0;
        }
        const o = (py * W + px) * 4;
        data[o] = col[0]; data[o + 1] = col[1]; data[o + 2] = col[2]; data[o + 3] = 255;
        if ((px & 15) === 8 && (py & 15) === 8) this.terrain[(py >> 4) * this.w + (px >> 4)] = ter;
      }
    }
    ctx.putImageData(img, 0, 0);
    this.ground = cv;
    // Wasser-Kacheln als Hindernis
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      let wc = 0;
      for (let j = 2; j < 16; j += 4) for (let i = 2; i < 16; i += 4) wc += this.waterMask[(y * 16 + j) * W + x * 16 + i];
      if (wc >= 8) this.solid[y * this.w + x] = 1;
      if (x === 0 || y === 0 || x === this.w - 1 || y === this.h - 1) this.solid[y * this.w + x] = 1;
    }
  }

  // ---------- Wasser-Animation ----------
  buildWater() {
    const W = this.pw, H = this.ph;
    let minY = H, maxY = 0;
    for (let i = 0; i < this.waterMask.length; i++) if (this.waterMask[i]) { const y = (i / W) | 0; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    this.waterBox = { y0: minY, y1: maxY + 1 };
    const h = Math.max(1, maxY - minY + 1);
    this.waterFrames = [];
    const hi = PAL.water[6], mid = PAL.water[5];
    for (let f = 0; f < 6; f++) {
      const [cv, ctx] = makeCanvas(W, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) {
        const gy = y + minY;
        if (!this.waterMask[gy * W + x]) continue;
        // Uferschaum
        const nearBank = !this.waterMask[(gy - 2) * W + x] || !this.waterMask[(gy + 2) * W + x] || !this.waterMask[gy * W + x - 2] || !this.waterMask[gy * W + x + 2];
        const w1 = Math.sin((x * 0.22) + f * 1.05 + Math.sin(gy * 0.4) * 1.5) + Math.sin(gy * 0.9 - f * 0.5);
        if (nearBank && hash2(x >> 1, gy >> 1, f) > 0.55) { ctx.fillStyle = 'rgba(200,236,232,0.55)'; ctx.fillRect(x, y, 1, 1); continue; }
        if (w1 > 1.75 && (gy % 3 === 0)) { ctx.fillStyle = hi; ctx.fillRect(x, y, 1, 1); }
        else if (w1 > 1.45 && (gy % 3 === 0)) { ctx.fillStyle = mid; ctx.fillRect(x, y, 1, 1); }
      }
      this.waterFrames.push(cv);
    }
  }

  buildBridge() {
    const b = this.def.bridge;
    const x0 = b.x0 * TS, x1 = b.x1 * TS, y0 = b.y0 * TS, y1 = b.y1 * TS;
    const [cv, ctx] = makeCanvas(x1 - x0, y1 - y0);
    const w = x1 - x0, h = y1 - y0;
    // Schatten auf dem Wasser
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const plank = Math.floor(y / 5), ly = y % 5;
      let t = 0.62 + (hash2(plank, 1, 4) - 0.5) * 0.3 - (x / w) * 0.15;
      if (ly === 4) t = 0.12; else if (ly === 0) t += 0.15;
      const nail = (x === 4 || x === w - 5) && ly === 2;
      let c = pick(PAL.wood.slice(1).map(hexToRgb), t, x, y);
      if (nail) c = hexToRgb('#3a3240');
      if (x < 3 || x >= w - 3) c = hexToRgb(PAL.wood[x < 3 ? 2 : 1]);
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.fillRect(x, y, 1, 1);
    }
    // Geländer
    ctx.fillStyle = PAL.wood[4]; ctx.fillRect(0, 0, 3, h); ctx.fillStyle = PAL.wood[1]; ctx.fillRect(w - 3, 0, 3, h);
    for (let y = 2; y < h; y += 14) { ctx.fillStyle = PAL.wood[5]; ctx.fillRect(0, y, 3, 3); ctx.fillRect(w - 3, y, 3, 3); }
    this.bridge = { cv, x: x0, y: y0 };
    // Brücke begehbar machen, Geländer blockiert
    for (let ty = Math.floor(b.y0); ty < Math.ceil(b.y1); ty++) for (let tx = Math.floor(b.x0); tx < Math.ceil(b.x1); tx++) this.solid[ty * this.w + tx] = 0;
    this.colliders.push({ x: x0 - 2, y: y0 + 8, w: 5, h: h - 16 }, { x: x1 - 3, y: y0 + 8, w: 5, h: h - 16 });
  }

  // ---------- Objekte ----------
  addObj(o) { this.objects.push(o); return o; }
  addCollider(x, y, w, h, obj) { const c = { x, y, w, h, obj }; this.colliders.push(c); return c; }
  addLight(l) { this.lights.push(l); return l; }

  placeProps() {
    const S = this.state;
    for (const p of this.def.props) {
      const x = p.x * TS, y = p.y * TS;
      const id = p.id;
      switch (p.t) {
        case 'gate': {
          const o = this.addObj({ type: 'gate', id, x, y, sy: y - 40, ox: 56, oy: 88, sprite: () => P.moonGate(S.gateOpen ? 1 : 0) });
          // Türme, Rückwand (immer) und Siegel-Barriere (bis geöffnet)
          this.addCollider(x - 52, y - 18, 26, 18); this.addCollider(x + 26, y - 18, 26, 18);
          this.addCollider(x - 22, y - 28, 44, 12);
          this.gateCollider = this.addCollider(x - 22, y - 16, 44, 14, o);
          if (S.gateOpen) this.gateCollider.off = true;
          this.interactables.push({ id, x, y: y - 6, r: 34, obj: o, kind: 'gate', when: () => !S.gateOpen });
          this.addLight({ x, y: y - 44, r: 90, color: [150, 90, 255], a: 0.55, flicker: 0.08, pulse: true });
          break;
        }
        case 'crystal': {
          const sz = p.s ? 1 : 1;
          this.addObj({ type: 'crystal', x, y, ox: 11 * sz, oy: 29 * sz, sprite: () => P.crystal(p.v || 0, sz) });
          this.addCollider(x - 7, y - 5, 14, 6);
          this.addLight({ x, y: y - 12, r: 46, color: [170, 110, 255], a: 0.5, flicker: 0.05, pulse: true });
          break;
        }
        case 'banner': this.addObj({ type: 'banner', x, y, ox: 10, oy: 51, anim: 4, sprite: (f) => P.banner(p.v || 0, f % 3) }); this.addCollider(x - 2, y - 3, 4, 3); break;
        case 'torch': this.addObj({ type: 'torch', x, y, ox: 6, oy: 35, anim: 8, sprite: (f) => P.torch(f % 4, true) }); this.addCollider(x - 3, y - 4, 6, 4);
          this.addLight({ x, y: y - 32, r: 62, color: [255, 160, 70], a: 0.8, flicker: 0.18 }); break;
        case 'pillar': this.addObj({ type: 'pillar', x, y, ox: 9, oy: (p.v ? 30 : 46) - 1, sprite: () => P.pillar(p.v) }); this.addCollider(x - 8, y - 6, 16, 6); break;
        case 'wall': { const w = p.w || 32; this.addObj({ type: 'wall', x, y, ox: w / 2, oy: 31, sprite: () => P.ruinWall(p.v || 0, w, 28) }); this.addCollider(x - w / 2, y - 10, w, 10); break; }
        case 'tent': this.addObj({ type: 'tent', x, y, ox: 24, oy: 38, sprite: () => P.tent() }); this.addCollider(x - 20, y - 14, 40, 14); break;
        case 'campfire': this.addObj({ type: 'campfire', x, y, ox: 12, oy: 26, anim: 10, sprite: (f) => P.campfire(f % 4) }); this.addCollider(x - 10, y - 8, 20, 8);
          this.campfire = { x, y }; this.addLight({ x, y: y - 10, r: 92, color: [255, 150, 60], a: 0.95, flicker: 0.22 }); break;
        case 'logseat': this.addObj({ type: 'log', x, y, ox: 14, oy: 11, sprite: () => P.logSeat() }); this.addCollider(x - 12, y - 6, 24, 5); break;
        case 'barrel': this.addObj({ type: 'barrel', x, y, ox: 7, oy: 17, sprite: () => P.barrel() }); this.addCollider(x - 6, y - 5, 12, 5); break;
        case 'crate': {
          const o = this.addObj({ type: 'crate', id, x, y, ox: 8, oy: 15, sprite: () => P.crate(id ? 1 : 0) });
          this.addCollider(x - 8, y - 7, 16, 7);
          if (id) this.interactables.push({ id, x, y: y - 6, r: 22, obj: o, kind: 'crate' });
          break;
        }
        case 'herbrack': this.addObj({ type: 'deco', x, y, ox: 13, oy: 25, sprite: () => P.herbRack() }); this.addCollider(x - 12, y - 4, 24, 4); break;
        case 'cauldron': this.addObj({ type: 'deco', x, y, ox: 9, oy: 17, anim: 4, sprite: (f) => P.cauldron(f % 3) }); this.addCollider(x - 7, y - 5, 14, 5);
          this.addLight({ x, y: y - 8, r: 26, color: [120, 230, 180], a: 0.45, flicker: 0.1 }); break;
        case 'sign': { const o = this.addObj({ type: 'sign', id, x, y, ox: 11, oy: 27, sprite: () => P.signpost() }); this.addCollider(x - 3, y - 4, 6, 4); this.interactables.push({ id, x, y: y - 8, r: 22, obj: o, kind: 'sign' }); break; }
        case 'chest': {
          const o = this.addObj({ type: 'chest', id, x, y, ox: 10, oy: 17, sprite: () => P.chest(!!(S.opened && S.opened[id])) });
          this.addCollider(x - 9, y - 8, 18, 8);
          this.interactables.push({ id, x, y: y - 6, r: 22, obj: o, kind: 'chest' });
          break;
        }
        case 'rockbig': this.addObj({ type: 'rock', x, y, ox: 14, oy: 19, sprite: () => P.rock(3, true) }); this.addCollider(x - 12, y - 8, 24, 8); break;
        case 'stump': this.addObj({ type: 'stump', x, y, ox: 8, oy: 11, sprite: () => P.stump() }); this.addCollider(x - 6, y - 5, 12, 5); break;
        case 'lantern': {
          const o = this.addObj({ type: 'lantern', id, x, y, ox: 6, oy: 39, sprite: () => P.lanternPost(this.isLanternLit(id)) });
          this.addCollider(x - 3, y - 4, 6, 4);
          this.interactables.push({ id, x, y: y - 8, r: 22, obj: o, kind: 'lantern' });
          this.addLight({ x: x + 8, y: y - 25, r: 58, color: [180, 220, 255], a: 0.85, flicker: 0.05, on: () => this.isLanternLit(id) });
          break;
        }
        case 'shrine': {
          const o = this.addObj({ type: 'shrine', id, x, y, ox: 11, oy: 29, sprite: () => P.foxShrine(!!S.shrine) });
          this.addCollider(x - 8, y - 9, 16, 9);
          this.interactables.push({ id, x, y: y - 8, r: 24, obj: o, kind: 'shrine' });
          this.addLight({ x, y: y - 20, r: 34, color: [140, 220, 255], a: 0.5, flicker: 0.05, on: () => !!S.shrine });
          break;
        }
        case 'altar': {
          const o = this.addObj({ type: 'altar', id, x, y, ox: 12, oy: 25, sprite: () => P.altar(!(S.shardTaken)), hidden: () => !S.gateOpen });
          this.altarCollider = this.addCollider(x - 10, y - 6, 20, 6, o);
          this.interactables.push({ id, x, y: y - 8, r: 24, obj: o, kind: 'altar', when: () => S.gateOpen });
          this.addLight({ x, y: y - 20, r: 40, color: [190, 140, 255], a: 0.7, flicker: 0.05, pulse: true, on: () => S.gateOpen && !S.shardTaken });
          break;
        }
        case 'bush': {
          if (S.cut && S.cut[id]) break;
          const o = this.addObj({ type: 'bush', id, x, y, ox: 12, oy: 17, sprite: () => P.bush(id ? 4 : 0, false), cuttable: true });
          o.collider = this.addCollider(x - 10, y - 7, 20, 7, o);
          break;
        }
      }
    }
  }

  isLanternLit(id) {
    const S = this.state;
    if (S.memoryMode) return !!(S.memLit && S.memLit[id]);
    return !!S.lanternsRestored;
  }

  placeVegetation() {
    const r = this.rng, d = this.def;
    const occupied = (x, y, rad) => this.colliders.some(c => x > c.x - rad && x < c.x + c.w + rad && y > c.y - rad && y < c.y + c.h + rad);
    const ok = (tx, ty) => {
      const t = this.terrain[(ty | 0) * this.w + (tx | 0)];
      return t !== 1 && t !== 2 && t !== 3 && t !== 4 && !this.solid[(ty | 0) * this.w + (tx | 0)];
    };
    // Bäume
    const step = 2.3;
    for (let gy = 1; gy < this.h + 2; gy += step) for (let gx = 0; gx < this.w; gx += step) {
      const tx = gx + (r() - 0.5) * 1.6, ty = gy + (r() - 0.5) * 1.6;
      if (tx < 0 || ty < 1 || tx >= this.w || ty >= this.h) continue;
      const f = this.forestAt(tx, ty);
      if (f < 0.55) continue;
      if (!ok(tx, ty) && ty < this.h - 1) continue;
      const x = tx * TS, y = ty * TS;
      if (occupied(x, y, 14)) continue;
      const pine = r() < 0.22, v = Math.floor(r() * 4);
      const o = this.addObj({ type: 'tree', x, y, ox: 28, oy: 68, sprite: () => P.tree(v, pine ? 'pine' : 'oak'), tree: true, shadow: true });
      o.canopy = { x: x - 24, y: y - 64, w: 48, h: 48 };
      this.addCollider(x - 5, y - 6, 10, 6, o);
    }
    // Büsche, Steine, Farne
    for (let i = 0; i < 700; i++) {
      const tx = 1 + r() * (this.w - 2), ty = 1 + r() * (this.h - 2);
      if (!ok(tx, ty)) continue;
      const f = this.forestAt(tx, ty); const x = tx * TS, y = ty * TS;
      const roll = r();
      if (roll < 0.42) {
        if (f < 0.12 || f > 0.85) continue;
        if (occupied(x, y, 10)) continue;
        const o = this.addObj({ type: 'bush', x, y, ox: 12, oy: 17, sprite: (() => { const v = Math.floor(r() * 4), fl = r() < 0.35; return () => P.bush(v, fl); })(), cuttable: true });
        o.collider = this.addCollider(x - 9, y - 6, 18, 6, o);
      } else if (roll < 0.46) {
        if (occupied(x, y, 6)) continue;
        const v = Math.floor(r() * 4);
        this.addObj({ type: 'rock', x, y, ox: 8, oy: 11, sprite: () => P.rock(v, false) }); this.addCollider(x - 6, y - 4, 12, 4);
      } else if (roll < 0.85) {
        const v = Math.floor(r() * 3);
        this.flats.push({ x, y, ox: 9, oy: 13, sprite: () => P.fern(v, false) });
      } else if (f > 0.35) {
        const v = Math.floor(r() * 2);
        this.flats.push({ x, y, ox: 5, oy: 8, sprite: () => P.mushroom(v) });
      }
    }
    // Gras & Blumen (animiert, flach)
    for (let i = 0; i < 2600; i++) {
      const tx = 1 + r() * (this.w - 2), ty = 1 + r() * (this.h - 2);
      if (!ok(tx, ty)) continue;
      const f = this.forestAt(tx, ty);
      const x = tx * TS, y = ty * TS, ph = r() * 6;
      if (r() < 0.38 && f < 0.7) {
        // Blumen in Gruppen
        const v = [0, 1, 2, 3, 4, 6, 1, 2][Math.floor(r() * 8)];
        for (let k = 0; k < 3; k++) this.flats.push({ x: x + (r() - 0.5) * 14, y: y + (r() - 0.5) * 10, ox: 3, oy: 8, ph, sprite: (fr) => P.flower(v, fr) , sway: true });
      } else {
        const v = Math.floor(r() * 2);
        this.flats.push({ x, y, ox: 5, oy: 8, ph, sprite: (fr) => P.grassTuft(v, fr), sway: true });
      }
    }
    // Laub-Glühwürmchen-Spawner (Nachtpartikel) merken
    this.fireflyZones = d.clearings.slice(0, 6);
  }

  placePickups() {
    const S = this.state;
    for (const grp of this.def.pickups) {
      grp.pts.forEach(([tx, ty], i) => {
        const id = grp.item + '_' + i;
        if (S.collected && S.collected[id]) return;
        const x = tx * TS, y = ty * TS;
        let sprite, ox = 8, oy = 12;
        if (grp.item === 'mondfarn') { sprite = () => P.fern(1, true); ox = 9; oy = 13; this.addLight({ x, y: y - 6, r: 22, color: [140, 240, 230], a: 0.55, flicker: 0.06, pulse: true, on: () => !(S.collected && S.collected[id]) }); }
        else if (grp.item === 'ast') { sprite = () => P.branchPickup(); oy = 6; }
        else if (grp.item === 'waldpilz') { sprite = () => P.mushroom(1); ox = 5; oy = 8; }
        else sprite = () => P.bush(7, true);
        const o = this.addObj({ type: 'pickup', id, item: grp.item, x, y, ox, oy, sprite, small: true });
        this.interactables.push({ id, x, y: y - 4, r: 18, obj: o, kind: 'pickup', item: grp.item });
      });
    }
  }

  removeObject(o) {
    const i = this.objects.indexOf(o); if (i >= 0) this.objects.splice(i, 1);
    this.colliders = this.colliders.filter(c => c.obj !== o);
    this.interactables = this.interactables.filter(it => it.obj !== o);
    this.buildColliderGrid();
  }

  // ---------- Kollision ----------
  buildColliderGrid() {
    this.cgrid = new Map();
    for (const c of this.colliders) {
      const x0 = Math.floor(c.x / 32), x1 = Math.floor((c.x + c.w) / 32), y0 = Math.floor(c.y / 32), y1 = Math.floor((c.y + c.h) / 32);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const k = y * 1000 + x; if (!this.cgrid.has(k)) this.cgrid.set(k, []); this.cgrid.get(k).push(c);
      }
    }
  }
  blocked(x, y, w, h) {
    // Kacheln
    const tx0 = Math.floor(x / TS), tx1 = Math.floor((x + w) / TS), ty0 = Math.floor(y / TS), ty1 = Math.floor((y + h) / TS);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return true;
      if (this.solid[ty * this.w + tx]) {
        // pixelgenau gegen Wassermaske prüfen
        const cx = clamp(x + w / 2, tx * TS, tx * TS + 15) | 0, cy = clamp(y + h / 2, ty * TS, ty * TS + 15) | 0;
        if (tx === 0 || ty === 0 || tx === this.w - 1 || ty === this.h - 1) return true;
        if (this.waterMask[cy * this.pw + cx]) return true;
      }
    }
    const gx0 = Math.floor(x / 32), gx1 = Math.floor((x + w) / 32), gy0 = Math.floor(y / 32), gy1 = Math.floor((y + h) / 32);
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
      const list = this.cgrid.get(gy * 1000 + gx); if (!list) continue;
      for (const c of list) if (!c.off && x < c.x + c.w && x + w > c.x && y < c.y + c.h && y + h > c.y) return true;
    }
    return false;
  }

  // ---------- Minikarte ----------
  buildMinimap() {
    const s = 2; // Pixel pro Kachel
    const [cv, ctx] = makeCanvas(this.w * s, this.h * s);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.ground, 0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = false;
    for (const o of this.objects) {
      if (o.type === 'tree') { ctx.fillStyle = 'rgba(14,34,20,0.9)'; ctx.beginPath(); ctx.arc(o.x / TS * s, (o.y - 24) / TS * s, 3.2, 0, 7); ctx.fill(); }
      if (o.type === 'gate' || o.type === 'wall' || o.type === 'pillar') { ctx.fillStyle = '#8a8794'; ctx.fillRect(o.x / TS * s - 3, o.y / TS * s - 4, 6, 4); }
      if (o.type === 'tent') { ctx.fillStyle = '#d9c49b'; ctx.fillRect(o.x / TS * s - 4, o.y / TS * s - 4, 8, 5); }
    }
    ctx.drawImage(this.bridge.cv, this.bridge.x / TS * s, this.bridge.y / TS * s, this.bridge.cv.width / TS * s, this.bridge.cv.height / TS * s);
    this.minimap = cv; this.minimapScale = s;
  }

  regionAt(x, y) {
    const tx = x / TS, ty = y / TS;
    for (const r of this.def.regions) if (Math.hypot(tx - r.x, ty - r.y) < r.r) return r;
    return null;
  }
}
