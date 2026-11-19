// 16×16-Symbole für Zauber: Grundform je Schule, Rang an der Umrandung erkennbar.
import { PixelGrid } from '../engine/PixelUtil.js';
import { SPELLS, SCHOOLS } from '../data/magic.js';

const cache = new Map();

function glyph(G, school, c, v) {
  const [d, m, l, w] = c;
  const disc = (cx, cy, r, col) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 0.5) G.set(cx + x, cy + y, col); };
  switch (school) {
    case 'feuer':
      for (let y = 2; y < 15; y++) { const t = (y - 2) / 13, hw = Math.sin(t * Math.PI * 0.85) * 5 + 0.5; for (let x = Math.round(8 - hw); x <= Math.round(8 + hw); x++) G.set(x, y, t < 0.35 ? l : Math.abs(x - 8) < hw * 0.45 ? w : m); }
      for (let x = 5; x < 12; x++) G.set(x, 14, d); break;
    case 'wasser': case 'entgiftung':
      for (let y = 2; y < 15; y++) { const t = (y - 2) / 13, hw = t < 0.5 ? t * 9 : Math.sqrt(Math.max(0, 1 - ((t - 0.68) / 0.33) ** 2)) * 5; for (let x = Math.round(8 - hw); x <= Math.round(8 + hw); x++) G.set(x, y, x < 7 && y > 7 && y < 12 ? w : y > 11 ? m : l); }
      if (school === 'entgiftung') { G.rect(7, 7, 3, 1, d); G.rect(8, 6, 1, 3, d); } break;
    case 'wind':
      for (let a = 0; a < 40; a++) { const t = a / 40 * 5.5, r = 1 + t * 1.1; G.set(8 + Math.cos(t) * r, 8 + Math.sin(t) * r * 0.8, a > 30 ? w : l); G.set(8 + Math.cos(t) * r + 1, 8 + Math.sin(t) * r * 0.8, m); } break;
    case 'erde':
      for (let y = 4; y < 14; y++) for (let x = 3; x < 13; x++) { if ((x - 8) ** 2 / 25 + (y - 9) ** 2 / 20 > 1) continue; G.set(x, y, x + y < 14 ? l : x - y > 2 ? d : m); }
      G.set(6, 7, w); G.set(9, 10, d); G.set(10, 9, d); break;
    case 'heilung':
      G.rect(6, 2, 4, 12, m); G.rect(2, 6, 12, 4, m); G.rect(7, 3, 2, 10, l); G.rect(3, 7, 10, 2, l); G.set(7, 7, w); G.set(8, 7, w); break;
    case 'barriere':
      for (let y = 2; y < 15; y++) { const hw = y < 9 ? 5 : 5 - (y - 9) * 0.9; for (let x = Math.round(8 - hw); x <= Math.round(8 + hw); x++) G.set(x, y, Math.abs(x - 8) > hw - 1.2 || y === 2 ? l : x < 8 ? m : d); }
      G.rect(8, 4, 1, 8, w); break;
    case 'beschwoerung':
      disc(8, 8, 6, d); disc(8, 8, 5, m);
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI * 2 / 5, b = -Math.PI / 2 + (i + 1) * 2 * Math.PI * 2 / 5; for (let k = 0; k <= 8; k++) G.set(8 + Math.cos(a) * 5 * (1 - k / 8) + Math.cos(b) * 5 * k / 8, 8 + Math.sin(a) * 5 * (1 - k / 8) + Math.sin(b) * 5 * k / 8, w); } break;
    case 'mond':
      disc(8, 8, 6, l); disc(10, 6, 5, null); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x - 10) ** 2 + (y - 6) ** 2 < 25) G.px[y * 16 + x] = null;
      if (v) { G.set(12, 11, w); G.set(13, 12, w); G.set(11, 12, w); } break;
    case 'sonder':
      for (let x = 2; x < 14; x++) { const hh = Math.round(Math.sin((x - 2) / 12 * Math.PI) * 4); for (let y = 8 - hh; y <= 8 + hh; y++) G.set(x, y, y === 8 - hh || y === 8 + hh ? l : m); }
      disc(8, 8, 2, w); G.set(8, 8, d); break;
    default:
      disc(8, 8, 6, m); disc(8, 8, 4, d); disc(8, 8, 2, l);
  }
}

export function spellIcon(id, scale = 1) {
  const key = id + scale;
  if (cache.has(key)) return cache.get(key);
  const sp = SPELLS[id], sc = SCHOOLS[sp ? sp.school : id] || SCHOOLS.teleport;
  const G = new PixelGrid(16, 16);
  if (id === 'mondlicht') { const [d, m, l, w] = sc.color; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const r = Math.hypot(x - 7.5, y - 7.5); if (r < 3) G.set(x, y, w); else if (r < 4.5) G.set(x, y, l); else if (r < 6 && (x + y) % 2) G.set(x, y, m); } }
  else glyph(G, sp ? sp.school : id, sc.color, sp ? sp.rank : 0);
  // kleine Variation je Zauber (Punkte rechts unten = Rang)
  if (sp) for (let i = 0; i <= sp.rank; i++) G.set(13 - i * 2, 14, '#f0d27a');
  G.outline(0.5);
  const cv = G.toCanvas(scale);
  cache.set(key, cv);
  return cv;
}
export function spellIconURL(id, scale = 3) { const k = 'u' + id + scale; if (!cache.has(k)) cache.set(k, spellIcon(id, scale).toDataURL()); return cache.get(k); }
