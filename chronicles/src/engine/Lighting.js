// Tag-Nacht-Zyklus und dynamische Lichtquellen (Abdunkeln + additive Leuchtkegel).
import { makeCanvas } from './PixelUtil.js';

export class DayNight {
  constructor() { this.time = 8.5; this.speed = 24 / (14 * 60); } // ein Tag = 14 Minuten
  update(dt) { this.time = (this.time + dt * this.speed) % 24; }
  get hour() { return this.time; }
  // 0 = hell, 1 = tiefe Nacht
  get darkness() {
    const t = this.time;
    if (t >= 7 && t < 18) return 0;
    if (t >= 18 && t < 21) return (t - 18) / 3 * 0.78;
    if (t >= 5 && t < 7) return (1 - (t - 5) / 2) * 0.78;
    return 0.78;
  }
  get tint() {
    const t = this.time;
    if (t >= 17 && t < 20) return [255, 140, 70, 0.10 * Math.sin((t - 17) / 3 * Math.PI)];
    if (t >= 5 && t < 7.5) return [255, 190, 150, 0.08 * Math.sin((t - 5) / 2.5 * Math.PI)];
    return null;
  }
  get isNight() { return this.darkness > 0.4; }
  label() { const h = Math.floor(this.time), m = Math.floor((this.time - h) * 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }
}

export class Lighting {
  constructor() { this.cv = null; this.ctx = null; this.t = 0; }
  resize(w, h) { [this.cv, this.ctx] = makeCanvas(w, h); }
  render(ctx, cam, lights, darkness, extra = [], tint = null, ambient = [18, 10, 40]) {
    this.t += 1 / 60;
    const w = cam.w, h = cam.h, L = this.ctx;
    const active = [];
    for (const l of lights.concat(extra)) {
      if (l.on && !l.on()) continue;
      const x = l.x - cam.ix, y = l.y - cam.iy;
      if (x < -l.r || y < -l.r || x > w + l.r || y > h + l.r) continue;
      let f = 1 - (l.flicker || 0) * (Math.sin(this.t * 13 + l.x) * 0.5 + Math.sin(this.t * 7.3 + l.y) * 0.5);
      if (l.pulse) f *= 0.85 + 0.15 * Math.sin(this.t * 2 + l.x * 0.1);
      active.push({ l, x, y, f });
    }
    if (darkness > 0.01) {
      L.globalCompositeOperation = 'source-over';
      L.clearRect(0, 0, w, h);
      L.fillStyle = `rgba(${ambient[0]},${ambient[1]},${ambient[2]},${darkness})`;
      L.fillRect(0, 0, w, h);
      L.globalCompositeOperation = 'destination-out';
      for (const { l, x, y, f } of active) {
        const r = l.r * f * 1.15;
        const g = L.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(0,0,0,${Math.min(1, l.a * 1.1)})`);
        g.addColorStop(0.55, `rgba(0,0,0,${l.a * 0.55})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        L.fillStyle = g; L.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.drawImage(this.cv, 0, 0);
    }
    if (tint) { ctx.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${tint[3]})`; ctx.fillRect(0, 0, w, h); }
    // farbiges Leuchten
    ctx.globalCompositeOperation = 'lighter';
    const glowK = 0.12 + darkness * 0.32;
    for (const { l, x, y, f } of active) {
      const r = l.r * f * 0.8;
      const [cr, cg, cb] = l.color;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},${glowK * l.a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
