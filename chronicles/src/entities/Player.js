// Spielfigur: 8-Richtungs-Bewegung mit Beschleunigung, Sprint, Ausweichrolle (kostet Ausdauer) und Schlag.
import { getCharFrame } from '../art/characterArt.js';
import { audio } from '../engine/Audio.js';

const DIRS = ['right', 'down', 'left', 'up'];

export class Player {
  constructor(game) {
    this.game = game;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.dir = 'down'; this.face = { x: 0, y: 1 };
    this.anim = 0; this.frame = 0; this.moving = false;
    this.dodgeT = 0; this.dodgeCd = 0; this.atkT = 0; this.atkCd = 0;
    this.stepT = 0; this.blinkT = 2 + Math.random() * 3;
    this.w = 10; this.h = 6;
  }
  get app() { return this.game.state.world.memoryMode ? this.game.memoryApp : this.game.state.player.app; }
  get weaponType() {
    if (this.game.state.memoryMode) return null;
    const w = this.game.inventory.equipped('weapon');
    return w ? w.def.wtype : null;
  }

  update(dt, input, blocked) {
    const S = this.game.state.player;
    const stats = this.game.stats();
    let ix = 0, iy = 0;
    if (!blocked) {
      if (input.isDown('left')) ix -= 1; if (input.isDown('right')) ix += 1;
      if (input.isDown('up')) iy -= 1; if (input.isDown('down')) iy += 1;
    }
    const len = Math.hypot(ix, iy) || 1; ix /= len; iy /= len;
    const wantMove = ix !== 0 || iy !== 0;
    const sprint = !blocked && wantMove && input.isDown('sprint') && S.st > 1 && !this.game.state.memoryMode;
    let speed = stats.speed * (sprint ? 1.6 : 1);
    if (this.game.state.memoryMode) speed *= 0.95;

    // Ausweichen
    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
    if (!blocked && input.wasPressed('dodge') && this.dodgeT <= 0 && this.dodgeCd <= 0 && !this.game.state.memoryMode) {
      if (S.st >= 20) {
        S.st -= 20; this.dodgeT = 0.28; this.dodgeCd = 0.45;
        const dx = wantMove ? ix : this.face.x, dy = wantMove ? iy : this.face.y;
        this.vx = dx * 230; this.vy = dy * 230;
        audio.sfx('dodge');
        if (S.foxy) { this.mist = 0.6; this.game.particles.burst(this.x, this.y - 10, 26, { color: ['#e8e4f0', '#c8c4d8', '#ffffff'], speed: 26, life: 0.9, size: 2, drag: 1.5 }); }
        else this.game.particles.burst(this.x, this.y - 2, 8, { color: ['#a8875a', '#836242'], speed: 30, life: 0.4 });
      } else this.game.ui.hud.flashBar('st');
    }

    if (this.dodgeT > 0) {
      this.dodgeT -= dt;
      this.vx *= Math.pow(0.02, dt); this.vy *= Math.pow(0.02, dt);
    } else {
      const ax = ix * speed, ay = iy * speed;
      const k = 1 - Math.pow(wantMove ? 0.0005 : 0.00002, dt);
      this.vx += (ax - this.vx) * k; this.vy += (ay - this.vy) * k;
      if (!wantMove && Math.hypot(this.vx, this.vy) < 4) { this.vx = 0; this.vy = 0; }
    }

    // Ausdauer
    if (sprint && Math.hypot(this.vx, this.vy) > 20) S.st = Math.max(0, S.st - 22 * dt);
    else if (this.dodgeT <= 0) S.st = Math.min(stats.maxSt, S.st + (wantMove ? 14 : 24) * dt);
    S.mp = Math.min(stats.maxMp, S.mp + 0.8 * dt);

    // Bewegung mit Kollision (achsengetrennt, mit Gleiten an Ecken)
    this.moveAxis(this.vx * dt, 0); this.moveAxis(0, this.vy * dt);

    if (wantMove) {
      this.face = { x: ix, y: iy };
      // Blickrichtung: dominante Achse, bei Diagonale horizontal
      if (Math.abs(ix) > 0.01 && Math.abs(ix) >= Math.abs(iy) - 0.05) this.dir = ix > 0 ? 'right' : 'left';
      else this.dir = iy > 0 ? 'down' : 'up';
    }
    this.moving = Math.hypot(this.vx, this.vy) > 12;
    this.anim += dt * (this.moving ? (sprint ? 13 : 9) : 2.2);
    if (this.moving) {
      this.stepT -= dt * (sprint ? 1.5 : 1);
      if (this.stepT <= 0) { this.stepT = 0.32; audio.sfx('step'); if (sprint) this.game.particles.burst(this.x, this.y, 2, { color: ['#97754e', '#6f5139'], speed: 14, life: 0.35, up: -6 }); }
    }
    this.blinkT -= dt; if (this.blinkT < -0.12) this.blinkT = 2 + Math.random() * 4;

    // Angriff (Linksklick)
    this.atkCd = Math.max(0, this.atkCd - dt);
    if (this.atkT > 0) this.atkT -= dt;
  }

