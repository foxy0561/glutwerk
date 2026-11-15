// Quest-Fortschritt: Status (inactive/active/done), aktuelle Stufe, verfolgte Quest.
import { QUESTS } from '../data/quests.js';
import { L, t } from '../core/i18n.js';
import { audio } from '../engine/Audio.js';

export class QuestSystem {
  constructor(game, data) {
    this.game = game;
    this.q = {};
    this.tracked = 'main_erwachen';
    for (const id in QUESTS) this.q[id] = { status: 'inactive', stage: 0 };
    if (data) { for (const id in data.q || {}) if (this.q[id]) this.q[id] = { ...data.q[id] }; this.tracked = data.tracked || this.tracked; }
  }
  serialize() { return { q: JSON.parse(JSON.stringify(this.q)), tracked: this.tracked }; }
  get(id) { return { ...this.q[id], def: QUESTS[id] }; }
  start(id, silent = false) {
    const s = this.q[id]; if (!s || s.status !== 'inactive') return;
    s.status = 'active'; s.stage = 0;
    if (QUESTS[id].type !== 'main' && this.q[this.tracked]?.status !== 'active') this.tracked = id;
    if (!this.tracked || this.q[this.tracked].status !== 'active') this.tracked = id;
    if (!silent) { this.game.ui.banner(t('newQuest'), L(QUESTS[id].title), 'quest'); audio.sfx('quest'); }
    this.check(); this.changed();
  }
  advance(id, stage) {
    const s = this.q[id]; if (!s) return;
    if (s.status === 'inactive') s.status = 'active';
    if (stage <= s.stage) return;
    s.stage = Math.min(stage, QUESTS[id].stages.length - 1);
    this.game.ui.toast(t('questUpdated') + ': ' + L(QUESTS[id].stages[s.stage].text), 'quest');
    audio.sfx('quest');
    this.check(); this.changed();
  }
  complete(id) {
    const s = this.q[id]; if (!s || s.status === 'done') return;
    s.status = 'done'; s.stage = QUESTS[id].stages.length;
    const r = QUESTS[id].reward || {};
    this.game.ui.banner(t('questComplete'), L(QUESTS[id].title), 'done');
    audio.sfx('questDone');
    if (r.gold) this.game.api.gold(r.gold);
    (r.items || []).forEach(([it, n]) => this.game.api.give(it, n));
    if (r.xp) this.game.addXp(r.xp);
    if (this.tracked === id) { const next = Object.keys(this.q).find(k => this.q[k].status === 'active'); this.tracked = next || null; }
    this.changed();
  }
  // Sammelziele automatisch prüfen
  check() {
    for (const id in this.q) {
      const s = this.q[id]; if (s.status !== 'active') continue;
      const st = QUESTS[id].stages[s.stage];
      if (st && st.collect && this.game.inventory.count(st.collect) >= st.count) this.advance(id, s.stage + 1);
    }
  }
  progress(id) {
    const s = this.q[id]; const st = QUESTS[id].stages[s.stage]; if (!st) return [0, 0];
    if (st.collect) return [Math.min(st.count, this.game.inventory.count(st.collect)), st.count];
    if (st.memory) return [Object.keys(this.game.state.world.memLit || {}).length, st.count];
    return [0, st.count];
  }
  active() { return Object.keys(this.q).filter(k => this.q[k].status === 'active'); }
  done() { return Object.keys(this.q).filter(k => this.q[k].status === 'done'); }
  changed() { this.game.events.emit('quests'); }
}
