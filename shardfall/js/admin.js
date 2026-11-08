/* Shardfall – Admin-Menü (Strg + Shift + L)
 * Anmeldung und Feedback laufen über Riftwards Edge Function "bug-reports-admin".
 * Das Passwort wird nur auf dem Server geprüft und steht NICHT im Spielcode.
 */
(function () {
  "use strict";
  const C = SF.CONFIG;
  const $ = id => document.getElementById(id);

  const A = SF.adminUi = {
    password: "", authed: false, rows: [],
    gameFilter: "shardfall", kindFilter: "all", tab: "feedback",
    history: [], histIdx: 0
  };

  // ---------------------------------------------------------------- Server
  async function callAdmin(action, extra, pw) {
    const res = await fetch(C.SUPABASE_URL + "/functions/v1/" + C.ADMIN_FUNCTION, {
      method: "POST",
      headers: { "apikey": C.SUPABASE_KEY, "Authorization": "Bearer " + C.SUPABASE_KEY, "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(Object.assign({ password: pw || A.password, action }, extra || {}))
    });
    let data = {};
    try { data = await res.json(); } catch (e) { /* leer */ }
    if (!res.ok) { const err = new Error(data.error || data.message || ("HTTP " + res.status)); err.status = res.status; throw err; }
    return data;
  }

  // ---------------------------------------------------------------- Öffnen / Login
  A.toggle = function () {
    if (!$("admin").hidden) { SF.ui.close("admin"); return; }
    SF.ui.open("admin");
    render();
    setTimeout(() => (A.authed ? (A.tab === "console" ? $("admConsoleIn") : null) : $("admPw"))?.focus(), 30);
  };

  async function login() {
    const pw = $("admPw").value;
    if (!pw) { $("admLoginStatus").textContent = "Passwort eingeben."; return; }
    $("admLoginBtn").disabled = true;
    $("admLoginStatus").textContent = "Wird auf dem Server geprüft…";
    try {
      const data = await callAdmin("list", {}, pw);
      A.password = pw; A.authed = true;
      $("admPw").value = "";
      setRows(data);
      render();
    } catch (e) {
      $("admLoginStatus").textContent = e.status === 401 || e.status === 403
        ? "Falsches Passwort."
        : "Server nicht erreichbar (" + e.message + ").";
      $("admPw").select();
    } finally { $("admLoginBtn").disabled = false; }
  }

  function logout() { A.password = ""; A.authed = false; A.rows = []; render(); }

  // ---------------------------------------------------------------- Feedback
  function parseRow(r) {
    let text = String(r.report_text || "");
    let game = "riftward";
    if (text.startsWith(C.FEEDBACK_TAG)) { game = "shardfall"; text = text.slice(C.FEEDBACK_TAG.length); }
    let kind = "bug";
    const m = text.match(/^\s*\[(BUG|VORSCHLAG)\]\s*/);
    if (m) { kind = m[1] === "VORSCHLAG" ? "idea" : "bug"; text = text.slice(m[0].length); }
    return { id: r.id, game, kind, text, name: r.player_name || "Unbekannt", version: r.game_version || "", date: r.created_at };
  }

  function setRows(data) {
    const rows = Array.isArray(data) ? data : (data.reports || []);
    A.rows = rows.map(parseRow).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async function refresh() {
    $("admFbList").innerHTML = `<div class="adm-empty">Lade…</div>`;
    try { setRows(await callAdmin("list")); renderFeedback(); }
    catch (e) {
      if (e.status === 401 || e.status === 403) { logout(); return; }
      $("admFbList").innerHTML = `<div class="adm-empty">Konnte nicht geladen werden: ${e.message}</div>`;
    }
  }

  async function del(id) {
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    try { await callAdmin("delete", { id }); A.rows = A.rows.filter(r => r.id !== id); renderFeedback(); SF.ui.toast("Eintrag gelöscht.", "good"); }
    catch (e) { SF.ui.toast("Löschen fehlgeschlagen: " + e.message, "bad"); }
  }

  function renderFeedback() {
    const list = $("admFbList");
    const rows = A.rows.filter(r => (A.gameFilter === "all" || r.game === A.gameFilter) && (A.kindFilter === "all" || r.kind === A.kindFilter));
    const base = A.rows.filter(r => A.gameFilter === "all" || r.game === A.gameFilter);
    $("admCountBug").textContent = base.filter(r => r.kind === "bug").length;
    $("admCountIdea").textContent = base.filter(r => r.kind === "idea").length;
    list.innerHTML = "";
    if (!rows.length) { list.innerHTML = `<div class="adm-empty">Keine Einträge.</div>`; return; }
    rows.forEach(r => {
      const el = document.createElement("div");
      el.className = "adm-item " + r.kind;
      el.innerHTML = `<div class="adm-item-head">
          <span class="adm-badge ${r.kind}">${r.kind === "idea" ? "💡 Vorschlag" : "🐞 Bug"}</span>
          <span class="adm-badge game">${r.game === "shardfall" ? "Shardfall" : "Riftward"}</span>
          <b class="adm-name"></b><span class="adm-meta"></span>
          <button class="adm-del" title="Löschen">✕</button>
        </div><div class="adm-text"></div>`;
      el.querySelector(".adm-name").textContent = r.name;
      el.querySelector(".adm-meta").textContent = (r.version ? r.version + " · " : "") + (r.date ? new Date(r.date).toLocaleString("de-DE") : "");
      el.querySelector(".adm-text").textContent = r.text; // nie als HTML einfügen
      el.querySelector(".adm-del").onclick = () => del(r.id);
      list.appendChild(el);
    });
  }

  // ---------------------------------------------------------------- Konsole (Minecraft-Stil)
  // Jeder Befehl beschreibt seine Argumente. Daraus entstehen Vorschläge, Tab-Vervollständigung und die Hilfezeile.
  const NUM = list => () => list.map(v => ({ v: String(v) }));
  const SIGNED = (unit) => (tokens, i) => (tokens[i] && /^set$/i.test(tokens[i - 1] || "") ? [] : [
    { v: "+100", d: "+100 " + unit }, { v: "+500", d: "+500 " + unit }, { v: "-100", d: "-100 " + unit }, { v: "set", d: "genauen Wert setzen" }
  ]);
  const enemyOptions = () => Object.values(SF.ENEMIES).map(e => ({ v: e.name.toLowerCase().replace(/\s+/g, ""), d: e.boss ? "Boss" : e.rare ? "selten, reißt Risse" : e.flying ? "fliegt" : (e.from < 999 ? "ab Welle " + e.from : "aus Teilern") }));
  const COMMANDS = {
    help:     { desc: "Hilfe anzeigen.", args: [{ name: "befehl", opt: true, options: () => Object.keys(COMMANDS).map(k => ({ v: k, d: COMMANDS[k].desc })) }] },
    spawn:    { desc: "Gegner erscheinen lassen.", args: [{ name: "gegner", options: enemyOptions }, { name: "anzahl", opt: true, options: NUM([1, 5, 10, 25]) }] },
    gold:     { desc: "Gold ändern.", args: [{ name: "+zahl|-zahl|set", options: SIGNED("Gold") }, { name: "wert", opt: true, options: NUM([0, 500, 1000, 5000]) }] },
    lives:    { desc: "Leben ändern.", args: [{ name: "+zahl|-zahl|set", options: SIGNED("Leben") }, { name: "wert", opt: true, options: NUM([1, 25, 99]) }] },
    score:    { desc: "Punkte ändern.", args: [{ name: "+zahl|-zahl|set", options: SIGNED("Punkte") }, { name: "wert", opt: true, options: NUM([0, 10000, 100000]) }] },
    wave:     { desc: "Nächste Welle festlegen.", args: [{ name: "nummer", options: NUM([5, 10, 15, 20, 30]) }] },
    next:     { desc: "Nächste Welle sofort starten.", args: [] },
    kill:     { desc: "Alle Gegner besiegen.", args: [] },
    freeze:   { desc: "Gegner einfrieren.", args: [{ name: "sekunden|off", options: () => [{ v: "5" }, { v: "10" }, { v: "30" }, { v: "off", d: "wieder auftauen" }] }] },
    rift:     { desc: "Riss öffnen oder schließen.", args: [{ name: "open|close", options: () => [{ v: "open", d: "Riss aufreißen" }, { v: "close", d: "Riss schließen" }] }] },
    event:    { desc: "Admin-Ereignis starten.", args: [{ name: "art", options: () => [{ v: "boss", d: "Riftkoloss" }, { v: "rift", d: "Rissläufer" }, { v: "elite", d: "8 starke Gegner" }] }] },
    god:      { desc: "Unendlich Leben an/aus.", args: [] },
    speed:    { desc: "Spieltempo.", args: [{ name: "1-10", options: NUM([1, 2, 3, 5, 10]) }] },
    crystals: { desc: "Riftkristalle ändern (auch im Menü).", args: [{ name: "+zahl|set", options: (t, i) => (/^set$/i.test(t[i - 1] || "") ? [] : [{ v: "+10" }, { v: "+50" }, { v: "+100" }, { v: "set", d: "genauen Wert setzen" }]) }, { name: "wert", opt: true, options: NUM([0, 100]) }] },
    xp:       { desc: "XP geben (auch im Menü).", args: [{ name: "menge", options: NUM([100, 500, 2000]) }] },
    pack:     { desc: "Kartenpacks geben (auch im Menü).", args: [{ name: "anzahl", options: NUM([1, 5, 10]) }] },
    clear:    { desc: "Konsole leeren.", args: [] }
  };
  const usage = (name, active) => name + " " + COMMANDS[name].args.map((a, i) => {
    const t = a.opt ? "[" + a.name + "]" : "<" + a.name + ">";
    return i === active ? `\u0000${t}\u0001` : t;
  }).join(" ");
  const resolveEnemy = n => {
    n = String(n || "").toLowerCase().replace(/\s+/g, "");
    if (SF.ENEMIES[n]) return n;
    const hit = Object.values(SF.ENEMIES).find(e => e.name.toLowerCase().replace(/\s+/g, "") === n);
    if (hit) return hit.key;
    const alias = { laeufer: "grunt", flieger: "flyer", panzer: "brute", schild: "shield", koloss: "boss", riss: "riftwalker", risslaeufer: "riftwalker" };
    return alias[n] || null;
  };

  function print(msg, type) {
    const out = $("admConsoleOut");
    const line = document.createElement("div");
    line.className = "adm-line " + (type || "");
    line.textContent = msg;
    out.appendChild(line);
    while (out.children.length > 150) out.firstChild.remove();
    out.scrollTop = out.scrollHeight;
  }

  function signed(current, args) {
    if ((args[0] || "").toLowerCase() === "set") { const v = Number(args[1]); return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : null; }
    const v = Number(args[0]);
    if (!Number.isFinite(v)) return null;
    return Math.max(0, Math.floor(/^[+-]/.test(args[0]) ? current + v : v));
  }

  function run(raw) {
    const cmd = String(raw || "").trim();
    if (!cmd) return;
    print("> " + cmd, "cmd");
    if (A.history[A.history.length - 1] !== cmd) A.history.push(cmd);
    A.histIdx = A.history.length;
    const parts = cmd.split(/\s+/), root = parts.shift().toLowerCase(), args = parts;
    try {
      if (root === "clear") { $("admConsoleOut").innerHTML = ""; return; }
      if (root === "help") {
        const c = COMMANDS[(args[0] || "").toLowerCase()];
        const key = (args[0] || "").toLowerCase();
        if (c) print(usage(key, -1).replace(/[\u0000\u0001]/g, "") + " — " + c.desc);
        else Object.keys(COMMANDS).forEach(k => print(usage(k, -1).replace(/[\u0000\u0001]/g, "").padEnd(36) + COMMANDS[k].desc));
        return;
      }
      if (root === "xp") {
        const n = Math.max(1, Math.min(100000, Math.floor(Number(args[0]) || 0)));
        if (!Number(args[0])) throw new Error("Syntax: xp 500");
        const r = SF.xp.add(n); print("✓ +" + n + " XP → Stufe " + SF.save.profile.level + (r.packs ? " (+" + r.packs + " Packs)" : ""), "ok");
        return;
      }
      if (root === "pack") {
        const n = Math.max(1, Math.min(50, Math.floor(Number(args[0]) || 1)));
        SF.save.profile.packs += n; SF.persist(); SF.cardsUi.refreshBadge(); print("✓ +" + n + " Kartenpack(s) → " + SF.save.profile.packs, "ok");
        return;
      }
      if (root === "crystals") {
        const v = signed(SF.save.crystals, args);
        if (v === null) throw new Error("Syntax: crystals +50 | crystals set 100");
        SF.save.crystals = v; SF.persist(); SF.shop.refreshBadge(); if (!$("shop").hidden) SF.shop.render();
        print("✓ Riftkristalle → " + v, "ok");
        return;
      }
      if (!COMMANDS[root]) throw new Error("Unbekannter Befehl '" + root + "'. Tippe help.");
      const G = SF.getGame();
      if (!G || G.over || !$("menu").hidden) throw new Error("Kein laufendes Spiel. Starte zuerst eine Runde.");
      SF.admin.markCheated();
      if (root === "spawn") {
        const key = resolveEnemy(args[0]);
        if (!key) throw new Error("Unbekannter Gegner. TAB zeigt alle Namen.");
        const n = Math.max(1, Math.min(60, Math.floor(Number(args[1]) || 1)));
        SF.admin.spawn(key, n); print("✓ " + n + "× " + SF.ENEMIES[key].name + " erschienen.", "ok");
      } else if (root === "gold" || root === "lives" || root === "score") {
        const v = signed(G[root], args);
        if (v === null) throw new Error("Syntax: " + usage(root, -1).replace(/[\u0000\u0001]/g, ""));
        G[root] = root === "lives" ? Math.max(1, v) : v; print("✓ " + root + " → " + G[root], "ok");
      } else if (root === "wave") {
        const n = Math.floor(Number(args[0]));
        if (!(n >= 1 && n <= 500)) throw new Error("Syntax: wave 15");
        G.wave = n - 1; print("✓ Nächste Welle ist " + n + ".", "ok");
      } else if (root === "next") {
        SF.callNextWave(); print("✓ Welle " + G.wave + " gestartet.", "ok");
      } else if (root === "kill") {
        print("✓ " + SF.admin.killAll() + " Gegner besiegt.", "ok");
      } else if (root === "freeze") {
        if ((args[0] || "").toLowerCase() === "off") { G.frozenUntil = 0; print("✓ Gegner freigegeben.", "ok"); }
        else { const s = Math.max(1, Math.min(300, Number(args[0]) || 5)); G.frozenUntil = G.time + s; print("✓ Gegner " + s + " s eingefroren (Spielzeit).", "ok"); }
      } else if (root === "rift") {
        const a = (args[0] || "open").toLowerCase();
        if (a === "close") { SF.admin.closeRift(); print("✓ Riss geschlossen.", "ok"); }
        else print(SF.admin.openRift() ? "✓ Riss geöffnet." : "✗ Kein Platz für einen Riss gefunden.", G.rift ? "ok" : "err");
      } else if (root === "event") {
        const e = (args[0] || "").toLowerCase();
        if (e === "boss") SF.admin.spawn("boss", 1);
        else if (e === "rift") SF.admin.spawn("riftwalker", 1);
        else if (e === "elite") ["brute", "shield", "healer", "phantom", "splitter", "brute", "shield", "riftwalker"].forEach(t => SF.admin.spawn(t, 1));
        else throw new Error("Ereignisse: boss, rift, elite");
        print("✓ Ereignis '" + e + "' gestartet.", "warn");
      } else if (root === "god") {
        G.godMode = !G.godMode; print("✓ Unendlich Leben: " + (G.godMode ? "AN" : "AUS"), "ok");
      } else if (root === "speed") {
        const v = Math.max(1, Math.min(10, Math.floor(Number(args[0]) || 1))); G.speed = v; print("✓ Tempo " + v + "×", "ok");
      }
      print("Hinweis: Dieser Run zählt jetzt als TEST-RUN (keine Online-Scores, keine Erfolge).", "dim");
    } catch (e) { print("✗ " + e.message, "err"); }
  }

  // Vorschläge für die aktuelle Eingabe
  function analyse(value) {
    const tokens = value.split(" ");
    const idx = tokens.length - 1;
    const cur = tokens[idx].toLowerCase();
    const root = tokens[0].toLowerCase();
    let all = [];
    if (idx === 0) all = Object.keys(COMMANDS).map(k => ({ v: k, d: COMMANDS[k].desc }));
    else if (COMMANDS[root]) { const spec = COMMANDS[root].args[idx - 1]; all = spec ? spec.options(tokens, idx) : []; }
    const list = all.filter(o => o.v.toLowerCase().startsWith(cur) && o.v.toLowerCase() !== cur);
    return { tokens, idx, cur, root, list, known: !!COMMANDS[root] };
  }

  const cyc = { active: false, list: [], i: 0, applied: "" };

  function applySuggestion(input, value) {
    const tokens = input.value.split(" ");
    tokens[tokens.length - 1] = value;
    input.value = tokens.join(" ");
    cyc.applied = input.value;
  }

  function tabCycle(input, dir) {
    if (!(cyc.active && input.value === cyc.applied)) {
      const a = analyse(input.value);
      if (!a.list.length) return;
      cyc.active = true; cyc.list = a.list; cyc.i = dir > 0 ? 0 : a.list.length - 1;
    } else cyc.i = (cyc.i + dir + cyc.list.length) % cyc.list.length;
    applySuggestion(input, cyc.list[cyc.i].v);
    renderSuggest();
  }

  function esc(t) { return String(t).replace(/[&<>]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch])); }

  function renderSuggest() {
    const input = $("admConsoleIn");
    const box = $("admSuggest"), ghost = $("admGhost"), hint = $("admHint");
    const value = input.value;
    let list, sel = -1, a;
    if (cyc.active && value === cyc.applied) { list = cyc.list; sel = cyc.i; a = analyse(value); }
    else { cyc.active = false; a = analyse(value); list = value.trim() || value.endsWith(" ") ? a.list : []; }

    // Vorschlagsliste (wie im Minecraft-Chat)
    box.innerHTML = "";
    const show = list.slice(Math.max(0, Math.min(sel - 4, list.length - 9)), Math.max(0, Math.min(sel - 4, list.length - 9)) + 9);
    show.forEach(o => {
      const el = document.createElement("div");
      el.className = "adm-sg" + (o === list[sel] ? " sel" : "");
      el.innerHTML = `<span>${esc(o.v)}</span>${o.d ? `<small>${esc(o.d)}</small>` : ""}`;
      el.onmousedown = e => { e.preventDefault(); applySuggestion(input, o.v); input.value += " "; cyc.active = false; renderSuggest(); input.focus(); };
      box.appendChild(el);
    });
    if (list.length > show.length) box.insertAdjacentHTML("beforeend", `<div class="adm-sg more">… ${list.length - show.length} weitere – Tab blättert</div>`);
    box.hidden = !box.children.length;

    // grauer Vorschau-Text in der Zeile
    const first = !cyc.active && a.cur && a.list[0] ? a.list[0].v : "";
    ghost.innerHTML = first ? `<span class="hide">${esc(value)}</span>${esc(first.slice(a.cur.length))}` : "";

    // Hilfezeile: was erwartet der Befehl gerade?
    input.classList.toggle("bad", !!a.root && !a.known && a.idx > 0);
    if (a.known) {
      const h = esc(usage(a.root, a.idx - 1)).replace("\u0000", "<b>").replace("\u0001", "</b>");
      hint.innerHTML = h + ` <span>— ${esc(COMMANDS[a.root].desc)}</span>`;
    } else if (a.root && a.idx > 0) hint.innerHTML = `<span class="err">Unbekannter Befehl „${esc(a.root)}“</span>`;
    else hint.innerHTML = `<span>Tippe einen Buchstaben und drücke <kbd>Tab</kbd> · <kbd>Leertaste</kbd> bestätigt · <kbd>Enter</kbd> ausführen · <kbd>↑</kbd><kbd>↓</kbd> Verlauf</span>`;
  }

  // ---------------------------------------------------------------- Darstellung
  function render() {
    $("admLogin").hidden = A.authed;
    $("admMain").hidden = !A.authed;
    if (!A.authed) { $("admLoginStatus").textContent = "Das Passwort ist dasselbe wie im Riftward-Admin-Menü."; return; }
    document.querySelectorAll("#admTabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === A.tab));
    $("admFeedback").hidden = A.tab !== "feedback";
    $("admConsole").hidden = A.tab !== "console";
    document.querySelectorAll("#admGame button").forEach(b => b.classList.toggle("active", b.dataset.v === A.gameFilter));
    document.querySelectorAll("#admKind button").forEach(b => b.classList.toggle("active", b.dataset.v === A.kindFilter));
    if (A.tab === "feedback") renderFeedback();
    else {
      if (!$("admConsoleOut").children.length) print("Admin-Konsole bereit. Tippe z. B. „h“ und drücke Tab.", "dim");
      renderSuggest();
      setTimeout(() => $("admConsoleIn").focus(), 10);
    }
  }

  A.init = function () {
    $("admLoginBtn").onclick = login;
    $("admPw").addEventListener("keydown", e => { if (e.key === "Enter") login(); });
    $("admLogout").onclick = logout;
    $("admRefresh").onclick = refresh;
    document.querySelectorAll("#admTabs button").forEach(b => b.onclick = () => { A.tab = b.dataset.tab; render(); });
    document.querySelectorAll("#admGame button").forEach(b => b.onclick = () => { A.gameFilter = b.dataset.v; render(); });
    document.querySelectorAll("#admKind button").forEach(b => b.onclick = () => { A.kindFilter = b.dataset.v; render(); });
    const inp = $("admConsoleIn");
    inp.addEventListener("keydown", e => {
      if (e.key === "Enter") { run(inp.value); inp.value = ""; cyc.active = false; renderSuggest(); }
      else if (e.key === "Tab") { e.preventDefault(); tabCycle(inp, e.shiftKey ? -1 : 1); }
      else if (e.key === "ArrowRight" && !cyc.active && inp.selectionStart === inp.value.length) {
        const a = analyse(inp.value); // → übernimmt den grauen Vorschlag
        if (a.cur && a.list[0]) { e.preventDefault(); applySuggestion(inp, a.list[0].v); cyc.active = false; renderSuggest(); }
      }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (A.histIdx > 0) { inp.value = A.history[--A.histIdx] || ""; cyc.active = false; renderSuggest(); } }
      else if (e.key === "ArrowDown") { e.preventDefault(); A.histIdx = Math.min(A.history.length, A.histIdx + 1); inp.value = A.history[A.histIdx] || ""; cyc.active = false; renderSuggest(); }
    });
    inp.addEventListener("input", renderSuggest);
    inp.addEventListener("focus", renderSuggest);
  };
})();
