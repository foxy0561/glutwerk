/* =========================================================
   GLUTWERK · Nichts markieren
   Schrift, Bilder und Karten lassen sich nicht mehr markieren,
   ziehen oder per Rechtsklick/langem Drücken kopieren.
   Eingabefelder (z. B. das Feedback) funktionieren weiter normal.
   ========================================================= */
(function () {
  const s = document.createElement("style");
  s.textContent = `html,body,*{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
input,textarea,[contenteditable="true"],input *,textarea *{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}
img,svg{-webkit-user-drag:none}`;
  document.head.appendChild(s);
  const feld = e => e.target.closest && e.target.closest("input,textarea,[contenteditable=true]");
  document.addEventListener("contextmenu", e => { if (!feld(e)) e.preventDefault(); });
  document.addEventListener("dragstart", e => { if (e.target.tagName === "IMG" || e.target.tagName === "A") e.preventDefault(); });
  document.addEventListener("selectstart", e => { if (!feld(e)) e.preventDefault(); });
})();
