// Prozedural gezeichnete Umgebungsobjekte (Bäume, Ruinen, Lager, Dekoration). Ergebnis wird gecacht.
import { PixelGrid } from '../engine/PixelUtil.js';
import { PAL } from './palette.js';
import { mulberry32, bayer, shade, mix, makeCanvas, valueNoise } from '../engine/PixelUtil.js';

const cache = new Map();
function cached(k, fn) { if (!cache.has(k)) cache.set(k, fn()); return cache.get(k); }

function q(pal, t, x, y) { // Wert 0..1 mit Dithering auf Palette abbilden
  const n = pal.length;
  const v = Math.max(0, Math.min(0.999, t)) * (n - 1);
  const i = Math.floor(v), f = v - i;
  return pal[Math.min(n - 1, i + (f > bayer(x, y) ? 1 : 0))];
}

// ---------- Bäume ----------
export function tree(variant = 0, kind = 'oak') {
  return cached('tree' + kind + variant, () => {
    const W = 56, H = 72;
    const g = new PixelGrid(W, H);
    const r = mulberry32(1000 + variant * 77 + (kind === 'pine' ? 5000 : 0));
    const cx = W / 2, base = H - 4;
    const bark = PAL.bark;
    // Stamm + Wurzeln
    const tw = 6 + Math.floor(r() * 2);
    for (let y = base - 22; y <= base; y++) {
      const spread = y > base - 4 ? (y - (base - 4)) * 1.2 : 0;
      for (let x = Math.floor(cx - tw / 2 - spread); x <= Math.ceil(cx + tw / 2 + spread); x++) {
        const rel = (x - (cx - tw / 2 - spread)) / (tw + spread * 2);
        let t = 0.75 - rel * 0.7 + (valueNoise(x * 0.9, y * 0.25, variant) - 0.5) * 0.5;
        g.set(x, y, q(bark, t, x, y));
      }
    }
    // Wurzelausläufer
    g.rect(cx - tw / 2 - 5, base, 3, 1, bark[1]); g.rect(cx + tw / 2 + 2, base, 3, 1, bark[1]);
    if (kind === 'pine') {
      // Tanne: gestapelte Dreiecke
      const layers = 5;
      for (let L = 0; L < layers; L++) {
        const ty = 4 + L * 9, hh = 16, ww = 10 + L * 4.5;
        for (let y = 0; y < hh; y++) for (let x = -ww; x <= ww; x++) {
          const yy = ty + y; const lim = (y / hh) * ww + 1;
          if (Math.abs(x) > lim) continue;
          const jag = ((x + y * 3 + L) % 4 === 0 && y > hh - 3);
          if (jag) continue;
          const light = 0.65 - (x / ww) * 0.35 - (y / hh) * 0.35 + (valueNoise((cx + x) * 0.5, yy * 0.5, 9 + variant) - 0.5) * 0.35;
          g.set(cx + x, yy, q(PAL.leaf.slice(0, 6), light, cx + x, yy));
        }
      }
      g.outline(0.6);
      return g.toCanvas();
    }
    // Laubbaum: Krone aus Blobs
    const blobs = [];
    const crownY = 24 + r() * 4, crownR = 20 + r() * 3;
    blobs.push([cx, crownY, crownR, crownR * 0.82]);
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2, d = crownR * (0.45 + r() * 0.35);
      blobs.push([cx + Math.cos(a) * d, crownY + Math.sin(a) * d * 0.7 - 2, 7 + r() * 6, 6 + r() * 5]);
    }
    for (let y = 0; y < H - 10; y++) for (let x = 0; x < W; x++) {
      let inside = false, best = 9, bl = null;
      for (const b of blobs) {
        const dx = (x + 0.5 - b[0]) / b[2], dy = (y + 0.5 - b[1]) / b[3], d = dx * dx + dy * dy;
        if (d <= 1) { inside = true; if (d < best || (b[1] > (bl ? bl[1] : -1) && d < 0.9)) { best = d; bl = b; } }
      }
      if (!inside) continue;
      // Licht von oben links, pro Blob + Gesamtform
      const dx = (x - bl[0]) / bl[2], dy = (y - bl[1]) / bl[3];
      let light = 0.62 - dx * 0.28 - dy * 0.38;
      const gy = (y - (crownY - crownR)) / (crownR * 2);
      light -= gy * 0.32;
      light += (valueNoise(x * 0.35, y * 0.35, 40 + variant) - 0.5) * 0.45;
      // Blatt-Klumpen-Textur
      if (((x * 7 + y * 13 + variant) % 23) === 0) light += 0.18;
      g.set(x, y, q(PAL.leaf, light, x, y));
    }
    // Glanzpunkte & Blütensprenkel
    for (let i = 0; i < 18; i++) {
      const b = blobs[Math.floor(r() * blobs.length)];
      const x = Math.round(b[0] - b[2] * 0.4 + r() * 4), y = Math.round(b[1] - b[3] * 0.5 + r() * 3);
      if (g.get(x, y)) g.set(x, y, PAL.leaf[7]);
    }
    g.outline(0.55);
    return g.toCanvas();
  });
}

