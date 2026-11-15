// Schnittstelle für Dialoge, Quests und UI – kapselt Zugriffe auf Inventar, Quests und Flags.
import { ITEMS } from '../data/items.js';
import { t, L } from '../core/i18n.js';
import { audio } from '../engine/Audio.js';

export class GameAPI {
  constructor(game) { this.g = game; }
  quest(id) { const s = this.g.quests.q[id]; return { status: s.status, stage: s.stage }; }
  startQuest(id) { this.g.quests.start(id); }
  advance(id, st) { this.g.quests.advance(id, st); }
  completeQuest(id) { this.g.quests.complete(id); }
  has(id, n = 1) { return this.g.inventory.count(id) >= n; }
  take(id, n = 1) { this.g.inventory.remove(id, n); }
  give(id, n = 1) {
    const left = this.g.inventory.add(id, n);
    const def = ITEMS[id];
    if (n - left > 0) this.g.ui.toast(t('gotItem', { n: n - left, item: L(def.name) }), 'item', 2.5, def.icon);
    if (left > 0) this.g.ui.toast(t('invFull'), 'warn');
    this.g.quests.check();
  }
  gold(n) { this.g.inventory.gold += n; this.g.events.emit('inventory'); if (n > 0) { this.g.ui.toast(t('gotGold', { n }), 'gold', 2.5, 'coin'); audio.sfx('coin'); } }
  flag(k) { return !!this.g.state.flags[k]; }
  setFlag(k, v = 1) { this.g.state.flags[k] = v; }
  openShop(id) { this.g.ui.openShop(id); }

  useItem(id) {
    const g = this.g, def = ITEMS[id], P = g.state.player;
    if (!def) return;
    if (!g.inventory.count(id)) return;
    if (def.slot) { // Ausrüsten
      const i = g.inventory.slots.findIndex(s => s && s.id === id);
      if (i >= 0) { g.inventory.equipFrom(i); audio.sfx('click'); g.ui.toast(t('equipped') + ': ' + L(def.name), 'info', 2); }
      return;
    }
    if (!def.use) { g.ui.toast(t('nothingHappens'), 'info', 2); return; }
    if (def.use.special === 'learnVeil') {
      P.spells = P.spells || {};
      if (P.spells.veil || P.foxy) { g.ui.toast(L({ de: 'Diesen Zauber kennst du schon.', en: 'You already know this spell.' }), 'info', 2); return; }
      P.spells.veil = true; g.inventory.remove(id, 1); audio.sfx('magic');
      const key = (g.input.bindings.veil || 'KeyR').replace('Key', '');
      g.ui.toast(L({ de: `Zauber gelernt: Schleierbruch [${key}]`, en: `Spell learned: Veilbreak [${key}]` }), 'secret', 4);
      return;
    }
    if (def.use.special === 'memory') {
      const q = g.quests.get('main_erwachen');
      if (g.state.world.memoryMode) return;
      if (q.status === 'active' && q.stage === 5) { g.ui.closeAll(); g.startMemory(); }
      else g.ui.toast(L({ de: 'Der Splitter ist still. Vielleicht später, an einem anderen Ort.', en: 'The shard is silent. Perhaps later, somewhere else.' }), 'info', 3);
      return;
    }
    if (g.state.world.memoryMode) { g.ui.toast(t('cantUseNow'), 'warn'); return; }
    const st = g.stats(); const u = def.use; const out = [];
    if (u.hp) { const v = Math.min(u.hp, st.maxHp - P.hp); P.hp += v; out.push(`+${Math.round(v)} ${t('hp')}`); }
    if (u.mp) { const v = Math.min(u.mp, st.maxMp - P.mp); P.mp += v; out.push(`+${Math.round(v)} ${t('mp')}`); }
    if (u.st) { const v = Math.min(u.st, st.maxSt - P.st); P.st += v; out.push(`+${Math.round(v)} ${t('st')}`); }
    g.inventory.remove(id, 1);
    audio.sfx(def.cat === 'potion' ? 'magic' : 'pickup');
    g.particles.burst(g.player.x, g.player.y - 14, 12, { color: def.cat === 'potion' ? ['#ff8a9a', '#ffffff'] : ['#93bd5c', '#ffffff'], speed: 25, life: 0.7, up: -15, glow: true });
    g.ui.toast(L(def.name) + ': ' + (out.join(', ') || t('nothingHappens')), 'info', 2.2);
    g.events.emit('player');
  }
  useHotbar(i) {
    const id = this.g.inventory.hotbar[i];
    this.g.ui.hud.flashHotbar(i);
    if (!id) return;
    if (i === 0) return; // Slot 1 = Waffe
    this.useItem(id);
  }
}
