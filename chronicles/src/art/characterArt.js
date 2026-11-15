// Charakter-Sprites werden aus Bausteinen zusammengesetzt (Körper, Kleidung, Kopf, Haare, Ohren, Schweif, Waffe).
// Jede Kombination wird einmal gezeichnet und danach aus dem Cache geliefert.
import { PixelGrid, shade, mix, flipCanvas, makeCanvas } from '../engine/PixelUtil.js';

export const CHAR_W = 24, CHAR_H = 32, FOOT_X = 12, FOOT_Y = 30;

export const HAIR_STYLES = ['kurz', 'lang', 'zopf', 'wild', 'dutt'];
export const OUTFITS = ['tunika', 'robe', 'leder', 'mantel'];

const cache = new Map();

function key(app, dir, pose, f, weapon) {
  return [app.body, app.species, app.skin, app.hair, app.hairColor, app.eyes, app.outfit, app.cloth, app.seal ? 1 : 0, app.young ? 1 : 0, app.tailTip || '', dir, pose, f, weapon || ''].join('|');
}

// Haarschablonen: Unterkante des Ponys je Spalte (x = 5..19), Seitenlänge, Spitzen
const HAIR = {
  kurz: { bang: [10, 9, 11, 10, 9, 11, 12, 10, 9, 11, 10, 9, 10, 11, 10], side: 14, spikes: [[7, 3], [10, 2], [13, 2], [16, 3], [18, 5], [5, 5]] },
  lang: { bang: [11, 11, 10, 10, 11, 10, 10, 10, 11, 10, 10, 11, 11, 11, 11], side: 23, spikes: [[9, 3], [14, 3]] },
  zopf: { bang: [11, 10, 10, 11, 10, 10, 11, 10, 10, 11, 10, 10, 11, 11, 11], side: 15, spikes: [[11, 3]], tail: true },
  wild: { bang: [12, 10, 12, 9, 11, 12, 9, 11, 12, 10, 12, 9, 11, 12, 12], side: 16, spikes: [[5, 4], [7, 2], [10, 1], [12, 3], [15, 1], [17, 3], [19, 5]] },
  dutt: { bang: [10, 10, 10, 11, 10, 10, 10, 10, 10, 11, 10, 10, 10, 10, 10], side: 13, spikes: [], bun: true },
};

function outfitColors(app) {
  const base = app.cloth;
  return {
    main: base, dark: shade(base, -0.35), light: shade(base, 0.22), deep: shade(base, -0.55),
    trim: '#d4a548', trimD: '#93692b',
    shirt: app.outfit === 'leder' ? '#4f6b3a' : app.outfit === 'mantel' ? '#cfc2a2' : shade(base, 0.35),
    pants: app.outfit === 'robe' ? shade(base, -0.4) : '#3a3448', pantsD: '#2a2534',
    boots: '#5a3a24', bootsD: '#3a2416', leather: '#7a4d2c', leatherD: '#5e3a22',
  };
}

function drawLegs(g, c, dir, f, bob) {
  // Schrittphasen: 0 neutral, 1 links vor, 2 neutral, 3 rechts vor
  const lOff = f === 1 ? 1 : f === 3 ? -1 : 0;
  const rOff = -lOff;
  if (dir === 'side') {
    const a = f === 1 ? 2 : f === 3 ? -2 : 0;
    // hinteres Bein
    g.rect(11 - a, 24, 2, 4, c.pantsD); g.rect(11 - a, 28, 3, 2, c.bootsD);
    g.rect(11 + a, 24, 2, 4, c.pants); g.rect(11 + a, 28, 3, 2, c.boots);
    g.set(13 + a, 28, shade(c.boots, 0.2));
    return;
  }
  g.rect(9, 24, 2, 4 + Math.min(0, lOff), c.pants); g.rect(9, 27 + lOff, 1, 1, c.pantsD);
  g.rect(13, 24, 2, 4 + Math.min(0, rOff), c.pants); g.rect(14, 24, 1, 4, c.pantsD);
  g.rect(8, 28 + Math.min(0, lOff), 3, 2, c.boots); g.set(8, 28 + Math.min(0, lOff), shade(c.boots, 0.2));
  g.rect(13, 28 + Math.min(0, rOff), 3, 2, c.boots); g.set(15, 29 + Math.min(0, rOff), c.bootsD);
}

