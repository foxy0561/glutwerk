/* Shardfall – Oberfläche, Menüs und Eingabe */
(function () {
  "use strict";
  const C = SF.CONFIG;
  const $ = id => document.getElementById(id);
  const fmt = n => Math.round(n).toLocaleString("de-DE");

  const ui = SF.ui = {
    buildKey: null, hoverCell: null, selectedTower: null,
    mapKey: SF.MAPS[0].key, diffKey: "normal",
    lbFilter: "all", fbKind: "bug", runSubmitted: false
  };

  // ---------------------------------------------------------------- Toasts / Banner
  ui.toast = function (text, kind) {
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = text;
    $("toasts").appendChild(el);
    while ($("toasts").children.length > 4) $("toasts").firstChild.remove();
    setTimeout(() => el.remove(), 2600);
  };

  let bannerTimer = 0;
  ui.banner = function (html, boss) {
    const b = $("banner");
    b.innerHTML = html;
    b.className = "banner show" + (boss ? " boss" : "");
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { b.className = "banner" + (boss ? " boss" : ""); }, 1700);
  };

  // ---------------------------------------------------------------- Overlays
  const openStack = [];
  const inGame = () => { const G = SF.getGame(); return G && !G.over && $("menu").hidden; };

  ui.open = function (id) {
    if (id === "lexicon" || id === "feedback") {
      const G = SF.getGame();
      if (G && !G.over && !G.paused && $("menu").hidden) ui.togglePause(true); // im Spiel erst pausieren
    }
    $(id).hidden = false;
    if (!openStack.includes(id)) openStack.push(id);
    if (id === "settings") syncSettings();
    if (id === "lexicon") SF.lexicon.render();
    if (id === "shop") SF.shop.render();
    if (id === "gallery") SF.cardsUi.render();
    if (id === "feedback") { $("fbCtxWrap").hidden = !inGame(); $("fbStatus").textContent = ""; setTimeout(() => $("fbText").focus(), 30); }
  };
  ui.close = function (id) {
    $(id).hidden = true;
    if (id === "shop") SF.shop.clearPreview(); // Anprobiertes wieder zurücksetzen
    const i = openStack.indexOf(id);
    if (i >= 0) openStack.splice(i, 1);
  };
  ui.topModal = () => openStack[openStack.length - 1] || null;

  // ---------------------------------------------------------------- Bauleiste
  function buildBuildList() {
    const list = $("buildList");
    list.innerHTML = "";
    SF.TOWER_ORDER.forEach(key => {
      const def = SF.TOWERS[key];
      const b = document.createElement("button");
      b.className = "build-btn";
      b.dataset.key = key;
      b.appendChild(SF.render.towerIcon(key, 34));
      const txt = document.createElement("div");
      txt.innerHTML = `<div class="bn">${def.name}</div><div class="bc">◆ ${def.levels[0].cost}</div>`;
      b.appendChild(txt);
      const hk = document.createElement("span"); hk.className = "hk"; hk.textContent = def.hotkey; b.appendChild(hk);
      b.addEventListener("click", () => { SF.audio.unlock(); ui.selectBuild(ui.buildKey === key ? null : key); });
      b.addEventListener("mouseenter", e => showTip(b, key));
      b.addEventListener("mouseleave", hideTip);
      b.addEventListener("contextmenu", e => { e.preventDefault(); hideTip(); SF.lexicon.open("towers", key); });
      list.appendChild(b);
    });
  }

  let tipEl = null;
  function showTip(anchor, key) {
    const def = SF.TOWERS[key];
    hideTip();
    tipEl = document.createElement("div");
    tipEl.className = "tip";
    tipEl.innerHTML = `<b>${def.name}</b> <span style="color:var(--gold)">◆ ${def.levels[0].cost}</span>
      <div class="muted">${def.desc}</div>
      <div class="muted small" style="margin-top:6px">Rechtsklick: im Lexikon öffnen</div><div class="muted small" style="margin-top:2px">${def.support ? "Unterstützung" : (def.air ? "✔ trifft Flieger" : "✖ nur Bodenziele")}${def.energy ? " · ⚡ stark gegen Schilde" : ""}${def.pierce ? " · ignoriert Rüstung" : ""}</div>`;
    document.body.appendChild(tipEl);
    const r = anchor.getBoundingClientRect();
    const tw = tipEl.offsetWidth;
    tipEl.style.left = Math.max(8, r.left - tw - 10) + "px";
    tipEl.style.top = r.top + "px";
  }
  function hideTip() { if (tipEl) { tipEl.remove(); tipEl = null; } }

  ui.selectBuild = function (key) {
    ui.buildKey = key;
    if (key) ui.selectTower(null);
    document.querySelectorAll(".build-btn").forEach(b => b.classList.toggle("active", b.dataset.key === key));
  };

  // ---------------------------------------------------------------- Auswahl-Panel
  let selSig = "";

  function statRows(key, level, spec, tw) {
    const def = SF.TOWERS[key];
    const s = SF.getTowerStats(key, Math.min(level, 3), spec);
    const rows = [];
    const mult = tw ? 1 + tw.buffDmg : 1;
    if (def.kind === "aura") {
      rows.push(["Schadensbonus", "+" + Math.round(s.buff * 100) + " %", s.buff]);
      rows.push(["Reichweite", Math.round(s.range), s.range]);
      if (s.rateBuff) rows.push(["Feuerrate-Bonus", "+" + Math.round(s.rateBuff * 100) + " %", s.rateBuff]);
      if (s.income) rows.push(["Gold/Welle", "+" + s.income, s.income]);
      return rows;
    }
    if (def.kind === "beam") {
      rows.push(["Schaden/s", Math.round(s.dps * mult), s.dps]);
      rows.push(["Aufladung", "bis x" + s.ramp, s.ramp]);
    } else {
      rows.push(["Schaden", Math.round(s.dmg * mult), s.dmg]);
      rows.push(["Schüsse/s", s.rate.toFixed(2), s.rate]);
    }
    rows.push(["Reichweite", Math.round(s.range), s.range]);
    if (s.splash) rows.push(["Fläche", Math.round(s.splash), s.splash]);
    if (s.slow) rows.push(["Verlangsamung", Math.round((1 - s.slow) * 100) + " %", 1 - s.slow]);
    if (s.chain) rows.push(["Sprünge", s.chain, s.chain]);
    if (s.multishot) rows.push(["Ziele", s.multishot, s.multishot]);
    if (s.beams) rows.push(["Strahlen", s.beams, s.beams]);
    if (s.crit) rows.push(["Krit-Chance", Math.round(s.crit * 100) + " %", s.crit]);
    return rows;
  }

  ui.selectTower = function (tw) {
    ui.selectedTower = tw;
    if (tw) ui.selectBuild(null);
    selSig = "";
    ui.refreshSelection(true);
  };

  ui.refreshSelection = function (force) {
    const G = SF.getGame();
    const tw = ui.selectedTower;
    const panel = $("selPanel");
    if (!tw || !G || !G.towers.includes(tw)) {
      if (ui.selectedTower) ui.selectedTower = null;
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    const sig = tw.id + ":" + tw.level + ":" + tw.spec + ":" + tw.buffDmg;
    if (force || sig !== selSig) {
      selSig = sig;
      const def = tw.def;
      $("selIcon").innerHTML = ""; $("selIcon").appendChild(SF.render.towerIcon(tw.key, 44));
      const spec = tw.spec ? def.specs.find(s => s.key === tw.spec) : null;
      $("selName").textContent = spec ? spec.name : def.name;
      $("selLevel").textContent = (tw.level >= 4 ? "Spezialisiert" : "Stufe " + tw.level + " / 3") + (tw.buffDmg ? " · ✦ verstärkt" : "");

      const cur = statRows(tw.key, tw.level, tw.spec, tw);
      const next = tw.level < 3 ? statRows(tw.key, tw.level + 1, null, tw) : null;
      let html = cur.map((r, i) => {
        let up = "";
        if (next && next[i] && next[i][0] === r[0] && next[i][2] > r[2]) up = `<span class="up">→ ${next[i][1]}</span>`;
        return `<div>${r[0]} <b>${r[1]}${up}</b></div>`;
      }).join("");
      if (!def.support) html += `<div>Kills <b id="selKills">0</b></div><div>Schaden <b id="selDmg">0</b></div>`;
      $("selStats").innerHTML = html;

      const up = $("selUpgrade");
      up.innerHTML = "";
      if (tw.level < 3) {
        const cost = SF.upgradeCost(tw);
        const b = document.createElement("button");
        b.className = "btn upgrade"; b.id = "btnUpgrade";
        b.innerHTML = `Verbessern auf Stufe ${tw.level + 1} <kbd>U</kbd> <span>◆ ${cost}</span>`;
        b.dataset.cost = cost;
        b.onclick = () => doUpgrade();
        up.appendChild(b);
      } else if (!tw.spec) {
        const wrap = document.createElement("div");
        wrap.className = "spec-choice";
        wrap.innerHTML = `<div class="muted small">Spezialisierung wählen (endgültig):</div>`;
        def.specs.forEach(s => {
          const b = document.createElement("button");
          b.className = "spec-btn"; b.dataset.cost = s.cost;
          b.innerHTML = `<b>${s.name}<span>◆ ${s.cost}</span></b><small>${s.desc}</small>`;
          b.onclick = () => doUpgrade(s.key);
          wrap.appendChild(b);
        });
        up.appendChild(wrap);
      } else {
        up.innerHTML = `<div class="maxed">✦ ${spec.name}: ${spec.desc}</div>`;
      }
      $("selTarget").hidden = !!def.support;
    }
    // Werte, die sich ständig ändern
    if ($("selKills")) { $("selKills").textContent = fmt(tw.kills); $("selDmg").textContent = fmt(tw.dmgDone); }
    $("selTarget").textContent = "Ziel: " + SF.TARGETING_NAMES[tw.targeting];
    $("selSell").textContent = "Verkaufen ◆ " + SF.sellValue(tw);
    document.querySelectorAll("#selUpgrade [data-cost]").forEach(b => { b.disabled = G.gold < Number(b.dataset.cost); });
  };

  function doUpgrade(specKey) {
    const tw = ui.selectedTower;
    if (!tw) return;
    if (tw.level >= 3 && !tw.spec && !specKey) { ui.toast("Wähle eine Spezialisierung.", ""); return; }
    const res = SF.upgradeTower(tw, specKey);
    if (!res.ok) { if (res.reason) ui.toast(res.reason, "bad"); SF.audio.play("error"); }
    ui.refreshSelection(true);
  }

  function doSell() {
    const tw = ui.selectedTower;
    if (!tw) return;
    SF.sellTower(tw);
    ui.selectTower(null);
  }

  // ---------------------------------------------------------------- Wellen-Panel
  let previewWave = -1;
  function refreshWavePanel() {
    const G = SF.getGame();
    if (!G) return;
    const next = G.wave + 1;
    if (previewWave !== next) {
      previewWave = next;
      $("nextWaveNo").textContent = next;
      const prev = SF.wavePreview(next);
      const box = $("wavePreview");
      box.innerHTML = "";
      if (prev.event) {
        const ev = SF.WAVE_EVENTS[prev.event];
        box.insertAdjacentHTML("beforeend", `<div class="wp-event"><b>${ev.icon} ${ev.name}</b> – ${ev.desc}</div>`);
      }
      prev.forEach(p => {
        const d = SF.ENEMIES[p.type];
        const chip = document.createElement("div");
        chip.className = "wp-chip" + (d.boss ? " boss" : "") + (d.rare ? " rare" : "") + (d.from === next && !d.rare ? " new" : "");
        chip.title = d.name + (d.from === next ? " – NEU!" : "") + " (Klick: im Lexikon ansehen)";
        chip.innerHTML = d.rare ? `<i style="background:${d.color}"></i>SELTEN: ${d.name}` : `<i style="background:${d.color}"></i>${p.count}× ${d.name}`;
        chip.onclick = () => SF.lexicon.open("enemies", p.type);
        box.appendChild(chip);
      });
    }
    const btn = $("btnWave");
    const can = SF.canCallWave();
    btn.disabled = !can;
    const busy = G.enemies.length || G.spawnQueue.length;
    const label = G.wave === 0 ? "Erste Welle starten" : (busy ? `Früh rufen (+${15 + 2 * next} Bonus)` : `Welle ${next} starten`);
    if (btn.dataset.label !== label) { btn.dataset.label = label; btn.innerHTML = label + " <kbd>Leertaste</kbd>"; }
  }

  // ---------------------------------------------------------------- HUD
  let last = {};
  ui.refreshHud = function () {
    const G = SF.getGame();
    if (!G) return;
    const vals = {
      hudGold: fmt(G.gold), hudLives: G.lives,
      hudWave: G.wave + (G.endless ? "" : " / " + SF.WIN_WAVE),
      hudScore: fmt(G.score)
    };
    for (const k in vals) if (last[k] !== vals[k]) { $(k).textContent = vals[k]; last[k] = vals[k]; }
    $("btnSpeed").textContent = G.speed + "×";
    $("btnPause").textContent = G.paused && !G.won ? "▶" : "❚❚";
    document.querySelectorAll(".build-btn").forEach(b => b.classList.toggle("poor", G.gold < SF.TOWERS[b.dataset.key].levels[0].cost));
    $("hudTest").hidden = !G.cheated;
    refreshWavePanel();
    ui.refreshSelection(false);
    if (++achTick % 5 === 0 && inGame()) SF.achievements.check(G);
  };
  let achTick = 0;

  ui.refreshAchCount = function () {
    $("achCount").textContent = "🏆 " + SF.achievements.count() + " / " + SF.ACHIEVEMENTS.length;
  };

  // ---------------------------------------------------------------- Spielablauf
  ui.startGame = function () {
    const name = $("menuName").value.trim().slice(0, 16);
    SF.save.playerName = name;
    SF.persist();
    SF.audio.unlock();
    SF.newGame(ui.mapKey, ui.diffKey);
    SF.render.invalidateBackground();
    ui.selectBuild(null); ui.selectTower(null);
    previewWave = -1; last = {};
    ui.runSubmitted = false;
    ["menu", "end", "pause"].forEach(ui.close);
    $("menu").hidden = true;
    setTimeout(SF.render.resize, 0);
    ui.banner(SF.getGame().map.name + "<small>Baue Türme und starte die erste Welle</small>");
    if (!name) ui.toast("Ohne Namen wird dein Score nur lokal gespeichert.", "");
  };

  ui.toMenu = function () {
    SF.persist();
    ["end", "pause"].forEach(ui.close);
    $("menu").hidden = false;
    ui.loadLeaderboard();
    renderMapList();
    ui.refreshAchCount();
  };

  function finishRun(won, abandoned) {
    const G = SF.getGame();
    if (!G || ui.runSubmitted) return null;
    ui.runSubmitted = true;
    const score = SF.finalScore();
    const name = SF.save.playerName;
    const run = {
      player_name: name || "Anonym", score, wave: G.wave, map: G.map.key, difficulty: G.diff.key,
      kills: G.kills, duration: Math.round(G.time), version: C.GAME_VERSION, won: !!won
    };
    if (G.cheated) {
      $("endOnline").textContent = "TEST-RUN (Admin-Befehle benutzt) – Score wird nicht gespeichert.";
      return score;
    }
    SF.achievements.check(G);
    SF.crystals.settleRun(G);
    ui.lastXp = SF.xp.settleRun(G);
    SF.recordLocalScore({ name: run.player_name, score, wave: G.wave, map: G.map.key, diff: G.diff.key, date: Date.now() });
    if (name && score > 0) {
      $("endOnline").textContent = "Score wird online gespeichert…";
      SF.online.submitScore(run).then(r => {
        if (r.ok) $("endOnline").textContent = r.data && r.data.result === "kept" ? "Online: dein bisheriger Bestwert bleibt höher." : "Online-Bestenliste aktualisiert ✔";
        else $("endOnline").textContent = "Online-Bestenliste nicht erreichbar – lokal gespeichert.";
      });
    } else {
      $("endOnline").textContent = name ? "" : "Ohne Spielernamen nur lokal gespeichert.";
    }
    return score;
  }

  function showEnd(won) {
    const G = SF.getGame();
    const score = finishRun(won);
    $("endTitle").textContent = won ? "Sieg!" : "Kern zerstört";
    $("endTitle").className = won ? "win" : "lose";
    $("endText").textContent = won
      ? `Du hast alle ${SF.WIN_WAVE} Wellen auf ${G.map.name} gehalten.`
      : `${G.map.name} · ${G.diff.name} – Welle ${G.wave}`;
    $("endStats").innerHTML = [
      ["Punkte", fmt(score !== null ? score : SF.finalScore())], ["Welle", G.wave],
      ["Kills", fmt(G.kills)], ["Spielzeit", Math.floor(G.time / 60) + ":" + String(Math.floor(G.time % 60)).padStart(2, "0")]
    ].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join("");
    $("btnEndless").hidden = !won;
    const xr = ui.lastXp; ui.lastXp = null;
    $("endXp").hidden = !xr;
    if (xr) {
      $("endXp").innerHTML = `<div>⭐ +${fmt(xr.gain)} XP</div><div class="end-xp-bar"><span>Stufe <b data-xp-level></b></span><div class="pc-xp-bar"><i data-xp-bar></i></div><small data-xp-text></small></div>` +
        (xr.levels ? `<div class="end-levelup">🎉 Stufe aufgestiegen! +${xr.packs} Kartenpack${xr.packs > 1 ? "s" : ""} <button class="btn small primary" id="endOpenPack">Jetzt öffnen</button></div>` : "");
      SF.cardsUi.refreshBadge();
      const b = $("endOpenPack"); if (b) b.onclick = () => SF.cardsUi.startPack();
    }
    const cr = G.crystalsRun || 0;
    $("endCrystals").hidden = !cr;
    $("endCrystals").innerHTML = `✦ +${cr} Riftkristalle in dieser Runde <small>(jetzt ${SF.save.crystals})</small>`;
    ui.open("end");
  }

  ui.togglePause = function (force) {
    const G = SF.getGame();
    if (!G || G.over || G.won && !G.endless) return;
    G.paused = force !== undefined ? force : !G.paused;
    if (G.paused) ui.open("pause"); else ui.close("pause");
  };

  function cycleSpeed() {
    const G = SF.getGame();
    if (!G) return;
    G.speed = G.speed >= 3 ? 1 : G.speed + 1;
  }

  function callWave() {
    const G = SF.getGame();
    if (!G) return;
    SF.audio.unlock();
    if (!SF.callNextWave()) SF.audio.play("error");
  }

  // ---------------------------------------------------------------- Engine-Ereignisse
  SF.on("wave", d => {
    const ev = d.event ? SF.WAVE_EVENTS[d.event] : null;
    if (d.boss) ui.banner("RIFTKOLOSS<small>Welle " + d.wave + "</small>", true);
    else if (ev) ui.banner("Welle " + d.wave + `<small>${ev.icon} ${ev.name} – ${ev.desc}</small>`);
    else ui.banner("Welle " + d.wave + (d.bonus ? `<small>+${d.income} Gold · +${d.bonus} Frühbonus</small>` : `<small>+${d.income} Gold</small>`));
    const nd = d.wave > 1 && Object.values(SF.ENEMIES).find(e => e.from === d.wave);
    if (nd) ui.toast("Neuer Gegner: " + nd.name, "");
  });
  SF.on("leak", () => { const el = $("hudLives").parentElement; el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); });
  SF.on("wavedone", d => { if (d.perfect) SF.audio.play("click"); });
  SF.on("gameover", () => setTimeout(() => showEnd(false), 600));
  SF.on("victory", () => setTimeout(() => showEnd(true), 400));
  SF.on("endless", () => { ui.close("end"); ui.runSubmitted = false; ui.banner("Endlosmodus<small>Wie weit kommst du?</small>"); });
  SF.on("bosskill", d => ui.toast("Riftkoloss besiegt! +" + d.gold + " Gold", "good"));
  SF.on("rare", () => ui.toast("✦ Ein seltener Rissläufer ist erschienen! Halte ihn auf, bevor er reißt.", "rift"));
  SF.on("rift", d => {
    ui.banner("RISS!<small>Eine Abkürzung wurde aufgerissen" + (d.destroyed ? " – " + d.destroyed + (d.destroyed === 1 ? " Turm" : " Türme") + " zerstört!" : "") + "</small>", false);
    $("banner").classList.add("rift");
    ui.toast("⚠ Der Riss spart den Gegnern ~" + d.saved + " Felder Weg und schließt sich in " + d.wavesLeft + " Wellen.", "rift");
    if (ui.selectedTower && !SF.getGame().towers.includes(ui.selectedTower)) ui.selectTower(null);
  });
  SF.on("riftclosed", () => ui.toast("Der Riss hat sich geschlossen.", "good"));
  SF.on("riftfail", () => ui.toast("Der Rissläufer fand keinen Weg zum Aufreißen.", ""));
  SF.on("rarekill", d => ui.toast("Rissläufer besiegt! +" + d.gold + " Gold", "good"));
  SF.on("levelup", d => { ui.toast("⭐ Stufe " + d.to + " erreicht! +" + d.packs + " Kartenpack" + (d.packs > 1 ? "s" : ""), "ach"); SF.audio.play("win"); });
  SF.on("raredrop", () => ui.toast("✦ Seltener Fund: ein Riftkristall!", "rift"));
  SF.on("achievement", a => { ui.toast("🏆 Erfolg freigeschaltet: " + a.name + "  ✦ +" + (a.hard ? 3 : 1), "ach"); SF.audio.play("upgrade"); });

  // ---------------------------------------------------------------- Eingabe Spielfeld
  function cellFromEvent(ev) {
    const p = SF.render.toWorld(ev.clientX, ev.clientY);
    return { c: Math.floor(p.x / C.TILE), r: Math.floor(p.y / C.TILE), x: p.x, y: p.y };
  }

  function bindCanvas(canvas) {
    canvas.addEventListener("mousemove", ev => { ui.hoverCell = cellFromEvent(ev); });
    canvas.addEventListener("mouseleave", () => { ui.hoverCell = null; });
    canvas.addEventListener("contextmenu", ev => { ev.preventDefault(); ui.selectBuild(null); ui.selectTower(null); });
    canvas.addEventListener("click", ev => {
      const G = SF.getGame();
      if (!G || G.over) return;
      SF.audio.unlock();
      const cell = cellFromEvent(ev);
      ui.hoverCell = cell;
      if (ui.buildKey) {
        const res = SF.buildTower(ui.buildKey, cell.c, cell.r);
        if (!res.ok) {
          const existing = SF.towerAt(cell.c, cell.r);
          if (existing) { ui.selectTower(existing); return; }
          ui.toast(res.reason, "bad"); SF.audio.play("error"); return;
        }
        // Shift gedrückt: Baumodus bleibt aktiv, nächster Turm gleicher Art kann sofort platziert werden
        if (ev.shiftKey && G.gold >= SF.TOWERS[ui.buildKey].levels[0].cost) return;
        if (ev.shiftKey) ui.toast("Nicht genug Gold für den nächsten.", "");
        ui.selectTower(res.tower);
        return;
      }
      ui.selectTower(SF.towerAt(cell.c, cell.r));
    });
  }

  // ---------------------------------------------------------------- Tastatur
  function bindKeys() {
    window.addEventListener("keydown", ev => {
      // Admin-Menü: Strg + Shift + L (überall)
      if (ev.ctrlKey && ev.shiftKey && ev.key.toLowerCase() === "l") { ev.preventDefault(); SF.adminUi.toggle(); return; }
      const tag = (ev.target.tagName || "").toLowerCase();
      if (ev.key === "Escape" && (tag === "input" || tag === "textarea")) {
        const top = ui.topModal();
        if (top && top !== "end" && top !== "pause") { ui.close(top); ev.target.blur(); return; }
      }
      if (tag === "input" || tag === "textarea") {
        if (ev.key === "Enter" && ev.target.id === "menuName") ui.startGame();
        return;
      }
      const G = SF.getGame();
      const inMenu = !$("menu").hidden;
      const top = ui.topModal();

      if (ev.key === "Escape") {
        if (top && top !== "end") { ui.close(top); if (top === "pause" && G) G.paused = false; return; }
        if (inMenu || !G) return;
        if (ui.buildKey) { ui.selectBuild(null); return; }
        if (ui.selectedTower) { ui.selectTower(null); return; }
        ui.togglePause(true);
        return;
      }
      if (inMenu || top || !G) return;

      const k = ev.key.toLowerCase();
      const tower = SF.TOWER_ORDER.find(key => SF.TOWERS[key].hotkey === ev.key);
      if (tower) { ui.selectBuild(ui.buildKey === tower ? null : tower); return; }
      if (ev.code === "Space") { ev.preventDefault(); callWave(); return; }
      if (k === "p") { ui.togglePause(); return; }
      if (k === "f") { cycleSpeed(); return; }
      if (ui.selectedTower) {
        if (k === "u") { if (ui.selectedTower.level < 3) doUpgrade(); return; }
        if (k === "s") { doSell(); return; }
        if (ev.key === "Tab") { ev.preventDefault(); SF.cycleTargeting(ui.selectedTower); return; }
      }
    });
  }

  // ---------------------------------------------------------------- Hauptmenü
  function miniMap(map) {
    const c = document.createElement("canvas");
    c.width = 200; c.height = 120;
    const x = c.getContext("2d");
    const s = 10;
    for (let r = 0; r < C.ROWS; r++) for (let col = 0; col < C.COLS; col++) {
      x.fillStyle = (r + col) % 2 ? map.theme.ground : map.theme.ground2;
      x.fillRect(col * s, r * s, s, s);
    }
    x.lineCap = "round"; x.lineJoin = "round";
    map.paths.forEach(p => {
      x.strokeStyle = map.theme.path; x.lineWidth = 8;
      x.beginPath(); p.forEach(([cc, rr], i) => { const px = (cc + .5) * s, py = (rr + .5) * s; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke();
    });
    const end = map.paths[0][map.paths[0].length - 1];
    x.fillStyle = map.theme.accent; x.beginPath(); x.arc(Math.min(19, end[0]) * s + 5, end[1] * s + 5, 5, 0, 7); x.fill();
    return c;
  }

  function renderMapList() {
    const box = $("mapList");
    box.innerHTML = "";
    SF.MAPS.forEach(m => {
      const b = document.createElement("button");
      b.className = "map-card" + (m.key === ui.mapKey ? " active" : "");
      b.appendChild(miniMap(m));
      const best = SF.save.best[m.key + ":" + ui.diffKey];
      const info = document.createElement("div");
      info.className = "mi";
      info.innerHTML = `<b>${m.name}</b><small>${m.difficulty} · ${m.desc}</small>${best ? `<span class="best">Bestwert: ${fmt(best.score)} (Welle ${best.wave})</span>` : ""}`;
      b.appendChild(info);
      b.onclick = () => { ui.mapKey = m.key; SF.audio.unlock(); SF.audio.play("click"); renderMapList(); };
      box.appendChild(b);
    });
  }

  function renderDiffList() {
    const box = $("diffList");
    box.innerHTML = "";
    Object.values(SF.DIFFICULTIES).forEach(d => {
      const b = document.createElement("button");
      b.className = "diff-btn" + (d.key === ui.diffKey ? " active" : "");
      b.innerHTML = `<b>${d.name}</b><small>${d.lives} Leben · Punkte x${d.scoreMult}</small>`;
      b.onclick = () => { ui.diffKey = d.key; SF.audio.unlock(); SF.audio.play("click"); renderDiffList(); renderMapList(); };
      box.appendChild(b);
    });
  }

  function renderLbTabs() {
    const box = $("lbTabs");
    box.innerHTML = "";
    [{ key: "all", name: "Alle" }].concat(SF.MAPS).forEach(m => {
      const b = document.createElement("button");
      b.textContent = m.name;
      b.className = m.key === ui.lbFilter ? "active" : "";
      b.onclick = () => { ui.lbFilter = m.key; renderLbTabs(); ui.loadLeaderboard(); };
      box.appendChild(b);
    });
  }

  ui.loadLeaderboard = async function () {
    const list = $("lbList");
    const filter = ui.lbFilter === "all" ? null : ui.lbFilter;
    list.innerHTML = `<li class="empty">Lade…</li>`;
    let rows = await SF.online.fetchScores(filter);
    const online = !!rows;
    $("lbMode").textContent = online ? "Online" : "Lokal";
    $("lbMode").className = "pill" + (online ? " on" : "");
    if (!online) {
      rows = SF.save.localScores.filter(s => !filter || s.map === filter)
        .map(s => ({ player_name: s.name, score: s.score, wave: s.wave, map: s.map, difficulty: s.diff }));
    } else {
      // pro Spieler nur den besten Eintrag
      const best = new Map();
      rows.forEach(r => { const k = r.player_name + (filter ? "" : ":" + r.map); if (!best.has(k) || best.get(k).score < r.score) best.set(k, r); });
      rows = [...best.values()].sort((a, b) => b.score - a.score);
    }
    list.innerHTML = "";
    if (!rows.length) { list.innerHTML = `<li class="empty">Noch keine Einträge – sei der Erste!</li>`; return; }
    rows.slice(0, 15).forEach((r, i) => {
      const map = SF.MAPS.find(m => m.key === r.map);
      const diff = SF.DIFFICULTIES[r.difficulty];
      const li = document.createElement("li");
      li.innerHTML = `<span class="rk">${i + 1}</span><span class="nm"></span><span class="meta">${map ? map.name : ""} · W${r.wave}${diff ? " · " + diff.name : ""}</span><span class="sc">${fmt(r.score)}</span>`;
      li.querySelector(".nm").textContent = r.player_name; // Namen nie als HTML einfügen
      list.appendChild(li);
    });
  };

  // ---------------------------------------------------------------- Einstellungen / Feedback / Hilfe
  function syncSettings() {
    const s = SF.save.settings;
    $("setVolume").value = s.volume;
    $("setDmg").checked = s.damageNumbers;
    $("setShake").checked = s.screenShake;
    $("setAuto").checked = s.autoWave;
    $("autoWave").checked = s.autoWave;
  }

  function bindSettings() {
    const s = SF.save.settings;
    $("setVolume").addEventListener("input", e => { s.volume = Number(e.target.value); SF.audio.unlock(); SF.audio.setVolume(s.volume); SF.persist(); });
    $("setVolume").addEventListener("change", () => SF.audio.play("click"));
    $("setDmg").addEventListener("change", e => { s.damageNumbers = e.target.checked; SF.persist(); });
    $("setShake").addEventListener("change", e => { s.screenShake = e.target.checked; SF.persist(); });
    const auto = e => { s.autoWave = e.target.checked; SF.persist(); syncSettings(); };
    $("setAuto").addEventListener("change", auto);
    $("autoWave").addEventListener("change", auto);
  }

  function bindFeedback() {
    $("fbKind").querySelectorAll("button").forEach(b => b.onclick = () => {
      ui.fbKind = b.dataset.kind;
      $("fbKind").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
    });
    $("fbSend").onclick = async () => {
      const text = $("fbText").value.trim();
      if (text.length < 5) { $("fbStatus").textContent = "Bitte etwas genauer beschreiben."; return; }
      $("fbSend").disabled = true;
      $("fbStatus").textContent = "Wird gesendet…";
      try {
        let full = text;
        const G = SF.getGame();
        if ($("fbCtx").checked && inGame()) {
          full += `\n\n— Spielinfos: ${G.map.name} (${G.diff.name}), Welle ${G.wave}, Leben ${G.lives}/${G.maxLives}, Türme ${G.towers.length}, Gold ${Math.floor(G.gold)}, ` +
            `v${C.GAME_VERSION}, ${window.shardfallDesktop ? "Desktop" : "Browser"}${G.cheated ? ", TEST-RUN" : ""}`;
        }
        await SF.online.sendFeedback(ui.fbKind, SF.save.playerName || $("menuName").value.trim(), full);
        $("fbStatus").textContent = "Danke! Dein Feedback ist angekommen.";
        $("fbText").value = "";
      } catch (e) {
        $("fbStatus").textContent = "Senden fehlgeschlagen – bist du online?";
      } finally { $("fbSend").disabled = false; }
    };
  }

  function buildEnemyGuide() {
    const txt = {
      grunt: "Standard-Gegner.", runner: "Sehr schnell, wenig Leben.", flyer: "Fliegt direkt zum Kern – nur Luft-Türme treffen.",
      brute: "Schwere Rüstung (-45 % Schaden).", splitter: "Zerfällt in 3 Splitterlinge.", healer: "Heilt Gegner in der Nähe.",
      shield: "Schild – Energie-Türme machen doppelten Schaden daran.", phantom: "Unsichtbar ohne Leuchtfeuer.", boss: "Alle 10 Wellen. Ruft Verstärkung."
    };
    $("enemyGuide").innerHTML = Object.keys(txt).map(k => {
      const d = SF.ENEMIES[k];
      return `<div><i style="background:${d.color}"></i><b>${d.name}</b><span>${txt[k]}${d.from < 999 ? " (ab Welle " + d.from + ")" : ""}</span></div>`;
    }).join("");
  }

  // ---------------------------------------------------------------- Start
  ui.init = function () {
    $("versionLabel").textContent = C.GAME_NAME + " v" + C.GAME_VERSION;
    $("menuName").value = SF.save.playerName || "";
    buildBuildList();
    renderMapList();
    renderDiffList();
    renderLbTabs();
    buildEnemyGuide();
    bindCanvas($("canvas"));
    bindKeys();
    bindSettings();
    bindFeedback();
    syncSettings();
    SF.shop.init();
    SF.cardsUi.init();
    SF.lexicon.init();
    SF.adminUi.init();
    ui.refreshAchCount();
    $("btnReport").onclick = () => ui.open("feedback");

    $("btnPlay").onclick = ui.startGame;
    $("btnWave").onclick = callWave;
    $("btnSpeed").onclick = cycleSpeed;
    $("btnPause").onclick = () => ui.togglePause();
    $("btnMenu").onclick = () => ui.togglePause(true);
    $("btnResume").onclick = () => ui.togglePause(false);
    $("btnAbandon").onclick = () => {
      const G = SF.getGame();
      if (G && !G.over && G.wave > 0) finishRun(false, true);
      if (G) G.over = true;
      ui.toMenu();
    };
    $("btnRetry").onclick = ui.startGame;
    $("btnToMenu").onclick = ui.toMenu;
    $("btnEndless").onclick = () => SF.continueEndless();
    $("selClose").onclick = () => ui.selectTower(null);
    $("selSell").onclick = doSell;
    $("selTarget").onclick = () => { if (ui.selectedTower) SF.cycleTargeting(ui.selectedTower); };

    document.querySelectorAll("[data-open]").forEach(b => b.addEventListener("click", () => { SF.audio.unlock(); ui.open(b.dataset.open); }));
    document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => ui.close(b.closest(".overlay").id)));
    document.querySelectorAll(".modal-wrap").forEach(w => w.addEventListener("mousedown", e => {
      if (e.target === w && w.id !== "end" && w.id !== "pause") ui.close(w.id);
    }));

    if (window.shardfallDesktop && window.shardfallDesktop.isDesktop) {
      $("btnQuit").hidden = false;
      $("btnQuit").onclick = () => window.shardfallDesktop.quit();
    }
    ui.loadLeaderboard();
  };
})();
