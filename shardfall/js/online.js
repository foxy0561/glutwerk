/* Shardfall – Online-Funktionen über dasselbe Supabase-Projekt wie Riftward Defense
 *  - Bestenliste: eigene Tabelle "shardfall_scores" (getrennt von Riftward)
 *  - Score senden: Edge Function "shardfall-submit-score" (mit Plausibilitätsprüfung)
 *  - Feedback: gemeinsame Tabelle "bug_reports", markiert mit [SHARDFALL]
 * Ist die Online-Bestenliste noch nicht eingerichtet, läuft alles lokal weiter.
 */
(function () {
  "use strict";
  const C = SF.CONFIG;

  function headers(extra) {
    return Object.assign({
      "apikey": C.SUPABASE_KEY,
      "Authorization": "Bearer " + C.SUPABASE_KEY
    }, extra || {});
  }

  async function withTimeout(promise, ms) {
    let t;
    const timeout = new Promise((_, rej) => { t = setTimeout(() => rej(new Error("Zeitüberschreitung")), ms); });
    try { return await Promise.race([promise, timeout]); } finally { clearTimeout(t); }
  }

  SF.online = {
    available: null, // null = unbekannt, true/false nach erstem Versuch

    async fetchScores(mapKey) {
      let q = "?select=player_name,score,wave,map,difficulty,created_at&order=score.desc&limit=50";
      if (mapKey) q += "&map=eq." + encodeURIComponent(mapKey);
      try {
        const res = await withTimeout(fetch(C.SUPABASE_URL + "/rest/v1/" + C.SCORES_TABLE + q, {
          headers: headers(), cache: "no-store"
        }), 7000);
        if (!res.ok) throw new Error("HTTP " + res.status);
        SF.online.available = true;
        return await res.json();
      } catch (e) {
        SF.online.available = false;
        console.warn("[Shardfall] Online-Bestenliste nicht erreichbar:", e.message);
        return null;
      }
    },

    async submitScore(run) {
      try {
        const res = await withTimeout(fetch(C.SUPABASE_URL + "/functions/v1/" + C.SUBMIT_SCORE_FUNCTION, {
          method: "POST",
          headers: headers({ "Content-Type": "application/json" }),
          body: JSON.stringify(run),
          keepalive: true
        }), 8000);
        let data = {};
        try { data = await res.json(); } catch (e) { /* leer */ }
        if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
        return { ok: true, data };
      } catch (e) {
        console.warn("[Shardfall] Score konnte nicht online gespeichert werden:", e.message);
        return { ok: false, error: e.message };
      }
    },

    async sendFeedback(kind, name, text) {
      const label = kind === "idea" ? "[VORSCHLAG]" : "[BUG]";
      const res = await withTimeout(fetch(C.SUPABASE_URL + "/rest/v1/" + C.FEEDBACK_TABLE, {
        method: "POST",
        headers: headers({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
        body: JSON.stringify({
          player_name: (name || "Unbekannt").slice(0, 16),
          report_text: (C.FEEDBACK_TAG + label + " " + text).slice(0, 1500),
          game_version: C.GAME_NAME + " " + C.GAME_VERSION
        })
      }), 8000);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return true;
    }
  };
})();
