// Gebäude und Weltobjekte für ganz Thyrvenna – prozedural, je Reich ein eigener Baustil.
import { PixelGrid, mulberry32, bayer, shade, mix, valueNoise } from '../engine/PixelUtil.js';
import { PAL } from './palette.js';
import { tree } from './propArt.js';

const cache = new Map();
const cached = (k, fn) => { if (!cache.has(k)) cache.set(k, fn()); return cache.get(k); };
function q(pal, t, x, y) { const n = pal.length, v = Math.max(0, Math.min(0.999, t)) * (n - 1), i = Math.floor(v); return pal[Math.min(n - 1, i + ((v - i) > bayer(x, y) ? 1 : 0))]; }
const ramp = (c, n = 5) => Array.from({ length: n }, (_, i) => shade(c, -0.45 + i * (0.75 / (n - 1))));

// Baustile der Reiche
export const STYLES = {
  draventhal: { wall: 'timber', wallC: '#e6d6b0', beam: '#5e3a22', roof: 'gable', roofC: ['#93283c', '#a8452c', '#8a3a2a'], trim: '#d4a548' },
  saltrivo: { wall: 'plaster', wallC: ['#6fa8a8', '#d9b46a', '#c97a5a', '#9ab8c8', '#e0d6c0'], roof: 'gable', roofC: ['#4a5a6e', '#3e4e60'], trim: '#efe3c8' },
  brennvald: { wall: 'stone', wallC: '#7a7787', roof: 'gable', roofC: ['#3a3440', '#46404c'], snow: true },
  valcrest: { wall: 'white', wallC: '#e8e4ee', roof: 'gable', roofC: ['#5b4f7a', '#6a5e8a'], trim: '#d4a548' },
  sarkhazim: { wall: 'adobe', wallC: ['#c9a066', '#d6b074', '#b88f58'], roof: 'flat', roofC: ['#b88f58'], awning: ['#8a3f1e', '#2f6672', '#c9952f'] },
  fennwyrd: { wall: 'wood', wallC: '#7a4d2c', roof: 'thatch', roofC: ['#7a6a3a', '#6a7a3a'], moss: true },
  asche: { wall: 'stone', wallC: '#3a3234', roof: 'gable', roofC: ['#241e20'], trim: '#c94a12' },
};

