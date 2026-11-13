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
  const Lx = (de, en) => (window.L ? window.L(de, en) : de);
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
  const mkPlayer = (name, deck, ki) => ({ name, ki, hp: R.leben, deck: shuffle(deck.slice()), hand: [], feld: [], energie: 0, maxE: 0, grab: [], beschworen: 0, verbrannt: false, zieh: 0 });
  const foe = pi => 1 - pi;
  const ortIs = k => S.ort && W[S.ort.id].ort === k;
  const log = t => { S.log.unshift(t); S.log.length = Math.min(S.log.length, 30); };
  const ev = (ref, txt, cls) => S.fx.push({ ref, txt, cls });

  function start(deckMe, deckAi, aiName) {
    UID = 0;
    S = { p: [mkPlayer(Lx("Du", "You"), deckMe, false), mkPlayer(aiName, deckAi, true)], cur: 0, runde: 0, ort: null, log: [], fx: [], over: null, look: { feld: "glut", ruecken: ["glut", "schatten"] } };
    const first = Math.random() < .5 ? 0 : 1;
    for (let i = 0; i < R.startHand; i++) { draw(first, true); draw(foe(first), true); }
    draw(foe(first), true);
    log(first === 0 ? Lx("Du beginnst.", "You go first.") : Lx(`${aiName} beginnt.`, `${aiName} goes first.`));
    beginTurn(first);
  }
  function draw(pi, quiet) {
    const P = S.p[pi];
    if (!P.deck.length) return;   // Deck leer: es gibt einfach nichts mehr zu ziehen
    if (P.hand.length >= 9) { P.deck.pop(); if (!quiet) log(Lx(`${P.name}: Hand voll, Karte verbrannt.`, `${P.name}: hand full, card burned.`)); return; }
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
    if (ortIs("becken")) P.feld.forEach(u => { heal(u, 1); u.frost = 0; u.gesperrt = false; });
    if (ortIs("baum")) { P.feld.forEach(u => heal(u, 1)); healHero(pi, 1); }
    if (ortIs("riss") && S.p[foe(pi)].feld.length) { const u = rnd(S.p[foe(pi)].feld); hurt(u, 2); log(Lx(`Der Riss trifft ${u.name}.`, `The rift hits ${u.name}.`)); }
    P.feld.slice().forEach(u => {
      if (u.pas === "brut" && P.feld.length < R.feldPlaetze) { const a = mkUnit("#ameise", pi); a.neu = false; P.feld.push(a); log(Lx("Eine Ameise schlüpft und kann sofort angreifen.", "An ant hatches and can attack right away.")); }
      if (u.pas === "honig") healHero(pi, 1);
      if (u.pas === "schuld") { hurtHero(foe(pi), 1); log(Lx(`${u.name} treibt 1 Leben Schulden ein.`, `${u.name} collects 1 HP of debt.`)); }
      if (u.pas === "kuh") P.feld.forEach(x => heal(x, 1));
      if (u.pas === "nachwuchs" && P.feld.length < R.feldPlaetze) { P.feld.push(mkUnit("#babyguppy", pi)); log(Lx("Ein Baby-Guppy schlüpft.", "A baby guppy is born.")); }
      if (u.pas === "wachstum") { u.max += 1; heal(u, 1); }
    });
    if (ortIs("zelle")) hurtHero(pi, 1);
    const n = 1 + (ortIs("hafen") ? 1 : 0) + (ortIs("zelle") ? 1 : 0);
    if (P.ki) for (let i = 0; i < n; i++) draw(pi); else P.zieh = Math.min(n, P.deck.length);   // Spieler zieht selbst vom Stapel, aber nur solange noch Karten da sind
    cleanup();
  }
  function takeDraw(pi) {
    const P = S.p[pi];
    if (!P.zieh) return false;
    P.zieh--; draw(pi); cleanup();
    return true;
  }
  function endTurn() {
    if (S.over != null) return;
    while (S.p[S.cur].zieh && S.over == null) takeDraw(S.cur);
    if (ortIs("vulkan")) { S.p.forEach(P => P.feld.forEach(u => hurt(u, 1))); log(Lx("Der Vulkan brennt.", "The volcano burns.")); }
    cleanup();
    if (S.over == null) beginTurn(foe(S.cur));
  }
  /* ---- Hilfen ---- */
  const healAmt = n => n + (ortIs("dorf") ? 2 : 0);
  function heal(u, n) { const before = u.hp; u.hp = Math.min(u.max, u.hp + healAmt(n)); if (u.hp > before) ev("u" + u.uid, "+" + (u.hp - before), "heal"); }
  function healHero(pi, n) { const P = S.p[pi], b = P.hp; P.hp = Math.min(R.leben, P.hp + healAmt(n)); if (P.hp > b) ev("h" + pi, "+" + (P.hp - b), "heal"); }
  function hurt(u, n) {
    if (n <= 0) return 0;
    if (u.schild) { u.schild = false; ev("u" + u.uid, Lx("Schild!", "Shield!"), "shield"); return 0; }
    n = Math.max(0, n - (ortIs("burg") ? 1 : 0) - (ortIs("schnee") && u.waechter ? 1 : 0) - u.weniger);
    u.hp -= n; ev("u" + u.uid, "-" + n, "dmg");
    return n;
  }
  function hurtHero(pi, n) { S.p[pi].hp -= n; ev("h" + pi, "-" + n, "dmg"); }
  function cleanup() {
    S.p.forEach((P, pi) => {
      P.feld = P.feld.filter(u => {
        if (u.hp > 0) return true;
        if (u.pas === "untot" && !u.auferstanden) { u.auferstanden = true; u.hp = 2; ev("u" + u.uid, Lx("Steht auf!", "Rises!"), "heal"); log(Lx(`${u.name} steht wieder auf!`, `${u.name} gets back up!`)); return true; }
        log(Lx(`${u.name} wurde besiegt.`, `${u.name} was defeated.`));
        if (!u.tok) P.grab.push(u.id);
        if (u.pas === "schaf") draw(pi);
        if (ortIs("ruinen") && !u.tok) draw(pi);
        return false;
      });
    });
    /* Wer gar keine Karten mehr hat (Deck, Hand und Feld leer), kann nichts mehr tun:
       hat der andere noch Wesen auf dem Feld, gewinnt er sofort. */
    const leer = S.p.map(P => !P.deck.length && !P.hand.length && !P.feld.length);
    if (S.over == null && (leer[0] || leer[1])) {
      if (leer[0] && leer[1]) S.over = 2;
      else if (leer[1] && S.p[0].feld.length) { S.over = 0; log(Lx(`${S.p[1].name} hat keine Karten mehr.`, `${S.p[1].name} has no cards left.`)); }
      else if (leer[0] && S.p[1].feld.length) { S.over = 1; log(Lx("Du hast keine Karten mehr.", "You have no cards left.")); }
    }
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
    const schwarm = u.pas === "schwarm" ? S.p[u.owner].feld.filter(x => x !== u && x.id === "kw-neon").length : 0;
    return a[2] + schwarm + u.plusSchaden + beacons + (ortIs("schmiede") ? 1 : 0) + (ortIs("wueste") && u.flink ? 1 : 0);
  }
  const canAct = u => S.cur === u.owner && !S.p[u.owner].zieh && !u.neu && !u.gesperrt && (!u.angegriffen || u.nochmal);
  function whyNotAct(u) {
    if (S.cur !== u.owner) return Lx("Nicht dein Zug.", "Not your turn.");
    if (S.p[u.owner].zieh) return Lx("Zieh zuerst eine Karte von deinem Deck.", "Draw a card from your deck first.");
    if (u.neu) return Lx("Gerade gerufen: greift ab nächster Runde an.", "Just summoned: attacks from next turn.");
    if (u.gesperrt) return Lx("Eingefroren: kann diese Runde nicht angreifen.", "Frozen: can't attack this turn.");
    if (u.angegriffen && !u.nochmal) return Lx("Hat diese Runde schon angegriffen.", "Already attacked this turn.");
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
      log(Lx(`${u.name}: ${a[0]} trifft alle.`, `${u.name}: ${a[0]} hits everyone.`));
    } else if (target[0] === "h") {
      hurtHero(foe(u.owner), d); dealt = d; log(Lx(`${u.name}: ${a[0]} trifft ${E.name} (${d}).`, `${u.name}: ${a[0]} hits ${E.name} (${d}).`));
    } else {
      const t = findU(+target.slice(1));
      dealt = hurt(t, d);
      log(Lx(`${u.name}: ${a[0]} trifft ${t.name} (${dealt}).`, `${u.name}: ${a[0]} hits ${t.name} (${dealt}).`));
      if (a[3] === "frost") { t.frost = 1; ev("u" + t.uid, Lx("Frost", "Frozen"), "frost"); }
      if (a[3] === "kette") { const o = E.feld.filter(x => x !== t); if (o.length) hurt(rnd(o), 1); }
    }
    if (a[3] === "saugen" && dealt) heal(u, dealt);
    if (a[3] === "schild") { u.schild = true; ev("u" + u.uid, Lx("Schild", "Shield"), "shield"); }
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
    if (S.cur !== pi) return Lx("Nicht dein Zug.", "Not your turn.");
    if (S.p[pi].zieh) return Lx("Zieh zuerst eine Karte von deinem Deck.", "Draw a card from your deck first.");
    if (S.p[pi].verbrannt) return Lx("Du hast diese Runde schon eine Karte verbrannt.", "You already burned a card this turn.");
    return "";
  }
  function burn(pi, hi) {
    const P = S.p[pi], id = P.hand[hi];
    if (!id || whyNotBurn(pi)) return false;
    P.hand.splice(hi, 1); P.verbrannt = true; P.energie += BURN_ENERGIE;
    ev("h" + pi, "+" + BURN_ENERGIE + " ⚡", "heal");
    log(Lx(`${P.name} verbrennt ${card(id).name} für ${BURN_ENERGIE} Energie.`, `${P.name} burns ${card(id).name} for ${BURN_ENERGIE} energy.`));
    return true;
  }
  function whyNotPlay(pi, id) {
    const w = W[id], P = S.p[pi];
    if (S.cur !== pi) return Lx("Nicht dein Zug.", "Not your turn.");
    if (P.zieh) return Lx("Zieh zuerst eine Karte von deinem Deck.", "Draw a card from your deck first.");
    if (w.t === "wesen") {
      const maxW = ortIs("dschungel") ? 2 : 1;
      if (P.beschworen >= maxW) return maxW === 1 ? Lx("Nur 1 Wesen pro Runde.", "Only 1 creature per turn.") : Lx("Schon 2 Wesen in dieser Runde gerufen.", "Already summoned 2 creatures this turn.");
      if (P.feld.length >= R.feldPlaetze) return Lx("Dein Feld ist voll.", "Your field is full.");
      return "";
    }
    if (P.energie < cardCost(pi, id)) return Lx("Nicht genug Energie.", "Not enough energy.");
    const t = playTargets(pi, id);
    if (t && !t.length) return w.t === "ausr" || w.ziel === "eigenesWesen" ? Lx("Du brauchst ein eigenes Wesen.", "You need a creature of your own.") : Lx("Kein Ziel da.", "No target.");
    if (w.wiederbeleben && (!P.grab.length || P.feld.length >= R.feldPlaetze)) return P.grab.length ? Lx("Dein Feld ist voll.", "Your field is full.") : Lx("Noch kein Wesen besiegt.", "No creature defeated yet.");
    if (w.beschwoere && P.feld.length >= R.feldPlaetze) return Lx("Dein Feld ist voll.", "Your field is full.");
    if (w.t === "ort" && S.ort && S.ort.id === id) return Lx("Dieser Ort liegt schon.", "This place is already in play.");
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
      const u = mkUnit(id, pi); P.feld.push(u); P.beschworen++; log(Lx(`${P.name} ruft ${name}.`, `${P.name} summons ${name}.`));
      if (w.beimSpielen) { P.feld.forEach(x => heal(x, w.beimSpielen.heileAlle)); for (let i = 0; i < w.beimSpielen.ziehe; i++) draw(pi); }
    } else if (w.t === "ort") {
      S.ort = { id, owner: pi }; log(Lx(`${P.name} wählt den Ort ${name}.`, `${P.name} picks the place ${name}.`));
    } else if (w.t === "ausr") {
      tu.plusSchaden += (w.plusSchaden || 0) + (tu.foxy ? (w.foxySchaden || 0) : 0) + (ortIs("tiefe") ? 1 : 0);
      tu.billiger += w.billiger || 0; tu.weniger += w.weniger || 0;
      if (w.plusLeben) { tu.max += w.plusLeben; tu.hp += w.plusLeben; ev("u" + tu.uid, "+" + w.plusLeben, "heal"); }
      if (w.gibFlink) tu.flink = true;
      if (w.gibWaechter) tu.waechter = true;
      tu.equip.push(id); log(Lx(`${tu.name} trägt jetzt ${name}.`, `${tu.name} now carries ${name}.`));
    } else {
      log(Lx(`${P.name} spielt ${name}.`, `${P.name} plays ${name}.`));
      if (w.brichtSchild && tu && tu.schild) { tu.schild = false; ev("u" + tu.uid, Lx("Schild kaputt!", "Shield broken!"), "shield"); }
      if (w.schaden) { if (tu) hurt(tu, w.schaden); else hurtHero(foe(pi), w.schaden); }
      if (w.dauerSchaden && tu) { tu.plusSchaden += w.dauerSchaden; tu.buffs.push(id); ev("u" + tu.uid, "+" + w.dauerSchaden + " ⚔", "heal"); }
      if (w.sucheTyp) { const k = P.deck.findIndex(x => W[x] && W[x].t === w.sucheTyp); if (k >= 0 && P.hand.length < 9) { P.hand.push(P.deck.splice(k, 1)[0]); log(Lx(`${P.name} holt eine Ausrüstung.`, `${P.name} fetches an equipment card.`)); } }
      if (w.schadenAlleFeinde) E.feld.slice().forEach(u => hurt(u, w.schadenAlleFeinde));
      if (w.schadenGegner) hurtHero(foe(pi), w.schadenGegner);
      if (w.gluecksspiel) {
        const [gew, verl] = w.gluecksspiel;
        if (Math.random() < 0.5) { hurtHero(foe(pi), gew); log(Lx(`${P.name} gewinnt: ${gew} Schaden am Gegner!`, `${P.name} wins: ${gew} damage to the opponent!`)); }
        else { hurtHero(pi, verl); log(Lx(`${P.name} verliert: ${verl} Schaden an sich selbst.`, `${P.name} loses: ${verl} damage to themselves.`)); }
      }
      if (w.frostAlle) E.feld.forEach(u => { u.frost = 1; ev("u" + u.uid, Lx("Frost", "Frozen"), "frost"); });
      if (w.entfrosten && tu) { tu.frost = 0; tu.gesperrt = false; }
      if (w.gibFlink && tu) { tu.flink = true; ev("u" + tu.uid, Lx("Flink!", "Swift!"), "heal"); }
      if (w.schadenAlleWesen) S.p.forEach(Q => Q.feld.slice().forEach(u => hurt(u, w.schadenAlleWesen)));
      if (w.heile) { if (tu) heal(tu, w.heile); else healHero(pi, w.heile); }
      if (w.heileAlle) P.feld.forEach(u => heal(u, w.heileAlle));
      if (w.heileSpieler) healHero(pi, w.heileSpieler);
      if (w.schild && tu) { tu.schild = true; ev("u" + tu.uid, Lx("Schild", "Shield"), "shield"); }
      if (w.frost && tu) { tu.frost = 1; ev("u" + tu.uid, Lx("Frost", "Frozen"), "frost"); }
      if (w.zurueck && tu) { const Q = S.p[tu.owner]; Q.feld = Q.feld.filter(x => x !== tu); if (!tu.tok) { if (Q.hand.length < 9) Q.hand.push(tu.id); } ev("u" + tu.uid, Lx("Zurück!", "Returned!"), "shield"); }
      if (w.nochmal && tu) { tu.nochmal = true; ev("u" + tu.uid, Lx("Nochmal!", "Again!"), "heal"); }
      if (w.wiederbeleben) { const back = P.grab.pop(); P.feld.push(mkUnit(back, pi)); log(Lx(`${card(back).name} ist zurück!`, `${card(back).name} is back!`)); }
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
.d-bg{position:absolute;inset:0;pointer-events:none;z-index:0}
.d-pile{position:relative;width:54px;aspect-ratio:63/88;flex-shrink:0;margin:0 8px}
.d-pile .pl{position:absolute;inset:0;container-type:inline-size}
.d-pile .pl.l2{transform:translate(2px,-2px)}.d-pile .pl.l3{transform:translate(4px,-4px)}
.d-pile .pc{position:absolute;right:-8px;bottom:-6px;z-index:3;min-width:22px;height:20px;padding:0 5px;border-radius:10px;display:grid;place-items:center;background:#0b0d12;border:1px solid #3a4252;font-size:11px;font-weight:800;color:#c3c9d6}
.d-pile.empty{border:2px dashed rgba(255,255,255,.12);border-radius:8px}
.d-pile.ready{cursor:pointer;animation:pileGlow 1.2s ease-in-out infinite}
.d-pile.ready .pl.l1{transform:translateY(-6px);transition:transform .2s}
.d-pile.ready:hover .pl.l1{transform:translateY(-12px) rotate(-3deg)}
@keyframes pileGlow{50%{filter:drop-shadow(0 0 12px #ffb347) brightness(1.15)}}
.d-pile .pz{position:absolute;left:50%;top:-24px;transform:translateX(-50%);white-space:nowrap;font-family:Rajdhani,sans-serif;font-weight:700;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#140800;background:linear-gradient(135deg,#ff6a2b,#ffb347);padding:2px 8px;border-radius:6px;box-shadow:0 0 12px rgba(255,106,43,.6)}
.d-flycard{position:fixed;z-index:215;aspect-ratio:63/88;container-type:inline-size;pointer-events:none;transition:transform .36s cubic-bezier(.5,0,.3,1),opacity .36s}
.d-flycard .cback{position:absolute;inset:0}
.d-choose{position:fixed;inset:0;z-index:120;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(3,4,8,.82);backdrop-filter:blur(5px)}
.d-choose.open{display:flex}
.dc-box{width:min(720px,100%);max-height:90vh;overflow:auto;background:#12151d;border:1px solid #2a3040;border-radius:18px;padding:22px}
.dc-box h3{font-family:Rajdhani,sans-serif;font-size:28px;text-transform:uppercase;margin-bottom:4px}
.dc-box p{color:#8a93a8;font-size:14px;margin-bottom:16px}
.dc-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.dc-deck{position:relative;display:flex;gap:12px;align-items:center;padding:12px;border-radius:14px;background:#161a24;border:2px solid #252b3a;text-align:left;overflow:hidden;color:#e8ebf2}
.dc-deck .feld-bg{opacity:.55}
.dc-deck>*{position:relative}
.dc-deck:hover:not([disabled]){border-color:#ffb347;transform:translateY(-2px)}
.dc-deck.akt{border-color:#ff6a2b;box-shadow:0 0 20px rgba(255,106,43,.3)}
.dc-deck[disabled]{opacity:.45;cursor:not-allowed}
.dc-back{width:46px;aspect-ratio:63/88;flex-shrink:0;position:relative;container-type:inline-size}
.dc-deck b{display:block;font-family:Rajdhani,sans-serif;font-size:19px;text-transform:uppercase;line-height:1.1}
.dc-deck span{font-size:12px;color:#c3c9d6}
.dc-deck .star{position:absolute;top:8px;right:10px;font-size:11px;font-weight:800;color:#ffb347;letter-spacing:.5px;text-transform:uppercase}
.dc-foot{display:flex;justify-content:flex-end;margin-top:16px}
.db-decks{padding:12px 14px;border-bottom:1px solid #252b3a;display:flex;flex-direction:column;gap:10px}
.db-tabs{display:flex;gap:6px;flex-wrap:wrap}
.db-tab{padding:6px 10px;border-radius:8px;background:#161a24;border:1px solid #252b3a;font-size:12px;font-weight:700;color:#8a93a8;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.db-tab em{font-style:normal;opacity:.7;margin-left:3px}
.db-tab.on{color:#fff;border-color:#ff6a2b;background:rgba(255,106,43,.12)}
.db-tab.add{color:#ffb347;border-style:dashed}
.db-name{width:100%;padding:9px 12px;border-radius:9px;background:#0b0d12;border:1px solid #252b3a;color:#fff;font:700 16px Rajdhani,sans-serif;letter-spacing:.5px;text-transform:uppercase;outline:none}
.db-name:focus{border-color:#ff6a2b}
.db-r2{display:flex;gap:6px}
.db-r2 .d-btn{flex:1;padding:8px;font-size:13px}
.db-r2 .d-btn.on{border-color:#ffb347;color:#ffb347}
.db-look{display:flex;flex-direction:column;gap:6px}
.db-look>span{font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#8a93a8}
.db-sw{display:flex;gap:6px;flex-wrap:wrap}
.sw-feld{position:relative;width:52px;height:34px;border-radius:7px;overflow:hidden;border:2px solid #252b3a}
.sw-feld .feld-bg::before{filter:blur(1px) brightness(.8)}
.sw-feld.on,.sw-back.on{border-color:#ffb347;box-shadow:0 0 10px rgba(255,179,71,.5)}
.sw-back{position:relative;width:30px;aspect-ratio:63/88;border-radius:5px;container-type:inline-size;border:2px solid transparent}
.sw-back .cback{position:absolute;inset:0}
@media (max-width:760px){.d-pile{width:34px;margin:0 4px}.d-pile .pz{font-size:10px;top:-18px;padding:1px 5px}.d-pile .pc{font-size:10px;min-width:18px;height:16px}
  .d-hero .d-sub{display:none}.d-row{gap:4px}.d-mid{flex-wrap:wrap;gap:6px}.d-turn{font-size:11px}.d-ort.none{font-size:11px;padding:5px 10px}#dQuit{padding:8px 9px;font-size:12px}#dEndT{padding:9px 10px;font-size:13px}}
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
  .db-side{width:auto;max-height:52vh;overflow:auto;border-right:none;border-bottom:1px solid #252b3a}
  .db-side .db-list{flex:none;overflow:visible}
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
    <div class="d-bg" id="dBg"></div>
    <div class="d-row" id="dTop"></div>
    <div class="d-field" id="dfE"></div>
    <div class="d-mid"><div class="d-turn" id="dTurn"></div><div id="dOrt"></div><div class="d-log" id="dLog"></div></div>
    <div class="d-field" id="dfM"></div>
    <div class="d-row" id="dBot"></div>
    <div class="d-hand" id="dHand"></div>
    <div class="d-burn" id="dBurn">🔥<span>${Lx("Hier ablegen: verbrennen<br><b>+1 Energie</b>", "Drop here to burn<br><b>+1 energy</b>")}</span></div>
    <div class="d-tip" id="dTip"></div>
    <div class="d-tbar" id="dTbar"><span id="dTtxt">${Lx("Wähle ein Ziel", "Pick a target")}</span><button class="d-btn" id="dTcancel">${Lx("Abbrechen", "Cancel")}</button></div>
    <div class="d-panel" id="dPanel"></div>
    <div class="d-banner" id="dBanner"></div>
    <div class="d-end" id="dEnd"></div>
  </div>
  <div class="deckb" id="deckb"></div>
  <div class="d-choose" id="dChoose"></div>`);

  let sel = null;      // {kind:"hand", hi} oder {kind:"atk", uid, ai}
  let busy = false;    // Animation oder Computer am Zug
  let lastHand = 0;

  function artHTML(id) {
    if (id[0] === "#") { const m = MARKER[id.slice(1)]; return m.pic ? (m.scene ? `<img src="img/${m.pic}.webp" alt="" style="${m.scene === "px" ? "image-rendering:pixelated" : ""}">` : `<img class="item" src="img/${m.pic}.webp" alt="" style="background:radial-gradient(circle,#2f7f88,#133f48)">`) : artSVG(m.art); }
    const c = card(id);
    if (c.cut) return `<img class="cut" src="${c.cut}" alt="">`;
    if (c.img) return `<img src="${FOXY_IMG(c.img)}" alt="" style="object-position:50% 20%">`;
    if (c.pic) return `<img class="${c.ort || c.scene ? "" : "item"}" src="img/${c.pic}.webp" alt="" style="${c.scene === "px" ? "image-rendering:pixelated" : c.ort ? "" : "background:radial-gradient(circle,#2d4a3e,#0f1512)"}">`;
    return artSVG(c.art);
  }
  const rcol = id => id[0] === "#" ? "var(--common)" : `var(--${card(id).r})`;

  /* Alle Effekte eines Wesens: Symbol, Name, was es macht, wie lange */
  function miniArt(id) {
    const c = card(id);
    if (c.pic) return `<img src="img/${c.pic}.webp" alt=""${c.scene ? ` style="object-fit:cover${c.scene === "px" ? ";image-rendering:pixelated" : ""}"` : ""}>`;
    if (c.img) return `<img src="${FOXY_IMG(c.img)}" alt="" style="object-fit:cover">`;
    return artSVG(c.art);
  }
  function fxList(u) {
    const L = [];
    if (u.neu) L.push({ ic: "💤", cls: "neu", n: Lx("Gerade gerufen", "Just summoned"), t: Lx("Kann noch nicht angreifen.", "Can't attack yet."), d: Lx("bis zu deinem nächsten Zug", "until your next turn") });
    if (u.gesperrt) L.push({ ic: "❄️", cls: "frost", n: Lx("Eingefroren", "Frozen"), t: Lx("Kann nicht angreifen.", "Can't attack."), d: Lx("diese Runde", "this turn") });
    else if (u.frost > 0) L.push({ ic: "❄️", cls: "frost", n: Lx("Eingefroren", "Frozen"), t: Lx("Kann nicht angreifen.", "Can't attack."), d: Lx("nächste Runde", "next turn") });
    if (u.schild) L.push({ ic: "🛡️", cls: "schild", n: Lx("Schild", "Shield"), t: Lx("Blockt den nächsten Treffer komplett.", "Fully blocks the next hit."), d: Lx("bis zum nächsten Treffer", "until the next hit") });
    if (u.waechter) L.push({ ic: "🏰", cls: "waechter", n: Lx("Wächter", "Guardian"), t: Lx("Gegner müssen zuerst dieses Wesen angreifen.", "Enemies must attack this creature first."), d: Lx("dauerhaft", "permanent") });
    if (u.flink) L.push({ ic: "💨", cls: "flink", n: Lx("Flink", "Swift"), t: Lx("Darf den Gegner direkt angreifen, auch wenn Wesen im Weg sind.", "May attack the opponent directly, even with creatures in the way."), d: Lx("dauerhaft", "permanent") });
    if (u.nochmal) L.push({ ic: "🔁", cls: "nochmal", n: Lx("Nochmal", "Again"), t: Lx("Darf diese Runde ein zweites Mal angreifen.", "May attack a second time this turn."), d: Lx("diese Runde", "this turn") });
    if (u.pas && PASSIV[u.pas] && !(u.pas === "untot" && u.auferstanden)) L.push({ ic: "✨", cls: "pas", n: Lx("Fähigkeit", "Ability"), t: PASSIV[u.pas], d: u.pas === "untot" ? Lx("einmal", "once") : Lx("dauerhaft", "permanent") });
    u.equip.forEach(e => L.push({ img: e, cls: "equip", n: card(e).name, t: fxText(W[e]).replace(/^An ein eigenes Wesen: |^On one of your creatures: /, ""), d: Lx("dauerhaft", "permanent") }));
    u.buffs.forEach(e => L.push({ img: e, cls: "buff", n: card(e).name, t: fxText(W[e]).replace(/^Ein eigenes Wesen |^One of your creatures /, ""), d: Lx("dauerhaft", "permanent") }));
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
  function pileHTML(pi, ready) {
    const P = S.p[pi], b = (S.look && S.look.ruecken[pi]) || "glut";
    if (!P.deck.length) return `<div class="d-pile empty" data-pile="${pi}"><span class="pc">0</span></div>`;
    const layers = Math.min(3, P.deck.length);
    let h = "";
    for (let i = layers; i >= 1; i--) h += `<div class="pl l${i}">${backHTML(b)}</div>`;
    return `<div class="d-pile${ready ? " ready" : ""}" data-pile="${pi}" title="${ready ? Lx("Karte ziehen", "Draw a card") : "Deck: " + P.deck.length + Lx(" Karten", " cards")}">${h}<span class="pc">${P.deck.length}</span>${ready ? '<span class="pz">' + Lx("Ziehen!", "Draw!") + '</span>' : ""}</div>`;
  }
  function heroHTML(pi) {
    const P = S.p[pi], en = [];
    for (let i = 0; i < Math.max(P.maxE, P.energie); i++) en.push(`<i class="${i < P.energie ? "on" : ""}"></i>`);
    return `<div class="d-hero ${pi ? "enemy" : "me"}" data-h="${pi}">
      <div class="d-ava">${pi ? "😈" : "🦊"}</div>
      <div><div class="d-hn">${esc(P.name)}</div>
        <div class="d-hp"><div class="d-hpbar"><i style="width:${Math.max(0, P.hp) / R.leben * 100}%"></i></div><span class="d-hpn">❤ ${Math.max(0, P.hp)}</span></div>
        <div class="d-sub">Deck ${P.deck.length} · ${Lx("Hand", "Hand")} ${P.hand.length}</div></div>
    </div><div class="d-en">${en.join("")}<b>${P.energie}</b></div>`;
  }
  function render() {
    const me = S.p[0], ai = S.p[1];
    const myTurn = S.cur === 0 && S.over == null;
    const tg = targetSet();
    const mark = (ref, ally) => tg && tg.includes(ref) ? ` tgt${ally ? " ally" : ""}` : "";
    $("dTop").innerHTML = heroHTML(1).replace('class="d-hero enemy"', `class="d-hero enemy${mark("h1")}"`) +
      `<div class="d-ehand">${ai.hand.map(() => "<i></i>").join("")}</div><div class="d-sp"></div>${pileHTML(1)}<button class="d-btn" id="dQuit">${Lx("Aufgeben", "Give up")}</button>`;
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
    $("dTurn").textContent = S.over != null ? Lx("Ende", "End") : `${Lx("Runde", "Round")} ${Math.ceil(S.runde / 2)} · ${myTurn ? Lx("Dein Zug", "Your turn") : ai.name + Lx(" ist dran", "'s turn")}`;
    if (S.ort) {
      const c = card(S.ort.id), w = W[S.ort.id];
      $("dOrt").innerHTML = `<div class="d-ort" data-ort="1">${c.pic ? `<img src="img/${c.pic}.webp" alt="">` : artSVG(c.art)}<div><b>${esc(c.name)}</b><span>${esc(ORTE[w.ort])}</span></div></div>`;
    } else $("dOrt").innerHTML = `<div class="d-ort none">${Lx("Kein Ort · Orte verändern das Spielfeld", "No place · places change the battlefield")}</div>`;
    $("dLog").innerHTML = S.log.slice(0, 8).map(l => `<div>${esc(l)}</div>`).join("");
    const anyMove = myTurn && (me.zieh || me.hand.some(id => !whyNotPlay(0, id)) || me.feld.some(u => canAct(u) && u.atk.some(a => atkCost(u, a) <= me.energie)));
    $("dBot").innerHTML = heroHTML(0).replace('class="d-hero me"', `class="d-hero me${mark("h0", true)}"`) +
      `<div class="d-sp"></div>${pileHTML(0, myTurn && !busy && me.zieh > 0)}<button class="d-btn hot${!anyMove && myTurn ? " pulse" : ""}" id="dEndT" ${myTurn && !busy ? "" : "disabled"}>${Lx("Zug beenden", "End turn")}</button>`;
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
    quitArmed = Date.now(); $("dQuit").textContent = Lx("Wirklich?", "Sure?"); return false;
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
      ${why ? `<div class="why">${esc(why)}</div>` : `<div class="hint">${w.t === "wesen" ? Lx("Kostenlos rufen (1 Wesen pro Runde). Es kann ab nächster Runde angreifen.", "Summon for free (1 creature per turn). It can attack from next turn.") : Lx(`Kostet ${cardCost(0, id)} Energie.${tgt ? " Danach wählst du ein Ziel." : ""}`, `Costs ${cardCost(0, id)} energy.${tgt ? " Then you pick a target." : ""}`)}</div>`}
      <button class="d-btn hot" id="pPlay" ${why ? "disabled" : ""}>${w.t === "wesen" ? Lx("Aufs Feld rufen", "Summon to field") : Lx("Ausspielen", "Play")}</button>
      <button class="d-btn burn" id="pBurn" ${whyNotBurn(0) ? "disabled" : ""}>🔥 ${Lx("Verbrennen", "Burn")}: +${BURN_ENERGIE} ${Lx("Energie", "energy")}</button>
      <div class="hint">${whyNotBurn(0) || Lx("1× pro Runde. Die Karte ist danach weg. Tipp: Karten kannst du auch aufs Feld ziehen.", "Once per turn. The card is gone afterwards. Tip: you can also drag cards onto the field.")}</div>
      <button class="d-btn" id="pX">Zurück</button></div>`);
    $("pX").onclick = cancelSel;
    $("pBurn").onclick = () => doBurn(hi);
    $("pPlay").onclick = () => {
      $("dPanel").classList.remove("open");
      if (tgt) { sel = { kind: "hand", hi }; $("dTtxt").textContent = Lx("Wähle ein Ziel", "Pick a target"); $("dTbar").classList.add("on"); render(); return; }
      doPlay(hi, null);
    };
  }
  function showUnit(u) {
    const mine = u.owner === 0, P = S.p[0];
    const why = mine ? whyNotAct(u) : "";
    const c = u.tok ? null : card(u.id);
    const info = `<div class="hint">❤ ${u.hp} / ${u.max}${u.plusSchaden ? ` · +${u.plusSchaden} ${Lx("Schaden", "damage")}` : ""}${u.billiger ? ` · ${Lx("Angriffe", "attacks")} -${u.billiger}` : ""}${u.weniger ? Lx(` · nimmt ${u.weniger} weniger`, ` · takes ${u.weniger} less`) : ""}</div>${fxList(u).length ? `<div class="fxlist">${fxRows(u)}</div>` : ""}`;
    const btns = mine ? u.atk.map((a, i) => {
      const cost = atkCost(u, a), dis = why || P.energie < cost;
      return `<button class="d-abtn" data-ai="${i}" ${dis ? "disabled" : ""}><span class="c">⚡${cost}</span><span class="n">${esc(a[0])}${a[3] ? `<i>${(window.EN ? { frost: "Frost", alle: "All", kette: "Chain", saugen: "Drain", schild: "Shield" } : { frost: "Frost", alle: "Alle", kette: "Kette", saugen: "Saugen", schild: "Schild" })[a[3]]}</i>` : ""}</span><span class="d">${atkDmg(u, a)}</span></button>`;
    }).join("") : "";
    openPanel(`<div class="pc">${c ? cardHTML(c, false) : unitHTML(u)}</div><div class="d-pbox"><h3>${esc(u.name)}</h3>${info}
      ${mine ? (why ? `<div class="why">${esc(why)}</div>` : `<div class="hint">${Lx("Wähle einen Angriff:", "Pick an attack:")}</div>`) : `<div class="hint">${Lx("Gegnerisches Wesen", "Enemy creature")}</div>`}
      ${btns}<button class="d-btn" id="pX">Zurück</button></div>`);
    $("pX").onclick = cancelSel;
    document.querySelectorAll("#dPanel [data-ai]").forEach(b => b.onclick = () => {
      const ai = +b.dataset.ai, a = u.atk[ai];
      $("dPanel").classList.remove("open");
      if (a[3] === "alle") { doAttack(u.uid, ai, null); return; }
      sel = { kind: "atk", uid: u.uid, ai }; $("dTtxt").textContent = `${a[0]}: ${Lx("Wähle ein Ziel", "pick a target")}`; $("dTbar").classList.add("on"); render();
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
  function drawClick() {
    if (!S || busy || S.cur !== 0 || !S.p[0].zieh) return;
    const pile = document.querySelector('#duel [data-pile="0"]'), hand = $("dHand");
    const r = pile.getBoundingClientRect(), hr = hand.getBoundingClientRect();
    const f = document.createElement("div"); f.className = "d-flycard"; f.innerHTML = backHTML(S.look.ruecken[0]);
    f.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px`;
    document.body.appendChild(f); busy = true;
    const tx = hr.left + hr.width / 2 + Math.min(S.p[0].hand.length, 6) * 30 - r.left, ty = hr.top + 20 - r.top;
    requestAnimationFrame(() => { f.style.transform = `translate(${tx}px,${ty}px) rotate(-8deg) scale(1.6)`; f.style.opacity = ".2"; });
    if (window.__sfx) window.__sfx("deal");
    setTimeout(() => { f.remove(); busy = false; takeDraw(0); afterAction(); }, 380);
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
    if (e.target.closest('[data-pile="0"]')) { drawClick(); return; }
    if (ortEl && S.ort) { openPanel(`<div class="pc">${cardHTML(card(S.ort.id), false)}</div><div class="d-pbox"><h3>${esc(card(S.ort.id).name)}</h3><div class="hint">${Lx(`Gelegt von: ${esc(S.p[S.ort.owner].name)}. Gilt für beide, bis ein neuer Ort kommt.`, `Played by: ${esc(S.p[S.ort.owner].name)}. Applies to both until a new place comes.`)}</div><button class="d-btn" id="pX">${Lx("Zurück", "Back")}</button></div>`); $("pX").onclick = cancelSel; return; }
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
    banner(Lx("Dein Zug", "Your turn"), "#ffb347");
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ---- Ende ---- */
  function finish(winner) {
    if (!S || S.done) return;
    S.done = true; S.over = winner; busy = false; cancelSel();
    let rw = "";
    if (winner === 0) {
      store("glutwerk-duell-siege", String((+store("glutwerk-duell-siege") || 0) + 1)); if (window.Erfolge) Erfolge.pruefen();
      const k = "glutwerk-duell-" + new Date().toISOString().slice(0, 10);
      const n = +store(k) || 0;
      if (n < R.siegeProTag) {
        store(k, String(n + 1));
        store("glutwerk-glut", String((parseInt(store("glutwerk-glut") || "0", 10) || 0) + R.siegGlut));
        rw = `<div class="rw">+${R.siegGlut} Glut</div><p>${Lx(`Noch ${R.siegeProTag - n - 1}× heute gibt es Glut für einen Sieg.`, `${R.siegeProTag - n - 1} more wins with Glut today.`)}</p>`;
      } else rw = `<p>${Lx("Für heute gab es schon genug Glut für Siege. Morgen wieder!", "You got all the win Glut for today. Come back tomorrow!")}</p>`;
      if (window.__sfx) window.__sfx("legendary");
    }
    $("dEnd").innerHTML = `<h2 style="color:${winner === 0 ? "#ffb347" : winner === 1 ? "#ff4d5e" : "#c3c9d6"}">${winner === 0 ? Lx("Sieg!", "Victory!") : winner === 1 ? Lx("Niederlage", "Defeat") : Lx("Unentschieden", "Draw")}</h2>
      ${winner === 1 ? `<p>${Lx("Bau dein Deck um und versuch es nochmal.", "Rebuild your deck and try again.")}</p>` : ""}${rw}
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="d-btn" id="eBack">${Lx("Zurück", "Back")}</button><button class="d-btn hot" id="eAgain">${Lx("Nochmal", "Again")}</button></div>`;
    $("dEnd").classList.add("open");
    $("eBack").onclick = closeDuel;
    $("eAgain").onclick = () => { $("dEnd").classList.remove("open"); startDuel(lastDeckId); };
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
  const deckReady = d => d.length === R.deckGroesse;
  const MAX_DECKS = 8;
  function cleanDeck(list) { const cnt = {}; return (list || []).filter(id => W[id] && card(id) && (cnt[id] = (cnt[id] || 0) + 1) <= maxCopies(id)); }
  /* Alle Decks: { aktiv, liste: [{ id, name, karten, feld, ruecken }] } */
  function loadDecks() {
    let d = null;
    try { d = JSON.parse(store("glutwerk-decks") || "null"); } catch (e) { d = null; }
    if (!d || !Array.isArray(d.liste) || !d.liste.length) {
      let alt = []; try { alt = JSON.parse(store("glutwerk-deck") || "[]") || []; } catch (e) { alt = []; }
      d = { aktiv: "d1", liste: [{ id: "d1", name: Lx("Mein Deck", "My deck"), karten: alt, feld: "glut", ruecken: "glut" }] };
    }
    d.liste.forEach(x => { x.karten = cleanDeck(x.karten); if (!FELDER[x.feld]) x.feld = "glut"; if (!RUECKEN[x.ruecken]) x.ruecken = "glut"; x.name = String(x.name || "Deck").slice(0, 24); });
    if (!d.liste.some(x => x.id === d.aktiv)) d.aktiv = d.liste[0].id;
    return d;
  }
  const saveDecks = d => store("glutwerk-decks", JSON.stringify(d));
  const aktDeck = d => d.liste.find(x => x.id === d.aktiv);
  const GEGNER_RUECKEN = { "Letzter Dreh": "schatten", "Kiko Hüpft": "glut", Klarwasser: "kristall", Ameisenvolk: "wildnis", Turmwacht: "kristall", Drachenfeuer: "glut", Nebelwald: "thyrvenna", Wildnis: "wildnis" };

  /* ---- Duell starten (mit Deck-Auswahl) ---- */
  let lastDeckId = null;
  function startDuel(deckId) {
    const D = loadDecks(), ready = D.liste.filter(x => deckReady(x.karten));
    if (deckId === undefined && ready.length >= 2) { openChooser(D); return; }
    const mine = D.liste.find(x => x.id === deckId) || (deckReady(aktDeck(D).karten) ? aktDeck(D) : ready[0]);
    const look = mine || aktDeck(D);
    lastDeckId = mine ? mine.id : null;
    const g = rnd(GEGNER_DECKS);
    start(mine ? mine.karten : STARTERDECK, g.deck, g.anzeige || g.name);
    S.look = { feld: look.feld, ruecken: [look.ruecken, GEGNER_RUECKEN[g.name] || "schatten"] };
    $("dBg").innerHTML = feldBG(look.feld);
    sel = null; busy = false; lastHand = 0;
    $("dChoose").classList.remove("open");
    $("duel").classList.add("open"); document.body.style.overflow = "hidden";
    if (typeof audio === "function") audio();
    render();
    banner(S.cur === 0 ? Lx("Du beginnst!", "You go first!") : Lx(`${g.anzeige || g.name} beginnt`, `${g.anzeige || g.name} goes first`), "#ffb347");
    if (S.cur === 1) setTimeout(runAi, 900);
  }
  function openChooser(D) {
    $("dChoose").innerHTML = `<div class="dc-box"><h3>${Lx("Mit welchem Deck?", "Which deck?")}</h3><p>${Lx(`Dein aktuelles Deck ist markiert. Unvollständige Decks (weniger als ${R.deckGroesse} Karten) kannst du noch nicht spielen.`, `Your current deck is marked. Incomplete decks (fewer than ${R.deckGroesse} cards) can't be played yet.`)}</p>
      <div class="dc-list">${D.liste.map(x => { const ok = deckReady(x.karten); return `<button class="dc-deck${x.id === D.aktiv ? " akt" : ""}" data-pick="${x.id}" ${ok ? "" : "disabled"}>
        ${feldBG(x.feld)}<div class="dc-back">${backHTML(x.ruecken)}</div>
        <div><b>${esc(x.name)}</b><span>${x.karten.length} / ${R.deckGroesse} ${Lx("Karten", "cards")} · ${esc(FELDER[x.feld].name)}</span></div>
        ${x.id === D.aktiv ? '<span class="star">★ ' + Lx("Aktuell", "Current") + '</span>' : ""}</button>`; }).join("")}</div>
      <div class="dc-foot"><button class="d-btn" id="dcX">${Lx("Abbrechen", "Cancel")}</button></div></div>`;
    $("dChoose").classList.add("open");
    $("dChoose").querySelectorAll("[data-pick]").forEach(b => b.onclick = () => startDuel(b.dataset.pick));
    $("dcX").onclick = () => $("dChoose").classList.remove("open");
  }
  $("dChoose").addEventListener("click", e => { if (e.target === $("dChoose")) $("dChoose").classList.remove("open"); });

  /* ---- Baukasten ---- */
  let dbFilter = "alle", decks = null, curId = null, deckDraft = [], delArmed = 0;
  const curDeck = () => decks.liste.find(x => x.id === curId);
  function openBuilder() {
    decks = loadDecks(); curId = decks.aktiv; deckDraft = curDeck().karten;
    $("deckb").classList.add("open"); document.body.style.overflow = "hidden";
    renderBuilder();
  }
  function switchDeck(id) { curId = id; deckDraft = curDeck().karten; renderBuilder(); }
  function renderBuilder() {
    const D = curDeck();
    const cnt = {}; deckDraft.forEach(id => cnt[id] = (cnt[id] || 0) + 1);
    const ok = deckReady(deckDraft);
    const typ = { wesen: 0, zauber: 0, ausr: 0, ort: 0 }; deckDraft.forEach(id => typ[W[id].t]++);
    const rows = Object.keys(cnt).sort((a, b) => ["wesen", "zauber", "ausr", "ort"].indexOf(W[a].t) - ["wesen", "zauber", "ausr", "ort"].indexOf(W[b].t) || card(a).name.localeCompare(card(b).name))
      .map(id => { const w = W[id]; return `<div class="db-row" style="--rc:var(--${card(id).r})"><span class="k ${w.t === "wesen" ? "hp" : "en"}">${w.t === "wesen" ? "❤" + w.hp : "⚡" + w.kosten}</span><span class="nm">${esc(card(id).name)}</span><span class="x">${cnt[id]}×</span><button data-rm="${id}">−</button></div>`; }).join("");
    const pool = CARDS.filter(c => W[c.id] && ownedCount(c.id) > 0 && (dbFilter === "alle" || W[c.id].t === dbFilter));
    const chip = (k, l) => `<button class="chip${dbFilter === k ? " on" : ""}" data-dbf="${k}">${l}</button>`;
    const isAkt = curId === decks.aktiv;
    $("deckb").innerHTML = `
      <div class="db-side">
        <div class="db-decks">
          <div class="db-tabs">${decks.liste.map(x => `<button class="db-tab${x.id === curId ? " on" : ""}" data-deck="${x.id}">${x.id === decks.aktiv ? "★ " : ""}${esc(x.name)}<em>${x.karten.length}/${R.deckGroesse}</em></button>`).join("")}${decks.liste.length < MAX_DECKS ? '<button class="db-tab add" id="dbNew">＋ ' + Lx("Neues Deck", "New deck") + '</button>' : ""}</div>
          <input class="db-name" id="dbName" value="${esc(D.name)}" maxlength="24" placeholder="${Lx("Name des Decks", "Deck name")}">
          <div class="db-r2"><button class="d-btn${isAkt ? " on" : ""}" id="dbAkt">${isAkt ? Lx("★ Aktuelles Deck", "★ Current deck") : Lx("☆ Als aktuell wählen", "☆ Make current")}</button>${decks.liste.length > 1 ? '<button class="d-btn" id="dbDel">' + Lx("Löschen", "Delete") + '</button>' : ""}</div>
          <div class="db-look"><span>${Lx("Spielfeld", "Battlefield")}</span><div class="db-sw">${Object.entries(FELDER).map(([k, f]) => `<button class="sw-feld${D.feld === k ? " on" : ""}" data-feld="${k}" title="${esc(f.name)}">${feldBG(k)}</button>`).join("")}</div>
            <span>${Lx("Kartenrücken", "Card back")}</span><div class="db-sw">${Object.entries(RUECKEN).map(([k, r]) => `<button class="sw-back${D.ruecken === k ? " on" : ""}" data-back="${k}" title="${esc(r.name)}">${backHTML(k)}</button>`).join("")}</div></div>
        </div>
        <div class="db-head"><div class="db-count ${ok ? "ok" : "no"}">${deckDraft.length} / ${R.deckGroesse} ${Lx("Karten", "cards")}${ok ? " ✓" : ""}</div>
          <div class="db-mix">${Lx(`${typ.wesen} Wesen · ${typ.zauber} Zauber · ${typ.ausr} Ausrüstung · ${typ.ort} Orte`, `${typ.wesen} creatures · ${typ.zauber} spells · ${typ.ausr} equipment · ${typ.ort} places`)}</div></div>
        <div class="db-list">${rows || `<div class="db-empty">${Lx(`Klick rechts auf Karten, um sie ins Deck zu legen.<br><br>Max. ${R.maxKopien}× pro Karte, legendäre und mythische nur 1×.`, `Click cards on the right to add them to the deck.<br><br>Max. ${R.maxKopien}× per card, legendary and mythic only 1×.`)}</div>`}</div>
        <div class="db-foot"><button class="d-btn" id="dbAuto">${Lx("Auffüllen", "Fill up")}</button><button class="d-btn" id="dbClear">${Lx("Leeren", "Clear")}</button><button class="d-btn hot" id="dbDone">${Lx("Fertig", "Done")}</button></div>
      </div>
      <div class="db-main">
        <div class="db-filters">${chip("alle", Lx("Alle", "All"))}${chip("wesen", Lx("Wesen", "Creatures"))}${chip("zauber", Lx("Zauber", "Spells"))}${chip("ausr", Lx("Ausrüstung", "Equipment"))}${chip("ort", Lx("Orte", "Places"))}</div>
        <div class="db-grid">${pool.length ? pool.map(c => { const n = cnt[c.id] || 0, full = n >= maxCopies(c.id) || deckDraft.length >= R.deckGroesse; return `<div class="db-c${full ? " max" : ""}" data-add="${c.id}">${cardHTML(c, false)}${n ? `<span class="in">${n}</span>` : ""}${full ? "" : '<span class="plus">+</span>'}</div>`; }).join("") : `<div class="db-empty" style="grid-column:1/-1">${Lx("Du hast noch keine Karten dieser Art. Öffne Packs!", "You don't have cards of this kind yet. Open packs!")}</div>`}</div>
      </div>`;
    const q = sel => $("deckb").querySelectorAll(sel);
    q("[data-deck]").forEach(b => b.onclick = () => switchDeck(b.dataset.deck));
    q("[data-feld]").forEach(b => b.onclick = () => { D.feld = b.dataset.feld; saveDecks(decks); renderBuilder(); });
    q("[data-back]").forEach(b => b.onclick = () => { D.ruecken = b.dataset.back; saveDecks(decks); renderBuilder(); });
    $("dbName").oninput = () => { D.name = $("dbName").value.slice(0, 24) || "Deck"; saveDecks(decks); const t = $("deckb").querySelector(`[data-deck="${curId}"]`); if (t) t.innerHTML = `${isAkt ? "★ " : ""}${esc(D.name)}<em>${deckDraft.length}/${R.deckGroesse}</em>`; };
    $("dbAkt").onclick = () => { decks.aktiv = curId; saveDecks(decks); renderBuilder(); };
    if ($("dbNew")) $("dbNew").onclick = () => {
      const id = "d" + Date.now().toString(36);
      decks.liste.push({ id, name: "Deck " + (decks.liste.length + 1), karten: [], feld: "glut", ruecken: "glut" });
      saveDecks(decks); switchDeck(id); setTimeout(() => { $("dbName").focus(); $("dbName").select(); }, 30);
    };
    if ($("dbDel")) $("dbDel").onclick = () => {
      if (Date.now() - delArmed > 3000) { delArmed = Date.now(); $("dbDel").textContent = Lx("Wirklich löschen?", "Really delete?"); return; }
      delArmed = 0;
      decks.liste = decks.liste.filter(x => x.id !== curId);
      if (decks.aktiv === curId) decks.aktiv = decks.liste[0].id;
      saveDecks(decks); switchDeck(decks.aktiv);
    };
    q("[data-rm]").forEach(b => b.onclick = () => { deckDraft.splice(deckDraft.lastIndexOf(b.dataset.rm), 1); saveDecks(decks); renderBuilder(); });
    q("[data-add]").forEach(b => b.onclick = () => {
      const id = b.dataset.add, n = deckDraft.filter(x => x === id).length;
      if (n >= maxCopies(id) || deckDraft.length >= R.deckGroesse) return;
      deckDraft.push(id); saveDecks(decks); renderBuilder();
    });
    q("[data-dbf]").forEach(b => b.onclick = () => { dbFilter = b.dataset.dbf; renderBuilder(); });
    $("dbClear").onclick = () => { deckDraft.length = 0; saveDecks(decks); renderBuilder(); };
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
      saveDecks(decks); renderBuilder();
    };
    $("dbDone").onclick = () => { saveDecks(decks); $("deckb").classList.remove("open"); document.body.style.overflow = ""; renderArena(); };
  }

  /* ---- Bereich auf der Seite ---- */
  function renderArena() {
    const el = $("arena"); if (!el) return;
    const D = loadDecks(), d = aktDeck(D).karten, ok = deckReady(d), n = D.liste.length;
    const k = "glutwerk-duell-" + new Date().toISOString().slice(0, 10), wins = +store(k) || 0;
    el.querySelector("#arDeck").innerHTML = (ok ? `${Lx("Aktuelles Deck", "Current deck")}: <b style="color:#3ddc97">${esc(aktDeck(D).name)} ✓</b>` :
      `${Lx("Aktuelles Deck", "Current deck")}: <b style="color:#ffb347">${esc(aktDeck(D).name)} · ${d.length} / ${R.deckGroesse}</b> · ${Lx("bis es voll ist, spielst du mit dem <b>Starterdeck</b>", "until it is full you play with the <b>starter deck</b>")}`) +
      (n > 1 ? ` <span style="color:var(--muted)">· ${n} Decks</span>` : "");
    el.querySelector("#arWins").textContent = Lx(`Siege heute: ${Math.min(wins, R.siegeProTag)} / ${R.siegeProTag} (je +${R.siegGlut} Glut)`, `Wins today: ${Math.min(wins, R.siegeProTag)} / ${R.siegeProTag} (+${R.siegGlut} Glut each)`);
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
        start(rnd(GEGNER_DECKS).deck, rnd(GEGNER_DECKS).deck, "KI"); S.p[0].ki = true; while (S.p[0].zieh) takeDraw(0);
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