  attack() {
    if (this.atkCd > 0 || this.dodgeT > 0 || this.game.state.memoryMode) return false;
    const S = this.game.state.player;
    if (S.st < 6) { this.game.ui.hud.flashBar('st'); return false; }
    S.st -= 6;
    const w = this.game.inventory.equipped('weapon');
    const spd = w ? (w.def.stats.spd || 1) : 1;
    this.atkT = 0.22; this.atkCd = 0.42 / spd;
    audio.sfx('swing');
    return true;
  }

  moveAxis(dx, dy) {
    if (!dx && !dy) return;
    const B = (x, y, w, h) => this.game.blockedAt(x, y, w, h);
    const nx = this.x + dx, ny = this.y + dy;
    if (!B(nx - this.w / 2, ny - this.h, this.w, this.h)) { this.x = nx; this.y = ny; return; }
    // Gleiten: kleine Ausweichbewegung senkrecht zur Achse
    for (const s of [1, -1, 2, -2, 3, -3]) {
      const ox = dy ? s : 0, oy = dx ? s : 0;
      if (!B(nx + ox - this.w / 2, ny + oy - this.h, this.w, this.h)) { this.x = nx + ox * 0.5; this.y = ny + oy * 0.5; return; }
    }
    if (dx) this.vx *= 0.3; if (dy) this.vy *= 0.3;
  }

  sprite() {
    let pose = 'idle', f = 0;
    if (this.atkT > 0) pose = 'atk';
    else if (this.moving) { pose = 'walk'; f = Math.floor(this.anim) % 4; }
    else { f = Math.floor(this.anim) % 2; if (this.blinkT < 0) pose = 'blink'; }
    return getCharFrame(this.app, this.dir, pose, f, this.weaponType);
  }

  draw(ctx, cam) {
    const x = Math.round(this.x - cam.ix), y = Math.round(this.y - cam.iy);
    // Schatten
    ctx.fillStyle = 'rgba(12,8,20,0.35)';
    ctx.beginPath(); ctx.ellipse(x, y, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    const spr = this.sprite();
    this.mist = Math.max(0, (this.mist || 0) - 1 / 60);
    if (this.mist > 0) ctx.globalAlpha = 0.35 + (0.6 - this.mist);
    if (this.dodgeT > 0 && !this.mist) {
      ctx.globalAlpha = 0.35; ctx.drawImage(spr, x - 12 - Math.round(this.vx * 0.04), y - 30 - Math.round(this.vy * 0.04)); ctx.globalAlpha = 1;
    }
    ctx.drawImage(spr, x - 12, y - 30 + (this.dodgeT > 0 ? -2 : 0));
    ctx.globalAlpha = 1;
    // Stiller Zauber: Foxys Augen leuchten kurz auf – sonst keine Geste
    if (this.game.castGlow > 0 && this.game.state.player.foxy && !this.game.state.world.memoryMode) {
      ctx.fillStyle = `rgba(232,200,255,${Math.min(1, this.game.castGlow * 2)})`;
      const ey = y - 30 + 13;
      if (this.dir === 'down') { ctx.fillRect(x - 12 + 8, ey, 2, 2); ctx.fillRect(x - 12 + 14, ey, 2, 2); }
      else if (this.dir !== 'up') { const ex = this.dir === 'right' ? x - 12 + 15 : x - 12 + 7; ctx.fillRect(ex, ey, 2, 2); }
      ctx.fillStyle = `rgba(190,140,255,${0.3 * this.game.castGlow})`; ctx.fillRect(x - 8, ey - 2, 16, 5);
    }
    // Schlag-Effekt (Bogen)
    if (this.atkT > 0) {
      const t = 1 - this.atkT / 0.22;
      const ang = Math.atan2(this.face.y, this.face.x);
      ctx.strokeStyle = `rgba(255,248,225,${0.85 * (1 - t)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y - 12, 14, ang - 1.2 + t * 1.6 - 0.8, ang - 1.2 + t * 1.6 + 0.4); ctx.stroke();
      ctx.strokeStyle = `rgba(200,180,255,${0.5 * (1 - t)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y - 12, 17, ang - 1.2 + t * 1.6 - 0.6, ang - 1.2 + t * 1.6 + 0.3); ctx.stroke();
    }
  }
}