function drawTorso(g, app, c, dir, f, bob, pose) {
  const male = app.body === 'm';
  const y0 = 17 + bob;
  const x0 = male ? 7 : 8, w = male ? 10 : 8;
  if (dir === 'side') {
    // Rumpf im Profil
    g.rect(9, y0, 7, 7, c.main); g.rect(9, y0, 2, 7, c.dark); g.rect(14, y0 + 1, 1, 5, c.light);
    if (app.outfit === 'robe') { g.rect(8, y0 + 5, 8, 6 - bob, c.main); g.rect(8, y0 + 5, 2, 6 - bob, c.dark); g.rect(8, y0 + 10 - bob, 8, 1, c.trim); }
    if (app.outfit === 'tunika') { g.rect(9, y0 + 6, 7, 2, c.main); g.rect(9, y0 + 7, 7, 1, c.dark); }
    if (app.outfit === 'mantel') { g.rect(7, y0, 4, 9, shade(app.cloth, -0.2)); g.rect(7, y0 + 8, 4, 1, c.deep); }
    if (app.outfit === 'leder') { g.rect(12, y0 + 1, 3, 5, c.leather); }
    g.rect(9, y0 + 5, 7, 1, c.leatherD); g.set(14, y0 + 5, c.trim);
    // Arm
    const sw = pose === 'atk' ? 0 : f === 1 ? 1 : f === 3 ? -1 : 0;
    if (pose === 'atk') {
      g.rect(13, y0 + 1, 5, 2, c.dark); g.rect(18, y0 + 1, 2, 2, app.skin);
    } else {
      g.rect(11 + sw, y0 + 1, 3, 5, c.dark); g.rect(11 + sw, y0 + 1, 3, 1, c.main); g.rect(11 + sw, y0 + 6, 3, 1, app.skin);
    }
    return;
  }
  // Vorder-/Rückansicht
  g.rect(x0, y0, w, 7, c.main);
  g.rect(x0 + w - 2, y0, 2, 7, c.dark);
  g.rect(x0, y0, 1, 7, shade(c.main, -0.15));
  if (dir === 'down') {
    if (app.outfit === 'tunika') {
      g.rect(x0 + 2, y0 + 1, w - 4, 5, c.light); g.rect(11, y0, 2, 6, c.trim); g.rect(12, y0, 1, 6, c.trimD);
      g.set(11, y0 + 2, '#f6dc8c');
    } else if (app.outfit === 'robe') {
      g.rect(11, y0, 2, 7, c.trim); g.rect(12, y0, 1, 7, c.trimD); g.rect(x0 + 1, y0, w - 2, 1, c.trim);
    } else if (app.outfit === 'leder') {
      g.rect(x0 + 1, y0, w - 2, 7, c.shirt); g.rect(x0, y0, 3, 7, c.leather); g.rect(x0 + w - 3, y0, 3, 7, c.leatherD);
      g.rect(11, y0 + 2, 2, 1, c.leatherD);
    } else if (app.outfit === 'mantel') {
      g.rect(x0 + 2, y0, w - 4, 7, c.shirt); g.rect(x0 + 2, y0 + 2, w - 4, 1, shade(c.shirt, -0.15));
      g.rect(x0 - 1, y0, 3, 8, c.main); g.rect(x0 + w - 2, y0, 3, 8, c.dark); g.rect(10, y0, 4, 1, c.trim);
    }
    if (app.seal) { g.set(11, y0 + 1, '#ff6fb5'); g.set(12, y0 + 1, '#e8599b'); }
  } else {
    // Rücken
    if (app.outfit === 'mantel') { g.rect(x0 - 1, y0, w + 2, 9, c.main); g.rect(x0 + w - 1, y0, 2, 9, c.dark); g.rect(x0 - 1, y0 + 8, w + 2, 1, c.deep); }
    if (app.outfit === 'leder') { g.rect(x0 + 1, y0 + 1, w - 2, 5, c.leather); g.rect(x0 + 1, y0 + 5, w - 2, 1, c.leatherD); }
    if (app.outfit === 'robe') g.rect(11, y0 + 1, 2, 5, c.dark);
  }
  // Gürtel
  g.rect(x0, y0 + 5, w, 1, c.leatherD); if (dir === 'down') { g.set(11, y0 + 5, c.trim); g.set(12, y0 + 5, c.trimD); }
  // Rock/Saum
  if (app.outfit === 'tunika') { g.rect(x0, y0 + 6, w, 2, c.main); g.rect(x0 + w - 2, y0 + 6, 2, 2, c.dark); g.rect(x0, y0 + 7, w, 1, c.deep); }
  if (app.outfit === 'robe') { g.rect(x0 - 1, y0 + 6, w + 2, 6 - bob, c.main); g.rect(x0 + w - 1, y0 + 6, 2, 6 - bob, c.dark); g.rect(x0 - 1, y0 + 11 - bob, w + 2, 1, c.trim); if (dir === 'down') g.rect(11, y0 + 6, 2, 5, c.trimD); }
  // Arme
  const sw = f === 1 ? 1 : f === 3 ? -1 : 0;
  const lx = x0 - 2, rx = x0 + w;
  if (pose === 'atk' && dir === 'down') {
    g.rect(lx, y0 + 1 + sw, 2, 5, c.main); g.rect(lx, y0 + 6 + sw, 2, 1, app.skin);
    g.rect(rx, y0 + 2, 2, 6, c.dark); g.rect(rx, y0 + 8, 2, 2, app.skin);
  } else if (pose === 'atk' && dir === 'up') {
    g.rect(lx, y0 + 1, 2, 5, c.main); g.rect(lx, y0 + 6, 2, 1, app.skin);
    g.rect(rx, y0 - 3, 2, 5, c.dark); g.rect(rx, y0 - 4, 2, 1, app.skin);
  } else {
    g.rect(lx, y0 + 1 + sw, 2, 5, c.main); g.set(lx, y0 + 1 + sw, c.light); g.rect(lx, y0 + 6 + sw, 2, 1, app.skin);
    g.rect(rx, y0 + 1 - sw, 2, 5, c.dark); g.rect(rx, y0 + 6 - sw, 2, 1, shade(app.skin, -0.15));
  }
}

