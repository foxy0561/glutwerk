# Projektstruktur

```
index.html                 Einstieg (Canvas + UI-Ebene)
vite.config.js             Build (base './' für Unterordner-Hosting)
src/
  main.js                  Startet das Spiel
  core/
    Game.js                Zustände, Hauptschleife, Interaktionen, Erinnerungssequenz, Speichern
    EventBus.js            Ereignisse zwischen Systemen und UI
    i18n.js                DE/EN – t('schlüssel') und L({de,en})
  engine/
    PixelUtil.js           Zufall, Rauschen, Farben, PixelGrid mit Auto-Outline
    Input.js               Tastatur/Maus, frei belegbare Aktionen
    Camera.js              Kamera mit Glättung und Wackeln
    Lighting.js            Tag-Nacht-Zyklus + Lichtquellen
    Particles.js           Partikel mit Pool
    Audio.js               Web-Audio-Synth: SFX, Ambient, generative Musik
  art/                     Prozedurale Pixel-Art (alles gecacht)
    palette.js             Zentrale Farbpalette
    characterArt.js        Figuren aus Bausteinen (Körper, Kleidung, Haare, Ohren, Schweif, Waffe)
    propArt.js             Bäume, Ruinen, Mondtor, Kristalle, Lager-Objekte …
    iconArt.js             16×16-Icons für Items und Menüs
  world/
    WorldMap.js            Baut Boden (pixelgenau), Wasser, Objekte, Kollision, Licht, Minimap
    WorldRenderer.js       Zeichenreihenfolge, y-Sortierung, Licht, Erinnerungsfilter, Beschriftungen
    maps/farnlager.js      Kartendefinition des Startgebiets (Daten, kein Code)
  entities/
    Player.js              Bewegung, Sprint, Ausweichen, Schlag
    NPC.js                 Tagesablauf, Umherwandern, Blickkontakt
  systems/
    Inventory.js           Plätze, Stapel, Gewicht, Ausrüstung, Schnellleiste
    QuestSystem.js         Status/Stufen, Sammelziele, Belohnungen
    GameAPI.js             Schnittstelle für Dialoge (has/give/take/quest/…)
  data/                    Spielinhalte als Daten
    items.js · quests.js · npcs.js · characters.js · strings.js
  save/SaveManager.js      IndexedDB (Plätze + Meta), Fallback, Migration
  ui/                      DOM-Oberfläche
    UIManager.js           Ebenen, Fenster-Stack, Meldungen, Banner, Überblendungen
    MainMenu.js · titleArt.js · CharacterCreator.js · HUD.js
    GameMenu.js + tabs/    Inventar, Charakter, Fähigkeiten, Quests, Karte
    Dialogue.js · Shop.js · SaveLoad.js · SettingsPanel.js · dom.js
  styles/main.css          Gesamter UI-Stil
```

## Erweitern
- **Neues Item:** Eintrag in `data/items.js` + Icon-Funktion in `art/iconArt.js`.
- **Neuer NPC:** Eintrag in `data/npcs.js` (Aussehen, Tagesablauf, Dialog) + Position in der Karte.
- **Neue Quest:** `data/quests.js`; Fortschritt per `G.advance()` aus Dialogen/Interaktionen, Sammelziele laufen automatisch.
- **Neue Region:** neue Datei in `world/maps/` nach dem Muster von `farnlager.js`.
- **Neue Spezies/Frisur/Kleidung:** `data/characters.js` bzw. `art/characterArt.js`.

## Warum keine Phaser-Engine?
Für v0.1 reicht ein eigener, schlanker Canvas-Renderer: keine Abhängigkeit, volle Kontrolle über den Pixel-Look, 60 FPS auch mit Software-Rendering. Ein Wechsel auf Phaser 3 bleibt möglich, weil Welt, Daten und UI getrennt sind.

## Oberwelt (v0.1.5)
- `src/data/thyrvenna.js` – Kartendaten (Küsten, Wälder, Gebirge, Flüsse, Straßen, Orte, Reiche) in Karteneinheiten (1 = 1 Kachel).
- `src/world/WorldGen.js` – rastert die Daten in Masken (1000×700), bestimmt Material je Pixel (`M`), erzeugt Boden-Pixel je Chunk (32×32 Kacheln) und die Übersichtskarte.
- `src/world/chunkWorker.js` – erzeugt Chunk-Böden im Web Worker (Fallback: synchron).
- `src/world/Settlements.js` – baut Städte/Dörfer/Ruinen/Teleportkreise/Häfen einmalig und verteilt sie auf Chunks.
- `src/world/Overworld.js` – lädt Chunks um den Spieler (3×3 Logik, LRU für Böden), Kollision, NPCs, Pickups, Karte.
- Kartenwechsel Farnlager ↔ Oberwelt über `exit`/Eingang an der Laternenbrücke (`Game.travel`), Nebel des Krieges je Karte.
- `src/world/Crypt.js` – Gruft unter jedem Teleportzirkel (Ebene 1: zwei Räume + Gang, Ebene 2: Kammer mit Zirkel am Treppenfuß), beide Ebenen in einer Karte mit großem Abstand.
- Verborgene Ruinen: Objekte mit `veil: <ortId>` sind unsichtbar und durchlässig, bis `Game.castVeil()` (Taste R) den Schleier für ~24 s öffnet (`Game.veils`).

## Magie (v0.1.6)
- `src/data/magic.js` – Schulen, Ränge, Zauber, Bücher, Lehrer.
- `src/systems/Magic.js` – Lernen (Buch/Lehrer + Übung + Vorgänger), Wirken (Spruch-Zeit oder still), Geschosse, Zonen, Wände, Schilde, Beschwörungen. Zustand: `state.player.magic`.
- `src/ui/tabs/SkillsTab.js` – Magie-Menü; `src/art/spellArt.js` – Zaubersymbole.
- Teleportzirkel: `Game.updateTeleCircle` – Draufstellen lädt auf und teleportiert; `Game.teleLock` hält den Ankunftszirkel dunkel, bis man ihn verlässt.
