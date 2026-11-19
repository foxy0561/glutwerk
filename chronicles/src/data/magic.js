// Magiesystem nach dem Vorbild von „Mushoku Tensei“: Schulen (Elemente), sieben Ränge,
// Lernen nur über ein Magiebuch oder einen Lehrer, Übung (Wirken) macht Fortschritt möglich,
// stilles Zaubern (ohne Spruch) wird durch viel Übung freigeschaltet. Mana wächst durch Verbrauch.

export const RANKS = [
  { de: 'Anfänger', en: 'Beginner' }, { de: 'Mittelstufe', en: 'Intermediate' }, { de: 'Oberstufe', en: 'Advanced' },
  { de: 'Heilig', en: 'Saint' }, { de: 'König', en: 'King' }, { de: 'Kaiser', en: 'Emperor' }, { de: 'Gott', en: 'God' },
];
// Übung (Schul-Erfahrung), die man braucht, um einen Zauber dieses Rangs zu lernen
export const RANK_XP = [0, 18, 60, 160, 400, 900, 2000];
export const SILENT_CASTS = 40; // so oft wirken → stilles Zaubern in dieser Schule

export const SCHOOLS = {
  feuer: { name: { de: 'Feuer', en: 'Fire' }, group: 'angriff', color: ['#7a1e12', '#c8401c', '#f0802a', '#ffd070'], title: { de: 'Feuermagier', en: 'Fire Mage' } },
  wasser: { name: { de: 'Wasser', en: 'Water' }, group: 'angriff', color: ['#173a6e', '#2a6ab8', '#4fa0e8', '#bfe6ff'], title: { de: 'Wassermagier', en: 'Water Mage' } },
  wind: { name: { de: 'Wind', en: 'Wind' }, group: 'angriff', color: ['#2a5a4a', '#4a9a7a', '#8ad0b0', '#e0fff2'], title: { de: 'Windmagier', en: 'Wind Mage' } },
  erde: { name: { de: 'Erde', en: 'Earth' }, group: 'angriff', color: ['#3a2616', '#6a4a2a', '#9a7448', '#d0b080'], title: { de: 'Erdmagier', en: 'Earth Mage' } },
  heilung: { name: { de: 'Heilung', en: 'Healing' }, group: 'heilig', color: ['#2a5a2a', '#4a9a3a', '#8ad060', '#e8ffc0'], title: { de: 'Heiler', en: 'Healer' } },
  entgiftung: { name: { de: 'Entgiftung', en: 'Detoxification' }, group: 'heilig', color: ['#2a4a3a', '#3a7a5a', '#6ac09a', '#d0fff0'], title: { de: 'Entgifter', en: 'Detoxifier' } },
  barriere: { name: { de: 'Barriere', en: 'Barrier' }, group: 'heilig', color: ['#3a3a6a', '#5a6ab0', '#9aaae8', '#eef0ff'], title: { de: 'Barrieremagier', en: 'Barrier Mage' } },
  beschwoerung: { name: { de: 'Beschwörung', en: 'Summoning' }, group: 'sonder', color: ['#4a1e5a', '#7a3a9a', '#b07ad0', '#f0d8ff'], title: { de: 'Beschwörer', en: 'Summoner' } },
  mond: { name: { de: 'Mondmagie', en: 'Moon Magic' }, group: 'einzig', color: ['#33185a', '#7039b8', '#c49af5', '#f4f0ff'], title: { de: 'Mondkind', en: 'Moonchild' }, unique: 'foxy' },
  sonder: { name: { de: 'Sondermagie', en: 'Special Magic' }, group: 'einzig', color: ['#2a1e3a', '#5a3a7a', '#9a7ac0', '#ead9ff'], title: { de: 'Schleierbrecher', en: 'Veilbreaker' } },
  teleport: { name: { de: 'Teleportmagie', en: 'Teleportation' }, group: 'verboten', color: ['#20102e', '#4a2a6a', '#8a5ac0', '#d8c0ff'], title: { de: '', en: '' }, forbidden: true },
};
export const GROUPS = {
  angriff: { de: 'Angriffsmagie', en: 'Attack Magic' }, heilig: { de: 'Heilige Magie', en: 'Holy Magic' },
  sonder: { de: 'Beschwörungsmagie', en: 'Summoning Magic' }, einzig: { de: 'Besondere Magie', en: 'Unique Magic' }, verboten: { de: 'Verbotene Magie', en: 'Forbidden Magic' },
};

