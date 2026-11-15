// Gegenstandsdatenbank. Neue Items einfach hier ergänzen (Icon in art/iconArt.js).
export const RARITY = {
  common: { de: 'Gewöhnlich', en: 'Common', color: '#cfc6b4' },
  uncommon: { de: 'Ungewöhnlich', en: 'Uncommon', color: '#7fd06a' },
  rare: { de: 'Selten', en: 'Rare', color: '#5aa6f0' },
  epic: { de: 'Episch', en: 'Epic', color: '#b67cf5' },
  legendary: { de: 'Legendär', en: 'Legendary', color: '#f0b850' },
};
export const CATEGORY = {
  weapon: { de: 'Waffe', en: 'Weapon' }, armor: { de: 'Rüstung', en: 'Armour' }, food: { de: 'Nahrung', en: 'Food' },
  potion: { de: 'Trank', en: 'Potion' }, resource: { de: 'Ressource', en: 'Resource' }, quest: { de: 'Questgegenstand', en: 'Quest item' },
  material: { de: 'Material', en: 'Material' }, artifact: { de: 'Artefakt', en: 'Artefact' },
};
const WT = { sword: { de: 'Schwert', en: 'Sword' }, staff: { de: 'Magischer Stab', en: 'Magic staff' }, bow: { de: 'Bogen', en: 'Bow' }, dagger: { de: 'Dolch', en: 'Dagger' } };
export const WEAPON_TYPE = WT;

