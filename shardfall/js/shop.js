/* Shardfall – Kristall-Shop
 * Riftkristalle (✦) sind die seltene Währung. Alles im Shop ist rein kosmetisch,
 * damit die Bestenliste fair bleibt.
 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const fmt = n => Math.round(n).toLocaleString("de-DE");

  // ---------------------------------------------------------------- Seltenheiten
  SF.RARITIES = {
    common:    { name: "Gewöhnlich", color: "#cbd5e1" },
    rare:      { name: "Selten",     color: "#60a5fa" },
    epic:      { name: "Episch",     color: "#c084fc" },
    legendary: { name: "Legendär",   color: "#fbbf24" }
  };

  SF.SHOP_CATEGORIES = [
    { key: "theme",   name: "Farbthemen",  desc: "Farben der ganzen Oberfläche" },
    { key: "pattern", name: "Turm-Muster", desc: "Muster auf den Sockeln aller Türme" },
    { key: "terrain", name: "Gelände",     desc: "Boden, Wege und Bäume auf jeder Karte" },
    { key: "effect",  name: "Effekte",     desc: "Bolzen und Partikel, wenn Gegner fallen" },
    { key: "holo",    name: "Bau-Vorschau", desc: "Wie der Turm beim Platzieren aussieht" }
  ];

  // ---------------------------------------------------------------- Gegenstände
  SF.SHOP_ITEMS = [
    // Farbthemen
    { id: "theme_default",  cat: "theme", name: "Rift-Violett",   rarity: "common", cost: 0, desc: "Das Original.", colors: ["#0b1020", "#111833", "#a78bfa", "#38bdf8"] },
    { id: "theme_midnight", cat: "theme", name: "Mitternacht",    rarity: "common", cost: 8, desc: "Schlicht, dunkel, ruhig.", colors: ["#09090b", "#18181b", "#e4e4e7", "#71717a"] },
    { id: "theme_emerald",  cat: "theme", name: "Smaragd",        rarity: "common", cost: 8, desc: "Frisches Grün der Kristallwiesen.", colors: ["#04140e", "#082419", "#34d399", "#a3e635"] },
    { id: "theme_neon",     cat: "theme", name: "Neon",           rarity: "rare",   cost: 20, desc: "Leuchtendes Cyan und Pink.", colors: ["#03101a", "#06202e", "#22d3ee", "#f472b6"] },
    { id: "theme_ember",    cat: "theme", name: "Glut",           rarity: "rare",   cost: 20, desc: "Warme Töne aus dem Aschepass.", colors: ["#170806", "#25100b", "#fb923c", "#f43f5e"] },
    { id: "theme_royal",    cat: "theme", name: "Königsgold",     rarity: "legendary", cost: 100, desc: "Gold auf tiefem Purpur. Für Legenden.", colors: ["#120a1c", "#1d1030", "#fbbf24", "#e879f9"] },

    // Turm-Muster
    { id: "pattern_default",  cat: "pattern", name: "Stein",          rarity: "common", cost: 0,  desc: "Sockelfarbe zeigt die Stufe." },
    { id: "pattern_marble",   cat: "pattern", name: "Marmor",         rarity: "common", cost: 8,  desc: "Heller Stein mit feinen Adern." },
    { id: "pattern_grid",     cat: "pattern", name: "Kristallgitter", rarity: "rare",   cost: 18,  desc: "Leuchtende Linien aus Riftkristall." },
    { id: "pattern_runes",    cat: "pattern", name: "Runenstein",     rarity: "epic",   cost: 45, desc: "Uralte Zeichen, die schwach glühen." },
    { id: "pattern_obsidian", cat: "pattern", name: "Obsidian",       rarity: "epic",   cost: 48, desc: "Schwarzes Glas mit violettem Schimmer." },
    { id: "pattern_goldfil",  cat: "pattern", name: "Goldfiligran",   rarity: "legendary", cost: 110, desc: "Handgearbeitetes Gold mit feinen Ornamenten." },
    { id: "pattern_aurora",   cat: "pattern", name: "Polarlicht",     rarity: "legendary", cost: 130, desc: "Die Farben wandern ständig über den Sockel." },

    // Gelände
    { id: "terrain_default", cat: "terrain", name: "Kartenstil",    rarity: "common", cost: 0,  desc: "Jede Karte in ihren eigenen Farben." },
    { id: "terrain_night",   cat: "terrain", name: "Mondnacht",     rarity: "rare",   cost: 20, desc: "Alle Karten bei Nacht.", t: { ground: "#131d33", ground2: "#16233d", path: "#3c475e", pathEdge: "#212a3c", leaf: ["#1e3a5f", "#2a4d7a"], accent: "#93c5fd" } },
    { id: "terrain_autumn",  cat: "terrain", name: "Herbstlaub",    rarity: "rare",   cost: 24, desc: "Goldene Wälder und warme Wege.", t: { ground: "#3a2d19", ground2: "#43341d", path: "#6e5737", pathEdge: "#4a3a25", leaf: ["#c2410c", "#f59e0b"], accent: "#fb923c" } },
    { id: "terrain_sakura",  cat: "terrain", name: "Kirschblüte",   rarity: "epic",   cost: 50, desc: "Rosa Blüten über grünen Wiesen.", t: { ground: "#22402b", ground2: "#284a32", path: "#7a6857", pathEdge: "#57493c", leaf: ["#f472b6", "#fbcfe8"], accent: "#f9a8d4" } },
    { id: "terrain_void",    cat: "terrain", name: "Die Leere",     rarity: "legendary", cost: 120, desc: "Das Innere des Risses. Nichts ist, wie es scheint.", t: { ground: "#0b0716", ground2: "#110a20", path: "#2b2040", pathEdge: "#170f26", leaf: ["#5b21b6", "#a855f7"], accent: "#c084fc" } },

    // Effekte
    { id: "effect_default", cat: "effect", name: "Klassisch",   rarity: "common", cost: 0,  desc: "Partikel in der Farbe des Gegners." },
    { id: "effect_ember",   cat: "effect", name: "Funkenflug",  rarity: "common", cost: 10,  desc: "Glühende Funken.", colors: ["#f97316", "#ef4444", "#fde047"] },
    { id: "effect_gold",    cat: "effect", name: "Goldstaub",   rarity: "rare",   cost: 25, desc: "Jeder Treffer glitzert golden.", colors: ["#fde047", "#fbbf24", "#fef3c7"] },
    { id: "effect_void",    cat: "effect", name: "Void-Treffer", rarity: "epic",  cost: 45, desc: "Violette Risssplitter.", colors: ["#a855f7", "#7c3aed", "#e9d5ff"] },
    { id: "effect_rainbow", cat: "effect", name: "Regenbogen",  rarity: "legendary", cost: 90, desc: "Alle Farben auf einmal.", rainbow: true },

    // Bau-Vorschau
    { id: "holo_default", cat: "holo", name: "Schatten",          rarity: "common", cost: 0, desc: "Halbtransparenter Turm." },
    { id: "holo_crystal", cat: "holo", name: "Kristall-Hologramm", rarity: "common", cost: 8, desc: "Cyan-Hologramm mit Scanlinien." },
    { id: "holo_flame",   cat: "holo", name: "Flammenumriss",     rarity: "rare",   cost: 18, desc: "Der Bauplatz brennt." }
  ];
  const byId = id => SF.SHOP_ITEMS.find(i => i.id === id);

  // ---------------------------------------------------------------- Speicher
  function ensureSave() {
    const s = SF.save;
    if (typeof s.crystals !== "number") s.crystals = 0;
    s.owned = s.owned || {};
    s.equipped = s.equipped || {};
    s.crystalStats = s.crystalStats || { earned: 0, spent: 0, bought: 0 };
    SF.SHOP_ITEMS.forEach(i => { if (i.cost === 0) s.owned[i.id] = true; });
    SF.SHOP_CATEGORIES.forEach(c => { if (!s.equipped[c.key] || !s.owned[s.equipped[c.key]]) s.equipped[c.key] = c.key + "_default"; });
    // Startgeschenk + Kristalle für schon vorhandene Erfolge (einmalig)
    if (!s.starterGiven) {
      s.starterGiven = true;
      let gift = 5;
      SF.ACHIEVEMENTS.forEach(a => { if (s.achievements[a.id]) gift += a.hard ? 5 : 2; });
      s.crystals += gift; s.crystalStats.earned += gift;
    }
    SF.persist();
  }

  // ---------------------------------------------------------------- Kristalle
  SF.crystals = {
    get: () => SF.save.crystals,
    add(n, reason) {
      if (n <= 0) return;
      SF.save.crystals += n;
      SF.save.crystalStats.earned += n;
      SF.persist();
      const G = SF.getGame();
      if (G) G.crystalsRun = (G.crystalsRun || 0) + n;
      SF.emit("crystals", { n, reason });
    },
    // am Ende eines Runs: Wellenbonus je nach Schwierigkeit + Siegbonus (nur Differenz, falls nach Sieg weitergespielt wird)
    settleRun(G) {
      if (!G || G.cheated) return 0;
      let n = 0;
      // Albtraum zahlt mehr: Entspannt 1 pro 15 Wellen, Normal 1 pro 10, Albtraum 1 pro 6
      const waveCrystals = Math.floor(G.wave / ({ easy: 15, normal: 10, hard: 6 }[G.diff.key] || 10));
      n += Math.max(0, waveCrystals - (G.waveCrystalsPaid || 0));
      G.waveCrystalsPaid = waveCrystals;
      if (G.won && !G.victoryPaid) { G.victoryPaid = true; n += { easy: 1, normal: 2, hard: 4 }[G.diff.key] || 2; }
      if (n) SF.crystals.add(n, "run");
      return n;
    }
  };

  // Belohnungen aus dem Spiel
  SF.on("achievement", a => SF.crystals.add(a.hard ? 3 : 1, "achievement"));

  // ---------------------------------------------------------------- Kaufen / Ausrüsten
  function dailyOffer() {
    const d = new Date();
    const seed = SF.util.hashStr("shop:" + d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate());
    const pool = SF.SHOP_ITEMS.filter(i => i.cost > 0 && !SF.save.owned[i.id]);
    if (!pool.length) return null;
    return { item: pool[seed % pool.length], price: Math.max(1, Math.round(pool[seed % pool.length].cost * 0.7)) };
  }
  const priceOf = item => { const o = dailyOffer(); return o && o.item.id === item.id ? o.price : item.cost; };

  SF.shop = {
    tryOn(id) {
      const item = byId(id);
      if (!item) return;
      if (previewSel[item.cat] === id) delete previewSel[item.cat];
      else previewSel[item.cat] = id;
      SF.cosmetics.apply();
      SF.audio.play("click");
      render();
    },
    clearPreview() {
      Object.keys(previewSel).forEach(k => delete previewSel[k]);
      SF.cosmetics.apply();
      if ($("shop") && !$("shop").hidden) render();
    },
    buy(id) {
      const item = byId(id);
      if (!item || SF.save.owned[id]) return false;
      const price = priceOf(item);
      if (SF.save.crystals < price) { SF.ui.toast("Nicht genug Riftkristalle.", "bad"); SF.audio.play("error"); return false; }
      SF.save.crystals -= price;
      SF.save.owned[id] = true;
      delete previewSel[item.cat];
      SF.save.crystalStats.spent += price;
      SF.save.crystalStats.bought++;
      SF.shop.equip(id, true);
      SF.audio.play("win");
      SF.ui.toast("✦ " + item.name + " gekauft und ausgerüstet!", "good");
      SF.achievements.check(SF.getGame());
      return true;
    },
    equip(id, silent) {
      const item = byId(id);
      if (!item || !SF.save.owned[id]) return;
      SF.save.equipped[item.cat] = id;
      SF.persist();
      SF.cosmetics.apply();
      if (!silent) SF.audio.play("click");
      render();
    }
  };

  // ---------------------------------------------------------------- Kosmetik anwenden
  // Anprobieren: Vorschau-Auswahl hat Vorrang vor dem Ausgerüsteten
  const previewSel = {};
  const eq = cat => byId(previewSel[cat]) || byId(SF.save.equipped && SF.save.equipped[cat]) || byId(cat + "_default");
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  SF.cosmetics = {
    apply() {
      const t = eq("theme").id.replace("theme_", "");
      if (t === "default") document.documentElement.removeAttribute("data-theme");
      else document.documentElement.setAttribute("data-theme", t);
      if (SF.render && SF.render.invalidateBackground) SF.render.invalidateBackground();
    },
    pattern: () => eq("pattern").id.replace("pattern_", ""),
    terrain(theme, overrideId) {
      const it = overrideId ? byId(overrideId) : eq("terrain");
      return it && it.t ? Object.assign({}, theme, it.t) : theme;
    },
    killColor(base, overrideId) {
      const it = overrideId ? byId(overrideId) : eq("effect");
      if (!it || it.id === "effect_default") return base;
      if (it.rainbow) return () => `hsl(${Math.floor(Math.random() * 360)},90%,65%)`;
      return () => pick(it.colors);
    },
    boltColor(crit) {
      if (crit) return "#fde047";
      const it = eq("effect");
      if (it.rainbow) return `hsl(${(performance.now() / 4) % 360},90%,70%)`;
      return it.colors ? it.colors[0] : "#e0f2fe";
    },
    holo: () => eq("holo").id.replace("holo_", "")
  };

  // Sockel eines Turms zeichnen (wird von render.drawTower aufgerufen)
  SF.cosmetics.drawPlate = function (c, lvl, roundRect, patternOverride) {
    const pat = patternOverride || SF.cosmetics.pattern();
    const LEVEL = ["#57534e", "#78716c", "#a8a29e", "#fbbf24"];
    const t = performance.now() / 1000;
    const outer = () => roundRect(c, -24, -24, 48, 48, 10);
    const inner = () => roundRect(c, -20, -20, 40, 40, 8);
    c.save();
    switch (pat) {
      case "marble": {
        c.fillStyle = "#e7e5e4"; outer(); c.fill();
        c.save(); outer(); c.clip();
        c.strokeStyle = "rgba(87,83,78,0.45)"; c.lineWidth = 1.2;
        [[-24, -10, 0, -18, 24, 4], [-24, 12, -6, 2, 24, 18], [-10, -24, -4, 0, 6, 24]].forEach(([a, b, cx, cy, d, e]) => { c.beginPath(); c.moveTo(a, b); c.quadraticCurveTo(cx, cy, d, e); c.stroke(); });
        c.restore();
        c.fillStyle = "rgba(0,0,0,0.18)"; inner(); c.fill();
        break;
      }
      case "grid": {
        c.fillStyle = "#0e3a4a"; outer(); c.fill();
        c.save(); outer(); c.clip();
        c.strokeStyle = "rgba(103,232,249,0.45)"; c.lineWidth = 1;
        for (let i = -48; i <= 48; i += 10) { c.beginPath(); c.moveTo(i, -24); c.lineTo(i + 48, 24); c.stroke(); c.beginPath(); c.moveTo(i, 24); c.lineTo(i + 48, -24); c.stroke(); }
        c.restore();
        c.fillStyle = "rgba(2,20,30,0.45)"; inner(); c.fill();
        break;
      }
      case "runes": {
        c.fillStyle = "#3f3a36"; outer(); c.fill();
        c.fillStyle = "rgba(0,0,0,0.3)"; inner(); c.fill();
        const glow = 0.55 + 0.35 * Math.sin(t * 2);
        c.fillStyle = `rgba(251,191,36,${glow})`; c.shadowColor = "#f59e0b"; c.shadowBlur = 6;
        [[-17, -22], [-5, -22], [7, -22], [-22, -8], [-22, 6], [19, -8], [19, 6], [-11, 19], [3, 19]].forEach(([x, y], i) => {
          if (i % 3 === 0) c.fillRect(x, y, 2, 4); else if (i % 3 === 1) { c.fillRect(x, y, 4, 1.6); c.fillRect(x + 1, y, 1.6, 4); } else c.fillRect(x, y + 1, 4, 2);
        });
        c.shadowBlur = 0;
        break;
      }
      case "obsidian": {
        const g = c.createLinearGradient(-24, -24, 24, 24);
        g.addColorStop(0, "#1c1525"); g.addColorStop(0.5, "#0a0710"); g.addColorStop(1, "#2a1840");
        c.fillStyle = g; outer(); c.fill();
        c.strokeStyle = "rgba(168,85,247,0.8)"; c.lineWidth = 1.5; c.shadowColor = "#a855f7"; c.shadowBlur = 8; outer(); c.stroke(); c.shadowBlur = 0;
        c.fillStyle = "rgba(88,28,135,0.25)"; inner(); c.fill();
        break;
      }
      case "goldfil": {
        const g = c.createLinearGradient(-24, -24, 24, 24);
        g.addColorStop(0, "#fde68a"); g.addColorStop(0.5, "#d97706"); g.addColorStop(1, "#fbbf24");
        c.fillStyle = g; outer(); c.fill();
        c.strokeStyle = "rgba(254,243,199,0.7)"; c.lineWidth = 1;
        [[-17, -17], [17, -17], [-17, 17], [17, 17]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 5, 0, 7); c.stroke(); c.beginPath(); c.arc(x, y, 2, 0, 7); c.stroke(); });
        c.fillStyle = "rgba(120,53,15,0.35)"; inner(); c.fill();
        break;
      }
      case "aurora": {
        const h = (t * 40) % 360;
        const g = c.createLinearGradient(-24, -24, 24, 24);
        g.addColorStop(0, `hsl(${h},80%,55%)`); g.addColorStop(0.5, `hsl(${(h + 70) % 360},80%,50%)`); g.addColorStop(1, `hsl(${(h + 150) % 360},80%,55%)`);
        c.fillStyle = g; outer(); c.fill();
        c.fillStyle = "rgba(0,0,0,0.3)"; inner(); c.fill();
        break;
      }
      default:
        c.fillStyle = LEVEL[Math.min(lvl, 4) - 1]; outer(); c.fill();
        c.fillStyle = "rgba(0,0,0,0.25)"; inner(); c.fill();
    }
    if (lvl >= 4 && pat !== "default") { c.strokeStyle = "#fbbf24"; c.lineWidth = 2; outer(); c.stroke(); }
    c.restore();
  };

  // Bau-Vorschau (Geist-Turm) zeichnen
  SF.cosmetics.drawGhost = function (c, key, x, y, holoOverride) {
    const holo = holoOverride || SF.cosmetics.holo();
    const t = performance.now() / 1000;
    const T = SF.CONFIG.TILE;
    if (holo === "crystal") {
      SF.render.drawTower(c, { key, x, y, level: 1 }, { alpha: 0.45, noPips: true });
      c.save();
      c.fillStyle = "rgba(34,211,238,0.18)"; c.fillRect(x - T / 2, y - T / 2, T, T);
      c.strokeStyle = "rgba(103,232,249,0.9)"; c.lineWidth = 2; c.shadowColor = "#22d3ee"; c.shadowBlur = 10;
      c.strokeRect(x - T / 2 + 3, y - T / 2 + 3, T - 6, T - 6); c.shadowBlur = 0;
      c.fillStyle = "rgba(165,243,252,0.25)";
      for (let i = 0; i < 8; i++) { const yy = y - T / 2 + ((i * 8 + t * 30) % T); c.fillRect(x - T / 2 + 3, yy, T - 6, 1.5); }
      c.restore();
    } else if (holo === "flame") {
      c.save();
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2 + t * 2, r = 28 + Math.sin(t * 9 + i) * 3;
        c.fillStyle = i % 2 ? "rgba(251,146,60,0.7)" : "rgba(239,68,68,0.6)";
        c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 4 + Math.sin(t * 7 + i) * 1.5, 0, 7); c.fill();
      }
      c.restore();
      SF.render.drawTower(c, { key, x, y, level: 1 }, { alpha: 0.6, noPips: true });
    } else {
      SF.render.drawTower(c, { key, x, y, level: 1 }, { alpha: 0.55, noPips: true });
    }
  };

  // ---------------------------------------------------------------- Vorschaubilder
  function preview(item, w, h) {
    const cv = document.createElement("canvas");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = w * dpr; cv.height = h * dpr;
    cv.style.width = w + "px"; cv.style.height = h + "px";
    const c = cv.getContext("2d");
    c.scale(dpr, dpr);
    if (item.cat === "theme") {
      const [bg, panel, a1, a2] = item.colors;
      c.fillStyle = bg; c.fillRect(0, 0, w, h);
      c.fillStyle = panel; c.fillRect(10, 12, w - 20, h - 24);
      c.fillStyle = a1; c.fillRect(20, 22, w * 0.45, 8);
      c.fillStyle = a2; c.beginPath(); c.arc(w - 30, 26, 6, 0, 7); c.fill();
      const g = c.createLinearGradient(0, h - 44, 0, h - 22); g.addColorStop(0, a1); g.addColorStop(1, a2);
      c.fillStyle = g; c.beginPath(); c.roundRect ? c.roundRect(20, h - 44, w - 40, 18, 6) : c.rect(20, h - 44, w - 40, 18); c.fill();
      c.fillStyle = "rgba(255,255,255,0.25)"; c.fillRect(20, 38, w * 0.6, 4); c.fillRect(20, 46, w * 0.4, 4);
    } else if (item.cat === "pattern") {
      c.fillStyle = "#1f3b2a"; c.fillRect(0, 0, w, h);
      const pat = item.id.replace("pattern_", "");
      c.save(); c.translate(w * 0.3, h / 2); c.scale(0.95, 0.95);
      SF.render.drawTower(c, { key: "bolt", x: 0, y: 0, level: 1, pattern: pat }, { noPips: true });
      c.restore();
      c.save(); c.translate(w * 0.7, h / 2); c.scale(0.95, 0.95);
      SF.render.drawTower(c, { key: "cannon", x: 0, y: 0, level: 4, spec: "siege", pattern: pat }, { noPips: true });
      c.restore();
    } else if (item.cat === "terrain") {
      const map = SF.MAPS[0];
      const th = SF.cosmetics.terrain(map.theme, item.id);
      const s = w / 10;
      for (let r = 0; r < 6; r++) for (let col = 0; col < 10; col++) { c.fillStyle = (r + col) % 2 ? th.ground : th.ground2; c.fillRect(col * s, r * s, s, s); }
      c.strokeStyle = th.pathEdge; c.lineWidth = s * 0.95; c.lineCap = "round"; c.lineJoin = "round";
      const pts = [[-0.5, 1.5], [3.5, 1.5], [3.5, 4.5], [10.5, 4.5]];
      const line = () => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x * s, y * s) : c.moveTo(x * s, y * s)); c.stroke(); };
      line(); c.strokeStyle = th.path; c.lineWidth = s * 0.75; line();
      const leaf = th.leaf || ["#166534", "#15803d"];
      [[6, 1.6], [8, 2.2], [1.4, 3.6], [7.2, 0.8]].forEach(([x, y]) => {
        c.fillStyle = "#3b2a1a"; c.fillRect(x * s - 1, y * s, 2, 6);
        c.fillStyle = leaf[0]; c.beginPath(); c.arc(x * s, y * s - 2, 7, 0, 7); c.fill();
        c.fillStyle = leaf[1]; c.beginPath(); c.arc(x * s - 2, y * s - 4, 4, 0, 7); c.fill();
      });
    } else if (item.cat === "effect") {
      c.fillStyle = "#14532d"; c.fillRect(0, 0, w, h);
      const col = SF.cosmetics.killColor("#a3e635", item.id);
      const rng = SF.util.mulberry32(SF.util.hashStr(item.id));
      for (let i = 0; i < 46; i++) {
        const a = rng() * Math.PI * 2, d = 6 + rng() * 34;
        c.globalAlpha = 1 - d / 46;
        c.fillStyle = typeof col === "function" ? col() : col;
        const sz = 2 + rng() * 3;
        c.fillRect(w / 2 + Math.cos(a) * d * 1.3, h / 2 + Math.sin(a) * d, sz, sz);
      }
      c.globalAlpha = 1;
    } else if (item.cat === "holo") {
      c.fillStyle = "#1f3b2a"; c.fillRect(0, 0, w, h);
      c.strokeStyle = "rgba(0,0,0,0.2)";
      for (let x = 0; x < w; x += 32) { c.beginPath(); c.moveTo(x + .5, 0); c.lineTo(x + .5, h); c.stroke(); }
      c.save(); c.translate(w / 2, h / 2); c.scale(0.9, 0.9);
      SF.cosmetics.drawGhost(c, "prism", 0, 0, item.id.replace("holo_", ""));
      c.restore();
    }
    return cv;
  }

  // ---------------------------------------------------------------- Shop-Fenster
  let cat = "theme";

  function card(item, offer) {
    const owned = !!SF.save.owned[item.id];
    const equipped = SF.save.equipped[item.cat] === item.id;
    const r = SF.RARITIES[item.rarity];
    const price = offer ? offer.price : item.cost;
    const el = document.createElement("div");
    el.className = "shop-card r-" + item.rarity + (equipped ? " equipped" : "") + (offer ? " offer" : "");
    const pv = document.createElement("div");
    pv.className = "sc-prev";
    pv.appendChild(preview(item, 240, 120));
    el.appendChild(pv);
    const info = document.createElement("div");
    info.className = "sc-info";
    info.innerHTML = `<div class="sc-rarity" style="color:${r.color}">${r.name}${offer ? ` · <span class="sc-deal">Tagesangebot −30 %</span>` : ""}</div>
      <b>${item.name}</b><small>${item.desc}</small>`;
    const row = document.createElement("div");
    row.className = "sc-row";
    const isPreview = previewSel[item.cat] === item.id;
    if (!equipped) {
      const pv = document.createElement("button");
      pv.className = "btn small sc-btn ghost sc-try" + (isPreview ? " on" : "");
      pv.textContent = isPreview ? "👁 Aktiv" : "👁 Vorschau";
      pv.title = isPreview ? "Vorschau beenden" : "Anprobieren – siehst du oben links live";
      pv.onclick = () => SF.shop.tryOn(item.id);
      row.appendChild(pv);
    }
    if (isPreview) el.classList.add("previewing");
    const btn = document.createElement("button");
    if (equipped) { btn.className = "btn small sc-btn"; btn.textContent = "✓ Ausgerüstet"; btn.disabled = true; }
    else if (owned) { btn.className = "btn small sc-btn ghost"; btn.textContent = "Ausrüsten"; btn.onclick = () => SF.shop.equip(item.id); }
    else {
      btn.className = "btn small sc-btn primary";
      btn.innerHTML = (offer ? `<s>✦ ${item.cost}</s> ` : "") + "✦ " + price + " kaufen";
      btn.disabled = SF.save.crystals < price;
      btn.onclick = () => { if (SF.shop.buy(item.id)) render(); };
    }
    row.appendChild(btn);
    info.appendChild(row);
    el.appendChild(info);
    return el;
  }

  function render() {
    if (!$("shop") || $("shop").hidden) { SF.shop.refreshBadge(); return; }
    $("shopBalance").textContent = fmt(SF.save.crystals);
    $("shopTabs").innerHTML = "";
    SF.SHOP_CATEGORIES.forEach(c => {
      const b = document.createElement("button");
      const total = SF.SHOP_ITEMS.filter(i => i.cat === c.key).length;
      const have = SF.SHOP_ITEMS.filter(i => i.cat === c.key && SF.save.owned[i.id]).length;
      b.innerHTML = `${c.name} <small>${have}/${total}</small>`;
      b.className = c.key === cat ? "active" : "";
      b.onclick = () => { cat = c.key; SF.audio.play("click"); render(); };
      $("shopTabs").appendChild(b);
    });
    // Vorschau-Leiste
    const active = Object.values(previewSel).map(byId).filter(Boolean);
    const bar = $("shopPreviewBar");
    if (active.length) {
      const cost = active.filter(i => !SF.save.owned[i.id]).reduce((a, i) => a + priceOf(i), 0);
      bar.innerHTML = `<span>👁 Vorschau: <b>${active.map(i => i.name).join(", ")}</b>${cost ? ` · zusammen ✦ ${cost}` : ""}</span>`;
      const reset = document.createElement("button");
      reset.className = "btn small ghost"; reset.textContent = "Zurücksetzen";
      reset.onclick = () => SF.shop.clearPreview();
      bar.appendChild(reset);
      bar.hidden = false;
    } else bar.hidden = true;

    const offer = dailyOffer();
    const offerBox = $("shopOffer");
    offerBox.innerHTML = "";
    if (offer) offerBox.appendChild(card(offer.item, offer));
    else offerBox.innerHTML = `<div class="muted small">Du besitzt bereits alles – unglaublich! 👑</div>`;
    const grid = $("shopGrid");
    grid.innerHTML = "";
    $("shopCatDesc").textContent = SF.SHOP_CATEGORIES.find(c => c.key === cat).desc;
    SF.SHOP_ITEMS.filter(i => i.cat === cat).forEach(i => grid.appendChild(card(i, offer && offer.item.id === i.id ? offer : null)));
    SF.shop.refreshBadge();
    SF.shop.startLive();
  }
  SF.shop.render = render;

  // ---------------------------------------------------------------- Live-Vorschau
  // Eine kleine Spielszene, die immer mit dem gerade ausgerüsteten bzw. anprobierten Aussehen läuft.
  const live = { raf: 0, last: 0, enemies: [], parts: [], bolts: [], shot: 0 };
  const LW = 320, LH = 190, LT = 32;
  const PATH_Y = 3 * LT + LT / 2;
  const TOWERS = [
    { key: "bolt", x: 70, y: 62, level: 1, ang: 0 },
    { key: "cannon", x: 180, y: 62, level: 4, spec: "siege", ang: 0 },
    { key: "prism", x: 255, y: 160, level: 3, ang: 0 }
  ];
  const GHOST = { key: "frost", x: 112, y: 160 };

  function liveStep(dt) {
    const types = ["grunt", "runner", "brute", "shield", "flyer", "healer"];
    while (live.enemies.length < 4) {
      const type = types[Math.floor(Math.random() * types.length)];
      const d = SF.ENEMIES[type];
      live.enemies.push({ type, def: d, x: -20 - Math.random() * 120, y: PATH_Y, ang: 0, wobble: Math.random() * 6, flying: !!d.flying, revealed: true,
        hp: 1, maxHp: 1, shield: d.shield ? 1 : 0, maxShield: d.shield ? 1 : 0, slowT: 0, stunT: 0, hitFlash: 0, dieAt: 90 + Math.random() * 190 });
    }
    live.enemies.forEach(e => {
      e.x += d2speed(e) * dt; e.wobble += dt * 8;
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.hp = Math.max(0.15, 1 - Math.max(0, e.x - 40) / (e.dieAt - 40));
      if (e.x >= e.dieAt) {
        e.dead = true;
        const col = SF.cosmetics.killColor(e.def.color);
        for (let i = 0; i < 18; i++) {
          const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 90;
          live.parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.7, color: typeof col === "function" ? col() : col, size: 2 + Math.random() * 2.5 });
        }
      }
    });
    live.enemies = live.enemies.filter(e => !e.dead && e.x < LW + 30);
    // Türme zielen und schießen
    live.shot -= dt;
    TOWERS.forEach(t => {
      const tgt = live.enemies.filter(e => e.x > 0).sort((a, b) => Math.abs(a.x - t.x) - Math.abs(b.x - t.x))[0];
      if (tgt) t.ang = Math.atan2(tgt.y - t.y, tgt.x - t.x);
      t.target = tgt;
    });
    if (live.shot <= 0) {
      live.shot = 0.35;
      const t = TOWERS[0];
      if (t.target) live.bolts.push({ x: t.x, y: t.y, tgt: t.target });
      if (t.target) t.recoil = 1;
    }
    live.bolts.forEach(b => {
      const dx = b.tgt.x - b.x, dy = b.tgt.y - b.y, d = Math.hypot(dx, dy);
      if (d < 8 || b.tgt.dead) { b.done = true; b.tgt.hitFlash = 0.08; return; }
      b.x += dx / d * 420 * dt; b.y += dy / d * 420 * dt; b.ang = Math.atan2(dy, dx);
    });
    live.bolts = live.bolts.filter(b => !b.done);
    live.parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.93; p.vy *= 0.93; p.life -= dt; });
    live.parts = live.parts.filter(p => p.life > 0);
    TOWERS.forEach(t => { t.recoil = Math.max(0, (t.recoil || 0) - dt * 6); });
  }
  const d2speed = e => Math.min(70, e.def.speed * 0.6);

  function liveDraw() {
    const cv = $("shopLive");
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== LW * dpr) { cv.width = LW * dpr; cv.height = LH * dpr; }
    const c = cv.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const th = SF.cosmetics.terrain(SF.MAPS[0].theme);
    for (let r = 0; r < 6; r++) for (let col = 0; col < 10; col++) { c.fillStyle = (r + col) % 2 ? th.ground : th.ground2; c.fillRect(col * LT, r * LT, LT, LT); }
    c.fillStyle = th.pathEdge; c.fillRect(0, PATH_Y - LT * 0.49, LW, LT * 0.98);
    c.fillStyle = th.path; c.fillRect(0, PATH_Y - LT * 0.4, LW, LT * 0.8);
    const leaf = th.leaf || ["#166534", "#15803d"];
    [[22, 30], [292, 40], [30, 170], [190, 170], [300, 150]].forEach(([x, y]) => {
      c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(x, y + 7, 9, 3, 0, 0, 7); c.fill();
      c.fillStyle = "#3b2a1a"; c.fillRect(x - 1.5, y, 3, 7);
      c.fillStyle = leaf[0]; c.beginPath(); c.arc(x, y - 2, 9, 0, 7); c.fill();
      c.fillStyle = leaf[1]; c.beginPath(); c.arc(x - 2, y - 4, 5, 0, 7); c.fill();
    });
    // Bau-Vorschau
    c.save(); c.translate(GHOST.x, GHOST.y); c.scale(0.5, 0.5);
    SF.cosmetics.drawGhost(c, GHOST.key, 0, 0);
    c.restore();
    // Türme
    TOWERS.forEach(t => {
      c.save(); c.translate(t.x, t.y); c.scale(0.55, 0.55);
      SF.render.drawTower(c, { key: t.key, x: 0, y: 0, level: t.level, spec: t.spec, angle: t.ang, recoil: t.recoil, rampT: 1 }, { noPips: true });
      c.restore();
    });
    // Prisma-Strahl
    const pt = TOWERS[2];
    if (pt.target) { c.strokeStyle = "rgba(240,171,252,.6)"; c.lineWidth = 4; c.beginPath(); c.moveTo(pt.x, pt.y - 3); c.lineTo(pt.target.x, pt.target.y); c.stroke(); c.strokeStyle = "#fdf4ff"; c.lineWidth = 1.5; c.stroke(); }
    // Gegner
    live.enemies.forEach(e => { if (e.x > -20) { c.save(); c.translate(e.x, e.y); c.scale(0.6, 0.6); c.translate(-e.x, -e.y); SF.render.drawEnemyOn(c, e); c.restore(); } });
    // Bolzen
    live.bolts.forEach(b => { c.save(); c.translate(b.x, b.y); c.rotate(b.ang || 0); c.fillStyle = SF.cosmetics.boltColor(false); c.fillRect(-6, -1.2, 12, 2.4); c.restore(); });
    // Partikel
    live.parts.forEach(p => { c.globalAlpha = Math.max(0, p.life / 0.7); c.fillStyle = p.color; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); });
    c.globalAlpha = 1;
  }

  function liveLoop(ts) {
    if (!$("shop") || $("shop").hidden) { live.raf = 0; return; }
    const dt = Math.min(0.05, (ts - (live.last || ts)) / 1000);
    live.last = ts;
    liveStep(dt);
    liveDraw();
    live.raf = requestAnimationFrame(liveLoop);
  }
  SF.shop.startLive = function () { if (!live.raf) { live.last = 0; live.raf = requestAnimationFrame(liveLoop); } };

  SF.shop.refreshBadge = function () {
    const el = $("menuCrystals");
    if (el) el.textContent = fmt(SF.save.crystals);
  };

  SF.shop.init = function () {
    ensureSave();
    SF.cosmetics.apply();
    SF.shop.refreshBadge();
  };

  SF.on("crystals", () => { SF.shop.refreshBadge(); if ($("shop") && !$("shop").hidden) render(); });
})();
