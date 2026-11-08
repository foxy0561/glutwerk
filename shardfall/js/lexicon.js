/* Shardfall – Lexikon: alle Türme und Gegner mit Werten, Hintergrund und Taktik */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const fmt = n => Math.round(n).toLocaleString("de-DE");

  // ---------------------------------------------------------------- Texte
  const TOWER_TEXT = {
    bolt: {
      role: "Allrounder",
      lore: "Die ersten Wachtürme der Kristallhüter. Einfache Armbrüste, aber mit Kernsplittern verstärkte Bolzen durchschlagen fast alles, was aus dem Riss kriecht.",
      tips: ["Billigster Turm – ideal für die ersten Wellen.", "Einer der wenigen Türme, die früh Schweblinge treffen.", "Scharfschütze sieht Phantome auch ohne Leuchtfeuer."]
    },
    cannon: {
      role: "Flächenschaden",
      lore: "Schwere Bronzerohre, gegossen in den Schmieden des Aschepasses. Langsam, laut – und tödlich für alles, was in Gruppen läuft.",
      tips: ["Stell sie an Kurven, wo Gegner sich stauen.", "Trifft keine Flieger – plane Luftabwehr daneben.", "Belagerungskanone schwächt Rüstung für alle anderen Türme."]
    },
    frost: {
      role: "Kontrolle",
      lore: "Ein schwebender Splitter aus dem Frostbruch. Er macht kaum Schaden, aber alles in seiner Nähe wird träge und zerbrechlich.",
      tips: ["Ein Frostkristall am Anfang einer langen Strecke verlängert die Zeit unter Beschuss enorm.", "Splitterfrost macht alle verlangsamten Gegner 30 % anfälliger.", "Bosse werden nur halb so lange verlangsamt."]
    },
    tesla: {
      role: "Ketten & Schilde",
      lore: "Spulen, die die Energie des Risses gegen ihn selbst wenden. Der Blitz springt von Gegner zu Gegner, bis er verglüht.",
      tips: ["Energie-Schaden zerstört Schilde doppelt so schnell.", "Am stärksten gegen dichte Gruppen kleiner Gegner.", "Überladung lähmt kurz – gut gegen Flitzer."]
    },
    mortar: {
      role: "Artillerie",
      lore: "Steilfeuergeschütze, die über halbe Karten hinweg treffen. Wer zu nah herankommt, ist allerdings sicher.",
      tips: ["Riesige Reichweite – kann mehrere Pfadabschnitte abdecken.", "Toter Winkel direkt am Turm (rot markiert).", "Zielt standardmäßig auf den stärksten Gegner und berechnet voraus, wo er landet."]
    },
    prism: {
      role: "Bosskiller",
      lore: "Ein geschliffener Riftkristall bündelt Licht zu einem Strahl, der mit jeder Sekunde heißer brennt.",
      tips: ["Je länger auf demselben Ziel, desto stärker (bis x3, Fokuslinse x7).", "Ignoriert Rüstung komplett – perfekt gegen Panzerkolosse.", "Zielwahl „Stärkster“ lässt ihn an Bossen kleben."]
    },
    beacon: {
      role: "Unterstützung",
      lore: "Ein Leuchtfeuer der Kristallhüter. Sein Licht stärkt die Verteidiger – und reißt den Phantomen ihre Tarnung vom Leib.",
      tips: ["Ohne Leuchtfeuer (oder Scharfschütze) sind Phantome unangreifbar!", "Bonus stapelt nicht – mehrere Leuchtfeuer nebeneinander bringen nichts.", "Goldader zahlt sich ab ca. 7 Wellen aus."]
    }
  };

  const ENEMY_TEXT = {
    grunt:   { lore: "Das Fußvolk des Risses. Einzeln harmlos, in Massen gefährlich.", ability: "Keine.", counter: "Alles – besonders Kanone." },
    runner:  { lore: "Dürre, flinke Kreaturen, die an langsamen Türmen einfach vorbeihuschen.", ability: "Doppelt so schnell wie ein Läufer.", counter: "Bolzenturm, Frostkristall, Blitzspule." },
    flyer:   { lore: "Gleitende Wesen, die den Pfad ignorieren und direkt auf den Kern zusteuern.", ability: "Fliegt in gerader Linie vom Portal zum Kern. Kanone und Mörser treffen ihn nicht.", counter: "Bolzenturm, Blitzspule, Prisma, Frostkristall – entlang der Fluglinie." },
    brute:   { lore: "Wandelnde Festungen aus Riftgestein. Langsam, aber kaum zu verletzen.", ability: "45 % Rüstung – jeder Treffer macht weniger Schaden. Kostet 2 Leben.", counter: "Prisma (ignoriert Rüstung), Belagerungskanone (zerschmettert Rüstung)." },
    splitter:{ lore: "Ein Klumpen aus instabilen Splittern, der beim Tod zerbirst.", ability: "Zerfällt beim Tod in 3 schnelle Splitterlinge.", counter: "Flächenschaden: Kanone, Mörser, Blitzspule." },
    healer:  { lore: "Riftpriester, die ihre Begleiter mit gestohlener Kristallenergie heilen.", ability: "Heilt alle Gegner in der Nähe um 5 % ihres maximalen Lebens pro Sekunde.", counter: "Zuerst ausschalten – Zielwahl „Stärkster“ oder Scharfschütze." },
    shield:  { lore: "Krieger mit einer Barriere aus verdichtetem Licht.", ability: "Schild muss zuerst zerstört werden. Energie-Türme machen daran doppelten Schaden.", counter: "Blitzspule und Prisma." },
    phantom: { lore: "Kaum mehr als ein Flüstern im Riss. Normale Augen sehen sie nicht.", ability: "Unsichtbar und unangreifbar, außer in Reichweite eines Leuchtfeuers oder Scharfschützen.", counter: "Leuchtfeuer an den Pfad stellen, Türme drumherum." },
    riftwalker: { lore: "Ein seltener Wanderer zwischen den Welten. Wo er den Boden berührt, reißt die Wirklichkeit auf – und hinter ihm folgt die ganze Horde.", ability: "Seltener Mini-Boss (ab Welle 10). Nach ca. einem Viertel seines Weges reißt er eine Abkürzung durchs Gelände. Türme auf der Risslinie werden zerstört (ohne Geld zurück). Alle Bodengegner nutzen den Riss, bis er sich nach 2 Wellen schließt. Verlangsamung wirkt nur halb.", counter: "Früh viel Schaden am Pfadanfang, damit er gar nicht erst reißt: Prisma, Blitzspule, Scharfschütze. Lass Türme nicht nur an einer Stelle stehen." },
    shard:   { lore: "Die Bruchstücke eines Teilers. Klein, schnell, aber zerbrechlich.", ability: "Entsteht aus einem Teiler.", counter: "Blitzspule, Kanone." },
    boss:    { lore: "Ein Titan, der nur alle zehn Wellen durch den Riss bricht. Der Boden bebt unter seinen Schritten.", ability: "Riesige Lebenspunkte, 30 % Rüstung, ruft alle 4 s zwei Läufer. Halbe Wirkung von Verlangsamung und Betäubung. Kostet 6 Leben.", counter: "Prisma mit Fokuslinse, Belagerungskanone, Frost zum Bremsen." }
  };

  const KIND_NAMES = { projectile: "Geschoss", chain: "Kettenblitz", mortar: "Steilfeuer", beam: "Dauerstrahl", aura: "Aura" };

  // ---------------------------------------------------------------- Zustand
  const lex = SF.lexicon = { tab: "towers", towerKey: "bolt", enemyKey: "grunt" };

  function speedLabel(px) {
    const tps = px / SF.CONFIG.TILE;
    const word = px >= 100 ? "sehr schnell" : px >= 75 ? "schnell" : px >= 55 ? "normal" : px >= 40 ? "langsam" : "sehr langsam";
    return word + " (" + tps.toFixed(1) + " Felder/s)";
  }

  // Werte-Zeilen für Stufentabelle
  function towerRows(key) {
    const def = SF.TOWERS[key];
    const L = [1, 2, 3].map(l => SF.getTowerStats(key, l, null));
    const rows = [["Kosten", def.levels.map((lv, i) => (i ? "+" : "") + lv.cost)]];
    const add = (label, f) => { if (L.some(s => f(s) !== undefined && f(s) !== null && f(s) !== "")) rows.push([label, L.map(f)]); };
    if (def.kind === "aura") {
      add("Schadensbonus", s => "+" + Math.round(s.buff * 100) + " %");
      add("Reichweite", s => Math.round(s.range));
      return rows;
    }
    if (def.kind === "beam") { add("Schaden/s", s => Math.round(s.dps)); add("Aufladung", s => "x" + s.ramp + " in " + s.rampTime + " s"); }
    else { add("Schaden", s => Math.round(s.dmg)); add("Schüsse/s", s => s.rate.toFixed(2)); add("DPS (Einzelziel)", s => Math.round(s.dmg * s.rate)); }
    add("Reichweite", s => Math.round(s.range) + (s.minRange ? " (min " + s.minRange + ")" : ""));
    add("Fläche", s => s.splash ? Math.round(s.splash) : undefined);
    add("Verlangsamung", s => s.slow ? Math.round((1 - s.slow) * 100) + " % für " + s.slowTime + " s" : undefined);
    add("Sprünge", s => s.chain ? s.chain + " (je " + Math.round((1 - s.falloff) * 100) + " % weniger)" : undefined);
    return rows;
  }

  function specChanges(key, spec) {
    const before = SF.getTowerStats(key, 3, null);
    const after = SF.getTowerStats(key, 3, spec.key);
    const out = [];
    const cmp = (label, a, b, f) => { if (a !== b && b !== undefined) out.push(label + ": " + (a !== undefined ? f(a) + " → " : "") + f(b)); };
    cmp("Schaden", before.dmg, after.dmg, Math.round);
    cmp("Schaden/s", before.dps, after.dps, Math.round);
    cmp("Schüsse/s", before.rate, after.rate, v => v.toFixed(2));
    cmp("Reichweite", before.range, after.range, Math.round);
    cmp("Fläche", before.splash, after.splash, Math.round);
    cmp("Sprünge", before.chain, after.chain, v => v);
    cmp("Aufladung", before.ramp, after.ramp, v => "x" + v);
    return out;
  }

  // ---------------------------------------------------------------- Aufbau
  function renderList() {
    const list = $("lexList");
    list.innerHTML = "";
    const L = SF.save.lifetime;
    if (lex.tab === "achievements") return;
    if (lex.tab === "towers") {
      SF.TOWER_ORDER.forEach(k => {
        const b = document.createElement("button");
        b.className = "lex-item" + (k === lex.towerKey ? " active" : "");
        b.appendChild(SF.render.towerIcon(k, 40));
        b.insertAdjacentHTML("beforeend", `<span><b>${SF.TOWERS[k].name}</b><small>${TOWER_TEXT[k].role}</small></span>`);
        b.onclick = () => { lex.towerKey = k; SF.audio.play("click"); render(); };
        list.appendChild(b);
      });
    } else {
      Object.keys(SF.ENEMIES).sort((a, b) => SF.ENEMIES[a].from - SF.ENEMIES[b].from).forEach(k => {
        const d = SF.ENEMIES[k];
        const seen = !!L.seen[k];
        const b = document.createElement("button");
        b.className = "lex-item" + (k === lex.enemyKey ? " active" : "") + (seen ? "" : " unseen");
        b.appendChild(SF.render.enemyIcon(k, 40));
        const when = d.boss ? "alle 10 Wellen" : d.rare ? "SELTEN · ab Welle " + d.from : (d.from < 999 ? "ab Welle " + d.from : "aus Teilern");
        b.insertAdjacentHTML("beforeend", `<span><b>${d.name}</b><small>${seen ? when : "noch nicht begegnet"}</small></span>`);
        b.onclick = () => { lex.enemyKey = k; SF.audio.play("click"); render(); };
        list.appendChild(b);
      });
    }
  }

  function scrollActive() {
    const a = document.querySelector("#lexList .lex-item.active");
    if (a) a.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function renderTower() {
    const key = lex.towerKey, def = SF.TOWERS[key], txt = TOWER_TEXT[key];
    const L = SF.save.lifetime;
    const tags = [];
    tags.push(def.support ? `<span class="tag">Unterstützung</span>` : (def.air ? `<span class="tag good">✔ trifft Flieger</span>` : `<span class="tag bad">✖ nur Boden</span>`));
    if (def.energy) tags.push(`<span class="tag">⚡ Energie – x2 gegen Schilde</span>`);
    if (def.pierce) tags.push(`<span class="tag">ignoriert Rüstung</span>`);
    tags.push(`<span class="tag">${KIND_NAMES[def.kind]}</span>`);

    const rows = towerRows(key);
    const table = `<table class="lex-table"><thead><tr><th></th><th>Stufe 1</th><th>Stufe 2</th><th>Stufe 3</th></tr></thead><tbody>${
      rows.map(([label, vals]) => `<tr><td>${label}</td>${vals.map(v => `<td>${v ?? "–"}</td>`).join("")}</tr>`).join("")
    }</tbody></table>`;

    const specs = def.specs.map(s => {
      const changes = specChanges(key, s);
      const count = L.specs[key + ":" + s.key] || 0;
      return `<div class="lex-spec">
        <div class="lex-spec-head"><span data-icon="${s.key}"></span><div><b>${s.name}</b><small>◆ ${s.cost} · ${count ? count + "× gewählt" : "noch nie gewählt"}</small></div></div>
        <p>${s.desc}</p>${changes.length ? `<ul>${changes.map(c => `<li>${c}</li>`).join("")}</ul>` : ""}
      </div>`;
    }).join("");

    $("lexDetail").innerHTML = `
      <div class="lex-head">
        <div class="lex-portrait" id="lexPortrait"></div>
        <div>
          <div class="lex-kicker">${txt.role} · Hotkey ${def.hotkey}</div>
          <h3>${def.name}</h3>
          <div class="lex-tags">${tags.join("")}</div>
        </div>
        <div class="lex-count"><b>${fmt(L.built[key] || 0)}</b><small>gebaut</small></div>
      </div>
      <p class="lex-lore">${txt.lore}</p>
      <h4>Werte</h4>${table}
      <h4>Spezialisierungen (ab Stufe 3, endgültig)</h4>
      <div class="lex-specs">${specs}</div>
      <h4>Taktik</h4>
      <ul class="lex-tips">${txt.tips.map(t => `<li>${t}</li>`).join("")}</ul>`;

    $("lexPortrait").appendChild(SF.render.towerIcon(key, 96, 3));
    def.specs.forEach(s => {
      const el = $("lexDetail").querySelector(`[data-icon="${s.key}"]`);
      if (el) el.appendChild(SF.render.towerIcon(key, 44, 4, s.key));
    });
  }

  function renderEnemy() {
    const key = lex.enemyKey, d = SF.ENEMIES[key], txt = ENEMY_TEXT[key];
    const L = SF.save.lifetime;
    const tags = [];
    if (d.flying) tags.push(`<span class="tag">Flieger</span>`);
    if (d.armor >= 0.3) tags.push(`<span class="tag">Gepanzert</span>`);
    if (d.shield) tags.push(`<span class="tag">Schild</span>`);
    if (d.stealth) tags.push(`<span class="tag">Unsichtbar</span>`);
    if (d.heal) tags.push(`<span class="tag good">Heiler</span>`);
    if (d.boss) tags.push(`<span class="tag bad">Boss</span>`);
    if (d.rare) tags.push(`<span class="tag bad">Selten · Mini-Boss</span>`, `<span class="tag">Reißt Abkürzungen</span>`);
    const when = d.boss ? "Welle 10, 20, 30 …" : d.rare ? "selten ab Welle " + d.from : (d.from < 999 ? "ab Welle " + d.from : "entsteht aus Teilern");
    const stats = [
      ["Leben (Welle 1)", fmt(d.hp)],
      ["Leben in Welle 20", "≈ " + fmt(d.hp * SF.waveHpMult(20))],
      ["Tempo", speedLabel(d.speed)],
      ["Rüstung", Math.round(d.armor * 100) + " %"],
      ["Schild", d.shield ? fmt(d.shield) : "–"],
      ["Gold pro Kill", d.gold],
      ["Lebensverlust", d.lives],
      ["Erscheint", when]
    ];
    $("lexDetail").innerHTML = `
      <div class="lex-head">
        <div class="lex-portrait enemy" id="lexPortrait"></div>
        <div>
          <div class="lex-kicker">${L.seen[key] ? "Gegner" : "Noch nicht begegnet"}</div>
          <h3>${d.name}</h3>
          <div class="lex-tags">${tags.join("") || `<span class="tag">Standard</span>`}</div>
        </div>
        <div class="lex-count"><b>${fmt(L.kills[key] || 0)}</b><small>besiegt</small></div>
      </div>
      <p class="lex-lore">${txt.lore}</p>
      <h4>Werte</h4>
      <div class="lex-stats">${stats.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join("")}</div>
      <h4>Fähigkeit</h4><p>${txt.ability}</p>
      <h4>So besiegst du ihn</h4><p class="lex-counter">${txt.counter}</p>`;
    $("lexPortrait").appendChild(SF.render.enemyIcon(key, 96));
  }

  function renderStats() {
    const L = SF.save.lifetime;
    const totalKills = Object.values(L.kills).reduce((a, b) => a + b, 0);
    const totalBuilt = Object.values(L.built).reduce((a, b) => a + b, 0);
    $("lexSummary").innerHTML = `<span>Runden <b>${fmt(L.runs)}</b></span><span>Beste Welle <b>${L.bestWave}</b></span><span>Gegner besiegt <b>${fmt(totalKills)}</b></span><span>Türme gebaut <b>${fmt(totalBuilt)}</b></span>`;
  }

  function renderAchievements() {
    const done = SF.achievements.count(), all = SF.ACHIEVEMENTS.length;
    const cards = SF.ACHIEVEMENTS.map(a => {
      const at = SF.save.achievements[a.id];
      let bar = "";
      if (!at && a.progress) {
        const [cur, max] = a.progress(null);
        bar = `<div class="ach-bar"><i style="width:${Math.min(100, cur / max * 100)}%"></i></div><small>${fmt(Math.min(cur, max))} / ${fmt(max)}</small>`;
      }
      return `<div class="ach-card${at ? " done" : ""}"><div class="ai">${at ? "🏆" : "🔒"}</div><div>
        <b>${a.name}</b>${a.hard ? `<span class="hardtag">schwer</span>` : ""}<small>${a.desc}${a.run && !/Run/.test(a.desc) ? " (in einem Run)" : ""}</small>
        ${at ? `<small style="color:#fde68a">freigeschaltet am ${new Date(at).toLocaleDateString("de-DE")}</small>` : bar}
      </div></div>`;
    }).join("");
    $("lexDetail").innerHTML = `
      <div class="lex-head"><div><div class="lex-kicker">Erfolge</div><h3>${done} von ${all} freigeschaltet</h3>
      <div class="ach-bar" style="max-width:340px"><i style="width:${done / all * 100}%"></i></div></div></div>
      <p class="lex-lore">Erfolge zählen nur in normalen Runs – sobald im Admin-Menü Befehle benutzt werden, wird der Run zum Test-Run.</p>
      <div class="ach-grid">${cards}</div>`;
  }

  function render() {
    document.querySelectorAll("#lexTabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === lex.tab));
    document.querySelector("#lexicon .lex-body").classList.toggle("single", lex.tab === "achievements");
    renderList();
    if (lex.tab === "towers") renderTower(); else if (lex.tab === "enemies") renderEnemy(); else renderAchievements();
    renderStats();
    $("lexDetail").scrollTop = 0;
    scrollActive();
  }

  lex.render = render;

  lex.open = function (tab, key) {
    if (tab) lex.tab = tab;
    if (key && tab === "towers") lex.towerKey = key;
    if (key && tab === "enemies") lex.enemyKey = key;
    SF.ui.open("lexicon");
  };

  lex.init = function () {
    document.querySelectorAll("#lexTabs button").forEach(b => b.onclick = () => { lex.tab = b.dataset.tab; SF.audio.play("click"); render(); });
  };

  // Gegner-Kurzinfo für die Anleitung wiederverwenden
  SF.ENEMY_TEXT = ENEMY_TEXT;
  SF.TOWER_TEXT = TOWER_TEXT;
})();
