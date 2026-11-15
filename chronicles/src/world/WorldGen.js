// Weltgenerator für ganz Thyrvenna.
// 1) buildMasks(): rastert die Geodaten der Thyrvenna-Karte (Land, Wald, Gebirge, Flüsse, Straßen …) in Masken (1 Kartenpunkt = 1 Kachel).
// 2) Gen: liest die Masken (auch im Web Worker) und bestimmt pro Pixel Material und Farbe.
import { valueNoise, hash2, bayer, hexToRgb } from '../engine/PixelUtil.js';

export const WW = 1000, WH = 700, T = 16;
export const MASK_NAMES = ['land', 'coast', 'forest', 'pine', 'mount', 'snow', 'ash', 'lake', 'river', 'road', 'desert', 'marsh', 'field', 'settle', 'pave', 'bridge'];
export const REGIONS = ['draventhal', 'saltrivo', 'brennvald', 'valcrest', 'fennwyrd', 'sarkhazim', 'asche'];
const TINTS = { brennvald: [400, 118, 270, 80], saltrivo: [165, 360, 110, 150], draventhal: [420, 320, 210, 130], valcrest: [820, 240, 150, 170], fennwyrd: [340, 590, 210, 95], sarkhazim: [800, 590, 190, 120], asche: [605, 440, 50, 36] };

// Material-Codes
export const M = { SEA: 1, SHALLOW: 2, BEACH: 3, WATER: 4, BRIDGE: 5, ROAD: 6, PAVE: 7, ROCK: 8, SNOWROCK: 9, DESERT: 10, ASH: 11, MARSH: 12, FIELD: 13, GRASS: 14, FOREST: 15, SNOW: 16, LAVA: 17 };
export const SOLID = new Set([M.SEA, M.SHALLOW, M.WATER, M.ROCK, M.SNOWROCK, M.LAVA]);

// Ortsgrößen in Kacheln
export const PLACE_R = { capital: 20, city: 14, village: 9, fort: 8, ruin: 7, minor: 5, dungeon: 4, special: 9, tele: 6, spot: 0 };

