/* Shardfall – Start und Spielschleife */
(function () {
  "use strict";
  const C = SF.CONFIG;
  let lastTs = 0, acc = 0, uiTimer = 0;

  function loop(ts) {
    const realDt = Math.min(0.1, Math.max(0, (ts - (lastTs || ts)) / 1000)); // nach Tab-Wechsel kein Riesensprung
    lastTs = ts;
    const G = SF.getGame();

    if (G && !G.paused && !G.over) {
      acc += realDt * G.speed;
      let steps = 0;
      while (acc >= C.TICK && steps < C.MAX_STEPS_PER_FRAME * G.speed) {
        SF.step(C.TICK);
        acc -= C.TICK;
        steps++;
      }
      if (steps >= C.MAX_STEPS_PER_FRAME * G.speed) acc = 0;
    } else {
      acc = 0;
    }

    SF.render.frame(G, SF.ui);

    uiTimer += realDt;
    if (uiTimer > 0.1) { uiTimer = 0; SF.ui.refreshHud(); }

    requestAnimationFrame(loop);
  }

  window.addEventListener("DOMContentLoaded", () => {
    SF.render.init(document.getElementById("canvas"));
    SF.ui.init();
    requestAnimationFrame(loop);
  });

  window.addEventListener("beforeunload", () => SF.persist());

  // Fenster verlassen -> automatisch pausieren
  document.addEventListener("visibilitychange", () => {
    const G = SF.getGame();
    if (document.hidden && G && !G.over && !G.paused && G.wave > 0 && document.getElementById("menu").hidden) SF.ui.togglePause(true);
  });
})();
