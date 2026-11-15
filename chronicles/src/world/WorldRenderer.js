// Zeichnet die Welt: Boden → Wasser → Brücke → flache Deko → y-sortierte Objekte/Figuren → Partikel → Licht → Effekte.
import { TS } from './WorldMap.js';
import * as P from '../art/propArt.js';
import { makeCanvas } from '../engine/PixelUtil.js';

export class WorldRenderer {
  constructor(game) { this.g = game; this.t = 0; this.vignette = null; }
  resize(w, h) {
    // Vignette vorberechnen
    const [c, ctx] = makeCanvas(w, h);
    const gr = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(8,4,16,0.55)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    this.vignette = c;
  }
  render(ctx, dt) {
    const g = this.g, W = g.world, cam = g.cam;
    this.t += dt;
    const vw = cam.w, vh = cam.h;
    const mem = g.state.world.memoryMode && W.id === 'farnlager';
    ctx.fillStyle = '#10180f'; ctx.fillRect(0, 0, vw, vh);
    W.drawGround(ctx, cam, this.t);
    const cx = cam.ix, cy = cam.iy;
    // flache Deko mit Wiegen im Wind
    const sw = this.t * 1.6;
    for (const f of W.visibleFlats(cam)) {
      const fr = f.sway ? (Math.sin(sw + f.x * 0.05 + (f.ph || 0)) > 0.3 ? 1 : 0) : 0;
      ctx.drawImage(f.sprite(fr), Math.round(f.x - f.ox - cx), Math.round(f.y - f.oy - cy));
    }
    g.drawGroundEffects && g.drawGroundEffects(ctx, cam);
    const objs = W.visibleObjects(cam);
    // Baumschatten
    const shadow = P.treeShadow();
    for (const o of objs) if (o.shadow) ctx.drawImage(shadow, Math.round(o.x - 26 - cx), Math.round(o.y - 14 - cy));
    // y-Sortierung
    const list = [];
    for (const o of objs) { if (o.hidden && o.hidden()) continue; list.push(o); }
    if (!mem) for (const n of W.npcs) if (n.x > cam.x - 30 && n.x < cam.x + vw + 30 && n.y > cam.y - 10 && n.y < cam.y + vh + 40) list.push(n);
    list.push(g.player);
    list.sort((a, b) => (a.sy ?? a.y) - (b.sy ?? b.y));
    const p = g.player;
    const frameAnim = Math.floor(this.t * 8);
    for (const o of list) {
      if (o.draw) { o.draw(ctx, cam); continue; }
      let a = 1;
      if (o.veil) { a = g.veilAlpha(o.veil); if (a <= 0.01) continue; }
      if (o.tree && o.canopy && p.y < o.y && p.y > o.canopy.y && Math.abs(p.x - o.x) < 26) a = 0.55;
      if (o.type === 'building' && p.y < o.y && p.y > o.col[1] - 20 && Math.abs(p.x - o.x) < o.col[2] / 2) a = 0.6;
      const spr = o.sprite(o.anim ? Math.floor(this.t * o.anim) : frameAnim);
      if (a < 1) ctx.globalAlpha = a;
      if (o.veil && a < 1) { const k = (1 - a) * 3; ctx.drawImage(spr, Math.round(o.x - o.ox - cx + Math.sin(this.t * 9 + o.y) * k), Math.round(o.y - o.oy - cy)); }
      else ctx.drawImage(spr, Math.round(o.x - o.ox - cx), Math.round(o.y - o.oy - cy));
      if (a < 1) ctx.globalAlpha = 1;
    }
    g.drawEffects && g.drawEffects(ctx, cam);
    g.particles.draw(ctx, cam);
    // Licht
    const dark = mem ? 0.62 : W.indoor ? W.darkness : g.day.darkness;
    const extra = [{ x: p.x, y: p.y - 12, r: W.indoor ? 58 : 34, color: [255, 220, 170], a: 0.35, flicker: 0.02 }].concat(g.extraLights ? g.extraLights() : []);
    g.lighting.render(ctx, cam, W.lights, dark, extra, mem || W.indoor ? null : g.day.tint, mem ? [40, 20, 70] : W.indoor ? [8, 5, 14] : [18, 12, 42]);
    if (mem) {
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = 'rgba(120,80,170,0.45)'; ctx.fillRect(0, 0, vw, vh);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(230,210,255,${0.05 + Math.sin(this.t * 1.5) * 0.02})`; ctx.fillRect(0, 0, vw, vh);
    }
    if (this.vignette) ctx.drawImage(this.vignette, 0, 0);
    this.drawLabels(ctx, cam);
  }
  drawLabels(_ctx, cam) {
    // Texte werden auf einer hochauflösenden Overlay-Ebene gezeichnet, damit sie scharf bleiben
    const g = this.g, p = g.player, o = g.octx; if (!o) return;
    const k = g.scale * (g.dpr || 1);
    o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, g.overlay.width, g.overlay.height);
    o.setTransform(k, 0, 0, k, 0, 0);
    o.textAlign = 'center'; o.textBaseline = 'alphabetic';
    const fs = 13 / g.scale;
    if (!(g.state.world.memoryMode && g.world.id === 'farnlager')) for (const n of g.world.npcs) {
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d > 70) continue;
      const x = n.x - cam.ix, y = n.y - cam.iy - 33;
      o.globalAlpha = Math.min(1, (70 - d) / 20);
      o.font = `600 ${fs}px "Alegreya Sans", sans-serif`;
      o.lineWidth = 3 / g.scale; o.strokeStyle = 'rgba(10,6,16,0.9)'; o.strokeText(n.name, x, y);
      o.fillStyle = '#f6dc8c'; o.fillText(n.name, x, y);
      o.globalAlpha = 1;
    }
    const tg = g.interactTarget;
    if (tg && !g.ui.blocksGame()) {
      const x = tg.x - cam.ix, y = tg.y - cam.iy - 8 + Math.sin(this.t * 4) * 1.2;
      const key = (g.input.bindings.interact || 'KeyE').replace('Key', '');
      o.font = `500 ${fs}px "Alegreya Sans", sans-serif`;
      const tw = o.measureText(tg.label).width, kw = 14 / g.scale, pad = 5 / g.scale, h = 18 / g.scale;
      const w = tw + kw + pad * 3, x0 = x - w / 2, y0 = y - h;
      o.fillStyle = 'rgba(20,12,24,0.88)'; o.fillRect(x0, y0, w, h);
      o.fillStyle = '#c09040'; o.fillRect(x0, y0, w, 1 / g.scale); o.fillRect(x0, y0 + h - 1 / g.scale, w, 1 / g.scale);
      o.fillStyle = '#f6dc8c'; o.fillRect(x0 + pad, y0 + 2 / g.scale, kw, h - 4 / g.scale);
      o.fillStyle = '#1a1020'; o.font = `700 ${11 / g.scale}px sans-serif`; o.fillText(key, x0 + pad + kw / 2, y0 + h - 5 / g.scale);
      o.textAlign = 'left'; o.fillStyle = '#efe3c8'; o.font = `500 ${fs}px "Alegreya Sans", sans-serif`; o.fillText(tg.label, x0 + pad * 2 + kw, y0 + h - 5 / g.scale);
      o.textAlign = 'center';
    }
  }
}