const S = (id, school, rank, de, en, dde, den, mp, cd, kind, p = {}) => ({ id, school, rank, name: { de, en }, desc: { de: dde, en: den }, mp, cd, kind, ...p });

export const SPELLS = {
  // Feuer
  feuerball: S('feuerball', 'feuer', 0, 'Feuerball', 'Fireball', 'Eine Kugel aus Flammen fliegt zum Mauszeiger.', 'A ball of flame flies toward the cursor.', 6, 0.5, 'bolt', { speed: 190, size: 4, range: 200 }),
  flammenwelle: S('flammenwelle', 'feuer', 1, 'Flammenwelle', 'Flame Wave', 'Ein Fächer aus Feuer vor dir.', 'A fan of fire in front of you.', 12, 1.2, 'cone', { range: 64 }),
  feuersaeule: S('feuersaeule', 'feuer', 2, 'Feuersäule', 'Pillar of Fire', 'Eine Flammensäule bricht am Ziel aus dem Boden.', 'A column of flame erupts at the target.', 24, 3, 'burst', { radius: 34, dur: 1.4 }),
  // Wasser
  wasserkugel: S('wasserkugel', 'wasser', 0, 'Wasserkugel', 'Water Ball', 'Eine Kugel aus Wasser – die erste Übung jedes Magiers.', 'A sphere of water – every mage\'s first lesson.', 5, 0.45, 'bolt', { speed: 170, size: 4, range: 190 }),
  eisspeer: S('eisspeer', 'wasser', 1, 'Eisspeer', 'Ice Spear', 'Ein schneller Eisspeer, der durch Hindernisse bricht.', 'A swift spear of ice that pierces through.', 11, 0.9, 'bolt', { speed: 300, size: 3, range: 260, pierce: true }),
  sturzflut: S('sturzflut', 'wasser', 2, 'Sturzflut', 'Deluge', 'Eine Flutwelle rollt vor dir her.', 'A tidal wave rolls out before you.', 22, 3, 'cone', { range: 96, wave: true }),
  // Wind
  windklinge: S('windklinge', 'wind', 0, 'Windklinge', 'Wind Blade', 'Eine unsichtbare Klinge aus Luft. Sehr schnell.', 'An invisible blade of air. Very fast.', 5, 0.4, 'bolt', { speed: 320, size: 3, range: 170 }),
  windstoss: S('windstoss', 'wind', 1, 'Windstoß', 'Gust Step', 'Der Wind trägt dich ein Stück nach vorn.', 'The wind carries you forward.', 10, 1.4, 'dash', { dist: 80 }),
  wirbelsturm: S('wirbelsturm', 'wind', 2, 'Wirbelsturm', 'Whirlwind', 'Ein Wirbel tobt einige Sekunden am Ziel.', 'A whirlwind rages at the target for a few seconds.', 22, 4, 'burst', { radius: 40, dur: 3 }),
  // Erde
  steingeschoss: S('steingeschoss', 'erde', 0, 'Steingeschoss', 'Stone Bullet', 'Ein harter, schwerer Stein schießt los.', 'A hard, heavy stone shoots out.', 6, 0.6, 'bolt', { speed: 230, size: 4, range: 200 }),
  erdwall: S('erdwall', 'erde', 1, 'Erdwall', 'Earth Wall', 'Eine Mauer aus Erde wächst am Ziel aus dem Boden.', 'A wall of earth rises at the target.', 12, 3, 'wall', { len: 48, dur: 10, wall: 'erde' }),
  felsbruch: S('felsbruch', 'erde', 2, 'Felsbruch', 'Rock Burst', 'Spitze Felsen brechen am Ziel hervor.', 'Sharp rocks burst out at the target.', 22, 3, 'burst', { radius: 36, dur: 1 }),
  sumpf: S('sumpf', 'erde', 1, 'Sumpf', 'Quagmire', 'Kombinationsmagie aus Wasser und Erde: Der Boden wird zu Schlamm.', 'Combination magic of water and earth: the ground turns to mud.', 16, 5, 'zone', { radius: 40, dur: 8, combo: { wasser: 0 } }),
  // Heilung
  heilung: S('heilung', 'heilung', 0, 'Heilung', 'Heal', 'Schließt kleine Wunden.', 'Closes small wounds.', 8, 1, 'heal', { amount: 25, self: true }),
  grosse_heilung: S('grosse_heilung', 'heilung', 1, 'Große Heilung', 'Greater Heal', 'Heilt viel und lässt dich eine Weile nachheilen.', 'Heals a lot and lets you regenerate for a while.', 18, 3, 'heal', { amount: 60, regen: 3, dur: 8, self: true }),
  heilkreis: S('heilkreis', 'heilung', 2, 'Heilkreis', 'Circle of Healing', 'Ein leuchtender Kreis heilt alle darin.', 'A shining circle heals everyone inside.', 28, 8, 'zone', { radius: 40, dur: 10, heal: 8 }),
  // Entgiftung
  entgiften: S('entgiften', 'entgiftung', 0, 'Entgiften', 'Detoxify', 'Entfernt Gift und Übelkeit.', 'Removes poison and nausea.', 6, 1, 'cleanse', { st: 20 }),
  reinigung: S('reinigung', 'entgiftung', 1, 'Reinigung', 'Purify', 'Reinigt Körper und Geist. Stellt Ausdauer wieder her.', 'Purifies body and mind. Restores stamina.', 12, 4, 'cleanse', { st: 70, ward: 30 }),
  giftbann: S('giftbann', 'entgiftung', 2, 'Giftbann', 'Venom Ward', 'Eine Zeit lang kann dir kein Gift etwas anhaben.', 'For a while, no poison can touch you.', 20, 10, 'cleanse', { st: 100, ward: 120 }),
  // Barriere
  schutzschild: S('schutzschild', 'barriere', 0, 'Schutzschild', 'Protective Shield', 'Ein leichter Schild fängt Treffer ab.', 'A light shield absorbs hits.', 10, 6, 'shield', { hp: 25, dur: 20 }),
  magiewand: S('magiewand', 'barriere', 1, 'Magiewand', 'Magic Wall', 'Eine durchscheinende Wand aus Licht am Ziel.', 'A translucent wall of light at the target.', 14, 4, 'wall', { len: 56, dur: 8, wall: 'licht' }),
  heiliger_schild: S('heiliger_schild', 'barriere', 2, 'Heiliger Schild', 'Holy Shield', 'Ein starker Schild, der dich langsam heilt.', 'A strong shield that slowly heals you.', 26, 12, 'shield', { hp: 80, dur: 30, regen: 1.5 }),
  // Beschwörung
  irrlicht: S('irrlicht', 'beschwoerung', 0, 'Irrlicht', 'Will-o\'-Wisp', 'Ein kleines Licht folgt dir.', 'A small light follows you.', 8, 2, 'summon', { summon: 'irrlicht', dur: 120 }),
  vertrauter: S('vertrauter', 'beschwoerung', 1, 'Vertrauter', 'Familiar', 'Ein Geistervogel sammelt Dinge in deiner Nähe ein.', 'A spirit bird gathers things near you.', 16, 4, 'summon', { summon: 'vertrauter', dur: 90 }),
  waechtergeist: S('waechtergeist', 'beschwoerung', 2, 'Wächtergeist', 'Guardian Spirit', 'Ein Geist kreist um dich und zerschlägt, was im Weg steht.', 'A spirit circles you and smashes what is in the way.', 26, 8, 'summon', { summon: 'waechter', dur: 60 }),
  // Mond (nur Foxy)
  mondquelle: S('mondquelle', 'mond', 0, 'Mondquelle', 'Moonspring', 'Eine heilende Quelle am Mauszeiger. Ohne ein Wort.', 'A healing spring at the cursor. Without a word.', 0, 0, 'custom', { fn: 'castMoonspring' }),
  mondlicht: S('mondlicht', 'mond', 0, 'Mondlicht', 'Moonlight', 'Eine Lichtkugel begleitet dich (auch Taste Q).', 'An orb of light accompanies you (also key Q).', 0, 0, 'custom', { fn: 'castMoonlight' }),
  // Sonder
  schleierbruch: S('schleierbruch', 'sonder', 0, 'Schleierbruch', 'Veilbreak', 'Zerreißt Trugbilder und macht verborgene Ruinen kurz sichtbar (auch Taste R).', 'Tears illusions and briefly reveals hidden ruins (also key R).', 0, 0, 'custom', { fn: 'castVeil' }),
};

