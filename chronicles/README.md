# Chronicles of the Forgotten · v0.1.0 „The Awakening“

2D-Pixel-Art-Action-RPG im Browser, angesiedelt in **Thyrvenna** (Fennwyrd, an der Laternenbrücke).
Teil der **Glutwerk**-Spielesammlung.

Alle Grafiken, Musik und Geräusche werden **im Code erzeugt**. Es gibt keine Bild- oder Audiodateien und keine Abhängigkeiten zur Laufzeit.

## Starten

**Variante A – mit Vite (empfohlen für die Entwicklung)**
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # fertiger Build in dist/
```

**Variante B – ohne Installation**
Das Projekt besteht aus reinen ES-Modulen. Jeder statische Webserver reicht:
```bash
npx serve .        # oder: python -m http.server
```
Für GitHub Pages / Glutwerk den Ordner einfach als Unterordner ins Repo `glutwerk` legen (oder `dist/` nach `npm run build`).
Hinweis: Ein direkter Doppelklick auf `index.html` (file://) funktioniert wegen der ES-Module nicht.

## Steuerung (in den Einstellungen frei belegbar)
| Taste | Aktion |
|---|---|
| WASD / Pfeiltasten | Bewegen (8 Richtungen) |
| Shift | Sprinten (kostet Ausdauer) |
| Leertaste | Ausweichrolle (kostet Ausdauer) |
| Linksklick | Schlagen (Büsche zerschneiden) |
| Rechtsklick | Fähigkeit (ab v0.3) |
| E | Interagieren / Sprechen / Aufheben |
| 1–0 | Schnellleiste |
| I · C · K · J · M | Inventar · Charakter · Fähigkeiten · Questlog · Karte |
| Esc | Pause / Fenster schließen |

## Was in v0.1 enthalten ist
- Hauptmenü mit animierter Landschaft, Einstellungen, Credits, DE/EN
- Charaktererstellung: Name, Erscheinung, 4 Spezies, 3 Klassen, 5 Frisuren, Haar-/Augen-/Hautfarbe, 4 Kleidungsstile, Stofffarbe, Live-Vorschau
- Startgebiet „Farnlager an der Laternenbrücke“: Lager, Mondtor, Ostruinen, Fluss mit Brücke, Teich, versteckter Schrein
- 8-Richtungs-Bewegung, Sprint, Ausweichen, Schlag gegen Büsche
- Tag-Nacht-Zyklus, dynamisches Licht, Partikel (Funken, Glühwürmchen, Blätter, Kristallstaub), animiertes Wasser und Pflanzen
- 4 NPCs mit Tagesablauf und Dialogen, Händlerin mit Kaufen/Verkaufen
- Hauptquest „Das Erwachen“ inkl. spielbarer Erinnerung (man spielt Foxy mit 16 an der Laternenbrücke) + 2 Nebenquests + 1 Geheimnis
- Inventar (24 Plätze, Drag & Drop, Stapel, Gewicht, Wert, Seltenheit, Detailansicht), Ausrüstung, Schnellleiste
- Charakterbogen mit Attributpunkten, Stufen & XP
- Minimap mit Nebel des Unerforschten, Weltkarte, Questlog mit Verfolgung
- Speichern in IndexedDB: Autosave + 3 Plätze, Fehlerbehandlung, Fallback auf localStorage
- Generative Musik und Umgebungsgeräusche (Vögel, Grillen, Feuer, Wasser, Magie)

**Noch nicht enthalten (deutlich markiert im Spiel):** Kampf gegen Gegner (v0.2), Fähigkeitenbaum (v0.3), Crafting (v0.4).

## Geheimnis
Irgendwo im Nordwesten steht ein Schrein hinter dichten Büschen … (Tipp: Ysra fragen.)

Siehe auch `docs/ARCHITEKTUR.md`, `docs/ROADMAP.md`, `docs/LORE.md`.
