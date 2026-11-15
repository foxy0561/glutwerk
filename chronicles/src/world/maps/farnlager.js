// Kartendefinition: Fennwyrd – Das Farnlager an der Laternenbrücke (Startgebiet v0.1)
// Alle Koordinaten in Kacheln (16 px). Die Welt wird daraus prozedural mit festem Seed aufgebaut.

export const FARNLAGER = {
  id: 'farnlager',
  name: { de: 'Fennwyrd · Farnlager', en: 'Fennwyrd · Fern Camp' },
  w: 80, h: 60, seed: 1359,
  spawn: [40, 36],

  // Freie Flächen (ohne Wald): Ellipsen [x, y, rx, ry]
  clearings: [
    [40, 33, 19, 12], [24, 32, 9, 8], [40, 14, 12, 8], [57, 28, 10, 8], [40, 47, 30, 5],
    [50, 54, 12, 5], [66, 16, 7, 5], [9, 10, 4, 3.5], [13, 15, 2.2, 2.2], [31, 22, 4, 4],
  ],
  // Wege als Linienzüge [[x,y],...], Breite in Kacheln
  paths: [
    { w: 1.5, pts: [[40, 58], [40.5, 52], [40, 44], [40.6, 38], [40, 30], [40, 20]] },
    { w: 1.3, pts: [[40, 33], [34, 33.5], [29, 33]] },
    { w: 1.2, pts: [[40, 29], [47, 28.5], [55, 28.8], [60, 27]] },
    { w: 0.9, pts: [[40, 52], [46, 53.5], [52, 54]] },
    { w: 0.8, pts: [[47, 28.5], [56, 21], [64, 17]] },
  ],
  // Fluss (Nebelbach-Arm)
  river: { w: 2.6, pts: [[-2, 46], [10, 47.5], [22, 46.2], [32, 47], [40, 46.8], [50, 47.4], [62, 46], [72, 47.2], [82, 46.5]] },
  ponds: [[66, 13, 4.2, 2.6]],
  bridge: { x0: 38, x1: 42.5, y0: 44, y1: 50 },
  plaza: { x0: 33, x1: 47, y0: 15.5, y1: 22.5 },
  ruinFloor: [{ x0: 52, x1: 62, y0: 24, y1: 32 }],

  // Handplatzierte Objekte (Tile-Koordinaten der Fußlinie)
  props: [
    { t: 'gate', x: 40, y: 17, id: 'gate' },
    { t: 'crystal', x: 33.2, y: 17, v: 0 }, { t: 'crystal', x: 46.8, y: 17, v: 1 },
    { t: 'crystal', x: 31.5, y: 12, v: 1, s: 1 }, { t: 'crystal', x: 48.6, y: 13, v: 0 },
    { t: 'banner', x: 35.4, y: 20.2, v: 0 }, { t: 'banner', x: 44.8, y: 20.2, v: 1 },
    { t: 'torch', x: 37.6, y: 21.5 }, { t: 'torch', x: 42.8, y: 21.5 },
    { t: 'pillar', x: 32, y: 9.5, v: 1 }, { t: 'pillar', x: 48.2, y: 9.5, v: 0 },
    { t: 'wall', x: 30.5, y: 19.5, v: 0, w: 32 }, { t: 'wall', x: 50, y: 19.5, v: 1, w: 32 },
    // Lager
    { t: 'tent', x: 22, y: 30 }, { t: 'campfire', x: 27, y: 33.6 },
    { t: 'logseat', x: 27, y: 31.6 }, { t: 'logseat', x: 27.2, y: 36 },
    { t: 'barrel', x: 18.5, y: 31 }, { t: 'barrel', x: 19.4, y: 32.2 }, { t: 'crate', x: 18.4, y: 34.6 }, { t: 'crate', x: 19.6, y: 35.4 },
    { t: 'herbrack', x: 23.5, y: 36.6 }, { t: 'cauldron', x: 21.5, y: 36.4 },
    { t: 'torch', x: 31.2, y: 31 },
    { t: 'sign', x: 37.2, y: 35.5, id: 'sign' },
    // Ruinen Ost
    { t: 'wall', x: 54, y: 24.5, v: 2, w: 48 }, { t: 'wall', x: 61.5, y: 27, v: 3, w: 16 },
    { t: 'pillar', x: 52.5, y: 31, v: 1 }, { t: 'pillar', x: 61.8, y: 31.5, v: 0 },
    { t: 'chest', x: 58.5, y: 26.6, id: 'chest_ruin' }, { t: 'crystal', x: 60.5, y: 25.8, v: 2 },
    { t: 'rockbig', x: 55, y: 32.5 },
    // Laternenbrücke
    { t: 'lantern', x: 37.4, y: 43.8, id: 'lantern1' }, { t: 'lantern', x: 43.2, y: 43.8, id: 'lantern2' }, { t: 'lantern', x: 43.2, y: 51.2, id: 'lantern3' },
    // Süden
    { t: 'crate', x: 53, y: 55, id: 'crate_tamsi' }, { t: 'stump', x: 47, y: 56 },
    // Versteckter Fuchsschrein
    { t: 'shrine', x: 9, y: 10, id: 'shrine' },
    { t: 'bush', x: 13.4, y: 15.2, id: 'bush_secret1', cut: true }, { t: 'bush', x: 12.6, y: 14.1, id: 'bush_secret2', cut: true },
    // Altar hinter dem Tor (erscheint im Portalbereich)
    { t: 'altar', x: 40, y: 16.75, id: 'altar' },
    { t: 'rockbig', x: 29, y: 24 }, { t: 'stump', x: 33, y: 24.5 },
  ],

  // Sammelbares: Mondfarn (Quest), Äste (Holz), Pilze, Beeren
  pickups: [
    { item: 'mondfarn', pts: [[31.2, 22.6], [46.5, 37.5], [52.5, 52.5], [57.5, 33.5], [26.5, 40.5], [64, 19.5], [8.5, 12.5]] },
    { item: 'ast', pts: [[34.5, 38.5], [45, 26], [30, 28], [50.5, 35], [56, 52], [24, 26.5], [62, 30], [47.5, 41]] },
    { item: 'waldpilz', pts: [[28.5, 25.5], [54, 37], [62.5, 20.5], [16.5, 28.5]] },
    { item: 'glimmerbeere', pts: [[43.5, 55.5], [66, 20], [21.5, 39]] },
  ],

  npcs: [
    { id: 'maren', x: 25, y: 35 },
    { id: 'ysra', x: 29.2, y: 31.8 },
    { id: 'brann', x: 37, y: 24 },
    { id: 'tamsi', x: 20.5, y: 33.4 },
  ],

  regions: [
    { id: 'lager', x: 24, y: 33, r: 8, name: { de: 'Das Farnlager', en: 'The Fern Camp' } },
    { id: 'mondtor', x: 40, y: 14, r: 8, name: { de: 'Das Mondtor', en: 'The Moon Gate' } },
    { id: 'ruinen', x: 57, y: 28, r: 7, name: { de: 'Ruinen am Ostpfad', en: 'Ruins of the East Path' } },
    { id: 'bruecke', x: 40, y: 47, r: 5, name: { de: 'Die Laternenbrücke', en: 'The Lantern Bridge' } },
    { id: 'schrein', x: 9, y: 10, r: 3, name: { de: 'Verborgener Schrein', en: 'Hidden Shrine' } },
    { id: 'teich', x: 66, y: 14, r: 5, name: { de: 'Mondteich', en: 'Moon Pond' } },
  ],
};
