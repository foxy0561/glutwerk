/* =========================================================
   GLUTWERK-KARTEN · Spielfelder und Kartenrücken
   Neue Designs einfach unten in die Listen eintragen.
   ========================================================= */
(function () {
  const FL = '<path d="M12 2c1 4 5 5.5 5 10.5A5 5 0 0 1 7 12.5c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9z"/>';
  const FOX = '<path d="M3 3l5 5h8l5-5-1 9-4 6-4 3-4-3-4-6z" /><path d="M9 13l1.5 1.5M15 13l-1.5 1.5" stroke="#000" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>';
  const LEAF = '<path d="M12 2c6 4 8 10 3 17-2 2-4 3-6 3 0-6 1-12 3-20z"/><path d="M12 2c-6 4-8 10-3 17" opacity=".55"/>';
  const GEM = '<path d="M5 9l3-5h8l3 5-7 11z"/><path d="M5 9h14M9 9l3 11 3-11M8 4l1 5M16 4l-1 5" stroke="#fff" stroke-opacity=".45" stroke-width=".8" fill="none"/>';
  const MOON = '<path d="M15 3a9 9 0 1 0 6 13A8 8 0 0 1 15 3z"/><circle cx="7" cy="7" r="1"/><circle cx="18" cy="20" r=".8"/>';
  const PAW = '<ellipse cx="12" cy="15.5" rx="4.6" ry="4"/><circle cx="6.3" cy="10" r="2"/><circle cx="9.8" cy="6.2" r="2"/><circle cx="14.2" cy="6.2" r="2"/><circle cx="17.7" cy="10" r="2"/>';

  window.RUECKEN = {
    glut:      { name: "Glutwerk",  icon: FL,   text: "Glutwerk" },
    foxy:      { name: "Foxy",      icon: FOX,  text: "Foxy" },
    thyrvenna: { name: "Thyrvenna", icon: LEAF, text: "Thyrvenna" },
    kristall:  { name: "Kristall",  icon: GEM,  text: "Kristall" },
    schatten:  { name: "Schatten",  icon: MOON, text: "Schatten" },
    wildnis:   { name: "Wildnis",   icon: PAW,  text: "Wildnis" },
  };

  window.FELDER = {
    glut:     { name: "Glutschmiede" },
    wald:     { name: "Dschungel",     bild: "img/w-dschungel.webp", farbe: "#0c1a0e" },
    nebel:    { name: "Fennwyrd",      bild: "img/dorf.webp",        farbe: "#101814" },
    stadt:    { name: "Weiße Stadt",   bild: "img/stadt.webp",       farbe: "#12141c" },
    wueste:   { name: "Wüste",         bild: "img/w-wueste.webp",    farbe: "#1e1408" },
    schnee:   { name: "Schneeland",    bild: "img/w-schnee.webp",    farbe: "#0c1420" },
    hoehle:   { name: "Kristallhöhle", bild: "img/w-tiefe.webp",     farbe: "#0e0a1c" },
    lava:     { name: "Lavawelt",      bild: "img/w-lavawelt.webp",  farbe: "#1c0604" },
  };

  /* Kartenrücken als HTML */
  window.backHTML = function (key) {
    const r = RUECKEN[key] || RUECKEN.glut;
    return `<div class="cback b-${RUECKEN[key] ? key : "glut"}"><svg viewBox="0 0 24 24" fill="currentColor">${r.icon}</svg><div class="bt">${r.text}</div></div>`;
  };
  /* Spielfeld-Hintergrund als HTML (für Duell und Vorschau) */
  window.feldBG = function (key) {
    const f = FELDER[key] || FELDER.glut;
    return f.bild ? `<div class="feld-bg" style="--fb:url('${f.bild}');--fc:${f.farbe}"></div>` : `<div class="feld-bg glut"></div>`;
  };

  const css = `
.cback.b-foxy{background:radial-gradient(circle at 50% 50%,rgba(255,106,213,.45),transparent 50%),repeating-conic-gradient(from 0deg at 50% 50%,#2a0f2e 0deg 10deg,#1c0a22 10deg 20deg);border-color:#4a1a52;box-shadow:inset 0 0 0 1cqw #b24a9a,0 8px 24px rgba(0,0,0,.55)}
.cback.b-foxy::before{border-color:rgba(255,154,230,.4)}.cback.b-foxy svg{color:#ff8ae0;filter:drop-shadow(0 0 5cqw rgba(255,106,213,.9))}.cback.b-foxy .bt{color:#ffb3ec}
.cback.b-thyrvenna{background:radial-gradient(circle at 50% 50%,rgba(201,164,106,.4),transparent 50%),repeating-linear-gradient(45deg,#13261b 0 8cqw,#0f1f16 8cqw 16cqw);border-color:#2a3f2e;box-shadow:inset 0 0 0 1cqw #8a7440,0 8px 24px rgba(0,0,0,.55)}
.cback.b-thyrvenna::before{border-color:rgba(232,200,130,.4)}.cback.b-thyrvenna svg{color:#8fd18a;filter:drop-shadow(0 0 5cqw rgba(143,209,138,.8))}.cback.b-thyrvenna .bt{color:#e8c882}
.cback.b-kristall{background:radial-gradient(circle at 50% 50%,rgba(93,225,255,.45),transparent 50%),repeating-conic-gradient(from 45deg at 50% 50%,#0a1e30 0deg 15deg,#07141f 15deg 30deg);border-color:#123a52;box-shadow:inset 0 0 0 1cqw #3aa8d8,0 8px 24px rgba(0,0,0,.55)}
.cback.b-kristall::before{border-color:rgba(160,230,255,.4)}.cback.b-kristall svg{color:#7ee6ff;filter:drop-shadow(0 0 5cqw rgba(93,225,255,.9))}.cback.b-kristall .bt{color:#bff3ff}
.cback.b-schatten{background:radial-gradient(circle at 50% 50%,rgba(178,107,255,.35),transparent 50%),radial-gradient(circle at 50% 50%,#1a1030,#08060f);border-color:#2a1a44;box-shadow:inset 0 0 0 1cqw #6b3fb0,0 8px 24px rgba(0,0,0,.55)}
.cback.b-schatten::before{border-color:rgba(200,170,255,.35)}.cback.b-schatten svg{color:#d8c4ff;filter:drop-shadow(0 0 5cqw rgba(178,107,255,.9))}.cback.b-schatten .bt{color:#c8b0ff}
.cback.b-wildnis{background:radial-gradient(circle at 50% 50%,rgba(201,164,106,.4),transparent 50%),repeating-linear-gradient(0deg,#2a1e12 0 6cqw,#22180e 6cqw 12cqw);border-color:#3a2a18;box-shadow:inset 0 0 0 1cqw #6b8a3a,0 8px 24px rgba(0,0,0,.55)}
.cback.b-wildnis::before{border-color:rgba(160,200,110,.4)}.cback.b-wildnis svg{color:#c9a46a;filter:drop-shadow(0 0 5cqw rgba(201,164,106,.8))}.cback.b-wildnis .bt{color:#b8d88a}
.feld-bg{position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden;background:var(--fc,#0b0a0c)}
.feld-bg::before{content:"";position:absolute;inset:-30px;background:var(--fb) center/cover;filter:blur(10px) saturate(1.15) brightness(.42)}
.feld-bg::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 50% 50%,transparent 30%,rgba(0,0,0,.6))}
.feld-bg.glut{background:radial-gradient(ellipse 80% 60% at 50% 50%,#1c1510 0%,#0b0a0c 70%),#08090c}
.feld-bg.glut::before,.feld-bg.glut::after{display:none}`;
  const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
})();