// Allgemeines Gebäude: spec = { w, wh, rh, region, v, kind }
export function building(spec) {
  return cached('b' + JSON.stringify(spec), () => {
    const st = STYLES[spec.region] || STYLES.draventhal;
    const r = mulberry32(900 + (spec.v || 0) * 31 + spec.w);
    const w = spec.w, wh = spec.wh, rh = spec.rh;
    const spire = spec.spire ? 26 : 0;
    const G = new PixelGrid(w + 4, rh + wh + 4 + spire);
    const ox = 2, oy = 2 + spire;
    const pickC = c => Array.isArray(c) ? c[Math.floor(r() * c.length)] : c;
    const wallC = pickC(st.wallC), roofC = pickC(st.roofC);
    const WR = ramp(wallC), RR = ramp(roofC, 6);
    // Wand
    const wy = oy + rh - 1;
    for (let y = 0; y < wh; y++) for (let x = 0; x < w; x++) {
      const gx = ox + x, gy = wy + y;
      let t = 0.6 - (x / w) * 0.18 + (valueNoise(x * 0.5, y * 0.5, spec.v || 1) - 0.5) * 0.15;
      if (st.wall === 'stone' || st.wall === 'white') { const row = Math.floor(y / 4), off = (row % 2) * 4; if (y % 4 === 0 || (x + off) % 8 === 0) t -= 0.22; }
      if (st.wall === 'wood') { if (x % 4 === 0) t -= 0.2; }
      if (st.wall === 'adobe') t += (valueNoise(x * 0.3, y * 0.3, 7) - 0.5) * 0.2;
      let c = q(WR, t, gx, gy);
      if (st.wall === 'timber') { if (x === 0 || x === w - 1 || y === 0 || y === wh - 1 || x % 12 === 0 || (y === Math.floor(wh / 2))) c = st.beam; else if ((x % 12) === (y % 12) && y < wh / 2) c = st.beam; }
      G.set(gx, gy, c);
    }
    // Sockel
    for (let x = 0; x < w; x++) G.set(ox + x, wy + wh - 1, shade(wallC, -0.4));
    // Tür
    const dw = spec.kind === 'palace' || spec.kind === 'temple' ? 8 : 6, dh = Math.min(wh - 2, spec.kind === 'palace' ? 14 : 10);
    const dx = ox + Math.floor(w / 2 - dw / 2) + (spec.kind ? 0 : Math.floor((r() - 0.5) * (w / 3)));
    for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
      const arch = st.wall === 'adobe' || st.wall === 'white' || spec.kind === 'temple';
      if (arch && y < 2 && (x === 0 || x === dw - 1)) continue;
      G.set(dx + x, wy + wh - dh + y, x === 0 || y === 0 ? '#3a2416' : (st.wall === 'adobe' ? '#2a1a14' : (x === dw - 2 && y === Math.floor(dh / 2) ? '#d4a548' : '#5e3a22')));
    }
    // Fenster
    const nW = Math.max(1, Math.floor(w / 16));
    for (let i = 0; i < nW * 2; i++) {
      const fx = ox + Math.floor((i + 0.5) * w / (nW * 2)) - 2; if (Math.abs(fx + 2 - (dx + dw / 2)) < dw) continue;
      const fy = wy + Math.max(3, Math.floor(wh * 0.3));
      for (let y = 0; y < 5; y++) for (let x = 0; x < 4; x++) G.set(fx + x, fy + y, x === 0 || y === 0 || x === 3 || y === 4 ? shade(wallC, -0.55) : (y < 2 ? '#ffe9a8' : '#f0b85a'));
      G.set(fx + 1, fy + 2, shade(wallC, -0.55)); G.set(fx + 2, fy + 2, shade(wallC, -0.55));
      if (st.wall === 'plaster' || st.wall === 'timber') { G.set(fx - 1, fy + 5, '#7a4d2c'); G.set(fx + 4, fy + 5, '#7a4d2c'); for (let x = 0; x < 4; x++) G.set(fx + x, fy + 5, x % 2 ? '#c8401f' : '#5c9f45'); }
    }
    // Dach
    if (st.roof === 'flat') {
      for (let y = 0; y < rh; y++) for (let x = -1; x <= w; x++) {
        let t = 0.62 + (valueNoise(x * 0.3, y * 0.3, 3) - 0.5) * 0.15; if (y === 0 || x === -1 || x === w) t = 0.85; if (y === rh - 1) t = 0.25;
        G.set(ox + x, oy + y, q(RR, t, x, y));
      }
      if (st.awning) { const ac = pickC(st.awning); for (let x = 2; x < w - 2; x++) for (let y = 0; y < 4; y++) G.set(ox + x, wy + 2 + y, (Math.floor(x / 3) % 2) ? ac : '#efe3c8'); }
    } else {
      const thatch = st.roof === 'thatch';
      for (let y = 0; y < rh; y++) {
        const inset = thatch ? Math.max(0, Math.round(3 - y * 0.6)) : 0;
        for (let x = -2 + inset; x <= w + 1 - inset; x++) {
          const ry = y / rh;
          let t = 0.75 - ry * 0.55 + (x < w * 0.2 ? 0.06 : 0);
          if (thatch) { t += ((x * 3 + y) % 5 === 0 ? -0.15 : 0) + (valueNoise(x * 0.4, y, 5) - 0.5) * 0.25; }
          else { if (y % 3 === 2) t -= 0.22; else if ((x + (Math.floor(y / 3) % 2) * 2) % 4 === 0) t -= 0.12; }
          let c = q(RR, t, x, y);
          if (y === 0) c = shade(roofC, 0.35);
          if (st.snow && y < rh * 0.45 + Math.sin(x * 0.7) * 1.5) c = y % 3 === 2 ? '#c6d0de' : '#eef2f8';
          if (st.moss && valueNoise(x * 0.3, y * 0.3, 8) > 0.62) c = q(PAL.moss, 0.5 + t * 0.3, x, y);
          G.set(ox + x, oy + y, c);
        }
      }
      // Dachrand
      for (let x = -2; x <= w + 1; x++) G.set(ox + x, oy + rh - 1, shade(roofC, -0.55));
      if (st.trim && spec.kind) for (let x = -2; x <= w + 1; x++) G.set(ox + x, oy + rh - 2, st.trim);
      // Schornstein
      if (!spec.kind && !thatch && r() < 0.7) { const cx = ox + Math.floor(w * (0.2 + r() * 0.6)); for (let y = -4; y < 4; y++) for (let x = 0; x < 4; x++) G.set(cx + x, oy + y, x === 0 ? '#9592a0' : '#615e6d'); G.set(cx, oy - 4, '#b3b0bb'); }
    }
    if (spire) {
      const cx = ox + Math.floor(w / 2);
      for (let y = 0; y < spire + 4; y++) { const hw = Math.floor(y / 4); for (let x = -hw; x <= hw; x++) G.set(cx + x, 2 + y, x < 0 ? shade(roofC, 0.2) : shade(roofC, -0.2)); }
      G.set(cx, 0, '#f6dc8c'); G.set(cx, 1, '#d4a548'); G.set(cx - 1, 2, '#d4a548'); G.set(cx + 1, 2, '#d4a548');
    }
    G.outline(0.55);
    return G.toCanvas();
  });
}

