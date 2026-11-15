// Einstiegspunkt: Zugang prüfen, Spiel erzeugen und starten.
import { Game } from './core/Game.js';
import { accessGate } from './core/AccessGate.js';

const app = document.getElementById('app');
const loading = document.getElementById('loading');

function hideLoading() {
  if (loading) { loading.style.transition = 'opacity .6s'; loading.style.opacity = '0'; setTimeout(() => loading.remove(), 650); }
}

(async () => {
  if (loading) loading.style.display = 'none';
  await accessGate(app);
  if (loading) loading.style.display = '';
  const game = new Game(document.getElementById('game'), document.getElementById('ui'));
  window.__cotf = game; // für Debugging in der Konsole
  await game.boot();
  hideLoading();
})().catch(err => {
  console.error(err);
  if (loading) { loading.style.display = ''; loading.textContent = 'Fehler beim Start: ' + err.message; }
});
