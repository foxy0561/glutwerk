// Zweisprachigkeit (Deutsch/Englisch). Texte liegen entweder im UI-Wörterbuch oder als {de, en} direkt in den Daten.
import { STRINGS } from '../data/strings.js';

let lang = 'de';
const listeners = new Set();

export function setLang(l) { lang = l === 'en' ? 'en' : 'de'; listeners.forEach(f => f(lang)); }
export function getLang() { return lang; }
export function onLang(f) { listeners.add(f); }

// UI-Schlüssel übersetzen, {platzhalter} ersetzen
export function t(key, vars) {
  const e = STRINGS[key];
  let s = e ? (e[lang] ?? e.de) : key;
  if (vars) for (const k in vars) s = s.replaceAll('{' + k + '}', vars[k]);
  return s;
}
// Datenobjekt {de, en} oder String auflösen
export function L(v, vars) {
  if (v == null) return '';
  let s = typeof v === 'string' ? v : (v[lang] ?? v.de ?? '');
  if (vars) for (const k in vars) s = s.replaceAll('{' + k + '}', vars[k]);
  return s;
}