export function tower(region, v = 0, h = 56, kind = 'tower') {
  return cached(`tw${region}${v}${h}${kind}`, () => {
    const st = STYLES[region] || STYLES.draventhal;
    const w = 22, G = new PixelGrid(w + 4, h + 20);
    const wall = kind === 'light' ? '#e8e4ee' : (Array.isArray(st.wallC) ? st.wallC[0] : st.wallC);
    const R = ramp(st.wall === 'timber' ? '#8a8794' : wall);
    for (let y = 16; y < h + 16; y++) for (let x = 0; x < w; x++) {
      let t = 0.75 - (x / w) * 0.5; if (y % 5 === 0 || (x + (Math.floor(y / 5) % 2) * 3) % 6 === 0) t -= 0.2;
      if (kind === 'light' && Math.floor((y - 16) / 10) % 2) { G.set(2 + x, y, x < w / 2 ? '#c8323c' : '#8a2028'); continue; }
      G.set(2 + x, y, q(R, t, x, y));
    }
    // Zinnen oder Kegeldach
    if (kind === 'light') { G.rect(4, 6, w - 4, 10, '#3a3440'); G.rect(6, 8, w - 8, 6, '#ffe9a8'); G.rect(2, 4, w, 2, '#3a3440'); G.rect(8, 0, w - 12, 4, '#c8323c'); }
    else if (st.roof === 'gable' || st.roof === 'thatch') { const rc = Array.isArray(st.roofC) ? st.roofC[0] : st.roofC; for (let y = 0; y < 18; y++) { const hw = Math.floor((y + 1) * (w / 2 + 2) / 18); for (let x = -hw; x <= hw; x++) G.set(2 + w / 2 + x, y, x < 0 ? shade(rc, 0.15) : shade(rc, -0.2)); } if (st.snow) for (let y = 0; y < 7; y++) { const hw = Math.floor((y + 1) * (w / 2 + 2) / 18); for (let x = -hw; x <= hw; x++) G.set(2 + w / 2 + x, y, '#eef2f8'); } }
    else { for (let x = 0; x < w; x += 4) G.rect(2 + x, 12, 2, 4, R[3]); G.rect(2, 15, w, 2, R[4]); }
    // Fenster
    for (let i = 0; i < 3; i++) { const y = 26 + i * 14; if (y > h + 6) break; G.rect(2 + w / 2 - 2, y, 4, 6, '#1a1214'); G.set(2 + w / 2 - 1, y + 1, '#ffd86a'); }
    G.rect(2 + w / 2 - 3, h + 16 - 9, 6, 9, '#3a2416');
    G.outline(0.55);
    return G.toCanvas();
  });
}

