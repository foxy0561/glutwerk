/* =========================================================
   GLUTWERK-KARTEN · Spielwerte
   Hier stehen Leben, Angriffe und Effekte aller Karten.
   Werte ändern = einfach Zahlen anpassen, der Text auf der Karte passt sich an.

   Kartentypen:
     wesen   – kämpft auf dem Feld. hp = Leben, atk = Angriffe [Name, Energie, Schaden, Extra]
     zauber  – einmaliger Effekt, kostet Energie
     ausr    – Ausrüstung, wird an ein eigenes Wesen gehängt
     ort     – verändert das Spielfeld für BEIDE Spieler, bis ein neuer Ort kommt

   Extras bei Angriffen:
     "frost"  – Ziel kann nächste Runde nicht angreifen
     "alle"   – trifft alle gegnerischen Wesen
     "kette"  – trifft zusätzlich ein anderes gegnerisches Wesen mit 1 Schaden
     "saugen" – heilt das angreifende Wesen um den Schaden
     "schild" – das angreifende Wesen bekommt danach ein Schild

   Eigenschaften bei Wesen:
     waechter: true – Gegner müssen zuerst dieses Wesen angreifen
     flink: true    – darf den Spieler direkt angreifen, auch wenn Wesen im Weg sind
     schild: true   – startet mit einem Schild (blockt den ersten Treffer komplett)
     pas: "…"       – Fähigkeit (siehe PASSIV unten)
     beimSpielen: { heileAlle, ziehe } – passiert beim Ausspielen
   ========================================================= */
window.REGELN = {
  deckGroesse: 20,      // so viele Karten muss ein Deck haben
  maxKopien: 2,         // höchstens so oft dieselbe Karte im Deck
  maxKopienSelten: 1,   // legendäre und mythische Karten nur 1×
  leben: 25,            // Leben jedes Spielers
  feldPlaetze: 4,       // Wesen pro Seite
  startHand: 4,         // Karten am Anfang (der zweite Spieler bekommt 1 mehr)
  maxEnergie: 8,        // Energie wächst jede Runde um 1 bis hierhin
  siegGlut: 25, erstSiegGlut: 50,         // Glut für einen Sieg gegen den Computer
  siegeProTag: 4,       // so oft am Tag gibt es Glut für Siege
};

