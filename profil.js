/* =========================================================
   GLUTWERK · Profil (Name + Profilbild) und Willkommens-Fenster

   - Beim allerersten Besuch (noch kein Name) erscheint ein Willkommens-Fenster:
     Profilbild aussuchen, Namen eingeben. Erst danach kommen Tagesbonus-Fenster
     und Willkommensgeschenk (GlutwerkProfil.onReady).
   - Wird auf der Spieleseite und im Karten-Tab geladen (nach lang.js).
   - Name und Profilbild liegen nur auf dem Gerät (kein Login).

   Neues Spiel mit Namensfeld: seinen Speicher-Schlüssel in NAME_KEYS eintragen.
   Neues Profilbild: einen Eintrag in AVATARS ergänzen (SVG, viewBox 0 0 64 64).
   ========================================================= */
(function () {
  const L = window.L || ((de) => de);
  const NAME_KEYS = ["glutwerk-name", "kiko-name", "td_playerName"];
  /* Spiele, die den Namen in einem JSON-Spielstand speichern: [Schlüssel, Feld, max. Länge] */
  const NAME_JSON_KEYS = [["shardfall.save.v1", "playerName", 16]];
  const AV_KEY = "glutwerk-avatar";

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  const cleanName = s => String(s || "").replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮﻿]/g, "").trim().slice(0, 12);
  function getName() { for (const k of NAME_KEYS) { const n = cleanName(store(k)); if (n) return n; } return ""; }
  function setName(n) {
    n = cleanName(n);
    NAME_KEYS.forEach(k => store(k, n));
    NAME_JSON_KEYS.forEach(([k, field, max]) => {
      let data = {};
      try { data = JSON.parse(store(k) || "{}") || {}; } catch (e) { data = {}; }
      data[field] = n.slice(0, max);
      store(k, JSON.stringify(data));
    });
  }

  /* ---------- Die 5 Profilbilder (selbst gezeichnet) ---------- */
  const AVATARS = [
    { id: "fuchs", de: "Fuchs", en: "Fox", svg:
      `<circle cx="32" cy="32" r="32" fill="#1d2a44"/>
       <path d="M13 22 19 7l11 11q2-.5 4 0L45 7l6 15q4 12-3 22-8 10-16 10T16 44q-7-10-3-22z" fill="#ff7a2b"/>
       <path d="M20 13l5 8-8 4zM44 13l-5 8 8 4z" fill="#3a1600" opacity=".75"/>
       <path d="M18 38q8-2 14 8 6-10 14-8-4 14-14 16-10-2-14-16z" fill="#fff1e0"/>
       <circle cx="25" cy="31" r="2.7" fill="#2a1200"/><circle cx="39" cy="31" r="2.7" fill="#2a1200"/>
       <circle cx="25.9" cy="30" r=".9" fill="#fff"/><circle cx="39.9" cy="30" r=".9" fill="#fff"/>
       <ellipse cx="32" cy="46" rx="3.2" ry="2.3" fill="#2a1200"/>` },
    { id: "flamme", de: "Flamme", en: "Flame", svg:
      `<circle cx="32" cy="32" r="32" fill="#1c0d08"/>
       <circle cx="32" cy="40" r="22" fill="#ff6a2b" opacity=".18"/>
       <path d="M32 7c2 12 16 18 16 33a16 16 0 0 1-32 0c0-7 4-12 8-16 0 6 3 9 6 9-2-9-2-17 2-26z" fill="#ff7a24"/>
       <path d="M32 18c1 6 9 10 9 20H23c0-6 6-8 9-20z" fill="#ff9a35" opacity=".0"/><path d="M32 30c1 8 8 10 8 17a8 8 0 0 1-16 0c0-5 5-7 8-17z" fill="#ffe28a"/>` },
    { id: "kristall", de: "Kristall", en: "Crystal", svg:
      `<circle cx="32" cy="32" r="32" fill="#111833"/>
       <circle cx="32" cy="32" r="20" fill="#5aa9ff" opacity=".16"/>
       <path d="M32 7 18 22l14 8z" fill="#9fd0ff"/><path d="M32 7l14 15-14 8z" fill="#5aa9ff"/>
       <path d="M18 22l14 8-10 20z" fill="#7a6bff"/><path d="M46 22 32 30l10 20z" fill="#4a54d8"/>
       <path d="M32 30 22 50l10 8 10-8z" fill="#a78bff"/>
       <path d="M27 17l3-4" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>` },
    { id: "sieben", de: "Glückssieben", en: "Lucky Seven", svg:
      `<circle cx="32" cy="32" r="32" fill="#4a0b18"/>
       <circle cx="32" cy="32" r="25" fill="none" stroke="#ffcf5a" stroke-width="3"/>
       <path d="M19 18h27v5L34 47h-8l11-23H19z" fill="#ffd24a" stroke="#a8740a" stroke-width="1.5" stroke-linejoin="round"/>
       <path d="M50 12l1.5 3.5L55 17l-3.5 1.5L50 22l-1.5-3.5L45 17l3.5-1.5z" fill="#fff3b0"/>` },
    { id: "ameise", de: "Ameise", en: "Ant", svg:
      `<circle cx="32" cy="32" r="32" fill="#14301f"/>
       <g stroke="#5a2410" stroke-width="2.2" stroke-linecap="round" fill="none">
         <path d="M28 29 15 22M28 32 13 34M28 36 17 47M36 29l13-7M36 32l15 2M36 36l11 11M30 15l-6-8M34 15l6-8"/></g>
       <ellipse cx="32" cy="46" rx="8.5" ry="10.5" fill="#8b3a1a"/>
       <ellipse cx="32" cy="31" rx="5.5" ry="6.5" fill="#a64a22"/>
       <circle cx="32" cy="20" r="6.5" fill="#b9562a"/>
       <circle cx="29.5" cy="19" r="1.6" fill="#fff"/><circle cx="34.5" cy="19" r="1.6" fill="#fff"/>
       <circle cx="29.7" cy="19.2" r=".7" fill="#1a0a04"/><circle cx="34.3" cy="19.2" r=".7" fill="#1a0a04"/>` },
  ];
  const avById = id => AVATARS.find(a => a.id === id);
  const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  /* Wer schon einen Namen, aber noch kein Bild gewählt hat, bekommt eines passend zum Namen */
  function getAvatar() {
    const a = store(AV_KEY);
    if (avById(a)) return a;
    return AVATARS[hash(getName() || "glutwerk") % AVATARS.length].id;
  }
  function setAvatar(id) { if (avById(id)) store(AV_KEY, id); }
  function avatarHTML(id, size, cls) {
    const a = avById(id || getAvatar()) || AVATARS[0];
    return `<span class="gw-av ${cls || ""}" style="width:${size || 32}px;height:${size || 32}px" title="${a[window.EN ? "en" : "de"]}"><svg viewBox="0 0 64 64" aria-hidden="true">${a.svg}</svg></span>`;
  }

  /* ---------- Auswahl-Raster (auch im Namens-Fenster der Spieleseite benutzt) ---------- */
  function picker(el, current, onChange) {
    let sel = avById(current) ? current : getAvatar();
    function draw() {
      el.innerHTML = AVATARS.map(a => `<button type="button" class="gw-pick${a.id === sel ? " on" : ""}" data-id="${a.id}" aria-pressed="${a.id === sel}" aria-label="${a[window.EN ? "en" : "de"]}">${avatarHTML(a.id, 56)}<span>${a[window.EN ? "en" : "de"]}</span></button>`).join("");
    }
    el.classList.add("gw-picks");
    el.onclick = e => { const b = e.target.closest(".gw-pick"); if (!b) return; sel = b.dataset.id; draw(); onChange && onChange(sel); };
    draw();
    return { get: () => sel };
  }

  const css = `
.gw-av{display:inline-grid;place-items:center;border-radius:50%;overflow:hidden;flex-shrink:0;vertical-align:middle;background:#12151d}
.gw-av svg{width:100%;height:100%;display:block}
.gw-picks{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:4px 0 16px}
.gw-pick{display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px 2px 6px;border-radius:12px;background:rgba(255,255,255,.04);border:2px solid transparent;cursor:pointer;color:#8a93a8;font:600 11px Inter,system-ui,sans-serif;transition:transform .15s,border-color .15s,background .15s}
.gw-pick .gw-av{width:100%!important;height:auto!important;max-width:56px;aspect-ratio:1}
.gw-pick:hover{background:rgba(255,255,255,.08);transform:translateY(-2px)}
.gw-pick.on{border-color:#ff6a2b;background:rgba(255,106,43,.14);color:#ffb347;box-shadow:0 0 18px rgba(255,106,43,.3)}
.gw-wrap{position:fixed;inset:0;z-index:400;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(3,4,8,.86);backdrop-filter:blur(6px);animation:gwFade .3s;overflow:auto}
@keyframes gwFade{from{opacity:0}}
.gw-box{width:min(480px,100%);padding:26px 24px 22px;border-radius:18px;color:#e8ebf2;font-family:Inter,system-ui,sans-serif;background:radial-gradient(circle at 50% 0%,rgba(255,106,43,.3),transparent 62%),linear-gradient(160deg,#1f140e,#12151d);border:1px solid rgba(255,106,43,.45);box-shadow:0 20px 60px rgba(0,0,0,.6),0 0 40px rgba(255,106,43,.18);animation:gwPop .45s cubic-bezier(.2,1.3,.4,1);margin:auto}
@keyframes gwPop{from{transform:scale(.88) translateY(18px);opacity:0}}
.gw-box h2{font-family:Rajdhani,sans-serif;font-size:32px;text-transform:uppercase;letter-spacing:1px;line-height:1;text-align:center}
.gw-box .gw-sub{color:#c3c9d6;font-size:14px;line-height:1.55;text-align:center;margin:8px 0 18px}
.gw-box h3{font-family:Rajdhani,sans-serif;font-size:15px;letter-spacing:1.5px;text-transform:uppercase;color:#ffb347;margin-bottom:6px}
.gw-in{width:100%;background:#0b0d12;border:1px solid #2a3040;border-radius:10px;padding:13px 14px;color:#e8ebf2;font:600 18px Inter,sans-serif;outline:none;margin-bottom:6px}
.gw-in:focus{border-color:#ff6a2b}
.gw-hint{font-size:12px;color:#8a93a8;margin-bottom:16px}
.gw-go{display:block;width:100%;padding:13px;border-radius:10px;border:none;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;font-size:20px;letter-spacing:1px;text-transform:uppercase;background:linear-gradient(135deg,#ff6a2b,#ffb347);color:#140800;box-shadow:0 4px 20px rgba(255,106,43,.4);transition:opacity .15s}
.gw-go:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}
.gw-gift{margin-top:12px;text-align:center;font-size:12.5px;color:#ffcf9c}
@media (max-width:420px){.gw-box{padding:22px 16px 18px}.gw-box h2{font-size:27px}.gw-picks{gap:5px}.gw-pick{font-size:10px}}`;
  function addCss() { if (document.getElementById("gwProfilCss")) return; const s = document.createElement("style"); s.id = "gwProfilCss"; s.textContent = css; document.head.appendChild(s); }

  /* ---------- Bereit-Meldung: Tagesbonus & Co. warten, bis es einen Namen gibt ---------- */
  const waiting = [];
  let ready = !!getName();
  function onReady(fn) { if (ready) { try { fn(); } catch (e) { console.error(e); } } else waiting.push(fn); }
  function finish() {
    ready = true;
    waiting.splice(0).forEach(f => { try { f(); } catch (e) { console.error(e); } });
    try { window.dispatchEvent(new CustomEvent("glutwerk-profil")); } catch (e) {}
  }

  /* ---------- Willkommens-Fenster (nur beim allerersten Besuch, nicht wegklickbar) ---------- */
  function willkommen() {
    addCss();
    const w = document.createElement("div");
    w.className = "gw-wrap";
    w.setAttribute("role", "dialog");
    w.setAttribute("aria-modal", "true");
    w.innerHTML = `<div class="gw-box">
      <h2>${L("Willkommen bei Glutwerk!", "Welcome to Glutwerk!")}</h2>
      <div class="gw-sub">${L("Hier findest du Foxys Browser-Spiele. Alles ohne Anmeldung, dein Fortschritt bleibt auf deinem Gerät. Such dir erst ein Profilbild und einen Namen aus.", "Here you'll find Foxy's browser games. No sign-up needed, your progress stays on your device. First pick a profile picture and a name.")}</div>
      <h3>${L("1 · Profilbild", "1 · Profile picture")}</h3>
      <div id="gwPicks"></div>
      <h3>${L("2 · Dein Name", "2 · Your name")}</h3>
      <input class="gw-in" id="gwName" maxlength="12" autocomplete="off" spellcheck="false" placeholder="${L("z. B. Foxy", "e.g. Foxy")}">
      <div class="gw-hint">${L("Maximal 12 Zeichen. Der Name gilt automatisch in allen Spielen und lässt sich später oben ändern.", "Up to 12 characters. The name is used in every game automatically and can be changed later at the top.")}</div>
      <button class="gw-go" id="gwGo" disabled>${L("Los geht's!", "Let's go!")}</button>
      <div class="gw-gift">🎁 ${L("Zum Start schenken wir dir Glut für deine ersten Kartenpacks.", "To start you off, here's some Glut for your first card packs.")}</div>
    </div>`;
    document.body.appendChild(w);
    const pk = picker(w.querySelector("#gwPicks"), AVATARS[Math.floor(Math.random() * AVATARS.length)].id);
    const input = w.querySelector("#gwName"), go = w.querySelector("#gwGo");
    input.addEventListener("input", () => { go.disabled = !cleanName(input.value); });
    input.addEventListener("keydown", e => { if (e.key === "Enter" && !go.disabled) go.click(); });
    go.onclick = () => {
      const n = cleanName(input.value);
      if (!n) { input.focus(); return; }
      setName(n); setAvatar(pk.get());
      w.remove();
      finish();
    };
    setTimeout(() => input.focus({ preventScroll: true }), 80);
  }

  window.GlutwerkProfil = { NAME_KEYS, NAME_JSON_KEYS, AVATARS, getName, setName, cleanName, getAvatar, setAvatar, avatarHTML, picker, onReady, addCss, get ready() { return ready; } };

  if (!ready) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", willkommen);
    else willkommen();
  } else if (!avById(store(AV_KEY))) {
    /* Bestehende Nutzer: Bild passend zum Namen festlegen, damit es überall gleich bleibt */
    setAvatar(getAvatar());
  }
})();