// ---------- Rasterung (Hauptthread, braucht Canvas) ----------
export function buildMasks(D) {
  const cv = document.createElement('canvas'); cv.width = WW; cv.height = WH;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const read = () => { const d = ctx.getImageData(0, 0, WW, WH).data, a = new Uint8Array(WW * WH); for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3]; return a; };
  const clear = () => { ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, WW, WH); };
  const poly = (pts, mode = 'source-over') => { ctx.globalCompositeOperation = mode; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); };
  const circle = (x, y, r, mode = 'source-over') => { ctx.globalCompositeOperation = mode; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); };
  const line = (pts, w, mode = 'source-over') => { ctx.globalCompositeOperation = mode; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = w; ctx.strokeStyle = '#fff'; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); };
  const places = D.places.filter(p => p.layer === 'surf');
  const out = {};
  const settleR = p => PLACE_R[p.type] || 0;
  const roads = D.roads.concat(extraPaths(D));

  clear(); D.lands.forEach(p => poly(p)); out.land = read();
  out.coast = blur(out.land, 6, 3);
  clear(); D.forests.forEach(f => poly(f.poly)); D.forests.forEach(f => f.clear.forEach(([x, y, r]) => circle(x, y, r * 0.8, 'destination-out')));
  places.forEach(p => { const r = settleR(p); if (r) circle(p.x, p.y, r + 2, 'destination-out'); });
  roads.forEach(r => line(r, 4, 'destination-out')); out.forest = read();
  clear(); D.forests.filter(f => f.pine).forEach(f => poly(f.poly)); out.pine = read();
  clear(); D.ranges.forEach(m => poly(m.poly)); D.ranges.forEach(m => m.clear.forEach(([x, y, r]) => circle(x, y, r, 'destination-out')));
  roads.forEach(r => line(r, 5, 'destination-out'));
  places.forEach(p => { const r = settleR(p); if (r) circle(p.x, p.y, r + 1, 'destination-out'); });
  out.mount = read();
  clear(); D.ranges.filter(m => m.snow).forEach(m => poly(m.poly)); out.snow = read();
  clear(); D.ranges.filter(m => m.ash).forEach(m => poly(m.poly)); poly(D.lands[4]); out.ash = read();
  clear(); D.lakes.forEach(p => poly(p)); out.lake = read();
  clear();
  D.rivers.forEach(rv => { const n = rv.pts.length, a = Math.floor(n / 3), b = Math.floor(2 * n / 3); [[0, a + 1, rv.w[0]], [a, b + 1, rv.w[1]], [b, n, rv.w[2]]].forEach(([s, e, w]) => line(rv.pts.slice(s, e), Math.max(2.2, w * 1.8))); });
  out.river = read();
  clear(); D.roads.forEach(r => line(r, 2.4)); extraPaths(D).forEach(r => line(r, 1.6)); out.road = read();
  // Brücken: Straße über Fluss
  out.bridge = new Uint8Array(WW * WH); for (let i = 0; i < out.bridge.length; i++) if (out.road[i] > 120 && (out.river[i] > 60 || out.lake[i] > 60)) out.bridge[i] = 255;
  clear(); poly(D.desert); out.desert = read();
  clear(); poly(D.marsh); out.marsh = read();
  clear();
  let s = 42; const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  D.fields.forEach(([cx, cy, rad, cnt]) => {
    for (let i = 0; i < cnt * 4; i++) {
      const a = rng() * 6.283, d = Math.sqrt(rng()) * rad, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      if (Math.hypot(x - cx, y - cy) < 9) continue;
      const w = 6 + rng() * 7, h = 4 + rng() * 4, an = rng() * .8 - .4;
      ctx.save(); ctx.translate(x, y); ctx.rotate(an); ctx.fillStyle = '#fff'; ctx.globalCompositeOperation = 'source-over'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore();
    }
  });
  roads.forEach(r => line(r, 3, 'destination-out')); out.field = read();
  clear(); places.forEach(p => { const r = settleR(p); if (r) circle(p.x, p.y, r); }); out.settle = read();
  clear(); places.filter(p => p.type === 'capital' || p.type === 'city').forEach(p => circle(p.x, p.y, settleR(p) * 0.62)); out.pave = read();
  // leicht weichzeichnen für organische Ränder
  for (const k of ['land', 'forest', 'pine', 'mount', 'snow', 'ash', 'lake', 'river', 'desert', 'marsh', 'field', 'pave']) out[k] = blur(out[k], 1, 1);
  // Reiche
  const region = new Uint8Array(WW * WH);
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    let best = 0, bv = 1e9;
    const jx = x + (valueNoise(x / 28, y / 28, 91) - 0.5) * 60, jy = y + (valueNoise(x / 28, y / 28, 92) - 0.5) * 60;
    REGIONS.forEach((r, i) => { if (r === 'asche') return; const [cx, cy, rx, ry] = TINTS[r]; const d = Math.hypot((jx - cx) / rx, (jy - cy) / ry); if (d < bv) { bv = d; best = i; } });
    region[y * WW + x] = out.ash[y * WW + x] > 128 ? 6 : best;
  }
  out.region = region;
  return out;
}

// Kleine Pfade zu Dungeons und abgelegenen Orten
function extraPaths(D) {
  const P = id => { const p = D.places.find(q => q.id === id); return p ? [p.x, p.y] : null; };
  const paths = [
    ['d_kesselgrube', 'kesselgrund'], ['d_moortempel', 'kraehenmoor'], ['d_sturmzahn', 'moewenstein'], ['d_sandgrab', 'qalimra'],
    ['salzinseln', 'salzinseln'], ['morvhal', 'morvhal'],
  ];
  return paths.map(([a, b]) => [P(a), P(b)]).filter(([a, b]) => a && b && (a[0] !== b[0] || a[1] !== b[1]));
}

function blur(src, r, passes) {
  let a = new Float32Array(src.length); for (let i = 0; i < src.length; i++) a[i] = src[i];
  const tmp = new Float32Array(src.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < WH; y++) { let acc = 0; const row = y * WW; for (let x = -r; x <= r; x++) acc += a[row + Math.min(WW - 1, Math.max(0, x))]; for (let x = 0; x < WW; x++) { tmp[row + x] = acc / (2 * r + 1); acc += a[row + Math.min(WW - 1, x + r + 1)] - a[row + Math.max(0, x - r)]; } }
    for (let x = 0; x < WW; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(WH - 1, Math.max(0, y)) * WW + x]; for (let y = 0; y < WH; y++) { a[y * WW + x] = acc / (2 * r + 1); acc += tmp[Math.min(WH - 1, y + r + 1) * WW + x] - tmp[Math.max(0, y - r) * WW + x]; } }
  }
  const o = new Uint8Array(src.length); for (let i = 0; i < o.length; i++) o[i] = a[i]; return o;
}