window.WERTE = {
  /* ---------------- Kiko Hüpft ---------------- */
  "kiko":          { t: "wesen", hp: 6, atk: [["Hüpfer", 1, 2], ["Stampfer", 3, 5]] },
  "sternblock":    { t: "zauber", kosten: 1, ziel: "eigenesWesen", schild: true },
  "muenze":        { t: "zauber", kosten: 0, ziehe: 1 },
  "wiesenland":    { t: "ort", kosten: 1, ort: "wiese" },
  "roehre":        { t: "zauber", kosten: 2, ziehe: 2 },
  "burg":          { t: "ort", kosten: 3, ort: "burg" },
  "gruenling":     { t: "wesen", hp: 3, atk: [["Rempler", 1, 1]] },
  "extraleben":    { t: "zauber", kosten: 3, wiederbeleben: true },
  "vier-freunde":  { t: "zauber", kosten: 3, beschwoere: 2 },
  "panzerkaefer":  { t: "wesen", hp: 3, schild: true, atk: [["Panzerstoß", 1, 2], ["Rutschpanzer", 3, 2, "kette"]] },
  "stachler":      { t: "wesen", hp: 5, waechter: true, atk: [["Stacheln", 2, 2]] },
  "flatterling":   { t: "wesen", hp: 3, flink: true, atk: [["Sturzflug", 1, 2], ["Kreischen", 2, 1, "frost"]] },
  "kiko-dino":     { t: "wesen", hp: 7, atk: [["Zungenschlag", 1, 2, "saugen"], ["Stampfer", 3, 5]] },
  "ld-automat":    { t: "wesen", hp: 9, waechter: true, atk: [["Einarmiger Schlag", 2, 3], ["Jackpot", 5, 6]] },
  "ld-glaeubiger": { t: "wesen", hp: 10, pas: "schuld", atk: [["Mahnung", 2, 3], ["Letzte Warnung", 5, 5, "alle"]] },
  "ld-augen":      { t: "wesen", hp: 4, flink: true, atk: [["Starren", 1, 1, "frost"], ["Kratzen", 2, 3]] },
  "ld-schatten":   { t: "wesen", hp: 3, atk: [["Lauern", 1, 2]] },
  "ld-777":        { t: "zauber", kosten: 4, schadenGegner: 6 },
  "ld-schaedel":   { t: "zauber", kosten: 3, schadenAlleWesen: 3 },
  "ld-joker":      { t: "zauber", kosten: 1, ziehe: 2 },
  "ld-risiko":     { t: "zauber", kosten: 1, gluecksspiel: [4, 2] },
  "ld-strom":      { t: "zauber", kosten: 3, schadenAlleFeinde: 1, frostAlle: true },
  "ld-licht":      { t: "zauber", kosten: 2, ziel: "feindWesen", schaden: 2, frost: true },
  "ld-telefon":    { t: "zauber", kosten: 2, zieheBis: 5 },
  "ld-schale":     { t: "zauber", kosten: 0, energie: 1, ziehe: 1 },
  "ld-tagebuch":   { t: "zauber", kosten: 1, heileSpieler: 3, ziehe: 1 },
  "ld-striche":    { t: "zauber", kosten: 1, ziel: "eigenesWesen", dauerSchaden: 1 },
  "ld-klappe":     { t: "zauber", kosten: 1, sucheTyp: "ausr" },
  "ld-hebel":      { t: "ausr", kosten: 2, plusSchaden: 2 },
  "ld-zelle":      { t: "ort", kosten: 2, ort: "zelle" },
  "ld-kassierer":  { t: "wesen", hp: 11, atk: [["Kassieren", 2, 3, "saugen"], ["Zahltag", 6, 7]] },
  "ld-zahltag":    { t: "zauber", kosten: 5, schadenAlleFeinde: 3, frostAlle: true },
  "ld-tuerspion":  { t: "zauber", kosten: 1, ziel: "feindWesen", schaden: 1, frost: true },
  "ld-messer":     { t: "zauber", kosten: 2, ziel: "feindWesen", schaden: 4 },
  "ld-gewitter":   { t: "zauber", kosten: 2, frostAlle: true },
  "feuerkoenig":   { t: "wesen", hp: 11, pas: "untot", atk: [["Feuerball", 2, 3], ["Lavawelle", 5, 3, "alle"]] },

  /* ---------------- Kammerwerk ---------------- */
  "wuerfel":       { t: "wesen", hp: 7, waechter: true, atk: [["Schubsen", 1, 1]] },
  "gel":           { t: "ausr", kosten: 1, billiger: 1 },
  "portal-b":      { t: "zauber", kosten: 1, ziel: "eigenesWesen", zurueck: true },
  "portal-o":      { t: "zauber", kosten: 3, ziel: "feindWesen", zurueck: true },
  "wachposten":    { t: "wesen", hp: 5, atk: [["Laser", 2, 3], ["Dauerfeuer", 4, 6]] },
  "kanone":        { t: "ausr", kosten: 2, plusSchaden: 2, billiger: 1 },
  "bodenknopf":    { t: "zauber", kosten: 0, energie: 1 },
  "glaskaefig":    { t: "zauber", kosten: 2, ziel: "feindWesen", frost: true },
  "katapult":      { t: "zauber", kosten: 1, ziel: "eigenesWesen", nochmal: true },

  /* ---------------- Shardfall ---------------- */
  "bolzenturm":    { t: "wesen", hp: 4, atk: [["Bolzen", 1, 2]] },
  "frostkristall": { t: "wesen", hp: 4, atk: [["Frosthauch", 2, 1, "frost"]] },
  "blitzspule":    { t: "wesen", hp: 5, atk: [["Kettenblitz", 3, 3, "kette"]] },
  "phantom":       { t: "wesen", hp: 4, flink: true, atk: [["Schattenhieb", 2, 3]] },
  "prisma":        { t: "wesen", hp: 5, atk: [["Lichtstrahl", 2, 3], ["Fächerstrahl", 4, 2, "alle"]] },
  "risslaeufer":   { t: "wesen", hp: 9, flink: true, atk: [["Risshieb", 2, 3], ["Rissbruch", 5, 7]] },
  "riftkoloss":    { t: "wesen", hp: 12, waechter: true, atk: [["Stampfen", 3, 4], ["Beben", 6, 4, "alle"]] },
  "kanone-sf":     { t: "wesen", hp: 5, atk: [["Kanonenkugel", 2, 4]] },
  "moerser":       { t: "wesen", hp: 4, atk: [["Granate", 3, 2, "alle"]] },
  "leuchtfeuer":   { t: "wesen", hp: 5, pas: "leuchtfeuer", atk: [["Blenden", 1, 1]] },
  "sf-laeufer":    { t: "wesen", hp: 3, atk: [["Rempler", 1, 2]] },
  "sf-flitzer":    { t: "wesen", hp: 2, flink: true, atk: [["Vorbeihuschen", 1, 2]] },
  "sf-splitterling": { t: "wesen", hp: 1, atk: [["Splitterbiss", 0, 1]] },
  "sf-schwebling": { t: "wesen", hp: 4, flink: true, atk: [["Sturzflug", 2, 3]] },
  "sf-heiler":     { t: "wesen", hp: 4, pas: "kuh", atk: [["Stupser", 1, 1]] },
  "sf-panzerkoloss": { t: "wesen", hp: 8, waechter: true, atk: [["Walze", 3, 3]] },
  "sf-teiler":     { t: "wesen", hp: 5, pas: "teiler", atk: [["Splitterstoß", 2, 3]] },
  "schildtraeger": { t: "wesen", hp: 6, waechter: true, schild: true, atk: [["Schildstoß", 2, 2]] },

  /* ---------------- Riftward ---------------- */
  "riss":          { t: "ort", kosten: 2, ort: "riss" },
  "kristallkern":  { t: "ausr", kosten: 1, plusLeben: 4 },
  "rissbestie":    { t: "wesen", hp: 4, atk: [["Biss", 1, 2], ["Zerfleischen", 3, 4]] },
  "bestenliste":   { t: "zauber", kosten: 2, zieheBis: 5 },

  /* ---------------- Ameisenbau ---------------- */
  "waldameise":    { t: "wesen", hp: 3, atk: [["Biss", 1, 2]] },
  "ernteameise":   { t: "wesen", hp: 4, atk: [["Zangen", 2, 3]] },
  "blattschneider":{ t: "wesen", hp: 5, atk: [["Blattschnitt", 2, 3], ["Kiefer", 3, 4]] },
  "pilzgarten":    { t: "ort", kosten: 2, ort: "pilze" },
  "rivalen":       { t: "zauber", kosten: 3, schadenAlleWesen: 2 },
  "koenigin":      { t: "wesen", hp: 8, pas: "brut", atk: [["Befehl", 2, 2]] },
  "honigtopf":     { t: "wesen", hp: 6, pas: "honig", atk: [["Klebrig", 1, 1, "frost"]] },
  "treiberameise": { t: "wesen", hp: 6, atk: [["Ansturm", 3, 2, "alle"], ["Schwarm", 5, 6]] },
  "spinne":        { t: "wesen", hp: 5, atk: [["Netz", 2, 1, "frost"], ["Giftbiss", 3, 4]] },
  "blattlausfarm": { t: "zauber", kosten: 1, heileSpieler: 4 },
  "ameisenwinter": { t: "ort", kosten: 2, ort: "winter" },

  /* ---------------- Drako ---------------- */
  "drako":         { t: "wesen", hp: 8, atk: [["Hornstoß", 1, 2], ["Feueratem", 4, 5]] },
  "feueratem":     { t: "zauber", kosten: 2, ziel: "feind", schaden: 4 },
  "drachenkristall": { t: "zauber", kosten: 1, maxEnergie: 1 },
  "lavafuerst":    { t: "wesen", hp: 13, atk: [["Glutfaust", 3, 4], ["Lavawelle", 6, 5, "alle"]] },
  "kristalltal":   { t: "ort", kosten: 2, ort: "kristalltal" },
  "schaf":         { t: "wesen", hp: 2, pas: "schaf", atk: [["Mäh", 0, 1]] },
  "golem":         { t: "wesen", hp: 9, waechter: true, atk: [["Steinwurf", 3, 3]] },
  "vulkaninsel":   { t: "ort", kosten: 3, ort: "vulkan" },

  /* ---------------- Glutwerk ---------------- */
  "glut":          { t: "zauber", kosten: 3, schadenAlleFeinde: 2 },
  "glutwerk":      { t: "ort", kosten: 4, ort: "schmiede" },
  "funke":         { t: "zauber", kosten: 0, ziel: "feind", schaden: 1 },
  "gw-tagesbonus": { t: "zauber", kosten: 0, energie: 2 },
  "gw-gratispack": { t: "zauber", kosten: 1, ziehe: 2 },
  "gw-glutstaub":  { t: "zauber", kosten: 2, schadenAlleFeinde: 1, ziehe: 1 },
  "gw-pokal":      { t: "ausr", kosten: 2, plusSchaden: 1, plusLeben: 3 },

  /* ---------------- Thyrvenna ---------------- */
  "heiltrank":     { t: "zauber", kosten: 1, ziel: "eigen", heile: 5 },
  "manatrank":     { t: "zauber", kosten: 0, energie: 2 },
  "kraeuter":      { t: "zauber", kosten: 1, heileAlle: 2 },
  "siegel":        { t: "ausr", kosten: 2, weniger: 1, foxySchaden: 2 },
  "dolch":         { t: "ausr", kosten: 1, plusSchaden: 2 },
  "stab":          { t: "ausr", kosten: 2, plusSchaden: 1, billiger: 1 },
  "laterne":       { t: "zauber", kosten: 2, ziehe: 2 },
  "brot":          { t: "zauber", kosten: 1, heileSpieler: 3, ziehe: 1 },
  "nebelkristall": { t: "zauber", kosten: 2, maxEnergie: 1, ziehe: 1 },
  "fennwyrd":      { t: "ort", kosten: 2, ort: "dorf" },
  "hafen":         { t: "ort", kosten: 2, ort: "hafen" },
  "weisse-stadt":  { t: "ort", kosten: 4, ort: "stadt" },
  "verband":       { t: "zauber", kosten: 0, ziel: "eigenesWesen", heile: 3, entfrosten: true },
  "gifttrank":     { t: "zauber", kosten: 1, ziel: "feindWesen", schaden: 2, frost: true },
  "bombe":         { t: "zauber", kosten: 3, schadenAlleFeinde: 2, schadenGegner: 2 },
  "pfotentrank":   { t: "zauber", kosten: 1, ziel: "eigenesWesen", gibFlink: true },
  "grimoire":      { t: "zauber", kosten: 2, ziel: "eigenesWesen", schild: true, ziehe: 1 },
  "schatztruhe":   { t: "zauber", kosten: 3, ziehe: 3 },
  "bannkreis":     { t: "zauber", kosten: 5, frostAlle: true },
  "fuchsschild":   { t: "ausr", kosten: 2, plusLeben: 3, gibWaechter: true },
  "ruestung":      { t: "ausr", kosten: 3, plusLeben: 4, weniger: 1 },
  "umhang":        { t: "ausr", kosten: 2, gibFlink: true, plusSchaden: 1 },
  "marktstand":    { t: "ort", kosten: 1, ort: "markt" },
  "uralter-baum":  { t: "ort", kosten: 2, ort: "baum" },
  "kristallhoehle":{ t: "ort", kosten: 3, ort: "hoehle" },
  "altes-tor":     { t: "ort", kosten: 2, ort: "ruinen" },

  /* ---------------- Klarwasser ---------------- */
  "kw-neon":       { t: "wesen", hp: 2, pas: "schwarm", atk: [["Schwarmbiss", 1, 1]] },
  "kw-guppy":      { t: "wesen", hp: 2, pas: "nachwuchs", atk: [["Zupfen", 1, 1]] },
  "kw-cory":       { t: "wesen", hp: 4, waechter: true, atk: [["Wühlen", 1, 1]] },
  "kw-shrimp":     { t: "wesen", hp: 2, pas: "kuh", atk: [["Zwicken", 0, 1]] },
  "kw-gourami":    { t: "wesen", hp: 4, atk: [["Schubser", 1, 2], ["Blubberblase", 2, 2, "schild"]] },
  "kw-loach":      { t: "wesen", hp: 5, atk: [["Schneckenjagd", 2, 3], ["Wirbel", 3, 2, "kette"]] },
  "kw-pleco":      { t: "wesen", hp: 7, waechter: true, schild: true, atk: [["Saugmaul", 2, 2, "saugen"]] },
  "kw-puffer":     { t: "wesen", hp: 3, flink: true, atk: [["Knackbiss", 1, 3]] },
  "kw-betta":      { t: "wesen", hp: 4, atk: [["Flossenschlag", 1, 2], ["Revierkampf", 3, 5]] },
  "kw-malawi":     { t: "wesen", hp: 6, flink: true, atk: [["Rammen", 2, 3], ["Revierwut", 4, 6]] },
  "kw-angel":      { t: "wesen", hp: 6, atk: [["Schnappen", 2, 3], ["Jäger", 4, 3, "alle"]] },
  "kw-gold":       { t: "wesen", hp: 9, pas: "wachstum", atk: [["Rempler", 2, 3]] },
  "kw-discus":     { t: "wesen", hp: 11, pas: "honig", atk: [["Königsblick", 2, 2, "frost"], ["Diskuswelle", 5, 4, "alle"]] },
  "kw-root":       { t: "ausr", kosten: 1, plusLeben: 2, billiger: 1 },
  "kw-holey":      { t: "ausr", kosten: 2, weniger: 1, plusLeben: 1 },
  "kw-cave":       { t: "zauber", kosten: 1, ziel: "eigenesWesen", schild: true, heile: 2 },
  "kw-castle":     { t: "ausr", kosten: 2, plusLeben: 3, gibWaechter: true },
  "kw-wreck":      { t: "zauber", kosten: 2, ziel: "feindWesen", schaden: 3, frost: true },
  "kw-leaves":     { t: "zauber", kosten: 1, heileAlle: 2 },
  "kw-vallis":     { t: "zauber", kosten: 0, heileSpieler: 2 },
  "kw-fern":       { t: "zauber", kosten: 1, ziel: "eigenesWesen", heile: 4 },
  "kw-strom":      { t: "zauber", kosten: 4, frostAlle: true },
  "kw-becken":     { t: "ort", kosten: 2, ort: "becken" },

  /* ---------------- Wildnis ---------------- */
  "w-schwein":     { t: "wesen", hp: 3, pas: "schaf", atk: [["Rüsselstoß", 1, 1]] },
  "w-huhn":        { t: "wesen", hp: 2, flink: true, atk: [["Picken", 1, 1]] },
  "w-kuh":         { t: "wesen", hp: 5, pas: "kuh", atk: [["Hornstoß", 2, 2]] },
  "w-hoehlenspinne": { t: "wesen", hp: 4, atk: [["Netz", 1, 1, "frost"], ["Giftbiss", 3, 3]] },
  "w-wolf":        { t: "wesen", hp: 4, flink: true, atk: [["Biss", 2, 3]] },
  "w-zombie":      { t: "wesen", hp: 6, pas: "untot", atk: [["Kratzer", 1, 2], ["Zombiebiss", 3, 4]] },
  "w-skelett":     { t: "wesen", hp: 4, atk: [["Pfeil", 2, 2], ["Pfeilhagel", 4, 2, "alle"]] },
  "w-drache":      { t: "wesen", hp: 12, flink: true, atk: [["Klauen", 3, 4], ["Feuersturm", 6, 4, "alle"]] },
  "w-spitzhacke":  { t: "zauber", kosten: 1, ziel: "feindWesen", schaden: 2, brichtSchild: true },
  "w-fackel":      { t: "zauber", kosten: 1, ziel: "eigenesWesen", dauerSchaden: 1 },
  "w-eisen":       { t: "ausr", kosten: 2, plusLeben: 2, weniger: 1 },
  "w-gold":        { t: "zauber", kosten: 0, energie: 1, ziehe: 1 },
  "w-werkbank":    { t: "zauber", kosten: 1, sucheTyp: "ausr" },
  "w-diamant":     { t: "ausr", kosten: 3, plusSchaden: 3 },
  "w-wueste":      { t: "ort", kosten: 2, ort: "wueste" },
  "w-dschungel":   { t: "ort", kosten: 2, ort: "dschungel" },
  "w-schnee":      { t: "ort", kosten: 2, ort: "schnee" },
  "w-tiefe":       { t: "ort", kosten: 3, ort: "tiefe" },
  "w-lavawelt":    { t: "ort", kosten: 3, ort: "lavawelt" },

  /* ---------------- Foxy ---------------- */
  "foxy-wander":   { t: "wesen", hp: 10, flink: true, foxy: true, atk: [["Nebelschritt", 2, 3], ["Wasserzauber", 4, 6]] },
  "foxy-ruins":    { t: "wesen", hp: 10, foxy: true, atk: [["Mondquelle", 3, 3, "saugen"], ["Flut", 5, 4, "alle"]] },
  "foxy-frost":    { t: "wesen", hp: 11, foxy: true, atk: [["Eishauch", 2, 2, "frost"], ["Kristallsturm", 5, 4, "alle"]] },
  "foxy-seal":     { t: "wesen", hp: 12, foxy: true, pas: "stillerZauber", atk: [["Siegelkreis", 4, 5, "schild"]] },
  "foxy-ursprung": { t: "wesen", hp: 10, foxy: true, beimSpielen: { heileAlle: 3, ziehe: 1 }, atk: [["Fuchsfeuer", 2, 3], ["Erster Zauber", 5, 7]] },
};

