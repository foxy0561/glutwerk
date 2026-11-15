// Inventar mit Rasterplätzen, Stapeln, Gewicht, Ausrüstung und Schnellleiste.
import { ITEMS } from '../data/items.js';

export const INV_SIZE = 24;
export const HOTBAR_SIZE = 10;

export class Inventory {
  constructor(game, data) {
    this.game = game;
    this.slots = new Array(INV_SIZE).fill(null);
    this.equip = { weapon: null, armor: null, trinket: null };
    this.hotbar = new Array(HOTBAR_SIZE).fill(null);
    this.gold = 0;
    if (data) this.load(data);
  }
  load(d) {
    this.slots = (d.slots || []).slice(0, INV_SIZE).map(s => (s && ITEMS[s.id]) ? { id: s.id, n: s.n } : null);
    while (this.slots.length < INV_SIZE) this.slots.push(null);
    this.equip = { weapon: null, armor: null, trinket: null, ...(d.equip || {}) };
    for (const k in this.equip) if (this.equip[k] && !ITEMS[this.equip[k]]) this.equip[k] = null;
    this.hotbar = (d.hotbar || []).slice(0, HOTBAR_SIZE); while (this.hotbar.length < HOTBAR_SIZE) this.hotbar.push(null);
    this.gold = d.gold || 0;
  }
  serialize() { return { slots: this.slots.map(s => s && { id: s.id, n: s.n }), equip: { ...this.equip }, hotbar: [...this.hotbar], gold: this.gold }; }

  count(id) {
    let n = 0; for (const s of this.slots) if (s && s.id === id) n += s.n;
    for (const k in this.equip) if (this.equip[k] === id) n++;
    return n;
  }
  weight() {
    let w = 0; for (const s of this.slots) if (s) w += ITEMS[s.id].weight * s.n;
    for (const k in this.equip) if (this.equip[k]) w += ITEMS[this.equip[k]].weight;
    return Math.round(w * 10) / 10;
  }
  maxWeight() { return 40 + this.game.state.player.attrs.str * 4; }
  usedSlots() { return this.slots.filter(Boolean).length; }

  add(id, n = 1) {
    const def = ITEMS[id]; if (!def) return n;
    let left = n;
    for (const s of this.slots) if (s && s.id === id && s.n < def.stack) { const k = Math.min(def.stack - s.n, left); s.n += k; left -= k; if (!left) break; }
    for (let i = 0; i < this.slots.length && left > 0; i++) if (!this.slots[i]) { const k = Math.min(def.stack, left); this.slots[i] = { id, n: k }; left -= k; }
    this.changed();
    return left; // nicht untergebracht
  }
  remove(id, n = 1) {
    let left = n;
    for (let i = this.slots.length - 1; i >= 0 && left > 0; i--) {
      const s = this.slots[i]; if (!s || s.id !== id) continue;
      const k = Math.min(s.n, left); s.n -= k; left -= k; if (s.n <= 0) this.slots[i] = null;
    }
    if (this.count(id) === 0) this.hotbar = this.hotbar.map(h => h === id && !this.isEquipped(id) ? null : h);
    this.changed();
    return n - left;
  }
  removeAt(i, n = 1) { const s = this.slots[i]; if (!s) return; s.n -= n; if (s.n <= 0) this.slots[i] = null; if (this.count(s.id) === 0) this.hotbar = this.hotbar.map(h => h === s.id ? null : h); this.changed(); }

  isEquipped(id) { return Object.values(this.equip).includes(id); }
  equipped(slot) { const id = this.equip[slot]; return id ? { id, def: ITEMS[id] } : null; }
  equipFrom(i) {
    const s = this.slots[i]; if (!s) return false;
    const def = ITEMS[s.id]; if (!def.slot) return false;
    const prev = this.equip[def.slot];
    this.equip[def.slot] = s.id;
    this.slots[i] = prev ? { id: prev, n: 1 } : null;
    if (def.slot === 'weapon') { this.hotbar[0] = s.id; }
    this.changed();
    return true;
  }
  unequip(slot, toIndex = -1) {
    const id = this.equip[slot]; if (!id) return false;
    let idx = toIndex >= 0 && !this.slots[toIndex] ? toIndex : this.slots.indexOf(null);
    if (idx < 0) return false;
    this.slots[idx] = { id, n: 1 }; this.equip[slot] = null;
    if (slot === 'weapon') this.hotbar[0] = null;
    this.changed();
    return true;
  }
  move(a, b) {
    if (a === b) return;
    const A = this.slots[a], B = this.slots[b];
    if (A && B && A.id === B.id) {
      const st = ITEMS[A.id].stack, k = Math.min(st - B.n, A.n);
      if (k > 0) { B.n += k; A.n -= k; if (A.n <= 0) this.slots[a] = null; this.changed(); return; }
    }
    this.slots[a] = B; this.slots[b] = A; this.changed();
  }
  sort() {
    const order = ['weapon', 'armor', 'potion', 'food', 'artifact', 'quest', 'resource', 'material'];
    const items = this.slots.filter(Boolean);
    items.sort((x, y) => order.indexOf(ITEMS[x.id].cat) - order.indexOf(ITEMS[y.id].cat) || x.id.localeCompare(y.id));
    this.slots = new Array(INV_SIZE).fill(null); items.forEach((s, i) => this.slots[i] = s);
    this.changed();
  }
  setHotbar(i, id) { if (i === 0) return; this.hotbar = this.hotbar.map(h => h === id ? null : h); this.hotbar[i] = id; this.changed(); }
  changed() { this.game.events.emit('inventory'); }
}
