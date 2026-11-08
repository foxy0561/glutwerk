/* Shardfall – Erfolge (nach dem Vorbild von Riftward Defense) */
(function () {
  "use strict";
  const sum = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
  const L = () => SF.save.lifetime;
  const kills = () => sum(L().kills);
  const k = type => L().kills[type] || 0;
  const specCount = G => G ? G.towers.filter(t => t.spec).length : 0;

  // run: true = muss in EINEM Run geschafft werden · hard: besonders schwer
  SF.ACHIEVEMENTS = [
    { id: "first_blood", name: "Erster Treffer", desc: "Besiege deinen ersten Gegner.", check: () => kills() >= 1 },
    { id: "hunter_100", name: "Jäger", desc: "Besiege insgesamt 100 Gegner.", progress: () => [kills(), 100] },
    { id: "hunter_500", name: "Großwildjäger", desc: "Besiege insgesamt 500 Gegner.", progress: () => [kills(), 500] },
    { id: "hunter_1000", name: "Auslöscher", desc: "Besiege insgesamt 1.000 Gegner.", progress: () => [kills(), 1000] },
    { id: "hunter_2500", name: "Monsterjäger", desc: "Besiege insgesamt 2.500 Gegner.", progress: () => [kills(), 2500] },
    { id: "hunter_5000", name: "Ausrottung", desc: "Besiege insgesamt 5.000 Gegner.", progress: () => [kills(), 5000], hard: true },
    { id: "boss_killer", name: "Bossjäger", desc: "Besiege einen Riftkoloss.", progress: () => [k("boss"), 1] },
    { id: "boss_10", name: "Bossbrecher", desc: "Besiege insgesamt 10 Riftkolosse.", progress: () => [k("boss"), 10] },
    { id: "rift_hunter", name: "Rissbrecher", desc: "Besiege einen Rissläufer.", progress: () => [k("riftwalker"), 1] },
    { id: "rift_5", name: "Rissversiegler", desc: "Besiege insgesamt 5 Rissläufer.", progress: () => [k("riftwalker"), 5] },
    { id: "rift_victim", name: "Vom Riss verschluckt", desc: "Verliere einen Turm an einen Riss.", check: G => G && (G.stats.riftLosses || 0) > 0, run: true },
    { id: "wave_10", name: "Verteidiger", desc: "Erreiche Welle 10.", check: G => G && G.wave >= 10, run: true },
    { id: "wave_20", name: "Standhaft", desc: "Erreiche Welle 20.", check: G => G && G.wave >= 20, run: true },
    { id: "wave_30", name: "Unbeugsam", desc: "Erreiche Welle 30.", check: G => G && G.wave >= 30, run: true },
    { id: "endless_40", name: "Unsterbliche Linie", desc: "Erreiche Welle 40 im Endlosmodus.", check: G => G && G.wave >= 40, run: true, hard: true },
    { id: "win_meadow", name: "Hüter der Wiesen", desc: "Gewinne auf Kristallwiesen.", check: G => G && G.won && G.map.key === "meadow", run: true },
    { id: "win_ashpass", name: "Herr des Passes", desc: "Gewinne auf Aschepass.", check: G => G && G.won && G.map.key === "ashpass", run: true },
    { id: "win_frostbreak", name: "Frostbrecher", desc: "Gewinne auf Frostbruch.", check: G => G && G.won && G.map.key === "frostbreak", run: true },
    { id: "win_hard", name: "Albtraumbezwinger", desc: "Gewinne auf Albtraum.", check: G => G && G.won && G.diff.key === "hard", run: true, hard: true },
    { id: "score_10k", name: "Punktesammler", desc: "Erreiche 10.000 Punkte in einem Run.", check: G => G && G.score >= 10000, run: true },
    { id: "score_50k", name: "Highscore-Jäger", desc: "Erreiche 50.000 Punkte in einem Run.", check: G => G && G.score >= 50000, run: true },
    { id: "score_150k", name: "Legende", desc: "Erreiche 150.000 Punkte in einem Run.", check: G => G && G.score >= 150000, run: true },
    { id: "score_400k", name: "Jenseits der Skala", desc: "Erreiche 400.000 Punkte in einem Run.", check: G => G && G.score >= 400000, run: true, hard: true },
    { id: "untouched", name: "Unberührt", desc: "Schaffe Welle 10, ohne ein Leben zu verlieren.", check: G => G && G.wave >= 10 && G.waveDoneFlag && G.lives === G.maxLives, run: true },
    { id: "fortress_15", name: "Festung", desc: "Besitze gleichzeitig 15 Türme.", check: G => G && G.towers.length >= 15, run: true },
    { id: "fortress_25", name: "Undurchdringlich", desc: "Besitze gleichzeitig 25 Türme.", check: G => G && G.towers.length >= 25, run: true, hard: true },
    { id: "wealthy_1000", name: "Kriegskasse", desc: "Besitze gleichzeitig 1.000 Gold.", check: G => G && G.gold >= 1000, run: true },
    { id: "specialist_5", name: "Elite-Verteidigung", desc: "Besitze gleichzeitig 5 spezialisierte Türme.", check: G => specCount(G) >= 5, run: true },
    { id: "arsenal", name: "Breites Arsenal", desc: "Baue alle 7 Turmarten in einem Run.", check: G => G && Object.keys(G.stats.types || {}).length >= 7, run: true },
    { id: "crystal_10", name: "Kristallsammler", desc: "Verdiene insgesamt 25 Riftkristalle.", progress: () => [(SF.save.crystalStats || {}).earned || 0, 25] },
    { id: "crystal_100", name: "Kristalltresor", desc: "Verdiene insgesamt 100 Riftkristalle.", progress: () => [(SF.save.crystalStats || {}).earned || 0, 100], hard: true },
    { id: "shop_first", name: "Erster Einkauf", desc: "Kaufe etwas im Kristall-Shop.", progress: () => [(SF.save.crystalStats || {}).bought || 0, 1] },
    { id: "shop_legend", name: "Legendär", desc: "Besitze einen legendären Gegenstand.", check: () => SF.SHOP_ITEMS && SF.SHOP_ITEMS.some(i => i.rarity === "legendary" && SF.save.owned && SF.save.owned[i.id]) },
    { id: "level_5", name: "Aufsteiger", desc: "Erreiche Spielerstufe 5.", progress: () => [(SF.save.profile || {}).level || 1, 5] },
    { id: "level_15", name: "Veteran", desc: "Erreiche Spielerstufe 15.", progress: () => [(SF.save.profile || {}).level || 1, 15] },
    { id: "cards_10", name: "Kartensammler", desc: "Sammle 10 verschiedene Karten.", progress: () => [SF.cardStats ? SF.cardStats().owned : 0, 10] },
    { id: "cards_all", name: "Vollständige Sammlung", desc: "Sammle alle Karten (auch die Sonderkarte).", progress: () => [SF.cardStats ? SF.cardStats().owned : 0, SF.CARDS ? SF.CARDS.length : 33], hard: true },
    { id: "foxy", name: "Die letzte Füchsin", desc: "Finde eine Foxy-Sonderkarte.", check: () => !!(SF.save.cards && SF.FOXY_VARIANTS && SF.FOXY_VARIANTS.some(v => SF.save.cards["x_foxy_" + v.key] && SF.save.cards["x_foxy_" + v.key].count)), hard: true },
    { id: "foxy_all", name: "Alle Gesichter der Füchsin", desc: "Sammle alle 4 Foxy-Varianten.", progress: () => [SF.FOXY_VARIANTS ? SF.FOXY_VARIANTS.filter(v => SF.save.cards && SF.save.cards["x_foxy_" + v.key] && SF.save.cards["x_foxy_" + v.key].count).length : 0, 4], hard: true },
    { id: "shiny_1", name: "Glanzstück", desc: "Besitze eine Glanzkarte.", progress: () => [SF.cardStats ? SF.cardStats().shiny : 0, 1] },
    { id: "collector", name: "Feldforscher", desc: "Begegne jeder Gegnerart.", progress: () => [Object.keys(SF.ENEMIES).filter(x => L().seen[x]).length, Object.keys(SF.ENEMIES).length] }
  ];

  SF.achievements = {
    isUnlocked: id => !!SF.save.achievements[id],
    count: () => SF.ACHIEVEMENTS.filter(a => SF.save.achievements[a.id]).length,

    // Prüft alle Erfolge. Admin-/Test-Runs schalten nichts frei.
    check(G) {
      if (G && G.cheated) return;
      SF.ACHIEVEMENTS.forEach(a => {
        if (SF.save.achievements[a.id]) return;
        let ok = false;
        try {
          if (a.check) ok = !!a.check(G);
          else if (a.progress) { const [cur, max] = a.progress(G); ok = cur >= max; }
        } catch (e) { ok = false; }
        if (ok) {
          SF.save.achievements[a.id] = Date.now();
          SF.persist();
          SF.emit("achievement", a);
        }
      });
    }
  };
})();
