/* Shardfall – Spiellogik (unabhängig von Grafik und Oberfläche)
 * Läuft mit fester Schrittweite (SF.CONFIG.TICK), dadurch gleiches Verhalten bei 1x/2x/3x.
 */
(function () {
  "use strict";
  const C = SF.CONFIG;
  const T = C.TILE;

  // ---------- kleiner Event-Bus (Engine -> Oberfläche) ----------
  const listeners = {};
  SF.on = function (name, fn) { (listeners[name] = listeners[name] || []).push(fn); };
  SF.emit = function (name, data) { (listeners[name] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); };

  // ---------- Hilfen ----------
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
  SF.util = { mulberry32, hashStr, dist2 };

  // ---------- Pfade ----------
  function buildPath(points) {
    const pts = points.map(([c, r]) => ({ x: (c + 0.5) * T, y: (r + 0.5) * T }));
    const segs = [];
    let cum = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      segs.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, len, cum, ang: Math.atan2(b.y - a.y, b.x - a.x) });
      cum += len;
    }
    return { pts, segs, total: cum };
  }

  function posAt(path, d, hint) {
    const segs = path.segs;
    let i = hint || 0;
    if (i >= segs.length) i = segs.length - 1;
    while (i < segs.length - 1 && d > segs[i].cum + segs[i].len) i++;
    while (i > 0 && d < segs[i].cum) i--;
    const s = segs[i];
    const t = Math.max(0, Math.min(1, (d - s.cum) / (s.len || 1)));
    return { x: s.ax + (s.bx - s.ax) * t, y: s.ay + (s.by - s.ay) * t, ang: s.ang, seg: i };
  }
  SF.posAt = posAt;

  function pathTilesOf(points) {
    const tiles = [];
    for (let i = 0; i < points.length - 1; i++) {
      let [c, r] = points[i];
      const [c2, r2] = points[i + 1];
      const dc = Math.sign(c2 - c), dr = Math.sign(r2 - r);
      tiles.push([c, r]);
      while (c !== c2 || r !== r2) { c += dc; r += dr; tiles.push([c, r]); }
    }
    return tiles;
  }

  // ---------- Spielzustand ----------
  let G = null;
  SF.getGame = () => G;

  SF.newGame = function (mapKey, diffKey) {
    const map = SF.MAPS.find(m => m.key === mapKey) || SF.MAPS[0];
    const diff = SF.DIFFICULTIES[diffKey] || SF.DIFFICULTIES.normal;
    const paths = map.paths.map(buildPath);
    const flyPaths = map.paths.map(p => buildPath([p[0], p[p.length - 1]]));
    const pathTiles = new Set();
    map.paths.forEach(p => pathTilesOf(p).forEach(([c, r]) => {
      if (c >= 0 && r >= 0 && c < C.COLS && r < C.ROWS) pathTiles.add(c + "," + r);
    }));

    G = {
      map, diff, paths, flyPaths, pathTiles,
      gold: diff.gold, lives: diff.lives, maxLives: diff.lives,
      wave: 0, score: 0, kills: 0, time: 0,
      towers: [], enemies: [], projectiles: [], fx: [], particles: [], floaters: [], burns: [],
      spawnQueue: [], waveTime: 0,
      speed: 1, paused: false, over: false, won: false, endless: false,
      shake: 0, nextId: 1, autoTimer: -1, leaksThisWave: 0,
      rift: null, riftTiles: new Set(), cheated: false, godMode: false, frozenUntil: 0, event: null,
      stats: { built: 0, upgrades: 0, goldSpent: 0, bossKills: 0 }
    };
    SF.emit("newgame", G);
    return G;
  };

  // ---------- Wellen ----------
  SF.generateWave = function (map, wave, diff) {
    const rng = mulberry32(hashStr(map.key + ":" + wave));
    const list = [];
    const event = SF.waveEvent(map, wave);
    let hpMult = SF.waveHpMult(wave) * diff.hpMult;
    if (event === "armored") hpMult *= 1.2;
    let budget = 6 + 3 * wave + 0.22 * wave * wave;
    if (event === "horde") budget *= 1.25;
    let t = 0;
    const pathCount = map.paths.length;

    if (wave % 10 === 0) {
      const bosses = Math.max(1, Math.floor(wave / 10));
      const bossHp = hpMult * (0.75 + 0.25 * wave / 10); // erster Boss machbar, spätere härter
      for (let i = 0; i < bosses; i++) list.push({ type: "boss", at: 1 + i * 6, path: i % pathCount, hpMult: bossHp });
      budget *= 0.45;
      t = 3;
    }

    const types = Object.values(SF.ENEMIES).filter(e => e.cost > 0 && e.from <= wave);
    const groups = wave < 3 ? 1 : (wave < 12 ? 2 : 3);
    for (let g = 0; g < groups; g++) {
      const share = budget / groups;
      // neuere Gegnertypen bevorzugen, aber Mischung behalten
      let def;
      if (g === 0 && wave < 8) def = SF.ENEMIES.grunt;
      else {
        const weights = types.map(e => 1 + Math.max(0, 6 - (wave - e.from)) * 0.5);
        let roll = rng() * weights.reduce((a, b) => a + b, 0);
        def = types[types.length - 1];
        for (let i = 0; i < types.length; i++) { roll -= weights[i]; if (roll <= 0) { def = types[i]; break; } }
      }
      const count = Math.max(1, Math.round(share / def.cost));
      const gap = Math.max(0.28, Math.min(1.1, 38 / def.speed)) * (wave > 20 ? 0.8 : 1);
      const path = Math.floor(rng() * pathCount);
      for (let i = 0; i < count; i++) {
        list.push({ type: def.key, at: t + i * gap, path: pathCount > 1 && def.speed > 100 ? (i % pathCount) : path, hpMult });
      }
      t += count * gap + 1.6;
    }
    // Rissläufer: selten (ca. 10 %), bei "Rissaktivität" garantiert
    if (wave >= SF.ENEMIES.riftwalker.from && wave % 10 !== 0 && (event === "rift" || rng() < 0.08)) {
      list.push({ type: "riftwalker", at: t * 0.35, path: Math.floor(rng() * pathCount), hpMult: hpMult * (0.75 + 0.25 * wave / 10) });
    }
    const speedMult = event === "rush" ? 1.15 : 1;
    const goldMult = event === "goldrush" ? 1.5 : 1;
    list.forEach(s => { s.speedMult = speedMult; s.goldMult = goldMult; });
    list.sort((a, b) => a.at - b.at);
    list.event = event;
    return list;
  };

  SF.wavePreview = function (wave) {
    if (!G) return [];
    const list = SF.generateWave(G.map, wave, G.diff);
    const counts = {};
    list.forEach(s => { counts[s.type] = (counts[s.type] || 0) + 1; });
    const out = Object.keys(counts).map(k => ({ type: k, count: counts[k] }));
    out.event = list.event;
    return out;
  };

  SF.canCallWave = function () {
    return G && !G.over && (!G.won || G.endless);
  };

  SF.callNextWave = function () {
    if (!SF.canCallWave()) return false;
    const early = G.enemies.length > 0 || G.spawnQueue.length > 0;
    G.wave++;
    const spawns = SF.generateWave(G.map, G.wave, G.diff);
    G.event = spawns.event;
    // offener Riss schließt sich nach einigen Wellen
    if (G.rift) { G.rift.wavesLeft--; if (G.rift.wavesLeft <= 0) closeRift(); }
    spawns.forEach(s => G.spawnQueue.push(Object.assign({}, s, { at: G.waveTime + s.at })));
    G.spawnQueue.sort((a, b) => a.at - b.at);

    let income = 20 + 2 * G.wave;
    let bonus = 0;
    if (early && G.wave > 1) bonus = 15 + 2 * G.wave;
    G.towers.forEach(tw => { if (tw.stats.income) income += tw.stats.income; });
    G.gold += income + bonus;
    G.score += Math.round(40 * G.wave * G.diff.scoreMult);
    G.autoTimer = -1;
    G.leaksThisWave = 0;

    SF.audio.play(G.wave % 10 === 0 ? "boss" : "wave");
    SF.emit("wave", { wave: G.wave, income, bonus, boss: G.wave % 10 === 0, event: G.event });
    return true;
  };

  function spawnEnemy(type, pathIdx, hpMult, startDist) {
    const def = SF.ENEMIES[type];
    const flying = !!def.flying;
    const path = flying ? G.flyPaths[pathIdx] : G.paths[pathIdx];
    const hp = def.hp * hpMult;
    const e = {
      id: G.nextId++, type, def, path, pathIdx, flying,
      hp, maxHp: hp,
      shield: (def.shield || 0) * hpMult, maxShield: (def.shield || 0) * hpMult,
      armor: def.armor, dist: startDist || 0, seg: 0,
      x: 0, y: 0, ang: 0,
      slowF: 1, slowT: 0, stunT: 0, brittleT: 0, brittle: 0, shred: 0,
      revealed: !def.stealth, summonT: def.summonEvery || 0, healT: 0.5,
      hitFlash: 0, wobble: Math.random() * 6.28, alive: true, hpMult,
      speedMult: 1, goldMult: 1, inRift: false, riftId: 0, riftUsed: false
    };
    const p = posAt(path, e.dist, 0);
    e.x = p.x; e.y = p.y; e.ang = p.ang; e.seg = p.seg;
    G.enemies.push(e);
    SF.track("seen", type);
    return e;
  }

  // ---------- Türme ----------
  SF.canBuildAt = function (col, row) {
    if (!G || col < 0 || row < 0 || col >= C.COLS || row >= C.ROWS) return false;
    if (G.pathTiles.has(col + "," + row)) return false;
    if (G.riftTiles.has(col + "," + row)) return false;
    return !G.towers.some(t => t.col === col && t.row === row);
  };

  SF.towerAt = function (col, row) {
    return G ? G.towers.find(t => t.col === col && t.row === row) || null : null;
  };

  SF.buildTower = function (key, col, row) {
    const def = SF.TOWERS[key];
    if (!def || !SF.canBuildAt(col, row)) return { ok: false, reason: "Hier kann nicht gebaut werden." };
    const cost = def.levels[0].cost;
    if (G.gold < cost) return { ok: false, reason: "Nicht genug Gold." };
    G.gold -= cost;
    G.stats.built++; G.stats.goldSpent += cost;
    SF.track("built", key);
    (G.stats.types = G.stats.types || {})[key] = true;
    const tw = {
      id: G.nextId++, key, def, col, row, x: (col + 0.5) * T, y: (row + 0.5) * T,
      level: 1, spec: null, stats: SF.getTowerStats(key, 1, null),
      cooldown: 0.2, angle: -Math.PI / 2, targeting: def.kind === "mortar" ? "strong" : "first",
      kills: 0, dmgDone: 0, buffDmg: 0, buffRate: 0,
      beamTargets: [], rampT: 0, rampTargetId: 0,
      builtWave: G.wave, builtDuringFight: G.enemies.length > 0 || G.spawnQueue.length > 0,
      recoil: 0, placeAnim: 1
    };
    G.towers.push(tw);
    recalcBuffs();
    SF.audio.play("build");
    burst(tw.x, tw.y, def.color, 14, 120);
    return { ok: true, tower: tw };
  };

  SF.upgradeCost = function (tw) {
    if (tw.level < 3) return tw.def.levels[tw.level].cost;
    return null;
  };

  SF.upgradeTower = function (tw, specKey) {
    if (!tw) return { ok: false };
    let cost;
    if (tw.level < 3) {
      cost = tw.def.levels[tw.level].cost;
      if (G.gold < cost) return { ok: false, reason: "Nicht genug Gold." };
      tw.level++;
    } else if (!tw.spec && specKey) {
      const spec = tw.def.specs.find(s => s.key === specKey);
      if (!spec) return { ok: false };
      cost = spec.cost;
      if (G.gold < cost) return { ok: false, reason: "Nicht genug Gold." };
      tw.spec = specKey;
      tw.level = 4;
      SF.track("specs", tw.key + ":" + specKey);
    } else return { ok: false, reason: "Maximale Stufe erreicht." };
    G.gold -= cost;
    G.stats.upgrades++; G.stats.goldSpent += cost;
    tw.stats = SF.getTowerStats(tw.key, Math.min(tw.level, 3), tw.spec);
    tw.placeAnim = 1;
    recalcBuffs();
    SF.audio.play("upgrade");
    burst(tw.x, tw.y, "#fde68a", 20, 160);
    return { ok: true };
  };

  SF.sellValue = function (tw) {
    const invested = SF.getTowerInvested(tw.key, tw.level, tw.spec);
    const fresh = tw.builtWave === G.wave && !tw.builtDuringFight && G.enemies.length === 0 && G.spawnQueue.length === 0;
    return Math.floor(invested * (fresh ? 1 : 0.7));
  };

  SF.sellTower = function (tw) {
    const idx = G.towers.indexOf(tw);
    if (idx < 0) return 0;
    const value = SF.sellValue(tw);
    G.gold += value;
    G.towers.splice(idx, 1);
    recalcBuffs();
    SF.audio.play("sell");
    floater(tw.x, tw.y - 20, "+" + value, "#fde047");
    burst(tw.x, tw.y, "#fde047", 10, 100);
    return value;
  };

  SF.cycleTargeting = function (tw) {
    const modes = ["first", "last", "strong", "close"];
    tw.targeting = modes[(modes.indexOf(tw.targeting) + 1) % modes.length];
    return tw.targeting;
  };
  SF.TARGETING_NAMES = { first: "Vorderster", last: "Hinterster", strong: "Stärkster", close: "Nächster" };

  function recalcBuffs() {
    const beacons = G.towers.filter(t => t.def.support);
    G.towers.forEach(t => {
      t.buffDmg = 0; t.buffRate = 0;
      if (t.def.support) return;
      beacons.forEach(b => {
        if (dist2(b.x, b.y, t.x, t.y) <= b.stats.range * b.stats.range) {
          t.buffDmg = Math.max(t.buffDmg, b.stats.buff || 0);
          t.buffRate = Math.max(t.buffRate, b.stats.rateBuff || 0);
        }
      });
    });
  }
  SF.recalcBuffs = recalcBuffs;

  // ---------- Effekte ----------
  function burst(x, y, color, n, spd) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random() * 0.7);
      G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.4, max: 0.9, color: typeof color === "function" ? color() : color, size: 2 + Math.random() * 3 });
    }
    if (G.particles.length > 900) G.particles.splice(0, G.particles.length - 900);
  }
  function floater(x, y, text, color, big) {
    if (G.floaters.length > 80) G.floaters.shift();
    G.floaters.push({ x, y, text, color, t: 0, max: big ? 1.4 : 0.8, big: !!big });
  }
  SF.fxBurst = burst;

  // ---------- Schaden ----------
  function damage(e, amount, src) {
    if (!e.alive || amount <= 0) return;
    if (e.brittleT > 0) amount *= 1 + e.brittle;
    if (!src.pierce) amount *= 1 - Math.max(0, e.armor - e.shred);
    if (e.shield > 0) {
      const mult = src.energy ? 2 : 1;
      const sAmt = amount * mult;
      if (sAmt <= e.shield) { e.shield -= sAmt; amount = 0; }
      else { amount = (sAmt - e.shield) / mult; e.shield = 0; burst(e.x, e.y, "#93c5fd", 8, 90); }
    }
    e.hp -= amount;
    e.hitFlash = 0.08;
    if (src.tower) src.tower.dmgDone += amount;
    if (src.show && SF.save.settings.damageNumbers && amount >= 1) {
      floater(e.x + (Math.random() - 0.5) * 10, e.y - e.def.size - 4, Math.round(amount).toString(), src.crit ? "#fde047" : "#ffffff", src.crit);
    }
    if (e.hp <= 0) kill(e, src.tower);
  }

  function kill(e, tower) {
    if (!e.alive) return;
    e.alive = false;
    const def = e.def;
    const gold = Math.max(1, Math.round(def.gold * SF.waveGoldMult(G.wave) * (e.goldMult || 1)));
    G.gold += gold;
    G.kills++;
    SF.track("kills", e.type);
    G.score += Math.round(def.gold * 10 * G.diff.scoreMult * (1 + 0.05 * G.wave));
    if (tower) tower.kills++;
    burst(e.x, e.y, SF.cosmetics ? SF.cosmetics.killColor(def.color) : def.color, def.boss ? 60 : 10, def.boss ? 260 : 130);
    // Riftkristalle sind selten: Rissläufer +1, Boss 35 % Chance, sonst winziger Zufallsfund (0,08 %)
    if (!G.cheated && SF.crystals) {
      const n = def.rare ? 1 : def.boss ? (Math.random() < 0.35 ? 1 : 0) : (Math.random() < 0.0008 ? 1 : 0);
      if (n) {
        SF.crystals.add(n, "drop");
        floater(e.x, e.y - 46, "✦ +" + n + " Riftkristall" + (n > 1 ? "e" : ""), "#67e8f9", true);
        burst(e.x, e.y, "#67e8f9", 24, 200);
        if (!def.boss && !def.rare) SF.emit("raredrop", {});
      }
    }
    if (def.rare) {
      G.fx.push({ type: "ring", x: e.x, y: e.y, r: 10, max: 120, t: 0, dur: 0.6, color: def.color });
      floater(e.x, e.y - 30, "+" + gold + " Gold", "#fde047", true);
      SF.emit("rarekill", { type: e.type, gold });
    }
    if (def.boss) {
      G.stats.bossKills++;
      G.shake = Math.max(G.shake, 14);
      G.fx.push({ type: "ring", x: e.x, y: e.y, r: 10, max: 160, t: 0, dur: 0.6, color: "#f43f5e" });
      SF.audio.play("boom");
      floater(e.x, e.y - 40, "+" + gold + " Gold", "#fde047", true);
      SF.emit("bosskill", { gold });
    }
    if (def.splits) {
      for (let i = 0; i < def.splits; i++) {
        const s = spawnEnemy("shard", e.pathIdx, e.hpMult, Math.max(0, e.dist - 8 - i * 12));
        if (e.flying) s.flying = true;
        if (e.inRift && G.rift) { s.inRift = true; s.riftId = e.riftId; s.riftD = Math.max(0, e.riftD - 8 - i * 12); s.riftSeg = 0; }
        else if (e.riftId) s.riftId = e.riftId;
      }
    }
  }

  function applyHitEffects(e, st) {
    if (st.slow) {
      const f = e.def.slowResist ? 1 - (1 - st.slow) * e.def.slowResist : st.slow;
      if (e.slowT <= 0 || f <= e.slowF) e.slowF = f;
      e.slowT = Math.max(e.slowT, (st.slowTime || 1) * (e.def.boss ? 0.5 : 1));
    }
    if (st.brittle) { e.brittle = st.brittle; e.brittleT = Math.max(e.brittleT, st.slowTime || 1.5); }
    if (st.freezeChance && Math.random() < st.freezeChance && !e.def.boss) e.stunT = Math.max(e.stunT, st.freezeTime || 1);
    if (st.stun) e.stunT = Math.max(e.stunT, st.stun * (e.def.boss ? 0.35 : 1));
    if (st.shred) e.shred = Math.max(e.shred, st.shred);
  }

  function canHit(tw, e) {
    if (!e.alive) return false;
    if (e.flying && !tw.stats.air) return false;
    if (!e.revealed) return false;
    return true;
  }

  function progressOf(e) { return e.dist / e.path.total; }

  function findTargets(tw, n) {
    const st = tw.stats;
    const r2 = st.range * st.range;
    const min2 = st.minRange ? st.minRange * st.minRange : 0;
    const list = [];
    for (const e of G.enemies) {
      if (!canHit(tw, e)) continue;
      const d = dist2(tw.x, tw.y, e.x, e.y);
      if (d > r2 || d < min2) continue;
      list.push({ e, d });
    }
    if (!list.length) return [];
    const mode = tw.targeting;
    if (mode === "first") list.sort((a, b) => progressOf(b.e) - progressOf(a.e));
    else if (mode === "last") list.sort((a, b) => progressOf(a.e) - progressOf(b.e));
    else if (mode === "strong") list.sort((a, b) => (b.e.hp + b.e.shield) - (a.e.hp + a.e.shield));
    else list.sort((a, b) => a.d - b.d);
    return list.slice(0, n).map(o => o.e);
  }

  function splashAt(x, y, radius, dmg, st, tower, airToo) {
    const r2 = radius * radius;
    for (const e of G.enemies) {
      if (!e.alive) continue;
      if (e.flying && !airToo) continue;
      if (dist2(x, y, e.x, e.y) <= r2 + e.def.size * e.def.size) {
        damage(e, dmg, { tower, energy: st.energy, pierce: st.pierce, show: false });
        applyHitEffects(e, st);
      }
    }
  }

  // ---------- Feuern ----------
  function fireTower(tw, dt) {
    const st = tw.stats;
    const dmgMult = 1 + tw.buffDmg;
    const rateMult = 1 + tw.buffRate;
    const kind = tw.def.kind;

    if (kind === "aura") return;

    if (kind === "beam") {
      const n = st.beams || 1;
      const targets = findTargets(tw, n);
      tw.beamTargets = targets;
      if (!targets.length) { tw.rampT = Math.max(0, tw.rampT - dt * 2); return; }
      if (targets[0].id !== tw.rampTargetId) { tw.rampTargetId = targets[0].id; tw.rampT = 0; }
      tw.rampT = Math.min(st.rampTime, tw.rampT + dt);
      const ramp = 1 + (st.ramp - 1) * (tw.rampT / st.rampTime);
      tw.angle = Math.atan2(targets[0].y - tw.y, targets[0].x - tw.x);
      targets.forEach(e => damage(e, st.dps * ramp * dmgMult * dt, { tower: tw, energy: true, pierce: true, show: false }));
      tw.beamTick = (tw.beamTick || 0) + dt;
      if (tw.beamTick > 0.5) { tw.beamTick = 0; if (SF.save.settings.damageNumbers) floater(targets[0].x, targets[0].y - targets[0].def.size - 4, Math.round(st.dps * ramp * dmgMult * 0.5).toString(), "#f0abfc"); }
      return;
    }

    tw.cooldown -= dt * rateMult;
    if (tw.cooldown > 0) return;

    if (kind === "projectile") {
      const targets = findTargets(tw, st.multishot || 1);
      if (!targets.length) { tw.cooldown = 0; return; }
      tw.angle = Math.atan2(targets[0].y - tw.y, targets[0].x - tw.x);
      targets.forEach(e => {
        let dmg = st.dmg * dmgMult, crit = false;
        if (st.crit && Math.random() < st.crit) { dmg *= st.critMult; crit = true; }
        G.projectiles.push({
          kind: tw.key, x: tw.x + Math.cos(tw.angle) * 18, y: tw.y + Math.sin(tw.angle) * 18,
          target: e, tx: e.x, ty: e.y, speed: st.projSpeed || 500, dmg, crit, st, tower: tw
        });
      });
      tw.cooldown = 1 / st.rate;
      tw.recoil = 1;
      SF.audio.play(tw.key === "cannon" ? "cannon" : (tw.key === "frost" ? "frost" : "bolt"), 0.06);
      return;
    }

    if (kind === "chain") {
      const first = findTargets(tw, 1)[0];
      if (!first) { tw.cooldown = 0; return; }
      tw.angle = Math.atan2(first.y - tw.y, first.x - tw.x);
      const hit = new Set();
      const pts = [{ x: tw.x, y: tw.y - 14 }];
      let cur = first, dmg = st.dmg * dmgMult;
      for (let i = 0; i < st.chain && cur; i++) {
        hit.add(cur.id);
        pts.push({ x: cur.x, y: cur.y });
        damage(cur, dmg, { tower: tw, energy: true, show: true });
        if (st.stun) applyHitEffects(cur, st);
        dmg *= st.falloff;
        let best = null, bd = st.chainRange * st.chainRange;
        for (const e of G.enemies) {
          if (!e.alive || hit.has(e.id) || !canHit(tw, e)) continue;
          const d = dist2(cur.x, cur.y, e.x, e.y);
          if (d < bd) { bd = d; best = e; }
        }
        cur = best;
      }
      G.fx.push({ type: "lightning", pts, t: 0, dur: 0.18, color: st.stun ? "#fde047" : "#c4b5fd" });
      tw.cooldown = 1 / st.rate;
      tw.recoil = 1;
      SF.audio.play("tesla", 0.08);
      return;
    }

    if (kind === "mortar") {
      const e = findTargets(tw, 1)[0];
      if (!e) { tw.cooldown = 0; return; }
      const curSpeed = e.def.speed * (e.speedMult || 1) * (e.slowT > 0 ? e.slowF : 1) * (e.stunT > 0 ? 0 : 1);
      const pred = e.inRift && G.rift
        ? posAt(G.rift.path, Math.min(G.rift.path.total, e.riftD + curSpeed * st.flight), 0)
        : posAt(e.path, Math.min(e.path.total, e.dist + curSpeed * st.flight), e.seg);
      tw.angle = Math.atan2(pred.y - tw.y, pred.x - tw.x);
      G.projectiles.push({
        kind: "shell", sx: tw.x, sy: tw.y, x: tw.x, y: tw.y, tx: pred.x, ty: pred.y,
        t: 0, flight: st.flight, dmg: st.dmg * dmgMult, st, tower: tw, arc: 90
      });
      tw.cooldown = 1 / st.rate;
      tw.recoil = 1;
      SF.audio.play("mortar", 0.1);
    }
  }

  function impact(p, x, y) {
    const st = p.st;
    if (p.kind === "bomblet" || st.splash) {
      const radius = p.kind === "bomblet" ? 36 : st.splash;
      splashAt(x, y, radius, p.dmg, st, p.tower, st.air);
      const color = p.kind === "frost" ? "#a5f3fc" : (p.kind === "shell" ? "#fb923c" : "#fca5a5");
      G.fx.push({ type: "explosion", x, y, r: radius, t: 0, dur: p.kind === "frost" ? 0.3 : 0.35, color });
      burst(x, y, color, p.kind === "frost" ? 6 : 12, 140);
      if (p.kind === "shell" || p.kind === "cannon") {
        SF.audio.play("boom", 0.08);
        if (SF.save.settings.screenShake) G.shake = Math.max(G.shake, p.kind === "shell" ? 5 : 2.5);
      }
      if (st.cluster && p.kind !== "bomblet") {
        for (let i = 0; i < st.cluster; i++) {
          const a = (i / st.cluster) * Math.PI * 2 + Math.random() * 0.5;
          const d = 30 + Math.random() * 25;
          G.projectiles.push({ kind: "bomblet", sx: x, sy: y, x, y, tx: x + Math.cos(a) * d, ty: y + Math.sin(a) * d,
            t: 0, flight: 0.35, dmg: p.dmg * 0.4, st: Object.assign({}, st, { cluster: 0 }), tower: p.tower, arc: 30 });
        }
      }
      if (st.burn && p.kind === "shell") {
        G.burns.push({ x, y, r: st.splash * 0.8, dps: p.dmg * st.burn, t: st.burnTime, max: st.burnTime, tower: p.tower });
      }
    } else if (p.target && p.target.alive) {
      damage(p.target, p.dmg, { tower: p.tower, energy: st.energy, pierce: st.pierce, show: true, crit: p.crit });
      applyHitEffects(p.target, st);
      burst(x, y, p.tower.def.color, 3, 80);
    }
  }

  // ---------- Gegner-Fähigkeiten (Heilen, Beschwören) ----------
  function enemyAbilities(e, dt) {
      if (e.def.heal) {
        e.healT -= dt;
        if (e.healT <= 0) {
          e.healT = 0.5;
          const r2 = e.def.healRange * e.def.healRange;
          let healed = false;
          for (const o of G.enemies) {
            if (o === e || !o.alive || o.hp >= o.maxHp) continue;
            if (dist2(e.x, e.y, o.x, o.y) <= r2) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * e.def.heal * 0.5); healed = true; }
          }
          if (healed) G.fx.push({ type: "ring", x: e.x, y: e.y, r: 10, max: e.def.healRange, t: 0, dur: 0.45, color: "#4ade80" });
        }
      }
      if (e.def.summon) {
        e.summonT -= dt;
        if (e.summonT <= 0) {
          e.summonT = e.def.summonEvery;
          for (let i = 0; i < 2; i++) spawnEnemy(e.def.summon, e.pathIdx, e.hpMult * 0.5, Math.max(0, e.dist - 30 - i * 20));
        }
      }
  }

  // ---------- Riss (Rissläufer) ----------
  function segDist(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay;
    const l2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
    return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
  }

  function buildPathPx(pts) {
    const segs = [];
    let cum = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      segs.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, len, cum, ang: Math.atan2(b.y - a.y, b.x - a.x) });
      cum += len;
    }
    return { pts, segs, total: cum };
  }

  // Sucht die Abkürzung, die am meisten Weg spart (wie in Riftward)
  function findShortcut(path, fromDist) {
    let best = null;
    const step = T / 2;
    const maxRoute = T * 13; // Riss überspringt höchstens ~13 Felder Weg
    for (let d2 = fromDist + T * 3; d2 <= Math.min(path.total - T * 1.5, fromDist + maxRoute); d2 += step) {
      const a = posAt(path, fromDist, 0), b = posAt(path, d2, 0);
      const route = d2 - fromDist;
      const direct = Math.hypot(b.x - a.x, b.y - a.y);
      if (direct > T * 6.5) continue; // Riss selbst höchstens ~6,5 Felder lang
      const saved = route - direct;
      const ratio = saved / route;
      if (saved < T * 2.2 || ratio < 0.2) continue;
      const penalty = d2 > path.total - T * 3 ? T * 1.5 : 0;
      const score = saved + ratio * T * 3 - penalty;
      if (!best || score > best.score) best = { startDist: fromDist, endDist: d2, score, saved };
    }
    return best;
  }

  function openRift(e) {
    const path = e.path;
    let sc = null;
    for (let back = 0; back <= T * 3 && !sc; back += T / 2) sc = findShortcut(path, Math.max(T, e.dist - back));
    if (!sc) { SF.emit("riftfail", {}); return; }

    const a = posAt(path, sc.startDist, 0), b = posAt(path, sc.endDist, 0);
    const vx = b.x - a.x, vy = b.y - a.y, len = Math.hypot(vx, vy) || 1;
    const nx = -vy / len, ny = vx / len;
    const segments = Math.max(6, Math.min(12, Math.round(len / 55)));
    const pts = [{ x: a.x, y: a.y }];
    for (let i = 1; i < segments; i++) {
      const t = i / segments, j = (Math.random() * 2 - 1) * 17 * Math.sin(Math.PI * t);
      pts.push({ x: Math.max(5, Math.min(C.WIDTH - 5, a.x + vx * t + nx * j)), y: Math.max(5, Math.min(C.HEIGHT - 5, a.y + vy * t + ny * j)) });
    }
    pts.push({ x: b.x, y: b.y });

    const rift = { id: G.nextId++, pathIdx: e.pathIdx, startDist: sc.startDist, endDist: sc.endDist, path: buildPathPx(pts), pts, wavesLeft: 2, born: G.time, saved: sc.saved };
    G.rift = rift;

    // Felder auf der Risslinie: Türme werden zerstört (kein Geld zurück!) und man kann dort nicht bauen
    const near = (x, y, r) => { for (let i = 0; i < pts.length - 1; i++) if (segDist(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) <= r) return true; return false; };
    G.riftTiles = new Set();
    for (let r = 0; r < C.ROWS; r++) for (let c = 0; c < C.COLS; c++) {
      if (near((c + 0.5) * T, (r + 0.5) * T, 26)) G.riftTiles.add(c + "," + r);
    }
    const destroyed = G.towers.filter(t => near(t.x, t.y, 26));
    destroyed.forEach(t => {
      burst(t.x, t.y, "#22d3ee", 30, 220);
      G.fx.push({ type: "explosion", x: t.x, y: t.y, r: 40, t: 0, dur: 0.5, color: "#0891b2" });
    });
    if (destroyed.length) { G.towers = G.towers.filter(t => !destroyed.includes(t)); recalcBuffs(); }
    G.stats.riftLosses = (G.stats.riftLosses || 0) + destroyed.length;

    // Rissläufer springt selbst sofort hinein
    e.inRift = true; e.riftId = rift.id; e.riftD = 0; e.riftSeg = 0; e.dist = sc.startDist;
    // Gegner, die gerade hinter dem Rissanfang stehen, nutzen ihn nicht mehr
    G.enemies.forEach(o => { if (o !== e && o.pathIdx === e.pathIdx && o.dist > sc.startDist) o.riftId = rift.id; });

    G.shake = Math.max(G.shake, 12);
    pts.forEach(p => burst(p.x, p.y, "#67e8f9", 6, 160));
    SF.audio.play("boss");
    SF.emit("rift", { destroyed: destroyed.length, saved: Math.round(sc.saved / T), wavesLeft: rift.wavesLeft });
  }

  function closeRift() {
    if (!G.rift) return;
    G.rift.pts.forEach(p => burst(p.x, p.y, "#a5f3fc", 4, 90));
    G.rift = null;
    G.riftTiles = new Set();
    SF.emit("riftclosed", {});
  }

  // ---------- Admin-Werkzeuge (nur über das Admin-Menü) ----------
  SF.admin = {
    spawn(type, n) {
      if (!G || !SF.ENEMIES[type]) return 0;
      const hp = SF.waveHpMult(Math.max(1, G.wave)) * G.diff.hpMult;
      for (let i = 0; i < n; i++) { const e = spawnEnemy(type, i % G.paths.length, hp, Math.max(0, -i * 18)); e.dist = 0; }
      G.cheated = true;
      return n;
    },
    killAll() { if (!G) return 0; const n = G.enemies.length; G.enemies.forEach(e => kill(e, null)); G.cheated = true; return n; },
    openRift() {
      if (!G) return false;
      const e = spawnEnemy("riftwalker", 0, SF.waveHpMult(Math.max(1, G.wave)) * G.diff.hpMult, 0);
      e.dist = e.path.total * 0.28; e.riftUsed = true; G.cheated = true;
      if (G.rift) closeRift();
      openRift(e);
      return !!G.rift;
    },
    closeRift() { closeRift(); },
    markCheated() { if (G) G.cheated = true; }
  };

  // ---------- Hauptschritt ----------
  SF.step = function (dt) {
    if (!G || G.over || G.paused) return;
    G.time += dt;
    G.waveTime += dt;

    // Spawns
    while (G.spawnQueue.length && G.spawnQueue[0].at <= G.waveTime) {
      const s = G.spawnQueue.shift();
      const ne = spawnEnemy(s.type, s.path, s.hpMult, 0);
      ne.speedMult = s.speedMult || 1; ne.goldMult = s.goldMult || 1;
      if (ne.def.rare) { SF.audio.play("boss"); SF.emit("rare", { type: ne.type }); }
    }

    // Phantome enttarnen
    const beacons = G.towers.filter(t => t.def.support || t.spec === "sniper");
    for (const e of G.enemies) {
      if (!e.def.stealth) continue;
      e.revealed = beacons.some(b => dist2(b.x, b.y, e.x, e.y) <= b.stats.range * b.stats.range);
    }

    // Gegner bewegen
    for (const e of G.enemies) {
      if (!e.alive) continue;
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.wobble += dt * 8;
      if (e.slowT > 0) e.slowT -= dt; else e.slowF = 1;
      if (e.brittleT > 0) e.brittleT -= dt;
      if (G.frozenUntil > G.time) continue; // Admin: Gegner eingefroren
      if (e.stunT > 0) { e.stunT -= dt; continue; }
      const spd = e.def.speed * (e.speedMult || 1) * (e.slowT > 0 ? e.slowF : 1);
      const prevDist = e.dist;
      const R = G.rift;

      if (e.inRift) {
        if (!R || R.id !== e.riftId) e.inRift = false; // Riss hat sich geschlossen -> normal weiter
        else {
          e.riftD += spd * dt;
          if (e.riftD >= R.path.total) { e.inRift = false; e.dist = R.endDist; e.seg = 0; }
          else {
            const rp = posAt(R.path, e.riftD, e.riftSeg || 0);
            e.x = rp.x; e.y = rp.y; e.ang = rp.ang; e.riftSeg = rp.seg;
            e.dist = R.startDist + (e.riftD / R.path.total) * (R.endDist - R.startDist); // für Zielwahl "Vorderster"
            enemyAbilities(e, dt);
            continue;
          }
        }
      } else {
        e.dist += spd * dt;
        // Bodengegner betreten einen offenen Riss, wenn sie seinen Anfang passieren
        if (R && !e.flying && e.pathIdx === R.pathIdx && e.riftId !== R.id && prevDist < R.startDist && e.dist >= R.startDist) {
          e.inRift = true; e.riftId = R.id; e.riftD = e.dist - R.startDist; e.riftSeg = 0;
          continue;
        }
        // Rissläufer reißt bei ca. 28 % seines Weges eine Abkürzung auf
        if (e.def.rift && !e.riftUsed && !e.flying && e.dist >= e.path.total * 0.28) { e.riftUsed = true; if (!G.rift) openRift(e); if (e.inRift) continue; }
      }

      if (e.dist >= e.path.total) {
        e.alive = false;
        G.lives -= e.def.lives;
        G.leaksThisWave += e.def.lives;
        G.shake = Math.max(G.shake, 6);
        SF.audio.play("leak", 0.1);
        SF.emit("leak", { lives: G.lives, dmg: e.def.lives, type: e.type });
        if (G.godMode) G.lives = Math.max(G.lives, 1);
        if (G.lives <= 0) { G.lives = 0; endGame(false); return; }
        continue;
      }
      const p = posAt(e.path, e.dist, e.seg);
      e.x = p.x; e.y = p.y; e.ang = p.ang; e.seg = p.seg;
      enemyAbilities(e, dt);
    }

    // Brennender Boden
    for (const b of G.burns) {
      b.t -= dt;
      const r2 = b.r * b.r;
      for (const e of G.enemies) {
        if (e.alive && !e.flying && dist2(b.x, b.y, e.x, e.y) <= r2) damage(e, b.dps * dt, { tower: b.tower, show: false });
      }
    }
    G.burns = G.burns.filter(b => b.t > 0);

    // Türme
    for (const tw of G.towers) {
      tw.recoil = Math.max(0, tw.recoil - dt * 6);
      tw.placeAnim = Math.max(0, tw.placeAnim - dt * 3);
      fireTower(tw, dt);
    }

    // Projektile
    for (const p of G.projectiles) {
      if (p.done) continue;
      if (p.kind === "shell" || p.kind === "bomblet") {
        p.t += dt;
        const k = Math.min(1, p.t / p.flight);
        p.x = p.sx + (p.tx - p.sx) * k;
        p.y = p.sy + (p.ty - p.sy) * k;
        p.z = Math.sin(k * Math.PI) * p.arc;
        if (k >= 1) { p.done = true; impact(p, p.tx, p.ty); }
        continue;
      }
      if (p.target && p.target.alive) { p.tx = p.target.x; p.ty = p.target.y; }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const stepLen = p.speed * dt;
      p.ang = Math.atan2(dy, dx);
      if (d <= stepLen + 4) {
        p.done = true;
        if (p.target && !p.target.alive && !p.st.splash) continue; // Ziel weg, Bolzen verpufft
        impact(p, p.tx, p.ty);
      } else { p.x += dx / d * stepLen; p.y += dy / d * stepLen; }
    }
    G.projectiles = G.projectiles.filter(p => !p.done);
    G.enemies = G.enemies.filter(e => e.alive);

    // Effekte altern
    for (const f of G.fx) f.t += dt;
    G.fx = G.fx.filter(f => f.t < f.dur);
    for (const p of G.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; }
    G.particles = G.particles.filter(p => p.life > 0);
    for (const f of G.floaters) { f.t += dt; f.y -= 28 * dt; }
    G.floaters = G.floaters.filter(f => f.t < f.max);
    G.shake = Math.max(0, G.shake - dt * 30);

    // Welle geschafft?
    if (G.wave > 0 && !G.enemies.length && !G.spawnQueue.length && !G.waveDoneFlag) {
      G.waveDoneFlag = true;
      SF.emit("wavedone", { wave: G.wave, perfect: G.leaksThisWave === 0 });
      if (G.leaksThisWave === 0) { G.gold += 10; floater(C.WIDTH / 2, 80, "Perfekte Welle! +10 Gold", "#86efac", true); }
      if (G.wave >= SF.WIN_WAVE && !G.won) { endGame(true); return; }
      if (SF.save.settings.autoWave) G.autoTimer = 3;
    }
    if (G.enemies.length || G.spawnQueue.length) G.waveDoneFlag = false;

    if (G.autoTimer > 0) {
      G.autoTimer -= dt;
      if (G.autoTimer <= 0) { G.autoTimer = -1; SF.callNextWave(); }
    }
  };

  SF.finalScore = function () {
    return Math.round(G.score + G.lives * 100 * G.diff.scoreMult);
  };

  function endGame(won) {
    if (won) {
      G.won = true;
      G.paused = true;
      SF.audio.play("win");
      SF.emit("victory", { score: SF.finalScore() });
    } else {
      G.over = true;
      SF.audio.play("lose");
      SF.emit("gameover", { score: SF.finalScore() });
    }
  }

  SF.continueEndless = function () {
    if (!G || !G.won) return;
    G.endless = true;
    G.paused = false;
    SF.emit("endless", {});
  };
})();
