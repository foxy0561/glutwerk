// Animierte Pixel-Landschaft für das Hauptmenü: Dämmerhimmel, Mond, Berge, Burg auf der Klippe, Wasserfall, Blütenbaum.
import { makeCanvas, mulberry32, valueNoise, bayer, mix, hexToRgb } from '../engine/PixelUtil.js';

const W = 384, H = 216;

function ditherFill(ctx, w, h, fn) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn(x, y); if (!c) continue; const o = (y * w + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; }
  ctx.putImageData(img, 0, 0);
}
function q(cols, t, x, y) { const n = cols.length, v = Math.max(0, Math.min(.999, t)) * (n - 1), i = Math.floor(v); return cols[Math.min(n - 1, i + ((v - i) > bayer(x, y) ? 1 : 0))]; }

export class TitleScene {
  constructor() {
    [this.cv, this.ctx] = makeCanvas(W, H);
    this.t = 0;
    this.buildStatic();
    const r = mulberry32(7);
    this.stars = Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * H * 0.45, p: r() * 6, b: r() }));
    this.petals = Array.from({ length: 30 }, () => ({ x: r() * W, y: r() * H, s: 0.3 + r() * 0.6, p: r() * 6 }));
    this.flies = Array.from({ length: 22 }, () => ({ x: r() * W, y: H * 0.6 + r() * H * 0.4, p: r() * 6 }));
  }
  buildStatic() {
    // Himmel + Berge + Burg + Vordergrund als Ebenen
    const sky = ['#140a2a', '#2a1446', '#4a2266', '#7a3a7a', '#b25a7a', '#e08a7a', '#f4b88a'].map(hexToRgb);
    [this.sky, this.skyCtx] = makeCanvas(W, H);
    ditherFill(this.skyCtx, W, H, (x, y) => q(sky, (y / (H * 0.72)) + (valueNoise(x / 40, y / 14, 3) - 0.5) * 0.12, x, y));
    // ferne Berge
    [this.mtn, this.mtnCtx] = makeCanvas(W, H);
    const m1 = ['#2a1840', '#3a2252', '#4e2e62'].map(hexToRgb), m2 = ['#1c1030', '#2a1840', '#382050'].map(hexToRgb);
    ditherFill(this.mtnCtx, W, H, (x, y) => {
      const h1 = H * 0.52 - (valueNoise(x / 34, 0, 11) * 46 + valueNoise(x / 9, 0, 12) * 8);
      const h2 = H * 0.62 - (valueNoise(x / 50, 0, 21) * 40 + valueNoise(x / 12, 0, 22) * 7);
      if (y > h2) return q(m2, 0.7 - (y - h2) / 70 + (x < 140 ? 0.15 : 0), x, y);
      if (y > h1) return q(m1, 0.85 - (y - h1) / 90, x, y);
      return null;
    });
    // Klippe mit Burg rechts
    [this.castle, this.cctx] = makeCanvas(W, H);
    const c = this.cctx;
    const rock = ['#150d1e', '#22162e', '#30223e', '#43304f', '#5a4266'].map(hexToRgb);
    ditherFill(c, W, H, (x, y) => {
      const edge = 290 + Math.sin(y * 0.06) * 8 + valueNoise(0, y / 7, 4) * 12 - Math.max(0, y - 150) * 0.5;
      const top = 98 + valueNoise(x / 14, 0, 5) * 8;
      if (x <= edge || y <= top) return null;
      const d = x - edge, strata = Math.sin(y * 0.45 + valueNoise(x / 10, y / 10, 7) * 3) * 0.08;
      let l = 0.18 + valueNoise(x / 6, y / 6, 6) * 0.35 + strata - (y - top) / 400;
      if (d < 3) l += 0.35; else if (y - top < 2) l += 0.3;
      return q(rock, l, x, y);
    });
    // Burg-Silhouette
    c.fillStyle = '#1a1226';
    const towers = [[296, 62, 10, 40], [312, 46, 14, 56], [334, 56, 12, 46], [352, 36, 16, 66], [374, 58, 10, 44]];
    c.fillRect(292, 80, 92, 24);
    towers.forEach(([x, y, w, h]) => {
      c.fillRect(x, y, w, h);
      c.beginPath(); c.moveTo(x - 2, y); c.lineTo(x + w / 2, y - w * 1.2); c.lineTo(x + w + 2, y); c.fill();
      for (let i = x; i < x + w; i += 4) c.fillRect(i, y - 1, 2, 1);
    });
    c.fillStyle = '#3a2a50'; towers.forEach(([x, y, w, h]) => c.fillRect(x, y + 1, 1, h - 2));
    c.fillStyle = '#4a2a6a'; towers.forEach(([x, y, w]) => { for (let i = 0; i < w / 2; i++) c.fillRect(x + i, y - i * 2.4 + 1, 1, 1); });
    this.windows = [];
    const r = mulberry32(9);
    towers.forEach(([x, y, w, h]) => { for (let i = 0; i < 3; i++) if (r() < 0.75) this.windows.push([x + 3 + Math.floor(r() * (w - 6)), y + 8 + Math.floor(r() * (h - 18)), r() * 6]); });
    // Vordergrund: Hügel, Blütenbaum links, Felsen
    [this.fg, this.fctx] = makeCanvas(W, H);
    const gr = ['#0e1410', '#16201a', '#1e2c22', '#28382a', '#34482e'].map(hexToRgb);
    ditherFill(this.fctx, W, H, (x, y) => {
      const h = H * 0.8 - Math.sin(x / 60) * 8 - valueNoise(x / 20, 0, 31) * 10;
      if (y > h) return q(gr, 0.75 - (y - h) / 50 + valueNoise(x / 5, y / 5, 32) * 0.2, x, y);
      return null;
    });
    // Blütenbaum
    const f = this.fctx;
    const trunk = ['#1a0e10', '#2a1618', '#3a2024'];
    for (let y = 90; y < H * 0.82; y++) { const w = 5 + (y - 90) * 0.04; for (let x = -w; x <= w; x++) { f.fillStyle = trunk[x < -w / 3 ? 2 : x > w / 3 ? 0 : 1]; f.fillRect(Math.round(46 + x + Math.sin(y * 0.05) * 3), y, 1, 1); } }
    const bl = ['#5a1a46', '#8a2a66', '#c04a8a', '#e47aae', '#f8b8d8'].map(hexToRgb);
    const blobs = [[46, 70, 40, 26], [16, 84, 26, 18], [80, 82, 30, 18], [40, 46, 30, 18], [94, 60, 22, 14], [4, 60, 20, 16]];
    const img = f.getImageData(0, 0, W, H), d = img.data;
    for (let y = 0; y < 120; y++) for (let x = 0; x < 140; x++) {
      let ins = null; for (const b of blobs) { const dx = (x - b[0]) / b[2], dy = (y - b[1]) / b[3]; if (dx * dx + dy * dy < 1 + (valueNoise(x / 4, y / 4, 41) - 0.5) * 0.5) ins = b; }
      if (!ins) continue;
      const l = 0.7 - (y - ins[1] + ins[3]) / (ins[3] * 2) * 0.55 + (x - ins[0]) / ins[2] * -0.12 + (valueNoise(x / 3, y / 3, 42) - 0.5) * 0.4;
      const cc = q(bl, l, x, y); const o = (y * W + x) * 4; d[o] = cc[0]; d[o + 1] = cc[1]; d[o + 2] = cc[2]; d[o + 3] = 255;
    }
    f.putImageData(img, 0, 0);
    // Blumen im Vordergrund
    const r2 = mulberry32(5);
    for (let i = 0; i < 160; i++) { const x = r2() * W, y = H * 0.84 + r2() * H * 0.16; f.fillStyle = ['#c04a8a', '#e47aae', '#9a5fe0', '#f0d27a', '#ead9ff'][i % 5]; f.fillRect(x | 0, y | 0, 1, 1); if (r2() < 0.4) f.fillRect((x | 0) + 1, y | 0, 1, 1); }
  }
  render(target, dt) {
    this.t += dt;
    const c = this.ctx, t = this.t;
    c.drawImage(this.sky, 0, 0);
    // Sterne
    for (const s of this.stars) { const a = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.6 + s.b) + s.p)); c.fillStyle = `rgba(255,240,255,${a * (1 - s.y / (H * 0.5))})`; c.fillRect(s.x | 0, s.y | 0, 1, 1); }
    // Mond
    const mx = 136, my = 34;
    const g = c.createRadialGradient(mx, my, 4, mx, my, 46); g.addColorStop(0, 'rgba(255,230,240,0.35)'); g.addColorStop(1, 'rgba(255,200,230,0)'); c.fillStyle = g; c.fillRect(mx - 46, my - 46, 92, 92);
    c.fillStyle = '#fbeef2'; c.beginPath(); c.arc(mx, my, 13, 0, 7); c.fill(); c.fillStyle = '#e8d4e4'; c.fillRect(mx - 5, my - 3, 3, 2); c.fillRect(mx + 3, my + 4, 4, 2);
    c.drawImage(this.mtn, 0, 0);
    // weiche Nebelschwaden
    for (let i = 0; i < 4; i++) {
      const y = 118 + i * 12, x0 = ((t * (3 + i * 2) + i * 97) % (W + 200)) - 100;
      c.save(); c.translate(x0, y); c.scale(1, 0.22);
      const gr = c.createRadialGradient(0, 0, 2, 0, 0, 90);
      gr.addColorStop(0, `rgba(235,190,230,${0.12 + i * 0.03})`); gr.addColorStop(1, 'rgba(235,190,230,0)');
      c.fillStyle = gr; c.fillRect(-90, -90, 180, 180); c.restore();
    }
    c.drawImage(this.castle, 0, 0);
    for (const [x, y, p] of this.windows) { c.fillStyle = `rgba(255,${190 + Math.sin(t * 2 + p) * 30 | 0},110,${0.7 + 0.3 * Math.sin(t * 3 + p)})`; c.fillRect(x, y, 1, 2); }
    // Wasserfall
    for (let y = 104; y < 176; y++) for (let x = 0; x < 12; x++) {
      const v = Math.sin((y - t * 60) * 0.35 + x * 1.3) + Math.sin((y - t * 90) * 0.2 + x);
      const col = v > 1.2 ? '#e8f8ff' : v > 0.2 ? '#9ad0e8' : '#5a8ab8';
      c.fillStyle = col; c.fillRect(284 + x - Math.floor((y - 104) * 0.05), y, 1, 1);
    }
    for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(230,248,255,0.5)'; c.fillRect(278 + ((t * 20 + i * 7) % 20) | 0, 174 + Math.sin(t * 3 + i) * 2 | 0, 2, 1); }
    c.drawImage(this.fg, 0, 0);
    // Blütenblätter
    for (const p of this.petals) { p.y += p.s * 14 * dt; p.x += Math.sin(t + p.p) * 8 * dt + 6 * dt; if (p.y > H) { p.y = -2; p.x = Math.random() * W * 0.6; } if (p.x > W) p.x = 0; c.fillStyle = '#f8b8d8'; c.fillRect(p.x | 0, p.y | 0, 1, 1); }
    for (const f of this.flies) { const a = 0.5 + 0.5 * Math.sin(t * 2.4 + f.p); c.fillStyle = `rgba(232,255,154,${a})`; c.fillRect((f.x + Math.sin(t * 0.7 + f.p) * 6) | 0, (f.y + Math.cos(t * 0.5 + f.p) * 4) | 0, 1, 1); }
    const tc = target.getContext('2d'); tc.imageSmoothingEnabled = false;
    // Seitenverhältnis füllen (cover)
    const s = Math.max(target.width / W, target.height / H);
    const dw = W * s, dh = H * s;
    tc.drawImage(this.cv, (target.width - dw) / 2, (target.height - dh) / 2, dw, dh);
  }
}