export function treeShadow() {
  return cached('treeshadow', () => {
    const [c, ctx] = makeCanvas(56, 24);
    for (let y = 0; y < 24; y++) for (let x = 0; x < 56; x++) {
      const dx = (x - 28) / 26, dy = (y - 12) / 10;
      const d = dx * dx + dy * dy;
      if (d < 1 && bayer(x, y) < 0.75 - d * 0.4) { ctx.fillStyle = 'rgba(10,20,14,0.30)'; ctx.fillRect(x, y, 1, 1); }
    }
    return c;
  });
}

// ---------- Büsche, Steine, Pflanzen ----------
export function bush(variant = 0, flowers = false) {
  return cached('bush' + variant + flowers, () => {
    const W = 24, H = 18, g = new PixelGrid(W, H);
    const r = mulberry32(300 + variant);
    const blobs = [[12, 11, 10, 6.5], [7, 10, 5, 4.5], [17, 10, 5, 4.5], [12, 7, 6, 4.5]];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let ins = null;
      for (const b of blobs) { const dx = (x + .5 - b[0]) / b[2], dy = (y + .5 - b[1]) / b[3]; if (dx * dx + dy * dy <= 1) { ins = b; } }
      if (!ins) continue;
      let l = 0.7 - ((y - 4) / 14) * 0.6 - ((x - 12) / 24) * 0.25 + (valueNoise(x * 0.5, y * 0.5, variant + 3) - 0.5) * 0.4;
      g.set(x, y, q(PAL.leaf.slice(1, 8), l, x, y));
    }
    if (flowers) {
      const fc = [PAL.flowers[1], PAL.flowers[4], PAL.flowers[0], PAL.flowers[6]][variant % 4];
      for (let i = 0; i < 7; i++) { const x = 4 + Math.floor(r() * 16), y = 4 + Math.floor(r() * 9); if (g.get(x, y)) { g.set(x, y, fc); g.set(x + 1, y, shade(fc, -0.25)); } }
    }
    g.outline(0.55);
    return g.toCanvas();
  });
}

export function rock(variant = 0, big = false) {
  return cached('rock' + variant + big, () => {
    const W = big ? 28 : 16, H = big ? 20 : 12, g = new PixelGrid(W, H);
    const cx = W / 2, cy = H * 0.58;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x + .5 - cx) / (W * 0.46), dy = (y + .5 - cy) / (H * 0.44);
      const n = (valueNoise(x * 0.4, y * 0.4, variant + 11) - 0.5) * 0.35;
      if (dx * dx + dy * dy > 1 + n) continue;
      let l = 0.72 - dx * 0.25 - dy * 0.42 + n * 0.6;
      g.set(x, y, q(PAL.stone.slice(1, 7), l, x, y));
      if (dy < -0.35 && valueNoise(x * 0.6, y, variant) > 0.55) g.set(x, y, q(PAL.moss, 0.5 + n, x, y));
    }
    if (big) { for (let i = 0; i < 5; i++) g.setIf(8 + i, 9 + (i & 1), PAL.stone[1]); }
    g.outline(0.5);
    return g.toCanvas();
  });
}

export function grassTuft(variant = 0, frame = 0) {
  return cached('tuft' + variant + '_' + frame, () => {
    const g = new PixelGrid(10, 9);
    const sw = frame === 1 ? 1 : 0;
    const cols = [PAL.grass[4], PAL.grass[5], PAL.grass[6], PAL.grass[7]];
    const blades = variant % 2 ? [[2, 6], [4, 8], [6, 7], [8, 5]] : [[1, 5], [3, 7], [5, 8], [7, 6]];
    blades.forEach(([x, h], i) => {
      for (let y = 0; y < h; y++) {
        const off = y > h * 0.6 ? sw : 0;
        g.set(x + off + (y > h - 2 && i % 2 ? 1 : 0), 8 - y, cols[Math.min(3, Math.floor((y / h) * 4))]);
      }
    });
    return g.toCanvas();
  });
}