export function cityWall(region, len = 32, gateway = false) {
  return cached(`wall${region}${len}${gateway}`, () => {
    const st = STYLES[region] || STYLES.draventhal;
    const base = st.wall === 'adobe' ? '#c9a066' : st.wall === 'white' ? '#d8d4e0' : '#7a7787';
    const R = ramp(base), G = new PixelGrid(len, 28);
    for (let y = 4; y < 28; y++) for (let x = 0; x < len; x++) {
      const row = Math.floor(y / 4), off = (row % 2) * 4;
      let t = 0.6 - (y - 4) / 40 + (valueNoise(x * 0.4, y * 0.4, 9) - 0.5) * 0.15;
      if (y % 4 === 0 || (x + off) % 8 === 0) t -= 0.2;
      if (y < 8) t += 0.15;
      G.set(x, y, q(R, t, x, y));
    }
    for (let x = 0; x < len; x += 6) G.rect(x, 0, 4, 4, R[3]);
    if (gateway) for (let y = 10; y < 28; y++) for (let x = len / 2 - 7; x < len / 2 + 7; x++) { const dy = y - 16, dx = x - len / 2 + 0.5; if (y > 16 || dx * dx / 49 + dy * dy / 36 < 1) G.set(x, y, '#120c10'); }
    G.outline(0.55);
    return G.toCanvas();
  });
}

export function well() {
  return cached('well', () => {
    const G = new PixelGrid(22, 30);
    G.ellipse(11, 22, 9, 6, '#7a7787'); G.ellipse(11, 21, 7, 4, '#2a4a5a'); G.ellipse(10, 20, 3, 1.4, '#5aa6b0');
    for (let a = 0; a < 16; a++) { const t = a / 16 * 6.283; G.set(11 + Math.cos(t) * 9, 22 + Math.sin(t) * 6, a % 2 ? '#9592a0' : '#615e6d'); }
    G.rect(2, 6, 2, 16, '#5e3a22'); G.rect(18, 6, 2, 16, '#5e3a22'); G.rect(0, 4, 22, 3, '#93283c'); G.rect(0, 3, 22, 1, '#b8414f');
    G.rect(10, 7, 1, 10, '#b39a72'); G.rect(9, 15, 3, 3, '#7a4d2c');
    G.outline(0.55); return G.toCanvas();
  });
}

export function stall(v = 0) {
  return cached('stall' + v, () => {
    const cols = ['#93283c', '#2f6672', '#c9952f', '#5b3a7a', '#3c5a2e'], c = cols[v % cols.length];
    const G = new PixelGrid(34, 30);
    G.rect(3, 18, 28, 8, '#7a4d2c'); G.rect(3, 18, 28, 2, '#966238');
    const goods = ['#d8323c', '#f0b85a', '#5cb84a', '#e8d8f0', '#c49af5', '#966238'];
    for (let i = 0; i < 8; i++) G.ellipse(6 + i * 3.2, 17, 1.6, 1.4, goods[(i + v) % goods.length]);
    G.rect(3, 6, 2, 20, '#5e3a22'); G.rect(29, 6, 2, 20, '#5e3a22');
    for (let x = 0; x < 34; x++) for (let y = 0; y < 8; y++) G.set(x, y + Math.floor(Math.abs(x - 17) / 12), (Math.floor(x / 4) % 2) ? c : '#efe3c8');
    for (let x = 0; x < 34; x += 4) G.set(x + 2, 9, c);
    G.outline(0.55); return G.toCanvas();
  });
}

export function fountain(region) {
  return cached('fount' + region, () => {
    const G = new PixelGrid(44, 36);
    const st = region === 'sarkhazim' ? '#c9a066' : region === 'valcrest' ? '#d8d4e0' : '#8a8794';
    G.ellipse(22, 26, 20, 9, shade(st, -0.2)); G.ellipse(22, 25, 18, 7.5, '#2a667c'); G.ellipse(19, 23, 8, 2.5, '#5aa6b0');
    G.ellipse(22, 22, 5, 3, st); G.rect(20, 8, 4, 14, st); G.rect(20, 8, 2, 14, shade(st, 0.2));
    G.ellipse(22, 8, 6, 2.5, shade(st, -0.1)); G.set(22, 4, '#bfe8f0'); G.set(21, 5, '#bfe8f0'); G.set(23, 6, '#bfe8f0'); G.set(17, 9, '#bfe8f0'); G.set(27, 9, '#bfe8f0');
    G.outline(0.55); return G.toCanvas();
  });
}

