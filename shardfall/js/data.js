/* Shardfall – Spieldaten: Türme, Gegner, Karten
 * Balancing passiert fast komplett hier.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // TÜRME
  // Jede Stufe hat eigene Werte. Ab Stufe 3 wählt man eine von zwei Spezialisierungen.
  // air: kann fliegende Gegner treffen · energy: doppelter Schaden gegen Schilde
  // pierce: ignoriert Rüstung
  // ---------------------------------------------------------------------------
  SF.TOWERS = {
    bolt: {
      key: "bolt", name: "Bolzenturm", hotkey: "1", color: "#7dd3fc", accent: "#0ea5e9",
      kind: "projectile", air: true,
      desc: "Schnelle Einzelschüsse. Trifft auch Flieger.",
      levels: [
        { cost: 70,  dmg: 12, rate: 2.2, range: 170, projSpeed: 720 },
        { cost: 60,  dmg: 18, rate: 2.6, range: 180, projSpeed: 760 },
        { cost: 110, dmg: 27, rate: 3.0, range: 195, projSpeed: 800 }
      ],
      specs: [
        { key: "sniper", name: "Scharfschütze", cost: 240, desc: "Riesige Reichweite, harte Treffer, 25 % Krit-Chance (x2,5). Sieht Phantome.",
          mods: { dmgMult: 3.4, rateMult: 0.45, rangeAdd: 130, crit: 0.25, critMult: 2.5, projSpeed: 1400 } },
        { key: "volley", name: "Salvenwerfer", cost: 240, desc: "Schießt gleichzeitig auf bis zu 3 Ziele.",
          mods: { dmgMult: 1.15, multishot: 3 } }
      ]
    },

    cannon: {
      key: "cannon", name: "Kanone", hotkey: "2", color: "#fca5a5", accent: "#ef4444",
      kind: "projectile", air: false,
      desc: "Flächenschaden am Boden. Gut gegen Gruppen.",
      levels: [
        { cost: 110, dmg: 30, rate: 0.8,  range: 150, splash: 55, projSpeed: 460 },
        { cost: 90,  dmg: 45, rate: 0.85, range: 155, splash: 60, projSpeed: 480 },
        { cost: 150, dmg: 66, rate: 0.9,  range: 165, splash: 66, projSpeed: 500 }
      ],
      specs: [
        { key: "siege", name: "Belagerungskanone", cost: 300, desc: "Doppelter Schaden, größerer Radius, zerschmettert Rüstung (-15 %).",
          mods: { dmgMult: 2.0, splashAdd: 28, shred: 0.15 } },
        { key: "cluster", name: "Streufeuer", cost: 300, desc: "Jeder Einschlag verteilt 4 Splitterbomben.",
          mods: { dmgMult: 1.2, cluster: 4 } }
      ]
    },

    frost: {
      key: "frost", name: "Frostkristall", hotkey: "3", color: "#a5f3fc", accent: "#22d3ee",
      kind: "projectile", air: true,
      desc: "Verlangsamt Gegner im Umkreis des Treffers.",
      levels: [
        { cost: 90,  dmg: 6,  rate: 1.2, range: 140, splash: 40, slow: 0.45, slowTime: 1.6, projSpeed: 520 },
        { cost: 80,  dmg: 9,  rate: 1.3, range: 145, splash: 46, slow: 0.40, slowTime: 1.8, projSpeed: 540 },
        { cost: 130, dmg: 13, rate: 1.4, range: 155, splash: 55, slow: 0.35, slowTime: 2.0, projSpeed: 560 }
      ],
      specs: [
        { key: "blizzard", name: "Eissturm", cost: 260, desc: "15 % Chance, Gegner 1 s komplett einzufrieren.",
          mods: { freezeChance: 0.15, freezeTime: 1.0, splashAdd: 15 } },
        { key: "brittle", name: "Splitterfrost", cost: 260, desc: "Verlangsamte Gegner erleiden +30 % Schaden von allen Türmen.",
          mods: { brittle: 0.30, slowTimeAdd: 0.8 } }
      ]
    },

    tesla: {
      key: "tesla", name: "Blitzspule", hotkey: "4", color: "#c4b5fd", accent: "#8b5cf6",
      kind: "chain", air: true, energy: true,
      desc: "Kettenblitz springt zwischen Gegnern. Stark gegen Schilde.",
      levels: [
        { cost: 140, dmg: 22, rate: 1.0,  range: 150, chain: 3, chainRange: 110, falloff: 0.8 },
        { cost: 120, dmg: 32, rate: 1.05, range: 155, chain: 4, chainRange: 115, falloff: 0.82 },
        { cost: 190, dmg: 46, rate: 1.1,  range: 162, chain: 5, chainRange: 120, falloff: 0.84 }
      ],
      specs: [
        { key: "storm", name: "Gewitterkern", cost: 340, desc: "Blitz springt auf bis zu 10 Gegner.",
          mods: { chainSet: 10, falloff: 0.9 } },
        { key: "overload", name: "Überladung", cost: 340, desc: "x1,7 Schaden und lähmt Ziele kurz (0,35 s).",
          mods: { dmgMult: 1.7, stun: 0.35 } }
      ]
    },

    mortar: {
      key: "mortar", name: "Mörser", hotkey: "5", color: "#fdba74", accent: "#f97316",
      kind: "mortar", air: false,
      desc: "Riesige Reichweite und Explosionen. Toter Winkel in der Nähe.",
      levels: [
        { cost: 160, dmg: 55,  rate: 0.45, range: 300, minRange: 90, splash: 80, flight: 0.9 },
        { cost: 130, dmg: 85,  rate: 0.48, range: 310, minRange: 90, splash: 86, flight: 0.9 },
        { cost: 210, dmg: 125, rate: 0.5,  range: 320, minRange: 90, splash: 95, flight: 0.85 }
      ],
      specs: [
        { key: "inferno", name: "Feuerbrunst", cost: 380, desc: "Hinterlässt 3 s brennenden Boden.",
          mods: { burn: 0.45, burnTime: 3 } },
        { key: "quake", name: "Erdbeben", cost: 380, desc: "Betäubt alles im Radius für 0,6 s.",
          mods: { dmgMult: 1.25, stun: 0.6 } }
      ]
    },

    prism: {
      key: "prism", name: "Prisma", hotkey: "6", color: "#f0abfc", accent: "#d946ef",
      kind: "beam", air: true, energy: true, pierce: true,
      desc: "Dauerstrahl, wird auf demselben Ziel immer stärker. Ignoriert Rüstung.",
      levels: [
        { cost: 180, dps: 30, range: 160, ramp: 3, rampTime: 2.5 },
        { cost: 150, dps: 45, range: 165, ramp: 3, rampTime: 2.4 },
        { cost: 230, dps: 68, range: 175, ramp: 3, rampTime: 2.2 }
      ],
      specs: [
        { key: "focus", name: "Fokuslinse", cost: 420, desc: "Aufladung bis x7 – Bosskiller.",
          mods: { rampSet: 7, rampTime: 3.2 } },
        { key: "fan", name: "Fächerstrahl", cost: 420, desc: "Drei Strahlen gleichzeitig.",
          mods: { beams: 3, dpsMult: 1.1 } }
      ]
    },

    beacon: {
      key: "beacon", name: "Leuchtfeuer", hotkey: "7", color: "#fde68a", accent: "#eab308",
      kind: "aura", air: false, support: true,
      desc: "Stärkt Türme in der Nähe und enttarnt Phantome.",
      levels: [
        { cost: 120, range: 140, buff: 0.15 },
        { cost: 100, range: 150, buff: 0.22 },
        { cost: 160, range: 160, buff: 0.30 }
      ],
      specs: [
        { key: "warhorn", name: "Kriegshorn", cost: 300, desc: "Zusätzlich +20 % Feuerrate für Türme in Reichweite.",
          mods: { rateBuff: 0.20 } },
        { key: "goldvein", name: "Goldader", cost: 300, desc: "+45 Gold bei jeder neuen Welle.",
          mods: { income: 45 } }
      ]
    }
  };

  SF.TOWER_ORDER = ["bolt", "cannon", "frost", "tesla", "mortar", "prism", "beacon"];

  // Endwerte eines Turms für eine Stufe (+ Spezialisierung) berechnen
  SF.getTowerStats = function (key, level, specKey) {
    const def = SF.TOWERS[key];
    const base = Object.assign({}, def.levels[Math.min(level, 3) - 1]);
    base.air = !!def.air;
    base.energy = !!def.energy;
    base.pierce = !!def.pierce;
    if (specKey) {
      const spec = def.specs.find(s => s.key === specKey);
      const m = spec ? spec.mods : {};
      if (m.dmgMult && base.dmg) base.dmg *= m.dmgMult;
      if (m.dpsMult && base.dps) base.dps *= m.dpsMult;
      if (m.rateMult) base.rate *= m.rateMult;
      if (m.rangeAdd) base.range += m.rangeAdd;
      if (m.splashAdd) base.splash = (base.splash || 0) + m.splashAdd;
      if (m.slowTimeAdd) base.slowTime += m.slowTimeAdd;
      if (m.chainSet) base.chain = m.chainSet;
      if (m.rampSet) base.ramp = m.rampSet;
      ["crit", "critMult", "projSpeed", "multishot", "shred", "cluster", "freezeChance", "freezeTime",
        "brittle", "stun", "falloff", "burn", "burnTime", "rampTime", "beams", "rateBuff", "income"]
        .forEach(k => { if (m[k] !== undefined) base[k] = m[k]; });
    }
    return base;
  };

  // Gesamtkosten bis zu einer Stufe (für Verkaufswert)
  SF.getTowerInvested = function (key, level, specKey) {
    const def = SF.TOWERS[key];
    let sum = 0;
    for (let i = 0; i < Math.min(level, 3); i++) sum += def.levels[i].cost;
    if (specKey) {
      const spec = def.specs.find(s => s.key === specKey);
      if (spec) sum += spec.cost;
    }
    return sum;
  };

  // ---------------------------------------------------------------------------
  // GEGNER
  // speed in Pixel/Sekunde · armor = Schadensreduktion (0–0,7) · cost = Wellenbudget
  // ---------------------------------------------------------------------------
  SF.ENEMIES = {
    grunt:   { key: "grunt",   name: "Läufer",        hp: 42,   speed: 62,  armor: 0,    gold: 5,   lives: 1,  size: 14, color: "#a3e635", cost: 1,   from: 1 },
    runner:  { key: "runner",  name: "Flitzer",       hp: 26,   speed: 118, armor: 0,    gold: 4,   lives: 1,  size: 11, color: "#facc15", cost: 1,   from: 3 },
    flyer:   { key: "flyer",   name: "Schwebling",    hp: 50,   speed: 66,  armor: 0,    gold: 8,   lives: 1,  size: 13, color: "#67e8f9", cost: 2.6, from: 6,  flying: true },
    brute:   { key: "brute",   name: "Panzerkoloss",  hp: 140,  speed: 42,  armor: 0.45, gold: 11,  lives: 2,  size: 18, color: "#94a3b8", cost: 3,   from: 7 },
    splitter:{ key: "splitter",name: "Teiler",        hp: 100,  speed: 50,  armor: 0,    gold: 8,   lives: 2,  size: 16, color: "#fb923c", cost: 3,   from: 9,  splits: 3 },
    healer:  { key: "healer",  name: "Heiler",        hp: 80,   speed: 55,  armor: 0,    gold: 10,  lives: 1,  size: 14, color: "#4ade80", cost: 3,   from: 11, heal: 0.05, healRange: 95 },
    shield:  { key: "shield",  name: "Schildträger",  hp: 70,   speed: 50,  armor: 0.1,  gold: 11,  lives: 2,  size: 15, color: "#60a5fa", cost: 3,   from: 13, shield: 95 },
    phantom: { key: "phantom", name: "Phantom",       hp: 60,   speed: 86,  armor: 0,    gold: 9,   lives: 2,  size: 13, color: "#e9d5ff", cost: 2.5, from: 15, stealth: true },
    riftwalker:{ key: "riftwalker", name: "Rissläufer", hp: 500, speed: 50, armor: 0.15, gold: 60, lives: 3, size: 20, color: "#06b6d4", cost: 0, from: 10, rare: true, rift: true, slowResist: 0.5 },
    shard:   { key: "shard",   name: "Splitterling",  hp: 22,   speed: 100, armor: 0,    gold: 1,   lives: 1,  size: 9,  color: "#fdba74", cost: 0,   from: 999 },
    boss:    { key: "boss",    name: "Riftkoloss",    hp: 1300, speed: 30,  armor: 0.3,  gold: 150, lives: 6,  size: 30, color: "#f43f5e", cost: 0,   from: 999, boss: true, summon: "grunt", summonEvery: 4 }
  };

  // ---------------------------------------------------------------------------
  // WELLEN-EREIGNISSE (wie die Level-Ereignisse aus Riftward)
  // ---------------------------------------------------------------------------
  SF.WAVE_EVENTS = {
    horde:    { key: "horde",    name: "Großer Ansturm", icon: "⚠", desc: "25 % mehr Gegner in dieser Welle." },
    armored:  { key: "armored",  name: "Gepanzert",      icon: "⛨", desc: "Gegner haben 20 % mehr Leben." },
    rush:     { key: "rush",     name: "Eiltempo",       icon: "»", desc: "Gegner sind 15 % schneller." },
    goldrush: { key: "goldrush", name: "Goldregen",      icon: "◆", desc: "Kills geben 50 % mehr Gold." },
    rift:     { key: "rift",     name: "Rissaktivität",  icon: "✦", desc: "Ein Rissläufer erscheint garantiert." }
  };

  SF.waveEvent = function (map, wave) {
    if (wave < 5 || wave % 10 === 0) return null;
    const rng = SF.util.mulberry32(SF.util.hashStr(map.key + ":event:" + wave));
    if (rng() > 0.3) return null;
    const pool = wave >= 10 ? ["horde", "armored", "rush", "goldrush", "rift"] : ["horde", "armored", "rush", "goldrush"];
    return pool[Math.floor(rng() * pool.length)];
  };

  // Lebenspunkte-Skalierung pro Welle
  SF.waveHpMult = function (wave) {
    const w = wave - 1;
    return 1 + 0.09 * w + 0.016 * w * w;
  };
  // Gold pro Kill wächst leicht mit
  SF.waveGoldMult = function (wave) {
    return 1; // Gold pro Kill bleibt konstant – mehr Gegner = mehr Gold
  };

  // ---------------------------------------------------------------------------
  // KARTEN (Koordinaten in Kacheln, Raster 20 x 12)
  // ---------------------------------------------------------------------------
  SF.MAPS = [
    {
      key: "meadow", name: "Kristallwiesen", difficulty: "Einstieg",
      desc: "Ein gewundener Pfad durch ruhige Wiesen.",
      theme: { ground: "#1f3b2a", ground2: "#25462f", path: "#5b4b38", pathEdge: "#3f3426", deco: ["tree", "rock", "crystal"], accent: "#34d399", fog: "rgba(16,185,129,0.05)" },
      paths: [
        [[-1, 2], [4, 2], [4, 8], [9, 8], [9, 3], [14, 3], [14, 9], [20, 9]]
      ]
    },
    {
      key: "ashpass", name: "Aschepass", difficulty: "Mittel",
      desc: "Langer Serpentinenpfad – viel Platz, aber Gegner sind zäh.",
      theme: { ground: "#2a1c1c", ground2: "#332222", path: "#4a3a32", pathEdge: "#2b201b", deco: ["rock", "ember", "rock"], accent: "#f97316", fog: "rgba(249,115,22,0.05)" },
      paths: [
        [[-1, 1], [17, 1], [17, 4], [2, 4], [2, 7], [17, 7], [17, 10], [20, 10]]
      ]
    },
    {
      key: "frostbreak", name: "Frostbruch", difficulty: "Schwer",
      desc: "Zwei Eingänge, die sich in der Mitte vereinen.",
      theme: { ground: "#1c2a3a", ground2: "#213246", path: "#5d6b7c", pathEdge: "#3b4757", deco: ["ice", "rock", "crystal"], accent: "#38bdf8", fog: "rgba(56,189,248,0.06)" },
      paths: [
        [[-1, 2], [6, 2], [6, 6], [12, 6], [12, 9], [20, 9]],
        [[-1, 10], [8, 10], [8, 6], [12, 6], [12, 9], [20, 9]]
      ]
    }
  ];
})();