export function flower(variant = 0, frame = 0) {
  return cached('flower' + variant + '_' + frame, () => {
    const g = new PixelGrid(7, 9);
    const fc = PAL.flowers[variant % PAL.flowers.length];
    const sw = frame;
    g.set(3, 8, PAL.grass[4]); g.set(3, 7, PAL.grass[5]); g.set(3 + sw, 6, PAL.grass[5]); g.set(2, 7, PAL.grass[6]);
    const hx = 3 + sw, hy = 4;
    g.set(hx, hy, '#f6dc8c'); g.set(hx - 1, hy, fc); g.set(hx + 1, hy, fc); g.set(hx, hy - 1, fc); g.set(hx, hy + 1, shade(fc, -0.25));
    return g.toCanvas();
  });
}

export function fern(variant = 0, glow = false) {
  return cached('fern' + variant + glow, () => {
    const g = new PixelGrid(18, 14);
    const base = glow ? ['#2d5a52', '#4a8f86', '#7cc4bf', '#c6f0ea'] : [PAL.leaf[2], PAL.leaf[3], PAL.leaf[4], PAL.leaf[5]];
    const fronds = [[-1, -1], [1, -1], [-1, -0.4], [1, -0.4], [0, -1.2]];
    fronds.forEach(([dx, dy], i) => {
      for (let t = 0; t < 8; t++) {
        const x = 9 + dx * t * 0.95, y = 13 + dy * t * 1.1 + (t * t) * 0.07 * Math.abs(dx);
        g.set(x, y, base[Math.min(3, 1 + Math.floor(t / 3))]);
        if (t > 1 && t < 7) { g.set(x + (dx >= 0 ? 1 : -1) * 0, y - 1, base[2]); g.set(x - dx, y - 1, base[1]); }
      }
    });
    if (glow) { g.set(9, 4, '#ffffff'); g.set(6, 6, '#e8fffb'); g.set(12, 6, '#e8fffb'); }
    g.outline(0.55);
    return g.toCanvas();
  });
}

export function mushroom(variant = 0) {
  return cached('mush' + variant, () => {
    const g = new PixelGrid(10, 9);
    const cap = variant % 2 ? '#b8414f' : '#c49af5';
    g.rect(3, 5, 2, 3, '#efe3c8'); g.ellipse(4, 4, 3.5, 2.2, cap); g.set(3, 3, '#ffffff'); g.set(5, 4, shade(cap, -0.3));
    g.rect(7, 6, 1, 2, '#efe3c8'); g.ellipse(7.5, 5.5, 2, 1.3, cap);
    g.outline(0.5);
    return g.toCanvas();
  });
}

export function branchPickup() {
  return cached('branch', () => {
    const g = new PixelGrid(16, 8);
    for (let x = 1; x < 15; x++) g.set(x, 5 - Math.round(x * 0.18), x % 4 === 0 ? PAL.wood[4] : PAL.wood[3]);
    g.set(5, 3, PAL.wood[3]); g.set(6, 2, PAL.wood[4]); g.set(10, 3, PAL.wood[3]); g.set(11, 2, PAL.leaf[4]); g.set(12, 2, PAL.leaf[5]);
    g.outline(0.6);
    return g.toCanvas();
  });
}

// ---------- Ruinen ----------
function stoneBlockTexture(g, x0, y0, w, h, seed, mossTop = true) {
  // Mauerwerk mit Fugen, Licht von oben links, Moos
  for (let y = 0; y < h; y++) {
    const row = Math.floor(y / 6);
    for (let x = 0; x < w; x++) {
      const off = (row % 2) * 5;
      const bx = Math.floor((x + off) / 10);
      const lx = (x + off) % 10, ly = y % 6;
      const n = valueNoise((x0 + x) * 0.3, (y0 + y) * 0.3, seed) - 0.5;
      let l = 0.62 + n * 0.35 - (y / h) * 0.15 + ((bx * 7 + row * 3) % 5) * 0.03;
      if (lx === 0 || ly === 0) l = 0.18;
      else if (ly === 1 || lx === 1) l += 0.12;
      else if (ly === 5 || lx === 9) l -= 0.1;
      let col = q(PAL.stone.slice(1), l, x0 + x, y0 + y);
      if (mossTop && (y < 3 + n * 6 || (n > 0.28 && valueNoise(x * 0.2, y * 0.2, seed + 5) > 0.6))) col = q(PAL.moss, 0.5 + n, x, y);
      g.set(x0 + x, y0 + y, col);
    }
  }
}

export function ruinWall(variant = 0, w = 32, h = 28) {
  return cached('wall' + variant + w + 'x' + h, () => {
    const g = new PixelGrid(w, h + 4);
    stoneBlockTexture(g, 0, 4, w, h, 50 + variant);
    // zerbrochene Oberkante
    const r = mulberry32(variant + 9);
    for (let x = 0; x < w; x++) {
      const cut = Math.floor(r() * 3 + (Math.sin(x * 0.5 + variant) + 1) * 2);
      for (let y = 4; y < 4 + cut; y++) g.px[y * w + x] = null;
    }
    // Efeu
    for (let i = 0; i < w / 4; i++) {
      const x = Math.floor(r() * w); let y = 6 + Math.floor(r() * 4);
      const len = 4 + Math.floor(r() * (h - 8));
      for (let k = 0; k < len; k++) { if (g.get(x + ((k >> 2) & 1), y + k)) g.set(x + ((k >> 2) & 1), y + k, k % 3 ? PAL.leaf[4] : PAL.leaf[5]); }
    }
    g.outline(0.55);
    return g.toCanvas();
  });
}

