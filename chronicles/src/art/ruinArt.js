// Verborgene Ruinen und Grüfte unter den Teleportzirkeln.
import { PixelGrid, mulberry32, bayer, shade, valueNoise } from '../engine/PixelUtil.js';
import { PAL } from './palette.js';

const cache = new Map();
const cached = (k, fn) => { if (!cache.has(k)) cache.set(k, fn()); return cache.get(k); };
function q(pal, t, x, y) { const n = pal.length, v = Math.max(0, Math.min(0.999, t)) * (n - 1), i = Math.floor(v); return pal[Math.min(n - 1, i + ((v - i) > bayer(x, y) ? 1 : 0))]; }

export const STONE = ['#1d1a22', '#2a2630', '#35303c', '#403a48', '#4b4554', '#58515f', '#6a6372'];
export const BRICK = ['#2b2633', '#3d3746', '#4c4556', '#5c5468', '#6b6378', '#7d7589'];
const MOSS = ['#2c4a2a', '#3c5a2e', '#4f7438'];

// Treppe in der Oberwelt: eingefasste Öffnung mit Stufen, die ins Dunkel führen
export function ruinStairs() {
  return cached('rstairs', () => {
    const G = new PixelGrid(44, 34);
    // Einfassung
    for (let y = 2; y < 34; y++) for (let x = 0; x < 44; x++) {
      if (x > 5 && x < 38 && y > 6 && y < 32) continue;
      G.set(x, y, q(STONE.slice(3), 0.7 - y / 60 + (valueNoise(x * 0.4, y * 0.4, 31) - 0.5) * 0.5, x, y));
    }
    // Stufen nach unten (oben hell, unten dunkel)
    for (let s = 0; s < 6; s++) {
      const y0 = 7 + s * 4, l = 0.85 - s * 0.16;
      for (let y = y0; y < y0 + 4; y++) for (let x = 6; x < 38; x++) {
        const edge = y === y0;
        G.set(x, y, edge ? q(STONE, l + 0.18, x, y) : q(STONE, l - (y - y0) * 0.06, x, y));
      }
    }
    for (let y = 27; y < 32; y++) for (let x = 6; x < 38; x++) G.set(x, y, '#08060a');
    // Moos und Risse
    const r = mulberry32(5);
    for (let i = 0; i < 26; i++) { const x = r() * 44 | 0, y = 2 + (r() * 6 | 0); G.setIf(x, y, MOSS[r() * 3 | 0]); }
    for (let i = 0; i < 10; i++) { const x = r() < 0.5 ? 1 + (r() * 4 | 0) : 39 + (r() * 4 | 0), y = 6 + (r() * 24 | 0); G.setIf(x, y, MOSS[r() * 3 | 0]); }
    G.outline(0.5); return G.toCanvas();
  });
}

// Urne (zerschlagbar)
export function urn(v = 0) {
  return cached('urn' + v, () => {
    const G = new PixelGrid(14, 18);
    const C = v % 2 ? ['#5a3a2a', '#7a4d32', '#966238', '#b37c48'] : ['#3d3746', '#5c5468', '#7d7589', '#9a92a6'];
    for (let y = 3; y < 18; y++) { const t = (y - 3) / 15, hw = 3 + Math.sin(t * Math.PI) * 3.4; for (let x = Math.round(7 - hw); x < Math.round(7 + hw); x++) G.set(x, y, q(C, 0.85 - (x - 7 + hw) / (hw * 2) * 0.7, x, y)); }
    G.rect(4, 1, 6, 2, C[2]); G.rect(5, 0, 4, 1, C[3]); G.rect(3, 9, 8, 1, shade(C[1], -0.2));
    G.outline(0.55); return G.toCanvas();
  });
}

// Feuerschale
export function brazier(f = 0) {
  return cached('braz' + f, () => {
    const G = new PixelGrid(18, 30);
    G.rect(8, 14, 2, 14, '#3d3746'); G.rect(5, 27, 8, 3, '#4c4556'); G.rect(5, 27, 8, 1, '#6b6378');
    for (let y = 10; y < 15; y++) { const hw = 7 - (y - 10); G.rect(9 - hw, y, hw * 2, 1, y === 10 ? '#7d7589' : '#4c4556'); }
    const r = mulberry32(f * 13 + 3);
    for (let y = 0; y < 10; y++) { const t = y / 10, hw = 4 * Math.sin(t * Math.PI * 0.9) + 0.6, cx = 9 + Math.sin(y * 0.9 + f * 2) * (1 - t) * 1.4; for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) G.set(x, y, q(['#a8452c', '#e07a2a', '#f6b04a', '#ffe9a0'], 1 - Math.abs(x - cx) / (hw + .1) * 0.6 - (1 - t) * 0.45 + r() * .1, x, y)); }
    G.outline(0.6); return G.toCanvas();
  });
}

// Wandleuchter (an Nordwänden)
export function sconce(f = 0) {
  return cached('sconce' + f, () => {
    const G = new PixelGrid(10, 18);
    G.rect(3, 10, 4, 3, '#4c4556'); G.rect(4, 13, 2, 4, '#3d3746');
    const r = mulberry32(f * 7 + 1);
    for (let y = 1; y < 10; y++) { const t = y / 10, hw = 2.4 * Math.sin(t * Math.PI * 0.9) + 0.4, cx = 5 + Math.sin(y + f * 2) * (1 - t); for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) G.set(x, y, q(['#a8452c', '#e07a2a', '#f6b04a', '#ffe9a0'], 1 - Math.abs(x - cx) / (hw + .1) * 0.6 - (1 - t) * 0.4 + r() * .1, x, y)); }
    G.outline(0.6); return G.toCanvas();
  });
}

// Geröllhaufen
export function rubble(v = 0) {
  return cached('rub' + v, () => {
    const G = new PixelGrid(26, 14), r = mulberry32(v * 17 + 4);
    for (let i = 0; i < 9; i++) { const cx = 4 + r() * 18, cy = 6 + r() * 6, rx = 2 + r() * 3.5, ry = 1.5 + r() * 2; for (let y = -3; y < 4; y++) for (let x = -5; x < 6; x++) if ((x / rx) ** 2 + (y / ry) ** 2 < 1) G.set(cx + x, cy + y, q(STONE.slice(2), 0.75 - y / 6 - x / 14, cx + x, cy + y)); }
    G.outline(0.55); return G.toCanvas();
  });
}

// Knochen / Schädel als flache Deko
export function bones(v = 0) {
  return cached('bones' + v, () => {
    const G = new PixelGrid(16, 10), c = '#d8d0c0', d = '#9a9284';
    if (v % 2) { G.rect(4, 2, 6, 5, c); G.rect(5, 7, 4, 2, d); G.set(5, 4, '#1a1020'); G.set(8, 4, '#1a1020'); G.rect(11, 6, 4, 1, c); }
    else { for (let i = 0; i < 10; i++) G.set(2 + i, 3 + (i >> 2), i % 4 ? c : d); for (let i = 0; i < 8; i++) G.set(5 + i, 8 - (i >> 2), c); G.set(2, 2, c); G.set(12, 5, c); }
    G.outline(0.5); return G.toCanvas();
  });
}
export function clearRuinCache() { cache.clear(); }