export function palm(v = 0) {
  return cached('palm' + v, () => {
    const G = new PixelGrid(44, 60), r = mulberry32(60 + v);
    const lean = (r() - 0.5) * 10;
    for (let y = 0; y < 38; y++) { const x = 22 + lean * (1 - y / 38) * (1 - y / 38); for (let k = -2; k <= 2; k++) G.set(x + k, 58 - y, (y % 4 === 0) ? '#5e4a30' : k < 0 ? '#9a7a4a' : '#7a5a34'); }
    const top = [22 + lean, 20];
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.55 + (r() - 0.5) * 0.2, len = 14 + r() * 6;
      for (let t = 0; t < len; t++) { const x = top[0] + Math.cos(a) * t, y = top[1] + Math.sin(a) * t * 0.6 + t * t * 0.03; G.set(x, y, t % 3 ? '#45873e' : '#2f6a30'); G.set(x, y + 1, '#295a2e'); if (t > 3) { G.set(x + Math.sin(a) * 2, y - Math.cos(a) * 1, '#5c9f45'); } }
    }
    G.ellipse(top[0], top[1] + 2, 3, 2, '#7a5a2a');
    G.outline(0.55); return G.toCanvas();
  });
}

export function snowPine(v = 0) {
  return cached('snowpine' + v, () => {
    const base = tree(v, 'pine');
    const c = document.createElement('canvas'); c.width = base.width; c.height = base.height;
    const x = c.getContext('2d'); x.drawImage(base, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height);
    for (let y = 1; y < c.height - 20; y++) for (let i = 0; i < c.width; i++) {
      const o = (y * c.width + i) * 4, up = ((y - 1) * c.width + i) * 4;
      if (d.data[o + 3] && d.data[o + 1] > 60 && (d.data[up + 3] === 0 || d.data[up + 1] < 50) && (i + y) % 3) { d.data[o] = 236; d.data[o + 1] = 242; d.data[o + 2] = 250; }
    }
    x.putImageData(d, 0, 0); return c;
  });
}

export function deadTree(v = 0, ash = false) {
  return cached('dead' + v + ash, () => {
    const G = new PixelGrid(36, 50), r = mulberry32(80 + v);
    const col = ash ? ['#1a1416', '#2a2224', '#3a3032'] : ['#3a2a20', '#523a2a', '#6a4e38'];
    const branch = (x, y, a, len, w) => { for (let t = 0; t < len; t++) { x += Math.cos(a); y += Math.sin(a); for (let k = 0; k < w; k++) G.set(x + k, y, col[k === 0 ? 2 : 1]); } if (len > 4 && w > 0) { branch(x, y, a - 0.5 - r() * 0.4, len * 0.6, Math.max(1, w - 1)); branch(x, y, a + 0.5 + r() * 0.4, len * 0.55, Math.max(1, w - 1)); } };
    for (let y = 30; y < 50; y++) G.rect(15, y, 5, 1, col[y % 3 === 0 ? 0 : 1]);
    branch(17, 31, -Math.PI / 2 + (r() - 0.5) * 0.3, 14, 3);
    G.outline(0.5, '#0e0a0c'); return G.toCanvas();
  });
}

export function cactus(v = 0) {
  return cached('cactus' + v, () => {
    const G = new PixelGrid(22, 30);
    const c = ['#2f6a40', '#3e8050', '#55a064'];
    G.rect(8, 4, 6, 26, c[1]); G.rect(8, 4, 2, 26, c[2]); G.rect(12, 4, 2, 26, c[0]);
    if (v % 2 === 0) { G.rect(2, 12, 6, 3, c[1]); G.rect(2, 6, 3, 9, c[1]); G.set(2, 6, c[2]); }
    G.rect(14, 16, 5, 3, c[1]); G.rect(16, 9, 3, 10, c[1]);
    for (let y = 6; y < 28; y += 4) G.set(11, y, '#e8e0a0');
    G.set(10, 3, '#f2a6c0'); G.set(11, 3, '#f2a6c0');
    G.outline(0.55); return G.toCanvas();
  });
}