function drawHead(g, app, dir, bob, eyesClosed) {
  const skin = app.skin, skinD = shade(skin, -0.18), skinL = shade(skin, 0.15);
  const cy = 11 + bob;
  g.ellipse(12, cy, 6.6, 6.1, skin);
  // Schattenseite / Kinn
  for (let y = cy + 2; y <= cy + 6; y++) for (let x = 15; x <= 19; x++) g.setIf(x, y, skinD);
  g.set(9, cy - 3, skinL);
  if (dir === 'down') {
    const ey = cy + 1;
    const eye = app.eyes, eyeD = shade(eye, -0.45), eyeL = shade(eye, 0.35);
    if (eyesClosed) {
      g.rect(8, ey + 1, 2, 1, '#2a1a24'); g.rect(14, ey + 1, 2, 1, '#2a1a24');
    } else {
      for (const ex of [8, 14]) {
        g.rect(ex, ey, 2, 1, '#2a1a24');
        g.rect(ex, ey + 1, 2, 2, eye); g.set(ex + 1, ey + 2, eyeD); g.set(ex, ey + 1, '#ffffff'); g.set(ex + 1, ey + 1, eyeL);
      }
      if (app.body === 'f') { g.set(7, ey, '#2a1a24'); g.set(16, ey, '#2a1a24'); }
    }
    g.set(7, ey + 3, mix(skin, '#e8607a', 0.35)); g.set(16, ey + 3, mix(skin, '#e8607a', 0.35));
    g.set(12, ey + 4, shade(skin, -0.35)); g.set(11, ey + 4, shade(skin, -0.2));
  } else if (dir === 'side') {
    const ey = cy + 1;
    if (eyesClosed) g.rect(15, ey + 1, 2, 1, '#2a1a24');
    else { g.rect(15, ey, 2, 1, '#2a1a24'); g.rect(15, ey + 1, 2, 2, app.eyes); g.set(16, ey + 1, '#ffffff'); g.set(15, ey + 2, shade(app.eyes, -0.45)); }
    g.set(19, ey + 2, skin); g.set(17, ey + 4, shade(skin, -0.3)); g.set(16, ey + 3, mix(skin, '#e8607a', 0.35));
  }
}

function hairCols(app) {
  const h = app.hairColor;
  const n = parseInt(h.slice(1), 16), lum = ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255;
  if (lum < 0.2) // sehr dunkles Haar: kühler, violetter Glanz statt grauer Aufhellung
    return { h: mix(h, '#3a3248', 0.35), d: h, dd: shade(h, -0.4), l: mix(h, '#5a4a7a', 0.45), ll: mix(h, '#9a88c8', 0.55) };
  return { h, d: shade(h, -0.3), dd: shade(h, -0.5), l: shade(h, 0.28), ll: shade(h, 0.5) };
}

