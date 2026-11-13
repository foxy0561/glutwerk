/* =========================================================
   GLUTWERK · Immer die neueste Version
   GitHub Pages lässt den Browser Seiten bis zu 10 Minuten zwischenspeichern.
   Diese Datei fragt beim Öffnen kurz nach, ob online schon eine neuere Fassung
   der Seite liegt, und lädt dann einmal neu.
   ========================================================= */
(function () {
  if (!/^https?:/.test(location.protocol) || /^(localhost|127\.)/.test(location.hostname)) return;
  const key = "gw-frisch:" + location.pathname;
  let ss = null; try { ss = sessionStorage; } catch (e) {}
  const mine = Date.parse(document.lastModified);
  fetch(location.pathname, { method: "HEAD", cache: "no-store" }).then(r => {
    const lm = Date.parse(r.headers.get("last-modified") || "");
    if (!lm || !mine) return;
    if (lm > mine + 2000) {
      if (ss && ss.getItem(key) === String(lm)) return;   // schon einmal versucht, keine Schleife
      if (ss) ss.setItem(key, String(lm));
      location.reload();
    } else if (ss) ss.removeItem(key);
  }).catch(() => {});
})();
