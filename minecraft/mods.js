/* =========================================================
   Foxys Mods – hier trägst du neue Mods ein.

   So geht's: Kopiere den Beispiel-Block unten (ohne die Sternchen-Kommentarzeichen),
   füge ihn in die Liste MODS ein und passe ihn an. Fertig – die Seite
   zeigt den Mod automatisch mit Karte, Lese-Fenster und Download.

   Beispiel:
   {
     id: "foxy-hats",                 // kurz, klein, ohne Leerzeichen (für den Direktlink #mod-foxy-hats)
     name: "Foxy Hats",
     ver: "1.0.0",
     date: "2026-12-01",              // Veröffentlichung (JJJJ-MM-TT); neueste Mods stehen oben
     mc: ["1.21.1"],                  // Minecraft-Versionen
     loader: ["Fabric"],              // Fabric, Forge, NeoForge, Quilt …
     icon: "mods/foxy-hats.png",      // optional, quadratisches Bild (sonst ein Puzzle-Symbol)
     color: "#b26bff",                // optional, Farbe der Karte
     desc: "Kurzer Satz für die Karte.",
     desc_en: "One short sentence for the card.",
     text: "Längerer Text für das Lese-Fenster.\n\nAbsätze mit Leerzeile.",
     text_en: "Longer text for the reading window.",
     features: ["Erste Funktion", "Zweite Funktion"],
     features_en: ["First feature", "Second feature"],
     shots: ["mods/foxy-hats-1.png"], // optional, Screenshots
     file: "mods/foxy-hats-1.0.0.jar",// Datei im Repo (Ordner minecraft/mods/) ODER ein kompletter Link,
                                      // z. B. GitHub-Release: "https://github.com/foxy0561/…/foxy-hats-1.0.0.jar"
     size: "1,2 MB",                  // optional
     requires: ["Fabric API"],        // optional, was man zusätzlich braucht
     soon: false                      // true = Karte zeigen, aber „Bald verfügbar“ statt Download
     wip: true                        // optional: Kennzeichnung „In Arbeit“ (Vorabversion) mit Hinweis im Fenster
   }
   ========================================================= */
const MODS = [
{
  id: "foxy-cosmetics",
  name: "Foxy Cosmetics",
  ver: "0.1.0-alpha",
  date: "2026-11-25",
  wip: true,
  mc: ["26.3"],
  loader: ["Fabric"],
  color: "#ff8fb8",
  desc: "Eigene Cosmetics und Animationen direkt im Spiel bauen oder aus Blockbench importieren – mit Physik, Partikeln und Sounds.",
  desc_en: "Build your own cosmetics and animations right in the game or import them from Blockbench – with physics, particles and sounds.",
  text: "Mit Foxy Cosmetics erstellst du eigene Cosmetics und Animationen direkt im Spiel oder importierst sie aus Blockbench. Spieler in derselben Welt sehen gegenseitig ihre Sachen.\n\nDas ist eine frühe Alpha und kein fertiges Release: Es kann Fehler und Abstürze geben, Funktionen ändern sich noch, und gespeicherte Cosmetics oder Animationen sind in späteren Versionen eventuell nicht mehr kompatibel. Bitte sichere wichtige Welten. Nutzung auf eigene Gefahr.",
  text_en: "With Foxy Cosmetics you build your own cosmetics and animations right in the game or import them from Blockbench. Players in the same world see each other's creations.\n\nThis is an early alpha and not a finished release: bugs and crashes can happen, features still change, and saved cosmetics or animations may not be compatible with later versions. Please back up important worlds. Use at your own risk.",
  features: [
    "Cosmetics im Spiel bauen: Gruppen und Würfel an Kopf, Körper, Armen und Beinen, Farben oder eigene PNG-Textur, Gizmo zum Verschieben, Drehen und Skalieren, Rückgängig, Kopieren, Spiegeln",
    "Blockbench-Import: .bbmodel und .png einfach ins Menü ziehen",
    "Animationen mit Keyframe-Editor, Zeitleiste, Animations-Rad (Taste B), Schnelltasten und automatischer 3.-Person-Kamera",
    "Physik für Ohren, Schweif, Ketten und mehr",
    "Partikel und Sounds in Animationen, eigene .ogg-Sounds",
    "Teilen: Cosmetics und Animationen öffentlich stellen, damit andere sie speichern können"
  ],
  features_en: [
    "Build cosmetics in the game: groups and cubes on head, body, arms and legs, colors or your own PNG texture, gizmo to move, rotate and scale, undo, copy, mirror",
    "Blockbench import: just drag .bbmodel and .png into the menu",
    "Animations with keyframe editor, timeline, animation wheel (B key), quick keys and automatic third-person camera",
    "Physics for ears, tails, chains and more",
    "Particles and sounds in animations, your own .ogg sounds",
    "Sharing: publish cosmetics and animations so others can save them"
  ],
  requires: ["Fabric Loader 0.19.5 oder neuer", "Fabric API für 26.3", "Java 25 (bringt der Minecraft-Launcher mit)"],
  requires_en: ["Fabric Loader 0.19.5 or newer", "Fabric API for 26.3", "Java 25 (included with the Minecraft launcher)"],
  install: [
    "Fabric Loader für Minecraft 26.3 installieren.",
    "Fabric API und die heruntergeladene .jar in den <b>mods</b>-Ordner legen.",
    "Spiel starten, eine Welt öffnen und <b>K</b> drücken.",
    "Damit andere deine Sachen sehen, braucht auch der Welt-Host bzw. Server die Mod (gleiche Version)."
  ],
  install_en: [
    "Install Fabric Loader for Minecraft 26.3.",
    "Put Fabric API and the downloaded .jar into the <b>mods</b> folder.",
    "Start the game, open a world and press <b>K</b>.",
    "For others to see your creations, the world host or server needs the mod too (same version)."
  ],
  limits: [
    "Zusammenspiel mit Essential ist vorgesehen, aber noch nicht ausführlich getestet.",
    "Mehrspieler noch wenig getestet.",
    "Die Editor-Vorschau zeigt keine Partikel und keine Physik-Effekte von Objekten (im Spiel sichtbar).",
    "Molang-Ausdrücke aus Blockbench-Animationen werden nicht ausgewertet."
  ],
  limits_en: [
    "Working together with Essential is intended but not tested thoroughly yet.",
    "Multiplayer has had little testing so far.",
    "The editor preview shows no particles and no physics effects of objects (visible in the game).",
    "Molang expressions from Blockbench animations are not evaluated."
  ],
  license: "© 2026 foxy0561 – Alle Rechte vorbehalten. Du darfst die Mod herunterladen und privat nutzen. Weiterverbreiten, erneut hochladen, verändern, verkaufen oder in Modpacks einbauen ist ohne Erlaubnis nicht gestattet.",
  license_en: "© 2026 foxy0561 – All rights reserved. You may download the mod and use it privately. Redistributing, re-uploading, modifying, selling or including it in modpacks is not allowed without permission.",
  sha: "6ebd6a6cffecbdfe2b4fd59313f9014a06b4544b51df938fde00437eeab731f9",
  file: "FoxyCosmetics-0.1.0-alpha-mc26.3-fabric.jar",
  size: "261 KB"
}
];
