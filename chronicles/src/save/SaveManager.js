// Speichersystem: IndexedDB mit mehreren Plätzen + Autosave, Fallback auf localStorage, Fehlerbehandlung.
const DB_NAME = 'chronicles_of_the_forgotten';
const DB_VER = 1;
export const SLOTS = ['auto', 'slot1', 'slot2', 'slot3'];
export const SAVE_VERSION = 1;

export class SaveManager {
  constructor() { this.db = null; this.mode = 'none'; this.memory = new Map(); }

  async init() {
    try {
      if (!('indexedDB' in window)) throw new Error('no idb');
      this.db = await new Promise((res, rej) => {
        const r = indexedDB.open(DB_NAME, DB_VER);
        r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves'); if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta'); };
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error || new Error('open failed'));
        setTimeout(() => rej(new Error('timeout')), 2500);
      });
      this.mode = 'idb';
    } catch (e) {
      try { localStorage.setItem('__cotf_test', '1'); localStorage.removeItem('__cotf_test'); this.mode = 'local'; }
      catch (e2) { this.mode = 'memory'; }
    }
    return this.mode;
  }
  _tx(store, mode, fn) {
    return new Promise((res, rej) => {
      try {
        const tx = this.db.transaction(store, mode); const st = tx.objectStore(store);
        const req = fn(st);
        tx.oncomplete = () => res(req && req.result); tx.onerror = () => rej(tx.error || new Error('tx error')); tx.onabort = () => rej(tx.error || new Error('aborted'));
      } catch (e) { rej(e); }
    });
  }
  async put(store, key, val) {
    if (this.mode === 'idb') return this._tx(store, 'readwrite', s => s.put(val, key));
    if (this.mode === 'local') { localStorage.setItem(`cotf_${store}_${key}`, JSON.stringify(val)); return; }
    this.memory.set(store + key, JSON.parse(JSON.stringify(val)));
  }
  async get(store, key) {
    if (this.mode === 'idb') return this._tx(store, 'readonly', s => s.get(key));
    if (this.mode === 'local') { const v = localStorage.getItem(`cotf_${store}_${key}`); return v ? JSON.parse(v) : undefined; }
    return this.memory.get(store + key);
  }
  async del(store, key) {
    if (this.mode === 'idb') return this._tx(store, 'readwrite', s => s.delete(key));
    if (this.mode === 'local') { localStorage.removeItem(`cotf_${store}_${key}`); return; }
    this.memory.delete(store + key);
  }

  async save(slot, data) {
    if (!SLOTS.includes(slot)) throw new Error('Unbekannter Speicherplatz');
    const payload = { ...data, version: SAVE_VERSION, savedAt: Date.now() };
    JSON.stringify(payload); // prüft auf nicht serialisierbare Daten
    await this.put('saves', slot, payload);
    return payload;
  }
  async load(slot) {
    const d = await this.get('saves', slot);
    if (!d) throw new Error('Spielstand nicht gefunden');
    if (!d.player || !d.inventory) throw new Error('Spielstand beschädigt');
    return migrate(d);
  }
  async list() {
    const out = {};
    for (const s of SLOTS) {
      try { const d = await this.get('saves', s); out[s] = d ? { name: d.player?.name, level: d.player?.level, savedAt: d.savedAt, playtime: d.playtime, region: d.region, app: d.player?.app } : null; }
      catch (e) { out[s] = { error: true }; }
    }
    return out;
  }
  async remove(slot) { return this.del('saves', slot); }
  async getMeta(key, def) { try { const v = await this.get('meta', key); return v === undefined ? def : v; } catch (e) { return def; } }
  async setMeta(key, val) { try { await this.put('meta', key, val); } catch (e) { /* Meta-Daten sind optional */ } }
}

// Ältere Spielstände an neue Struktur anpassen
function migrate(d) {
  d.world = d.world || {};
  d.quests = d.quests || null;
  return d;
}
