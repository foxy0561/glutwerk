/* =========================================================
   GLUTWERK-KARTEN · Duell und Deck-Baukasten
   Braucht: werte.js und die Kartenliste (CARDS, cardHTML …) aus index.html
   ========================================================= */
(function () {
  "use strict";
  const R = window.REGELN, W = window.WERTE;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const card = id => CARDS.find(c => c.id === id);
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* =========================================================
     SPIEL-ENGINE (ohne Anzeige – könnte später auch online laufen)
     ========================================================= */
  let S = null, UID = 0;

  function mkUnit(id, owner) {
    let w = W[id], name, tok = null;
    if (id[0] === "#") { tok = window.MARKER[id.slice(1)]; w = { t: "wesen", hp: tok.hp, atk: tok.atk }; name = tok.name; }
    else name = card(id).name;
    return {
      uid: ++UID, id, owner, name, tok: !!tok, hp: w.hp, max: w.hp, atk: w.atk.map(a => a.slice()),
      waechter: !!w.waechter, flink: !!w.flink, schild: !!w.schild, pas: w.pas || null, foxy: !!w.foxy,
      plusSchaden: 0, billiger: 0, weniger: 0, frost: 0, gesperrt: false, neu: true, angegriffen: false, nochmal: false, equip: [], buffs: [],
    };
  }
  const mkPlayer = (name, deck, ki) => ({ name, ki, hp: R.leben, deck: shuffle(deck.slice()), hand: [], feld: [], energie: 0, maxE: 0, grab: [], beschworen: 0, verbrannt: false });
  const foe = pi => 1 - pi;
  const ortIs = k => S.ort && W[S.ort.id].ort === k;
  const log = t => { S.log.unshift(t); S.log.length = Math.min(S.log.length, 30); };
  const ev = (ref, txt, cls) => S.fx.push({ ref, txt, cls });

  function start(deckMe, deckAi, aiName) {
    UID = 0;
    S = { p: [mkPlayer("Du", deckMe, false), mkPlayer(aiName, deckAi, true)], cur: 0, runde: 0, ort: null, log: [], fx: [], over: null };
    const first = Math.random() < .5 ? 0 : 1;
    for (let i = 0; i < R.startHand; i++) { draw(first, true); draw(foe(first), true); }
    draw(foe(first), true);
    log(first === 0 ? "Du beginnst." : `${aiName} beginnt.`);
    beginTurn(first);
  }
  function draw(pi, quiet) {
    const P = S.p[pi];
    if (!P.deck.length) { P.hp -= 2; ev("h" + pi, "-2", "dmg"); log(`${P.name}: Deck leer, 2 Schaden.`); return; }
    if (P.hand.length >= 9) { P.deck.pop(); if (!quiet) log(`${P.name}: Hand voll, Karte verbrannt.`); return; }
    P.hand.push(P.deck.pop());
  }
  function beginTurn(pi) {
    S.cur = pi; S.runde++;
    const P = S.p[pi];
    P.maxE = Math.min(P.maxE + 1, R.maxEnergie);
    P.energie = P.maxE + (ortIs("kristalltal") ? 1 : 0);
    P.beschworen = 0; P.verbrannt = false;
    if (ortIs("lavawelt")) { hurtHero(pi, 1); P.energie += 1; }
    P.feld.forEach(u => { u.neu = false; u.angegriffen = false; u.nochmal = false; u.gesperrt = u.frost > 0; if (u.frost > 0) u.frost--; });
    if (ortIs("wiese")) P.feld.forEach(u => heal(u, 1));
    if (ortIs("pilze")) healHero(pi, 2);
    if (ortIs("baum")) { P.feld.forEach(u => heal(u, 1)); healHero(pi, 1); }
    if (ortIs("riss") && S.p[foe(pi)].feld.length) { const u = rnd(S.p[foe(pi)].feld); hurt(u, 2); log(`Der Riss trifft ${u.name}.`); }
    P.feld.slice().forEach(u => {
      if (u.pas === "brut" && P.feld.length < R.feldPlaetze) { const a = mkUnit("#ameise", pi); a.neu = false; P.feld.push(a); log("Eine Ameise schlüpft und kann sofort angreifen."); }
      if (u.pas === "honig") healHero(pi, 1);
      if (u.pas === "kuh") P.feld.forEach(x => heal(x, 1));
    });
    draw(pi); if (ortIs("hafen")) draw(pi);
    cleanup();
  }
  function endTurn() {
    if (S.over != null) return;
    if (ortIs("vulkan")) { S.p.forEach(P => P.feld.forEach(u => hurt(u, 1))); log("Der Vulkan brennt."); }
    cleanup();
    if (S.over == null) beginTurn(foe(S.cur));
  }
  /* ---- Hilfen ---- */
  const healAmt = n => n + (ortIs("dorf") ? 2 : 0);
  function heal(u, n) { const before = u.hp; u.hp = Math.min(u.max, u.hp + healAmt(n)); if (u.hp > before) ev("u" + u.uid, "+" + (u.hp - before), "heal"); }
  function healHero(pi, n) { const P = S.p[pi], b = P.hp; P.hp = Math.min(R.leben, P.hp + healAmt(n)); if (P.hp > b) ev("h" + pi, "+" + (P.hp - b), "heal"); }
  function hurt(u, n) {
    if (n <= 0) return 0;
    if (u.schild) { u.schild = false; ev("u" + u.uid, "Schild!", "shield"); return 0; }
    n = Math.max(0, n - (ortIs("burg") ? 1 : 0) - (ortIs("schnee") && u.waechter ? 1 : 0) - u.weniger);
    u.hp -= n; ev("u" + u.uid, "-" + n, "dmg");
    return n;
  }
  function hurtHero(pi, n) { S.p[pi].hp -= n; ev("h" + pi, "-" + n, "dmg"); }
  function cleanup() {
    S.p.forEach((P, pi) => {
      P.feld = P.feld.filter(u => {
        if (u.hp > 0) return true;
        if (u.pas === "untot" && !u.auferstanden) { u.auferstanden = true; u.hp = 2; ev("u" + u.uid, "Steht auf!", "heal"); log(`${u.name} steht wieder auf!`); return true; }
        log(`${u.name} wurde besiegt.`);
        if (!u.tok) P.grab.push(u.id);
        if (u.pas === "schaf") draw(pi);
        if (ortIs("ruinen") && !u.tok) draw(pi);
        return false;
      });
    });
    if (S.p[0].hp <= 0 || S.p[1].hp <= 0) S.over = S.p[1].hp <= 0 && S.p[0].hp > 0 ? 0 : S.p[0].hp <= 0 && S.p[1].hp > 0 ? 1 : 2;
  }
  const findU = uid => { for (const P of S.p) { const u = P.feld.find(x => x.uid === uid); if (u) return u; } return null; };

  /* ---- Angriffe ---- */
  function atkCost(u, a) {
    let c = a[1] + (ortIs("winter") ? 1 : 0) - (ortIs("stadt") ? 1 : 0) - u.billiger;
    const min = a[1] === 0 ? 0 : ortIs("stadt") ? 1 : 0;
    return Math.max(min, c);
  }
  function atkDmg(u, a) {
    const beacons = S.p[u.owner].feld.filter(x => x !== u && x.pas === "leuchtfeuer").length;
    return a[2] + u.plusSchaden + beacons + (ortIs("schmiede") ? 1 : 0) + (ortIs("wueste") && u.flink ? 1 : 0);
  }
  const canAct = u => S.cur === u.owner && !u.neu && !u.gesperrt && (!u.angegriffen || u.nochmal);
  function whyNotAct(u) {
    if (S.cur !== u.owner) return "Nicht dein Zug.";
    if (u.neu) return "Gerade gerufen: greift ab nächster Runde an.";
    if (u.gesperrt) return "Eingefroren: kann diese Runde nicht angreifen.";
    if (u.angegriffen && !u.nochmal) return "Hat diese Runde schon angegriffen.";
    return "";
  }
  function atkTargets(u, a) {
    if (a[3] === "alle") return [];
    const E = S.p[foe(u.owner)], guards = E.feld.filter(x => x.waechter);
    const t = (guards.length ? guards : E.feld).map(x => "u" + x.uid);
    if (!E.feld.length || (u.flink && !guards.length)) t.push("h" + foe(u.owner));
    return t;
  }
  function attack(uid, ai, target) {
    const u = findU(uid), a = u && u.atk[ai];
    if (!u || !a || !canAct(u)) return false;
    const P = S.p[u.owner], cost = atkCost(u, a);
    if (P.energie < cost) return false;
    if (a[3] !== "alle" && !atkTargets(u, a).includes(target)) return false;
    P.energie -= cost;
    if (u.angegriffen) u.nochmal = false; else u.angegriffen = true;
    const d = atkDmg(u, a), E = S.p[foe(u.owner)];
    let dealt = 0;
    if (a[3] === "alle") {
      if (E.feld.length) E.feld.slice().forEach(x => dealt += hurt(x, d));
      else { hurtHero(foe(u.owner), d); dealt = d; }
      log(`${u.name}: ${a[0]} trifft alle.`);
    } else if (target[0] === "h") {
      hurtHero(foe(u.owner), d); dealt = d; log(`${u.name}: ${a[0]} trifft ${E.name} (${d}).`);
    } else {
      const t = findU(+target.slice(1));
      dealt = hurt(t, d);
      log(`${u.name}: ${a[0]} trifft ${t.name} (${dealt}).`);
      if (a[3] === "frost") { t.frost = 1; ev("u" + t.uid, "Frost", "frost"); }
      if (a[3] === "kette") { const o = E.feld.filter(x => x !== t); if (o.length) hurt(rnd(o), 1); }
    }
    if (a[3] === "saugen" && dealt) heal(u, dealt);
    if (a[3] === "schild") { u.schild = true; ev("u" + u.uid, "Schild", "shield"); }
    cleanup();
    return true;
  }

  /* ---- Karten spielen ---- */
  function cardCost(pi, id) {
    const w = W[id];
    if (w.t === "wesen") return 0;
    const still = w.t === "zauber" && S.p[pi].feld.some(u => u.pas === "stillerZauber");
    const ort = (w.t === "zauber" && ortIs("hoehle")) || (w.t === "ausr" && ortIs("markt"));
    return Math.max(0, w.kosten - (still ? 1 : 0) - (ort ? 1 : 0));
  }
  function playTargets(pi, id) {
    const w = W[id], me = S.p[pi], E = S.p[foe(pi)];
    const own = me.feld.map(u => "u" + u.uid), en = E.feld.map(u => "u" + u.uid);
    if (w.t === "ausr") return own;
    if (w.t !== "zauber") return null;
    switch (w.ziel) {
      case "eigenesWesen": return own;
      case "feindWesen": return en;
      case "feind": return en.concat("h" + foe(pi));
      case "eigen": return own.concat("h" + pi);
    }
    return null;
  }
  /* Karte von der Hand verbrennen: +1 Energie, 1× pro Runde */
  const BURN_ENERGIE = 1;
  function whyNotBurn(pi) {
    if (S.cur !== pi) return "Nicht dein Zug.";
    if (S.p[pi].verbrannt) return "Du hast diese Runde schon eine Karte verbrannt.";
    return "";
  }
  function burn(pi, hi) {
    const P = S.p[pi], id = P.hand[hi];
    if (!id || whyNotBurn(pi)) return false;
    P.hand.splice(hi, 1); P.verbrannt = true; P.energie += BURN_ENERGIE;
    ev("h" + pi, "+" + BURN_ENERGIE + " ⚡", "heal");
    log(`${P.name} verbrennt ${card(id).name} für ${BURN_ENERGIE} Energie.`);
    return true;
  }
  function whyNotPlay(pi, id) {
    const w = W[id], P = S.p[pi];
    if (S.cur !== pi) return "Nicht dein Zug.";
    if (w.t === "wesen") {
      const maxW = ortIs("dschungel") ? 2 : 1;
      if (P.beschworen >= maxW) return maxW === 1 ? "Nur 1 Wesen pro Runde." : "Schon 2 Wesen in dieser Runde gerufen.";
      if (P.feld.length >= R.feldPlaetze) return "Dein Feld ist voll.";
      return "";
    }
    if (P.energie < cardCost(pi, id)) return "Nicht genug Energie.";
    const t = playTargets(pi, id);
    if (t && !t.length) return w.t === "ausr" || w.ziel === "eigenesWesen" ? "Du brauchst ein eigenes Wesen." : "Kein Ziel da.";
    if (w.wiederbeleben && (!P.grab.length || P.feld.length >= R.feldPlaetze)) return P.grab.length ? "Dein Feld ist voll." : "Noch kein Wesen besiegt.";
    if (w.beschwoere && P.feld.length >= R.feldPlaetze) return "Dein Feld ist voll.";
    if (w.t === "ort" && S.ort && S.ort.id === id) return "Dieser Ort liegt schon.";
    return "";
  }
  function play(pi, hi, target) {
    const P = S.p[pi], id = P.hand[hi], w = W[id];
    if (!id || whyNotPlay(pi, id)) return false;
    const t = playTargets(pi, id);
    if (t && !t.includes(target)) return false;
    P.energie -= cardCost(pi, id);
    P.hand.splice(hi, 1);
    const name = card(id).name, E = S.p[foe(pi)];
    const tu = target && target[0] === "u" ? findU(+target.slice(1)) : null;
    if (w.t === "wesen") {
      const u = mkUnit(id, pi); P.feld.push(u); P.beschworen++; log(`${P.name} ruft ${name}.`);
      if (w.beimSpielen) { P.feld.forEach(x => heal(x, w.beimSpielen.heileAlle)); for (let i = 0; i < w.beimSpielen.ziehe; i++) draw(pi); }
    } else if (w.t === "ort") {
      S.ort = { id, owner: pi }; log(`${P.name} wählt den Ort ${name}.`);
    } else if (w.t === "ausr") {
      tu.plusSchaden += (w.plusSchaden || 0) + (tu.foxy ? (w.foxySchaden || 0) : 0) + (ortIs("tiefe") ? 1 : 0);
      tu.billiger += w.billiger || 0; tu.weniger += w.weniger || 0;
      if (w.plusLeben) { tu.max += w.plusLeben; tu.hp += w.plusLeben; ev("u" + tu.uid, "+" + w.plusLeben, "heal"); }
      if (w.gibFlink) tu.flink = true;
      if (w.gibWaechter) tu.waechter = true;
      tu.equip.push(id); log(`${tu.name} trägt jetzt ${name}.`);
    } else {
      log(`${P.name} spielt ${name}.`);
      if (w.brichtSchild && tu && tu.schild) { tu.schild = false; ev("u" + tu.uid, "Schild kaputt!", "shield"); }
      if (w.schaden) { if (tu) hurt(tu, w.schaden); else hurtHero(foe(pi), w.schaden); }
      if (w.dauerSchaden && tu) { tu.plusSchaden += w.dauerSchaden; tu.buffs.push(id); ev("u" + tu.uid, "+" + w.dauerSchaden + " ⚔", "heal"); }
      if (w.sucheTyp) { const k = P.deck.findIndex(x => W[x] && W[x].t === w.sucheTyp); if (k >= 0 && P.hand.length < 9) { P.hand.push(P.deck.splice(k, 1)[0]); log(`${P.name} holt eine Ausrüstung.`); } }
      if (w.schadenAlleFeinde) E.feld.slice().forEach(u => hurt(u, w.schadenAlleFeinde));
      if (w.schadenGegner) hurtHero(foe(pi), w.schadenGegner);
      if (w.frostAlle) E.feld.forEach(u => { u.frost = 1; ev("u" + u.uid, "Frost", "frost"); });
      if (w.entfrosten && tu) { tu.frost = 0; tu.gesperrt = false; }
      if (w.gibFlink && tu) { tu.flink = true; ev("u" + tu.uid, "Flink!", "heal"); }
      if (w.schadenAlleWesen) S.p.forEach(Q => Q.feld.slice().forEach(u => hurt(u, w.schadenAlleWesen)));
      if (w.heile) { if (tu) heal(tu, w.heile); else healHero(pi, w.heile); }
      if (w.heileAlle) P.feld.forEach(u => heal(u, w.heileAlle));
      if (w.heileSpieler) healHero(pi, w.heileSpieler);
      if (w.schild && tu) { tu.schild = true; ev("u" + tu.uid, "Schild", "shield"); }
      if (w.frost && tu) { tu.frost = 1; ev("u" + tu.uid, "Frost", "frost"); }
      if (w.zurueck && tu) { const Q = S.p[tu.owner]; Q.feld = Q.feld.filter(x => x !== tu); if (!tu.tok) { if (Q.hand.length < 9) Q.hand.push(tu.id); } ev("u" + tu.uid, "Zurück!", "shield"); }
      if (w.nochmal && tu) { tu.nochmal = true; ev("u" + tu.uid, "Nochmal!", "heal"); }
      if (w.wiederbeleben) { const back = P.grab.pop(); P.feld.push(mkUnit(back, pi)); log(`${card(back).name} ist zurück!`); }
      if (w.beschwoere) for (let i = 0; i < w.beschwoere && P.feld.length < R.feldPlaetze; i++) P.feld.push(mkUnit("#freund", pi));
      if (w.energie) P.energie += w.energie;
      if (w.maxEnergie) { P.maxE = Math.min(R.maxEnergie, P.maxE + w.maxEnergie); P.energie += w.maxEnergie; }
      if (w.ziehe) for (let i = 0; i < w.ziehe; i++) draw(pi);
      if (w.zieheBis) { let g = 0; while (P.hand.length < w.zieheBis && P.deck.length && g++ < 6) draw(pi); }
    }
    cleanup();
    return true;
  }

  /* =========================================================
     COMPUTER-GEGNER
     ========================================================= */
  const unitVal = u => u.hp + Math.max(0, ...u.atk.map(a => a[2])) * 1.6 + (u.waechter ? 2 : 0) + (u.flink ? 2 : 0);
  function aiNext() {
    const pi = S.cur, P = S.p[pi], E = S.p[foe(pi)];
    const hand = P.hand.map((id, hi) => ({ id, hi, w: W[id] })).filter(x => !whyNotPlay(pi, x.id));
    // 1. Wesen rufen (das stärkste)
    const cre = hand.filter(x => x.w.t === "wesen").sort((a, b) => (b.w.hp + Math.max(...b.w.atk.map(q => q[2])) * 2) - (a.w.hp + Math.max(...a.w.atk.map(q => q[2])) * 2));
    if (cre.length) return { k: "play", hi: cre[0].hi };
    // 2. Schaden, der etwas besiegt
    for (const x of hand) {
      const w = x.w;
      if (w.schaden) {
        const kill = E.feld.filter(u => !u.schild && u.hp <= w.schaden - (ortIs("burg") ? 1 : 0) - u.weniger).sort((a, b) => unitVal(b) - unitVal(a))[0];
        if (kill) return { k: "play", hi: x.hi, t: "u" + kill.uid };
        if (E.hp <= w.schaden && w.ziel !== "feindWesen") return { k: "play", hi: x.hi, t: "h" + foe(pi) };
      }
      if (w.schadenAlleFeinde && E.feld.length >= 2) return { k: "play", hi: x.hi };
      if (w.frostAlle && E.feld.length >= 2) return { k: "play", hi: x.hi };
      if (w.gibFlink && w.t === "zauber" && E.feld.length) { const u = P.feld.filter(u => !u.flink).sort((a, b) => unitVal(b) - unitVal(a))[0]; if (u) return { k: "play", hi: x.hi, t: "u" + u.uid }; }
      if (w.schadenAlleWesen && E.feld.length > P.feld.length + 1) return { k: "play", hi: x.hi };
      if (w.maxEnergie && P.maxE < R.maxEnergie) return { k: "play", hi: x.hi };
    }
    // 2b. Karte verbrennen, wenn dadurch ein Angriff möglich wird oder die Hand voll ist
    if (!P.verbrannt && P.hand.length >= 2) {
      const useless = P.hand.map((id, hi) => ({ id, hi })).filter(x => W[x.id].t !== "wesen" && whyNotPlay(pi, x.id));
      const needs = P.feld.some(u => canAct(u) && u.atk.some(a => atkCost(u, a) === P.energie + BURN_ENERGIE));
      if (useless.length && (needs || P.hand.length >= 6)) {
        const pick = useless.sort((a, b) => ["common", "rare", "epic", "legendary", "mythic"].indexOf(card(a.id).r) - ["common", "rare", "epic", "legendary", "mythic"].indexOf(card(b.id).r))[0];
        return { k: "burn", hi: pick.hi };
      }
    }
    // 3. Angreifen
    const att = aiAttack(pi);
    if (att) return att;
    // 4. Übrige Karten sinnvoll nutzen
    for (const x of hand) {
      const w = x.w, t = playTargets(pi, x.id);
      if (w.t === "ort" && (!S.ort || S.ort.owner !== pi)) return { k: "play", hi: x.hi };
      if (w.t === "ausr") { const u = P.feld.slice().sort((a, b) => unitVal(b) - unitVal(a))[0]; return { k: "play", hi: x.hi, t: "u" + u.uid }; }
      if (w.heile) {
        const u = P.feld.filter(u => u.max - u.hp >= 3).sort((a, b) => (b.max - b.hp) - (a.max - a.hp))[0];
        if (u) return { k: "play", hi: x.hi, t: "u" + u.uid };
        if (P.hp <= R.leben - 6 && w.ziel === "eigen") return { k: "play", hi: x.hi, t: "h" + pi };
      }
      if (w.heileAlle && P.feld.reduce((s, u) => s + u.max - u.hp, 0) >= 3) return { k: "play", hi: x.hi };
      if (w.heileSpieler && P.hp <= R.leben - 4) return { k: "play", hi: x.hi };
      if ((w.ziehe || w.zieheBis) && P.hand.length <= 4) return { k: "play", hi: x.hi };
      if (w.schaden && (E.feld.length || w.ziel !== "feindWesen")) { const tt = E.feld.length ? "u" + E.feld.slice().sort((a, b) => unitVal(b) - unitVal(a))[0].uid : "h" + foe(pi); return { k: "play", hi: x.hi, t: tt }; }
      if (w.schild) { const u = P.feld.filter(u => !u.schild).sort((a, b) => unitVal(b) - unitVal(a))[0]; if (u) return { k: "play", hi: x.hi, t: "u" + u.uid }; }
      if (w.frost && E.feld.length) return { k: "play", hi: x.hi, t: "u" + E.feld.slice().sort((a, b) => unitVal(b) - unitVal(a))[0].uid };
      if (w.zurueck && w.ziel === "feindWesen") { const u = E.feld.filter(u => unitVal(u) >= 12)[0]; if (u) return { k: "play", hi: x.hi, t: "u" + u.uid }; }
      if (w.dauerSchaden) { const u = P.feld.slice().sort((a, b) => unitVal(b) - unitVal(a))[0]; if (u) return { k: "play", hi: x.hi, t: "u" + u.uid }; }
      if (w.nochmal) { const u = P.feld.find(u => u.angegriffen && !u.gesperrt && u.atk.some(a => atkCost(u, a) <= P.energie - cardCost(pi, x.id))); if (u) return { k: "play", hi: x.hi, t: "u" + u.uid }; }
      if (w.wiederbeleben || w.beschwoere) return { k: "play", hi: x.hi };
      if (w.energie && P.feld.some(u => canAct(u))) return { k: "play", hi: x.hi };
      if (t === null && !w.zurueck && w.t === "zauber" && !w.heile && !w.heileAlle && !w.heileSpieler && !w.energie && !w.frostAlle) return { k: "play", hi: x.hi };
    }
    return null;
  }
  function aiAttack(pi) {
    const P = S.p[pi], E = S.p[foe(pi)];
    for (const u of P.feld.filter(canAct).sort((a, b) => unitVal(b) - unitVal(a))) {
      const opts = u.atk.map((a, i) => ({ a, i, c: atkCost(u, a), d: atkDmg(u, a) })).filter(o => o.c <= P.energie);
      if (!opts.length) continue;
      opts.sort((x, y) => (y.a[3] === "alle" ? y.d * Math.max(1, E.feld.length) : y.d) - (x.a[3] === "alle" ? x.d * Math.max(1, E.feld.length) : x.d));
      const o = opts[0];
      if (o.a[3] === "alle") return { k: "atk", uid: u.uid, ai: o.i };
      const ts = atkTargets(u, o.a);
      const heroT = "h" + foe(pi);
      if (ts.includes(heroT) && (!E.feld.length || E.hp <= o.d || Math.random() < .5)) return { k: "atk", uid: u.uid, ai: o.i, t: heroT };
      const units = ts.filter(t => t[0] === "u").map(t => findU(+t.slice(1)));
      const kill = units.filter(x => !x.schild && x.hp <= o.d - (ortIs("burg") ? 1 : 0) - x.weniger).sort((a, b) => unitVal(b) - unitVal(a))[0];
      const tgt = kill || units.sort((a, b) => atkThreat(b) - atkThreat(a))[0];
      if (tgt) return { k: "atk", uid: u.uid, ai: o.i, t: "u" + tgt.uid };
      if (ts.includes(heroT)) return { k: "atk", uid: u.uid, ai: o.i, t: heroT };
    }
    return null;
  }
  const atkThreat = u => Math.max(...u.atk.map(a => a[2])) * 2 - u.hp * .3;

  /* =========================================================
     ANZEIGE
     ========================================================= */
  const css = `
.duel{position:fixed;inset:0;z-index:105;display:none;flex-direction:column;overflow:hidden;color:#e8ebf2;
  background:radial-gradient(ellipse 80% 60% at 50% 50%,#1c1510 0%,#0b0a0c 70%),#08090c}
.duel.open{display:flex}
.duel{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.duel::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.5;
  background:repeating-linear-gradient(0deg,transparent 0 39px,rgba(255,255,255,.025) 39px 40px),repeating-linear-gradient(90deg,transparent 0 39px,rgba(255,255,255,.025) 39px 40px)}
.d-row{position:relative;display:flex;align-items:center;gap:12px;padding:8px 14px}
.d-hero{display:flex;align-items:center;gap:10px;padding:6px 12px 6px 6px;border-radius:14px;background:rgba(20,22,30,.85);border:1px solid #2a3040;position:relative;transition:box-shadow .2s}
.d-ava{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:22px;background:linear-gradient(135deg,#ff6a2b,#ffb347);box-shadow:0 0 14px rgba(255,106,43,.5);flex-shrink:0}
.d-hero.enemy .d-ava{background:linear-gradient(135deg,#7b2ff7,#f107a3);box-shadow:0 0 14px rgba(241,7,163,.45)}
.d-hn{font-family:Rajdhani,sans-serif;font-weight:700;font-size:17px;text-transform:uppercase;letter-spacing:.5px;line-height:1}
.d-hp{display:flex;align-items:center;gap:6px;margin-top:4px}
.d-hpbar{width:110px;height:9px;border-radius:5px;background:#2a1018;overflow:hidden}
.d-hpbar i{display:block;height:100%;background:linear-gradient(90deg,#ff3355,#ff7a5c);transition:width .4s}
.d-hpn{font-family:Rajdhani,sans-serif;font-weight:700;font-size:16px;color:#ff8a8a;min-width:42px}
.d-sub{font-size:11px;color:#8a93a8;margin-top:3px}
.d-en{display:flex;align-items:center;gap:3px;flex-wrap:wrap}
.d-en i{width:13px;height:18px;clip-path:polygon(55% 0,0 58%,42% 58%,35% 100%,100% 38%,58% 38%);background:#2a3040}
.d-en i.on{background:#ffd34d;filter:drop-shadow(0 0 4px #ffb300)}
.d-en b{font-family:Rajdhani,sans-serif;font-size:16px;color:#ffd34d;margin-left:4px}
.d-sp{flex:1}
.d-btn{padding:10px 16px;border-radius:10px;font-family:Rajdhani,sans-serif;font-weight:700;font-size:16px;letter-spacing:1px;text-transform:uppercase;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);color:#fff;white-space:nowrap}
.d-btn:hover{background:rgba(255,255,255,.13)}
.d-btn.hot{background:linear-gradient(135deg,#ff6a2b,#ffb347);color:#140800;border:none;box-shadow:0 4px 18px rgba(255,106,43,.45)}
.d-btn.hot.pulse{animation:dPulse 1.4s ease-in-out infinite}
@keyframes dPulse{50%{box-shadow:0 0 0 6px rgba(255,106,43,.25),0 4px 18px rgba(255,106,43,.45)}}
.d-btn[disabled]{opacity:.4;cursor:not-allowed;animation:none}
.d-field{position:relative;flex:1;display:flex;align-items:center;justify-content:center;gap:clamp(8px,1.6vw,18px);padding:4px 12px;min-height:0}
.d-slot{width:clamp(76px,12vw,132px);aspect-ratio:3/4;border-radius:12px;border:2px dashed rgba(255,255,255,.07)}
.d-mid{position:relative;display:flex;align-items:center;justify-content:center;gap:14px;padding:2px 14px;min-height:46px}
.d-mid::before{content:"";position:absolute;left:5%;right:5%;top:50%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,179,71,.35),transparent)}
.d-ort{position:relative;display:flex;align-items:center;gap:10px;padding:6px 12px 6px 6px;border-radius:12px;background:rgba(20,22,30,.92);border:1px solid #3a3020;max-width:min(520px,92vw);cursor:pointer}
.d-ort img,.d-ort svg{width:46px;height:34px;border-radius:6px;object-fit:cover;flex-shrink:0}
.d-ort b{font-family:Rajdhani,sans-serif;font-size:15px;text-transform:uppercase;color:#ffcf9c;display:block;line-height:1}
.d-ort span{font-size:12px;color:#c3c9d6}
.d-ort.none{border-style:dashed;color:#5d6578;font-size:12px;padding:8px 14px;cursor:default}
.d-turn{position:relative;font-family:Rajdhani,sans-serif;font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#8a93a8;background:#0b0a0c;padding:2px 10px}
.unit{position:relative;width:clamp(76px,12vw,132px);aspect-ratio:3/4;border-radius:12px;cursor:pointer;container-type:inline-size;
  background:#151820;border:2px solid var(--rc,#aab3c5);box-shadow:0 6px 18px rgba(0,0,0,.5);transition:transform .25s,box-shadow .2s,opacity .3s,filter .3s;overflow:visible}
.unit .u-art{position:absolute;inset:0 0 34% 0;border-radius:10px 10px 0 0;overflow:hidden}
.unit .u-art svg,.unit .u-art img{width:100%;height:100%;object-fit:cover;display:block}
.unit .u-art img.cut{object-fit:contain;object-position:50% 10%;background:radial-gradient(circle at 50% 40%,#5a2a6e,#1a0a24)}
.unit .u-art img.item{object-fit:contain;padding:8%}
.unit .u-name{position:absolute;left:0;right:0;bottom:19%;text-align:center;font-family:Rajdhani,sans-serif;font-weight:700;font-size:11.5cqw;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 5cqw}
.unit .u-stats{position:absolute;left:5cqw;right:5cqw;bottom:4cqw;display:flex;justify-content:space-between;align-items:center}
.unit .u-hp{display:flex;align-items:center;gap:2cqw;padding:1.5cqw 5cqw;border-radius:8cqw;background:linear-gradient(180deg,#ff5a6e,#b3142c);font-family:Rajdhani,sans-serif;font-weight:700;font-size:14cqw;line-height:1}
.unit .u-hp.low{animation:lowHp 1s ease-in-out infinite}
@keyframes lowHp{50%{filter:brightness(1.4)}}
.unit .u-atk{font-family:Rajdhani,sans-serif;font-weight:700;font-size:12cqw;color:#ffd34d}
.unit .u-badges{position:absolute;top:-8px;left:-6px;right:-6px;display:flex;gap:3px;flex-wrap:wrap;pointer-events:none}
.unit .u-badges span{font-size:10px;font-weight:800;padding:2px 5px;border-radius:5px;background:#0b0d12;border:1px solid #3a4252;color:#cfd6e4;letter-spacing:.3px}
.unit .u-badges .g{color:#ffd34d;border-color:#7a5a10}.unit .u-badges .f{color:#7df9ff;border-color:#0e6b78}
.unit .u-badges .s{color:#93c5fd;border-color:#1e3a8a}.unit .u-badges .fr{color:#bff3ff;border-color:#38bdf8;background:#0c2a3a}
.unit .u-badges .e{color:#ffcf9c;border-color:#7a3a14}
.unit.shielded{box-shadow:0 0 0 3px rgba(147,197,253,.75),0 0 22px rgba(96,165,250,.6)}
.unit.frozen{filter:saturate(.4) brightness(.85) hue-rotate(160deg)}
.unit.ready{box-shadow:0 0 0 2px #3ddc97,0 0 18px rgba(61,220,151,.55);animation:ready 1.6s ease-in-out infinite}
@keyframes ready{50%{transform:translateY(-4px)}}
.unit.done{opacity:.72}
.unit.tgt,.d-hero.tgt{box-shadow:0 0 0 3px #ff4d4d,0 0 26px rgba(255,60,60,.7);animation:tgtPulse .9s ease-in-out infinite;cursor:crosshair}
.unit.tgt.ally,.d-hero.tgt.ally{box-shadow:0 0 0 3px #3ddc97,0 0 26px rgba(61,220,151,.7)}
@keyframes tgtPulse{50%{transform:scale(1.05)}}
.unit.sel{transform:translateY(-10px) scale(1.06);box-shadow:0 0 0 3px #ffb347,0 0 26px rgba(255,179,71,.7)}
.unit.lunge{z-index:20;transition:transform .22s cubic-bezier(.5,0,.75,0)}
.unit.enter{animation:enter .5s cubic-bezier(.2,1.4,.4,1)}
@keyframes enter{from{transform:translateY(40px) scale(.6);opacity:0}}
.d-hand{position:relative;display:flex;justify-content:center;align-items:flex-end;gap:6px;padding:6px 10px 10px;min-height:0;overflow-x:auto;overflow-y:visible}
.hcard{position:relative;flex-shrink:0;width:clamp(84px,10.5vw,132px);cursor:pointer;transition:transform .2s;container-type:inline-size}
.hcard:hover{transform:translateY(-12px)}
.hcard.no{filter:brightness(.55) saturate(.6)}
.hcard.no:hover{transform:translateY(-4px)}
.hcard.new{animation:drawIn .45s cubic-bezier(.2,1.3,.4,1)}
@keyframes drawIn{from{transform:translate(40px,60px) rotate(10deg);opacity:0}}
.hcard .tcard{box-shadow:0 6px 16px rgba(0,0,0,.6)}
.hcard .cost-glow{position:absolute;inset:-3px;border-radius:9%;box-shadow:0 0 0 2px #3ddc97,0 0 16px rgba(61,220,151,.55);pointer-events:none}
.d-ehand{display:flex;gap:3px;margin-left:6px}
.d-ehand i{width:14px;height:20px;border-radius:3px;background:linear-gradient(135deg,#3a1d10,#1b0f0a);border:1px solid #7a3a14}
.d-panel{position:absolute;inset:0;z-index:30;display:none;align-items:center;justify-content:center;gap:24px;padding:16px;background:rgba(5,6,10,.78);backdrop-filter:blur(4px);flex-wrap:wrap}
.d-panel.open{display:flex}
.d-panel .pc{width:min(260px,62vw,calc((100vh - 200px) * .716))}
.d-pbox{display:flex;flex-direction:column;gap:10px;min-width:220px;max-width:340px}
.d-pbox h3{font-family:Rajdhani,sans-serif;font-size:24px;text-transform:uppercase;line-height:1}
.d-pbox .why{font-size:14px;color:#ffb3a0}
.d-pbox .hint{font-size:13px;color:#8a93a8;line-height:1.4}
.d-abtn{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);text-align:left;color:#fff}
.d-abtn:hover:not([disabled]){background:rgba(255,179,71,.14);border-color:#ffb347}
.d-abtn[disabled]{opacity:.4;cursor:not-allowed}
.d-abtn .c{font-weight:800;color:#ffd34d;min-width:32px}
.d-abtn .n{flex:1;font-weight:700}
.d-abtn .n i{font-style:normal;font-size:11px;color:#7df9ff;text-transform:uppercase;font-weight:800;margin-left:4px}
.d-abtn .d{font-family:Rajdhani,sans-serif;font-weight:700;font-size:22px;color:#ff8a8a}
.d-banner{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:25;pointer-events:none;font-family:Rajdhani,sans-serif;font-weight:700;font-size:clamp(34px,7vw,64px);letter-spacing:3px;text-transform:uppercase;white-space:nowrap;opacity:0}
.d-banner.go{animation:banner 1.3s ease forwards}
@keyframes banner{15%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-60%)}}
.unit .u-fx{position:absolute;top:4px;right:-11px;display:flex;flex-direction:column;gap:3px;z-index:3}
.fxi{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:12px;line-height:1;background:#0b0d12;border:1.5px solid #3a4252;box-shadow:0 2px 6px rgba(0,0,0,.6);overflow:hidden;flex-shrink:0;cursor:help}
.fxi img,.fxi svg{width:100%;height:100%;object-fit:contain;background:#1b2230}
.fxi.frost{border-color:#38bdf8;background:#0c2a3a}.fxi.schild{border-color:#60a5fa}.fxi.waechter{border-color:#d4a017}.fxi.flink{border-color:#22d3ee}
.fxi.equip{border-color:#ffb347}.fxi.buff{border-color:#ff6a2b}.fxi.pas{border-color:#b26bff}.fxi.nochmal{border-color:#3ddc97}.fxi.neu{opacity:.75}
.d-tip{position:fixed;z-index:220;display:none;max-width:240px;padding:9px 11px;border-radius:10px;background:#151a24;border:1px solid #3a4252;box-shadow:0 8px 24px rgba(0,0,0,.6);font-size:12.5px;line-height:1.4;color:#c3c9d6;pointer-events:none}
.d-tip.on{display:block}
.d-tip b{color:#fff;font-size:13.5px;margin-right:6px}.d-tip em{font-style:normal;font-size:11px;color:#ffb347;font-weight:700}
.fxlist{display:flex;flex-direction:column;gap:6px;max-height:34vh;overflow:auto}
.fxrow{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;line-height:1.35;color:#c3c9d6;background:rgba(255,255,255,.04);border-radius:8px;padding:6px 8px}
.fxrow .fxi{width:26px;height:26px;font-size:14px}
.fxrow b{color:#fff}.fxrow em{font-style:normal;font-size:11px;color:#ffb347;font-weight:700}
.d-btn.burn{background:linear-gradient(135deg,#7a1c08,#c2410c);border-color:#ff6a2b;color:#ffe0c8}
.hcard{touch-action:pan-x}
.hcard.dragging{opacity:.25}
.d-ghost{position:fixed;z-index:210;pointer-events:none;container-type:inline-size;filter:drop-shadow(0 18px 24px rgba(0,0,0,.7))}
.duel.drop-field #dfM,.duel.drop-board .d-field,.duel.drop-board .d-mid{outline:2px dashed rgba(61,220,151,.45);outline-offset:-4px;border-radius:14px}
#dfM.hot{outline:2px solid #3ddc97!important;background:rgba(61,220,151,.07)}
.tgt.hover{transform:scale(1.1)!important}
.d-burn{position:absolute;left:50%;translate:-50% 0;bottom:calc(var(--handH,170px) + 6px);z-index:24;display:none;align-items:center;gap:8px;padding:10px 14px;border-radius:14px;font-size:26px;
  background:radial-gradient(circle at 30% 50%,rgba(255,106,43,.35),rgba(30,10,4,.92));border:2px dashed #ff6a2b;color:#ffcf9c}
.d-burn span{font-size:12px;line-height:1.25}.d-burn b{color:#ffb347}
.d-burn.on{display:flex}
.d-burn.hot{border-style:solid;box-shadow:0 0 30px rgba(255,106,43,.8);transform:scale(1.08)}
.d-burn.puff{display:flex;animation:puff .8s forwards}
@keyframes puff{0%{opacity:1;transform:scale(1.2)}100%{opacity:0;transform:scale(1.6) translateY(-20px)}}
.d-tbar{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:26;display:none;align-items:center;gap:10px;padding:8px 10px 8px 16px;border-radius:12px;background:#1a1410;border:1px solid #ffb347;box-shadow:0 8px 24px rgba(0,0,0,.6);font-weight:700;font-size:14px;white-space:nowrap}
.d-tbar.on{display:flex}
.d-float{position:fixed;z-index:200;pointer-events:none;font-family:Rajdhani,sans-serif;font-weight:700;font-size:30px;text-shadow:0 2px 0 rgba(0,0,0,.6),0 0 12px currentColor;animation:dFloat 1.1s ease-out forwards;transform:translate(-50%,-50%)}
.d-float.dmg{color:#ff4d5e}.d-float.heal{color:#3ddc97}.d-float.shield{color:#93c5fd;font-size:22px}.d-float.frost{color:#7df9ff;font-size:22px}
@keyframes dFloat{0%{opacity:0;transform:translate(-50%,-30%) scale(.6)}15%{opacity:1;transform:translate(-50%,-60%) scale(1.15)}100%{opacity:0;transform:translate(-50%,-160%) scale(1)}}
.hit{animation:hit .35s}
@keyframes hit{20%{transform:translateX(-6px) rotate(-2deg)}40%{transform:translateX(6px) rotate(2deg)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}
.d-log{position:absolute;right:12px;top:50%;transform:translateY(-50%);width:220px;max-height:160px;overflow:hidden;font-size:12px;color:#8a93a8;display:flex;flex-direction:column;gap:3px;pointer-events:none;
  -webkit-mask:linear-gradient(180deg,#000 60%,transparent);mask:linear-gradient(180deg,#000 60%,transparent)}
.d-log div:first-child{color:#e8ebf2}
.d-end{position:absolute;inset:0;z-index:40;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(5,6,10,.85);backdrop-filter:blur(6px);text-align:center;padding:20px}
.d-end.open{display:flex}
.d-end h2{font-family:Rajdhani,sans-serif;font-size:clamp(48px,10vw,96px);line-height:1;text-transform:uppercase;letter-spacing:4px}
.d-end p{color:#c3c9d6;max-width:420px}
.d-end .rw{font-family:Rajdhani,sans-serif;font-weight:700;font-size:28px;color:#ffb347}
@media (max-width:760px){
  .d-row{padding:6px 8px;gap:8px}
  .d-ava{width:34px;height:34px;font-size:17px}
  .d-hpbar{width:64px}
  .d-hn{font-size:14px}
  .d-log{display:none}
  .d-btn{padding:9px 11px;font-size:14px}
  .unit,.d-slot{width:calc((100vw - 52px) / 4)}
  .d-field{gap:8px;padding:2px 6px}
  .hcard{width:84px}
  .d-hand{justify-content:flex-start;padding:4px 8px 8px;gap:4px}
  .d-ort span{font-size:11px}
  .d-ehand{display:none}
}
/* Deck-Baukasten */
.deckb{position:fixed;inset:0;z-index:104;display:none;background:#0b0d12;color:#e8ebf2}
.deckb.open{display:flex}
.db-side{width:330px;flex-shrink:0;display:flex;flex-direction:column;border-right:1px solid #252b3a;background:#10131a}
.db-head{padding:16px;border-bottom:1px solid #252b3a}
.db-head h3{font-family:Rajdhani,sans-serif;font-size:26px;text-transform:uppercase}
.db-count{font-family:Rajdhani,sans-serif;font-weight:700;font-size:20px;margin-top:2px}
.db-count.ok{color:#3ddc97}.db-count.no{color:#ffb347}
.db-mix{font-size:12px;color:#8a93a8;margin-top:4px}
.db-list{flex:1;overflow:auto;padding:8px}
.db-row{display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:8px;border-left:3px solid var(--rc,#aab3c5);background:#161a24;margin-bottom:5px;font-size:13px}
.db-row .k{width:34px;text-align:center;font-weight:800;font-size:12px}
.db-row .k.hp{color:#ff8a8a}.db-row .k.en{color:#7cc8ff}
.db-row .nm{flex:1;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.db-row .x{font-weight:800;color:#ffb347}
.db-row button{width:26px;height:26px;border-radius:7px;background:#252b3a;font-weight:800}
.db-row button:hover{background:#ff4d5e}
.db-foot{display:flex;gap:8px;padding:12px;border-top:1px solid #252b3a;flex-wrap:wrap}
.db-foot .d-btn{flex:1;font-size:14px;padding:10px 8px}
.db-main{flex:1;overflow:auto;padding:16px 20px}
.db-filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;position:sticky;top:-16px;z-index:5;background:#0b0d12;padding:10px 0}
.db-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px}
.db-c{position:relative;cursor:pointer;container-type:inline-size}
.db-c.max{opacity:.45}
.db-c .in{position:absolute;top:-8px;right:-8px;z-index:6;min-width:28px;height:28px;padding:0 7px;border-radius:14px;display:grid;place-items:center;font-family:Rajdhani,sans-serif;font-weight:700;font-size:16px;background:#3ddc97;color:#062014;box-shadow:0 2px 8px rgba(0,0,0,.5)}
.db-c .plus{position:absolute;inset:0;z-index:6;display:grid;place-items:center;opacity:0;transition:opacity .15s;font-size:44px;font-weight:800;color:#fff;text-shadow:0 0 16px #000;pointer-events:none}
.db-c:hover .plus{opacity:1}
.db-empty{color:#8a93a8;font-size:14px;padding:30px 10px;text-align:center}
.db-close{position:absolute;top:12px;right:14px;z-index:10}
@media (max-width:760px){
  .deckb.open{flex-direction:column}
  .db-side{width:auto;max-height:42vh;border-right:none;border-bottom:1px solid #252b3a}
  .db-head{padding:10px 12px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
  .db-head h3{font-size:20px}
  .db-list{padding:6px}
  .db-main{padding:10px 12px}
  .db-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
  .db-foot{padding:8px}
}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  document.body.insertAdjacentHTML("beforeend", `
  <div class="duel" id="duel">
    <div class="d-row" id="dTop"></div>
    <div class="d-field" id="dfE"></div>
    <div class="d-mid"><div class="d-turn" id="dTurn"></div><div id="dOrt"></div><div class="d-log" id="dLog"></div></div>
    <div class="d-field" id="dfM"></div>
    <div class="d-row" id="dBot"></div>
    <div class="d-hand" id="dHand"></div>
    <div class="d-burn" id="dBurn">🔥<span>Hier ablegen: verbrennen<br><b>+1 Energie</b></span></div>
    <div class="d-tip" id="dTip"></div>
    <div class="d-tbar" id="dTbar"><span id="dTtxt">Wähle ein Ziel</span><button class="d-btn" id="dTcancel">Abbrechen</button></div>
    <div class="d-panel" id="dPanel"></div>
    <div class="d-banner" id="dBanner"></div>
    <div class="d-end" id="dEnd"></div>
  </div>
  <div class="deckb" id="deckb"></div>`);

  let sel = null;      // {kind:"hand", hi} oder {kind:"atk", uid, ai}
  let busy = false;    // Animation oder Computer am Zug
  let lastHand = 0;

  function artHTML(id) {
    if (id[0] === "#") { const m = MARKER[id.slice(1)]; return artSVG(m.art); }
    const c = card(id);
    if (c.cut) return `<img class="cut" src="${c.cut}" alt="">`;
    if (c.img) return `<img src="${FOXY_IMG(c.img)}" alt="" style="object-position:50% 20%">`;
    if (c.pic) return `<img class="${c.ort ? "" : "item"}" src="img/${c.pic}.webp" alt="" style="${c.ort ? "" : "background:radial-gradient(circle,#2d4a3e,#0f1512)"}">`;
    return artSVG(c.art);
  }
  const rcol = id => id[0] === "#" ? "var(--common)" : `var(--${card(id).r})`;

  /* Alle Effekte eines Wesens: Symbol, Name, was es macht, wie lange */
  function miniArt(id) {
    const c = card(id);
    if (c.pic) return `<img src="img/${c.pic}.webp" alt="">`;
    if (c.img) return `<img src="${FOXY_IMG(c.img)}" alt="" style="object-fit:cover">`;
    return artSVG(c.art);
  }
  function fxList(u) {
    const L = [];
    if (u.neu) L.push({ ic: "💤", cls: "neu", n: "Gerade gerufen", t: "Kann noch nicht angreifen.", d: "bis zu deinem nächsten Zug" });
    if (u.gesperrt) L.push({ ic: "❄️", cls: "frost", n: "Eingefroren", t: "Kann nicht angreifen.", d: "diese Runde" });
    else if (u.frost > 0) L.push({ ic: "❄️", cls: "frost", n: "Eingefroren", t: "Kann nicht angreifen.", d: "nächste Runde" });
    if (u.schild) L.push({ ic: "🛡️", cls: "schild", n: "Schild", t: "Blockt den nächsten Treffer komplett.", d: "bis zum nächsten Treffer" });
    if (u.waechter) L.push({ ic: "🏰", cls: "waechter", n: "Wächter", t: "Gegner müssen zuerst dieses Wesen angreifen.", d: "dauerhaft" });
    if (u.flink) L.push({ ic: "💨", cls: "flink", n: "Flink", t: "Darf den Gegner direkt angreifen, auch wenn Wesen im Weg sind.", d: "dauerhaft" });
    if (u.nochmal) L.push({ ic: "🔁", cls: "nochmal", n: "Nochmal", t: "Darf diese Runde ein zweites Mal angreifen.", d: "diese Runde" });
    if (u.pas && PASSIV[u.pas] && !(u.pas === "untot" && u.auferstanden)) L.push({ ic: "✨", cls: "pas", n: "Fähigkeit", t: PASSIV[u.pas], d: u.pas === "untot" ? "einmal" : "dauerhaft" });
    u.equip.forEach(e => L.push({ img: e, cls: "equip", n: card(e).name, t: fxText(W[e]).replace(/^An ein eigenes Wesen: /, ""), d: "dauerhaft" }));
    u.buffs.forEach(e => L.push({ img: e, cls: "buff", n: card(e).name, t: fxText(W[e]).replace(/^Ein eigenes Wesen /, ""), d: "dauerhaft" }));
    return L;
  }
  const fxChip = (f, i) => `<span class="fxi ${f.cls}" data-tip="${i}">${f.img ? miniArt(f.img) : f.ic}</span>`;
  const fxRows = u => fxList(u).map(f => `<div class="fxrow"><span class="fxi ${f.cls}">${f.img ? miniArt(f.img) : f.ic}</span><div><b>${esc(f.n)}</b> <em>${esc(f.d)}</em><br>${esc(f.t)}</div></div>`).join("");
  function unitHTML(u, extra) {
    const best = Math.max(...u.atk.map(a => atkDmg(u, a)));
    const b = fxList(u).map(fxChip);
    return `<div class="unit ${extra || ""}${u.schild ? " shielded" : ""}${u.gesperrt ? " frozen" : ""}" data-u="${u.uid}" style="--rc:${rcol(u.id)}">
      <div class="u-art">${artHTML(u.id)}</div>
      <div class="u-name">${esc(u.name)}</div>
      <div class="u-stats"><span class="u-hp${u.hp <= 2 ? " low" : ""}">❤ ${u.hp}</span><span class="u-atk">⚔ ${best}</span></div>
      <div class="u-fx">${b.join("")}</div>
    </div>`;
  }
  function heroHTML(pi) {
    const P = S.p[pi], en = [];
    for (let i = 0; i < Math.max(P.maxE, P.energie); i++) en.push(`<i class="${i < P.energie ? "on" : ""}"></i>`);
    return `<div class="d-hero ${pi ? "enemy" : "me"}" data-h="${pi}">
      <div class="d-ava">${pi ? "😈" : "🦊"}</div>
      <div><div class="d-hn">${esc(P.name)}</div>
        <div class="d-hp"><div class="d-hpbar"><i style="width:${Math.max(0, P.hp) / R.leben * 100}%"></i></div><span class="d-hpn">❤ ${Math.max(0, P.hp)}</span></div>
        <div class="d-sub">Deck ${P.deck.length} · Hand ${P.hand.length}</div></div>
    </div><div class="d-en">${en.join("")}<b>${P.energie}</b></div>`;
  }
  function render() {
    const me = S.p[0], ai = S.p[1];
    const myTurn = S.cur === 0 && S.over == null;
    const tg = targetSet();
    const mark = (ref, ally) => tg && tg.includes(ref) ? ` tgt${ally ? " ally" : ""}` : "";
    $("dTop").innerHTML = heroHTML(1).replace('class="d-hero enemy"', `class="d-hero enemy${mark("h1")}"`) +
      `<div class="d-ehand">${ai.hand.map(() => "<i></i>").join("")}</div><div class="d-sp"></div><button class="d-btn" id="dQuit">Aufgeben</button>`;
    const slots = (P, pi) => {
      const h = P.feld.map(u => {
        let cls = mark("u" + u.uid, pi === 0 && sel && sel.kind === "hand");
        if (pi === 0 && myTurn && !tg) cls += canAct(u) && u.atk.some(a => atkCost(u, a) <= me.energie) ? " ready" : (u.angegriffen || u.neu) ? " done" : "";
        if (sel && sel.kind === "atk" && sel.uid === u.uid) cls += " sel";
        return unitHTML(u, cls);
      });
      for (let i = P.feld.length; i < R.feldPlaetze; i++) h.push('<div class="d-slot"></div>');
      return h.join("");
    };
    $("dfE").innerHTML = slots(ai, 1);
    $("dfM").innerHTML = slots(me, 0);
    $("dTurn").textContent = S.over != null ? "Ende" : `Runde ${Math.ceil(S.runde / 2)} · ${myTurn ? "Dein Zug" : ai.name + " ist dran"}`;
    if (S.ort) {
      const c = card(S.ort.id), w = W[S.ort.id];
      $("dOrt").innerHTML = `<div class="d-ort" data-ort="1">${c.pic ? `<img src="img/${c.pic}.webp" alt="">` : artSVG(c.art)}<div><b>${esc(c.name)}</b><span>${esc(ORTE[w.ort])}</span></div></div>`;
    } else $("dOrt").innerHTML = `<div class="d-ort none">Kein Ort · Orte verändern das Spielfeld</div>`;
    $("dLog").innerHTML = S.log.slice(0, 8).map(l => `<div>${esc(l)}</div>`).join("");
    const anyMove = myTurn && (me.hand.some(id => !whyNotPlay(0, id)) || me.feld.some(u => canAct(u) && u.atk.some(a => atkCost(u, a) <= me.energie)));
    $("dBot").innerHTML = heroHTML(0).replace('class="d-hero me"', `class="d-hero me${mark("h0", true)}"`) +
      `<div class="d-sp"></div><button class="d-btn hot${!anyMove && myTurn ? " pulse" : ""}" id="dEndT" ${myTurn && !busy ? "" : "disabled"}>Zug beenden</button>`;
    const newCount = Math.max(0, me.hand.length - lastHand);
    $("dHand").innerHTML = me.hand.map((id, hi) => {
      const ok = myTurn && !whyNotPlay(0, id);
      return `<div class="hcard${ok ? "" : " no"}${hi >= me.hand.length - newCount ? " new" : ""}" data-hi="${hi}">${cardHTML(card(id), false)}${ok && W[id].t !== "wesen" ? '<div class="cost-glow"></div>' : ""}</div>`;
    }).join("");
    lastHand = me.hand.length;
    $("duel").style.setProperty("--handH", $("dHand").offsetHeight + "px");
    $("dQuit").onclick = () => { if (confirmQuit()) finish(1); };
    $("dEndT").onclick = () => { if (!busy && S.cur === 0) { cancelSel(); endTurn(); afterAction(); } };
  }
  let quitArmed = 0;
  function confirmQuit() {
    if (Date.now() - quitArmed < 2500) return true;
    quitArmed = Date.now(); $("dQuit").textContent = "Wirklich?"; return false;
  }
  function targetSet() {
    if (!sel) return null;
    if (sel.kind === "hand") return playTargets(0, S.p[0].hand[sel.hi]);
    if (sel.kind === "atk") { const u = findU(sel.uid); return u ? atkTargets(u, u.atk[sel.ai]) : null; }
    return null;
  }

  /* ---- Effekte (Zahlen, Wackeln) ---- */
  function rectOf(ref) {
    const el = ref[0] === "h" ? document.querySelector(`#duel [data-h="${ref.slice(1)}"]`) : document.querySelector(`#duel [data-u="${ref.slice(1)}"]`);
    return el ? { el, r: el.getBoundingClientRect() } : null;
  }
  function flushFx(before) {
    const list = S.fx.splice(0);
    const seen = {};
    list.forEach(f => {
      const now = rectOf(f.ref), r = now ? now.r : before[f.ref];
      if (!r) return;
      const k = (seen[f.ref] = (seen[f.ref] || 0) + 1);
      const d = document.createElement("div");
      d.className = "d-float " + f.cls; d.textContent = f.txt;
      d.style.left = (r.left + r.width / 2) + "px"; d.style.top = (r.top + r.height * .4 - (k - 1) * 26) + "px";
      document.body.appendChild(d); setTimeout(() => d.remove(), 1200);
      if (now && f.cls === "dmg") { now.el.classList.remove("hit"); void now.el.offsetWidth; now.el.classList.add("hit"); }
      if (window.__sfx) window.__sfx(f.cls === "dmg" ? "hit" : f.cls === "heal" ? "heal" : "tap");
    });
  }
  function snapshot() {
    const m = {};
    document.querySelectorAll("#duel [data-u]").forEach(el => m["u" + el.dataset.u] = el.getBoundingClientRect());
    document.querySelectorAll("#duel [data-h]").forEach(el => m["h" + el.dataset.h] = el.getBoundingClientRect());
    return m;
  }
  function banner(t, c) {
    const b = $("dBanner"); b.textContent = t; b.style.color = c; b.style.textShadow = `0 0 30px ${c}`;
    b.classList.remove("go"); void b.offsetWidth; b.classList.add("go");
  }
  function lunge(uid, targetRef) {
    return new Promise(res => {
      const a = document.querySelector(`#duel [data-u="${uid}"]`), t = targetRef && rectOf(targetRef);
      if (!a || !t) return res();
      const ra = a.getBoundingClientRect();
      const dx = (t.r.left + t.r.width / 2 - ra.left - ra.width / 2) * .7, dy = (t.r.top + t.r.height / 2 - ra.top - ra.height / 2) * .7;
      a.classList.add("lunge"); a.style.transform = `translate(${dx}px,${dy}px) scale(1.08)`;
      setTimeout(res, 230);
    });
  }
  function afterAction() {
    const before = snapshot();
    render(); flushFx(before);
    if (S.over != null) { setTimeout(() => finish(S.over), 700); return; }
    if (S.cur === 1 && !busy) runAi();
  }

  /* ---- Spieler-Eingaben ---- */
  function cancelSel() { sel = null; $("dTbar").classList.remove("on"); $("dPanel").classList.remove("open"); }
  function openPanel(html) { $("dPanel").innerHTML = html; $("dPanel").classList.add("open"); }
  function showHandCard(hi) {
    const id = S.p[0].hand[hi], w = W[id], why = whyNotPlay(0, id), c = card(id);
    const tgt = playTargets(0, id);
    openPanel(`<div class="pc">${cardHTML(c, false)}</div><div class="d-pbox"><h3>${esc(c.name)}</h3>
      ${why ? `<div class="why">${esc(why)}</div>` : `<div class="hint">${w.t === "wesen" ? "Kostenlos rufen (1 Wesen pro Runde). Es kann ab nächster Runde angreifen." : `Kostet ${cardCost(0, id)} Energie.${tgt ? " Danach wählst du ein Ziel." : ""}`}</div>`}
      <button class="d-btn hot" id="pPlay" ${why ? "disabled" : ""}>${w.t === "wesen" ? "Aufs Feld rufen" : "Ausspielen"}</button>
      <button class="d-btn burn" id="pBurn" ${whyNotBurn(0) ? "disabled" : ""}>🔥 Verbrennen: +${BURN_ENERGIE} Energie</button>
      <div class="hint">${whyNotBurn(0) || "1× pro Runde. Die Karte ist danach weg. Tipp: Karten kannst du auch aufs Feld ziehen."}</div>
      <button class="d-btn" id="pX">Zurück</button></div>`);
    $("pX").onclick = cancelSel;
    $("pBurn").onclick = () => doBurn(hi);
    $("pPlay").onclick = () => {
      $("dPanel").classList.remove("open");
      if (tgt) { sel = { kind: "hand", hi }; $("dTtxt").textContent = "Wähle ein Ziel"; $("dTbar").classList.add("on"); render(); return; }
      doPlay(hi, null);
    };
  }
  function showUnit(u) {
    const mine = u.owner === 0, P = S.p[0];
    const why = mine ? whyNotAct(u) : "";
    const c = u.tok ? null : card(u.id);
    const info = `<div class="hint">❤ ${u.hp} / ${u.max}${u.plusSchaden ? ` · +${u.plusSchaden} Schaden` : ""}${u.billiger ? ` · Angriffe -${u.billiger}` : ""}${u.weniger ? ` · nimmt ${u.weniger} weniger` : ""}</div>${fxList(u).length ? `<div class="fxlist">${fxRows(u)}</div>` : ""}`;
    const btns = mine ? u.atk.map((a, i) => {
      const cost = atkCost(u, a), dis = why || P.energie < cost;
      return `<button class="d-abtn" data-ai="${i}" ${dis ? "disabled" : ""}><span class="c">⚡${cost}</span><span class="n">${esc(a[0])}${a[3] ? `<i>${({ frost: "Frost", alle: "Alle", kette: "Kette", saugen: "Saugen", schild: "Schild" })[a[3]]}</i>` : ""}</span><span class="d">${atkDmg(u, a)}</span></button>`;
    }).join("") : "";
    openPanel(`<div class="pc">${c ? cardHTML(c, false) : unitHTML(u)}</div><div class="d-pbox"><h3>${esc(u.name)}</h3>${info}
      ${mine ? (why ? `<div class="why">${esc(why)}</div>` : `<div class="hint">Wähle einen Angriff:</div>`) : `<div class="hint">Gegnerisches Wesen</div>`}
      ${btns}<button class="d-btn" id="pX">Zurück</button></div>`);
    $("pX").onclick = cancelSel;
    document.querySelectorAll("#dPanel [data-ai]").forEach(b => b.onclick = () => {
      const ai = +b.dataset.ai, a = u.atk[ai];
      $("dPanel").classList.remove("open");
      if (a[3] === "alle") { doAttack(u.uid, ai, null); return; }
      sel = { kind: "atk", uid: u.uid, ai }; $("dTtxt").textContent = `${a[0]}: Wähle ein Ziel`; $("dTbar").classList.add("on"); render();
    });
  }
  function doPlay(hi, target) {
    const id = S.p[0].hand[hi];
    cancelSel();
    if (play(0, hi, target)) {
      const w = W[id];
      if (window.__sfx) window.__sfx(w.t === "wesen" ? "deal" : "rare");
      afterAction();
      if (w.t === "wesen") { const els = document.querySelectorAll("#dfM .unit"); els[els.length - 1]?.classList.add("enter"); }
      if (w.t === "ort") banner(card(id).name, "#ffcf9c");
    } else render();
  }
  function doBurn(hi) {
    cancelSel();
    if (burn(0, hi)) { if (window.__sfx) window.__sfx("tear"); afterAction(); burnFlash(); } else render();
  }
  function burnFlash() { const z = $("dBurn"); z.classList.remove("puff"); void z.offsetWidth; z.classList.add("puff"); }
  async function doAttack(uid, ai, target) {
    cancelSel(); busy = true; render();
    await lunge(uid, target || ("h1"));
    attack(uid, ai, target);
    if (window.__sfx) window.__sfx("tear");
    busy = false; afterAction();
  }
  $("duel").addEventListener("click", e => {
    if (!S || busy || S.over != null || justDragged) return;
    if (e.target.closest("#dPanel,#dTbar,#dEnd,#dQuit,#dEndT")) return;
    const uEl = e.target.closest("[data-u]"), hEl = e.target.closest("[data-h]"), hc = e.target.closest(".hcard"), ortEl = e.target.closest("[data-ort]");
    const ref = uEl ? "u" + uEl.dataset.u : hEl ? "h" + hEl.dataset.h : null;
    const tg = targetSet();
    if (sel && tg) {
      if (ref && tg.includes(ref)) { if (sel.kind === "hand") doPlay(sel.hi, ref); else doAttack(sel.uid, sel.ai, ref); }
      return;
    }
    if (ortEl && S.ort) { openPanel(`<div class="pc">${cardHTML(card(S.ort.id), false)}</div><div class="d-pbox"><h3>${esc(card(S.ort.id).name)}</h3><div class="hint">Gelegt von: ${esc(S.p[S.ort.owner].name)}. Gilt für beide, bis ein neuer Ort kommt.</div><button class="d-btn" id="pX">Zurück</button></div>`); $("pX").onclick = cancelSel; return; }
    if (hc) { showHandCard(+hc.dataset.hi); return; }
    if (uEl) { const u = findU(+uEl.dataset.u); if (u) showUnit(u); }
  });
  $("dTcancel").onclick = () => { cancelSel(); render(); };

  /* ---- Tooltip für Effekt-Symbole ---- */
  $("duel").addEventListener("pointerover", e => {
    const c = e.target.closest(".fxi[data-tip]"); const tip = $("dTip");
    if (!c || e.pointerType === "touch") { tip.classList.remove("on"); return; }
    const u = findU(+c.closest("[data-u]").dataset.u); const f = u && fxList(u)[+c.dataset.tip];
    if (!f) return;
    tip.innerHTML = `<b>${esc(f.n)}</b><em>${esc(f.d)}</em><div>${esc(f.t)}</div>`;
    const r = c.getBoundingClientRect(); tip.classList.add("on");
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(innerWidth - tw - 8, r.right + 8)) + "px";
    tip.style.top = Math.max(8, Math.min(innerHeight - th - 8, r.top - 4)) + "px";
  });
  $("duel").addEventListener("pointerout", e => { if (e.target.closest(".fxi")) $("dTip").classList.remove("on"); });

  /* ---- Karten aus der Hand ziehen ---- */
  let drag = null, justDragged = false;
  $("dHand").addEventListener("pointerdown", e => {
    const hc = e.target.closest(".hcard");
    if (!hc || !S || busy || S.cur !== 0 || S.over != null || e.button > 0) return;
    drag = { hi: +hc.dataset.hi, x: e.clientX, y: e.clientY, el: hc, on: false };
  });
  document.addEventListener("pointermove", e => {
    if (!drag) return;
    if (!drag.on) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 10) return;
      drag.on = true; cancelSel();
      const id = S.p[0].hand[drag.hi], w = W[id];
      const r = drag.el.getBoundingClientRect();
      const g = drag.el.cloneNode(true); g.className = "d-ghost"; g.style.width = r.width + "px";
      document.body.appendChild(g); drag.g = g; drag.ox = e.clientX - r.left; drag.oy = e.clientY - r.top;
      drag.el.classList.add("dragging");
      drag.ok = !whyNotPlay(0, id);
      drag.tgts = drag.ok ? playTargets(0, id) : null;
      if (drag.ok && drag.tgts) { sel = { kind: "hand", hi: drag.hi }; render(); drag.el = document.querySelector(`#dHand [data-hi="${drag.hi}"]`); drag.el && drag.el.classList.add("dragging"); }
      if (drag.ok && !drag.tgts) $("duel").classList.add(w.t === "wesen" ? "drop-field" : "drop-board");
      $("dBurn").classList.toggle("on", !whyNotBurn(0));
    }
    drag.g.style.left = (e.clientX - drag.ox) + "px"; drag.g.style.top = (e.clientY - drag.oy) + "px";
    drag.g.style.transform = `rotate(${Math.max(-12, Math.min(12, (e.clientX - drag.x) / 25))}deg) scale(1.05)`;
    const over = dropAt(e.clientX, e.clientY);
    $("dBurn").classList.toggle("hot", over.kind === "burn");
    $("dfM").classList.toggle("hot", over.kind === "field");
    document.querySelectorAll("#duel .tgt.hover").forEach(x => x.classList.remove("hover"));
    if (over.kind === "target") over.el.classList.add("hover");
  });
  function dropAt(x, y) {
    if (drag.g) drag.g.style.display = "none";
    const el = document.elementFromPoint(x, y);
    if (drag.g) drag.g.style.display = "";
    if (!el) return {};
    if (el.closest("#dBurn") && $("dBurn").classList.contains("on")) return { kind: "burn" };
    if (!drag.ok) return {};
    if (drag.tgts) {
      const t = el.closest("[data-u],[data-h]"); if (!t) return {};
      const ref = t.dataset.u ? "u" + t.dataset.u : "h" + t.dataset.h;
      return drag.tgts.includes(ref) ? { kind: "target", ref, el: t } : {};
    }
    const w = W[S.p[0].hand[drag.hi]];
    if (w.t === "wesen") return el.closest("#dfM,#dBot") ? { kind: "field" } : {};
    return el.closest(".d-field,.d-mid,#dTop,#dBot") ? { kind: "field" } : {};
  }
  function endDrag(e, cancel) {
    if (!drag) return;
    const d = drag;
    if (d.on) {
      const over = cancel ? {} : dropAt(e.clientX, e.clientY);
      d.g.remove(); $("duel").classList.remove("drop-field", "drop-board"); $("dBurn").classList.remove("on", "hot"); $("dfM").classList.remove("hot");
      drag = null; justDragged = true; setTimeout(() => justDragged = false, 50);
      if (over.kind === "burn") doBurn(d.hi);
      else if (over.kind === "target") doPlay(d.hi, over.ref);
      else if (over.kind === "field") doPlay(d.hi, null);
      else { cancelSel(); render(); }
    } else drag = null;
  }
  document.addEventListener("pointerup", e => endDrag(e));
  document.addEventListener("pointercancel", e => endDrag(e, true));
  $("dPanel").addEventListener("click", e => { if (e.target === $("dPanel")) { cancelSel(); render(); } });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && S && $("duel").classList.contains("open")) { cancelSel(); render(); } });

  /* ---- Computer spielt ---- */
  async function runAi() {
    busy = true; render();
    await wait(700);
    for (let guard = 0; guard < 30 && S.cur === 1 && S.over == null; guard++) {
      const a = aiNext();
      if (!a) break;
      if (a.k === "burn") {
        const id = S.p[1].hand[a.hi];
        if (!burn(1, a.hi)) break;
        const before = snapshot(); render(); flushFx(before);
        banner(`🔥 ${card(id).name}`, "#ff8a3c"); if (window.__sfx) window.__sfx("tear");
      } else if (a.k === "play") {
        const id = S.p[1].hand[a.hi];
        if (!play(1, a.hi, a.t || null)) break;
        const before = snapshot(); render(); flushFx(before);
        if (W[id].t === "ort") banner(card(id).name, "#ffcf9c");
        else if (W[id].t !== "wesen") banner(card(id).name, "#d6b4ff");
        if (window.__sfx) window.__sfx(W[id].t === "wesen" ? "deal" : "rare");
      } else {
        await lunge(a.uid, a.t || "h0");
        if (!attack(a.uid, a.ai, a.t || null)) break;
        if (window.__sfx) window.__sfx("tear");
        const before = snapshot(); render(); flushFx(before);
      }
      await wait(750);
    }
    busy = false;
    if (S.over != null) { render(); setTimeout(() => finish(S.over), 600); return; }
    endTurn();
    const before = snapshot(); render(); flushFx(before);
    if (S.over != null) { setTimeout(() => finish(S.over), 600); return; }
    banner("Dein Zug", "#ffb347");
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ---- Ende ---- */
  function finish(winner) {
    if (!S || S.done) return;
    S.done = true; S.over = winner; busy = false; cancelSel();
    let rw = "";
    if (winner === 0) {
      const k = "glutwerk-duell-" + new Date().toISOString().slice(0, 10);
      const n = +store(k) || 0;
      if (n < R.siegeProTag) {
        store(k, String(n + 1));
        store("glutwerk-glut", String((parseInt(store("glutwerk-glut") || "0", 10) || 0) + R.siegGlut));
        rw = `<div class="rw">+${R.siegGlut} Glut</div><p>Noch ${R.siegeProTag - n - 1}× heute gibt es Glut für einen Sieg.</p>`;
      } else rw = `<p>Für heute gab es schon genug Glut für Siege. Morgen wieder!</p>`;
      if (window.__sfx) window.__sfx("legendary");
    }
    $("dEnd").innerHTML = `<h2 style="color:${winner === 0 ? "#ffb347" : winner === 1 ? "#ff4d5e" : "#c3c9d6"}">${winner === 0 ? "Sieg!" : winner === 1 ? "Niederlage" : "Unentschieden"}</h2>
      ${winner === 1 ? "<p>Bau dein Deck um und versuch es nochmal.</p>" : ""}${rw}
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="d-btn" id="eBack">Zurück</button><button class="d-btn hot" id="eAgain">Nochmal</button></div>`;
    $("dEnd").classList.add("open");
    $("eBack").onclick = closeDuel;
    $("eAgain").onclick = () => { $("dEnd").classList.remove("open"); startDuel(); };
    if (typeof renderGlut === "function") renderGlut("bump");
  }
  function closeDuel() {
    $("duel").classList.remove("open"); $("dEnd").classList.remove("open");
    document.body.style.overflow = ""; S = null; renderArena();
  }

  /* =========================================================
     DECK
     ========================================================= */
  const ownedCount = id => { const o = (typeof own === "function") ? own(id) : { n: 0, f: 0 }; return o.n + o.f; };
  const maxCopies = id => Math.min(ownedCount(id), ["legendary", "mythic"].includes(card(id).r) ? R.maxKopienSelten : R.maxKopien);
  function loadDeck() {
    let d = [];
    try { d = JSON.parse(store("glutwerk-deck") || "[]") || []; } catch (e) { d = []; }
    const cnt = {};
    return d.filter(id => W[id] && card(id) && (cnt[id] = (cnt[id] || 0) + 1) <= maxCopies(id));
  }
  const saveDeck = d => store("glutwerk-deck", JSON.stringify(d));
  const deckReady = d => d.length === R.deckGroesse;

  function startDuel() {
    const mine = loadDeck();
    const deck = deckReady(mine) ? mine : STARTERDECK;
    const g = rnd(GEGNER_DECKS);
    start(deck, g.deck, g.name);
    sel = null; busy = false; lastHand = 0;
    $("duel").classList.add("open"); document.body.style.overflow = "hidden";
    if (typeof audio === "function") audio();
    render();
    banner(S.cur === 0 ? "Du beginnst!" : `${g.name} beginnt`, "#ffb347");
    if (S.cur === 1) setTimeout(runAi, 900);
  }

  /* ---- Baukasten ---- */
  let dbFilter = "alle", deckDraft = [];
  function openBuilder() {
    deckDraft = loadDeck();
    $("deckb").classList.add("open"); document.body.style.overflow = "hidden";
    renderBuilder();
  }
  function renderBuilder() {
    const cnt = {}; deckDraft.forEach(id => cnt[id] = (cnt[id] || 0) + 1);
    const ok = deckReady(deckDraft);
    const typ = { wesen: 0, zauber: 0, ausr: 0, ort: 0 }; deckDraft.forEach(id => typ[W[id].t]++);
    const rows = Object.keys(cnt).sort((a, b) => ["wesen", "zauber", "ausr", "ort"].indexOf(W[a].t) - ["wesen", "zauber", "ausr", "ort"].indexOf(W[b].t) || card(a).name.localeCompare(card(b).name))
      .map(id => { const w = W[id]; return `<div class="db-row" style="--rc:var(--${card(id).r})"><span class="k ${w.t === "wesen" ? "hp" : "en"}">${w.t === "wesen" ? "❤" + w.hp : "⚡" + w.kosten}</span><span class="nm">${esc(card(id).name)}</span><span class="x">${cnt[id]}×</span><button data-rm="${id}">−</button></div>`; }).join("");
    const pool = CARDS.filter(c => W[c.id] && ownedCount(c.id) > 0 && (dbFilter === "alle" || W[c.id].t === dbFilter));
    const chip = (k, l) => `<button class="chip${dbFilter === k ? " on" : ""}" data-dbf="${k}">${l}</button>`;
    $("deckb").innerHTML = `
      <div class="db-side">
        <div class="db-head"><h3>Dein Deck</h3><div class="db-count ${ok ? "ok" : "no"}">${deckDraft.length} / ${R.deckGroesse} Karten${ok ? " ✓" : ""}</div>
          <div class="db-mix">${typ.wesen} Wesen · ${typ.zauber} Zauber · ${typ.ausr} Ausrüstung · ${typ.ort} Orte</div></div>
        <div class="db-list">${rows || `<div class="db-empty">Klick rechts auf Karten, um sie ins Deck zu legen.<br><br>Max. ${R.maxKopien}× pro Karte, legendäre und mythische nur 1×.</div>`}</div>
        <div class="db-foot"><button class="d-btn" id="dbAuto">Auffüllen</button><button class="d-btn" id="dbClear">Leeren</button><button class="d-btn hot" id="dbDone">Fertig</button></div>
      </div>
      <div class="db-main">
        <div class="db-filters">${chip("alle", "Alle")}${chip("wesen", "Wesen")}${chip("zauber", "Zauber")}${chip("ausr", "Ausrüstung")}${chip("ort", "Orte")}</div>
        <div class="db-grid">${pool.length ? pool.map(c => { const n = cnt[c.id] || 0, full = n >= maxCopies(c.id) || deckDraft.length >= R.deckGroesse; return `<div class="db-c${full ? " max" : ""}" data-add="${c.id}">${cardHTML(c, false)}${n ? `<span class="in">${n}</span>` : ""}${full ? "" : '<span class="plus">+</span>'}</div>`; }).join("") : `<div class="db-empty" style="grid-column:1/-1">Du hast noch keine Karten dieser Art. Öffne Packs!</div>`}</div>
      </div>`;
    $("deckb").querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { deckDraft.splice(deckDraft.lastIndexOf(b.dataset.rm), 1); renderBuilder(); });
    $("deckb").querySelectorAll("[data-add]").forEach(b => b.onclick = () => {
      const id = b.dataset.add, n = deckDraft.filter(x => x === id).length;
      if (n >= maxCopies(id) || deckDraft.length >= R.deckGroesse) return;
      deckDraft.push(id); renderBuilder();
    });
    $("deckb").querySelectorAll("[data-dbf]").forEach(b => b.onclick = () => { dbFilter = b.dataset.dbf; renderBuilder(); });
    $("dbClear").onclick = () => { deckDraft = []; renderBuilder(); };
    $("dbAuto").onclick = () => {
      // füllt mit den stärksten eigenen Karten auf, ca. 12 Wesen
      const pool = CARDS.filter(c => W[c.id] && ownedCount(c.id)).map(c => c.id);
      const score = id => { const w = W[id], r = ["common", "rare", "epic", "legendary", "mythic"].indexOf(card(id).r); return w.t === "wesen" ? w.hp + Math.max(...w.atk.map(a => a[2])) * 2 + r * 2 : 6 + r * 2; };
      const wantW = 12;
      const add = filt => pool.filter(filt).sort((a, b) => score(b) - score(a)).forEach(id => {
        while (deckDraft.length < R.deckGroesse && deckDraft.filter(x => x === id).length < maxCopies(id) &&
          (W[id].t !== "wesen" || deckDraft.filter(x => W[x].t === "wesen").length < wantW || !pool.some(p => W[p].t !== "wesen" && deckDraft.filter(x => x === p).length < maxCopies(p)))) deckDraft.push(id);
      });
      const orte = () => deckDraft.filter(x => W[x].t === "ort").length;
      add(id => W[id].t === "wesen"); add(id => W[id].t === "zauber" || W[id].t === "ausr");
      add(id => W[id].t === "ort" && orte() < 2); add(() => true);
      renderBuilder();
    };
    $("dbDone").onclick = () => { saveDeck(deckDraft); $("deckb").classList.remove("open"); document.body.style.overflow = ""; renderArena(); };
  }

  /* ---- Bereich auf der Seite ---- */
  function renderArena() {
    const el = $("arena"); if (!el) return;
    const d = loadDeck(), ok = deckReady(d);
    const k = "glutwerk-duell-" + new Date().toISOString().slice(0, 10), wins = +store(k) || 0;
    el.querySelector("#arDeck").innerHTML = ok ? `Dein Deck: <b style="color:#3ddc97">${d.length} / ${R.deckGroesse} ✓</b>` :
      `Dein Deck: <b style="color:#ffb347">${d.length} / ${R.deckGroesse}</b> · bis es voll ist, spielst du mit dem <b>Starterdeck</b>`;
    el.querySelector("#arWins").textContent = `Siege heute: ${Math.min(wins, R.siegeProTag)} / ${R.siegeProTag} (je +${R.siegGlut} Glut)`;
  }
  window.Duell = { startDuel, openBuilder, renderArena };
  document.addEventListener("click", e => {
    if (e.target.closest("#arPlay")) startDuel();
    if (e.target.closest("#arDeckBtn")) openBuilder();
    if (e.target.closest("#arRules")) $("arRulesBox").classList.toggle("open");
  });
  renderArena();

  /* Testhilfe: Computer gegen Computer (in der Konsole: Duell.sim(100)) */
  window.Duell.sim = function (n) {
    const res = { a: 0, b: 0, d: 0, runden: 0, fehler: 0 };
    for (let i = 0; i < (n || 50); i++) {
      try {
        start(rnd(GEGNER_DECKS).deck, rnd(GEGNER_DECKS).deck, "KI"); S.p[0].ki = true;
        let g = 0;
        while (S.over == null && g++ < 400) {
          let a, s = 0;
          while ((a = aiNext()) && s++ < 30 && S.over == null) { if (a.k === "burn") { if (!burn(S.cur, a.hi)) break; } else if (a.k === "play") { if (!play(S.cur, a.hi, a.t || null)) break; } else if (!attack(a.uid, a.ai, a.t || null)) break; }
          if (S.over == null) endTurn();
          S.fx.length = 0;
        }
        res.runden += S.runde; if (S.over === 0) res.a++; else if (S.over === 1) res.b++; else res.d++;
      } catch (e) { res.fehler++; console.error(e); }
    }
    res.runden = Math.round(res.runden / (n || 50)); S = null; return res;
  };
})();