export const ITEMS = {
  eisenschwert: { name: { de: 'Eisenschwert', en: 'Iron Sword' }, cat: 'weapon', wtype: 'sword', slot: 'weapon', rarity: 'common', weight: 3.0, value: 50, stack: 1, icon: 'sword', stats: { dmg: 12, spd: 1.0 },
    desc: { de: 'Ein robustes Schwert aus Eisen. Zuverlässig und gut ausbalanciert.', en: 'A sturdy iron sword. Reliable and well balanced.' } },
  eichenstab: { name: { de: 'Eichenstab', en: 'Oak Staff' }, cat: 'weapon', wtype: 'staff', slot: 'weapon', rarity: 'common', weight: 2.2, value: 45, stack: 1, icon: 'staff', stats: { dmg: 9, spd: 0.9 },
    desc: { de: 'Ein Stab aus altem Eichenholz mit einem matten Kristall an der Spitze.', en: 'A staff of old oak, topped with a dull crystal.' } },
  jagdbogen: { name: { de: 'Jagdbogen', en: 'Hunting Bow' }, cat: 'weapon', wtype: 'bow', slot: 'weapon', rarity: 'common', weight: 1.6, value: 48, stack: 1, icon: 'bow', stats: { dmg: 10, spd: 1.1 },
    desc: { de: 'Ein leichter Bogen aus Eibe, wie ihn die Jäger im Fennwyrd benutzen.', en: 'A light yew bow, as used by hunters in the Fennwyrd.' } },
  sandklinge: { name: { de: 'Sarri-Krummdolch', en: 'Sarri Curved Dagger' }, cat: 'weapon', wtype: 'dagger', slot: 'weapon', rarity: 'uncommon', weight: 0.8, value: 85, stack: 1, icon: 'dagger', stats: { dmg: 9, spd: 1.5 },
    desc: { de: 'Ein schmaler Dolch aus Qal\'Imra. Am Griff hängt eine gesprengte Kette aus Messing.', en: 'A slender dagger from Qal\'Imra. A broken brass chain hangs from the grip.' } },
  leinenhemd: { name: { de: 'Reisekleidung', en: 'Travel Clothes' }, cat: 'armor', slot: 'armor', rarity: 'common', weight: 1.5, value: 15, stack: 1, icon: 'shirt', stats: { armor: 2 },
    desc: { de: 'Einfache, gut geflickte Kleidung für lange Wege.', en: 'Simple, well-patched clothes for long roads.' } },
  lederweste: { name: { de: 'Lederweste', en: 'Leather Vest' }, cat: 'armor', slot: 'armor', rarity: 'uncommon', weight: 3.0, value: 60, stack: 1, icon: 'vest', stats: { armor: 6 },
    desc: { de: 'Gehärtetes Leder mit eingenähten Mondsymbolen. Sie hat schon bessere Tage gesehen.', en: 'Hardened leather stitched with moon symbols. It has seen better days.' } },
  mondanhaenger: { name: { de: 'Mondsichel-Anhänger', en: 'Crescent Pendant' }, cat: 'armor', slot: 'trinket', rarity: 'rare', weight: 0.1, value: 120, stack: 1, icon: 'pendant', stats: { armor: 1, mp: 10 },
    desc: { de: 'Ein kleiner Silberanhänger. Im Mondlicht wird er kühl.', en: 'A small silver pendant. It grows cool in moonlight.' } },
  heiltrank: { name: { de: 'Heiltrank', en: 'Healing Potion' }, cat: 'potion', rarity: 'common', weight: 0.3, value: 25, stack: 10, icon: 'potion_red', use: { hp: 40 },
    desc: { de: 'Stellt 40 Lebenspunkte wieder her.', en: 'Restores 40 health.' } },
  manatrank: { name: { de: 'Manatrank', en: 'Mana Potion' }, cat: 'potion', rarity: 'common', weight: 0.3, value: 25, stack: 10, icon: 'potion_blue', use: { mp: 30 },
    desc: { de: 'Stellt 30 Mana wieder her.', en: 'Restores 30 mana.' } },
  ausdauertrank: { name: { de: 'Ausdauertrank', en: 'Stamina Draught' }, cat: 'potion', rarity: 'uncommon', weight: 0.3, value: 30, stack: 10, icon: 'potion_green', use: { st: 100 },
    desc: { de: 'Ein bitterer Kräutersud. Füllt die Ausdauer vollständig.', en: 'A bitter herbal brew. Fully restores stamina.' } },
  apfel: { name: { de: 'Apfel', en: 'Apple' }, cat: 'food', rarity: 'common', weight: 0.2, value: 3, stack: 20, icon: 'apple', use: { hp: 10, st: 15 },
    desc: { de: 'Knackig und süß.', en: 'Crisp and sweet.' } },
  brot: { name: { de: 'Fladenbrot', en: 'Flatbread' }, cat: 'food', rarity: 'common', weight: 0.3, value: 5, stack: 20, icon: 'bread', use: { hp: 18 },
    desc: { de: 'Am Lagerfeuer gebacken.', en: 'Baked by the campfire.' } },
  waldpilz: { name: { de: 'Waldpilz', en: 'Forest Mushroom' }, cat: 'food', rarity: 'common', weight: 0.1, value: 4, stack: 20, icon: 'mushroom', use: { hp: 6 },
    desc: { de: 'Essbar. Gebraten schmeckt er besser (Kochen folgt in v0.4).', en: 'Edible. Tastes better fried (cooking arrives in v0.4).' } },
  glimmerbeere: { name: { de: 'Glimmerbeeren', en: 'Glimmerberries' }, cat: 'food', rarity: 'uncommon', weight: 0.1, value: 8, stack: 20, icon: 'berry', use: { mp: 12 },
    desc: { de: 'Violette Beeren, die nachts schwach leuchten.', en: 'Violet berries that glow faintly at night.' } },
  mondfarn: { name: { de: 'Mondfarn', en: 'Moonfern' }, cat: 'resource', rarity: 'uncommon', weight: 0.1, value: 12, stack: 20, icon: 'fern',
    desc: { de: 'Ein silbriger Farn, der im Dunkeln leuchtet. Heilerinnen schätzen ihn sehr.', en: 'A silvery fern that glows in the dark. Healers treasure it.' } },
  ast: { name: { de: 'Holz', en: 'Wood' }, cat: 'material', rarity: 'common', weight: 0.8, value: 2, stack: 30, icon: 'wood',
    desc: { de: 'Trockenes Holz. Gut für Feuer und später für Werkzeuge.', en: 'Dry wood. Good for fires and, later, tools.' } },
  eisenerz: { name: { de: 'Eisenerz', en: 'Iron Ore' }, cat: 'material', rarity: 'common', weight: 1.2, value: 6, stack: 30, icon: 'ore', desc: { de: 'Rohes Erz mit rostigen Adern.', en: 'Raw ore with rusty veins.' } },
  stein: { name: { de: 'Feuerstein', en: 'Flint' }, cat: 'material', rarity: 'common', weight: 0.5, value: 2, stack: 30, icon: 'stone', desc: { de: 'Scharfkantig. Gibt Funken.', en: 'Sharp-edged. Makes sparks.' } },
  leder: { name: { de: 'Lederstück', en: 'Leather Scrap' }, cat: 'material', rarity: 'common', weight: 0.4, value: 5, stack: 30, icon: 'leather', desc: { de: 'Gegerbtes Leder.', en: 'Tanned leather.' } },
  farnbuendel: { name: { de: 'Mondfarn-Bündel', en: 'Moonfern Bundle' }, cat: 'quest', rarity: 'rare', weight: 0.2, value: 0, stack: 1, icon: 'fern_bundle', noSell: true,
    desc: { de: 'Von Maren mit Silberfaden gebunden. Es summt leise, wenn du dich dem Tor näherst.', en: 'Bound by Maren with silver thread. It hums softly near the gate.' } },
  tamsis_kiste: { name: { de: 'Tamsis Gewürzkiste', en: 'Tamsi\'s Spice Box' }, cat: 'quest', rarity: 'uncommon', weight: 2.0, value: 0, stack: 1, icon: 'box', noSell: true,
    desc: { de: 'Riecht nach Zimt und Sand. Gehört Tamsi.', en: 'Smells of cinnamon and sand. Belongs to Tamsi.' } },
  mondsplitter: { name: { de: 'Mondsplitter', en: 'Moon Shard' }, cat: 'artifact', rarity: 'legendary', weight: 0.1, value: 0, stack: 1, icon: 'shard', noSell: true, use: { special: 'memory' },
    desc: { de: 'Ein Splitter aus violettem Licht. Wenn du ihn hältst, flüstern Stimmen, die längst verstummt sein sollten.', en: 'A shard of violet light. When you hold it, voices whisper that should have fallen silent long ago.' } },
};

export function item(id) { return ITEMS[id]; }