function drawHairBack(g, app, dir, bob) {
  // Lange Haare hinter dem Körper (Vorderansicht)
  const H = HAIR[app.hair] || HAIR.kurz, c = hairCols(app);
  if (dir === 'down' && H.side > 18) {
    g.rect(5, 12 + bob, 3, H.side - 12, c.d); g.rect(16, 12 + bob, 3, H.side - 12, c.dd);
  }
  if (dir === 'side' && H.side > 18) { g.rect(6, 12 + bob, 4, H.side - 13, c.d); }
}

function drawHair(g, app, dir, bob) {
  const H = HAIR[app.hair] || HAIR.kurz, c = hairCols(app);
  const cy = 11 + bob;
  const top = (x, y) => { // im Kopf-Volumen?
    const dx = (x + 0.5 - 12) / 7.4, dy = (y + 0.5 - (cy - 1.2)) / 6.6;
    return dx * dx + dy * dy <= 1;
  };
  for (let y = 0; y < 26; y++) for (let x = 3; x < 22; x++) {
    if (!top(x, y)) continue;
    let cover = false;
    if (dir === 'up') cover = y <= cy + 5;
    else if (dir === 'down') {
      const i = Math.max(0, Math.min(14, x - 5));
      const bang = H.bang[i] + bob;
      cover = y <= bang || ((x <= 6 || x >= 18) && y <= H.side + bob);
    } else { // side, Gesicht nach rechts
      const i = Math.max(0, Math.min(14, x - 5));
      cover = x <= 13 ? y <= cy + 4 : y <= H.bang[i] + bob - (x >= 17 ? 1 : 0);
      if (x <= 9 && y <= H.side + bob) cover = true;
    }
    if (!cover) continue;
    // Schattierung: oben links hell, unten/rechts dunkel
    let col = c.h;
    const ny = (y - (cy - 7)) / 12;
    if (ny > 0.62 || x >= 17) col = c.d;
    if (ny < 0.28 && x <= 13) col = c.l;
    g.set(x, y, col);
  }
  // Seitenlocken bis Schulter
  if (dir !== 'up') {
    const sl = Math.min(H.side, 17) + bob;
    for (let y = cy; y <= sl; y++) { g.set(5, y, c.d); if (dir === 'down') g.set(19, y, c.dd); }
  }
  // Glanzlicht-Strähnen
  if (dir !== 'up') { g.set(9, cy - 5, c.ll); g.set(10, cy - 5, c.ll); g.set(8, cy - 4, c.ll); g.set(14, cy - 5, c.l); }
  else { g.set(10, cy - 5, c.ll); g.set(11, cy - 5, c.ll); g.set(12, cy - 2, c.l); }
  // Spitzen
  for (const [sx, sy] of H.spikes) { g.set(sx, sy + bob, c.h); g.set(sx, sy + 1 + bob, c.h); if (sx < 12) g.set(sx + 1, sy + 1 + bob, c.l); }
  // Zopf
  if (H.tail) {
    if (dir === 'up') { for (let y = cy + 5; y < cy + 13; y++) { g.set(11, y, (y & 1) ? c.d : c.h); g.set(12, y, (y & 1) ? c.h : c.d); } g.set(11, cy + 5, c.trim || '#d4a548'); }
    else if (dir === 'down') { for (let y = cy + 4; y < cy + 12; y++) { g.set(18, y, (y & 1) ? c.d : c.h); g.set(19, y, (y & 1) ? c.h : c.dd); } g.set(18, cy + 4, '#d4a548'); }
    else { for (let y = cy + 1; y < cy + 10; y++) { g.set(5, y, (y & 1) ? c.d : c.h); g.set(6, y, (y & 1) ? c.h : c.d); } }
  }
  if (H.bun) { g.ellipse(12, 3 + bob, 3, 2.6, c.h); g.set(11, 2 + bob, c.ll); g.set(13, 4 + bob, c.d); }
  if (H.side > 18 && dir === 'up') { g.rect(6, cy + 5, 12, H.side - cy - 6, c.h); g.rect(14, cy + 5, 4, H.side - cy - 6, c.d); for (let x = 7; x < 17; x += 3) g.set(x, H.side - 1, c.d); }
}

