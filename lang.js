/* =========================================================
   GLUTWERK · Sprache (Deutsch / English)
   - Erkennt die Sprache automatisch aus dem Browser:
     Steht Deutsch irgendwo in den Spracheinstellungen → Deutsch, sonst Englisch.
   - Der Knopf DE / EN oben in der Leiste schaltet um, die Wahl wird gespeichert.

   So übersetzt du etwas:
   - Im HTML:  <span data-en="Play">Spielen</span>
               <input placeholder="Suchen…" data-en-ph="Search…">
               <button title="Schließen" data-en-title="Close">
   - Im JavaScript:  L("Spielen", "Play")
   ========================================================= */
(function () {
  const KEY = "glutwerk-lang";
  function store(v) { try { if (v === undefined) return localStorage.getItem(KEY); localStorage.setItem(KEY, v); } catch (e) { return null; } }

  function detect() {
    const s = store();
    if (s === "de" || s === "en") return s;
    const list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "de"]).map(x => String(x).toLowerCase());
    return list.some(x => x.startsWith("de")) ? "de" : "en";
  }

  const LANG = detect();
  window.LANG = LANG;
  window.EN = LANG === "en";
  window.L = (de, en) => (LANG === "en" && en != null ? en : de);
  document.documentElement.lang = LANG;

  /* Alle markierten Elemente auf die aktuelle Sprache setzen */
  window.applyLang = function (root) {
    if (LANG !== "en") return;
    (root || document).querySelectorAll("[data-en]").forEach(el => { el.innerHTML = el.dataset.en; });
    (root || document).querySelectorAll("[data-en-ph]").forEach(el => { el.placeholder = el.dataset.enPh; });
    (root || document).querySelectorAll("[data-en-title]").forEach(el => { el.title = el.dataset.enTitle; });
  };

  window.setLang = function (l) { store(l); location.reload(); };

  /* Umschalt-Knopf: in ein Element mit id="langSlot" oder ans Ende des <header> */
  function button() {
    const css = document.createElement("style");
    css.textContent = `.lang-sw{display:inline-flex;align-items:center;border:1px solid rgba(255,255,255,.14);border-radius:10px;overflow:hidden;flex:none;height:36px;background:rgba(255,255,255,.04)}
.lang-sw button{all:unset;cursor:pointer;padding:0 9px;height:100%;display:flex;align-items:center;font:700 12px/1 Inter,system-ui,sans-serif;letter-spacing:.6px;color:#8a93a8}
.lang-sw button.on{background:linear-gradient(135deg,#ff6a2b,#ffb347);color:#140800}
.lang-sw button:not(.on):hover{color:#e8ebf2}`;
    document.head.appendChild(css);
    const w = document.createElement("div");
    w.className = "lang-sw";
    w.title = LANG === "en" ? "Sprache / Language" : "Sprache / Language";
    w.innerHTML = `<button type="button" data-l="de" class="${LANG === "de" ? "on" : ""}">DE</button><button type="button" data-l="en" class="${LANG === "en" ? "on" : ""}">EN</button>`;
    w.addEventListener("click", e => { const b = e.target.closest("[data-l]"); if (b && b.dataset.l !== LANG) setLang(b.dataset.l); });
    const slot = document.getElementById("langSlot") || document.querySelector("header");
    if (slot) slot.appendChild(w);
  }

  document.addEventListener("DOMContentLoaded", () => { applyLang(); button(); });
})();
