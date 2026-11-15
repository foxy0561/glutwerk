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
