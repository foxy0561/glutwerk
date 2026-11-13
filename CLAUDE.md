# Glutwerk

Launcher-Webseite für Foxys Browser-Spiele (GitHub Pages, ohne Login, alles im localStorage).

## Erfolge (wichtig beim Arbeiten an einem Spiel)

- Alle Erfolge stehen in `erfolge.js` (Liste `E`). Jedes Spiel lädt am Ende von `<body>` `<script src="../erfolge.js"></script>`.
- Spiele melden Ereignisse mit einer Zeile wie `(window.glutwerkErfolg||function(){})('ld-jackpot');`. Diese Zeilen beim Umbauen nicht löschen.
- Andere Erfolge liest `erfolge.js` direkt aus dem Spielstand (`check:`). Wird ein Speicher-Schlüssel oder das Spielstand-Format geändert, die passende `check`-Funktion in `erfolge.js` mitändern.
- Bekommt ein Spiel ein neues großes Feature, gern 1–3 passende Erfolge in `erfolge.js` ergänzen (mit `name_en`/`desc_en`). Geheime Erfolge (`geheim: true`) für Dinge, die man nicht vorher verraten soll, z. B. Todesarten.
- Glut-Belohnung je Stufe: leicht 25, mittel 60, schwer 150, legendär 400, „Alles geschafft“ 500.

## Sonstiges

- Englisch: `lang.js` (`L("deutsch", "english")`, im HTML `data-en="…"`). Kartentexte auf Englisch in `karten/en.js`.
- Commit-Nachrichten beginnen mit dem Spielnamen (`Letzter Dreh: …`). Daraus baut eine GitHub Action `updates.json` für das Update-Fenster auf der Startseite.