export function reeds(v = 0, f = 0) {
  return cached('reeds' + v + f, () => {
    const G = new PixelGrid(14, 16);
    for (let i = 0; i < 5; i++) { const x = 2 + i * 2.4, h = 9 + ((i * 7 + v) % 5); for (let y = 0; y < h; y++) G.set(x + (y > h - 4 ? f : 0), 15 - y, y > h - 3 ? '#8a6a3a' : i % 2 ? '#5c7a3a' : '#4a6a30'); }
    return G.toCanvas();
  });
}

export function peak(v = 0, snow = false, ash = false) {
  return cached(`peak${v}${snow}${ash}`, () => {
    const W = 56, H = 60, G = new PixelGrid(W, H), r = mulberry32(120 + v);
    const h = 40 + Math.floor(r() * 18), cx = W / 2 + (r() - 0.5) * 8;
    const R = ash ? ['#1a1517', '#2a2224', '#3a3234', '#4a4042', '#5a4e50'] : ['#2b2833', '#3b3844', '#4d4a58', '#615e6d', '#7a7787', '#9592a0'];
    for (let y = H - h; y < H; y++) {
      const t = (y - (H - h)) / h, hw = t * W * 0.48 + 1;
      for (let x = Math.floor(cx - hw); x <= cx + hw; x++) {
        const side = (x - cx) / hw;
        let l = side < 0 ? 0.78 - t * 0.2 : 0.38 - t * 0.12;
        l += (valueNoise(x * 0.25, y * 0.25, v + 3) - 0.5) * 0.35;
        if (Math.abs(x - cx - Math.sin(y * 0.3) * 2) < 0.8 && t > 0.2) l -= 0.25;
        let c = q(R, l, x, y);
        if (snow && t < 0.38 + Math.sin(x * 0.6) * 0.06) c = side < 0 ? '#f2f6fc' : '#c6d0de';
        G.set(x, y, c);
      }
    }
    G.outline(0.5); return G.toCanvas();
  });
}

export function caveEntrance(region) {
  return cached('cave' + region, () => {
    const G = new PixelGrid(48, 40);
    const R = region === 'sarkhazim' ? ['#7a5a34', '#9a7448', '#b88f58', '#d6b074'] : ['#2b2833', '#4d4a58', '#615e6d', '#7a7787'];
    for (let y = 0; y < 40; y++) for (let x = 0; x < 48; x++) {
      const dx = (x - 24) / 24, dy = (y - 40) / 40;
      if (dx * dx + dy * dy > 1 - valueNoise(x * 0.2, y * 0.2, 4) * 0.25) continue;
      G.set(x, y, q(R, 0.75 - dx * 0.3 - (1 + dy) * 0.4 + (valueNoise(x * 0.4, y * 0.4, 5) - 0.5) * 0.4, x, y));
    }
    for (let y = 18; y < 40; y++) for (let x = 14; x < 34; x++) { const dx = (x - 23.5) / 10, dy = (y - 30) / 12; if (dx * dx + dy * dy < 1 || (y > 30 && Math.abs(x - 23.5) < 10)) G.set(x, y, y < 24 ? '#0c0a0e' : '#060408'); }
    G.rect(16, 22, 16, 1, '#3a2416'); G.rect(18, 22, 1, 18, '#3a2416'); G.rect(29, 22, 1, 18, '#3a2416');
    for (let x = 19; x < 29; x += 3) G.rect(x, 22, 1, 18, '#4a4048');
    G.outline(0.55); return G.toCanvas();
  });
}

export function standingStone(v = 0, lit = false) {
  return cached('stone' + v + lit, () => {
    const G = new PixelGrid(12, 22), h = 14 + (v % 3) * 2;
    for (let y = 22 - h; y < 22; y++) for (let x = 2; x < 10; x++) { if ((y === 22 - h && (x === 2 || x === 9))) continue; G.set(x, y, x < 5 ? '#9592a0' : '#615e6d'); }
    for (let y = 22 - h + 3; y < 20; y += 3) G.set(5 + (y % 2), y, lit ? '#d6b8ff' : '#4d4a58');
    G.set(4, 22 - h + 2, '#5d8f3f'); G.set(7, 22 - h + 5, '#5d8f3f');
    G.outline(0.55); return G.toCanvas();
  });
}

