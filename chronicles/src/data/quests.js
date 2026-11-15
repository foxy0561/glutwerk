// Questdaten. Jede Stufe hat einen Text, optional ein Sammelziel und ein Kartenziel (für Minimap/Weltkarte).
export const QUESTS = {
  main_erwachen: {
    type: 'main', title: { de: 'Das Erwachen', en: 'The Awakening' },
    desc: { de: 'Seit der Nacht, in der es in Kaldmere krachte, leuchten die alten Ruinen im Fennwyrd. Im Farnlager an der Laternenbrücke sucht man nach Antworten.', en: 'Since the night something exploded in Kaldmere, the old ruins in the Fennwyrd glow. At the Fern Camp by the Lantern Bridge, people are looking for answers.' },
    stages: [
      { text: { de: 'Sprich mit der Heilerin in der Siedlung.', en: 'Talk to the healer in the camp.' }, count: 1, target: { npc: 'maren' } },
      { text: { de: 'Sammle Mondfarn', en: 'Gather moonfern' }, collect: 'mondfarn', count: 3, target: { item: 'mondfarn' } },
      { text: { de: 'Bring Maren den Mondfarn.', en: 'Bring the moonfern to Maren.' }, count: 1, target: { npc: 'maren' } },
      { text: { de: 'Halte das Farnbündel an das Mondtor.', en: 'Hold the fern bundle to the Moon Gate.' }, count: 1, target: { pos: [40, 15] } },
      { text: { de: 'Untersuche den Altar im Tor.', en: 'Examine the altar inside the gate.' }, count: 1, target: { pos: [40, 16.5] } },
      { text: { de: 'Benutze den Mondsplitter (Schnellleiste 2).', en: 'Use the Moon Shard (hotbar 2).' }, count: 1, target: null },
      { text: { de: 'Entzünde die Mondlaternen', en: 'Light the moon lanterns' }, count: 3, target: { lanterns: true }, memory: true },
      { text: { de: 'Erzähle Ysra von der Erinnerung.', en: 'Tell Ysra about the memory.' }, count: 1, target: { npc: 'ysra' } },
    ],
    reward: { xp: 120, gold: 40, items: [['mondanhaenger', 1]] },
    next: { de: 'Fortsetzung: „Die Unruhe im Wald“ erscheint in v0.2 (Kampf & Kreaturen).', en: 'Continues in "Unrest in the Woods" with v0.2 (Combat & Creatures).' },
  },
  side_holz: {
    type: 'side', title: { de: 'Holz für das Feuer', en: 'Wood for the Fire' },
    desc: { de: 'Brann hält Wache und hat keine Zeit zum Holzsammeln. Das Lagerfeuer darf nachts nicht ausgehen.', en: 'Brann keeps watch and has no time to gather wood. The campfire must not die at night.' },
    stages: [
      { text: { de: 'Sammle Holz', en: 'Gather wood' }, collect: 'ast', count: 5, target: { item: 'ast' } },
      { text: { de: 'Bring Brann das Holz.', en: 'Bring the wood to Brann.' }, count: 1, target: { npc: 'brann' } },
    ],
    reward: { xp: 45, gold: 20, items: [['brot', 2]] },
  },
  side_ladung: {
    type: 'side', title: { de: 'Tamsis Gewürzkiste', en: 'Tamsi\'s Spice Box' },
    desc: { de: 'Tamsis Gewürzkiste ist in der Nacht über den Bach getrieben. Sie liegt irgendwo südlich der Brücke.', en: 'Tamsi\'s spice box drifted across the stream at night. It lies somewhere south of the bridge.' },
    stages: [
      { text: { de: 'Finde die Kiste südlich der Brücke.', en: 'Find the box south of the bridge.' }, count: 1, target: { pos: [53, 55] } },
      { text: { de: 'Bring Tamsi ihre Kiste.', en: 'Return the box to Tamsi.' }, count: 1, target: { npc: 'tamsi' } },
    ],
    reward: { xp: 45, gold: 15, items: [['sandklinge', 1]] },
  },
  secret_schrein: {
    type: 'secret', title: { de: 'Das Flüstern im Farn', en: 'Whispers in the Fern' },
    desc: { de: 'Ein vergessener Schrein der Mondfüchsin Selvane, versteckt im Nordwesten.', en: 'A forgotten shrine of Selvane, the Moon Vixen, hidden in the northwest.' },
    stages: [{ text: { de: 'Finde den Schrein der Mondfüchsin.', en: 'Find the shrine of the Moon Vixen.' }, count: 1, target: null }],
    reward: { xp: 30, gold: 0, items: [] },
  },
};
