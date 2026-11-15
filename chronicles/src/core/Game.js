// Zentrale Spielklasse: Zustände (Menü / Spiel), Hauptschleife, Systeme, Interaktionen, Speichern.
import { Input } from '../engine/Input.js';
import { Camera } from '../engine/Camera.js';
import { Particles } from '../engine/Particles.js';
import { DayNight, Lighting } from '../engine/Lighting.js';
import { audio } from '../engine/Audio.js';
import { EventBus } from './EventBus.js';
import { t, L, setLang, getLang } from './i18n.js';
import { WorldMap, TS } from '../world/WorldMap.js';
import { FARNLAGER } from '../world/maps/farnlager.js';
import { WorldRenderer } from '../world/WorldRenderer.js';
import { Overworld } from '../world/Overworld.js';
import { Crypt, CW, CHH } from '../world/Crypt.js';
import { M as MAT } from '../world/WorldGen.js';
import { Player } from '../entities/Player.js';
import { NPC } from '../entities/NPC.js';
import { Inventory } from '../systems/Inventory.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { GameAPI } from '../systems/GameAPI.js';
import { SaveManager } from '../save/SaveManager.js';
import { NPCS, SIGN_TEXT } from '../data/npcs.js';
import { ITEMS } from '../data/items.js';
import { CLASSES, SPECIES, BASE_ATTR, derived, xpForLevel, FOXY_YOUNG } from '../data/characters.js';
import { UIManager } from '../ui/UIManager.js';

