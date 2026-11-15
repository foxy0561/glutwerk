// Bewohner der Welt: Namen, kurze Sätze (wenig Text), Händlerwaren und Aussehen je Reich.
import { SKIN_TONES, HAIR_COLORS, EYE_COLORS } from '../art/palette.js';

export const NAMES = {
  draventhal: ['Aldric', 'Mara', 'Joren', 'Liese', 'Henrik', 'Berta', 'Konrad', 'Ilse', 'Tobias', 'Greta', 'Lorenz', 'Agnes'],
  saltrivo: ['Vasco', 'Lucia', 'Enzo', 'Marisa', 'Dario', 'Paola', 'Rocco', 'Nina', 'Sandro', 'Elena'],
  brennvald: ['Grimm', 'Hedda', 'Ulf', 'Sigrun', 'Bror', 'Ragna', 'Torvald', 'Ylva', 'Harald', 'Kari'],
  valcrest: ['Bruder Anselm', 'Schwester Clarisse', 'Bruder Felix', 'Schwester Ida', 'Pilger Matthis', 'Bruder Lucan', 'Schwester Odila'],
  sarkhazim: ['Tamir', 'Zaya', 'Kesh', 'Nahla', 'Rafi', 'Imani', 'Saro', 'Lyth', 'Amar', 'Sefi'],
  fennwyrd: ['Fenna', 'Oskar', 'Wynn'],
  asche: ['Magister Voss', 'Adeptin Ilka', 'Magister Rhun'],
};

const S = (de, en) => ({ de, en });
export const LINES = {
  draventhal: [
    S('Seit dem Knall in Kaldmere sind überall Wachen.', 'Since the blast in Kaldmere there are guards everywhere.'),
    S('Die Ernte war gut. Die Steuern sind besser.', 'The harvest was good. The taxes are better.'),
    S('Der König soll getobt haben. Niemand weiß, was explodiert ist.', 'They say the king raged. Nobody knows what exploded.'),
    S('Bleib auf der Königsstraße, dann passiert dir nichts.', 'Stay on the King\'s Road and nothing will happen to you.'),
  ],
  saltrivo: [
    S('Alles hat einen Preis. Fast alles.', 'Everything has a price. Almost everything.'),
    S('Die Graue Straße ist ruhig heute. Gut fürs Geschäft.', 'The Grey Strait is calm today. Good for business.'),
    S('Wenn du ein Schiff suchst: am Kai.', 'If you are looking for a ship: at the quay.'),
  ],
  brennvald: [
    S('Kalt hier oben, was? Die Minen sind kälter.', 'Cold up here, eh? The mines are colder.'),
    S('Grauhorns Schmieden brennen Tag und Nacht.', 'Grauhorn\'s forges burn day and night.'),
    S('Geh nicht in die alten Stollen. Da unten wohnt was.', 'Don\'t go into the old shafts. Something lives down there.'),
  ],
  valcrest: [
    S('Das Ewige Licht sei mit dir.', 'May the Eternal Light be with you.'),
    S('Bist du Pilger? Die Quelle von Lichtbrunn heilt, sagt man.', 'Are you a pilgrim? They say the spring of Lichtbrunn heals.'),
    S('Die Sternwarte hat vor dem Knall ein Zeichen gesehen.', 'The observatory saw a sign before the blast.'),
  ],
  sarkhazim: [
    S('Hier gilt kein Siegel. Atme durch.', 'No seal holds here. Breathe.'),
    S('Trink, bevor du durstig bist. Die Wüste wartet nicht.', 'Drink before you are thirsty. The desert does not wait.'),
    S('Die Karawane nach Qal\'Imra zieht bei Mondaufgang.', 'The caravan to Qal\'Imra leaves at moonrise.'),
  ],
  fennwyrd: [
    S('Leise. Im Nebel hört man jeden Schritt.', 'Quiet. In the fog you hear every step.'),
    S('Die Jäger kommen über die Dornbucht.', 'The hunters come through the Dornbucht.'),
  ],
  asche: [
    S('Morvhal empfängt keine Gäste.', 'Morvhal receives no guests.'),
    S('Die Asche ist warm. Der Berg schläft nur.', 'The ash is warm. The mountain only sleeps.'),
  ],
};

export const SHOPS = {
  draventhal: [['heiltrank', 25], ['apfel', 3], ['brot', 5], ['eisenschwert', 60], ['leinenhemd', 18], ['lederweste', 65]],
  saltrivo: [['heiltrank', 28], ['manatrank', 28], ['brot', 6], ['apfel', 4], ['sandklinge', 110], ['mondanhaenger', 150]],
  brennvald: [['eisenerz', 9], ['eisenschwert', 50], ['lederweste', 55], ['brot', 6], ['ausdauertrank', 32]],
  valcrest: [['heiltrank', 22], ['manatrank', 22], ['ausdauertrank', 30], ['eichenstab', 55], ['mondanhaenger', 130], ['schleierrolle', 70]],
  sarkhazim: [['ausdauertrank', 26], ['heiltrank', 26], ['apfel', 3], ['sandklinge', 90], ['jagdbogen', 55]],
  asche: [['manatrank', 20], ['eichenstab', 50], ['schleierrolle', 90]],
};

const CLOTH = {
  draventhal: ['#93283c', '#6e1d2e', '#7a5a2a', '#3c5a2e', '#5e4a3c'], saltrivo: ['#2f6672', '#3f6a6a', '#c9952f', '#8a3f1e'],
  brennvald: ['#3a3448', '#5e4a3c', '#46404c', '#615e6d'], valcrest: ['#e8e4ee', '#5b4f7a', '#d9d4e8'],
  sarkhazim: ['#c9952f', '#8a3f1e', '#2f6672', '#b88f58'], fennwyrd: ['#3c5a2e', '#5e4a3c'], asche: ['#2e2a36', '#5b3a7a'],
};
const OUTFIT = { draventhal: ['tunika', 'tunika', 'mantel', 'leder'], saltrivo: ['mantel', 'tunika', 'leder'], brennvald: ['leder', 'mantel'], valcrest: ['robe', 'robe', 'mantel'], sarkhazim: ['mantel', 'robe', 'leder'], fennwyrd: ['mantel', 'leder'], asche: ['robe'] };
const SPECIES = { draventhal: ['mensch'], saltrivo: ['mensch', 'mensch', 'mensch', 'katze'], brennvald: ['mensch', 'mensch', 'wolf'], valcrest: ['mensch'], sarkhazim: ['katze', 'katze', 'mensch'], fennwyrd: ['mensch', 'fuchs'], asche: ['mensch'] };

export function randomApp(region, r) {
  const pick = a => a[Math.floor(r() * a.length)];
  const sp = pick(SPECIES[region] || ['mensch']);
  const skins = region === 'sarkhazim' ? SKIN_TONES.slice(2) : region === 'brennvald' || region === 'valcrest' ? SKIN_TONES.slice(0, 3) : SKIN_TONES.slice(0, 5);
  return {
    body: r() < 0.5 ? 'm' : 'f', species: sp, skin: pick(skins),
    hair: pick(['kurz', 'lang', 'zopf', 'wild', 'dutt']), hairColor: sp === 'wolf' ? pick(['#8a8794', '#6a6670', '#b3b0bb']) : sp === 'katze' ? pick(['#e8d49a', '#c8732e', '#7a4a2c']) : pick(HAIR_COLORS.slice(0, 7)),
    eyes: pick(EYE_COLORS), outfit: pick(OUTFIT[region] || ['tunika']), cloth: pick(CLOTH[region] || CLOTH.draventhal),
  };
}