export function pillar(broken = 0) {
  return cached('pillar' + broken, () => {
    const W = 18, H = broken ? 30 : 46, g = new PixelGrid(W, H);
    // Sockel
    g.rect(1, H - 6, 16, 6, PAL.stone[3]); g.rect(1, H - 6, 16, 1, PAL.stone[5]); g.rect(13, H - 5, 4, 5, PAL.stone[2]);
    for (let y = 5; y < H - 6; y++) for (let x = 3; x < 15; x++) {
      const l = 0.75 - (x - 3) / 12 * 0.55 + (valueNoise(x * 0.5, y * 0.3, 7 + broken) - 0.5) * 0.3 + ((x - 3) % 4 === 0 ? -0.15 : 0);
      g.set(x, y, q(PAL.stone.slice(1), l, x, y));
    }
    if (!broken) { g.rect(1, 2, 16, 4, PAL.stone[4]); g.rect(1, 2, 16, 1, PAL.stone[6]); g.rect(13, 3, 4, 3, PAL.stone[2]); }
    else { for (let x = 3; x < 15; x++) { const c = Math.floor(Math.abs(Math.sin(x * 1.7)) * 5); for (let y = 5; y < 5 + c; y++) g.px[y * W + x] = null; } }
    for (let y = 8; y < H - 8; y += 3) g.setIf(4 + (y % 2), y, PAL.leaf[4]);
    g.outline(0.55);
    return g.toCanvas();
  });
}

// Das große Mondtor mit Stufen (Fokuspunkt wie im Referenzbild)
export function moonGate(active = 0) {
  return cached('gate' + active, () => {
    const W = 112, H = 104, g = new PixelGrid(W, H);
    // Seitentürme
    stoneBlockTexture(g, 4, 24, 26, 64, 71);
    stoneBlockTexture(g, 82, 24, 26, 64, 72);
    // Bogen
    for (let y = 8; y < 88; y++) for (let x = 24; x < 88; x++) {
      const dx = (x + 0.5 - 56) / 32, dy = (y + 0.5 - 46) / 38;
      const outer = dx * dx + dy * dy <= 1 || y >= 46;
      const idx = (x + 0.5 - 56) / 21, idy = (y + 0.5 - 52) / 32;
      const inner = idx * idx + idy * idy <= 1 || (y >= 52 && Math.abs(x + 0.5 - 56) <= 21);
      if (outer && !inner) {
        const n = valueNoise(x * 0.3, y * 0.3, 80) - 0.5;
        const ang = Math.atan2(y - 46, x - 56);
        const seg = Math.floor((ang + Math.PI) / (Math.PI / 9));
        const edge = Math.abs(((ang + Math.PI) / (Math.PI / 9)) - seg - 0.5) > 0.45 && y < 50;
        let l = 0.62 + n * 0.3 - ((x - 24) / 64) * 0.2;
        if (edge) l = 0.2;
        let col = q(PAL.stone.slice(1), l, x, y);
        if (y < 18 + n * 10) col = q(PAL.moss, 0.5 + n, x, y);
        g.set(x, y, col);
      }
    }
    // Portal-Inneres
    for (let y = 22; y < 88; y++) for (let x = 35; x < 77; x++) {
      const idx = (x + 0.5 - 56) / 21, idy = (y + 0.5 - 52) / 32;
      if (!(idx * idx + idy * idy <= 1 || (y >= 52 && Math.abs(x + 0.5 - 56) <= 21))) continue;
      const d = Math.hypot((x - 56) / 21, (y - 56) / 34);
      let l = active ? 0.95 - d * 0.75 + (valueNoise(x * 0.25, y * 0.25, 90) - 0.5) * 0.4 : 0.35 - d * 0.3 + (valueNoise(x * 0.25, y * 0.25, 90) - 0.5) * 0.2;
      g.set(x, y, q(PAL.violet, l, x, y));
    }
    // Rune im Portal (Mondsichel + Stern)
    const rc = active ? '#ffffff' : '#c49af5';
    for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 1.4 + 0.8; g.set(56 + Math.cos(t) * 8, 50 + Math.sin(t) * 8, rc); }
    for (let i = -6; i <= 6; i++) { g.set(56 + i, 50, rc); g.set(56, 50 + i, rc); }
    g.set(55, 49, rc); g.set(57, 51, rc); g.set(57, 49, rc); g.set(55, 51, rc);
    // Schlussstein
    g.rect(51, 5, 10, 9, PAL.stone[4]); g.rect(51, 5, 10, 1, PAL.stone[6]); g.rect(54, 8, 4, 3, active ? PAL.violet[5] : PAL.violet[3]);
    // Stufen
    for (let s = 0; s < 4; s++) {
      const y = 88 + s * 4, inset = 18 - s * 4;
      for (let x = 20 + inset - 6; x < 92 - inset + 6; x++) for (let yy = 0; yy < 4; yy++) {
        const l = yy === 0 ? 0.85 : yy === 3 ? 0.25 : 0.55 + (valueNoise(x * 0.4, (y + yy) * 0.4, 95) - 0.5) * 0.3;
        g.set(x, y + yy, q(PAL.stone.slice(1), l, x, y + yy));
      }
    }
    // Efeu an den Türmen
    const r = mulberry32(55);
    for (let i = 0; i < 14; i++) { const x = r() < 0.5 ? 5 + Math.floor(r() * 24) : 83 + Math.floor(r() * 24); const len = 6 + Math.floor(r() * 30); for (let k = 0; k < len; k++) g.setIf(x + ((k >> 2) & 1), 26 + k, k % 3 ? PAL.leaf[4] : PAL.leaf[5]); }
    g.outline(0.5);
    return g.toCanvas();
  });
}

