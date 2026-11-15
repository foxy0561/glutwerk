// Nicht-Spieler-Figuren mit Tagesablauf (laufen zu Zielpunkten), leichtem Umherwandern und Blick zum Spieler.
import { getCharFrame } from '../art/characterArt.js';
import { TS } from '../world/WorldMap.js';
import { L } from '../core/i18n.js';

export class NPC {
  constructor(game, id, def, x, y) {
    this.game = game; this.id = id; this.def = def;
    this.x = x * TS; this.y = y * TS; this.dir = 'down';
    this.tx = this.x; this.ty = this.y; this.wait = Math.random() * 2;
    this.anim = Math.random() * 4; this.moving = false; this.talking = false; this.blinkT = Math.random() * 4;
    this.w = 10; this.h = 6;
    this.collider = { x: 0, y: 0, w: 10, h: 6, npc: this };
  }
  get name() { return L(this.def.name); }
  scheduleTarget(hour) {
    const s = this.def.schedule; let cur = s[s.length - 1][1];
    for (const [h, p] of s) if (hour >= h) cur = p;
    return cur;
  }
  update(dt, hour) {
    const p = this.game.player;
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    this.blinkT -= dt; if (this.blinkT < -0.12) this.blinkT = 2 + Math.random() * 4;
    if (this.talking || d < 26) {
      // zum Spieler schauen
      const dx = p.x - this.x, dy = p.y - this.y;
      this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      this.moving = false; this.anim += dt * 2; return;
    }
    const home = this.scheduleTarget(hour);
    const hx = home[0] * TS, hy = home[1] * TS;
    this.wait -= dt;
    if (this.wait <= 0 && Math.hypot(this.tx - this.x, this.ty - this.y) < 2) {
      const r = (this.def.wander || 1) * TS;
      this.tx = hx + (Math.random() - 0.5) * r * 2; this.ty = hy + (Math.random() - 0.5) * r * 2;
      this.wait = 2.5 + Math.random() * 4;
    }
    // Weit weg vom Zuhause → direkt dorthin
    if (Math.hypot(hx - this.x, hy - this.y) > 3 * TS && Math.hypot(this.tx - hx, this.ty - hy) > 2 * TS) { this.tx = hx; this.ty = hy; }
    const dx = this.tx - this.x, dy = this.ty - this.y, dist = Math.hypot(dx, dy);
    if (dist > 1.5) {
      const sp = 34;
      const mx = dx / dist * sp * dt, my = dy / dist * sp * dt;
      const W = this.game.world;
      let moved = false;
      if (!W.blocked(this.x + mx - 5, this.y - 6, 10, 6)) { this.x += mx; moved = true; }
      if (!W.blocked(this.x - 5, this.y + my - 6, 10, 6)) { this.y += my; moved = true; }
      if (!moved) { this.tx = this.x; this.ty = this.y; this.wait = 1; }
      this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      this.moving = moved;
      this.anim += dt * 7;
    } else { this.moving = false; this.anim += dt * 2; }
  }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.ix), y = Math.round(this.y - cam.iy);
    ctx.fillStyle = 'rgba(12,8,20,0.35)';
    ctx.beginPath(); ctx.ellipse(x, y, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    const pose = this.moving ? 'walk' : (this.blinkT < 0 ? 'blink' : 'idle');
    const f = this.moving ? Math.floor(this.anim) % 4 : Math.floor(this.anim) % 2;
    ctx.drawImage(getCharFrame(this.def.app, this.dir, pose, f, this.def.weapon || null), x - 12, y - 30);
  }
}
