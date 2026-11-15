// Spezies, Klassen und Erscheinungsoptionen – basierend auf den Völkern Thyrvennas.
// Neue Optionen einfach ergänzen; die Charaktererstellung liest alles von hier.
export const ATTRS = ['str', 'dex', 'vit', 'int', 'wil', 'end'];

export const SPECIES = {
  mensch: {
    name: { de: 'Mensch', en: 'Human' }, mod: { str: 0, dex: 0, vit: 1, int: 0, wil: 0, end: 1 },
    desc: { de: 'Vielseitig und anpassungsfähig. Menschen leben fast überall in Thyrvenna und zaubern nur mit Sprüchen und Gesten.', en: 'Versatile and adaptable. Humans live almost everywhere in Thyrvenna and cast only with words and gestures.' },
  },
  fuchs: {
    name: { de: 'Fuchsmensch', en: 'Foxkin' }, mod: { str: -1, dex: 1, vit: 0, int: 2, wil: 0, end: 0 },
    desc: { de: 'Kinder des Mondes aus dem Fennwyrd. Feines Gehör und Begabung für Wasser-, Erd- und Heilmagie. Fast ausgerottet und gejagt.', en: 'Children of the Moon from the Fennwyrd. Keen hearing and a gift for water, earth and healing magic. Nearly wiped out and hunted.' },
  },
  wolf: {
    name: { de: 'Grauwolf', en: 'Greywolf' }, mod: { str: 2, dex: 0, vit: 1, int: -1, wil: 0, end: 1 },
    desc: { de: 'Das Wolfsvolk der Berge. Enorme Kraft und Ausdauer, kaum Magie. Viele schuften in den Minen von Brennvald.', en: 'The wolf folk of the mountains. Great strength and stamina, little magic. Many toil in the mines of Brennvald.' },
  },
  katze: {
    name: { de: 'Sarri (Sandkatze)', en: 'Sarri (Sandcat)' }, mod: { str: 0, dex: 2, vit: 0, int: 0, wil: 1, end: 0 },
    desc: { de: 'Freies Volk aus Sar-Khazim. Schnell, gewandt und nachtsichtig. Für viele Demi-Humans der Beweis, dass Freiheit möglich ist.', en: 'A free people of Sar-Khazim. Quick, agile and night-sighted. To many demi-humans, proof that freedom is possible.' },
  },
};

export const CLASSES = {
  krieger: {
    name: { de: 'Krieger', en: 'Warrior' }, mod: { str: 2, dex: 0, vit: 1, int: 0, wil: 0, end: 0 },
    weapon: 'eisenschwert', outfit: 'tunika', armor: 'leinenhemd',
    desc: { de: 'Nahkampf mit Schwert und Schild. Viel Leben, starke Treffer.', en: 'Melee with sword and shield. High health, heavy blows.' },
  },
  magier: {
    name: { de: 'Magier', en: 'Mage' }, mod: { str: 0, dex: 0, vit: 0, int: 2, wil: 1, end: 0 },
    weapon: 'eichenstab', outfit: 'robe', armor: 'leinenhemd',
    desc: { de: 'Zauber aus der Distanz. Viel Mana, verletzlich im Nahkampf.', en: 'Spells from afar. Lots of mana, fragile up close.' },
  },
  waldlaeufer: {
    name: { de: 'Waldläufer', en: 'Ranger' }, mod: { str: 0, dex: 2, vit: 0, int: 0, wil: 0, end: 1 },
    weapon: 'jagdbogen', outfit: 'leder', armor: 'leinenhemd',
    desc: { de: 'Bogen, Fallen und leise Schritte. Schnell und ausdauernd.', en: 'Bow, traps and quiet steps. Fast and enduring.' },
  },
};

export const BASE_ATTR = { str: 4, dex: 4, vit: 5, int: 4, wil: 4, end: 5 };

export const OUTFIT_NAMES = {
  tunika: { de: 'Abenteurer-Tunika', en: 'Adventurer tunic' },
  robe: { de: 'Gelehrtenrobe', en: 'Scholar robe' },
  leder: { de: 'Lederwams', en: 'Leather jerkin' },
  mantel: { de: 'Wandermantel', en: 'Wanderer cloak' },
};
export const HAIR_NAMES = {
  kurz: { de: 'Kurz & zerzaust', en: 'Short & tousled' }, lang: { de: 'Lang', en: 'Long' }, zopf: { de: 'Zopf', en: 'Braid' },
  wild: { de: 'Wild', en: 'Wild' }, dutt: { de: 'Dutt', en: 'Bun' },
};

// Versteckter Charakter (Freischaltung über den Fuchsschrein)
export const FOXY = {
  name: 'Foxy',
  title: { de: 'Die letzte Füchsin von Nebelfarn', en: 'The Last Vixen of Nebelfarn' },
  app: { body: 'f', species: 'fuchs', skin: '#f6dcc4', hair: 'lang', hairColor: '#24202a', eyes: '#9a5fe0', outfit: 'mantel', cloth: '#3c5a2e', seal: true, tailTip: '#4a4452' },
  attrs: { str: 3, dex: 7, vit: 4, int: 8, wil: 7, end: 6 },
  passives: [
    { de: 'Stiller Zauber – zaubert ohne Sprüche', en: 'Silent Spell – casts without words' },
    { de: 'Fuchsgehör – kann nicht überrascht werden', en: 'Fox Hearing – cannot be surprised' },
  ],
  desc: { de: 'Sie spricht kaum ein Wort, wenn sie zaubert. Niemand hat ihr gesagt, dass das unmöglich ist. (Was-wäre-wenn: Foxy bleibt in Thyrvenna.)', en: 'She barely speaks a word when she casts. No one told her that is impossible. (What-if: Foxy stays in Thyrvenna.)' },
};

// Erinnerungs-Foxy (16 Jahre, vor der Gefangennahme)
export const FOXY_YOUNG = { ...FOXY.app, seal: false, young: true, outfit: 'mantel', cloth: '#4a5a3a' };

export function derived(attrs, level = 1, equip = {}) {
  return {
    maxHp: 40 + attrs.vit * 10 + (level - 1) * 8,
    maxMp: 20 + attrs.int * 6 + (level - 1) * 4 + (equip.mp || 0),
    maxSt: 70 + attrs.end * 5 + (level - 1) * 3,
    speed: 72 + attrs.dex * 1.2,
  };
}
export function xpForLevel(l) { return Math.round(100 * Math.pow(l, 1.45)); }