export function crystal(variant = 0, size = 1) {
  return cached('crystal' + variant + size, () => {
    const W = 22 * size, H = 30 * size, g = new PixelGrid(W, H);
    const r = mulberry32(700 + variant);
    const shards = [[W / 2, H - 2, 4 * size, 22 * size], [W / 2 - 5 * size, H - 2, 3 * size, 13 * size], [W / 2 + 5 * size, H - 2, 3 * size, 16 * size]];
    if (variant % 2) shards.push([W / 2 + 8 * size, H - 2, 2 * size, 8 * size]);
    shards.forEach(([bx, by, hw, hh], si) => {
      const lean = (r() - 0.5) * 0.4;
      for (let y = 0; y < hh; y++) {
        const t = y / hh; const w = hw * (t < 0.2 ? t / 0.2 : 1);
        const cxx = bx + lean * (hh - y);
        for (let x = Math.floor(cxx - w); x <= Math.ceil(cxx + w); x++) {
          const side = (x - cxx) / (w + 0.01);
          let l = side < 0 ? 0.85 - t * 0.15 : 0.45 - t * 0.1;
          if (Math.abs(side) < 0.2) l = 0.98;
          g.set(x, by - hh + y, q(PAL.violet.slice(2), l, x, y));
        }
      }
    });
    g.outline(0.5, '#1e0f33');
    return g.toCanvas();
  });
}

// ---------- Lager ----------
export function tent() {
  return cached('tent', () => {
    const W = 48, H = 40, g = new PixelGrid(W, H);
    const cl = PAL.cloth;
    for (let y = 4; y < 38; y++) {
      const t = (y - 4) / 34, hw = 4 + t * 20;
      for (let x = Math.floor(24 - hw); x <= Math.ceil(24 + hw); x++) {
        const side = (x - 24) / hw;
        let l = side < 0 ? 0.75 - t * 0.2 : 0.42 - t * 0.15;
        l += (valueNoise(x * 0.5, y * 0.5, 4) - 0.5) * 0.2;
        if ((y % 9) === 0) l -= 0.12;
        g.set(x, y, q(cl.slice(1, 6), l, x, y));
      }
    }
    // Eingang
    for (let y = 18; y < 38; y++) { const hw = (y - 18) * 0.35; for (let x = Math.floor(26 - hw); x <= 26 + hw; x++) g.set(x, y, y < 22 ? cl[1] : '#1a1214'); }
    g.rect(24, 16, 3, 3, cl[1]);
    // Stangen + Seile
    g.rect(23, 0, 2, 6, PAL.wood[3]); g.set(23, 0, PAL.wood[5]);
    for (let i = 0; i < 8; i++) { g.set(4 - i * 0.4, 36 + i * 0.2, '#b39a72'); }
    g.rect(1, 36, 2, 3, PAL.wood[3]); g.rect(45, 36, 2, 3, PAL.wood[3]);
    g.outline(0.6);
    return g.toCanvas();
  });
}