export const DEFAULT_SETTINGS = { lang: 'de', master: 0.8, music: 0.5, sfx: 0.8, scale: 'auto', fps: false, particles: true, shake: true, bindings: null };

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.overlay = document.getElementById('overlay'); this.octx = this.overlay ? this.overlay.getContext('2d') : null;
    this.events = new EventBus();
    this.input = new Input(canvas);
    this.cam = new Camera();
    this.particles = new Particles();
    this.day = new DayNight();
    this.lighting = new Lighting();
    this.saves = new SaveManager();
    this.settings = { ...DEFAULT_SETTINGS };
    this.meta = { unlocks: {} };
    this.mode = 'boot';
    this.paused = false;
    this.api = new GameAPI(this);
    this.ui = new UIManager(this, uiRoot);
    this.memoryApp = FOXY_YOUNG;
    this.fps = 60; this._fpsAcc = 0; this._fpsN = 0;
    this.last = performance.now();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  async boot() {
    const mode = await this.saves.init();
    const s = await this.saves.getMeta('settings', null);
    if (s) this.settings = { ...DEFAULT_SETTINGS, ...s };
    else { try { if ((localStorage.getItem('glutwerk-lang') || '').toLowerCase().startsWith('en')) this.settings.lang = 'en'; } catch (e) { /* ignorieren */ } }
    this.meta.unlocks = await this.saves.getMeta('unlocks', {}) || {};
    this.applySettings();
    this.ui.init();
    if (mode === 'local') this.ui.toast(t('storageFallback'), 'warn', 6);
    if (mode === 'memory') this.ui.toast(t('storageNone'), 'warn', 8);
    this.toMenu();
    requestAnimationFrame(ts => this.frame(ts));
  }

  applySettings() {
    setLang(this.settings.lang);
    audio.setVolume({ master: this.settings.master, music: this.settings.music, sfx: this.settings.sfx });
    this.input.setBindings(this.settings.bindings);
    this.resize();
  }
  async saveSettings() { this.applySettings(); await this.saves.setMeta('settings', this.settings); }

  resize() {
    const W = window.innerWidth, H = window.innerHeight;
    let s = this.settings.scale === 'auto' ? Math.max(2, Math.floor(Math.min(W / 400, H / 230))) : +this.settings.scale;
    s = Math.max(1, s);
    this.scale = s;
    const cw = Math.ceil(W / s), ch = Math.ceil(H / s);
    this.canvas.width = cw; this.canvas.height = ch;
    this.canvas.style.width = cw * s + 'px'; this.canvas.style.height = ch * s + 'px';
    this.ctx.imageSmoothingEnabled = false;
    this.cam.resize(cw, ch); this.lighting.resize(cw, ch);
    if (this.overlay) { const dpr = window.devicePixelRatio || 1; this.overlay.width = W * dpr; this.overlay.height = H * dpr; this.overlay.style.width = W + 'px'; this.overlay.style.height = H + 'px'; this.dpr = dpr; }
    if (this.renderer) this.renderer.resize(cw, ch);
  }

  // ---------- Zustände ----------
  toMenu() {
    this.mode = 'menu'; this.paused = false;
    if (this.octx) this.octx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    this.ui.showMainMenu();
    audio.setMusic(true, 'menu');
  }

  newGame(c) {
    const cls = CLASSES[c.cls], sp = SPECIES[c.species];
    const attrs = c.attrs ? { ...c.attrs } : {};
    if (!c.attrs) for (const k in BASE_ATTR) attrs[k] = BASE_ATTR[k] + (sp.mod[k] || 0) + (cls.mod[k] || 0);
    const st = {
      version: 1,
      player: { name: c.name, app: c.app, species: c.species, cls: c.cls, foxy: !!c.foxy, attrs, level: 1, xp: 0, points: 0, hp: 0, mp: 0, st: 0, x: FARNLAGER.spawn[0] * TS, y: FARNLAGER.spawn[1] * TS, dir: 'up' },
      world: { collected: {}, opened: {}, cut: {}, memLit: {} },
      flags: {}, time: 8.2, playtime: 0, discovered: null,
    };
    const inv = { slots: [], equip: { weapon: cls.weapon, armor: cls.armor, trinket: null }, hotbar: [cls.weapon, null, 'heiltrank', 'apfel'], gold: 25 };
    inv.slots = [{ id: 'heiltrank', n: 2 }, { id: 'apfel', n: 3 }, { id: 'brot', n: 1 }];
    this.startWorld(st, inv, null);
    const d = this.stats(); st.player.hp = d.maxHp; st.player.mp = d.maxMp; st.player.st = d.maxSt;
    this.quests.start('main_erwachen', true);
    this.ui.banner(L(FARNLAGER.name), t('controlsHint'), 'region', 6);
    setTimeout(() => { if (this.mode === 'play' && this.state === st && !st.world.memoryMode) this.ui.banner(t('newQuest'), L({ de: 'Das Erwachen', en: 'The Awakening' }), 'quest'); }, 4200);
  }

  async loadGame(slot) {
    try {
      const d = await this.saves.load(slot);
      this.startWorld(d, d.inventory, d.quests);
      this.ui.toast(L({ de: 'Spielstand geladen.', en: 'Game loaded.' }), 'info');
      return true;
    } catch (e) {
      this.ui.toast(t('loadError', { e: e.message || e }), 'error', 6); audio.sfx('error');
      return false;
    }
  }

  startWorld(state, invData, questData) {
    this.state = state;
    state.world = state.world || {}; state.world.memoryMode = false;
    state.flags = state.flags || {};
    state.ow = state.ow || {}; for (const k of ['collected', 'opened', 'cut', 'tele']) state.ow[k] = state.ow[k] || {};
    state.player.map = state.player.map || 'farnlager';
    this.maps = {}; this.fog = {};
    this.renderer = new WorldRenderer(this);
    this.renderer.resize(this.cam.w, this.cam.h);
    this.inventory = new Inventory(this, invData);
    this.quests = new QuestSystem(this, questData);
    this.player = new Player(this);
    this.loadFog('farnlager', state.discovered); this.loadFog('world', state.discoveredOw);
    this.setMap(state.player.map);
    this.player.x = state.player.x; this.player.y = state.player.y; this.player.dir = state.player.dir || 'down';
    this.day.time = state.time ?? 8.5;
    this.particles.list.length = 0;
    this.world.update(0);
    this.cam.follow(this.player.x, this.player.y, this.world.pw, this.world.ph, 1, true);
    this.mode = 'play'; this.paused = false;
    this.autosaveT = 150; this.discoverT = 0; this.region = null; this.interactTarget = null; this.mapCooldown = 1;
    this.spells = []; this.orb = null; this.gt = 0; this.veils = {}; this.veilWaves = []; this._ghosts = [];
    this.ui.showHUD();
    audio.setMusic(true, 'forest');
    this.events.emit('inventory'); this.events.emit('quests');
  }

  // ---------- Karten ----------
  getMap(id) {
    if (!this.maps[id]) {
      if (id === 'farnlager') { const w = new WorldMap(FARNLAGER, this.state.world); w.npcs = FARNLAGER.npcs.map(n => new NPC(this, n.id, NPCS[n.id], n.x, n.y)); this.maps[id] = w; }
      else if (id.startsWith('crypt:')) this.maps[id] = new Crypt(this, id.slice(6));
      else this.maps[id] = new Overworld(this, this.state.ow);
    }
    return this.maps[id];
  }
  setMap(id) { this.world = this.getMap(id); this.state.player.map = id; if (!this.fog[id]) this.loadFog(id); audio.setMusic(true, this.world.indoor ? 'memory' : 'forest'); }
  get discovered() { return this.fog[this.world.id]; }
  fogDims(id) { if (id.startsWith('crypt:')) return { w: CW, h: CHH, c: 1 }; return id === 'farnlager' ? { w: 80, h: 60, c: 1 } : { w: 250, h: 175, c: 4 }; }
  loadFog(id, b64) {
    const d = this.fogDims(id), a = new Uint8Array(d.w * d.h);
    if (b64) try { const b = atob(b64); for (let i = 0; i < b.length && i < a.length; i++) a[i] = b.charCodeAt(i); } catch (e) { /* ignorieren */ }
    this.fog[id] = a;
  }
  fogB64(id) { const a = this.fog[id]; let bin = ''; for (let i = 0; i < a.length; i++) bin += String.fromCharCode(a[i]); return btoa(bin); }
  travel(id, place, label) {
    const first = !this.maps[id];
    this.mapCooldown = 3;
    this.ui.fade(1.2, () => {
      this.setMap(id);
      const pos = typeof place === 'function' ? place(this.world) : place;
      this.player.x = pos[0]; this.player.y = pos[1];
      this.world.update(0);
      this.cam.follow(this.player.x, this.player.y - 10, this.world.pw, this.world.ph, 1, true);
      this.particles.list.length = 0; this.region = null; this.mapCooldown = 1.5;
      this.ui.hud.build();
      if (label) this.ui.banner(label[0], label[1], 'region', 4);
    }, first ? t('loading') : null);
  }
  checkMapExits() {
    if (this.mapCooldown > 0 || this.ui.blocksGame()) return;
    const W = this.world, p = this.player;
    if (W.id === 'farnlager' && W.def.exit && !this.state.world.memoryMode) {
      const e = W.def.exit;
      if (p.y > e.y * TS && p.x > e.x0 * TS && p.x < e.x1 * TS) this.travel('world', w => w.findWalkable(w.entrance.x / TS, w.entrance.y / TS + 3), [L({ de: 'Thyrvenna', en: 'Thyrvenna' }), L({ de: 'Fennwyrd · Laternenbrücke', en: 'Fennwyrd · Lantern Bridge' })]);
    } else if (W.id === 'world' && W.entrance) {
      if (Math.hypot(p.x - W.entrance.x, p.y - W.entrance.y) < 14) this.travel('farnlager', [40.5 * TS, 56 * TS], [L({ de: 'Das Farnlager', en: 'The Fern Camp' }), '']);
    }
  }

  // Kollision inkl. NPCs (in Erinnerungen sind keine NPCs da)
  blockedAt(x, y, w, h) {
    if (this.world.blocked(x, y, w, h)) return true;
    if (!(this.state.world.memoryMode && this.world.id === 'farnlager')) for (const n of this.world.npcs) if (x < n.x + 5 && x + w > n.x - 5 && y < n.y && y + h > n.y - 5) return true;
    return false;
  }

  stats() {
    const P = this.state.player;
    const bonus = {};
    for (const k of ['weapon', 'armor', 'trinket']) { const e = this.inventory?.equipped(k); if (e && e.def.stats) for (const s in e.def.stats) bonus[s] = (bonus[s] || 0) + e.def.stats[s]; }
    return { ...derived(P.attrs, P.level, bonus), armor: bonus.armor || 0, dmg: bonus.dmg || 0 };
  }

  addXp(n) {
    const P = this.state.player; P.xp += n;
    this.ui.toast(`+${n} XP`, 'xp');
    while (P.xp >= xpForLevel(P.level)) {
      P.xp -= xpForLevel(P.level); P.level++; P.points += 3;
      const d = this.stats(); P.hp = d.maxHp; P.mp = d.maxMp; P.st = d.maxSt;
      this.ui.banner(t('levelUp', { n: P.level }), L({ de: '+3 Attributpunkte (Charakter: C)', en: '+3 attribute points (Character: C)' }), 'level');
      audio.sfx('level');
      this.particles.burst(this.player.x, this.player.y - 14, 40, { color: ['#f6dc8c', '#ffffff', '#e0b85a'], speed: 60, life: 1, up: -20, glow: true });
    }
    this.events.emit('player');
  }

  serialize() {
    const P = this.state.player;
    if (!this.state.world.memoryMode) { P.x = this.player.x; P.y = this.player.y; P.dir = this.player.dir; }
    const reg = this.world.regionAt(P.x, P.y);
    return {
      player: JSON.parse(JSON.stringify(P)),
      world: JSON.parse(JSON.stringify({ ...this.state.world, memoryMode: false, memLit: this.state.world.memoryMode ? {} : this.state.world.memLit })),
      ow: JSON.parse(JSON.stringify(this.state.ow)),
      flags: { ...this.state.flags }, time: this.day.time, playtime: this.state.playtime,
      discovered: this.fogB64('farnlager'), discoveredOw: this.fogB64('world'), inventory: this.inventory.serialize(), quests: this.quests.serialize(),
      region: reg ? reg.name : FARNLAGER.name,
    };
  }
  async save(slot, silent = false) {
    if (this.state.world.memoryMode) { this.ui.toast(t('cantUseNow'), 'warn'); return false; }
    try {
      await this.saves.save(slot, this.serialize());
      if (!silent) { this.ui.toast(t('saved'), 'info'); audio.sfx('save'); }
      else this.ui.toast(t('autosaved'), 'info', 2);
      return true;
    } catch (e) {
      this.ui.toast(t('saveError', { e: e.message || e }), 'error', 6); audio.sfx('error');
      return false;
    }
  }
  async unlock(key) {
    this.meta.unlocks[key] = true;
    await this.saves.setMeta('unlocks', this.meta.unlocks);
  }

  // ---------- Hauptschleife ----------
  frame(ts) {
    const dt = Math.min(0.05, (ts - this.last) / 1000); this.last = ts;
    this._fpsAcc += dt; this._fpsN++;
    if (this._fpsAcc > 0.5) { this.fps = Math.round(this._fpsN / this._fpsAcc); this._fpsAcc = 0; this._fpsN = 0; }
    try {
      if (this.mode === 'play') { if (!this.paused) this.update(dt); this.render(dt); }
      else this.ui.updateMenu(dt);
      this.ui.update(dt);
    } catch (e) { console.error(e); this.ui.toast('Fehler: ' + e.message, 'error', 6); this.paused = true; }
    this.input.endFrame();
    requestAnimationFrame(t2 => this.frame(t2));
  }

  update(dt) {
    const S = this.state, inp = this.input, mem = S.world.memoryMode;
    S.playtime += dt;
    if (!mem) this.day.update(dt);
    const blocked = this.ui.blocksGame();
    this.world.update(dt);
    this.player.update(dt, inp, blocked);
    if (!mem) for (const n of this.world.npcs) n.update(dt, this.day.hour);
    this.mapCooldown = Math.max(0, (this.mapCooldown || 0) - dt);
    this.checkMapExits();
    this.updateSpells(dt, inp, blocked);
    this.updateVeils(dt);
    this.particles.update(dt);
    this.spawnAmbientParticles(dt);
    this.cam.follow(this.player.x, this.player.y - 10, this.world.pw, this.world.ph, dt);

    // Interaktion
    this.interactTarget = blocked ? null : this.findInteract();
    if (!blocked) {
      if (inp.wasPressed('interact') && this.interactTarget) this.interact(this.interactTarget);
      if (inp.mouse.leftPressed && !this.ui.pointerOverUI) this.doAttack();
      if (inp.mouse.rightPressed && !this.ui.pointerOverUI && !mem) { if (this.state.player.foxy) this.castMoonspring(); else if (!this._rmbT || performance.now() - this._rmbT > 3000) { this.ui.toast(t('rmbSoon'), 'info', 2); this._rmbT = performance.now(); } }
      if (inp.wasPressed('spell') && !mem && this.state.player.foxy) this.castMoonlight();
      if (inp.wasPressed('veil') && !mem) this.castVeil();
      for (let i = 0; i < 10; i++) if (inp.codePressed('Digit' + ((i + 1) % 10))) this.api.useHotbar(i);
    }
    // Menütasten funktionieren auch bei offenem Spielmenü (Tabs wechseln / schließen)
    if (!mem && !this.ui.dialogue.open && !this.ui.fading && (!this.ui.stack.length || this.ui.stack[this.ui.stack.length - 1].tab)) {
      for (const k of ['inventory', 'character', 'skills', 'quests', 'map']) if (inp.wasPressed(k)) this.ui.openMenu(k);
    }
    if (inp.wasPressed('pause')) this.ui.escape();

    // Entdecken
    this.discoverT -= dt;
    if (this.discoverT <= 0 && !mem) {
      this.discoverT = 0.25;
      const fd = this.fogDims(this.world.id), c = fd.c;
      const tx = this.player.x / TS / c | 0, ty = this.player.y / TS / c | 0, R = Math.ceil(9 / c);
      for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) if (x * x + y * y <= R * R) {
        const X = tx + x, Y = ty + y; if (X >= 0 && Y >= 0 && X < fd.w && Y < fd.h) this.discovered[Y * fd.w + X] = 1;
      }
      const reg = this.world.regionAt(this.player.x, this.player.y);
      if (reg && (!this.region || reg.id !== this.region.id) && !S.flags['reg_' + reg.id]) { S.flags['reg_' + reg.id] = 1; this.ui.banner(t('discovered'), L(reg.name), 'region', 3); }
      this.region = reg;
    }
    // Ambient-Lautstärken
    if (this.world.campfire) { const d = Math.hypot(this.player.x - this.world.campfire.x, this.player.y - this.world.campfire.y); audio.ambient.fire = Math.max(0, 1 - d / 140); }
    else audio.ambient.fire = 0;
    if (this.world.id === 'farnlager') {
      const dr = Math.abs(this.player.y - 47 * TS); audio.ambient.water = Math.max(0, 1 - dr / 120);
      const dg = Math.hypot(this.player.x - 40 * TS, this.player.y - 14 * TS); audio.ambient.magic = Math.max(0, 1 - dg / 160);
    } else if ((this._ambT = (this._ambT || 0) - dt) <= 0) {
      this._ambT = 0.5; let wc = 0;
      for (let y = -4; y <= 4; y += 2) for (let x = -4; x <= 4; x += 2) { const m = this.world.matAt(this.player.x + x * TS, this.player.y + y * TS); if (m === MAT.SEA || m === MAT.SHALLOW || m === MAT.WATER) wc++; }
      audio.ambient.water = Math.min(1, wc / 10); audio.ambient.magic = 0;
    }
    const dk = mem ? 0.7 : this.day.darkness; audio.ambient.day = 1 - dk * 1.3; audio.ambient.night = dk;

    // Autosave
    this.autosaveT -= dt;
    if (this.autosaveT <= 0 && !mem && !this.ui.blocksGame()) { this.autosaveT = 180; this.save('auto', true); }
  }

  spawnAmbientParticles(dt) {
    if (!this.settings.particles) return;
    if (this.world.indoor) {
      const cam = this.cam; if (Math.random() < dt * 5) this.particles.spawn({ x: cam.x + Math.random() * cam.w, y: cam.y + Math.random() * cam.h, vx: (Math.random() - 0.5) * 3, vy: 2, life: 4, max: 4, color: '#8a7f96', drag: 0 });
      const W = this.world; if (W.circle && Math.random() < dt * 10) this.particles.spawn({ x: W.circle.x + (Math.random() - 0.5) * 50, y: W.circle.y + (Math.random() - 0.5) * 30, vx: 0, vy: -12, life: 1.6, max: 1.6, color: Math.random() < 0.5 ? '#c49af5' : '#ead9ff', glow: true, drag: 0.3 });
      return;
    }
    const cam = this.cam, P = this.particles;
    const dk = this.state.world.memoryMode ? 0.6 : this.day.darkness;
    // Glühwürmchen nachts
    if (dk > 0.3 && Math.random() < dt * 6) P.spawn({ type: 'firefly', x: cam.x + Math.random() * cam.w, y: cam.y + Math.random() * cam.h, vx: 0, vy: 0, life: 4, max: 4, color: '#e8ff9a', glow: true, drag: 1.5 });
    // Fallende Blätter
    if (Math.random() < dt * 1.2) P.spawn({ type: 'leaf', x: cam.x + Math.random() * cam.w, y: cam.y - 4, vy: 12 + Math.random() * 8, life: 6, max: 6, color: ['#76a64c', '#93bd5c', '#c09040'][Math.random() * 3 | 0], drag: 0 });
    // Funken vom Lagerfeuer, Kristallstaub
    const cf = this.world.campfire;
    if (cf && cam.visible(cf.x - 20, cf.y - 40, 40, 40) && Math.random() < dt * 14) P.spawn({ x: cf.x + (Math.random() - 0.5) * 8, y: cf.y - 14, vx: (Math.random() - 0.5) * 10, vy: -25 - Math.random() * 20, life: 1.2, max: 1.2, color: ['#ffb53a', '#ffe48a', '#f0801e'][Math.random() * 3 | 0], drag: 0.6, glow: true });
    for (const l of this.world.lights) {
      if (l.color[0] < 200 && l.color[2] > 200 && (!l.on || l.on()) && cam.visible(l.x - 30, l.y - 30, 60, 60) && Math.random() < dt * 2.2)
        P.spawn({ x: l.x + (Math.random() - 0.5) * 20, y: l.y + 8 + (Math.random() - 0.5) * 10, vx: 0, vy: -8 - Math.random() * 6, life: 2, max: 2, color: l.color[1] > 200 ? '#c6f0ea' : '#d6b8ff', drag: 0.3, glow: true });
    }
  }

  render(dt) {
    this.renderer.render(this.ctx, dt);
  }

  // ---------- Interaktion ----------
  findInteract() {
    const p = this.player; let best = null, bd = 1e9;
    const fx = p.x + p.face.x * 6, fy = p.y - 4 + p.face.y * 6;
    if (!(this.state.world.memoryMode && this.world.id === 'farnlager')) for (const n of this.world.npcs) {
      const d = Math.hypot(n.x - fx, n.y - fy); if (d < 24 && d < bd) { bd = d; best = { kind: 'npc', npc: n, x: n.x, y: n.y - 42, label: t('talk') }; }
    }
    for (const it of this.world.interactables) {
      if (it.when && !it.when()) continue;
      if (this.state.world.memoryMode && (it.kind !== 'lantern' || this.state.world.memLit[it.id])) continue;
      const d = Math.hypot(it.x - fx, it.y - fy); if (d < it.r && d < bd) {
        bd = d;
        const lbl = { pickup: t('take'), chest: t('open'), sign: t('read'), gate: t('examine'), altar: t('examine'), lantern: this.state.world.memoryMode ? t('light') : t('examine'), shrine: t('examine'), crate: t('examine'), dungeon: t('examine'), tele: t('examine'), ship: L({ de: 'Überfahrt', en: 'Passage' }), crypt: L({ de: 'Hinabsteigen', en: 'Descend' }), cryptchest: t('open') }[it.kind] || (it.label && L(it.label)) || t('interact');
        best = { kind: it.kind, it, x: it.x, y: it.obj.y - (it.obj.oy || 16) - 4, label: lbl };
      }
    }
    return best;
  }

  interact(tg) {
    const S = this.world.state, G = this.api, it = tg.it;
    switch (tg.kind) {
      case 'npc': this.ui.openDialogue(tg.npc); break;
      case 'pickup': {
        const left = this.inventory.add(it.item, 1);
        if (left) { this.ui.toast(t('invFull'), 'warn'); return; }
        (S.collected = S.collected || {})[it.id] = true; this.world.removeObject(it.obj);
        this.ui.toast(t('gotItem', { n: 1, item: L(ITEMS[it.item].name) }), 'item', 2.5, ITEMS[it.item].icon);
        audio.sfx('pickup');
        this.particles.burst(it.x, it.y, 10, { color: it.item === 'mondfarn' ? ['#c6f0ea', '#7cc4bf', '#fff'] : ['#f6dc8c', '#fff'], speed: 30, life: 0.6, up: -15, glow: true });
        this.quests.check();
        break;
      }
      case 'chest': {
        if (S.opened[it.id]) { this.ui.toast(L({ de: 'Die Truhe ist leer.', en: 'The chest is empty.' }), 'info'); return; }
        S.opened[it.id] = true; audio.sfx('chest');
        G.give('heiltrank', 2); G.give('lederweste', 1); G.give('eisenerz', 2); G.gold(30);
        this.particles.burst(it.x, it.y - 6, 24, { color: ['#f6dc8c', '#fff', '#e0b85a'], speed: 50, life: 0.8, up: -30, glow: true });
        break;
      }
      case 'sign': this.ui.toast(L(it.text || SIGN_TEXT), 'info', 5); break;
      case 'dungeon': {
        const p = it.place;
        this.ui.toast(`${p.n}: ${L({ de: p.t, en: (p.en && p.en.t) || p.t })}`, 'info', 7);
        setTimeout(() => this.ui.toast(L({ de: 'Der Eingang ist verschüttet. (Dungeons folgen in v0.5)', en: 'The entrance is blocked. (Dungeons arrive in v0.5)' }), 'warn', 4), 600);
        break;
      }
      case 'tele': this.useTele(it.place); break;
      case 'crypt': this.enterCrypt(it.place); break;
      case 'stairs': audio.sfx('click'); it.go(); break;
      case 'cryptchest': {
        if (S.opened[it.id]) { this.ui.toast(L({ de: 'Die Truhe ist leer.', en: 'The chest is empty.' }), 'info'); return; }
        S.opened[it.id] = true; audio.sfx('chest');
        const r = Math.random();
        G.gold(25 + (Math.random() * 40 | 0)); G.give(r < 0.5 ? 'manatrank' : 'heiltrank', 1 + (r * 2 | 0)); if (r > 0.6) G.give('glimmerbeere', 3);
        this.particles.burst(it.x, it.y - 6, 16, { color: ['#f6dc8c', '#ffffff'], speed: 40, life: 0.8, up: -20, glow: true });
        break;
      }
      case 'ship': this.useShip(it.port); break;
      case 'gate': {
        const q = this.quests.get('main_erwachen');
        if (S.gateOpen) { this.ui.toast(L({ de: 'Das Tor steht offen. Hinter dem Licht wartet ein Altar.', en: 'The gate stands open. An altar waits behind the light.' }), 'info'); return; }
        if (q.stage === 3 && this.inventory.count('farnbuendel')) this.openGateSequence(it);
        else this.ui.toast(L({ de: 'Das Tor ist versiegelt. Hinter dem Stein pulsiert violettes Licht wie ein Herzschlag.', en: 'The gate is sealed. Violet light pulses behind the stone like a heartbeat.' }), 'info', 4);
        break;
      }
      case 'altar': {
        if (S.shardTaken) { this.ui.toast(L({ de: 'Der Altar ist leer.', en: 'The altar is empty.' }), 'info'); return; }
        S.shardTaken = true; G.give('mondsplitter', 1);
        this.inventory.setHotbar(1, 'mondsplitter');
        audio.sfx('magic');
        this.particles.burst(it.x, it.y - 10, 40, { color: ['#c49af5', '#ead9ff', '#9a5fe0'], speed: 60, life: 1.2, up: -20, glow: true });
        this.quests.advance('main_erwachen', 5);
        break;
      }
      case 'lantern': {
        if (S.memoryMode) {
          if (S.memLit[it.id]) return;
          S.memLit[it.id] = true; audio.sfx('magic');
          this.particles.burst(it.x + 8, it.y - 20, 30, { color: ['#e8f4ff', '#b8dcff', '#ffffff'], speed: 40, life: 1, up: -10, glow: true });
          this.events.emit('quests');
          if (Object.keys(S.memLit).length >= 3) setTimeout(() => this.endMemory(), 1600);
        } else this.ui.toast(S.lanternsRestored ? L({ de: 'Die Mondlaterne brennt mit kühlem, ruhigem Licht.', en: 'The moon lantern burns with a cool, calm light.' }) : L({ de: 'Eine alte Mondlaterne. Das Glas ist kalt.', en: 'An old moon lantern. The glass is cold.' }), 'info');
        break;
      }
      case 'shrine': {
        if (S.shrine) { this.ui.toast(L({ de: 'Die Fuchsstatue blickt still in den Wald.', en: 'The fox statue gazes silently into the forest.' }), 'info'); return; }
        S.shrine = true; this.state.flags.shrine = 1;
        audio.sfx('magic');
        this.particles.burst(it.x, it.y - 12, 50, { color: ['#9de8ff', '#ffffff', '#e2541f'], speed: 50, life: 1.4, up: -20, glow: true });
        this.quests.start('secret_schrein', true); this.quests.complete('secret_schrein');
        this.unlock('foxy');
        setTimeout(() => this.ui.toast(L({ de: 'Ein leises Fuchslachen weht durch den Farn …', en: 'A soft vixen\'s laugh drifts through the fern …' }) + ' ' + t('secretUnlocked'), 'secret', 7), 1200);
        break;
      }
      case 'crate': {
        const q = this.quests.get('side_ladung');
        if (S.opened[it.id] || q.status === 'done') { this.ui.toast(L({ de: 'Nur noch Sand und ein Hauch Zimt.', en: 'Only sand and a hint of cinnamon left.' }), 'info'); return; }
        S.opened[it.id] = true;
        if (q.status === 'inactive') this.quests.start('side_ladung', false);
        G.give('tamsis_kiste', 1); this.quests.advance('side_ladung', 1); audio.sfx('pickup');
        break;
      }
    }
  }

  // ---------- Steinkreise & Schiffe ----------
  // ---------- Verborgene Ruinen & Schleierbruch ----------
  veilOpen(id) { const v = this.veils[id]; return !!v && v.until > this.gt; }
  veilAlpha(id) { const v = this.veils[id]; return v ? v.a : 0; }
  knowsVeil() { const P = this.state.player; return !!(P.foxy || (P.spells && P.spells.veil)); }
  castVeil() {
    if (!this.knowsVeil()) { if (!this._veilMsgT || performance.now() - this._veilMsgT > 3000) { this.ui.toast(L({ de: 'Du kennst diesen Zauber noch nicht.', en: "You don't know this spell yet." }), 'info', 2); this._veilMsgT = performance.now(); } return; }
    if ((this._veilCd || 0) > 0) return;
    const P = this.state.player;
    if (P.mp < 12) { this.ui.hud.flashBar('mp'); return; }
    P.mp -= 12; this._veilCd = 2; this.castGlow = 0.8; this.events.emit('player');
    audio.sfx('magic');
    const px = this.player.x, py = this.player.y;
    this.veilWaves.push({ x: px, y: py - 6, t: 0 });
    if (!P.foxy) this.particles.burst(px, py - 20, 14, { color: ['#c49af5', '#ead9ff'], speed: 30, life: 0.8, up: -20, glow: true });
    if (this.world.id !== 'world') return;
    const W = this.world; let best = null, bd = 1e9;
    for (const tp of W.settle.teles) {
      const p = tp.place, d = Math.hypot(p.x * TS - px, p.y * TS - py);
      if (d < 11 * TS) {
        this.veils[p.id] = { until: this.gt + 24, a: this.veilAlpha(p.id) };
        for (const k of W.veilColliders(p.id)) { const b = this.playerBox(); if (b[0] < k.x + k.w && b[0] + b[2] > k.x && b[1] < k.y + k.h && b[1] + b[3] > k.y) { k.ghost = true; this._ghosts.push(k); } }
        if (!this.state.flags['ruin_' + p.id]) {
          this.state.flags['ruin_' + p.id] = 1;
          setTimeout(() => { audio.sfx('memory'); this.ui.toast(L({ de: 'Der Schleier zerreißt – eine verborgene Ruine!', en: 'The veil tears – a hidden ruin!' }), 'secret', 4); }, 500);
        }
        return;
      }
      if (d < bd && d < 110 * TS) { bd = d; best = p; }
    }
    // nichts in der Nähe: der Zauber zieht leicht in Richtung der nächsten Ruine
    if (best) {
      const a = Math.atan2(best.y * TS - py, best.x * TS - px);
      for (let i = 0; i < 18; i++) setTimeout(() => this.particles.spawn({ x: px + (Math.random() - 0.5) * 8, y: py - 14 + (Math.random() - 0.5) * 8, vx: Math.cos(a) * (50 + Math.random() * 30), vy: Math.sin(a) * (50 + Math.random() * 30), life: 1.4, max: 1.4, color: Math.random() < 0.5 ? '#c49af5' : '#ead9ff', glow: true, drag: 0.6 }), i * 40);
    }
  }
  // Ruinenmauern blockieren nur, solange der Schleier offen ist – und nie, wenn man gerade darin steht
  veilPass(k) { if (!this.veilOpen(k.veil) || k.ghost) return true; const b = this.playerBox(); return b[0] < k.x + k.w && b[0] + b[2] > k.x && b[1] < k.y + k.h && b[1] + b[3] > k.y; }
  playerBox() { const p = this.player; return [p.x - p.w / 2, p.y - p.h, p.w, p.h]; }
  updateVeils(dt) {
    this.gt += dt; this._veilCd = Math.max(0, (this._veilCd || 0) - dt);
    for (const id in this.veils) {
      const v = this.veils[id], open = v.until > this.gt;
      v.a = open ? Math.min(1, v.a + dt * 1.4) : Math.max(0, v.a - dt * 0.5);
      if (open && v.a > 0.2 && v.until - this.gt < 4 && Math.random() < dt * 6 && this.world.id === 'world') { const p = this.world.places.find(q => q.id === id); if (p) this.particles.spawn({ x: p.x * TS + (Math.random() - 0.5) * 140, y: p.y * TS + (Math.random() - 0.5) * 100, vx: 0, vy: -8, life: 1, max: 1, color: '#c49af5', glow: true }); }
      if (!open && v.a <= 0) delete this.veils[id];
    }
    if (this._ghosts.length) { const b = this.playerBox(); this._ghosts = this._ghosts.filter(k => { const o = b[0] < k.x + k.w && b[0] + b[2] > k.x && b[1] < k.y + k.h && b[1] + b[3] > k.y; if (!o) k.ghost = false; return o; }); }
    for (const w of this.veilWaves) w.t += dt;
    this.veilWaves = this.veilWaves.filter(w => w.t < 1.1);
  }
  enterCrypt(place) {
    this.state.flags['ruin_' + place.id] = 1;
    audio.sfx('click');
    this.travel('crypt:' + place.id, w => w.spots.top, null);
  }
  leaveCrypt(place) {
    this.travel('world', w => { this.veils[place.id] = { until: this.gt + 3, a: 1 }; return w.findWalkable(place.x, place.y + 3); }, null);
  }

  useTele(place) {
    const S = this.world.state, W = this.world;
    if (!S.tele[place.id]) {
      S.tele[place.id] = true; audio.sfx('magic');
      this.particles.burst(place.x * TS, place.y * TS - 8, 50, { color: ['#d6b8ff', '#ffffff', '#9a5fe0'], speed: 60, life: 1.2, up: -20, glow: true });
      this.ui.toast(L({ de: 'Ein verborgener Teleportzirkel erwacht unter deinen Füßen.', en: 'A hidden teleport circle awakens beneath your feet.' }), 'secret', 4);
    }
    const links = (place.links || []).map(id => W.places.find(p => p.id === id)).filter(Boolean);
    if (!links.length) { this.ui.toast(L({ de: 'Die Runen bleiben kalt.', en: 'The runes stay cold.' }), 'info'); return; }
    this.ui.choice(L({ de: place.n, en: (place.en && place.en.n) || place.n }), L({ de: 'Die Runen flüstern einen Ort.', en: 'The runes whisper a place.' }), links.map(l => ({
      label: L({ de: 'Reisen: ', en: 'Travel: ' }) + L({ de: l.n, en: (l.en && l.en.n) || l.n }),
      action: () => { S.tele[l.id] = true; audio.sfx('memory'); this.travel('crypt:' + l.id, w => w.spots.tele, [L({ de: 'Teleportzirkel', en: 'Teleport circle' }), L({ de: l.n, en: (l.en && l.en.n) || l.n })]); },
    })));
  }
  useShip(port) {
    const W = this.world, dests = W.routes(port), cost = 8;
    if (!dests.length) return;
    const name = id => { const p = W.places.find(q => q.id === id); return p ? L({ de: p.n, en: (p.en && p.en.n) || p.n }) : id; };
    this.ui.choice(L({ de: 'Überfahrt', en: 'Passage' }), L({ de: `Ein Platz an Bord kostet ${cost} Gold.`, en: `A place on board costs ${cost} gold.` }), dests.map(d => ({
      label: `${name(d)} · ${cost} ${t('gold')}`,
      action: () => {
        if (this.inventory.gold < cost) { this.ui.toast(t('notEnoughGold'), 'warn'); audio.sfx('error'); return; }
        this.inventory.gold -= cost; this.inventory.changed(); audio.sfx('coin');
        const land = W.settle.ports[d].land;
        this.travel('world', w => w.findWalkable(land[0], land[1]), [L({ de: 'Überfahrt', en: 'Passage' }), name(d)]);
      },
    })));
  }

  // ---------- Foxys stiller Zauber ----------
  mouseWorld() { return [this.input.mouse.x / this.scale + this.cam.ix, this.input.mouse.y / this.scale + this.cam.iy]; }
  castMoonspring() {
    const P = this.state.player;
    if ((this._springCd || 0) > 0) { this.ui.toast(L({ de: 'Die Mondquelle sammelt noch Kraft.', en: 'The moonspring is still gathering strength.' }), 'info', 1.5); return; }
    if (P.mp < 15) { this.ui.hud.flashBar('mp'); return; }
    let [mx, my] = this.mouseWorld();
    const d = Math.hypot(mx - this.player.x, my - this.player.y);
    if (d > 80) { mx = this.player.x + (mx - this.player.x) / d * 80; my = this.player.y + (my - this.player.y) / d * 80; }
    if (this.world.blocked(mx - 4, my - 4, 8, 4)) { mx = this.player.x + this.player.face.x * 18; my = this.player.y + this.player.face.y * 14 + 4; }
    P.mp -= 15; this._springCd = 8; this.castGlow = 0.8;
    this.spells.push({ type: 'spring', x: mx, y: my, t: 9, max: 9 });
    audio.sfx('magic');
    this.particles.burst(mx, my - 4, 30, { color: ['#bfe8ff', '#ffffff', '#7ad0e8'], speed: 40, life: 0.9, up: -25, glow: true });
  }
  castMoonlight() {
    const P = this.state.player;
    if (this.orb) { this.orb = null; return; }
    if (P.mp < 10) { this.ui.hud.flashBar('mp'); return; }
    P.mp -= 10; this.castGlow = 0.8;
    this.orb = { x: this.player.x, y: this.player.y - 26, t: 90 };
    audio.sfx('magic');
  }
  updateSpells(dt) {
    this._springCd = Math.max(0, (this._springCd || 0) - dt);
    this.castGlow = Math.max(0, (this.castGlow || 0) - dt);
    const P = this.state.player, st = this.stats();
    for (const sp of this.spells) {
      sp.t -= dt;
      if (Math.hypot(this.player.x - sp.x, this.player.y - sp.y) < 30) P.hp = Math.min(st.maxHp, P.hp + 6 * dt);
      if (Math.random() < dt * 8) this.particles.spawn({ x: sp.x + (Math.random() - 0.5) * 20, y: sp.y - 2, vx: 0, vy: -14 - Math.random() * 10, life: 1.2, max: 1.2, color: Math.random() < 0.5 ? '#e8fbff' : '#9ad8f0', glow: true, drag: 0.4 });
    }
    this.spells = this.spells.filter(s => s.t > 0);
    if (this.orb) {
      const o = this.orb; o.t -= dt;
      const tx = this.player.x - this.player.face.x * 14, ty = this.player.y - 30;
      o.x += (tx - o.x) * Math.min(1, dt * 3); o.y += (ty + Math.sin(performance.now() / 400) * 3 - o.y) * Math.min(1, dt * 3);
      if (Math.random() < dt * 10) this.particles.spawn({ x: o.x + (Math.random() - 0.5) * 4, y: o.y + (Math.random() - 0.5) * 4, vx: (Math.random() - 0.5) * 6, vy: 4, life: 0.8, max: 0.8, color: '#eef6ff', glow: true, drag: 1 });
      if (o.t <= 0) this.orb = null;
    }
  }
  drawGroundEffects(ctx, cam) {
    for (const sp of this.spells) {
      const x = Math.round(sp.x - cam.ix), y = Math.round(sp.y - cam.iy), k = Math.min(1, sp.t / 1.2, (sp.max - sp.t) / 0.4);
      ctx.globalAlpha = k;
      ctx.fillStyle = '#2a5a70'; ctx.beginPath(); ctx.ellipse(x, y, 15, 7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#5aa8c8'; ctx.beginPath(); ctx.ellipse(x, y - 1, 12, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#bfe8ff'; ctx.beginPath(); ctx.ellipse(x - 3, y - 2, 5, 1.6, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(230,240,255,${0.6 * k})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 9 + (performance.now() / 120 % 8), 4 + (performance.now() / 240 % 4), 0, 0, 7); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  drawEffects(ctx, cam) {
    for (const w of this.veilWaves) {
      const k = w.t / 1.1, r = 10 + k * 170;
      ctx.strokeStyle = `rgba(196,154,245,${0.7 * (1 - k)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(Math.round(w.x - cam.ix), Math.round(w.y - cam.iy), r, r * 0.6, 0, 0, 7); ctx.stroke();
      ctx.strokeStyle = `rgba(234,217,255,${0.4 * (1 - k)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(Math.round(w.x - cam.ix), Math.round(w.y - cam.iy), r * 0.8, r * 0.48, 0, 0, 7); ctx.stroke();
    }
    if (this.orb) {
      const x = Math.round(this.orb.x - cam.ix), y = Math.round(this.orb.y - cam.iy);
      ctx.fillStyle = 'rgba(220,235,255,0.35)'; ctx.fillRect(x - 3, y - 3, 6, 6);
      ctx.fillStyle = '#f4f8ff'; ctx.fillRect(x - 1, y - 2, 2, 4); ctx.fillRect(x - 2, y - 1, 4, 2);
    }
  }
  extraLights() {
    const out = [];
    for (const sp of this.spells) out.push({ x: sp.x, y: sp.y - 6, r: 46, color: [150, 210, 255], a: 0.7, flicker: 0.06 });
    if (this.orb) out.push({ x: this.orb.x, y: this.orb.y, r: 96, color: [215, 230, 255], a: 0.95, flicker: 0.03 });
    return out;
  }

  doAttack() {
    if (!this.player.attack()) return;
    const p = this.player, fx = p.x + p.face.x * 14, fy = p.y - 6 + p.face.y * 12;
    for (const o of this.world.objectsNear(fx, fy, 40)) {
      if (!o.cuttable) continue;
      if (Math.hypot(o.x - fx, o.y - 6 - fy) < 16) {
        this.world.removeObject(o);
        if (o.id && this.world.id === 'farnlager') this.state.world.cut[o.id] = true;
        audio.sfx('cut');
        this.particles.burst(o.x, o.y - 8, 18, { color: ['#45873e', '#5c9f45', '#7cb852', '#357036'], speed: 50, life: 0.7, g: 60, drag: 2 });
        if (o.loot) { audio.sfx('cut'); if (Math.random() < 0.6) this.api.gold(2 + (Math.random() * 7 | 0)); this.particles.burst(o.x, o.y - 6, 14, { color: ['#7d7589', '#5c5468', '#b37c48'], speed: 50, life: 0.6, g: 80, drag: 2 }); }
        else if (Math.random() < 0.3) { this.api.give('ast', 1); }
        if (this.settings.shake) this.cam.shake = 1.5;
        break;
      }
    }
  }

  openGateSequence() {
    const S = this.state.world;
    this.inventory.remove('farnbuendel', 1);
    this.ui.cinematic(2.2);
    audio.sfx('magic');
    if (this.settings.shake) this.cam.shake = 4;
    const gx = 40 * TS, gy = 17 * TS - 40;
    for (let i = 0; i < 3; i++) setTimeout(() => this.particles.burst(gx, gy, 50, { color: ['#c49af5', '#ead9ff', '#9a5fe0', '#ffffff'], speed: 90, life: 1.4, glow: true }), i * 400);
    setTimeout(() => {
      S.gateOpen = true; this.world.gateCollider.off = true;
      this.quests.advance('main_erwachen', 4);
    }, 900);
  }

  // ---------- Erinnerung: Foxy an der Laternenbrücke ----------
  startMemory() {
    const S = this.state.world;
    this.ui.fade(1.2, () => {
      this.memoryReturn = { x: this.player.x, y: this.player.y, time: this.day.time };
      S.memoryMode = true; S.memLit = {};
      this.player.x = 40.2 * TS; this.player.y = 41.5 * TS; this.player.dir = 'down';
      this.day.time = 21.5;
      this.particles.list.length = 0;
      this.cam.follow(this.player.x, this.player.y, this.world.pw, this.world.ph, 1, true);
      this.quests.advance('main_erwachen', 6);
      audio.setMusic(true, 'memory'); audio.sfx('memory');
      this.ui.memoryCaption(L({ de: 'Erinnerung · Fennwyrd, zwei Jahre zuvor', en: 'Memory · Fennwyrd, two years earlier' }));
      this.ui.hud.setMemory(true);
      this.events.emit('quests'); this.events.emit('player');
    });
  }
  endMemory() {
    const S = this.state.world;
    this.ui.memoryQuote(L({ de: '„Sie sprach kein Wort. Und doch gehorchte ihr das Licht.“', en: '"She spoke not a word. And yet the light obeyed her."' }), () => {
      this.ui.fade(1.4, () => {
        S.memoryMode = false; S.lanternsRestored = true; S.memLit = {};
        const r = this.memoryReturn || { x: 40 * TS, y: 13.5 * TS, time: 20 };
        this.player.x = r.x; this.player.y = r.y + 4; this.day.time = r.time;
        this.cam.follow(this.player.x, this.player.y, this.world.pw, this.world.ph, 1, true);
        this.quests.advance('main_erwachen', 7);
        audio.setMusic(true, 'forest');
        this.ui.toast(L({ de: 'Unten an der Brücke leuchten die Mondlaternen wieder.', en: 'Down at the bridge, the moon lanterns glow again.' }), 'secret', 5);
        this.ui.hud.setMemory(false);
        this.events.emit('quests'); this.events.emit('player');
      });
    });
  }
}
