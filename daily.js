/* =========================================================
   GLUTWERK · Täglicher Login-Bonus
   Wird auf der Spieleseite und im Karten-Tab geladen.
   Jeden Tag beim ersten Besuch gibt es Glut. Wer jeden Tag kommt,
   baut eine Serie auf: Tag 7 gibt am meisten, danach beginnt die Woche neu.
   Wer einen Tag auslässt, startet wieder bei Tag 1.
   ========================================================= */
(function () {
  const BONUS = [30, 40, 50, 60, 80, 100, 200];   // Glut für Tag 1 bis 7

  const L = window.L || ((de) => de);
  const KARTEN = (document.currentScript && document.currentScript.dataset.karten) || "karten/";
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  const day = d => d.toLocaleDateString("sv");   // JJJJ-MM-TT, Ortszeit
  const heute = day(new Date()), gestern = day(new Date(Date.now() - 864e5));

  let st = {};
  try { st = JSON.parse(store("glutwerk-glut-state") || "{}") || {}; } catch (e) { st = {}; }
  if (st.login === heute) return;

  st.streak = st.login === gestern ? (st.streak || 0) + 1 : 1;
  st.login = heute;
  const tag = ((st.streak - 1) % 7) + 1, menge = BONUS[tag - 1];
  store("glutwerk-glut-state", JSON.stringify(st));
  store("glutwerk-glut", String((parseInt(store("glutwerk-glut") || "0", 10) || 0) + menge));
  const freiOffen = store("glutwerk-freepack") !== heute;

  const css = `
.dl-wrap{position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(3,4,8,.78);backdrop-filter:blur(5px);animation:dlFade .3s}
@keyframes dlFade{from{opacity:0}}
.dl{width:min(460px,100%);text-align:center;padding:26px 22px 22px;border-radius:18px;color:#e8ebf2;font-family:Inter,system-ui,sans-serif;
  background:radial-gradient(circle at 50% 0%,rgba(255,106,43,.35),transparent 60%),linear-gradient(160deg,#1f140e,#12151d);border:1px solid rgba(255,106,43,.45);
  box-shadow:0 20px 60px rgba(0,0,0,.6),0 0 40px rgba(255,106,43,.2);animation:dlPop .5s cubic-bezier(.2,1.4,.4,1)}
@keyframes dlPop{from{transform:scale(.8) translateY(20px);opacity:0}}
.dl h2{font-family:Rajdhani,sans-serif;font-size:30px;text-transform:uppercase;letter-spacing:1px;line-height:1}
.dl .sub{color:#c3c9d6;font-size:14px;margin:6px 0 18px}
.dl-days{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:18px}
.dl-d{border-radius:10px;padding:8px 2px 7px;background:rgba(255,255,255,.04);border:1px solid #2a3040;font-size:11px;color:#8a93a8}
.dl-d b{display:block;font-family:Rajdhani,sans-serif;font-size:17px;color:#c3c9d6;margin-top:2px}
.dl-d.done{background:rgba(255,106,43,.12);border-color:rgba(255,106,43,.35)}
.dl-d.done b{color:#ffb347}
.dl-d.now{background:linear-gradient(160deg,#ff6a2b,#ffb347);border-color:#ffb347;color:#3a1400;transform:scale(1.1);box-shadow:0 0 18px rgba(255,106,43,.6)}
.dl-d.now b{color:#140800}
.dl-d.big b::after{content:"★";font-size:11px;margin-left:1px}
.dl-amt{font-family:Rajdhani,sans-serif;font-weight:700;font-size:54px;line-height:1;color:#ffb347;text-shadow:0 0 24px rgba(255,106,43,.8);margin-bottom:4px}
.dl-amt small{font-size:22px;color:#ffcf9c}
.dl-btns{display:flex;flex-direction:column;gap:8px;margin-top:16px}
.dl-btn{display:block;padding:12px;border-radius:10px;font-family:Rajdhani,sans-serif;font-weight:700;font-size:18px;letter-spacing:1px;text-transform:uppercase;border:none;cursor:pointer;text-decoration:none}
.dl-btn.hot{background:linear-gradient(135deg,#ff6a2b,#ffb347);color:#140800;box-shadow:0 4px 20px rgba(255,106,43,.4)}
.dl-btn.free{background:linear-gradient(135deg,#b26bff,#ff6ad5);color:#1a0b2e;box-shadow:0 4px 20px rgba(178,107,255,.4)}
.dl-btn.ghost{background:rgba(255,255,255,.07);color:#e8ebf2;border:1px solid rgba(255,255,255,.15)}
@media (max-width:420px){.dl-d{font-size:9px}.dl-d b{font-size:14px}}`;

  function zeigen() {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    const imKarten = KARTEN === "./";
    const tage = BONUS.map((n, i) => `<div class="dl-d${i + 1 < tag ? " done" : ""}${i + 1 === tag ? " now" : ""}${i === 6 ? " big" : ""}">${L("Tag", "Day")} ${i + 1}<b>${n}</b></div>`).join("");
    const w = document.createElement("div");
    w.className = "dl-wrap";
    w.innerHTML = `<div class="dl">
      <h2>${st.streak > 1 ? L(`${st.streak} Tage in Folge!`, `${st.streak} days in a row!`) : L("Willkommen zurück!", "Welcome back!")}</h2>
      <div class="sub">${tag === 7 ? L("Tag 7 erreicht: der große Bonus!", "Day 7 reached: the big bonus!") : st.streak > 1 ? L("Komm morgen wieder, dann gibt es mehr.", "Come back tomorrow for more.") : L("Komm jeden Tag vorbei, dann wird der Bonus größer.", "Visit every day and the bonus grows.")}</div>
      <div class="dl-days">${tage}</div>
      <div class="dl-amt">+${menge} <small>Glut</small></div>
      <div class="dl-btns">
        ${freiOffen ? (imKarten ? `<button class="dl-btn free" data-x>${L("🎁 Gratis-Pack wartet!", "🎁 Free pack waiting!")}</button>` : `<a class="dl-btn free" href="${KARTEN}">${L("🎁 Gratis-Pack abholen", "🎁 Get free pack")}</a>`) : ""}
        <button class="dl-btn ${freiOffen ? "ghost" : "hot"}" data-x>${L("Einsammeln", "Collect")}</button>
      </div></div>`;
    document.body.appendChild(w);
    const zu = () => { w.remove(); if (typeof renderGlut === "function") renderGlut("bump"); };
    w.querySelectorAll("[data-x]").forEach(b => b.onclick = zu);
    w.addEventListener("click", e => { if (e.target === w) zu(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(zeigen, 400));
  else setTimeout(zeigen, 400);
})();