export function campfire(frame = 0) {
  return cached('fire' + frame, () => {
    const W = 24, H = 28, g = new PixelGrid(W, H);
    // Steinring
    for (let a = 0; a < 12; a++) { const t = a / 12 * Math.PI * 2; const x = 12 + Math.cos(t) * 9, y = 22 + Math.sin(t) * 4; g.ellipse(x, y, 2.2, 1.8, a < 6 ? PAL.stone[2] : PAL.stone[4]); g.set(x - 1, y - 1, PAL.stone[5]); }
    // Holzscheite
    for (let i = 0; i < 9; i++) { g.set(7 + i, 22 - i * 0.3, PAL.wood[2]); g.set(7 + i, 23 - i * 0.3, PAL.wood[1]); g.set(16 - i, 22 - i * 0.3, PAL.wood[3]); g.set(16 - i, 23 - i * 0.3, PAL.wood[2]); }
    // Flammen
    const r = mulberry32(frame * 13 + 3);
    for (let y = 4; y < 22; y++) {
      const t = (y - 4) / 18;
      const hw = 5 * Math.sin(t * Math.PI * 0.95) * (0.8 + r() * 0.3) + 0.5;
      const cx = 12 + Math.sin(y * 0.6 + frame * 1.7) * (1 - t) * 1.6;
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
        const d = Math.abs(x - cx) / (hw + 0.01);
        const l = 1 - d * 0.6 - (1 - t) * 0.45 + r() * 0.1;
        g.set(x, y, q(PAL.fire.slice(1), l, x, y));
      }
    }
    g.set(12, 2 + (frame % 2), PAL.fire[4]); g.set(10 + frame % 3, 1, PAL.fire[3]);
    return g.toCanvas();
  });
}

export function crate(variant = 0) {
  return cached('crate' + variant, () => {
    const g = new PixelGrid(16, 16);
    for (let y = 2; y < 16; y++) for (let x = 0; x < 16; x++) {
      const top = y < 6;
      let l = top ? 0.8 : 0.5 - x / 40;
      if (!top && (x === 0 || x === 15 || y === 15 || x === 7 || x === 8)) l -= 0.25;
      if (top && (y === 2 || y === 5)) l -= 0.2;
      l += (valueNoise(x * 0.8, y * 0.3, variant + 20) - 0.5) * 0.15;
      g.set(x, y, q(PAL.wood.slice(1), l, x, y));
    }
    for (let i = 0; i < 9; i++) g.set(1 + i * 1.5, 14 - i, PAL.wood[2]);
    g.outline(0.6);
    return g.toCanvas();
  });
}

export function barrel() {
  return cached('barrel', () => {
    const g = new PixelGrid(14, 18);
    for (let y = 2; y < 18; y++) for (let x = 0; x < 14; x++) {
      const bulge = 6 + Math.sin((y - 2) / 15 * Math.PI) * 1;
      if (Math.abs(x + 0.5 - 7) > bulge) continue;
      let l = 0.7 - (x / 14) * 0.5;
      if (y === 5 || y === 14) { g.set(x, y, q(PAL.stone.slice(1, 5), l, x, y)); continue; }
      g.set(x, y, q(PAL.wood.slice(1), l + ((x % 3) === 0 ? -0.1 : 0), x, y));
    }
    g.ellipse(7, 3, 5.5, 1.6, PAL.wood[4]); g.ellipse(7, 3, 3.5, 0.8, PAL.wood[3]);
    g.outline(0.6);
    return g.toCanvas();
  });
}

export function logSeat() {
  return cached('logseat', () => {
    const g = new PixelGrid(28, 12);
    for (let y = 3; y < 11; y++) for (let x = 2; x < 26; x++) {
      const l = 0.75 - (y - 3) / 8 * 0.55 + (valueNoise(x * 0.3, y, 61) - 0.5) * 0.2;
      g.set(x, y, q(PAL.wood.slice(1), l, x, y));
    }
    g.ellipse(25, 7, 2.2, 4, PAL.wood[5]); g.ellipse(25, 7, 1, 2, PAL.wood[3]);
    g.outline(0.6);
    return g.toCanvas();
  });
}

export function torch(frame = 0, lit = true) {
  return cached('torch' + frame + lit, () => {
    const g = new PixelGrid(12, 36);
    g.rect(5, 12, 2, 24, PAL.wood[2]); g.rect(5, 12, 1, 24, PAL.wood[3]);
    g.rect(3, 9, 6, 4, PAL.stone[3]); g.rect(3, 9, 6, 1, PAL.stone[5]); g.rect(4, 31, 4, 5, PAL.stone[2]);
    if (lit) {
      const r = mulberry32(frame * 7 + 1);
      for (let y = 0; y < 10; y++) { const t = y / 10; const hw = 2.6 * Math.sin(t * Math.PI * 0.9) + 0.4; const cx = 6 + Math.sin(y + frame * 2) * (1 - t); for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) g.set(x, y, q(PAL.fire.slice(2), 1 - Math.abs(x - cx) / (hw + .1) * 0.6 - (1 - t) * 0.4 + r() * .1, x, y)); }
    }
    g.outline(0.6);
    return g.toCanvas();
  });
}

