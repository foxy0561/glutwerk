/* Shardfall – Zeichnen (Canvas 2D) */
(function () {
  "use strict";
  const C = SF.CONFIG;
  const T = C.TILE;
  let canvas, ctx, bg = null, bgGame = null;
  let scale = 1;

  SF.render = {};

  SF.render.init = function (cnv) {
    canvas = cnv;
    ctx = canvas.getContext("2d");
    window.addEventListener("resize", SF.render.resize);
    SF.render.resize();
  };

  SF.render.resize = function () {
    if (!canvas) return;
    const wrap = canvas.parentElement;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    scale = Math.min(w / C.WIDTH, h / C.HEIGHT);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.style.width = Math.floor(C.WIDTH * scale) + "px";
    canvas.style.height = Math.floor(C.HEIGHT * scale) + "px";
    canvas.width = Math.floor(C.WIDTH * scale * dpr);
    canvas.height = Math.floor(C.HEIGHT * scale * dpr);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    SF.render.pixelScale = scale * dpr;
  };

  // Bildschirm -> Spielfeld
  SF.render.toWorld = function (clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return { x: (clientX - r.left) / r.width * C.WIDTH, y: (clientY - r.top) / r.height * C.HEIGHT };
  };

  // ---------- Hintergrund einmalig pro Karte vorzeichnen ----------
  function buildBackground(G) {
    const off = document.createElement("canvas");
    off.width = C.WIDTH; off.height = C.HEIGHT;
    const b = off.getContext("2d");
    const th = SF.cosmetics ? SF.cosmetics.terrain(G.map.theme) : G.map.theme;
    G.themeResolved = th;
    const rng = SF.util.mulberry32(SF.util.hashStr(G.map.key));

    for (let r = 0; r < C.ROWS; r++) {
      for (let c = 0; c < C.COLS; c++) {
        b.fillStyle = (r + c) % 2 ? th.ground : th.ground2;
        b.fillRect(c * T, r * T, T, T);
        for (let i = 0; i < 6; i++) {
          b.fillStyle = `rgba(255,255,255,${0.015 + rng() * 0.03})`;
          b.fillRect(c * T + rng() * T, r * T + rng() * T, 2 + rng() * 3, 2 + rng() * 3);
        }
      }
    }
    // feine Rasterlinien
    b.strokeStyle = "rgba(0,0,0,0.12)";
    b.lineWidth = 1;
    for (let c = 0; c <= C.COLS; c++) { b.beginPath(); b.moveTo(c * T + 0.5, 0); b.lineTo(c * T + 0.5, C.HEIGHT); b.stroke(); }
    for (let r = 0; r <= C.ROWS; r++) { b.beginPath(); b.moveTo(0, r * T + 0.5); b.lineTo(C.WIDTH, r * T + 0.5); b.stroke(); }

    // Pfad: dicke Linien mit Rand
    G.paths.forEach(path => {
      b.lineJoin = "round"; b.lineCap = "round";
      b.strokeStyle = th.pathEdge; b.lineWidth = T * 0.98;
      b.beginPath(); path.pts.forEach((p, i) => i ? b.lineTo(p.x, p.y) : b.moveTo(p.x, p.y)); b.stroke();
    });
    G.paths.forEach(path => {
      b.strokeStyle = th.path; b.lineWidth = T * 0.8;
      b.beginPath(); path.pts.forEach((p, i) => i ? b.lineTo(p.x, p.y) : b.moveTo(p.x, p.y)); b.stroke();
    });
    // Steinchen auf dem Pfad
    G.pathTiles.forEach(k => {
      const [c, r] = k.split(",").map(Number);
      for (let i = 0; i < 4; i++) {
        b.fillStyle = `rgba(0,0,0,${0.1 + rng() * 0.15})`;
        b.beginPath(); b.arc(c * T + 10 + rng() * (T - 20), r * T + 10 + rng() * (T - 20), 1.5 + rng() * 2.5, 0, 7); b.fill();
      }
    });

    // Deko auf freien Feldern (wird von Türmen verdeckt)
    G.deco = [];
    for (let r = 0; r < C.ROWS; r++) for (let c = 0; c < C.COLS; c++) {
      if (G.pathTiles.has(c + "," + r)) continue;
      if (rng() < 0.16) G.deco.push({ c, r, type: th.deco[Math.floor(rng() * th.deco.length)], ox: rng() * 24 - 12, oy: rng() * 24 - 12, s: 0.7 + rng() * 0.5 });
    }
    bg = off;
    bgGame = G;
  }

  function drawDeco(d, th) {
    const x = d.c * T + T / 2 + d.ox, y = d.r * T + T / 2 + d.oy, s = d.s;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(0, 10, 14, 5, 0, 0, 7); ctx.fill();
    if (d.type === "tree") {
      ctx.fillStyle = "#3b2a1a"; ctx.fillRect(-2, 0, 4, 10);
      const leaf = th.leaf || ["#166534", "#15803d"];
      ctx.fillStyle = leaf[0]; ctx.beginPath(); ctx.arc(0, -4, 12, 0, 7); ctx.fill();
      ctx.fillStyle = leaf[1]; ctx.beginPath(); ctx.arc(-3, -7, 7, 0, 7); ctx.fill();
    } else if (d.type === "rock") {
      ctx.fillStyle = "#57534e"; ctx.beginPath(); ctx.moveTo(-11, 8); ctx.lineTo(-8, -4); ctx.lineTo(2, -8); ctx.lineTo(11, 0); ctx.lineTo(9, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#78716c"; ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(2, -8); ctx.lineTo(4, 0); ctx.lineTo(-5, 2); ctx.closePath(); ctx.fill();
    } else if (d.type === "crystal" || d.type === "ice") {
      ctx.fillStyle = d.type === "ice" ? "#bae6fd" : th.accent;
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(6, 0); ctx.lineTo(0, 9); ctx.lineTo(-6, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(12, 2); ctx.lineTo(8, 9); ctx.lineTo(4, 2); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (d.type === "ember") {
      const g = 0.5 + 0.5 * Math.sin(performance.now() / 300 + d.c * 3);
      ctx.fillStyle = "#44403c"; ctx.beginPath(); ctx.arc(0, 2, 9, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(249,115,22,${0.4 + g * 0.5})`; ctx.beginPath(); ctx.arc(0, 2, 4, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- Türme ----------
  const LEVEL_PLATE = ["#57534e", "#78716c", "#a8a29e", "#fbbf24"];

  SF.render.drawTower = function (c, tw, opts) {
    opts = opts || {};
    const def = SF.TOWERS[tw.key];
    const lvl = tw.level || 1;
    const t = performance.now() / 1000;
    c.save();
    c.translate(tw.x, tw.y);
    const pop = 1 + (tw.placeAnim || 0) * 0.15;
    c.scale(pop, pop);
    if (opts.alpha !== undefined) c.globalAlpha = opts.alpha;

    // Schatten + Platte
    c.fillStyle = "rgba(0,0,0,0.35)";
    c.beginPath(); c.ellipse(2, 6, 25, 15, 0, 0, 7); c.fill();
    if (SF.cosmetics) SF.cosmetics.drawPlate(c, lvl, roundRect, tw.pattern);
    else {
      c.fillStyle = LEVEL_PLATE[Math.min(lvl, 4) - 1];
      roundRect(c, -24, -24, 48, 48, 10); c.fill();
      c.fillStyle = "rgba(0,0,0,0.25)";
      roundRect(c, -20, -20, 40, 40, 8); c.fill();
    }

    const ang = tw.angle !== undefined ? tw.angle : -Math.PI / 2;
    const rec = (tw.recoil || 0) * 4;

    switch (tw.key) {
      case "bolt":
        c.fillStyle = "#334155"; c.beginPath(); c.arc(0, 0, 14, 0, 7); c.fill();
        c.rotate(ang);
        c.fillStyle = def.accent; c.fillRect(-6 - rec, -4, 26, 8);
        c.strokeStyle = def.color; c.lineWidth = 3;
        c.beginPath(); c.moveTo(8 - rec, -14); c.quadraticCurveTo(16 - rec, 0, 8 - rec, 14); c.stroke();
        if (tw.spec === "volley") { c.fillStyle = def.color; c.fillRect(-4 - rec, -11, 18, 4); c.fillRect(-4 - rec, 7, 18, 4); }
        if (tw.spec === "sniper") { c.fillStyle = "#e2e8f0"; c.fillRect(10 - rec, -2, 22, 4); }
        break;
      case "cannon":
        c.fillStyle = "#3f3f46"; c.beginPath(); c.arc(0, 0, 16, 0, 7); c.fill();
        c.rotate(ang);
        c.fillStyle = "#18181b"; roundRect(c, -2 - rec, -8, 28, 16, 4); c.fill();
        c.fillStyle = def.accent; c.fillRect(20 - rec, -9, 6, 18);
        if (tw.spec === "siege") { c.fillStyle = "#27272a"; roundRect(c, -4 - rec, -11, 22, 22, 5); c.fill(); }
        if (tw.spec === "cluster") { c.fillStyle = def.color; [-5, 5].forEach(o => { c.beginPath(); c.arc(4, o, 3, 0, 7); c.fill(); }); }
        c.fillStyle = def.color; c.beginPath(); c.arc(0, 0, 7, 0, 7); c.fill();
        break;
      case "frost": {
        const bob = Math.sin(t * 2 + tw.x) * 3;
        c.fillStyle = "rgba(34,211,238,0.18)"; c.beginPath(); c.arc(0, 0, 18, 0, 7); c.fill();
        c.translate(0, -4 + bob);
        c.rotate(t * 0.8);
        c.fillStyle = def.color; c.strokeStyle = "#ecfeff"; c.lineWidth = 2;
        c.beginPath();
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; c.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); }
        c.closePath(); c.fill(); c.stroke();
        c.fillStyle = tw.spec === "brittle" ? "#e0f2fe" : def.accent;
        c.beginPath(); c.arc(0, 0, 5, 0, 7); c.fill();
        if (tw.spec === "blizzard") { c.strokeStyle = "#ffffff"; for (let i = 0; i < 3; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(-17, 0); c.lineTo(17, 0); c.stroke(); } }
        break;
      }
      case "tesla": {
        c.fillStyle = "#1e1b4b"; c.beginPath(); c.arc(0, 0, 15, 0, 7); c.fill();
        c.strokeStyle = def.accent; c.lineWidth = 3;
        [12, 8].forEach(r => { c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); });
        const fl = 0.6 + Math.random() * 0.4 * (tw.recoil > 0.3 ? 1 : 0.3);
        c.fillStyle = tw.spec === "overload" ? `rgba(253,224,71,${fl})` : `rgba(196,181,253,${fl})`;
        c.beginPath(); c.arc(0, -2, tw.spec === "storm" ? 8 : 6, 0, 7); c.fill();
        c.shadowColor = def.color; c.shadowBlur = 12; c.fill(); c.shadowBlur = 0;
        break;
      }
      case "mortar":
        c.fillStyle = "#44403c"; roundRect(c, -16, -16, 32, 32, 6); c.fill();
        c.rotate(ang);
        c.fillStyle = "#1c1917"; c.beginPath(); c.arc(4 - rec, 0, 11, 0, 7); c.fill();
        c.fillStyle = def.accent; c.beginPath(); c.arc(4 - rec, 0, 7, 0, 7); c.fill();
        c.fillStyle = "#0c0a09"; c.beginPath(); c.arc(4 - rec, 0, 4, 0, 7); c.fill();
        if (tw.spec === "inferno") { c.fillStyle = "#ef4444"; c.fillRect(-14, -3, 6, 6); }
        if (tw.spec === "quake") { c.fillStyle = "#a8a29e"; c.fillRect(-15, -12, 5, 24); }
        break;
      case "prism": {
        c.fillStyle = "#312e81"; c.beginPath(); c.arc(0, 0, 14, 0, 7); c.fill();
        c.rotate(ang + Math.PI / 2);
        const glow = 0.5 + (tw.rampT || 0) * 0.3;
        c.fillStyle = def.color; c.strokeStyle = "#fdf4ff"; c.lineWidth = 2;
        c.beginPath(); c.moveTo(0, -17); c.lineTo(12, 9); c.lineTo(-12, 9); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = `rgba(255,255,255,${Math.min(1, glow)})`;
        c.beginPath(); c.moveTo(0, -9); c.lineTo(5, 4); c.lineTo(-5, 4); c.closePath(); c.fill();
        if (tw.spec === "fan") { c.fillStyle = def.accent; [-10, 10].forEach(o => { c.beginPath(); c.arc(o, -8, 3.5, 0, 7); c.fill(); }); }
        break;
      }
      case "beacon": {
        const pulse = 0.5 + 0.5 * Math.sin(t * 3 + tw.x);
        c.fillStyle = "#57534e"; c.fillRect(-7, -6, 14, 18);
        c.fillStyle = "#292524"; c.fillRect(-10, 10, 20, 5);
        c.fillStyle = tw.spec === "goldvein" ? "#fde047" : (tw.spec === "warhorn" ? "#fb7185" : def.color);
        c.shadowColor = c.fillStyle; c.shadowBlur = 10 + pulse * 10;
        c.beginPath(); c.arc(0, -12, 8 + pulse * 2, 0, 7); c.fill();
        c.shadowBlur = 0;
        break;
      }
    }
    c.restore();

    // Stufen-Punkte
    if (!opts.noPips) {
      c.save(); c.translate(tw.x, tw.y);
      for (let i = 0; i < Math.min(lvl, 3); i++) {
        c.fillStyle = "#fde68a";
        c.beginPath(); c.arc(-10 + i * 10, 20, 3, 0, 7); c.fill();
      }
      if (tw.spec) { c.fillStyle = "#f472b6"; c.beginPath(); c.moveTo(0, -30); c.lineTo(5, -24); c.lineTo(0, -18); c.lineTo(-5, -24); c.closePath(); c.fill(); }
      c.restore();
    }
  };

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  // ---------- Gegner ----------
  function drawEnemy(e, c) {
    c = c || ctx;
    const d = e.def, s = d.size;
    const alpha = e.revealed ? 1 : 0.22;
    c.save();
    c.translate(e.x, e.y);
    c.globalAlpha = alpha;

    if (e.flying) {
      c.fillStyle = "rgba(0,0,0,0.25)";
      c.beginPath(); c.ellipse(0, 18, s * 0.9, s * 0.35, 0, 0, 7); c.fill();
      c.translate(0, -8 + Math.sin(e.wobble) * 2);
    } else {
      c.fillStyle = "rgba(0,0,0,0.3)";
      c.beginPath(); c.ellipse(0, s * 0.7, s * 0.9, s * 0.35, 0, 0, 7); c.fill();
    }

    const col = e.hitFlash > 0 ? "#ffffff" : d.color;
    c.fillStyle = col;
    c.strokeStyle = "rgba(0,0,0,0.5)";
    c.lineWidth = 2;
    const bob = e.flying ? 0 : Math.abs(Math.sin(e.wobble)) * 2;

    switch (e.type) {
      case "runner":
        c.rotate(e.ang);
        c.beginPath(); c.moveTo(s + 2, 0); c.lineTo(-s, -s * 0.8); c.lineTo(-s * 0.6, 0); c.lineTo(-s, s * 0.8); c.closePath(); c.fill(); c.stroke();
        break;
      case "flyer": {
        const flap = Math.sin(e.wobble * 2) * 0.6;
        c.fillStyle = "rgba(186,230,253,0.7)";
        c.save(); c.rotate(e.ang);
        [-1, 1].forEach(side => { c.save(); c.scale(1, side); c.rotate(-0.4 - flap * 0.5); c.beginPath(); c.ellipse(-2, -s, s * 0.6, s * 1.1, 0.4, 0, 7); c.fill(); c.restore(); });
        c.fillStyle = col;
        c.beginPath(); c.moveTo(s, 0); c.lineTo(0, -s * 0.6); c.lineTo(-s, 0); c.lineTo(0, s * 0.6); c.closePath(); c.fill(); c.stroke();
        c.restore();
        break;
      }
      case "brute":
        c.translate(0, -bob);
        roundRect(c, -s, -s, s * 2, s * 2, 6); c.fill(); c.stroke();
        c.fillStyle = "#475569";
        roundRect(c, -s + 4, -s + 4, s * 2 - 8, s - 4, 3); c.fill();
        c.fillStyle = "#fef08a"; c.fillRect(-6, -s + 7, 4, 3); c.fillRect(2, -s + 7, 4, 3);
        break;
      case "shard":
        c.rotate(e.ang);
        c.beginPath(); c.moveTo(s, 0); c.lineTo(-s, -s); c.lineTo(-s, s); c.closePath(); c.fill(); c.stroke();
        break;
      case "phantom": {
        c.translate(0, -bob - 2);
        c.beginPath();
        c.arc(0, -2, s, Math.PI, 0);
        for (let i = 0; i <= 4; i++) c.lineTo(s - i * s / 2, s + (i % 2 ? -3 : 3) + Math.sin(e.wobble + i) * 2);
        c.closePath(); c.fill();
        c.fillStyle = "#1e1b4b"; c.fillRect(-5, -4, 3, 5); c.fillRect(2, -4, 3, 5);
        break;
      }
      case "riftwalker": {
        const now = performance.now() / 1000;
        c.save(); c.rotate(-now * 1.2);
        c.strokeStyle = "rgba(103,232,249,0.5)"; c.lineWidth = 2;
        c.beginPath(); c.arc(0, 0, s + 6, 0, Math.PI * 1.3); c.stroke();
        c.restore();
        c.save(); c.rotate(now * 2.2);
        c.fillStyle = col; c.shadowColor = "#22d3ee"; c.shadowBlur = 14;
        c.beginPath();
        for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, r = i % 2 ? s * 0.45 : s; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        c.closePath(); c.fill(); c.shadowBlur = 0; c.stroke();
        c.restore();
        c.fillStyle = "#0c4a6e"; c.beginPath(); c.arc(0, 0, s * 0.32, 0, 7); c.fill();
        c.fillStyle = "#ecfeff"; c.beginPath(); c.arc(0, 0, s * 0.14, 0, 7); c.fill();
        break;
      }
      case "boss": {
        const rot = performance.now() / 900;
        c.save(); c.rotate(rot);
        c.fillStyle = "#9f1239";
        c.beginPath();
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = i % 2 ? s : s + 10; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        c.closePath(); c.fill();
        c.restore();
        c.fillStyle = col; c.beginPath(); c.arc(0, 0, s - 2, 0, 7); c.fill(); c.stroke();
        c.fillStyle = "#fde047";
        c.beginPath(); c.moveTo(-12, -s + 4); c.lineTo(-8, -s - 8); c.lineTo(-3, -s + 1); c.lineTo(0, -s - 10); c.lineTo(3, -s + 1); c.lineTo(8, -s - 8); c.lineTo(12, -s + 4); c.closePath(); c.fill();
        c.fillStyle = "#1f2937"; c.beginPath(); c.arc(-9, -3, 4, 0, 7); c.arc(9, -3, 4, 0, 7); c.fill();
        break;
      }
      default: // grunt, splitter, healer, shield
        c.translate(0, -bob);
        c.beginPath(); c.arc(0, 0, s, 0, 7); c.fill(); c.stroke();
        if (e.type === "healer") { c.fillStyle = "#f0fdf4"; c.fillRect(-2, -7, 4, 14); c.fillRect(-7, -2, 14, 4); }
        else if (e.type === "splitter") { c.strokeStyle = "#7c2d12"; c.beginPath(); c.moveTo(-s, 0); c.lineTo(-3, -3); c.lineTo(4, 4); c.lineTo(s, 0); c.moveTo(0, -s); c.lineTo(-3, -3); c.stroke(); }
        else {
          const ex = Math.cos(e.ang) * 4, ey = Math.sin(e.ang) * 4;
          c.fillStyle = "#1f2937"; c.beginPath(); c.arc(ex - 3, ey - 2, 2.5, 0, 7); c.arc(ex + 3, ey - 2, 2.5, 0, 7); c.fill();
        }
    }

    // Status-Effekte
    if (e.slowT > 0) { c.fillStyle = "rgba(165,243,252,0.35)"; c.beginPath(); c.arc(0, 0, s + 3, 0, 7); c.fill(); }
    if (e.stunT > 0) { c.fillStyle = "#fde047"; for (let i = 0; i < 3; i++) { const a = performance.now() / 200 + i * 2.1; c.beginPath(); c.arc(Math.cos(a) * s, -s - 4 + Math.sin(a) * 3, 2.5, 0, 7); c.fill(); } }
    if (e.shield > 0) {
      c.strokeStyle = `rgba(147,197,253,${0.4 + 0.5 * e.shield / e.maxShield})`;
      c.lineWidth = 3; c.beginPath(); c.arc(0, 0, s + 6, 0, 7); c.stroke();
    }
    c.restore();

    // Lebensbalken
    if (e.hp < e.maxHp || e.shield < e.maxShield || d.boss || d.rare) {
      const w = d.boss ? 70 : d.rare ? 50 : Math.max(24, s * 2.2), h = d.boss || d.rare ? 6 : 4;
      const y = e.y - s - (e.flying ? 22 : 12) - (d.boss ? 12 : 0);
      c.globalAlpha = alpha;
      c.fillStyle = "rgba(0,0,0,0.6)"; c.fillRect(e.x - w / 2 - 1, y - 1, w + 2, h + 2);
      const hpR = Math.max(0, e.hp / e.maxHp);
      c.fillStyle = hpR > 0.5 ? "#4ade80" : (hpR > 0.25 ? "#facc15" : "#f87171");
      c.fillRect(e.x - w / 2, y, w * hpR, h);
      if (e.maxShield > 0 && e.shield > 0) { c.fillStyle = "#93c5fd"; c.fillRect(e.x - w / 2, y - 3, w * (e.shield / e.maxShield), 2); }
      c.globalAlpha = 1;
    }
  }

  // ---------- Portale ----------
  function drawPortals(G) {
    const t = performance.now() / 1000;
    const starts = new Set(), ends = new Set();
    G.map.paths.forEach(p => { starts.add(JSON.stringify(p[0])); ends.add(JSON.stringify(p[p.length - 1])); });
    starts.forEach(s => {
      const [c, r] = JSON.parse(s);
      const x = Math.max(0, Math.min(C.COLS - 1, c)) * T + T / 2 - (c < 0 ? 22 : 0), y = r * T + T / 2;
      ctx.save(); ctx.translate(x, y);
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `rgba(167,139,250,${0.7 - i * 0.2})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, 10 + i * 6 + Math.sin(t * 3 + i) * 2, 26 + i * 4, 0, 0, 7); ctx.stroke();
      }
      ctx.fillStyle = "rgba(76,29,149,0.6)"; ctx.beginPath(); ctx.ellipse(0, 0, 10, 24, 0, 0, 7); ctx.fill();
      ctx.restore();
    });
    ends.forEach(s => {
      const [c, r] = JSON.parse(s);
      const x = Math.max(0, Math.min(C.COLS - 1, c)) * T + T / 2 + (c >= C.COLS ? 16 : 0), y = r * T + T / 2;
      const lifeR = G.lives / G.maxLives;
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(0, 18, 20, 7, 0, 0, 7); ctx.fill();
      ctx.rotate(Math.sin(t) * 0.1);
      const col = lifeR > 0.5 ? "#38bdf8" : (lifeR > 0.25 ? "#facc15" : "#f87171");
      ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(14, 0); ctx.lineTo(0, 16); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(6, -2); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
    });
  }

  // ---------- Hauptzeichnung ----------
  SF.render.frame = function (G, ui) {
    if (!ctx) return;
    ctx.save();
    ctx.clearRect(0, 0, C.WIDTH, C.HEIGHT);
    if (!G) { ctx.restore(); return; }
    if (!bg || bgGame !== G || !G.deco) buildBackground(G);

    if (G.shake > 0) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
    ctx.drawImage(bg, 0, 0);

    const occupied = new Set(G.towers.map(t => t.col + "," + t.row));
    G.deco.forEach(d => { if (!occupied.has(d.c + "," + d.r)) drawDeco(d, G.themeResolved || G.map.theme); });

    drawPortals(G);

    // brennender Boden
    G.burns.forEach(b => {
      const a = Math.min(1, b.t / b.max) * 0.5;
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, `rgba(251,146,60,${a})`); g.addColorStop(1, "rgba(239,68,68,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    });

    // Riss
    if (G.rift) drawRift(G.rift, G);

    // Auswahl & Bau-Vorschau
    const sel = ui.selectedTower;
    if (sel) {
      drawRange(sel.x, sel.y, sel.stats.range, sel.stats.minRange, sel.def.color);
      if (sel.def.support) G.towers.forEach(t => { if (t !== sel && !t.def.support && SF.util.dist2(t.x, t.y, sel.x, sel.y) <= sel.stats.range ** 2) { ctx.strokeStyle = "rgba(253,230,138,0.8)"; ctx.lineWidth = 2; ctx.strokeRect(t.x - 26, t.y - 26, 52, 52); } });
    }
    if (ui.hoverCell && ui.buildKey) {
      const { c, r } = ui.hoverCell;
      const ok = SF.canBuildAt(c, r) && G.gold >= SF.TOWERS[ui.buildKey].levels[0].cost;
      ctx.fillStyle = ok ? "rgba(74,222,128,0.18)" : "rgba(248,113,113,0.25)";
      ctx.fillRect(c * T, r * T, T, T);
      const st = SF.getTowerStats(ui.buildKey, 1, null);
      if (SF.canBuildAt(c, r)) {
        drawRange((c + .5) * T, (r + .5) * T, st.range, st.minRange, SF.TOWERS[ui.buildKey].color);
        SF.cosmetics.drawGhost(ctx, ui.buildKey, (c + .5) * T, (r + .5) * T);
      }
    } else if (ui.hoverCell && !sel) {
      const { c, r } = ui.hoverCell;
      if (SF.towerAt(c, r)) { ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 2; ctx.strokeRect(c * T + 2, r * T + 2, T - 4, T - 4); }
    }

    // Türme
    G.towers.forEach(tw => SF.render.drawTower(ctx, tw));
    if (sel) { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(sel.x - 28, sel.y - 28, 56, 56); ctx.setLineDash([]); }

    // Strahlen
    G.towers.forEach(tw => {
      if (tw.def.kind !== "beam" || !tw.beamTargets || !tw.beamTargets.length) return;
      const k = tw.rampT / tw.stats.rampTime;
      tw.beamTargets.forEach(e => {
        if (!e.alive) return;
        ctx.strokeStyle = `rgba(240,171,252,${0.35 + k * 0.4})`; ctx.lineWidth = 6 + k * 6;
        ctx.beginPath(); ctx.moveTo(tw.x, tw.y - 6); ctx.lineTo(e.x, e.y - (e.flying ? 8 : 0)); ctx.stroke();
        ctx.strokeStyle = "#fdf4ff"; ctx.lineWidth = 2 + k * 2;
        ctx.beginPath(); ctx.moveTo(tw.x, tw.y - 6); ctx.lineTo(e.x, e.y - (e.flying ? 8 : 0)); ctx.stroke();
      });
    });

    // Gegner (Boden zuerst, dann Flieger)
    G.enemies.forEach(e => { if (!e.flying) drawEnemy(e); });
    G.enemies.forEach(e => { if (e.flying) drawEnemy(e); });

    // Projektile
    G.projectiles.forEach(p => {
      ctx.save();
      if (p.kind === "shell" || p.kind === "bomblet") {
        const sz = p.kind === "shell" ? 7 : 4;
        ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, sz, sz * 0.5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = "#292524"; ctx.beginPath(); ctx.arc(p.x, p.y - (p.z || 0), sz, 0, 7); ctx.fill();
        ctx.fillStyle = "#fb923c"; ctx.beginPath(); ctx.arc(p.x - 2, p.y - (p.z || 0) - 2, sz * 0.35, 0, 7); ctx.fill();
      } else {
        ctx.translate(p.x, p.y); ctx.rotate(p.ang || 0);
        if (p.kind === "bolt") { ctx.fillStyle = SF.cosmetics ? SF.cosmetics.boltColor(p.crit) : (p.crit ? "#fde047" : "#e0f2fe"); ctx.fillRect(-9, -1.5, 18, 3); ctx.fillStyle = "#0ea5e9"; ctx.fillRect(-9, -3, 4, 6); }
        else if (p.kind === "cannon") { ctx.fillStyle = "#18181b"; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill(); }
        else if (p.kind === "frost") { ctx.fillStyle = "#cffafe"; ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill(); }
      }
      ctx.restore();
    });

    // Effekte
    G.fx.forEach(f => {
      const k = f.t / f.dur;
      if (f.type === "explosion") {
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.4 + k * 0.7), 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (f.type === "ring") {
        ctx.strokeStyle = f.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r + (f.max - f.r) * k, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
      } else if (f.type === "lightning") {
        ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.globalAlpha = 1 - k;
        ctx.shadowColor = f.color; ctx.shadowBlur = 10;
        ctx.beginPath();
        for (let i = 0; i < f.pts.length - 1; i++) {
          const a = f.pts[i], b = f.pts[i + 1];
          ctx.moveTo(a.x, a.y);
          for (let j = 1; j <= 4; j++) { const q = j / 5; ctx.lineTo(a.x + (b.x - a.x) * q + (Math.random() - .5) * 14, a.y + (b.y - a.y) * q + (Math.random() - .5) * 14); }
          ctx.lineTo(b.x, b.y);
        }
        ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
    });

    // Partikel
    G.particles.forEach(p => { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); });
    ctx.globalAlpha = 1;

    // Schwebende Zahlen
    ctx.textAlign = "center";
    G.floaters.forEach(f => {
      ctx.globalAlpha = 1 - f.t / f.max;
      ctx.font = (f.big ? "bold 20px " : "bold 13px ") + "Rajdhani, system-ui, sans-serif";
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    });
    ctx.globalAlpha = 1;

    ctx.restore();
  };

  function drawRift(R, G) {
    const t = performance.now() / 1000;
    const age = Math.min(1, (G.time - R.born) / 0.6); // Aufreiß-Animation
    const pts = R.pts;
    const n = Math.max(2, Math.ceil(pts.length * age));
    const line = () => { ctx.beginPath(); for (let i = 0; i < n; i++) i ? ctx.lineTo(pts[i].x, pts[i].y) : ctx.moveTo(pts[i].x, pts[i].y); };
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // gesperrte Felder leicht markieren
    if (SF.ui && SF.ui.buildKey) { ctx.fillStyle = "rgba(8,145,178,0.12)"; G.riftTiles.forEach(k => { const [c, r] = k.split(",").map(Number); ctx.fillRect(c * T, r * T, T, T); }); }
    ctx.strokeStyle = "rgba(2,6,23,0.85)"; ctx.lineWidth = 26; line(); ctx.stroke();
    ctx.strokeStyle = "#083344"; ctx.lineWidth = 18; line(); ctx.stroke();
    ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 18;
    ctx.strokeStyle = `rgba(34,211,238,${0.65 + 0.25 * Math.sin(t * 4)})`; ctx.lineWidth = 8; line(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(236,254,255,0.9)"; ctx.lineWidth = 2; line(); ctx.stroke();
    // aufsteigende Funken
    for (let i = 0; i < 14; i++) {
      const k = (t * 0.35 + i / 14) % 1;
      const seg = Math.floor((i * 7) % (pts.length - 1));
      const a = pts[seg], b = pts[seg + 1];
      const q = (i * 0.37) % 1;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = "#a5f3fc";
      ctx.fillRect(a.x + (b.x - a.x) * q - 1.5, a.y + (b.y - a.y) * q - k * 26 - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
    // Wellen-Anzeige am Rissanfang
    ctx.font = "bold 12px Rajdhani, system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillStyle = "rgba(2,6,23,0.75)"; ctx.fillRect(pts[0].x - 40, pts[0].y - 34, 80, 16);
    ctx.fillStyle = "#67e8f9"; ctx.fillText("RISS · noch " + R.wavesLeft + " W.", pts[0].x, pts[0].y - 22);
    ctx.restore();
  }

  function drawRange(x, y, r, minR, color) {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    if (minR) { ctx.fillStyle = "rgba(248,113,113,0.12)"; ctx.beginPath(); ctx.arc(x, y, minR, 0, 7); ctx.fill(); }
  }

  // kleines Turm-Icon für Buttons
  SF.render.drawEnemyOn = function (c, e) { drawEnemy(e, c); };

  SF.render.enemyIcon = function (type, size) {
    const cv = document.createElement("canvas");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cv.height = size * dpr;
    cv.style.width = cv.style.height = size + "px";
    const x = cv.getContext("2d");
    const d = SF.ENEMIES[type];
    const box = (d.size + 14) * 2.2;
    x.scale(size * dpr / box, size * dpr / box);
    drawEnemy({ type, def: d, x: box / 2, y: box / 2 + (d.flying ? 6 : 0), ang: 0, wobble: 1, flying: !!d.flying, revealed: true,
      hp: 1, maxHp: 1, shield: d.shield || 0, maxShield: d.shield || 0, slowT: 0, stunT: 0, hitFlash: 0 }, x);
    return cv;
  };

  SF.render.towerIcon = function (key, size, level, spec) {
    const c = document.createElement("canvas");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = c.height = size * dpr;
    c.style.width = c.style.height = size + "px";
    const x = c.getContext("2d");
    x.scale(size * dpr / 64, size * dpr / 64);
    SF.render.drawTower(x, { key, x: 32, y: 30, level: level || 1, spec: spec || null }, { noPips: !level });
    return c;
  };

  SF.render.invalidateBackground = function () { bg = null; };
})();