const EAR_STAMP = {
  fuchs: ['H.....', 'HH....', 'HiH...', 'HiiH..', 'HiiiH.', 'HiiiHH', 'HHHHHH'],
  wolf:  ['H....', 'HH...', 'HiH..', 'HiiH.', 'HiiHH', 'HHHHH'],
  katze: ['H...', 'HH..', 'HiH.', 'HiHH', 'HHHH'],
};
function drawEars(g, app, dir, bob) {
  const c = hairCols(app);
  const sp = app.species;
  if (sp === 'mensch') {
    if (dir === 'down') { g.set(5, 12 + bob, app.skin); g.set(19, 12 + bob, shade(app.skin, -0.2)); }
    if (dir === 'side') { g.set(11, 12 + bob, shade(app.skin, -0.15)); g.set(11, 13 + bob, shade(app.skin, -0.2)); }
    return;
  }
  const st = EAR_STAMP[sp];
  const inner = sp === 'wolf' ? shade(c.h, 0.35) : '#f6e2d8';
  const tip = sp === 'fuchs' ? '#2a1c1c' : c.dd;
  const back = dir === 'up';
  const mapL = { H: c.h, i: back ? c.d : inner };
  const mapR = { H: c.d, i: back ? c.dd : shade(inner, -0.12) };
  const y0 = (sp === 'katze' ? 2 : 0) + bob;
  if (dir === 'side') {
    g.stamp(st, { H: c.d, i: c.dd }, 12, y0 + 1, true);
    g.stamp(st, mapL, 8, y0, false);
    g.set(8, y0, tip);
    return;
  }
  g.stamp(st, mapL, 4, y0, false);
  g.stamp(st, mapR, 20 - st[0].length, y0, true);
  g.set(4, y0, tip); g.set(19, y0, tip);
}

function drawTail(g, app, dir, bob, f, front) {
  const sp = app.species;
  if (sp === 'mensch') return;
  const c = hairCols(app);
  const sway = f === 1 ? 1 : f === 3 ? -1 : 0;
  const tipC = app.tailTip || (sp === 'fuchs' ? '#f4efe6' : c.l);
  if ((dir === 'up') !== front) return;
  // Schweif als Kette von Kreisen entlang einer Kurve
  let pts;
  if (dir === 'up') pts = [[12, 22], [12 + sway, 25], [12 + sway, 28]];
  else if (dir === 'down') pts = [[16, 23], [19 + sway, 22], [20 + sway, 19]];
  else pts = [[9, 23], [5 - sway, 22], [2 - sway, 19]];
  const R = sp === 'fuchs' ? [2.2, 3.4, 2.6] : sp === 'wolf' ? [1.6, 2.2, 1.6] : [0.8, 0.9, 0.8];
  const N = 12;
  for (let i = 0; i <= N; i++) {
    const t = i / N, s = Math.min(1.999, t * 2), k = Math.floor(s), tt = s - k;
    const x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * tt;
    const y = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * tt;
    const r = R[k] + (R[k + 1] - R[k]) * tt;
    const col = t > 0.78 ? tipC : t > 0.45 ? c.h : c.d;
    g.ellipse(x, y + bob, Math.max(0.7, r), Math.max(0.7, r), col);
  }
}

