/* Shardfall – Spielerstufe (XP), Sammelkarten, Kartenpacks und Galerie */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const fmt = n => Math.round(n).toLocaleString("de-DE");

  // =====================================================================================
  // KARTEN
  // =====================================================================================
  const TOWER_RARITY = { bolt: "common", cannon: "common", frost: "common", tesla: "rare", mortar: "rare", beacon: "rare", prism: "epic" };
  const SPEC_RARITY = {
    sniper: "epic", volley: "rare", siege: "epic", cluster: "rare", blizzard: "rare", brittle: "epic", storm: "legendary",
    overload: "epic", inferno: "epic", quake: "rare", focus: "legendary", fan: "epic", warhorn: "rare", goldvein: "legendary"
  };
  const ENEMY_RARITY = { grunt: "common", runner: "common", shard: "common", flyer: "rare", brute: "rare", splitter: "rare",
    healer: "epic", shield: "epic", phantom: "epic", riftwalker: "legendary", boss: "legendary" };
  const ENEMY_ORDER = ["grunt", "runner", "shard", "flyer", "brute", "splitter", "healer", "shield", "phantom", "riftwalker", "boss"];

  SF.CARDS = [];
  SF.TOWER_ORDER.forEach(k => SF.CARDS.push({ id: "t_" + k, type: "tower", key: k, rarity: TOWER_RARITY[k], name: SF.TOWERS[k].name, level: 3 }));
  SF.TOWER_ORDER.forEach(k => SF.TOWERS[k].specs.forEach(s => SF.CARDS.push({ id: "s_" + k + "_" + s.key, type: "spec", key: k, spec: s.key, rarity: SPEC_RARITY[s.key] || "epic", name: s.name, level: 4 })));
  ENEMY_ORDER.forEach(k => SF.CARDS.push({ id: "e_" + k, type: "enemy", key: k, rarity: ENEMY_RARITY[k], name: SF.ENEMIES[k].name }));
  // Sonderkarten: Foxy (OC von foxy0561) – 4 Varianten, die seltensten Karten im Spiel
  // weight = Anteil innerhalb der Foxy-Funde (je kleiner, desto seltener)
  SF.FOXY_VARIANTS = [
    { key: "wander", roman: "I",   title: "Die Wanderin",   sub: "Die letzte Füchsin von Nebelfarn", weight: 50,
      flavor: "„Sie spricht kaum ein Wort, wenn sie zaubert. Niemand hat ihr gesagt, dass das unmöglich ist.“",
      colors: ["#fde68a", "#b45309", "#7c3aed"], banner: "rgba(76,29,149,.85)" },
    { key: "ruins",  roman: "II",  title: "Mondquelle",     sub: "Kampf in den Ruinen", weight: 25,
      flavor: "„Wo sie die Hand hebt, findet das Wasser seinen Weg – auch zwischen toten Steinen.“",
      colors: ["#bae6fd", "#0369a1", "#a16207"], banner: "rgba(3,105,161,.85)" },
    { key: "frost",  roman: "III", title: "Kristallseele",  sub: "Wenn das Wasser still wird", weight: 15,
      flavor: "„Für einen Atemzug gefriert der Nebel. Dann lächelt sie.“",
      colors: ["#e0f2fe", "#38bdf8", "#6366f1"], banner: "rgba(30,64,175,.85)" },
    { key: "seal",   roman: "IV",  title: "Stiller Zauber", sub: "Das Siegel glüht", weight: 10,
      flavor: "„Kein Wort. Keine Geste. Nur ein Kreis aus Licht – und die Bestien weichen zurück.“",
      colors: ["#f9a8d4", "#be185d", "#7c3aed"], banner: "rgba(157,23,77,.85)" }
  ];
  SF.FOXY_VARIANTS.forEach(v => SF.CARDS.push({ id: "x_foxy_" + v.key, type: "oc", key: v.key, rarity: "legendary", name: "Foxy · " + v.title, special: true, variant: v }));
  SF.CARDS.forEach((c, i) => { c.no = i + 1; });

  SF.FOXY = {
    type: "Fuchs-Demi-Human", element: "Wasser / Erde",
    origin: "Fennwyrd, Thyrvenna", age: 18, height: "155 cm",
    stats: [["Lebenskraft", 60], ["Magie", 85], ["Stärke", 25], ["Tempo", 70], ["Sinne", 95]],
    abilities: [
      ["Stiller Zauber", "passiv", "Foxy zaubert ohne Sprüche und Gesten. Ihre Zauber können nicht unterbrochen werden."],
      ["Fuchsgehör", "passiv", "Sie kann nicht überrascht werden und bemerkt versteckte Gegner zuerst."],
      ["Mondquelle", "", "Lässt eine Quelle aus dem Boden steigen und heilt sich selbst oder einen Verbündeten."],
      ["Nebelschleier", "", "Hüllt sich in Nebel und entkommt einem Kampf."]
    ],
    weakness: "Das Siegel. Wird Foxy ein Befehl erteilt, muss sie gehorchen. Widerstand kostet sie Lebenskraft."
  };
  const FOXY_CHANCE = 0.01; // pro Kartenplatz -> irgendeine Foxy ca. 1 von 33 Packs, "Stiller Zauber" ca. 1 von 330
  function rollFoxy() {
    const sum = SF.FOXY_VARIANTS.reduce((a, v) => a + v.weight, 0);
    let r = Math.random() * sum;
    for (const v of SF.FOXY_VARIANTS) { r -= v.weight; if (r <= 0) return "x_foxy_" + v.key; }
    return "x_foxy_wander";
  }

  // Bilder vorladen (liegen als Daten-URL in img/foxy-data.js, damit sie auch per Doppelklick im Browser funktionieren)
  const foxyImgs = {};
  SF.FOXY_VARIANTS.forEach(v => {
    const img = new Image();
    foxyImgs[v.key] = { img, ready: false };
    img.onload = () => {
      foxyImgs[v.key].ready = true;
      delete artCacheRef.c["x_foxy_" + v.key]; delete artCacheRef.c["x_foxy_" + v.key + ":s"];
      const gal = document.getElementById("gallery");
      if (gal && !gal.hidden && SF.cardsUi && SF.cardsUi.render) SF.cardsUi.render();
    };
    if (SF.FOXY_IMAGES && SF.FOXY_IMAGES[v.key]) img.src = SF.FOXY_IMAGES[v.key];
  });
  const artCacheRef = { c: {} };
  const cardById = id => SF.CARDS.find(c => c.id === id);
  const TOTAL = SF.CARDS.length;

  const RARITY_STYLE = {
    common:    { name: "Gewöhnlich", a: "#cbd5e1", b: "#475569", glow: "rgba(203,213,225,.55)" },
    rare:      { name: "Selten",     a: "#93c5fd", b: "#1d4ed8", glow: "rgba(96,165,250,.7)" },
    epic:      { name: "Episch",     a: "#e9d5ff", b: "#7e22ce", glow: "rgba(192,132,252,.75)" },
    legendary: { name: "Legendär",   a: "#fde68a", b: "#b45309", glow: "rgba(251,191,36,.85)" }
  };
  const PACK_WEIGHTS = [["common", 55], ["rare", 28], ["epic", 13], ["legendary", 4]];
  const SHINY_CHANCE = 0.06;
  const COPIES_FOR_SHINY = 5;

  function subtitle(card) {
    if (card.type === "oc") return card.variant.sub;
    if (card.type === "tower") return "Turm · " + ((SF.TOWER_TEXT && SF.TOWER_TEXT[card.key]) ? SF.TOWER_TEXT[card.key].role : "");
    if (card.type === "spec") return "Spezialisierung · " + SF.TOWERS[card.key].name;
    const d = SF.ENEMIES[card.key];
    return d.boss ? "Boss" : d.rare ? "Seltener Mini-Boss" : d.flying ? "Gegner · Flieger" : "Gegner";
  }

  function cardText(card) {
    if (card.type === "oc") return card.variant.flavor;
    if (card.type === "spec") return SF.TOWERS[card.key].specs.find(s => s.key === card.spec).desc;
    if (card.type === "tower") return SF.TOWERS[card.key].desc;
    const t = SF.ENEMY_TEXT && SF.ENEMY_TEXT[card.key];
    if (!t) return "";
    return t.ability.length < 20 ? t.lore : t.ability;
  }

  // Werte als Balken (0..1), relativ zu allen Karten derselben Art
  function towerPower(key, spec) {
    const s = SF.getTowerStats(key, 3, spec || null);
    const dps = s.dps ? s.dps * (1 + (s.ramp - 1) * 0.5) * (s.beams || 1) : (s.dmg || 0) * (s.rate || 0) * (s.multishot || 1) * (s.chain ? 1 + (s.chain - 1) * 0.6 : 1);
    const area = s.splash ? s.splash : (s.chain ? s.chain * 20 : (s.beams || s.multishot || 1) * 20);
    return { dps, range: s.range, area, buff: s.buff || 0 };
  }
  let maxima = null;
  function statBars(card) {
    if (card.type === "oc") return SF.FOXY.stats.map(([a, v]) => [a, v / 100]);
    if (!maxima) {
      maxima = { dps: 1, range: 1, area: 1, hp: 1, speed: 1 };
      SF.CARDS.forEach(c => {
        if (c.type === "oc") return;
        if (c.type === "enemy") { const d = SF.ENEMIES[c.key]; maxima.hp = Math.max(maxima.hp, d.hp + (d.shield || 0)); maxima.speed = Math.max(maxima.speed, d.speed); return; }
        const p = towerPower(c.key, c.spec); maxima.dps = Math.max(maxima.dps, p.dps); maxima.range = Math.max(maxima.range, p.range); maxima.area = Math.max(maxima.area, p.area);
      });
    }
    if (card.type === "enemy") {
      const d = SF.ENEMIES[card.key];
      return [["Leben", Math.sqrt((d.hp + (d.shield || 0)) / maxima.hp)], ["Tempo", d.speed / maxima.speed], ["Rüstung", d.armor / 0.5]];
    }
    const p = towerPower(card.key, card.spec);
    if (SF.TOWERS[card.key].support) return [["Bonus", p.buff / 0.3], ["Reichweite", p.range / maxima.range], ["Fläche", 0.15]];
    return [["Schaden", Math.sqrt(p.dps / maxima.dps)], ["Reichweite", p.range / maxima.range], ["Fläche", Math.min(1, p.area / maxima.area)]];
  }

  // =====================================================================================
  // KARTENBILDER (Canvas, einmal erzeugt und zwischengespeichert)
  // =====================================================================================
  const W = 300, H = 420, S = 2;
  const artCache = artCacheRef.c;

  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }

  function lightning(c, x1, y1, x2, y2, rng, w) {
    c.beginPath(); c.moveTo(x1, y1);
    const steps = 7;
    for (let i = 1; i < steps; i++) { const t = i / steps; c.lineTo(x1 + (x2 - x1) * t + (rng() - 0.5) * 22, y1 + (y2 - y1) * t + (rng() - 0.5) * 22); }
    c.lineTo(x2, y2); c.lineWidth = w; c.stroke();
  }
  function snowflake(c, x, y, r) {
    c.save(); c.translate(x, y);
    for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(r, 0); c.moveTo(r * 0.55, 0); c.lineTo(r * 0.8, r * 0.22); c.moveTo(r * 0.55, 0); c.lineTo(r * 0.8, -r * 0.22); c.stroke(); }
    c.restore();
  }

  // Effekte hinter/vor dem Motiv – passend zur Art des Turms
  function kindFx(c, card, rng, cx, cy, front) {
    const def = SF.TOWERS[card.key];
    const col = def.color, acc = def.accent;
    const kind = card.key;
    c.save();
    if (!front) {
      if (kind === "tesla") {
        c.strokeStyle = hexA("#ddd6fe", 0.8); c.shadowColor = "#a78bfa"; c.shadowBlur = 12;
        for (let i = 0; i < (card.spec === "storm" ? 7 : 4); i++) { const a = rng() * Math.PI * 2; lightning(c, cx, cy - 20, cx + Math.cos(a) * 130, cy - 20 + Math.sin(a) * 100, rng, 2); }
      } else if (kind === "prism") {
        const n = card.spec === "fan" ? 3 : 1;
        for (let i = 0; i < n; i++) {
          const a = -0.5 + (n > 1 ? (i - 1) * 0.45 : 0);
          const g = c.createLinearGradient(cx, cy, cx + Math.cos(a) * 200, cy + Math.sin(a) * 200);
          g.addColorStop(0, hexA(col, 0.9)); g.addColorStop(1, hexA(col, 0));
          c.strokeStyle = g; c.lineWidth = card.spec === "focus" ? 16 : 10; c.lineCap = "round";
          c.beginPath(); c.moveTo(cx, cy - 15); c.lineTo(cx + Math.cos(a) * 220, cy - 15 + Math.sin(a) * 220); c.stroke();
        }
      } else if (kind === "beacon") {
        const g = c.createLinearGradient(cx, 0, cx, cy);
        g.addColorStop(0, hexA(card.spec === "goldvein" ? "#fde047" : card.spec === "warhorn" ? "#fb7185" : col, 0)); g.addColorStop(1, hexA(card.spec === "goldvein" ? "#fde047" : col, 0.55));
        c.fillStyle = g; c.beginPath(); c.moveTo(cx - 18, cy - 30); c.lineTo(cx + 18, cy - 30); c.lineTo(cx + 55, 0); c.lineTo(cx - 55, 0); c.closePath(); c.fill();
        c.strokeStyle = hexA(col, 0.35); c.lineWidth = 2;
        [70, 100, 130].forEach(r => { c.beginPath(); c.ellipse(cx, cy + 50, r, r * 0.25, 0, 0, 7); c.stroke(); });
      } else if (kind === "mortar") {
        c.strokeStyle = hexA("#fed7aa", 0.6); c.setLineDash([6, 6]); c.lineWidth = 2;
        c.beginPath(); c.moveTo(cx, cy - 20); c.quadraticCurveTo(cx + 70, cy - 150, cx + 125, cy - 30); c.stroke(); c.setLineDash([]);
        const g = c.createRadialGradient(cx + 125, cy - 30, 0, cx + 125, cy - 30, 40);
        g.addColorStop(0, card.spec === "inferno" ? "rgba(239,68,68,.9)" : "rgba(251,146,60,.85)"); g.addColorStop(1, "rgba(251,146,60,0)");
        c.fillStyle = g; c.beginPath(); c.arc(cx + 125, cy - 30, 40, 0, 7); c.fill();
      } else if (kind === "cannon") {
        for (let i = 0; i < 7; i++) { c.fillStyle = `rgba(148,163,184,${0.12 + rng() * 0.15})`; c.beginPath(); c.arc(cx + 40 + rng() * 80, cy - 40 - rng() * 60, 10 + rng() * 18, 0, 7); c.fill(); }
      }
    } else {
      if (kind === "bolt") {
        const n = card.spec === "volley" ? 6 : 3;
        for (let i = 0; i < n; i++) {
          const x = cx - 120 + rng() * 240, y = cy - 120 + rng() * 80;
          c.save(); c.translate(x, y); c.rotate(-0.55);
          const g = c.createLinearGradient(-50, 0, 10, 0); g.addColorStop(0, "rgba(224,242,254,0)"); g.addColorStop(1, "rgba(224,242,254,.9)");
          c.fillStyle = g; c.fillRect(-50, -1.5, 60, 3);
          c.fillStyle = card.spec === "sniper" ? "#fde047" : "#e0f2fe"; c.beginPath(); c.moveTo(16, 0); c.lineTo(8, -4); c.lineTo(8, 4); c.closePath(); c.fill();
          c.restore();
        }
      } else if (kind === "frost") {
        c.strokeStyle = "rgba(236,254,255,.8)"; c.lineWidth = 1.5; c.shadowColor = "#67e8f9"; c.shadowBlur = 8;
        for (let i = 0; i < (card.spec === "blizzard" ? 14 : 8); i++) snowflake(c, cx - 125 + rng() * 250, cy - 130 + rng() * 210, 4 + rng() * 7);
      } else if (kind === "cannon") {
        c.fillStyle = "#18181b"; c.beginPath(); c.arc(cx + 95, cy - 85, 9, 0, 7); c.fill();
        c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 2; c.beginPath(); c.moveTo(cx + 40, cy - 45); c.lineTo(cx + 85, cy - 80); c.stroke();
        if (card.spec === "cluster") { c.fillStyle = "#3f3f46"; [[-14, 10], [12, 14], [0, -12], [16, -6]].forEach(([dx, dy]) => { c.beginPath(); c.arc(cx + 95 + dx, cy - 85 + dy, 4, 0, 7); c.fill(); }); }
      } else if (kind === "mortar" && card.spec === "quake") {
        c.strokeStyle = "rgba(168,162,158,.7)"; c.lineWidth = 2;
        for (let i = 0; i < 6; i++) { c.beginPath(); let x = cx - 20 + rng() * 40, y = cy + 55; c.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (rng() - 0.5) * 50; y += 4 + rng() * 6; c.lineTo(x, y); } c.stroke(); }
      }
      // Funkeln
      for (let i = 0; i < 18; i++) {
        const x = cx - 130 + rng() * 260, y = cy - 140 + rng() * 230, s = 1 + rng() * 2.2;
        c.fillStyle = hexA(rng() < 0.5 ? col : "#ffffff", 0.4 + rng() * 0.5);
        c.beginPath(); c.moveTo(x, y - s * 2); c.lineTo(x + s * 0.6, y); c.lineTo(x, y + s * 2); c.lineTo(x - s * 0.6, y); c.closePath(); c.fill();
      }
    }
    c.restore();
  }

  function enemyFx(c, card, rng, cx, cy, front) {
    const d = SF.ENEMIES[card.key];
    c.save();
    if (!front) {
      // Riss-Wirbel hinter dem Gegner
      const base = d.boss ? "#f43f5e" : d.rare ? "#22d3ee" : "#a855f7";
      for (let i = 0; i < 9; i++) {
        c.strokeStyle = hexA(base, 0.08 + i * 0.025); c.lineWidth = 3;
        c.beginPath(); c.ellipse(cx, cy - 10, 30 + i * 13, 16 + i * 8, -0.3 + i * 0.12, 0.3 + i * 0.4, Math.PI * 1.5 + i * 0.4); c.stroke();
      }
      if (d.flying) { c.fillStyle = "rgba(226,232,240,.12)"; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(cx - 110 + rng() * 220, cy - 100 + rng() * 60, 30 + rng() * 30, 10 + rng() * 6, 0, 0, 7); c.fill(); } }
      if (d.heal) { c.strokeStyle = "rgba(74,222,128,.5)"; c.lineWidth = 3; [60, 90].forEach(r => { c.beginPath(); c.arc(cx, cy - 10, r, 0, 7); c.stroke(); }); }
    } else {
      if (d.rare) {
        c.strokeStyle = "rgba(103,232,249,.9)"; c.shadowColor = "#22d3ee"; c.shadowBlur = 14; c.lineWidth = 3;
        c.beginPath(); let x = cx - 140, y = cy + 62; c.moveTo(x, y);
        for (let i = 0; i < 10; i++) { x += 28; y += (rng() - 0.5) * 18; c.lineTo(x, y); } c.stroke();
      }
      for (let i = 0; i < 14; i++) {
        const x = cx - 130 + rng() * 260, y = cy - 140 + rng() * 220;
        c.fillStyle = hexA(d.boss ? "#fda4af" : "#e9d5ff", 0.3 + rng() * 0.5);
        c.fillRect(x, y, 1.5 + rng() * 2, 1.5 + rng() * 2);
      }
    }
    c.restore();
  }

  function drawFoxyArt(card, shiny) {
    const cv = document.createElement("canvas");
    cv.width = W * S; cv.height = H * S;
    const c = cv.getContext("2d");
    c.scale(S, S);
    const F = SF.FOXY, V = card.variant;
    const rng = SF.util.mulberry32(SF.util.hashStr(card.id));
    const fx = foxyImgs[V.key] || { ready: false };
    const foxyImg = fx.img, foxyReady = fx.ready;

    // Rahmen: Gold-Violett (Glanz: Regenbogen)
    const fg = c.createLinearGradient(0, 0, W, H);
    if (shiny) ["#f472b6", "#fde047", "#4ade80", "#38bdf8", "#a78bfa", "#f472b6"].forEach((col, i) => fg.addColorStop(i / 5, col));
    else { fg.addColorStop(0, V.colors[0]); fg.addColorStop(0.35, V.colors[1]); fg.addColorStop(0.65, V.colors[2]); fg.addColorStop(1, V.colors[0]); }
    c.fillStyle = fg; rr(c, 0, 0, W, H, 18); c.fill();
    // feine Gravur im Rahmen
    c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 0.8; rr(c, 4, 4, W - 8, H - 8, 15); c.stroke();
    c.fillStyle = "#0d0a1a"; rr(c, 9, 9, W - 18, H - 18, 12); c.fill();

    // großes Bild
    const ax = 15, ay = 15, aw = W - 30, ah = 302;
    c.save(); rr(c, ax, ay, aw, ah, 10); c.clip();
    if (foxyReady) {
      const ir = foxyImg.width / foxyImg.height, wr = aw / ah;
      let sw = foxyImg.width, sh = foxyImg.height, sx = 0, sy = 0;
      if (ir > wr) { sw = sh * wr; sx = (foxyImg.width - sw) / 2; } else { sh = sw / wr; }
      c.drawImage(foxyImg, sx, sy, sw, sh, ax, ay, aw, ah);
    } else {
      c.fillStyle = "#3b2a4d"; c.fillRect(ax, ay, aw, ah);
      c.fillStyle = "#e9d5ff"; c.font = "bold 16px Rajdhani, sans-serif"; c.textAlign = "center"; c.fillText("Bild lädt …", W / 2, ay + ah / 2);
    }
    // Nebel (Nebelschleier) & Wasser (Mondquelle)
    for (let i = 0; i < 9; i++) {
      const x = ax + rng() * aw, y = ay + ah - 20 - rng() * 70, r = 30 + rng() * 50;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(186,230,253,.22)"); g.addColorStop(1, "rgba(186,230,253,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    }
    for (let i = 0; i < 22; i++) {
      const x = ax + rng() * aw, y = ay + rng() * (ah - 60), s2 = 0.8 + rng() * 1.8;
      c.fillStyle = rng() < 0.5 ? "rgba(253,230,138,.85)" : "rgba(196,181,253,.85)";
      c.beginPath(); c.moveTo(x, y - s2 * 2.2); c.lineTo(x + s2 * 0.6, y); c.lineTo(x, y + s2 * 2.2); c.lineTo(x - s2 * 0.6, y); c.closePath(); c.fill();
    }
    // dunkler Verlauf unten für Text
    const bg = c.createLinearGradient(0, ay + ah - 110, 0, ay + ah);
    bg.addColorStop(0, "rgba(13,10,26,0)"); bg.addColorStop(0.55, "rgba(13,10,26,.82)"); bg.addColorStop(1, "rgba(13,10,26,.97)");
    c.fillStyle = bg; c.fillRect(ax, ay + ah - 110, aw, 110);
    // leichte Vignette
    const vg = c.createRadialGradient(W / 2, ay + ah * 0.42, ah * 0.3, W / 2, ay + ah * 0.42, ah * 0.85);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.35)");
    c.fillStyle = vg; c.fillRect(ax, ay, aw, ah);
    c.restore();
    c.strokeStyle = V.colors[0]; c.lineWidth = 1.5; rr(c, ax, ay, aw, ah, 10); c.stroke();

    // Abzeichen oben
    c.textBaseline = "middle"; c.textAlign = "center";
    c.fillStyle = "rgba(13,10,26,.75)"; rr(c, ax + 8, ay + 8, 66, 18, 9); c.fill();
    c.fillStyle = "#fde047"; c.font = "bold 11px Rajdhani, 'Segoe UI', sans-serif"; c.fillText("★★★★ " + V.roman, ax + 41, ay + 17.5);
    const rg = c.createLinearGradient(ax + aw - 92, 0, ax + aw - 8, 0);
    if (shiny) { rg.addColorStop(0, "#f472b6"); rg.addColorStop(0.5, "#fde047"); rg.addColorStop(1, "#38bdf8"); }
    else { rg.addColorStop(0, V.colors[0]); rg.addColorStop(1, "#c4b5fd"); }
    c.font = "bold 10.5px Rajdhani, 'Segoe UI', sans-serif";
    const badge = shiny ? "✦ GLANZ" : "SONDERKARTE";
    const bwid = c.measureText(badge).width + 18;
    c.fillStyle = rg; rr(c, ax + aw - 8 - bwid, ay + 8, bwid, 18, 9); c.fill();
    c.fillStyle = "#1e1b4b"; c.fillText(badge, ax + aw - 8 - bwid / 2, ay + 17.5);

    // Flavor-Text im Bild
    c.textAlign = "center"; c.fillStyle = "rgba(233,213,255,.95)"; c.font = "italic 10px 'Inter', 'Segoe UI', sans-serif";
    const words = V.flavor.split(" "); const lines = []; let line = "";
    words.forEach(w => { const t = line ? line + " " + w : w; if (c.measureText(t).width > aw - 30) { lines.push(line); line = w; } else line = t; });
    lines.push(line);
    lines.slice(0, 3).forEach((l, i) => c.fillText(l, W / 2, ay + ah - 78 + i * 12.5));

    // Namensbanner
    const by = ay + ah - 40;
    const bb = c.createLinearGradient(ax + 6, 0, ax + aw - 6, 0);
    bb.addColorStop(0, "rgba(15,10,30,.85)"); bb.addColorStop(0.5, V.banner); bb.addColorStop(1, "rgba(15,10,30,.85)");
    c.fillStyle = bb; rr(c, ax + 6, by, aw - 12, 34, 8); c.fill();
    c.strokeStyle = V.colors[0]; c.lineWidth = 1; rr(c, ax + 6, by, aw - 12, 34, 8); c.stroke();
    c.fillStyle = "#fff"; c.font = "bold 22px Rajdhani, 'Segoe UI', sans-serif"; c.shadowColor = "rgba(0,0,0,.7)"; c.shadowBlur = 5;
    c.fillText("FOXY", W / 2, by + 13); c.shadowBlur = 0;
    c.fillStyle = V.colors[0]; c.font = "600 8.5px 'Inter', 'Segoe UI', sans-serif"; c.fillText((V.title + " · " + V.sub).toUpperCase(), W / 2, by + 27);

    // Typzeile
    const ty = ay + ah + 12;
    c.fillStyle = "#c4b5fd"; c.font = "600 9.5px 'Inter', 'Segoe UI', sans-serif";
    c.fillText((F.type + " · 💧 " + F.element.replace(" / ", " / ⛰ ")).toUpperCase(), W / 2, ty);

    // 5 Werte als Kästchen
    const bw = (aw - 4 * 5) / 5, sy = ty + 9;
    F.stats.forEach(([label, v], i) => {
      const x = ax + i * (bw + 5);
      c.fillStyle = "rgba(255,255,255,.06)"; rr(c, x, sy, bw, 42, 6); c.fill();
      c.fillStyle = "#94a3b8"; c.font = "600 7.5px 'Inter', 'Segoe UI', sans-serif"; c.fillText(label.toUpperCase(), x + bw / 2, sy + 9);
      c.fillStyle = "#fff"; c.font = "bold 17px Rajdhani, 'Segoe UI', sans-serif"; c.fillText(String(v), x + bw / 2, sy + 23);
      c.fillStyle = "rgba(255,255,255,.1)"; rr(c, x + 5, sy + 33, bw - 10, 4, 2); c.fill();
      const gg = c.createLinearGradient(x + 5, 0, x + bw - 5, 0); gg.addColorStop(0, "#a78bfa"); gg.addColorStop(1, "#fde047");
      c.fillStyle = gg; rr(c, x + 5, sy + 33, (bw - 10) * v / 100, 4, 2); c.fill();
    });

    // Fußzeile
    c.font = "bold 9.5px Rajdhani, 'Segoe UI', sans-serif";
    c.textAlign = "left"; c.fillStyle = "#64748b"; c.fillText(card.no + " / " + TOTAL, ax + 2, H - 17);
    c.textAlign = "center"; c.fillStyle = "#fde68a"; c.fillText("LEGENDÄR · OC VON FOXY0561", W / 2, H - 17);
    c.textAlign = "right"; c.fillStyle = "#64748b"; c.fillText("SHARDFALL", ax + aw - 2, H - 17);
    return cv;
  }

  function drawArt(card, shiny) {
    if (card.type === "oc") return drawFoxyArt(card, shiny);
    const cv = document.createElement("canvas");
    cv.width = W * S; cv.height = H * S;
    const c = cv.getContext("2d");
    c.scale(S, S);
    const R = RARITY_STYLE[card.rarity];
    const rng = SF.util.mulberry32(SF.util.hashStr(card.id));
    const isEnemy = card.type === "enemy";
    const color = isEnemy ? SF.ENEMIES[card.key].color : SF.TOWERS[card.key].color;

    // Rahmen
    const fg = c.createLinearGradient(0, 0, W, H);
    if (shiny) { ["#f472b6", "#fde047", "#4ade80", "#38bdf8", "#a78bfa", "#f472b6"].forEach((col, i) => fg.addColorStop(i / 5, col)); }
    else { fg.addColorStop(0, R.a); fg.addColorStop(0.5, R.b); fg.addColorStop(1, R.a); }
    c.fillStyle = fg; rr(c, 0, 0, W, H, 18); c.fill();
    c.fillStyle = "#0a0f1f"; rr(c, 9, 9, W - 18, H - 18, 12); c.fill();

    // Bildfenster
    const ax = 17, ay = 17, aw = W - 34, ah = 232;
    c.save(); rr(c, ax, ay, aw, ah, 9); c.clip();
    const cx = W / 2, cy = ay + ah * 0.6;
    const bgc = isEnemy ? (SF.ENEMIES[card.key].boss ? "#3b0a16" : "#1a0b2e") : "#0b1a2e";
    const g = c.createRadialGradient(cx, cy - 30, 10, cx, cy - 30, 230);
    g.addColorStop(0, hexA(color, 0.6)); g.addColorStop(0.45, bgc); g.addColorStop(1, "#04060d");
    c.fillStyle = g; c.fillRect(ax, ay, aw, ah);
    // Lichtstrahlen
    c.save(); c.translate(cx, cy - 30);
    for (let i = 0; i < 16; i++) {
      c.rotate(Math.PI * 2 / 16);
      c.fillStyle = hexA(color, i % 2 ? 0.07 : 0.03);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(260, -22); c.lineTo(260, 22); c.closePath(); c.fill();
    }
    c.restore();
    // ferne Hügel / Kristalle
    c.fillStyle = "rgba(2,6,23,0.65)";
    c.beginPath(); c.moveTo(ax, ay + ah); c.lineTo(ax, cy + 20);
    for (let x = ax; x <= ax + aw; x += 22) c.lineTo(x, cy + 10 - rng() * 30);
    c.lineTo(ax + aw, ay + ah); c.closePath(); c.fill();
    for (let i = 0; i < 4; i++) {
      const x = ax + 20 + rng() * (aw - 40), y = cy + 18, h2 = 14 + rng() * 22;
      c.fillStyle = hexA(isEnemy ? "#a855f7" : "#38bdf8", 0.35);
      c.beginPath(); c.moveTo(x, y - h2); c.lineTo(x + 6, y); c.lineTo(x - 6, y); c.closePath(); c.fill();
    }
    // Boden
    const gg = c.createRadialGradient(cx, cy + 52, 5, cx, cy + 52, 110);
    gg.addColorStop(0, isEnemy ? "rgba(76,29,149,.85)" : "rgba(34,68,45,.95)"); gg.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = gg; c.beginPath(); c.ellipse(cx, cy + 52, 120, 30, 0, 0, 7); c.fill();
    if (!isEnemy) { c.strokeStyle = "rgba(74,222,128,.45)"; c.lineWidth = 1.5; for (let i = 0; i < 26; i++) { const x = cx - 95 + rng() * 190, y = cy + 44 + rng() * 18; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rng() - 0.5) * 4, y - 4 - rng() * 6); c.stroke(); } }

    if (isEnemy) enemyFx(c, card, rng, cx, cy, false); else kindFx(c, card, rng, cx, cy, false);

    // Motiv: erst auf eine eigene Fläche zeichnen, dann EINMAL mit Glüh-Filter einsetzen (viel schneller)
    const sub = document.createElement("canvas");
    sub.width = 280 * S; sub.height = 280 * S;
    const sc2 = sub.getContext("2d");
    sc2.scale(S, S);
    sc2.translate(140, 140);
    if (isEnemy) {
      const d = SF.ENEMIES[card.key];
      const sc = Math.min(4.2, 62 / (d.size + 6));
      sc2.scale(sc, sc);
      SF.render.drawEnemyOn(sc2, { type: card.key, def: Object.assign({}, d, { boss: false, rare: false }), x: 0, y: 0, ang: -0.35, wobble: 1.2,
        flying: !!d.flying, revealed: true, hp: 1, maxHp: 1, shield: d.shield ? 1 : 0, maxShield: d.shield ? 1 : 0, slowT: 0, stunT: 0, hitFlash: 0 });
    } else {
      sc2.translate(0, -6);
      sc2.scale(3.1, 3.1);
      SF.render.drawTower(sc2, { key: card.key, x: 0, y: 0, level: card.level, spec: card.spec || null, angle: -0.6, recoil: 0, rampT: 2, pattern: "default" }, { noPips: true });
    }
    c.save();
    c.filter = `drop-shadow(0 0 ${isEnemy ? 10 : 9}px ${color}) drop-shadow(0 6px 8px rgba(0,0,0,.75))`;
    c.drawImage(sub, cx - 140, cy - 140, 280, 280);
    c.restore();

    if (isEnemy) enemyFx(c, card, rng, cx, cy, true); else kindFx(c, card, rng, cx, cy, true);

    // Vignette
    const vg = c.createRadialGradient(cx, ay + ah / 2, ah * 0.35, cx, ay + ah / 2, ah * 0.85);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.6)");
    c.fillStyle = vg; c.fillRect(ax, ay, aw, ah);
    c.restore();
    c.strokeStyle = hexA(R.a, 0.8); c.lineWidth = 1.5; rr(c, ax, ay, aw, ah, 9); c.stroke();

    // Nummer + Glanz-Abzeichen im Bild
    c.font = "bold 11px Rajdhani, 'Segoe UI', sans-serif"; c.textBaseline = "middle";
    c.fillStyle = "rgba(2,6,23,.7)"; rr(c, ax + 8, ay + 8, 44, 18, 9); c.fill();
    c.fillStyle = "#e2e8f0"; c.textAlign = "center"; c.fillText("#" + String(card.no).padStart(2, "0"), ax + 30, ay + 17.5);
    if (shiny) {
      const sg = c.createLinearGradient(ax + aw - 70, 0, ax + aw - 8, 0);
      sg.addColorStop(0, "#f472b6"); sg.addColorStop(0.5, "#fde047"); sg.addColorStop(1, "#38bdf8");
      c.fillStyle = sg; rr(c, ax + aw - 70, ay + 8, 62, 18, 9); c.fill();
      c.fillStyle = "#1e1b4b"; c.fillText("✦ GLANZ", ax + aw - 39, ay + 17.5);
    }

    // Namensbanner
    const by = ay + ah + 8;
    const bg2 = c.createLinearGradient(ax, by, ax + aw, by);
    bg2.addColorStop(0, hexA(R.b, 0.9)); bg2.addColorStop(1, "rgba(15,23,42,.95)");
    c.fillStyle = bg2; rr(c, ax, by, aw, 38, 8); c.fill();
    c.strokeStyle = hexA(R.a, 0.6); c.lineWidth = 1; rr(c, ax, by, aw, 38, 8); c.stroke();
    c.textAlign = "left"; c.fillStyle = "#ffffff";
    let fs = 22; c.font = `bold ${fs}px Rajdhani, 'Segoe UI', sans-serif`;
    while (c.measureText(card.name).width > aw - 70 && fs > 14) { fs--; c.font = `bold ${fs}px Rajdhani, 'Segoe UI', sans-serif`; }
    c.shadowColor = "rgba(0,0,0,.6)"; c.shadowBlur = 4;
    c.fillText(card.name, ax + 10, by + 20);
    c.shadowBlur = 0;
    // Seltenheits-Edelstein
    c.save(); c.translate(ax + aw - 18, by + 19);
    c.fillStyle = R.a; c.shadowColor = R.glow; c.shadowBlur = 10;
    c.beginPath(); c.moveTo(0, -10); c.lineTo(8, 0); c.lineTo(0, 10); c.lineTo(-8, 0); c.closePath(); c.fill();
    c.restore();

    // Untertitel + Text
    c.fillStyle = hexA(R.a, 0.95); c.font = "600 10.5px 'Inter', 'Segoe UI', sans-serif";
    c.fillText(subtitle(card).toUpperCase(), ax + 2, by + 52);
    c.fillStyle = "#cbd5e1"; c.font = "11px 'Inter', 'Segoe UI', sans-serif";
    const words = cardText(card).split(" ");
    let line = "", ly = by + 68, lines = 0;
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (c.measureText(t).width > aw - 4) { if (lines === 1) { c.fillText(line + " …", ax + 2, ly); line = ""; lines++; break; } c.fillText(line, ax + 2, ly); ly += 14; line = w; lines++; }
      else line = t;
    }
    if (line && lines < 2) c.fillText(line, ax + 2, ly);

    // Werte-Balken
    const bars = statBars(card);
    const sy = by + 100;
    bars.forEach(([label, v], i) => {
      const y = sy + i * 15;
      c.fillStyle = "#94a3b8"; c.font = "600 9.5px 'Inter', 'Segoe UI', sans-serif"; c.fillText(label.toUpperCase(), ax + 2, y + 4);
      c.fillStyle = "rgba(255,255,255,.08)"; rr(c, ax + 78, y, aw - 80, 7, 3.5); c.fill();
      const bgb = c.createLinearGradient(ax + 78, 0, ax + aw, 0); bgb.addColorStop(0, R.b); bgb.addColorStop(1, R.a);
      c.fillStyle = bgb; rr(c, ax + 78, y, Math.max(7, (aw - 80) * Math.max(0.05, Math.min(1, v))), 7, 3.5); c.fill();
    });

    // Fußzeile
    c.font = "bold 9.5px Rajdhani, 'Segoe UI', sans-serif"; c.fillStyle = "#64748b";
    c.textAlign = "left"; c.fillText(String(card.no).padStart(2, "0") + " / " + TOTAL, ax + 2, H - 20);
    c.textAlign = "center"; c.fillStyle = R.a; c.fillText(R.name.toUpperCase(), W / 2, H - 20);
    c.textAlign = "right"; c.fillStyle = "#64748b"; c.fillText("SHARDFALL", ax + aw - 2, H - 20);
    return cv;
  }

  function drawBack() {
    const cv = document.createElement("canvas");
    cv.width = W * S; cv.height = H * S;
    const c = cv.getContext("2d");
    c.scale(S, S);
    const fg = c.createLinearGradient(0, 0, W, H);
    fg.addColorStop(0, "#a78bfa"); fg.addColorStop(0.5, "#312e81"); fg.addColorStop(1, "#38bdf8");
    c.fillStyle = fg; rr(c, 0, 0, W, H, 18); c.fill();
    const g = c.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 260);
    g.addColorStop(0, "#1e1b4b"); g.addColorStop(1, "#05061a");
    c.fillStyle = g; rr(c, 9, 9, W - 18, H - 18, 12); c.fill();
    c.save(); rr(c, 9, 9, W - 18, H - 18, 12); c.clip();
    c.strokeStyle = "rgba(167,139,250,.12)"; c.lineWidth = 1;
    for (let i = -H; i < W + H; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + H, H); c.stroke(); c.beginPath(); c.moveTo(i, H); c.lineTo(i + H, 0); c.stroke(); }
    c.restore();
    c.save(); c.translate(W / 2, H / 2 - 20);
    c.shadowColor = "#a78bfa"; c.shadowBlur = 30;
    const kg = c.createLinearGradient(0, -70, 0, 70); kg.addColorStop(0, "#e9d5ff"); kg.addColorStop(1, "#7c3aed");
    c.fillStyle = kg; c.beginPath(); c.moveTo(0, -70); c.lineTo(38, 0); c.lineTo(0, 70); c.lineTo(-38, 0); c.closePath(); c.fill();
    c.shadowBlur = 0; c.fillStyle = "rgba(255,255,255,.45)"; c.beginPath(); c.moveTo(0, -60); c.lineTo(14, -6); c.lineTo(0, 10); c.closePath(); c.fill();
    c.restore();
    c.fillStyle = "#ede9fe"; c.textAlign = "center"; c.font = "bold 30px Rajdhani, 'Segoe UI', sans-serif";
    c.fillText("SHARDFALL", W / 2, H - 80);
    c.fillStyle = "#a78bfa"; c.font = "600 11px 'Inter', 'Segoe UI', sans-serif"; c.fillText("SAMMELKARTE", W / 2, H - 60);
    return cv;
  }

  SF.cardArt = function (id, shiny) {
    const k = id + (shiny ? ":s" : "");
    if (artCache[k]) return artCache[k];
    const url = drawArt(cardById(id), shiny).toDataURL("image/png");
    const card = cardById(id);
    if (card.type !== "oc" || (foxyImgs[card.key] && foxyImgs[card.key].ready)) artCache[k] = url; // Foxy erst merken, wenn das Bild geladen ist
    return url;
  };
  let backUrl = null;
  SF.cardBack = function () { if (!backUrl) backUrl = drawBack().toDataURL("image/png"); return backUrl; };
  // Schriften erst laden lassen, dann Bilder neu erzeugen
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { Object.keys(artCache).forEach(k => delete artCache[k]); backUrl = null; });

  // =====================================================================================
  // SPIELERSTUFE / XP
  // =====================================================================================
  function ensureSave() {
    const s = SF.save;
    s.profile = s.profile || { level: 1, xp: 0, packs: 0, totalXp: 0 };
    s.cards = s.cards || {};
    if (!s.cardsStarter) { s.cardsStarter = true; s.profile.packs += 1; } // Startpack
    if (s.cards.x_foxy) { s.cards.x_foxy_wander = s.cards.x_foxy; delete s.cards.x_foxy; } // alte Einzel-Foxy -> Variante I
    SF.persist();
  }
  const XP_MULT = { easy: 0.6, normal: 1, hard: 1.5 };

  SF.xp = {
    need: level => 150 + 100 * (level - 1),
    // Gibt XP und verteilt Stufen + Kartenpacks
    add(n) {
      const p = SF.save.profile;
      const before = p.level;
      let packs = 0;
      p.xp += n; p.totalXp += n;
      while (p.xp >= SF.xp.need(p.level)) {
        p.xp -= SF.xp.need(p.level);
        p.level++;
        packs += 1 + (p.level % 5 === 0 ? 1 : 0); // jede 5. Stufe ein Bonuspack
      }
      p.packs += packs;
      SF.persist();
      if (p.level > before) SF.emit("levelup", { from: before, to: p.level, packs });
      SF.cardsUi.refreshBadge();
      return { levels: p.level - before, packs };
    },
    // am Rundenende (nur Differenz, falls nach Sieg weitergespielt wird)
    settleRun(G) {
      if (!G || G.cheated) return null;
      const raw = G.kills + G.wave * 12 + (G.won ? 200 : 0);
      const total = Math.round(raw * (XP_MULT[G.diff.key] || 1));
      const gain = Math.max(0, total - (G.xpPaid || 0));
      G.xpPaid = total;
      if (!gain) return null;
      const r = SF.xp.add(gain);
      return Object.assign({ gain }, r);
    }
  };

  // =====================================================================================
  // KARTENPACKS
  // =====================================================================================
  function rollRarity() {
    const sum = PACK_WEIGHTS.reduce((a, [, w]) => a + w, 0);
    let r = Math.random() * sum;
    for (const [k, w] of PACK_WEIGHTS) { r -= w; if (r <= 0) return k; }
    return "common";
  }

  SF.packs = {
    count: () => SF.save.profile.packs,
    open() {
      if (SF.save.profile.packs <= 0) return null;
      SF.save.profile.packs--;
      const results = [];
      for (let i = 0; i < 3; i++) {
        const rarity = i === 2 && Math.random() < 0.5 ? (Math.random() < 0.7 ? "rare" : "epic") : rollRarity(); // 3. Karte etwas besser
        const pool = SF.CARDS.filter(c => c.rarity === rarity && !c.special);
        const card = Math.random() < FOXY_CHANCE ? cardById(rollFoxy()) : pool[Math.floor(Math.random() * pool.length)];
        const rolledShiny = Math.random() < SHINY_CHANCE;
        const entry = SF.save.cards[card.id] || (SF.save.cards[card.id] = { count: 0, shiny: false, first: Date.now() });
        const isNew = entry.count === 0;
        entry.count++;
        let shinyNow = false, viaCopies = false;
        if (!entry.shiny && (rolledShiny || entry.count >= COPIES_FOR_SHINY)) { entry.shiny = true; shinyNow = true; viaCopies = !rolledShiny; }
        results.push({ card, isNew, shinyNow, viaCopies, shiny: rolledShiny || shinyNow, count: entry.count, hasShiny: entry.shiny });
      }
      SF.persist();
      SF.achievements.check(SF.getGame());
      SF.cardsUi.refreshBadge();
      return results;
    }
  };

  SF.cardStats = () => {
    const owned = SF.CARDS.filter(c => SF.save.cards[c.id] && SF.save.cards[c.id].count > 0).length;
    const shiny = SF.CARDS.filter(c => SF.save.cards[c.id] && SF.save.cards[c.id].shiny).length;
    return { owned, shiny, total: TOTAL };
  };

  // =====================================================================================
  // OBERFLÄCHE: Galerie, Kartenansicht, Pack öffnen
  // =====================================================================================
  const ui = SF.cardsUi = { filter: "all", viewList: [], viewIdx: 0 };

  ui.refreshBadge = function () {
    const p = SF.save.profile;
    if (!p) return;
    const need = SF.xp.need(p.level);
    document.querySelectorAll("[data-xp-level]").forEach(el => { el.textContent = p.level; });
    document.querySelectorAll("[data-xp-bar]").forEach(el => { el.style.width = Math.min(100, p.xp / need * 100) + "%"; });
    document.querySelectorAll("[data-xp-text]").forEach(el => { el.textContent = fmt(p.xp) + " / " + fmt(need) + " XP"; });
    document.querySelectorAll("[data-packs]").forEach(el => { el.textContent = p.packs; el.hidden = !p.packs; });
    const st = SF.cardStats();
    document.querySelectorAll("[data-card-count]").forEach(el => { el.textContent = st.owned + " / " + st.total; });
    if ($("galOpenPack")) $("galOpenPack").disabled = !p.packs;
  };

  // ---------- 3D-Neigung für eine Karte ----------
  function attachTilt(el, opts) {
    opts = opts || {};
    let drag = null, rx = 0, ry = 0, flip = 0;
    const apply = () => {
      el.style.setProperty("--rx", rx + "deg");
      el.style.setProperty("--ry", (ry + flip) + "deg");
      const nx = 50 + Math.max(-50, Math.min(50, ry * 1.4)), ny = 50 + Math.max(-50, Math.min(50, -rx * 1.4));
      el.style.setProperty("--mx", nx + "%");
      el.style.setProperty("--my", ny + "%");
      el.style.setProperty("--hue", (ry * 3 + rx * 2) + "deg");
    };
    const host = opts.host || el;
    host.addEventListener("pointermove", e => {
      const r = host.getBoundingClientRect();
      if (drag) {
        ry = drag.ry + (e.clientX - drag.x) * 0.6;
        rx = Math.max(-60, Math.min(60, drag.rx - (e.clientY - drag.y) * 0.6));
      } else if (!opts.dragOnly) {
        ry = ((e.clientX - r.left) / r.width - 0.5) * (opts.max || 22);
        rx = -((e.clientY - r.top) / r.height - 0.5) * (opts.max || 22);
      }
      el.classList.add("active");
      apply();
    });
    if (opts.drag) {
      host.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, rx, ry }; host.setPointerCapture(e.pointerId); el.classList.add("dragging"); });
      const end = () => { drag = null; el.classList.remove("dragging"); };
      host.addEventListener("pointerup", end);
      host.addEventListener("pointercancel", end);
    }
    host.addEventListener("pointerleave", () => { if (drag) return; rx = 0; ry = 0; el.classList.remove("active"); apply(); });
    apply();
    return {
      flip() { flip = flip ? 0 : 180; ry = 0; rx = 0; apply(); return !!flip; },
      reset() { flip = 0; rx = 0; ry = 0; apply(); },
      spin() { ry += 360; apply(); }
    };
  }

  // lazy = Bild erst später im Hintergrund erzeugen (Galerie friert nicht ein)
  const cached = (id, shiny) => !!artCache[id + (shiny ? ":s" : "")];
  function cardFaceHtml(card, shiny, lazy) {
    const ready = !lazy || cached(card.id, shiny);
    const img = ready ? `<img src="${SF.cardArt(card.id, shiny)}" alt="${card.name}" draggable="false">`
      : `<img data-card="${card.id}" data-shiny="${shiny ? 1 : 0}" alt="${card.name}" draggable="false">`;
    return `<div class="c3-face c3-front${shiny ? " shiny" : ""}${card.special ? " oc" : ""} r-${card.rarity}${ready ? "" : " loading"}">
        ${img}
        <div class="c3-holo"></div><div class="c3-sparkle"></div><div class="c3-glare"></div>
      </div>`;
  }

  // Bilder nacheinander erzeugen, jeweils im nächsten Frame
  let hydrateToken = 0;
  function hydrate(root) {
    const token = ++hydrateToken;
    const imgs = [...root.querySelectorAll("img[data-card]")];
    const next = () => {
      if (token !== hydrateToken) return;
      const img = imgs.shift();
      if (!img) return;
      if (img.isConnected) {
        img.src = SF.cardArt(img.dataset.card, img.dataset.shiny === "1");
        img.removeAttribute("data-card");
        img.closest(".c3-face").classList.remove("loading");
      }
      requestAnimationFrame(next);
    };
    requestAnimationFrame(next);
  }

  // ---------- Galerie ----------
  function renderGallery() {
    ui.refreshBadge();
    const st = SF.cardStats();
    $("galProgress").innerHTML = `<b>${st.owned}</b> / ${st.total} Karten · <span class="gal-shiny">✦ ${st.shiny} Glanz</span>`;
    $("galProgressBar").style.width = (st.owned / st.total * 100) + "%";
    document.querySelectorAll("#galTabs button").forEach(b => b.classList.toggle("active", b.dataset.f === ui.filter));
    const grid = $("galGrid");
    grid.innerHTML = "";
    const list = SF.CARDS.filter(c => ui.filter === "all" || c.type === ui.filter || (ui.filter === "special" && c.special) || (ui.filter === "shiny" && SF.save.cards[c.id] && SF.save.cards[c.id].shiny));
    list.forEach(card => {
      const e = SF.save.cards[card.id];
      const owned = e && e.count > 0;
      const el = document.createElement("button");
      el.className = "gal-card" + (owned ? "" : " locked");
      if (owned) {
        el.innerHTML = `<div class="c3 thumb">${cardFaceHtml(card, e.shiny, true)}</div>
          <div class="gal-meta"><span>${card.name}</span>${e.count > 1 ? `<small>×${e.count}</small>` : ""}</div>`;
        el.onclick = () => openViewer(card.id, list.filter(c => SF.save.cards[c.id] && SF.save.cards[c.id].count > 0).map(c => c.id));
        attachTilt(el.querySelector(".c3"), { host: el, max: 18 });
      } else {
        el.innerHTML = `<div class="c3 thumb"><div class="c3-face c3-front locked-face"><div class="lock-q">?</div></div></div>
          <div class="gal-meta"><span>#${String(card.no).padStart(2, "0")} · ???</span><small class="r-${card.rarity}-t">${card.special ? "★ Sonder" : RARITY_STYLE[card.rarity].name}</small></div>`;
        if (card.special) el.classList.add("special-locked");
        el.disabled = true;
      }
      grid.appendChild(el);
    });
    hydrate(grid);
  }

  // ---------- Großansicht ----------
  let viewerTilt = null;
  function openViewer(id, list) {
    ui.viewList = list; ui.viewIdx = list.indexOf(id);
    SF.ui.open("cardView");
    renderViewer();
  }
  function renderViewer() {
    const id = ui.viewList[ui.viewIdx];
    const card = cardById(id);
    const e = SF.save.cards[id];
    const lore = card.type === "oc" ? "" : card.type === "enemy" ? (SF.ENEMY_TEXT[card.key] || {}).lore : card.type === "tower" ? (SF.TOWER_TEXT[card.key] || {}).lore : "";
    const st = card.type === "enemy" || card.type === "oc" ? null : SF.getTowerStats(card.key, 3, card.spec || null);
    const d = card.type === "enemy" ? SF.ENEMIES[card.key] : null;
    const facts = card.type === "oc" ? [] : d
      ? [["Leben", fmt(d.hp)], ["Tempo", d.speed], ["Rüstung", Math.round(d.armor * 100) + " %"], ["Gold", d.gold], ["Besiegt", fmt(SF.save.lifetime.kills[card.key] || 0)]]
      : [[st.dps ? "Schaden/s" : st.buff ? "Bonus" : "Schaden", st.dps ? Math.round(st.dps) : st.buff ? "+" + Math.round(st.buff * 100) + " %" : Math.round(st.dmg)], ["Reichweite", Math.round(st.range)], ["Gebaut", fmt(SF.save.lifetime.built[card.key] || 0)]];
    const R = RARITY_STYLE[card.rarity];
    if (card.type === "oc") {
      const F = SF.FOXY, V = card.variant;
      const owned = SF.FOXY_VARIANTS.filter(v => SF.save.cards["x_foxy_" + v.key] && SF.save.cards["x_foxy_" + v.key].count).length;
      $("cvStage").innerHTML = `<div class="c3 big" id="cvCard">
        ${cardFaceHtml(card, e.shiny)}
        <div class="c3-face c3-back r-legendary oc-back">
          <div class="cb-head"><small style="color:${V.colors[0]}">★★★★ Legendär · Sonderkarte · Variante ${V.roman} / IV</small><b>Foxy – ${V.title}</b><span>${V.sub}</span></div>
          <div class="cb-facts oc-facts">
            <div><span>Typ</span><b>${F.type}</b></div><div><span>Element</span><b>${F.element}</b></div>
            <div><span>Herkunft</span><b>${F.origin}</b></div><div><span>Alter · Größe</span><b>${F.age} · ${F.height}</b></div>
          </div>
          <div class="oc-abil">${F.abilities.map(([n, t, d2]) => `<div><b>${n}</b>${t ? ` <small>(${t})</small>` : ""}<p>${d2}</p></div>`).join("")}</div>
          <div class="oc-weak"><b>Schwäche:</b> ${F.weakness}</div>
          <p class="cb-lore">${V.flavor}</p>
          <div class="cb-own">Kopien: <b>${e.count}</b> ${e.shiny ? `· <span class="gal-shiny">✦ Glanz</span>` : ""} · gefunden am ${new Date(e.first).toLocaleDateString("de-DE")}<br>Foxy-Varianten gesammelt: <b>${owned} / ${SF.FOXY_VARIANTS.length}</b></div>
        </div>
      </div>`;
      viewerTilt = attachTilt($("cvCard"), { host: $("cvStage"), drag: true, max: 26 });
      $("cvInfo").innerHTML = `${ui.viewIdx + 1} / ${ui.viewList.length} · Ziehen zum Drehen`;
      $("cvPrev").disabled = ui.viewList.length < 2; $("cvNext").disabled = ui.viewList.length < 2;
      return;
    }
    $("cvStage").innerHTML = `<div class="c3 big" id="cvCard">
        ${cardFaceHtml(card, e.shiny)}
        <div class="c3-face c3-back r-${card.rarity}">
          <div class="cb-head"><small style="color:${R.a}">${R.name} · #${String(card.no).padStart(2, "0")}</small><b>${card.name}</b><span>${subtitle(card)}</span></div>
          ${lore ? `<p class="cb-lore">${lore}</p>` : ""}
          <p class="cb-text">${cardText(card)}</p>
          <div class="cb-facts">${facts.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join("")}</div>
          <div class="cb-own">Kopien: <b>${e.count}</b> ${e.shiny ? `· <span class="gal-shiny">✦ Glanz freigeschaltet</span>` : `· ${Math.min(e.count, COPIES_FOR_SHINY)} / ${COPIES_FOR_SHINY} bis Glanz`}</div>
          <div class="cb-date">Gefunden am ${new Date(e.first).toLocaleDateString("de-DE")}</div>
        </div>
      </div>`;
    viewerTilt = attachTilt($("cvCard"), { host: $("cvStage"), drag: true, dragOnly: false, max: 26 });
    $("cvInfo").innerHTML = `${ui.viewIdx + 1} / ${ui.viewList.length} · Ziehen zum Drehen`;
    $("cvPrev").disabled = ui.viewList.length < 2; $("cvNext").disabled = ui.viewList.length < 2;
  }

  // ---------- Pack öffnen ----------
  let packResults = null;
  function startPack() {
    if (!SF.save.profile.packs) return;
    SF.ui.open("packOpen");
    $("packStage").innerHTML = `<button class="pack" id="packBtn">
        <div class="pack-shine"></div>
        <div class="pack-logo">SHARD<span>FALL</span></div>
        <div class="pack-sub">Kartenpack · 3 Karten</div>
        <div class="pack-gem"></div>
        <div class="pack-hint">Klicken zum Öffnen</div>
      </button>`;
    $("packActions").hidden = true;
    $("packLeft").textContent = SF.save.profile.packs;
    $("packBtn").onclick = () => {
      $("packBtn").classList.add("burst");
      SF.audio.play("boom");
      setTimeout(() => revealCards(), 520);
    };
  }

  function revealCards() {
    packResults = SF.packs.open();
    if (!packResults) return;
    const stage = $("packStage");
    stage.innerHTML = `<div class="pack-cards"></div>`;
    const box = stage.querySelector(".pack-cards");
    let flipped = 0;
    packResults.forEach((r, i) => {
      const wrap = document.createElement("div");
      wrap.className = "pc-wrap";
      wrap.style.animationDelay = (i * 0.12) + "s";
      wrap.innerHTML = `<div class="c3 pc r-${r.card.rarity}">
          <div class="c3-face c3-front-back"><img src="${SF.cardBack()}" draggable="false"></div>
          ${cardFaceHtml(r.card, r.shiny).replace("c3-face c3-front", "c3-face c3-front pc-front")}
        </div>
        <div class="pc-label"></div>`;
      const c3 = wrap.querySelector(".c3");
      const tilt = attachTilt(c3, { host: wrap, max: 16 });
      let open = false;
      wrap.onclick = () => {
        if (open) return;
        open = true; flipped++;
        c3.classList.add("revealed");
        wrap.classList.add("glow-" + r.card.rarity);
        if (r.card.special) { wrap.classList.add("glow-oc"); SF.ui.toast("★ SONDERKARTE: Foxy – " + r.card.variant.title + " (Variante " + r.card.variant.roman + ")!", "ach"); }
        SF.audio.play(r.card.rarity === "legendary" ? "win" : r.card.rarity === "epic" ? "upgrade" : "click");
        const lbl = wrap.querySelector(".pc-label");
        const R = RARITY_STYLE[r.card.rarity];
        lbl.innerHTML = (r.card.special ? `<div class="pc-oc">★ SONDERKARTE ★</div><div class="pc-oc-v">Foxy – ${r.card.variant.title}</div>` : "") + `<b style="color:${R.a}">${R.name}</b> · ${r.isNew ? `<span class="pc-new">NEU!</span>` : `Kopie ×${r.count}`}` +
          (r.shinyNow ? `<div class="pc-shiny">✨ Glanz freigeschaltet${r.viaCopies ? " (5 Kopien)" : "!"}</div>` : (!r.isNew && !r.hasShiny ? `<div class="pc-dupe">${Math.min(r.count, COPIES_FOR_SHINY)} / ${COPIES_FOR_SHINY} bis Glanz</div>` : ""));
        if (flipped === packResults.length) done();
      };
      box.appendChild(wrap);
    });
    $("packActions").hidden = false;
    $("packAll").hidden = false;
    $("packNext").hidden = true; $("packDone").hidden = true;
    $("packAll").onclick = () => box.querySelectorAll(".pc-wrap").forEach((w, i) => setTimeout(() => w.click(), i * 180));
    function done() {
      $("packAll").hidden = true;
      $("packLeft").textContent = SF.save.profile.packs;
      $("packNext").hidden = !SF.save.profile.packs;
      $("packDone").hidden = false;
    }
  }

  // ---------- Start ----------
  ui.init = function () {
    ensureSave();
    ui.refreshBadge();
    document.querySelectorAll("#galTabs button").forEach(b => b.onclick = () => { ui.filter = b.dataset.f; SF.audio.play("click"); renderGallery(); });
    $("galOpenPack").onclick = startPack;
    $("cvPrev").onclick = () => { ui.viewIdx = (ui.viewIdx - 1 + ui.viewList.length) % ui.viewList.length; renderViewer(); };
    $("cvNext").onclick = () => { ui.viewIdx = (ui.viewIdx + 1) % ui.viewList.length; renderViewer(); };
    $("cvFlip").onclick = () => { if (viewerTilt) { const back = viewerTilt.flip(); $("cvFlip").textContent = back ? "↺ Vorderseite" : "↻ Umdrehen"; } };
    $("cvSpin").onclick = () => viewerTilt && viewerTilt.spin();
    $("packNext").onclick = startPack;
    $("packDone").onclick = () => { SF.ui.close("packOpen"); if (!$("gallery").hidden) renderGallery(); };
    document.addEventListener("keydown", e => {
      if ($("cardView").hidden) return;
      if (e.key === "ArrowLeft") $("cvPrev").click();
      if (e.key === "ArrowRight") $("cvNext").click();
      if (e.key === " " || e.key.toLowerCase() === "f") { e.preventDefault(); $("cvFlip").click(); }
    });
  };
  ui.render = renderGallery;
  ui.startPack = startPack;
})();