export function banner(variant = 0, frame = 0) {
  return cached('banner' + variant + frame, () => {
    const W = 20, H = 52, g = new PixelGrid(W, H);
    g.rect(9, 0, 2, H, PAL.wood[2]); g.rect(9, 0, 1, H, PAL.wood[4]);
    g.rect(2, 3, 16, 2, PAL.gold[3]); g.set(2, 3, PAL.gold[5]);
    const B = PAL.banner;
    for (let y = 5; y < 36; y++) {
      const wave = Math.round(Math.sin(y * 0.25 + frame * 1.2) * 0.8);
      for (let x = 3; x < 17; x++) {
        if (y > 30 && Math.abs(x - 10) < (y - 30) * 1.3) continue;
        let l = 0.65 - (x - 3) / 14 * 0.35 + wave * 0.12;
        g.set(x + wave * (y > 20 ? 1 : 0), y, q(B.slice(1), l, x, y));
      }
    }
    // Wappen: silberner Mond über Fuchskopf (altes Zeichen der Fuchsmenschen)
    const s = '#e9e4f2', sd = '#a9a2c0';
    for (let a = 0; a < 20; a++) { const t = 0.9 + a / 20 * 4.2; g.setIf(10 + Math.cos(t) * 3.4, 13 + Math.sin(t) * 3.4, s); }
    g.setIf(7, 20, sd); g.setIf(13, 20, sd); g.setIf(8, 21, s); g.setIf(12, 21, s); g.rect(8, 22, 5, 2, s); g.setIf(9, 24, s); g.setIf(10, 25, s); g.setIf(11, 24, s); g.setIf(10, 24, sd);
    g.rect(3, 34, 14, 1, PAL.gold[3]);
    g.outline(0.6);
    return g.toCanvas();
  });
}

export function chest(open = false) {
  return cached('chest' + open, () => {
    const g = new PixelGrid(20, 18);
    const W = PAL.wood;
    if (!open) {
      for (let y = 2; y < 8; y++) for (let x = 1; x < 19; x++) g.set(x, y, q(W.slice(2), 0.85 - (y - 2) / 8 - x / 60, x, y));
    } else {
      for (let y = 0; y < 4; y++) for (let x = 1; x < 19; x++) g.set(x, y, q(W.slice(1), 0.5 - x / 60, x, y));
      g.rect(2, 5, 16, 3, '#f6dc8c'); g.set(5, 5, '#ffffff'); g.set(12, 6, '#ffffff');
    }
    for (let y = 8; y < 17; y++) for (let x = 1; x < 19; x++) g.set(x, y, q(W.slice(1), 0.6 - (y - 8) / 18 - x / 50, x, y));
    g.rect(1, 8, 18, 1, PAL.gold[2]); g.rect(4, 2, 2, 15, PAL.gold[3]); g.rect(14, 2, 2, 15, PAL.gold[3]);
    g.rect(8, 7, 4, 4, PAL.gold[4]); g.set(9, 9, PAL.outline);
    g.outline(0.6);
    return g.toCanvas();
  });
}

export function lanternPost(lit = false) {
  return cached('lantern' + lit, () => {
    const g = new PixelGrid(20, 40);
    g.rect(5, 6, 3, 34, PAL.wood[2]); g.rect(5, 6, 1, 34, PAL.wood[4]);
    g.rect(5, 6, 11, 2, PAL.wood[3]); g.rect(4, 36, 5, 4, PAL.stone[3]);
    g.rect(14, 8, 1, 3, '#2a2a30');
    // Laterne
    g.rect(12, 11, 5, 7, '#3a3240'); g.rect(11, 10, 7, 1, PAL.gold[3]); g.rect(11, 18, 7, 1, PAL.gold[3]);
    g.rect(13, 12, 3, 5, lit ? '#e8f4ff' : '#4a4a5a'); if (lit) { g.set(13, 12, '#ffffff'); g.rect(14, 13, 1, 3, '#b8dcff'); }
    g.outline(0.6);
    return g.toCanvas();
  });
}

