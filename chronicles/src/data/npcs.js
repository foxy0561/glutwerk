// NPCs des Farnlagers: Aussehen, Tagesablauf und Dialoge.
// Dialoge sind kleine Knoten-Graphen. `G` ist die Spiel-Schnittstelle (siehe systems/GameAPI.js).
// Texte bewusst kurz gehalten.

export const NPCS = {
  maren: {
    name: { de: 'Maren', en: 'Maren' }, title: { de: 'Heilerin', en: 'Healer' },
    app: { body: 'f', species: 'mensch', skin: '#eec3a0', hair: 'dutt', hairColor: '#5a3426', eyes: '#2f9a7a', outfit: 'robe', cloth: '#3f6a6a' },
    // Tagesablauf: Stunde → Kachelposition
    schedule: [[6, [23.2, 37.6]], [10, [25, 35]], [14, [21.8, 38.2]], [19, [26, 32.8]], [23, [22, 31.4]]],
    wander: 1.2,
    dialogue: (G) => {
      const q = G.quest('main_erwachen');
      const nodes = {
        start: {
          text: q.stage === 0 ? { de: 'Du hast es also ins Lager geschafft. Gut. Ich bin Maren.\nSeit der Nacht, in der es in Kaldmere geknallt hat, leuchten die Ruinen. Und das Mondtor dort oben … pulsiert.', en: 'So you made it to the camp. Good. I am Maren.\nSince the night of the blast in Kaldmere, the ruins have been glowing. And the Moon Gate up there … pulses.' }
            : q.stage === 1 ? { de: 'Drei Mondfarne. Du erkennst sie am silbernen Schimmer, gern dort, wo es dunkel ist.', en: 'Three moonferns. You will know them by their silver shimmer, often where it is dark.' }
            : q.stage === 2 ? { de: 'Du hast sie gefunden! Gib her.', en: 'You found them! Hand them over.' }
            : q.stage === 3 ? { de: 'Halte das Bündel an das Tor. Mondfarn gehört Selvane. Vielleicht erkennt das Tor ihn.', en: 'Hold the bundle to the gate. Moonfern belongs to Selvane. Perhaps the gate will recognise it.' }
            : q.status === 'done' ? { de: 'Die Laternen brennen wieder. Ich hätte nie gedacht, dass ich das noch erlebe.', en: 'The lanterns burn again. I never thought I would live to see it.' }
            : { de: 'Was hast du hinter dem Tor gefunden? Ysra sollte davon erfahren.', en: 'What did you find behind the gate? Ysra should hear of it.' },
          options: [
            { show: () => q.stage === 0, text: { de: 'Wie kann ich helfen?', en: 'How can I help?' }, next: 'help' },
            { show: () => q.stage === 2 && G.has('mondfarn', 3), text: { de: '[Mondfarn übergeben]', en: '[Hand over moonfern]' }, next: 'deliver' },
            { text: { de: 'Was ist das für ein Ort?', en: 'What is this place?' }, next: 'place' },
            { text: { de: 'Wer bist du?', en: 'Who are you?' }, next: 'who' },
            { text: { de: 'Ich gehe.', en: 'I will go.' }, next: 'end' },
          ],
        },
        help: {
          text: { de: 'Ich brauche Mondfarn. Drei Stück. Er wächst dort, wo es leuchtet. Ohne ihn kann ich niemanden heilen und vielleicht verstehen wir damit dieses Tor.', en: 'I need moonfern. Three of them. It grows where things glow. Without it I cannot heal anyone, and perhaps it will help us understand that gate.' },
          options: [{ text: { de: 'Ich bringe dir welchen.', en: 'I will bring you some.' }, action: () => { G.advance('main_erwachen', 1); return 'end'; } }],
        },
        deliver: {
          text: { de: 'Silberfaden darum, so. Nimm das Bündel und halte es an das Mondtor. Wenn es Selvanes Pflanze erkennt, öffnet es sich vielleicht.', en: 'Silver thread around it, like so. Take the bundle and hold it to the Moon Gate. If it recognises Selvane\'s plant, it might open.' },
          options: [{ text: { de: 'Ich versuche es.', en: 'I will try.' }, action: () => { G.take('mondfarn', 3); G.give('farnbuendel', 1); G.give('heiltrank', 1); G.advance('main_erwachen', 3); return 'end'; } }],
        },
        place: { text: { de: 'Das Farnlager. Wer hier ist, versteckt sich vor den Jägern aus Saltrivo oder hilft denen, die es tun.', en: 'The Fern Camp. Everyone here is hiding from the hunters of Saltrivo, or helping those who do.' }, options: [{ text: { de: 'Verstehe.', en: 'I see.' }, next: 'start' }] },
        who: { text: { de: 'Eine Heilerin aus Hollerbach. Ich flicke, was die Jäger übrig lassen. Das ist mehr als genug Arbeit.', en: 'A healer from Hollerbach. I patch up whatever the hunters leave behind. That is more than enough work.' }, options: [{ text: { de: 'Danke, Maren.', en: 'Thank you, Maren.' }, next: 'start' }] },
      };
      return nodes;
    },
  },

  ysra: {
    name: { de: 'Ysra', en: 'Ysra' }, title: { de: 'Alte Füchsin', en: 'Old Vixen' },
    app: { body: 'f', species: 'fuchs', skin: '#d9a47c', hair: 'lang', hairColor: '#d8d2dc', eyes: '#d49a28', outfit: 'mantel', cloth: '#5b3a7a' },
    schedule: [[6, [29.2, 31.8]], [12, [33, 30]], [17, [29.2, 31.8]], [22, [24, 30.5]]],
    wander: 0.6,
    dialogue: (G) => {
      const q = G.quest('main_erwachen');
      return {
        start: {
          text: q.stage === 7 ? { de: '… Du warst dort. Ich sehe es an deinen Augen. Was hast du gesehen?', en: '… You were there. I can see it in your eyes. What did you see?' }
            : q.status === 'done' ? { de: 'Die Laternen leuchten. Sie hat sie nie vergessen, scheint es.', en: 'The lanterns are glowing. It seems she never forgot them.' }
            : { de: 'Hm. Du riechst nach Straße und Regen. Setz dich ans Feuer, wenn du willst.', en: 'Hm. You smell of road and rain. Sit by the fire if you like.' },
          options: [
            { show: () => q.stage === 7, text: { de: 'Ein Mädchen mit Fuchsohren. Sie hat die Laternen entzündet, ohne ein Wort.', en: 'A girl with fox ears. She lit the lanterns without a word.' }, next: 'memory' },
            { text: { de: 'Erzähl mir von den Laternen.', en: 'Tell me about the lanterns.' }, next: 'lanterns' },
            { show: () => !G.flag('shrine'), text: { de: 'Gibt es hier noch mehr alte Orte?', en: 'Are there other old places here?' }, next: 'shrine' },
            { text: { de: 'Bis später.', en: 'Later.' }, next: 'end' },
          ],
        },
        lanterns: { text: { de: 'Früher brannten sie jede Nacht. Ein Mädchen aus Nebelfarn hat sie heimlich angezündet. Seit dem letzten Frühling bleiben sie dunkel.', en: 'They used to burn every night. A girl from Nebelfarn lit them in secret. Since last spring they have stayed dark.' }, options: [{ text: { de: 'Was ist mit ihr passiert?', en: 'What happened to her?' }, next: 'girl' }] },
        girl: { text: { de: 'Die Jäger haben sie geholt. Mehr weiß ich nicht. Mehr will ich nicht wissen.', en: 'The hunters took her. That is all I know. All I want to know.' }, options: [{ text: { de: '…', en: '…' }, next: 'start' }] },
        shrine: { text: { de: 'Im Nordwesten steht ein Schrein der Mondfüchsin. Die Büsche haben ihn verschluckt. Wer eine Klinge hat, kommt durch.', en: 'In the northwest stands a shrine of the Moon Vixen. The bushes have swallowed it. Anyone with a blade can get through.' }, options: [{ text: { de: 'Danke.', en: 'Thank you.' }, next: 'start' }] },
        memory: {
          text: { de: 'Ohne ein Wort … ja. So war sie. Der Splitter hat dir gezeigt, was der Wald nicht vergessen will. Behalte ihn. Er wird dir mehr zeigen.', en: 'Without a word … yes. That was her. The shard showed you what the forest refuses to forget. Keep it. It will show you more.' },
          options: [{ text: { de: 'Das werde ich.', en: 'I will.' }, action: () => { G.completeQuest('main_erwachen'); return 'end'; } }],
        },
      };
    },
  },

  brann: {
    name: { de: 'Brann', en: 'Brann' }, title: { de: 'Späher', en: 'Scout' },
    app: { body: 'm', species: 'wolf', skin: '#c99a76', hair: 'wild', hairColor: '#8a8794', eyes: '#d49a28', outfit: 'leder', cloth: '#5e4a3c' },
    schedule: [[5, [37, 24]], [12, [35.5, 26]], [16, [44, 25]], [21, [28.6, 36.6]], [1, [37, 24]]],
    wander: 1.6,
    dialogue: (G) => {
      const q = G.quest('side_holz');
      return {
        start: {
          text: q.status === 'inactive' ? { de: 'Bleib auf den Wegen. Nachts sind die Kreaturen unruhiger als früher.', en: 'Stay on the paths. The creatures have grown restless at night.' }
            : q.status === 'done' ? { de: 'Das Feuer brennt. Gut so.', en: 'The fire is burning. Good.' }
            : G.has('ast', 5) ? { de: 'Das ist genug Holz für zwei Nächte.', en: 'That is enough wood for two nights.' }
            : { de: 'Fünf Stück Holz. Unter den Bäumen liegt genug herum.', en: 'Five pieces of wood. There is plenty lying under the trees.' },
          options: [
            { show: () => q.status === 'inactive', text: { de: 'Kann ich irgendwie helfen?', en: 'Can I help somehow?' }, next: 'offer' },
            { show: () => q.status === 'active' && G.has('ast', 5), text: { de: '[Holz übergeben]', en: '[Hand over wood]' }, action: () => { G.take('ast', 5); G.completeQuest('side_holz'); return 'thanks'; } },
            { text: { de: 'Was jagt hier herum?', en: 'What prowls around here?' }, next: 'creatures' },
            { text: { de: 'Mach\'s gut.', en: 'Take care.' }, next: 'end' },
          ],
        },
        offer: { text: { de: 'Das Feuer frisst mehr Holz, als ich sammeln kann, während ich Wache halte. Bring mir fünf Stück, dann kriegst du was zu essen.', en: 'The fire eats more wood than I can gather while I keep watch. Bring me five pieces and you will get something to eat.' },
          options: [{ text: { de: 'Mache ich.', en: 'Will do.' }, action: () => { G.startQuest('side_holz'); return 'end'; } }, { text: { de: 'Später.', en: 'Later.' }, next: 'end' }] },
        thanks: { text: { de: 'Hier. Marens Brot. Sag ihr nicht, dass ich es weggebe.', en: 'Here. Maren\'s bread. Don\'t tell her I gave it away.' }, options: [{ text: { de: 'Danke!', en: 'Thanks!' }, next: 'end' }] },
        creatures: { text: { de: 'Wölfe, Schleime, Schlimmeres. Seit die Ruinen leuchten, sind sie aggressiver. Ich bin aus den Minen von Brennvald geflohen. Ich lasse mich nicht wieder einsperren.', en: 'Wolves, slimes, worse. Since the ruins started glowing they have grown aggressive. I fled the mines of Brennvald. I will not be caged again.' }, options: [{ text: { de: 'Verstehe.', en: 'I understand.' }, next: 'start' }] },
      };
    },
  },

  tamsi: {
    name: { de: 'Tamsi', en: 'Tamsi' }, title: { de: 'Händlerin aus Qal\'Imra', en: 'Trader from Qal\'Imra' },
    app: { body: 'f', species: 'katze', skin: '#b97f58', hair: 'zopf', hairColor: '#e8d49a', eyes: '#2f9a7a', outfit: 'mantel', cloth: '#8a3f1e' },
    schedule: [[7, [20.5, 33.4]], [13, [21, 34.2]], [20, [20.5, 33.4]]],
    wander: 0.5,
    shop: {
      stock: [['heiltrank', 25], ['manatrank', 25], ['ausdauertrank', 30], ['apfel', 3], ['brot', 5], ['lederweste', 60], ['mondanhaenger', 140]],
      sellRate: 0.4,
    },
    dialogue: (G) => {
      const q = G.quest('side_ladung');
      return {
        start: {
          text: q.status === 'active' && G.has('tamsis_kiste', 1) ? { de: 'Meine Kiste! Du hast sie gefunden!', en: 'My box! You found it!' }
            : { de: 'Gewürze, Tränke, ein bisschen Freiheit. Was darf es sein?', en: 'Spices, potions, a little freedom. What will it be?' },
          options: [
            { show: () => q.status === 'active' && G.has('tamsis_kiste', 1), text: { de: '[Kiste zurückgeben]', en: '[Return the box]' }, action: () => { G.take('tamsis_kiste', 1); G.completeQuest('side_ladung'); return 'thanks'; } },
            { text: { de: 'Zeig mir deine Waren.', en: 'Show me your wares.' }, action: () => { G.openShop('tamsi'); return null; } },
            { show: () => q.status === 'inactive', text: { de: 'Du wirkst besorgt.', en: 'You look worried.' }, next: 'offer' },
            { text: { de: 'Woher kommst du?', en: 'Where are you from?' }, next: 'home' },
            { text: { de: 'Bis bald.', en: 'See you.' }, next: 'end' },
          ],
        },
        offer: { text: { de: 'Meine Gewürzkiste ist in der Nacht über den Bach getrieben. Irgendwo südlich der Brücke liegt sie. Holst du sie mir? Ich zahle gut.', en: 'My spice box drifted across the stream last night. It is somewhere south of the bridge. Will you fetch it? I pay well.' },
          options: [{ text: { de: 'Ich halte die Augen offen.', en: 'I will keep an eye out.' }, action: () => { G.startQuest('side_ladung'); return 'end'; } }, { text: { de: 'Nicht jetzt.', en: 'Not now.' }, next: 'end' }] },
        thanks: { text: { de: 'Nimm diesen Dolch. In Qal\'Imra sagt man, eine gesprengte Kette bringt Glück.', en: 'Take this dagger. In Qal\'Imra they say a broken chain brings luck.' }, options: [{ text: { de: 'Danke, Tamsi.', en: 'Thank you, Tamsi.' }, next: 'end' }] },
        home: { text: { de: 'Aus Qal\'Imra, jenseits des Glasmeers. Dort gilt kein Siegel. Ich bringe Leute dorthin, die es nötig haben. Leise.', en: 'From Qal\'Imra, beyond the Glass Sea. No seal holds there. I bring people there who need it. Quietly.' }, options: [{ text: { de: 'Mutig.', en: 'Brave.' }, next: 'start' }] },
      };
    },
  },
};

// Texte für Objekte (Schild etc.)
export const SIGN_TEXT = {
  de: '↑ Mondtor   ← Farnlager   → Ostruinen   ↓ Laternenbrücke',
  en: '↑ Moon Gate   ← Fern Camp   → East Ruins   ↓ Lantern Bridge',
};
