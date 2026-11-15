// Leichtgewichtiges Partikelsystem mit Objekt-Pool.
const MAX = 900;

export class Particles {
  constructor() { this.list = []; }
  spawn(p) {
    if (this.list.length >= MAX) this.list.shift();
    this.list.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, life: 1, max: 1, size: 1, color: '#fff', g: 0, drag: 0, glow: false, type: 'dot', ph: Math.random() * 6 }, p));
  }
  burst(x, y, n, opts) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (opts.speed || 30) * (0.4 + Math.random() * 0.6);
      const life = (opts.life || 0.6) * (0.6 + Math.random() * 0.6);
      this.spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s + (opts.up || 0), life, max: life, color: Array.isArray(opts.color) ? opts.color[(Math.random() * opts.color.length) | 0] : opts.color, g: opts.g || 0, drag: opts.drag || 2, size: opts.size || 1, glow: !!opts.glow });
    }
  }
  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life -= dt;
      if (p.life <= 0) { L.splice(i, 1); continue; }
      if (p.type === 'firefly') { p.ph += dt * 2; p.vx += Math.cos(p.ph * 1.3) * 8 * dt; p.vy += Math.sin(p.ph) * 8 * dt; }
      if (p.type === 'leaf') { p.ph += dt * 3; p.vx = Math.sin(p.ph) * 10; }
      p.vy += p.g * dt;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }
  draw(ctx, cam, layer = 'world') {
    for (const p of this.list) {
      if ((p.layer || 'world') !== layer) continue;
      const x = Math.round(p.x - cam.ix), y = Math.round(p.y - cam.iy);
      if (x < -4 || y < -4 || x > cam.w + 4 || y > cam.h + 4) continue;
      const t = p.life / p.max;
      let a = Math.min(1, t * 2);
      if (p.type === 'firefly') a *= 0.5 + 0.5 * Math.sin(p.ph * 3);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(x, y, p.size, p.size);
      if (p.glow) { ctx.globalAlpha = a * 0.35; ctx.fillRect(x - 1, y, p.size + 2, p.size); ctx.fillRect(x, y - 1, p.size, p.size + 2); }
    }
    ctx.globalAlpha = 1;
  }
}
