// Grundwerkzeuge für prozedurale Pixel-Art: Zufall, Rauschen, Farben, Raster mit Auto-Outline.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t) { return t * t * (3 - 2 * t); }

export function valueNoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  const u = smooth(xf), v = smooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x, y, seed = 0, oct = 4) {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += valueNoise(x * f, y * f, seed + i * 31) * amp;
    norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}

// Bayer-4x4-Matrix für sauberes Dithering
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bayer(x, y) { return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16; }

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
// Schattieren mit Farbverschiebung (Schatten Richtung Violett, Licht Richtung Gelb) für lebendigere Pixel-Art
export function shade(hex, amt) {
  if (amt < 0) return mix(hex, '#1a1028', Math.min(1, -amt));
  return mix(hex, '#fff4d6', Math.min(1, amt));
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: false });
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

// Pixelraster: Formen malen, danach automatische "Selective Outline" (dunklere Kante der Nachbarfarbe)
export class PixelGrid {
  constructor(w, h) { this.w = w; this.h = h; this.px = new Array(w * h).fill(null); this.tag = new Array(w * h).fill(0); }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) { return this.in(x, y) ? this.px[y * this.w + x] : null; }
  set(x, y, c, tag = 0) { x |= 0; y |= 0; if (this.in(x, y) && c) { this.px[y * this.w + x] = c; this.tag[y * this.w + x] = tag; } }
  setIf(x, y, c) { if (this.get(x | 0, y | 0)) this.set(x, y, c); }
  rect(x, y, w, h, c, tag) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, tag); }
  ellipse(cx, cy, rx, ry, c, tag) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c, tag);
      }
  }
  // Zeilenbasiert aus String-Schablone malen
  stamp(rows, map, ox = 0, oy = 0, flip = false) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[flip ? row.length - 1 - x : x];
        if (ch === '.' || ch === ' ') continue;
        const c = map[ch];
        if (c) this.set(ox + x, oy + y, c);
      }
    });
  }
  outline(dark = 0.62, fixed = null) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      const n = this.get(x, y + 1) || this.get(x, y - 1) || this.get(x + 1, y) || this.get(x - 1, y);
      if (n) add.push([x, y, fixed || shade(n, -dark)]);
    }
    add.forEach(([x, y, c]) => this.set(x, y, c, 9));
    return this;
  }
  toCanvas(scale = 1) {
    const [c, ctx] = makeCanvas(this.w * scale, this.h * scale);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const p = this.px[y * this.w + x];
      if (p) { ctx.fillStyle = p; ctx.fillRect(x * scale, y * scale, scale, scale); }
    }
    return c;
  }
}

export function flipCanvas(src) {
  const [c, ctx] = makeCanvas(src.width, src.height);
  ctx.translate(src.width, 0); ctx.scale(-1, 1); ctx.drawImage(src, 0, 0);
  return c;
}

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