export function ship(v = 0) {
  return cached('ship' + v, () => {
    const G = new PixelGrid(76, 60);
    const hull = ['#3a2416', '#5e3a22', '#7a4d2c', '#966238'];
    for (let y = 40; y < 56; y++) { const t = (y - 40) / 16, ins = Math.floor(t * t * 14); for (let x = 4 + ins; x < 72 - ins * 0.6; x++) G.set(x, y, q(hull, 0.8 - t * 0.6 + (y % 4 === 0 ? -0.2 : 0), x, y)); }
    G.rect(4, 38, 68, 3, '#b37c48'); G.rect(58, 32, 14, 7, '#7a4d2c');
    G.rect(36, 2, 2, 38, '#5e3a22');
    const sail = v % 2 ? '#efe3c8' : '#d9c49b';
    for (let y = 6; y < 32; y++) { const b = Math.sin((y - 6) / 26 * Math.PI) * 5; for (let x = 18; x < 56 + b; x++) G.set(x, y, x < 37 ? sail : shade(sail, -0.12)); }
    if (v % 2 === 0) { G.rect(30, 14, 14, 10, '#2f6672'); G.rect(34, 16, 6, 6, '#d4a548'); }
    G.rect(36, 0, 8, 4, v % 2 ? '#2f6672' : '#93283c');
    G.outline(0.55); return G.toCanvas();
  });
}

export function haystack() {
  return cached('hay', () => {
    const G = new PixelGrid(22, 18);
    G.ellipse(11, 11, 10, 7, '#c8b456'); G.ellipse(9, 9, 6, 4, '#d8c466'); for (let i = 0; i < 12; i++) G.set(3 + i * 1.4, 12 + (i % 3), '#a08e3c');
    G.outline(0.55); return G.toCanvas();
  });
}

export function fence(v = 0) {
  return cached('fence' + v, () => {
    const G = new PixelGrid(32, 14);
    for (let x = 0; x < 32; x += 8) G.rect(x + 1, 2, 2, 12, '#7a4d2c');
    G.rect(0, 5, 32, 2, '#966238'); G.rect(0, 9, 32, 2, '#7a4d2c');
    G.outline(0.6); return G.toCanvas();
  });
}

export function hotSpring(f = 0) {
  return cached('spring' + f, () => {
    const G = new PixelGrid(40, 24);
    G.ellipse(20, 13, 18, 9, '#9a8a6a'); G.ellipse(20, 12, 15, 7, '#3a9a9a'); G.ellipse(17, 10, 7, 2.5, '#7ad0c8');
    G.set(14 + f, 8, '#e8fffb'); G.set(24 - f, 9, '#e8fffb');
    G.outline(0.5); return G.toCanvas();
  });
}

export function lavaVent(f = 0) {
  return cached('vent' + f, () => {
    const G = new PixelGrid(20, 12);
    G.ellipse(10, 7, 9, 4.5, '#2a2224'); G.ellipse(10, 6.5, 6, 3, '#c94a12'); G.ellipse(9, 6, 3, 1.5, f ? '#ffe48a' : '#ffb53a');
    G.outline(0.5); return G.toCanvas();
  });
}

export function statue(region) {
  return cached('statue' + region, () => {
    const G = new PixelGrid(20, 40);
    const s = region === 'valcrest' ? '#e8e4ee' : '#9592a0';
    G.rect(3, 30, 14, 10, shade(s, -0.25)); G.rect(3, 30, 14, 2, shade(s, 0.1));
    G.rect(7, 12, 6, 18, s); G.rect(7, 12, 2, 18, shade(s, 0.2)); G.ellipse(10, 9, 3.2, 3.2, s);
    G.rect(4, 14, 3, 10, shade(s, -0.1)); G.rect(13, 6, 2, 18, '#d4a548'); G.ellipse(14, 5, 2.5, 2.5, '#f6dc8c');
    G.outline(0.55); return G.toCanvas();
  });
}

export function clearBuildingCache() { cache.clear(); }