/* Fähigkeiten (passiv) */
window.PASSIV = {
  leuchtfeuer:   "Deine anderen Wesen machen +1 Schaden.",
  brut:          "Rundenbeginn: Eine Ameise schlüpft (2 Leben) und kann sofort angreifen.",
  honig:         "Rundenbeginn: Du heilst 1 Leben.",
  schaf:         "Wird es besiegt, ziehst du 1 Karte.",
  kuh:           "Rundenbeginn: Deine Wesen heilen 1.",
  schwarm:       "Macht +1 Schaden für jeden anderen Neonsalmler auf deinem Feld.",
  nachwuchs:     "Rundenbeginn: Ist Platz, kommt ein Baby-Guppy (1 Leben) dazu.",
  schuld:        "Rundenbeginn: Der Gegner verliert 1 Leben.",
  teiler:        "Wird es besiegt, bleiben 2 Splitterlinge (1 Leben) zurück.",
  wachstum:      "Rundenbeginn: bekommt +1 maximales Leben und heilt 1.",
  untot:         "Wird er besiegt, steht er einmal mit 2 Leben wieder auf.",
  stillerZauber: "Deine Zauber kosten 1 Energie weniger.",
};

/* Orte: verändern das Spiel für beide Spieler */
window.ORTE = {
  wiese:       "Rundenbeginn: Wesen des Spielers am Zug heilen 1.",
  burg:        "Alle Wesen nehmen 1 Schaden weniger.",
  riss:        "Rundenbeginn: Ein zufälliges Wesen des Gegners nimmt 2 Schaden.",
  pilze:       "Rundenbeginn: Der Spieler am Zug heilt 2 Leben.",
  winter:      "Alle Angriffe kosten 1 Energie mehr.",
  kristalltal: "Jeder bekommt pro Runde 1 Energie extra.",
  vulkan:      "Rundenende: Alle Wesen nehmen 1 Schaden.",
  schmiede:    "Alle Angriffe machen 1 Schaden mehr.",
  dorf:        "Jede Heilung heilt 2 mehr.",
  hafen:       "Jeder zieht zu Rundenbeginn 1 Karte mehr.",
  stadt:       "Alle Angriffe kosten 1 Energie weniger (mind. 1).",
  markt:       "Ausrüstung kostet 1 Energie weniger.",
  becken:      "Rundenbeginn: Wesen des Spielers am Zug heilen 1 und bekommen kein Frost.",
  wueste:      "Flinke Wesen machen 1 Schaden mehr.",
  dschungel:   "Jeder darf 2 Wesen pro Runde rufen.",
  schnee:      "Wächter nehmen 1 Schaden weniger.",
  tiefe:       "Ausrüstung gibt zusätzlich +1 Schaden.",
  lavawelt:    "Rundenbeginn: Der Spieler am Zug verliert 1 Leben, bekommt aber 1 Energie extra.",
  baum:        "Rundenbeginn: Der Spieler am Zug und seine Wesen heilen 1.",
  hoehle:      "Zauber kosten 1 Energie weniger.",
  zelle:       "Rundenbeginn: Der Spieler am Zug verliert 1 Leben, zieht aber 1 Karte mehr.",
  ruinen:      "Wird ein Wesen besiegt, zieht sein Besitzer 1 Karte.",
};

