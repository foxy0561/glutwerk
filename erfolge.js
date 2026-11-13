/* =========================================================
   GLUTWERK · Erfolge für alle Spiele
   Wird von den Glutwerk-Seiten UND von den Spielen geladen (alle liegen
   unter foxy0561.github.io und teilen sich denselben Speicher).

   Zwei Arten, wie ein Erfolg freigeschaltet wird:
   1. check: Glutwerk schaut selbst in den Spielstand des Spiels (z. B. Kiko Hüpft).
   2. Ein Spiel meldet ihn direkt:  window.glutwerkErfolg && glutwerkErfolg("ld-jackpot")

   Neuer Erfolg? Einfach unten in ERFOLGE eine Zeile ergänzen.
   - stufe: "leicht" | "mittel" | "schwer" | "legendaer"  → bestimmt die Glut-Belohnung
   - geheim: true → in der Übersicht nur "???", bis man ihn hat
   - name_en / desc_en: englischer Text (sonst wird der deutsche gezeigt)
   Für jedes Spiel gibt es automatisch noch "Alles geschafft" (alle anderen Erfolge des Spiels).
   ========================================================= */
(function () {
  if (window.ERFOLGE) return;
  const GLUT = { leicht: 25, mittel: 60, schwer: 150, legendaer: 400 };
  const KOMPLETT_GLUT = 500;

  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const json = (k, d) => { try { const v = JSON.parse(get(k) || "null"); return v == null ? d : v; } catch (e) { return d; } };
  const num = k => +get(k) || 0;
  const bits = s => typeof s === "string" ? s.split("").filter(x => x === "1").length : 0;
  const allBits = s => typeof s === "string" && s.length > 0 && !s.includes("0");
  const kiko = () => json("kiko-life", {}) || {};
  const sf = () => (json("shardfall.save.v1", {}) || {}).achievements || {};
  const rw = () => new Set(json("td_achievements", []) || []);
  const kw = () => json("klarwasser-v1", {}) || {};
  const dr = () => json("drako-save-v1", {}) || {};
  const gw = () => json("glutwerk-glut-state", {}) || {};
  const cards = () => json("glutwerk-cards", {}) || {};
  const hat = id => !!(json("glutwerk-erfolge", {}) || {})[id];

  const SPIELE = {
    glutwerk: { name: "Glutwerk", c: ["#ff6a2b", "#ffb347"] },
    "letzter-dreh": { name: "Letzter Dreh", c: ["#5a0f12", "#e3443a"] },
    kiko: { name: "Kiko Hüpft", c: ["#ff5f6d", "#ffc371"] },
    ameisenbau: { name: "Ameisenbau", c: ["#8e5a2b", "#d4a056"] },
    klarwasser: { name: "Klarwasser", c: ["#0f6e7a", "#f0b357"] },
    drako: { name: "Drako", c: ["#7b2ff7", "#f107a3"] },
    kammerwerk: { name: "Kammerwerk", c: ["#2193b0", "#6dd5ed"] },
    shardfall: { name: "Shardfall", c: ["#3b1d8f", "#b26bff"] },
    riftward: { name: "Riftward Defense", c: ["#6a3093", "#a044ff"] },
  };

  const E = [
    // ---------- Glutwerk ----------
    { id: "gw-start", spiel: "glutwerk", stufe: "leicht", name: "Erster Funke", desc: "Starte dein erstes Spiel auf Glutwerk.", name_en: "First Spark", desc_en: "Start your first game on Glutwerk.", check: () => Object.keys(gw().played || {}).length >= 1 },
    { id: "gw-alle-spiele", spiel: "glutwerk", stufe: "mittel", name: "Rundgang", desc: "Spiele jedes Glutwerk-Spiel mindestens einmal.", name_en: "Grand Tour", desc_en: "Play every Glutwerk game at least once.", check: () => !!gw().allBonus },
    { id: "gw-serie7", spiel: "glutwerk", stufe: "mittel", name: "Stammgast", desc: "Schau 7 Tage in Folge vorbei.", name_en: "Regular", desc_en: "Visit 7 days in a row.", check: () => (gw().streak || 0) >= 7 },
    { id: "gw-serie30", spiel: "glutwerk", stufe: "legendaer", name: "Glut im Blut", desc: "Schau 30 Tage in Folge vorbei.", name_en: "Embers in the Blood", desc_en: "Visit 30 days in a row.", check: () => (gw().streak || 0) >= 30 },
    { id: "gw-pack10", spiel: "glutwerk", stufe: "leicht", name: "Packratte", desc: "Öffne 10 Kartenpacks.", name_en: "Pack Rat", desc_en: "Open 10 card packs.", check: () => (cards().packs || 0) >= 10 },
    { id: "gw-pack50", spiel: "glutwerk", stufe: "schwer", name: "Sammelwut", desc: "Öffne 50 Kartenpacks.", name_en: "Collecting Frenzy", desc_en: "Open 50 card packs.", check: () => (cards().packs || 0) >= 50 },
    { id: "gw-set", spiel: "glutwerk", stufe: "mittel", name: "Set komplett", desc: "Sammle alle Karten eines Sets.", name_en: "Set Complete", desc_en: "Collect every card of a set.", check: () => Object.keys(cards().sets || {}).length >= 1 },
    { id: "gw-alle-karten", spiel: "glutwerk", stufe: "legendaer", name: "Vollständig", desc: "Sammle alle Karten.", name_en: "Complete", desc_en: "Collect every card." },
    { id: "gw-glanz", spiel: "glutwerk", stufe: "leicht", name: "Es glänzt!", desc: "Zieh deine erste Glanzkarte.", name_en: "Shiny!", desc_en: "Pull your first shiny card." },
    { id: "gw-mythisch", spiel: "glutwerk", stufe: "schwer", geheim: true, name: "Ein Blick in den Nebel", desc: "Zieh eine mythische Karte.", name_en: "A Glimpse into the Fog", desc_en: "Pull a mythic card." },
    { id: "gw-duell1", spiel: "glutwerk", stufe: "leicht", name: "Erster Sieg", desc: "Gewinne ein Kartenduell.", name_en: "First Victory", desc_en: "Win a card duel.", check: () => num("glutwerk-duell-siege") >= 1 },
    { id: "gw-duell25", spiel: "glutwerk", stufe: "schwer", name: "Duellmeister", desc: "Gewinne 25 Kartenduelle.", name_en: "Duel Master", desc_en: "Win 25 card duels.", check: () => num("glutwerk-duell-siege") >= 25 },
    { id: "gw-feedback", spiel: "glutwerk", stufe: "leicht", geheim: true, name: "Danke!", desc: "Schick dem Entwickler Feedback.", name_en: "Thank You!", desc_en: "Send the developer feedback." },

    // ---------- Letzter Dreh ----------
    { id: "ld-schein", spiel: "letzter-dreh", stufe: "leicht", name: "Unterschrieben", desc: "Unterschreib einen Schuldschein.", name_en: "Signed", desc_en: "Sign a promissory note." },
    { id: "ld-zahltag", spiel: "letzter-dreh", stufe: "leicht", name: "Zahltag überlebt", desc: "Bezahl deine erste Schuld.", name_en: "Survived Payday", desc_en: "Pay off your first debt.", check: () => num("ld_best") >= 2 },
    { id: "ld-level5", spiel: "letzter-dreh", stufe: "schwer", name: "Stammkunde", desc: "Erreiche Level 5.", name_en: "Regular Customer", desc_en: "Reach level 5.", check: () => num("ld_best") >= 5 },
    { id: "ld-level10", spiel: "letzter-dreh", stufe: "legendaer", name: "Der Keller gehört dir", desc: "Erreiche Level 10.", name_en: "The Basement Is Yours", desc_en: "Reach level 10.", check: () => num("ld_best") >= 10 },
    { id: "ld-jackpot", spiel: "letzter-dreh", stufe: "mittel", name: "Jackpot", desc: "Dreh einen Jackpot.", name_en: "Jackpot", desc_en: "Hit a jackpot." },
    { id: "ld-tod-schuld", spiel: "letzter-dreh", stufe: "leicht", geheim: true, name: "Zahltag", desc: "Stirb, weil du deine Schulden nicht bezahlen konntest.", name_en: "Payday", desc_en: "Die because you couldn't pay your debt." },
    { id: "ld-tod-strom", spiel: "letzter-dreh", stufe: "mittel", geheim: true, name: "Er gehört mir", desc: "Stirb durch einen Stromschlag am Automaten.", name_en: "He Belongs to Me", desc_en: "Die from an electric shock at the machine." },
    { id: "ld-tod-schuss", spiel: "letzter-dreh", stufe: "mittel", geheim: true, name: "Hör auf zu klopfen", desc: "Stirb, weil du zu oft an die Tür geklopft hast.", name_en: "Stop Knocking", desc_en: "Die because you knocked on the door too often." },
    { id: "ld-tod-blind", spiel: "letzter-dreh", stufe: "schwer", geheim: true, name: "Gar nichts", desc: "Stirb, weil du am Türspion auch dein zweites Auge verloren hast.", name_en: "Nothing at All", desc_en: "Die after losing your second eye at the peephole." },
    { id: "ld-alle-tode", spiel: "letzter-dreh", stufe: "schwer", geheim: true, name: "Viele Wege nach unten", desc: "Stirb auf jede mögliche Art.", name_en: "Many Ways Down", desc_en: "Die in every possible way.", check: () => hat("ld-tod-schuld") && hat("ld-tod-strom") && hat("ld-tod-schuss") && hat("ld-tod-blind") },
    { id: "ld-ausrede", spiel: "letzter-dreh", stufe: "schwer", geheim: true, name: "Ein Tag. Einer.", desc: "Rede dich am Zahltag raus.", name_en: "One Day. Just One.", desc_en: "Talk your way out on payday." },
    { id: "ld-auge", spiel: "letzter-dreh", stufe: "mittel", geheim: true, name: "Neugier kostet", desc: "Verlier ein Auge am Türspion.", name_en: "Curiosity Costs", desc_en: "Lose an eye at the peephole." },
    { id: "ld-ersatzauge", spiel: "letzter-dreh", stufe: "mittel", geheim: true, name: "Wieder klar sehen", desc: "Setz dir ein Ersatzauge ein.", name_en: "Seeing Clearly Again", desc_en: "Insert a replacement eye." },
    { id: "ld-foxy", spiel: "letzter-dreh", stufe: "mittel", geheim: true, name: "Ein Anruf von Foxy", desc: "Ruf die richtige Nummer an.", name_en: "A Call from Foxy", desc_en: "Dial the right number." },
    { id: "ld-notruf", spiel: "letzter-dreh", stufe: "leicht", geheim: true, name: "Hier hört dich niemand", desc: "Versuch, den Notruf zu wählen.", name_en: "Nobody Hears You Here", desc_en: "Try to call emergency services." },

    // ---------- Kiko Hüpft (liest den Spielstand) ----------
    { id: "ki-level", spiel: "kiko", stufe: "leicht", name: "Los geht's", desc: "Schaff dein erstes Level.", name_en: "Let's Go", desc_en: "Beat your first level.", check: () => Object.keys(kiko().lv || {}).length >= 1 },
    { id: "ki-welt1", spiel: "kiko", stufe: "mittel", name: "Burgherr", desc: "Schaff Welt 1.", name_en: "Castle Lord", desc_en: "Beat world 1.", check: () => !!(kiko().w || {})[0] },
    { id: "ki-welt3", spiel: "kiko", stufe: "schwer", name: "Ganz durch", desc: "Schaff Welt 3.", name_en: "All the Way", desc_en: "Beat world 3.", check: () => !!(kiko().w || {})[2] },
    { id: "ki-alle", spiel: "kiko", stufe: "legendaer", name: "Jedes Level", desc: "Schaff alle 15 Level.", name_en: "Every Level", desc_en: "Beat all 15 levels.", check: () => Object.keys(kiko().lv || {}).length >= 15 },
    { id: "ki-muenzen", spiel: "kiko", stufe: "schwer", name: "Münzregen", desc: "Sammle insgesamt 1000 Münzen.", name_en: "Coin Shower", desc_en: "Collect 1000 coins in total.", check: () => (kiko().co | 0) >= 1000 },
    { id: "ki-gross", spiel: "kiko", stufe: "mittel", name: "Große Münzen", desc: "Finde 10 große Münzen.", name_en: "Big Coins", desc_en: "Find 10 big coins.", check: () => (kiko().bg | 0) >= 10 },
    { id: "ki-rennen", spiel: "kiko", stufe: "mittel", name: "Schnellster", desc: "Gewinne ein Wettrennen.", name_en: "Fastest", desc_en: "Win a race.", check: () => (kiko().rw | 0) >= 1 },

    // ---------- Ameisenbau (meldet selbst) ----------
    { id: "ab-tutorial", spiel: "ameisenbau", stufe: "leicht", name: "Ausgebildet", desc: "Schaff das Tutorial.", name_en: "Trained", desc_en: "Finish the tutorial." },
    { id: "ab-truhe", spiel: "ameisenbau", stufe: "leicht", name: "Schatzsucher", desc: "Finde eine Schatztruhe.", name_en: "Treasure Hunter", desc_en: "Find a treasure chest." },
    { id: "ab-winter", spiel: "ameisenbau", stufe: "mittel", name: "Winterfest", desc: "Überstehe deinen ersten Winter.", name_en: "Winter-Proof", desc_en: "Survive your first winter." },
    { id: "ab-boss", spiel: "ameisenbau", stufe: "mittel", name: "Riesentöter", desc: "Besiege einen Maulwurf oder Ameisenbären.", name_en: "Giant Slayer", desc_en: "Defeat a mole or anteater." },
    { id: "ab-nest", spiel: "ameisenbau", stufe: "mittel", name: "Nest zerstört", desc: "Zerstöre ein Käfer- oder Skorpionnest.", name_en: "Nest Destroyed", desc_en: "Destroy a beetle or scorpion nest." },
    { id: "ab-koenigin", spiel: "ameisenbau", stufe: "mittel", name: "Zwei Kronen", desc: "Hol eine zweite Königin in die Kolonie.", name_en: "Two Crowns", desc_en: "Get a second queen into the colony." },
    { id: "ab-50", spiel: "ameisenbau", stufe: "mittel", name: "Großfamilie", desc: "Habe 50 Ameisen.", name_en: "Big Family", desc_en: "Have 50 ants." },
    { id: "ab-100", spiel: "ameisenbau", stufe: "schwer", name: "Ameisenstaat", desc: "Habe 100 Ameisen.", name_en: "Ant Nation", desc_en: "Have 100 ants." },
    { id: "ab-glut", spiel: "ameisenbau", stufe: "schwer", name: "Bis zur Glut", desc: "Grab bis in die Glutschicht.", name_en: "Down to the Embers", desc_en: "Dig down to the ember layer." },
    { id: "ab-rot", spiel: "ameisenbau", stufe: "schwer", name: "Rot gesehen", desc: "Besiege die rote Kolonie.", name_en: "Seeing Red", desc_en: "Defeat the red colony." },
    { id: "ab-hunger", spiel: "ameisenbau", stufe: "leicht", geheim: true, name: "Leere Kammern", desc: "Lass eine Ameise verhungern.", name_en: "Empty Pantry", desc_en: "Let an ant starve." },
    { id: "ab-ende", spiel: "ameisenbau", stufe: "leicht", geheim: true, name: "Das Ende der Kolonie", desc: "Verliere deine Kolonie.", name_en: "End of the Colony", desc_en: "Lose your colony." },

    // ---------- Klarwasser (liest den Spielstand) ----------
    { id: "kw-jung", spiel: "klarwasser", stufe: "leicht", name: "Nachwuchs", desc: "Bekomm die ersten Jungfische.", name_en: "Offspring", desc_en: "Get your first fry.", check: () => ((kw().st || {}).births || 0) >= 1 },
    { id: "kw-heilen", spiel: "klarwasser", stufe: "mittel", name: "Fischdoktor", desc: "Heile einen kranken Fisch.", name_en: "Fish Doctor", desc_en: "Heal a sick fish.", check: () => ((kw().st || {}).healed || 0) >= 1 },
    { id: "kw-zwei", spiel: "klarwasser", stufe: "mittel", name: "Zweites Becken", desc: "Stell ein zweites Becken auf.", name_en: "Second Tank", desc_en: "Set up a second tank.", check: () => (kw().tanks || []).length >= 2 },
    { id: "kw-vier", spiel: "klarwasser", stufe: "schwer", name: "Fischzimmer", desc: "Habe 4 Becken.", name_en: "Fish Room", desc_en: "Own 4 tanks.", check: () => (kw().tanks || []).length >= 4 },
    { id: "kw-besucher", spiel: "klarwasser", stufe: "mittel", name: "Schaufenster", desc: "Verdiene 1000 € durch Besucher.", name_en: "Showroom", desc_en: "Earn €1000 from visitors.", check: () => ((kw().st || {}).earned || 0) >= 1000 },
    { id: "kw-ziele", spiel: "klarwasser", stufe: "legendaer", name: "Aquarianer", desc: "Schaff alle 13 Ziele.", name_en: "Aquarist", desc_en: "Complete all 13 goals.", check: () => (kw().q || 0) >= 13 },
    { id: "kw-tod", spiel: "klarwasser", stufe: "leicht", geheim: true, name: "Bauch nach oben", desc: "Verlier einen Fisch.", name_en: "Belly Up", desc_en: "Lose a fish." },

    // ---------- Drako (liest den Spielstand) ----------
    { id: "dr-drache", spiel: "drako", stufe: "leicht", name: "Befreier", desc: "Befreie deinen ersten Drachen.", name_en: "Liberator", desc_en: "Free your first dragon.", check: () => bits(dr().fr) >= 1 },
    { id: "dr-drachen", spiel: "drako", stufe: "schwer", name: "Alle frei", desc: "Befreie alle Drachen.", name_en: "All Free", desc_en: "Free every dragon.", check: () => allBits(dr().fr) },
    { id: "dr-truhen", spiel: "drako", stufe: "mittel", name: "Truhenknacker", desc: "Öffne alle Truhen.", name_en: "Chest Cracker", desc_en: "Open every chest.", check: () => allBits(dr().ch) },
    { id: "dr-kristalle", spiel: "drako", stufe: "legendaer", name: "Kristallhort", desc: "Sammle alle Kristalle.", name_en: "Crystal Hoard", desc_en: "Collect every crystal.", check: () => allBits(dr().cry) },
    { id: "dr-gegner", spiel: "drako", stufe: "mittel", name: "Feuerspucker", desc: "Besiege 50 Gegner.", name_en: "Fire Spitter", desc_en: "Defeat 50 enemies.", check: () => (dr().kills || 0) >= 50 },
    { id: "dr-arena", spiel: "drako", stufe: "mittel", name: "Arena", desc: "Gewinne die Arena.", name_en: "Arena", desc_en: "Win the arena.", check: () => !!dr().arena },
    { id: "dr-boss", spiel: "drako", stufe: "schwer", name: "Lavafürst gestürzt", desc: "Besiege den Lavafürsten.", name_en: "Lava Lord Toppled", desc_en: "Defeat the Lava Lord.", check: () => !!dr().gb },

    // ---------- Kammerwerk (liest den Spielstand) ----------
    { id: "km-start", spiel: "kammerwerk", stufe: "leicht", name: "Testperson", desc: "Schaff die erste Testkammer.", name_en: "Test Subject", desc_en: "Clear the first test chamber.", check: () => num("kammerwerk.best") >= 1 },
    { id: "km-halb", spiel: "kammerwerk", stufe: "mittel", name: "Halbzeit", desc: "Erreiche Testkammer 5.", name_en: "Halfway", desc_en: "Reach test chamber 5.", check: () => num("kammerwerk.best") >= 4 },
    { id: "km-ende", spiel: "kammerwerk", stufe: "schwer", name: "Letzte Kammer", desc: "Erreiche Testkammer 10.", name_en: "Final Chamber", desc_en: "Reach test chamber 10.", check: () => num("kammerwerk.best") >= 9 },

    // ---------- Shardfall (übernimmt die eigenen Erfolge) ----------
    { id: "sf-erster", spiel: "shardfall", stufe: "leicht", name: "Erster Splitter", desc: "Besiege deinen ersten Gegner.", name_en: "First Shard", desc_en: "Defeat your first enemy.", check: () => !!sf().first_blood },
    { id: "sf-boss", spiel: "shardfall", stufe: "mittel", name: "Kolossal", desc: "Besiege einen Riftkoloss.", name_en: "Colossal", desc_en: "Defeat a Rift Colossus.", check: () => !!sf().boss_killer },
    { id: "sf-sieg", spiel: "shardfall", stufe: "mittel", name: "Karte gehalten", desc: "Gewinne auf einer Karte.", name_en: "Map Held", desc_en: "Win on a map.", check: () => !!(sf().win_meadow || sf().win_ashpass || sf().win_frostbreak) },
    { id: "sf-welle30", spiel: "shardfall", stufe: "schwer", name: "Unbeugsam", desc: "Erreiche Welle 30.", name_en: "Unbending", desc_en: "Reach wave 30.", check: () => !!sf().wave_30 },
    { id: "sf-albtraum", spiel: "shardfall", stufe: "legendaer", name: "Albtraumbezwinger", desc: "Gewinne auf Albtraum.", name_en: "Nightmare Breaker", desc_en: "Win on Nightmare.", check: () => !!sf().win_hard },
    { id: "sf-sammler", spiel: "shardfall", stufe: "schwer", name: "Erfolgsjäger", desc: "Schalte 15 Shardfall-Erfolge frei.", name_en: "Achievement Hunter", desc_en: "Unlock 15 Shardfall achievements.", check: () => Object.keys(sf()).length >= 15 },

    // ---------- Riftward Defense (übernimmt die eigenen Erfolge) ----------
    { id: "rw-boss", spiel: "riftward", stufe: "mittel", name: "Bossjäger", desc: "Besiege einen Boss.", name_en: "Boss Hunter", desc_en: "Defeat a boss.", check: () => rw().has("boss_killer") },
    { id: "rw-level10", spiel: "riftward", stufe: "mittel", name: "Standhaft", desc: "Erreiche Level 10.", name_en: "Steadfast", desc_en: "Reach level 10.", check: () => rw().has("level_10") },
    { id: "rw-level20", spiel: "riftward", stufe: "schwer", name: "Frontveteran", desc: "Erreiche Level 20.", name_en: "Front Veteran", desc_en: "Reach level 20.", check: () => rw().has("level_20") },
    { id: "rw-25k", spiel: "riftward", stufe: "schwer", name: "Legende", desc: "Erreiche 25.000 Punkte in einem Run.", name_en: "Legend", desc_en: "Score 25,000 points in one run.", check: () => rw().has("score_25000") },
    { id: "rw-sammler", spiel: "riftward", stufe: "legendaer", name: "Risswächter", desc: "Schalte 25 Riftward-Erfolge frei.", name_en: "Rift Warden", desc_en: "Unlock 25 Riftward achievements.", check: () => rw().size >= 25 },
  ];

  // Für jedes Spiel: alle Erfolge geschafft
  Object.keys(SPIELE).forEach(sp => {
    const ids = E.filter(e => e.spiel === sp).map(e => e.id);
    E.push({ id: sp + "-komplett", spiel: sp, stufe: "komplett", komplett: true, name: "Alles geschafft", desc: "Schalte alle Erfolge von " + SPIELE[sp].name + " frei.", name_en: "All Done", desc_en: "Unlock every " + SPIELE[sp].name + " achievement.", check: () => ids.every(hat) });
  });

  const glutFor = e => e.komplett ? KOMPLETT_GLUT : GLUT[e.stufe] || 0;
  const EN = () => !!window.EN;
  const nameOf = e => EN() && e.name_en ? e.name_en : e.name;
  const descOf = e => EN() && e.desc_en ? e.desc_en : e.desc;

  /* ---------- Freischalten ---------- */
  let queue = [], qT = null;
  function unlock(id, still) {
    const e = E.find(x => x.id === id);
    if (!e) return false;
    const m = json("glutwerk-erfolge", {}) || {};
    if (m[id]) return false;
    m[id] = Date.now();
    set("glutwerk-erfolge", JSON.stringify(m));
    const g = glutFor(e);
    set("glutwerk-glut", String(num("glutwerk-glut") + g));
    if (typeof window.renderGlut === "function") { try { window.renderGlut("bump"); } catch (x) {} }
    if (!still) { queue.push(e); clearTimeout(qT); qT = setTimeout(flush, 350); }
    return true;
  }
  /* Prüft alle Erfolge mit check(), auch "Alles geschafft" (darum zweimal) */
  function pruefen(still) {
    let any = false;
    for (let r = 0; r < 2; r++) E.forEach(e => { if (e.check && !hat(e.id)) { let ok = false; try { ok = e.check(); } catch (x) {} if (ok) any = unlock(e.id, still) || any; } });
    return any;
  }
  window.glutwerkErfolg = function (id) { const ok = unlock(id); if (ok) pruefen(); return ok; };

  /* ---------- Meldung ---------- */
  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement("style");
    s.textContent = `.gw-er{position:fixed;left:50%;top:18px;transform:translate(-50%,-140%);z-index:2147483000;display:flex;align-items:center;gap:12px;min-width:min(340px,92vw);max-width:92vw;padding:12px 18px 12px 12px;border-radius:14px;
  background:linear-gradient(135deg,rgba(28,20,14,.97),rgba(16,18,26,.97));border:1px solid rgba(255,179,71,.55);box-shadow:0 10px 40px rgba(0,0,0,.6),0 0 30px rgba(255,106,43,.25);
  color:#e8ebf2;font:14px/1.3 Inter,system-ui,sans-serif;transition:transform .5s cubic-bezier(.2,1.3,.4,1);pointer-events:none}
.gw-er.on{transform:translate(-50%,0)}
.gw-er .ic{width:46px;height:46px;flex:none;border-radius:12px;display:grid;place-items:center;font-size:24px;background:var(--gc,linear-gradient(135deg,#ff6a2b,#ffb347));box-shadow:0 0 16px rgba(255,179,71,.5)}
.gw-er small{display:block;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#ffb347;font-weight:700}
.gw-er b{display:block;font-size:16px;margin:1px 0}
.gw-er span{color:#c3c9d6;font-size:12.5px}
.gw-er em{margin-left:auto;font-style:normal;font-weight:800;color:#ffb347;white-space:nowrap;padding-left:8px}`;
    document.head.appendChild(s);
  }
  function flush() {
    const list = queue; queue = [];
    if (!list.length || !document.body) return;
    css();
    const sum = list.reduce((a, e) => a + glutFor(e), 0);
    const one = list.length === 1 ? list[0] : null;
    const el = document.createElement("div");
    el.className = "gw-er";
    if (one) el.style.setProperty("--gc", `linear-gradient(135deg,${SPIELE[one.spiel].c[0]},${SPIELE[one.spiel].c[1]})`);
    el.innerHTML = `<div class="ic">${one && one.geheim ? "🗝️" : "🏆"}</div><div><small>${one ? (EN() ? "Achievement unlocked" : "Erfolg freigeschaltet") : (EN() ? list.length + " achievements unlocked" : list.length + " Erfolge freigeschaltet")}</small>
      <b>${esc(one ? nameOf(one) : list.slice(0, 3).map(nameOf).join(" · ") + (list.length > 3 ? " …" : ""))}</b>${one ? `<span>${esc(descOf(one))}</span>` : ""}</div><em>+${sum} Glut</em>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("on")));
    try { if (window.__sfx) window.__sfx("rare"); } catch (x) {}
    setTimeout(() => { el.classList.remove("on"); setTimeout(() => el.remove(), 600); }, one ? 4200 : 5200);
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  window.ERFOLGE = E;
  window.Erfolge = { liste: E, spiele: SPIELE, hat, pruefen, glutFor, nameOf, descOf, freigeschaltet: () => json("glutwerk-erfolge", {}) || {} };

  /* Regelmäßig prüfen: Spielstände ändern sich, während gespielt wird */
  const start = () => { pruefen(); setInterval(() => { if (!document.hidden) pruefen(); }, 5000); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(start, 800)); else setTimeout(start, 800);
})();
