/* Shardfall – Grundeinstellungen
 * Alle Dateien hängen ihre Teile an das globale Objekt SF.
 * (Klassische Scripts statt ES-Module, damit das Spiel auch per Doppelklick im Browser läuft.)
 */
window.SF = window.SF || {};

SF.CONFIG = {
  GAME_NAME: "Shardfall",
  GAME_VERSION: "0.4.2",
  DEVELOPER: "foxy0561",

  // ===== Online: dasselbe Supabase-Projekt wie Riftward Defense =====
  SUPABASE_URL: "https://fqidanxjcwdpjdtngimu.supabase.co",
  SUPABASE_KEY: "sb_publishable_BSiWVUEtRP2hE6RL77pI8Q_J57eHlaj",

  // Eigene Bestenliste, damit Riftwards Scores nicht vermischt werden.
  // Einrichtung: siehe supabase/README-SUPABASE.md
  SCORES_TABLE: "shardfall_scores",
  SUBMIT_SCORE_FUNCTION: "shardfall-submit-score",

  // Feedback landet in Riftwards Tabelle bug_reports, markiert mit [SHARDFALL]
  FEEDBACK_TABLE: "bug_reports",
  FEEDBACK_TAG: "[SHARDFALL]",

  // Admin-Menü (Strg+Shift+L) nutzt Riftwards Edge Function – Passwort wird nur dort geprüft
  ADMIN_FUNCTION: "bug-reports-admin",

  // Spielfeld (logische Pixel, wird auf den Bildschirm skaliert)
  COLS: 20,
  ROWS: 12,
  TILE: 64,

  // Simulation
  TICK: 1 / 60,           // feste Schrittweite in Sekunden
  MAX_STEPS_PER_FRAME: 12 // Schutz gegen Einfrieren bei Lag
};

SF.CONFIG.WIDTH = SF.CONFIG.COLS * SF.CONFIG.TILE;
SF.CONFIG.HEIGHT = SF.CONFIG.ROWS * SF.CONFIG.TILE;

SF.DIFFICULTIES = {
  easy:   { key: "easy",   name: "Entspannt", gold: 340, lives: 40, hpMult: 0.7,  scoreMult: 0.7 },
  normal: { key: "normal", name: "Normal",    gold: 260, lives: 25, hpMult: 1.0,  scoreMult: 1.0 },
  hard:   { key: "hard",   name: "Albtraum",  gold: 240, lives: 12, hpMult: 1.22,  scoreMult: 1.6 }
};

SF.WIN_WAVE = 30; // danach Sieg – Endlos geht optional weiter