// ---------- Farbpaletten ----------
const H = a => a.map(hexToRgb);
const PAL = {
  grass: {
    draventhal: H(['#26421f', '#2f5226', '#3a632c', '#467634', '#55893b', '#689c45', '#82b052', '#a0c464']),
    saltrivo: H(['#22402e', '#2a4f35', '#335f3c', '#3e6f44', '#4b804c', '#5b9156', '#73a564', '#92b978']),
    brennvald: H(['#2a3628', '#343f30', '#3e4a38', '#4a5642', '#58624c', '#6a7258', '#808666', '#9a9c7c']),
    valcrest: H(['#36452a', '#425432', '#4f643a', '#5d7444', '#6e854e', '#83975c', '#9cab6c', '#b8c282']),
    fennwyrd: H(['#1f3a22', '#284a28', '#31592c', '#3b6a31', '#4a7c38', '#5d8f3f', '#76a64c', '#93bd5c']),
    sarkhazim: H(['#4a4a28', '#5a5830', '#6a6638', '#7a7442', '#8c844c', '#9e9458', '#b2a666', '#c6b878']),
    asche: H(['#1e1a1c', '#262123', '#2e282a', '#363032', '#40383a', '#4a4244', '#564c4e', '#625858']),
  },
  sea: H(['#0f2c42', '#123650', '#16415e', '#1b4d6c', '#215a7a']),
  shallow: H(['#245f78', '#2b6f85', '#358091', '#4392a0', '#5aa8ae']),
  water: H(['#14303f', '#1a4054', '#205167', '#2a667c', '#3a8193']),
  sand: H(['#9a8560', '#b09a70', '#c4ae80', '#d4c08e', '#e2d0a0']),
  desert: H(['#a6804c', '#b88f58', '#c9a066', '#d6b074', '#e2c084', '#ecd096']),
  dirt: H(['#4a3426', '#5c4130', '#6f5139', '#836242', '#97754e', '#ad8c61']),
  pave: H(['#3b3844', '#4d4a58', '#615e6d', '#7a7787', '#9592a0', '#aeabb8']),
  paveWarm: H(['#5a4a3a', '#6e5c48', '#847058', '#9a866a', '#b09c7e', '#c4b292']),
  rock: H(['#2b2833', '#3b3844', '#4d4a58', '#615e6d', '#7a7787', '#9592a0', '#b3b0bb']),
  snow: H(['#8a96aa', '#a4b0c2', '#bcc6d6', '#d2dae6', '#e6ecf4', '#f6f8fc']),
  ash: H(['#1a1517', '#241e20', '#2e2729', '#3a3234', '#463c3e', '#544849']),
  marsh: H(['#26301e', '#303a24', '#3a442a', '#454f30', '#525c38', '#606a42']),
  marshWater: H(['#253a34', '#2e463e', '#385248', '#445e52']),
  wheat: H(['#8a7a32', '#a08e3c', '#b6a248', '#c8b456', '#d8c466']),
  crops: H(['#3a5a22', '#46692a', '#557a32', '#668c3c', '#7a9e48']),
  wood: H(['#2c1c13', '#43291a', '#5e3a22', '#7a4d2c', '#966238', '#b37c48']),
  lava: H(['#5a1408', '#8f2a0c', '#c94a12', '#f0801e', '#ffb53a']),
};
function pick(pal, t, x, y) { const n = pal.length, v = Math.max(0, Math.min(0.999, t)) * (n - 1), i = Math.floor(v); return pal[Math.min(n - 1, i + ((v - i) > bayer(x, y) ? 1 : 0))]; }