export function drawWeaponOnGrid(g, weapon, dir, bob, pose) {
  if (!weapon) return;
  const steel = '#c9cfd8', steelD = '#7d8496', grip = '#5e3a22', gold = '#d4a548';
  if (dir === 'up') {
    // Waffe auf dem Rücken
    if (weapon === 'bow') { for (let y = 15; y < 27; y++) g.set(8 + Math.round(Math.sin((y - 15) / 12 * Math.PI) * -2), y + bob, '#966238'); }
    if (weapon === 'staff') { g.rect(16, 12 + bob, 1, 16, '#7a4d2c'); g.set(16, 11 + bob, '#b98cf0'); g.set(16, 10 + bob, '#ead9ff'); }
    if (weapon === 'sword' || weapon === 'dagger') { g.rect(15, 16 + bob, 1, weapon === 'sword' ? 9 : 5, steelD); g.rect(14, 16 + bob, 3, 1, gold); }
    return;
  }
  if (dir === 'down') {
    const hx = 18, hy = 23 + bob;
    if (weapon === 'sword') { g.rect(hx, hy - 1, 1, 2, grip); g.rect(hx - 1, hy + 1, 3, 1, gold); g.rect(hx, hy + 2, 1, 5, steel); g.set(hx, hy + 6, steelD); }
    if (weapon === 'dagger') { g.rect(hx, hy, 1, 1, grip); g.rect(hx - 1, hy + 1, 3, 1, gold); g.rect(hx, hy + 2, 1, 3, steel); }
    if (weapon === 'staff') { g.rect(hx, hy - 12, 1, 18, '#7a4d2c'); g.set(hx, hy - 13, '#9a5fe0'); g.set(hx - 1, hy - 14, '#c49af5'); g.set(hx + 1, hy - 14, '#c49af5'); g.set(hx, hy - 15, '#ead9ff'); }
    if (weapon === 'bow') { for (let y = -8; y <= 4; y++) g.set(hx + 1 + Math.round(Math.cos((y + 2) / 7) * 1.5), hy + y, '#966238'); g.rect(hx, hy - 8, 1, 13, '#efe3c8'); }
    return;
  }
  // side
  const hx = 16, hy = 23 + bob;
  if (pose === 'atk') return;
  if (weapon === 'sword') { g.rect(hx, hy, 2, 1, grip); g.set(hx + 2, hy - 1, gold); g.set(hx + 2, hy + 1, gold); g.rect(hx + 3, hy, 5, 1, steel); g.set(hx + 7, hy, steelD); }
  if (weapon === 'dagger') { g.rect(hx, hy, 1, 1, grip); g.set(hx + 1, hy, gold); g.rect(hx + 2, hy, 3, 1, steel); }
  if (weapon === 'staff') { g.rect(hx, hy - 12, 1, 18, '#7a4d2c'); g.set(hx, hy - 13, '#9a5fe0'); g.set(hx, hy - 14, '#ead9ff'); }
  if (weapon === 'bow') { for (let y = -7; y <= 5; y++) g.set(hx + 2 + Math.round(Math.cos(y / 6) * 2), hy + y - 1, '#966238'); g.rect(hx + 1, hy - 7, 1, 12, '#efe3c8'); }
}

export function getCharFrame(app, dir, pose = 'idle', f = 0, weapon = null) {
  // dir: down | up | left | right
  const flip = dir === 'left';
  const d = dir === 'left' || dir === 'right' ? 'side' : dir;
  const k = key(app, dir, pose, f, weapon);
  if (cache.has(k)) return cache.get(k);
  const g = new PixelGrid(CHAR_W, CHAR_H);
  const c = outfitColors(app);
  const bob = pose === 'walk' ? ((f === 1 || f === 3) ? -1 : 0) : pose === 'idle' ? (f === 1 ? 1 : 0) : 0;
  const ff = pose === 'walk' ? f : 0;
  const eyesClosed = pose === 'blink';

  drawTail(g, app, d, bob, ff, false);
  drawHairBack(g, app, d, bob);
  if (d === 'down') drawWeaponOnGrid(g, weapon === 'bow' ? null : null, d, bob, pose);
  drawLegs(g, c, d, ff, bob);
  drawTorso(g, app, c, d, ff, bob, pose);
  drawHead(g, app, d, bob, eyesClosed);
  drawHair(g, app, d, bob);
  drawEars(g, app, d, bob);
  drawTail(g, app, d, bob, ff, true);
  drawWeaponOnGrid(g, weapon, d, bob, pose);
  g.outline(0.62);
  let cv = g.toCanvas();
  if (young(app)) cv = shrink(cv);
  if (flip) cv = flipCanvas(cv);
  cache.set(k, cv);
  return cv;
}

function young(app) { return !!app.young; }
function shrink(cv) {
  // Jüngere Figuren (Erinnerungen) etwas kleiner darstellen
  const [c, ctx] = makeCanvas(CHAR_W, CHAR_H);
  ctx.drawImage(cv, 0, 0, CHAR_W, CHAR_H, 1, 3, CHAR_W - 2, CHAR_H - 3);
  return c;
}

// Porträt: Kopfausschnitt groß skaliert für HUD/Dialoge
export function getPortrait(app, size = 64) {
  const k = 'portrait|' + key(app, 'down', 'idle', 0, '') + size;
  if (cache.has(k)) return cache.get(k);
  const fr = getCharFrame(app, 'down', 'idle', 0, null);
  const [c, ctx] = makeCanvas(size, size);
  ctx.imageSmoothingEnabled = false;
  const sx = 2, sy = 0, sw = 20, sh = 20;
  ctx.drawImage(fr, sx, sy, sw, sh, 0, 0, size, size);
  cache.set(k, c);
  return c;
}

export function clearCharCache() { cache.clear(); }