// Namen der höheren Ränge (noch nicht erlernbar – kein Lehrer dieses Rangs bekannt)
export const HIGH = {
  feuer: [['Sonnenfeuer', 'Sunfire'], ['Glutkrone', 'Ember Crown'], ['Kaiserflamme', 'Emperor Flame'], ['Ewige Flamme', 'Eternal Flame']],
  wasser: [['Kumulonimbus', 'Cumulonimbus'], ['Eiskönigin', 'Ice Queen'], ['Meeresgrab', 'Ocean Grave'], ['Stille Flut', 'Silent Tide']],
  wind: [['Sturmschnitt', 'Storm Cut'], ['Himmelsklinge', 'Sky Blade'], ['Orkan', 'Hurricane'], ['Atem der Welt', 'Breath of the World']],
  erde: [['Bergsturz', 'Landslide'], ['Felsenkönig', 'Rock King'], ['Erdbeben', 'Earthquake'], ['Weltenbruch', 'World Rift']],
  heilung: [['Wiederherstellung', 'Restoration'], ['Königsheilung', 'Royal Heal'], ['Kaiserheilung', 'Imperial Heal'], ['Leben', 'Life']],
  entgiftung: [['Seuchenbann', 'Plague Ward'], ['Königsreinigung', 'Royal Purge'], ['Kaiserreinigung', 'Imperial Purge'], ['Reinheit', 'Purity']],
  barriere: [['Heilige Mauer', 'Holy Wall'], ['Königsbarriere', 'Royal Barrier'], ['Kaiserbarriere', 'Imperial Barrier'], ['Unberührbar', 'Untouchable']],
  beschwoerung: [['Geisterwolf', 'Spirit Wolf'], ['Steinwächter', 'Stone Guardian'], ['Drachenruf', 'Dragon Call'], ['Weltgeist', 'World Spirit']],
};

