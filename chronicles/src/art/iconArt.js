// 16×16-Pixel-Icons für Gegenstände und Menüs. Als Data-URL für die HTML-Oberfläche nutzbar.
import { PixelGrid, shade } from '../engine/PixelUtil.js';
import { PAL } from './palette.js';

const cache = new Map();

function line(g, x0, y0, x1, y1, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) g.set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), typeof c === 'function' ? c(i, n) : c);
}

const DRAW = {
  sword(g) {
    line(g, 4, 11, 13, 2, (i) => i < 1 ? '#7d8496' : '#dfe4ec'); line(g, 5, 11, 13, 3, '#9aa2b2'); g.set(13, 2, '#ffffff');
    line(g, 2, 9, 6, 13, PAL.gold[4]); g.set(4, 11, PAL.gold[5]);
    line(g, 2, 13, 4, 11, PAL.wood[3]); g.set(1, 14, PAL.gold[3]);
  },
  dagger(g) {
    line(g, 6, 9, 12, 3, '#dfe4ec'); line(g, 7, 9, 12, 4, '#9aa2b2'); g.set(12, 3, '#fff');
    line(g, 4, 8, 7, 11, PAL.gold[4]); line(g, 3, 12, 5, 10, PAL.wood[2]); g.set(2, 13, '#c9952f'); g.set(3, 14, '#c9952f');
  },
  staff(g) {
    line(g, 3, 14, 11, 5, PAL.wood[3]); line(g, 4, 14, 12, 5, PAL.wood[2]);
    g.ellipse(12.5, 3.5, 2.6, 2.6, PAL.violet[4]); g.set(12, 2, PAL.violet[6]); g.set(11, 3, PAL.violet[5]); g.set(14, 5, PAL.violet[3]);
  },
  bow(g) {
    for (let i = 0; i <= 12; i++) { const a = -1.2 + i / 12 * 2.4; g.set(Math.round(6 + Math.cos(a) * 7), Math.round(8 + Math.sin(a) * 7), i % 3 ? PAL.wood[4] : PAL.wood[3]); }
    line(g, 8, 1, 8, 15, '#efe3c8'); line(g, 3, 8, 13, 8, PAL.wood[5]); g.set(14, 8, '#c9cfd8'); g.set(2, 7, '#e8d8f0'); g.set(2, 9, '#e8d8f0');
  },
  shirt(g) {
    const c = PAL.cloth[3], d = PAL.cloth[2];
    g.rect(4, 4, 8, 10, c); g.rect(1, 4, 3, 5, c); g.rect(12, 4, 3, 5, d); g.rect(10, 4, 2, 10, d); g.rect(6, 3, 4, 2, PAL.cloth[1]); g.rect(7, 5, 2, 1, PAL.cloth[4]);
  },
  vest(g) {
    g.rect(3, 3, 10, 11, PAL.wood[3]); g.rect(10, 3, 3, 11, PAL.wood[2]); g.rect(7, 3, 2, 11, PAL.wood[1]); g.rect(6, 2, 4, 2, PAL.wood[1]);
    g.set(5, 6, PAL.gold[4]); g.set(5, 9, PAL.gold[4]); g.set(10, 6, PAL.gold[4]); g.set(10, 9, PAL.gold[4]); g.set(4, 4, PAL.wood[5]);
  },
  pendant(g) {
    line(g, 4, 1, 8, 6, '#b3b0bb'); line(g, 12, 1, 8, 6, '#9592a0');
    for (let a = 0; a < 20; a++) { const t = 0.6 + a / 20 * 4.6; g.set(Math.round(8 + Math.cos(t) * 4), Math.round(10 + Math.sin(t) * 4), a < 10 ? '#eef0f8' : '#b3b0bb'); }
    g.set(9, 9, '#c49af5');
  },
  potion(g, col) {
    g.rect(6, 1, 4, 2, PAL.wood[4]); g.rect(7, 3, 2, 3, '#cfd8e8');
    g.ellipse(8, 10, 5.2, 5, '#cfd8e8'); g.ellipse(8, 11, 4.2, 3.6, col); g.ellipse(8, 9.5, 3.6, 1.2, shade(col, 0.3));
    g.set(5, 8, '#ffffff'); g.set(5, 9, '#ffffff'); g.set(10, 13, shade(col, -0.35)); g.set(11, 12, shade(col, -0.35));
  },
  potion_red(g) { DRAW.potion(g, '#d8323c'); },
  potion_blue(g) { DRAW.potion(g, '#3a7ad0'); },
  potion_green(g) { DRAW.potion(g, '#5cb84a'); },
  apple(g) {
    g.ellipse(8, 10, 5.5, 5, '#c8282c'); g.ellipse(6.5, 9, 2.5, 2.5, '#e8484a'); g.set(5, 8, '#ff9a9a'); g.set(11, 13, '#7a1418');
    g.rect(8, 3, 1, 3, PAL.wood[2]); g.ellipse(10.5, 4, 2, 1.2, PAL.leaf[5]);
  },
  bread(g) {
    g.ellipse(8, 10, 7, 4.5, '#c08a48'); g.ellipse(8, 9, 6, 3, '#d9a560'); g.ellipse(7, 8.5, 3, 1.2, '#ecc282');
    line(g, 4, 10, 6, 8, '#8f5e2a'); line(g, 7, 11, 9, 8, '#8f5e2a'); line(g, 10, 11, 12, 8, '#8f5e2a');
  },
  mushroom(g) {
    g.rect(6, 9, 4, 6, '#efe3c8'); g.rect(8, 9, 2, 6, '#cfc2a2');
    g.ellipse(8, 7, 6.5, 4, '#b8414f'); g.ellipse(6, 6, 3, 1.6, '#d8606a'); g.set(5, 5, '#fff'); g.set(9, 6, '#fff'); g.set(11, 7, '#fff'); g.set(7, 8, '#fff');
  },
  berry(g) {
    [[6, 9], [10, 9], [8, 12], [8, 7], [5, 12], [11, 12]].forEach(([x, y], i) => { g.ellipse(x, y, 2.2, 2.2, i % 2 ? '#7039b8' : '#9a5fe0'); g.set(x - 1, y - 1, '#ead9ff'); });
    line(g, 8, 2, 8, 5, PAL.leaf[3]); g.ellipse(10, 3, 2, 1, PAL.leaf[5]);
  },
  fern(g) {
    line(g, 8, 15, 8, 2, '#4a8f86');
    for (let i = 0; i < 6; i++) { const y = 4 + i * 2; const w = 2 + Math.min(i, 3); line(g, 8, y, 8 - w, y - 2, '#7cc4bf'); line(g, 8, y, 8 + w, y - 2, '#5aa6a0'); }
    g.set(8, 2, '#ffffff'); g.set(5, 5, '#e8fffb'); g.set(11, 7, '#e8fffb');
  },
  fern_bundle(g) { DRAW.fern(g); g.rect(5, 11, 6, 2, '#d9d6e8'); g.set(5, 11, '#ffffff'); },
  wood(g) {
    g.rect(2, 7, 12, 4, PAL.wood[3]); g.rect(2, 7, 12, 1, PAL.wood[5]); g.rect(2, 10, 12, 1, PAL.wood[2]);
    g.ellipse(13, 9, 1.6, 2.2, PAL.wood[6]); g.set(13, 9, PAL.wood[3]);
    g.rect(4, 3, 9, 4, PAL.wood[4]); g.rect(4, 3, 9, 1, PAL.wood[6]); g.ellipse(12.5, 5, 1.4, 2, PAL.wood[6]);
  },
  ore(g) {
    g.ellipse(8, 9, 6, 5, PAL.stone[3]); g.ellipse(6, 7.5, 3, 2.4, PAL.stone[5]); g.set(9, 9, '#c06a3a'); g.set(10, 10, '#c06a3a'); g.set(6, 11, '#e09a5a'); g.set(5, 6, '#fff');
  },
  stone(g) { g.ellipse(8, 9, 5.5, 4.5, '#5d5a66'); g.ellipse(7, 8, 3, 2, '#8a8794'); g.set(6, 7, '#d9d6e2'); },
  leather(g) { g.ellipse(8, 8, 6, 5.5, '#8a5a34'); g.ellipse(7, 7, 3.5, 3, '#a8703f'); g.set(3, 4, '#8a5a34'); g.set(13, 4, '#8a5a34'); g.set(3, 13, '#8a5a34'); g.set(13, 12, '#8a5a34'); },
  box(g) { g.rect(2, 5, 12, 9, PAL.wood[3]); g.rect(2, 5, 12, 2, PAL.wood[5]); g.rect(2, 9, 12, 1, PAL.wood[1]); g.rect(7, 5, 2, 9, '#c9952f'); g.set(4, 7, '#e09a5a'); g.set(11, 11, '#d8323c'); },
  shard(g) {
    for (let y = 1; y < 15; y++) { const w = y < 6 ? (y - 1) * 0.7 : (15 - y) * 0.45; for (let x = -Math.round(w); x <= Math.round(w); x++) g.set(8 + x, y, x < 0 ? PAL.violet[5] : x === 0 ? PAL.violet[6] : PAL.violet[4]); }
    g.set(7, 4, '#ffffff'); g.set(3, 3, PAL.violet[6]); g.set(13, 6, PAL.violet[5]); g.set(12, 12, PAL.violet[6]);
  },
  coin(g) { g.ellipse(8, 8, 5.5, 5.5, PAL.gold[3]); g.ellipse(7.5, 7.5, 4.2, 4.2, PAL.gold[4]); g.rect(7, 5, 2, 6, PAL.gold[2]); g.set(6, 5, PAL.gold[5]); },
  // UI-Icons
  ui_bag(g) { g.ellipse(8, 10, 6, 5, '#a8703f'); g.rect(4, 4, 8, 4, '#8a5a34'); g.rect(6, 2, 4, 2, '#6a4024'); g.rect(3, 8, 10, 1, '#5e3a22'); g.set(8, 9, PAL.gold[4]); g.ellipse(6, 11, 2, 1.4, '#c08a50'); },
  ui_char(g) { g.ellipse(8, 5, 3.4, 3.4, '#eec3a0'); g.rect(5, 2, 6, 2, '#eae6f2'); g.rect(4, 9, 8, 6, '#93283c'); g.rect(7, 9, 2, 6, PAL.gold[4]); g.set(7, 5, '#2a1a24'); g.set(9, 5, '#2a1a24'); },
  ui_book(g) { g.rect(2, 3, 12, 11, '#5b3a7a'); g.rect(3, 4, 10, 9, '#7a52a0'); g.rect(7, 3, 2, 11, '#3a2050'); g.set(5, 7, PAL.gold[5]); g.set(10, 7, PAL.gold[5]); g.rect(4, 13, 9, 1, '#efe3c8'); },
  ui_scroll(g) { g.rect(3, 3, 10, 10, '#e8d8b0'); g.rect(2, 2, 12, 2, '#c9a870'); g.rect(2, 12, 12, 2, '#c9a870'); for (let y = 5; y < 11; y += 2) g.rect(5, y, 6, 1, '#8a7254'); g.set(13, 3, '#93283c'); },
  ui_map(g) { g.rect(2, 3, 12, 10, '#d9c49b'); g.rect(6, 3, 1, 10, '#b39a72'); g.rect(10, 3, 1, 10, '#b39a72'); line(g, 3, 10, 12, 5, '#93283c'); g.set(12, 5, '#d8323c'); g.set(4, 5, '#4a7c38'); g.set(5, 6, '#4a7c38'); },
  ui_gear(g) { g.ellipse(8, 8, 5, 5, '#9592a0'); for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI * 2; g.rect(Math.round(7 + Math.cos(t) * 6), Math.round(7 + Math.sin(t) * 6), 2, 2, '#7a7787'); } g.ellipse(8, 8, 2, 2, '#2b2833'); },
  // Attribut-Icons
  a_str(g) { line(g, 3, 13, 12, 4, '#c9cfd8'); line(g, 4, 13, 13, 4, '#9aa2b2'); line(g, 2, 10, 6, 14, PAL.gold[4]); g.ellipse(11, 5, 2, 2, '#e05a7a'); },
  a_dex(g) { line(g, 3, 3, 13, 13, '#dfe4ec'); line(g, 13, 3, 3, 13, '#dfe4ec'); g.set(8, 8, PAL.gold[5]); },
  a_vit(g) { g.ellipse(5.5, 6, 3, 3, '#e8484a'); g.ellipse(10.5, 6, 3, 3, '#e8484a'); for (let y = 7; y < 14; y++) { const w = (14 - y) * 0.9; g.rect(Math.round(8 - w), y, Math.round(w * 2), 1, '#d8323c'); } g.set(4, 5, '#ffb0b0'); },
  a_int(g) { g.ellipse(8, 8, 5.5, 5.5, '#7039b8'); g.ellipse(8, 8, 3.5, 3.5, '#9a5fe0'); g.set(6, 6, '#ead9ff'); g.set(8, 8, '#ead9ff'); },
  a_wil(g) { for (let a = 0; a < 24; a++) { const t = a / 24 * Math.PI * 2; g.set(Math.round(8 + Math.cos(t) * 5), Math.round(8 + Math.sin(t) * 5), '#b98cf0'); } g.ellipse(8, 8, 2.4, 2.4, '#5aa6f0'); g.set(8, 8, '#fff'); },
  a_end(g) { line(g, 8, 14, 8, 6, '#4a7c38'); g.ellipse(6, 6, 2.5, 4, '#76a64c'); g.ellipse(10.5, 5, 2.5, 4, '#5d8f3f'); g.ellipse(8, 3, 2, 2.6, '#93bd5c'); },
};

export function icon(name, scale = 1) {
  const k = name + '@' + scale;
  if (cache.has(k)) return cache.get(k);
  const g = new PixelGrid(16, 16);
  (DRAW[name] || DRAW.box)(g);
  g.outline(0.6);
  const cv = g.toCanvas(scale);
  cache.set(k, cv);
  return cv;
}
const urlCache = new Map();
export function iconURL(name, scale = 3) {
  const k = name + '@' + scale;
  if (!urlCache.has(k)) urlCache.set(k, icon(name, scale).toDataURL());
  return urlCache.get(k);
}
