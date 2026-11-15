// Zugangssperre: Das Spiel ist noch in Arbeit und nur für den Entwickler freigegeben.
// Freigabe über den Glutwerk-Spielernamen oder durch Eingabe des Namens.
// Hinweis: Das ist eine einfache Sperre im Browser, kein echter Passwortschutz.
const OWNER = 'foxy0561';
const KEY = 'cotf-access';

function read(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
function write(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignorieren */ } }

export function hasAccess() {
  return read(KEY) === '1' || read('glutwerk-name').trim().toLowerCase() === OWNER;
}

export function accessGate(root) {
  if (hasAccess()) return Promise.resolve();
  const en = read('glutwerk-lang').toLowerCase().startsWith('en');
  const T = (de, e) => (en ? e : de);
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'gate';
    wrap.innerHTML = `
      <div class="frame gate-box">
        <div class="gate-title">Chronicles of the Forgotten</div>
        <p>${T('Dieses Spiel ist noch in Entwicklung und nur für den Entwickler freigegeben.', 'This game is still in development and only available to the developer.')}</p>
        <label>${T('Spielername', 'Player name')}</label>
        <input type="text" maxlength="24" autocomplete="off" spellcheck="false" />
        <div class="gate-err"></div>
        <div class="gate-row">
          <button class="btn primary pe" type="button">${T('Weiter', 'Continue')}</button>
          <a class="btn pe" href="../">${T('Zu Glutwerk', 'To Glutwerk')}</a>
        </div>
      </div>`;
    root.append(wrap);
    const input = wrap.querySelector('input'), err = wrap.querySelector('.gate-err');
    input.value = read('glutwerk-name');
    const tryIt = () => {
      if (input.value.trim().toLowerCase() === OWNER) {
        write(KEY, '1');
        if (!read('glutwerk-name')) write('glutwerk-name', OWNER);
        wrap.remove(); resolve();
      } else {
        err.textContent = T('Kein Zugang mit diesem Namen. Schau bald wieder vorbei!', 'No access with this name. Check back soon!');
        input.select();
      }
    };
    wrap.querySelector('button').onclick = tryIt;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') tryIt(); });
    setTimeout(() => input.focus(), 50);
  });
}