// Bücher: welche Schulen sie bis zu welchem Rang lehren (Rang-Index, 0 = Anfänger)
export const BOOKS = {
  lehrbuch_magie: { feuer: 1, wasser: 1, wind: 1, erde: 1 },
  buch_heilig: { heilung: 1, entgiftung: 1, barriere: 1 },
  buch_beschwoerung: { beschwoerung: 1 },
  grimoire_feuer: { feuer: 2 }, grimoire_wasser: { wasser: 2 }, grimoire_wind: { wind: 2 }, grimoire_erde: { erde: 2 },
  schleierrolle: { sonder: 0 },
};
export const GRIMOIRES = ['grimoire_feuer', 'grimoire_wasser', 'grimoire_wind', 'grimoire_erde'];

// Lehrer in den Städten (Rang-Index, bis zu dem sie unterrichten)
export const TEACHERS = {
  kaldmere: { name: { de: 'Meister Corvin', en: 'Master Corvin' }, teach: { feuer: 2, erde: 1, barriere: 1 } },
  weidenfurt: { name: { de: 'Lehrerin Hedda', en: 'Teacher Hedda' }, teach: { erde: 1, heilung: 0, wasser: 0 } },
  mervasque: { name: { de: 'Magistra Liora', en: 'Magistra Liora' }, teach: { wasser: 1, wind: 1 } },
  grauhorn: { name: { de: 'Runenmeister Brakk', en: 'Runemaster Brakk' }, teach: { erde: 2, feuer: 1 } },
  velcair: { name: { de: 'Schwester Amaline', en: 'Sister Amaline' }, teach: { wasser: 2, heilung: 2, entgiftung: 2, barriere: 2 } },
  sefra: { name: { de: 'Windleserin Zahra', en: 'Windreader Zahra' }, teach: { wind: 2, wasser: 0 } },
  qalimra: { name: { de: 'Beschwörer Idris', en: 'Summoner Idris' }, teach: { beschwoerung: 2, feuer: 1, wind: 1 } },
};
export const TEACH_COST = [15, 45, 110];