// ---------- Generator (Hauptthread + Worker) ----------
export class Gen {
  constructor(masks) { this.m = masks; this.seed = 1359; }
  regionAt(tx, ty) { tx = Math.max(0, Math.min(WW - 1, tx | 0)); ty = Math.max(0, Math.min(WH - 1, ty | 0)); return REGIONS[this.m.region[ty * WW + tx]]; }
  // Alle Masken an einer Stelle bilinear lesen
  sample(tx, ty, o) {
    tx -= 0.5; ty -= 0.5;
    let x0 = Math.floor(tx), y0 = Math.floor(ty); const fx = tx - x0, fy = ty - y0;
    if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0; if (x0 > WW - 2) x0 = WW - 2; if (y0 > WH - 2) y0 = WH - 2;
    const i = y0 * WW + x0, w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
    const m = this.m;
    for (const k of MASK_NAMES) { const a = m[k]; o[k] = (a[i] * w00 + a[i + 1] * w10 + a[i + WW] * w01 + a[i + WW + 1] * w11) / 255; }
    return o;
  }
  // Material an einem Pixel bestimmen (auch für Kollision benutzt)
  noise(px, py) { return [valueNoise(px / 22, py / 22, this.seed), valueNoise(px / 7, py / 7, this.seed + 1)]; }
  classify(px, py, s, reg, n1, n2) {
    if (n1 === undefined) [n1, n2] = this.noise(px, py);
    const land = s.land + (n1 - 0.5) * 0.22;
    if (land < 0.42) return s.coast > 0.5 ? M.SHALLOW : M.SEA;
    if (s.bridge > 0.5) return M.BRIDGE;
    if (land < 0.52 && reg !== 'asche' && s.road < 0.4) return M.BEACH;
    if (s.lake + (n2 - 0.5) * 0.15 > 0.5 || s.river + (n2 - 0.5) * 0.1 > 0.42) return s.road > 0.5 ? M.BRIDGE : M.WATER;
    if (s.road + (n1 - 0.5) * 0.3 > 0.5) return M.ROAD;
    if (s.pave + (n1 - 0.5) * 0.3 > 0.5) return M.PAVE;
    if (s.mount + (n1 - 0.5) * 0.3 > 0.5) return (s.snow > 0.4 && s.mount > 0.8 && n1 > 0.45) ? M.SNOWROCK : M.ROCK;
    if (reg === 'asche' || s.ash > 0.5) return (n2 > 0.93 && n1 > 0.6 && s.settle < 0.3) ? M.LAVA : M.ASH;
    if (s.desert + (n1 - 0.5) * 0.3 > 0.5) return M.DESERT;
    if (s.marsh + (n1 - 0.5) * 0.3 > 0.5) return M.MARSH;
    if (s.field > 0.5) return M.FIELD;
    if (reg === 'brennvald' && py / T < 78 + (n1 - 0.5) * 30) return M.SNOW;
    return s.forest > 0.5 ? M.FOREST : M.GRASS;
  }
  // Farbe eines Pixels → [r,g,b]
  color(px, py, s, reg, mat, n1, n2) {
    if (n1 === undefined) [n1, n2] = this.noise(px, py);
    const h = hash2(px, py >> 1, 9);
    switch (mat) {
      case M.SEA: { const d = 1 - s.coast; let t = 0.85 - d * 0.7 + (n2 - 0.5) * 0.18; if (((px + (py >> 1) * 3) % 23) === 0 && n1 > 0.55) t += 0.3; return pick(PAL.sea, t, px, py); }
      case M.SHALLOW: { const t = 0.2 + s.coast * 0.6 + (n2 - 0.5) * 0.2; const land = s.land + (n1 - 0.5) * 0.22; if (land > 0.39 && h > 0.4) return [210, 236, 230]; return pick(PAL.shallow, t, px, py); }
      case M.BEACH: return h > 0.97 ? PAL.rock[4] : pick(PAL.sand, 0.4 + (n2 - 0.5) * 0.5 + (s.land - 0.5) * 2, px, py);
      case M.WATER: { const t = 0.75 - Math.max(s.lake, s.river) * 0.45 + (n2 - 0.5) * 0.2; return pick(PAL.water, t, px, py); }
      case M.BRIDGE: { const ly = py % 5; let t = 0.6 + (hash2(px >> 4, py / 5 | 0, 4) - 0.5) * 0.3; if (ly === 4) t = 0.1; return pick(PAL.wood, t, px, py); }
      case M.ROAD: {
        if (reg === 'valcrest' || reg === 'sarkhazim' || s.pave > 0.3) return this.cobble(px, py, reg === 'sarkhazim' ? PAL.paveWarm : PAL.pave, n2);
        let t = 0.5 + (n2 - 0.5) * 0.45; if (hash2(px >> 1, py >> 1, 21) > 0.975) return PAL.rock[5];
        return pick(PAL.dirt.slice(1), t, px, py);
      }
      case M.PAVE: return this.cobble(px, py, reg === 'sarkhazim' ? PAL.paveWarm : reg === 'valcrest' ? PAL.pave.map(c => c.map(v => Math.min(255, v + 18))) : PAL.pave, n2);
      case M.ROCK: case M.SNOWROCK: {
        // Fels mit Schichtung und Licht von oben links
        const st = Math.sin(py * 0.18 + n1 * 6) * 0.12, cr = hash2(px >> 2, py >> 1, 33) > 0.9 ? -0.25 : 0;
        let t = 0.36 + (n2 - 0.5) * 0.5 + st + cr + (s.mount - 0.6) * 0.15;
        if (mat === M.SNOWROCK && n2 > 0.35) return pick(PAL.snow, t + 0.3, px, py);
        return pick(reg === 'asche' ? PAL.ash.concat([PAL.rock[3]]) : PAL.rock, t, px, py);
      }
      case M.SNOW: return pick(PAL.snow, 0.55 + (n2 - 0.5) * 0.5 + (h > 0.9 ? 0.15 : 0), px, py);
      case M.LAVA: { const t = 0.5 + (n2 - 0.5) * 1.2; return pick(PAL.lava, t, px, py); }
      case M.ASH: { let t = 0.45 + (n1 - 0.5) * 0.5 + (n2 - 0.5) * 0.3; if (h > 0.996) return [190, 70, 30]; return pick(PAL.ash, t, px, py); }
      case M.DESERT: { const rip = Math.sin(px * 0.09 + py * 0.32 + n1 * 9) * 0.18; return pick(PAL.desert, 0.5 + rip + (n2 - 0.5) * 0.3, px, py); }
      case M.MARSH: { if (n2 > 0.62 && n1 > 0.42) return pick(PAL.marshWater, 0.3 + (n2 - 0.62) * 3, px, py); let t = 0.5 + (n2 - 0.5) * 0.6; if (h > 0.9) t += 0.2; return pick(PAL.marsh, t, px, py); }
      case M.FIELD: {
        const crop = hash2(px >> 6, py >> 6, 77) > 0.45 ? PAL.wheat : PAL.crops;
        const row = (py >> 1) % 3 === 0;
        return pick(crop, 0.55 + (row ? -0.35 : 0) + (n2 - 0.5) * 0.25, px, py);
      }
      default: {
        const pal = PAL.grass[reg] || PAL.grass.draventhal;
        let t = 0.5 + (n1 - 0.5) * 0.55 + (valueNoise(px / 64, py / 64, 3) - 0.5) * 0.4 - s.forest * 0.35;
        if (h > 0.88) t += 0.16; else if (h < 0.06) t -= 0.16;
        return pick(pal, t, px, py);
      }
    }
  }
  cobble(px, py, pal, n2) {
    const row = Math.floor(py / 5), off = (row & 1) * 3, lx = (px + off) % 6, ly = py % 5;
    let t = 0.55 + (hash2((px + off) / 6 | 0, row, 5) - 0.5) * 0.4 + (n2 - 0.5) * 0.2;
    if (lx === 0 || ly === 0) t = 0.12; else if (lx === 1 || ly === 1) t += 0.12;
    return pick(pal, t, px, py);
  }
  // Tile-Info für Kollision/Platzierung (Mitte der Kachel)
  tileMat(tx, ty) {
    const s = this.sample(tx + 0.5, ty + 0.5, this._s || (this._s = {}));
    return this.classify(tx * T + 8, ty * T + 8, s, this.regionAt(tx, ty));
  }
  // Einen Bodenchunk berechnen (RGBA)
  chunkPixels(cx, cy, size) {
    const W = size * T, data = new Uint8ClampedArray(W * W * 4), s = {};
    const x0 = cx * size * T, y0 = cy * size * T;
    let reg = 'fennwyrd';
    for (let y = 0; y < W; y++) {
      const py = y0 + y;
      for (let x = 0; x < W; x++) {
        const px = x0 + x;
        // Masken nur alle 4 Pixel neu lesen (sie ändern sich auf Kachelebene langsam)
        if ((x & 3) === 0) { this.sample((px + 2) / T, (py + 0.5) / T, s); reg = this.regionAt(px / T, py / T); }
        const n1 = valueNoise(px / 22, py / 22, this.seed), n2 = valueNoise(px / 7, py / 7, this.seed + 1);
        const mat = this.classify(px, py, s, reg, n1, n2);
        const c = this.color(px, py, s, reg, mat, n1, n2);
        const o = (y * W + x) * 4; data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
      }
    }
    return data;
  }
  // Übersichtskarte: 1 Pixel pro Kachel
  overview() {
    const data = new Uint8ClampedArray(WW * WH * 4), s = {};
    for (let ty = 0; ty < WH; ty++) for (let tx = 0; tx < WW; tx++) {
      const px = tx * T + 8, py = ty * T + 8;
      this.sample(tx + 0.5, ty + 0.5, s);
      const reg = this.regionAt(tx, ty), mat = this.classify(px, py, s, reg);
      let c = this.color(px, py, s, reg, mat);
      if (mat === M.FOREST) c = [c[0] * 0.7, c[1] * 0.78, c[2] * 0.7];
      if (mat === M.ROCK || mat === M.SNOWROCK) { const sh = (tx + ty) % 3 === 0 ? 0.8 : 1; c = [c[0] * sh, c[1] * sh, c[2] * sh]; }
      const o = (ty * WW + tx) * 4; data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
    }
    return data;
  }
}