/* Kleine Wesen, die von Karten erschaffen werden */
window.MARKER = {
  ameise: { name: "Ameise", hp: 2, atk: [["Biss", 1, 1]], art: "antWood", set: "ameisenbau" },
  splitterling: { name: "Splitterling", hp: 1, atk: [["Splitterbiss", 0, 1]], pic: "sf-shard", set: "shardfall" },
  babyguppy: { name: "Baby-Guppy", hp: 1, atk: [["Zupfen", 1, 1]], pic: "kw-guppy", set: "klarwasser" },
  freund: { name: "Kiko-Freund", hp: 2, atk: [["Hüpfer", 1, 2]], art: "four", pic: "kiko-freund", scene: 1, set: "kiko" },
};

/* Starterdeck: damit kann jeder sofort spielen, auch ohne eigene Karten */
window.STARTERDECK = [
  "kiko", "gruenling", "gruenling", "bolzenturm", "bolzenturm", "waldameise", "waldameise", "ernteameise",
  "wuerfel", "kanone-sf", "rissbestie", "frostkristall", "heiltrank", "heiltrank", "funke", "funke",
  "muenze", "dolch", "feueratem", "wiesenland",
];

/* Decks des Computers (eins wird zufällig gewählt) */
window.GEGNER_DECKS = [
  { name: "Ameisenvolk", deck: ["waldameise", "waldameise", "ernteameise", "ernteameise", "blattschneider", "spinne", "honigtopf", "koenigin", "treiberameise", "gruenling", "gruenling", "kraeuter", "blattlausfarm", "pilzgarten", "funke", "funke", "dolch", "heiltrank", "rivalen", "muenze"] },
  { name: "Turmwacht", deck: ["bolzenturm", "bolzenturm", "kanone-sf", "kanone-sf", "frostkristall", "frostkristall", "blitzspule", "moerser", "leuchtfeuer", "schildtraeger", "wuerfel", "wuerfel", "kristallkern", "kristallkern", "sternblock", "feueratem", "funke", "muenze", "laterne", "burg"] },
  { name: "Nebelwald", deck: ["spinne", "blattschneider", "golem", "drako", "rissbestie", "rissbestie", "kiko", "ernteameise", "waldameise", "phantom", "verband", "gifttrank", "gifttrank", "bombe", "pfotentrank", "grimoire", "fuchsschild", "umhang", "uralter-baum", "heiltrank"] },
  { name: "Letzter Dreh", deck: ["ld-automat", "ld-glaeubiger", "ld-augen", "ld-augen", "ld-schatten", "ld-schatten", "ld-kassierer", "ld-777", "ld-schaedel", "ld-joker", "ld-risiko", "ld-risiko", "ld-strom", "ld-licht", "ld-telefon", "ld-messer", "ld-gewitter", "ld-zahltag", "ld-hebel", "ld-zelle"] },
  { name: "Rissbrut", deck: ["sf-laeufer", "sf-laeufer", "sf-laeufer", "sf-flitzer", "sf-flitzer", "sf-splitterling", "sf-schwebling", "sf-schwebling", "sf-heiler", "sf-panzerkoloss", "sf-panzerkoloss", "sf-teiler", "sf-teiler", "schildtraeger", "phantom", "risslaeufer", "riftkoloss", "riss", "rissbestie", "kristallkern"] },
  { name: "Kiko Hüpft", deck: ["kiko", "gruenling", "gruenling", "panzerkaefer", "panzerkaefer", "stachler", "stachler", "flatterling", "flatterling", "kiko-dino", "feuerkoenig", "sternblock", "sternblock", "muenze", "muenze", "roehre", "extraleben", "vier-freunde", "wiesenland", "heiltrank"] },
  { name: "Klarwasser", deck: ["kw-neon", "kw-neon", "kw-guppy", "kw-guppy", "kw-cory", "kw-shrimp", "kw-gourami", "kw-loach", "kw-pleco", "kw-betta", "kw-malawi", "kw-angel", "kw-root", "kw-holey", "kw-cave", "kw-castle", "kw-leaves", "kw-fern", "kw-wreck", "kw-becken"] },
  { name: "Wildnis", deck: ["w-schwein", "w-schwein", "w-huhn", "w-kuh", "w-wolf", "w-wolf", "w-zombie", "w-zombie", "w-skelett", "w-hoehlenspinne", "w-drache", "w-spitzhacke", "w-spitzhacke", "w-fackel", "w-eisen", "w-gold", "w-werkbank", "w-diamant", "w-dschungel", "heiltrank"] },
  { name: "Drachenfeuer", deck: ["drako", "kiko", "gruenling", "gruenling", "schaf", "schaf", "rissbestie", "rissbestie", "golem", "phantom", "feueratem", "feueratem", "funke", "funke", "drachenkristall", "kristalltal", "dolch", "heiltrank", "brot", "glut"] },
];
