/* Shardfall – lokales Speichern (Einstellungen, Bestwerte, lokale Bestenliste) */
(function () {
  "use strict";
  const KEY = "shardfall.save.v1";

  const defaults = {
    playerName: "",
    settings: { volume: 0.6, damageNumbers: true, autoWave: false, screenShake: true },
    best: {},          // pro Karte+Schwierigkeit: { wave, score }
    localScores: [],   // [{name, score, wave, map, diff, date}]
    lifetime: { kills: {}, seen: {}, built: {}, specs: {}, runs: 0, bestWave: 0 }, // fürs Lexikon
    achievements: {}   // id -> Zeitpunkt der Freischaltung
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(defaults);
      const data = JSON.parse(raw);
      return Object.assign(structuredClone(defaults), data, {
        settings: Object.assign({}, defaults.settings, data.settings || {}),
        lifetime: Object.assign(structuredClone(defaults.lifetime), data.lifetime || {})
      });
    } catch (e) {
      return structuredClone(defaults);
    }
  }

  SF.save = load();

  SF.persist = function () {
    try { localStorage.setItem(KEY, JSON.stringify(SF.save)); } catch (e) { /* privater Modus o.ä. */ }
  };

  SF.track = function (bucket, key) {
    const L = SF.save.lifetime;
    if (bucket === "seen") { L.seen[key] = true; return; }
    L[bucket][key] = (L[bucket][key] || 0) + 1;
  };

  SF.recordLocalScore = function (entry) {
    SF.save.lifetime.runs++;
    SF.save.lifetime.bestWave = Math.max(SF.save.lifetime.bestWave, entry.wave);
    SF.save.localScores.push(entry);
    SF.save.localScores.sort((a, b) => b.score - a.score);
    SF.save.localScores = SF.save.localScores.slice(0, 20);
    const k = entry.map + ":" + entry.diff;
    const prev = SF.save.best[k];
    if (!prev || entry.score > prev.score) SF.save.best[k] = { wave: entry.wave, score: entry.score };
    SF.persist();
  };
})();
