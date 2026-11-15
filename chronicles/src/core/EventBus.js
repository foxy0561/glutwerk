// Einfacher Ereignisbus zur Entkopplung von Systemen und UI.
export class EventBus {
  constructor() { this.map = new Map(); }
  on(ev, fn) { if (!this.map.has(ev)) this.map.set(ev, new Set()); this.map.get(ev).add(fn); return () => this.map.get(ev).delete(fn); }
  emit(ev, ...a) { const s = this.map.get(ev); if (s) for (const fn of [...s]) fn(...a); }
}