export function signpost() {
  return cached('sign', () => {
    const g = new PixelGrid(22, 28);
    g.rect(10, 6, 2, 22, PAL.wood[2]); g.rect(10, 6, 1, 22, PAL.wood[4]);
    for (let y = 6; y < 11; y++) for (let x = 2; x < 20; x++) if (!(x === 19 && (y === 6 || y === 10))) g.set(x, y, q(PAL.wood.slice(2), 0.7 - (y - 6) / 10, x, y));
    for (let y = 13; y < 17; y++) for (let x = 3; x < 18; x++) if (!(x === 3 && (y === 13 || y === 16))) g.set(x, y, q(PAL.wood.slice(2), 0.6 - (y - 13) / 10, x, y));
    g.rect(5, 8, 10, 1, PAL.wood[1]); g.rect(7, 14, 8, 1, PAL.wood[1]);
    g.outline(0.6);
    return g.toCanvas();
  });
}

export function foxShrine(active = false) {
  return cached('shrine' + active, () => {
    const g = new PixelGrid(22, 30);
    stoneBlockTexture(g, 3, 20, 16, 10, 33, false);
    // sitzende Fuchsstatue
    const s = PAL.stone;
    g.ellipse(11, 15, 5, 5, s[4]); g.ellipse(9, 14, 2, 3, s[5]);
    g.ellipse(11, 7, 3.6, 3.2, s[4]); g.set(8, 3, s[4]); g.set(8, 2, s[5]); g.set(9, 4, s[4]); g.set(14, 3, s[3]); g.set(14, 2, s[4]); g.set(13, 4, s[3]);
    g.set(11, 10, s[2]); g.set(10, 8, active ? '#9de8ff' : s[1]); g.set(12, 8, active ? '#9de8ff' : s[1]);
    g.ellipse(16, 17, 2.4, 3.6, s[3]); g.ellipse(16.5, 14, 1.4, 1.4, s[5]);
    for (let i = 0; i < 6; i++) g.setIf(6 + i * 2, 12 + (i % 2) * 6, PAL.moss[1]);
    g.outline(0.55);
    return g.toCanvas();
  });
}

export function altar(hasShard = true) {
  return cached('altar' + hasShard, () => {
    const g = new PixelGrid(24, 26);
    stoneBlockTexture(g, 4, 12, 16, 12, 44, false);
    g.rect(2, 10, 20, 3, PAL.stone[5]); g.rect(2, 10, 20, 1, PAL.stone[6]); g.rect(2, 23, 20, 3, PAL.stone[3]);
    if (hasShard) { for (let y = 0; y < 9; y++) { const w = y < 3 ? y : y > 6 ? 8 - y : 2; for (let x = -w; x <= w; x++) g.set(12 + x, 1 + y, x < 0 ? PAL.violet[5] : PAL.violet[4]); } g.set(11, 3, '#ffffff'); }
    g.outline(0.55);
    return g.toCanvas();
  });
}

export function stump() {
  return cached('stump', () => {
    const g = new PixelGrid(16, 12);
    for (let y = 4; y < 12; y++) for (let x = 2; x < 14; x++) g.set(x, y, q(PAL.bark, 0.75 - (x - 2) / 14, x, y));
    g.ellipse(8, 4, 6, 2.4, PAL.wood[5]); g.ellipse(8, 4, 3.5, 1.2, PAL.wood[4]); g.set(8, 4, PAL.wood[3]);
    g.rect(0, 10, 3, 2, PAL.bark[2]); g.rect(13, 10, 3, 2, PAL.bark[1]);
    g.outline(0.6);
    return g.toCanvas();
  });
}

export function cauldron(frame = 0) {
  return cached('cauldron' + frame, () => {
    const g = new PixelGrid(18, 18);
    g.ellipse(9, 12, 7, 5, '#2e2a36'); g.ellipse(7, 11, 3, 2, '#4a4558');
    g.ellipse(9, 8, 6.5, 1.8, '#3d3a44'); g.ellipse(9, 8, 5.4, 1.2, frame % 2 ? '#6fc2a0' : '#58b090');
    g.set(7 + frame % 3, 7, '#c8f5e0'); g.rect(3, 16, 2, 2, '#2e2a36'); g.rect(13, 16, 2, 2, '#2e2a36');
    g.outline(0.6);
    return g.toCanvas();
  });
}

export function herbRack() {
  return cached('herbrack', () => {
    const g = new PixelGrid(26, 26);
    g.rect(2, 4, 2, 22, PAL.wood[2]); g.rect(22, 4, 2, 22, PAL.wood[2]); g.rect(1, 4, 24, 2, PAL.wood[4]);
    const herbs = [PAL.leaf[4], '#7cc4bf', PAL.flowers[1], PAL.leaf[5], PAL.flowers[6]];
    for (let i = 0; i < 5; i++) { const x = 5 + i * 4; g.rect(x, 6, 1, 2, '#b39a72'); g.rect(x - 1, 8, 3, 6, herbs[i]); g.set(x, 14, shade(herbs[i], -0.3)); }
    g.outline(0.6);
    return g.toCanvas();
  });
}

export function clearPropCache() { cache.clear(); }
