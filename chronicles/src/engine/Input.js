// Tastatur/Maus mit frei belegbaren Tasten. Aktionen statt fester Keycodes.
export const DEFAULT_BINDINGS = {
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
  sprint: 'ShiftLeft', dodge: 'Space', interact: 'KeyE',
  spell: 'KeyQ', veil: 'KeyR', nextSpell: 'Tab', inventory: 'KeyI', character: 'KeyC', skills: 'KeyK', quests: 'KeyJ', map: 'KeyM', pause: 'Escape',
};
const ALT = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', sprint: 'ShiftRight' };

export class Input {
  constructor(target) {
    this.bindings = { ...DEFAULT_BINDINGS };
    this.down = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, left: false, right: false, leftPressed: false, rightPressed: false };
    this.enabled = true;
    this.captureCallback = null; // für Tastenbelegung im Menü
    window.addEventListener('keydown', e => {
      if (this.captureCallback) { e.preventDefault(); const cb = this.captureCallback; this.captureCallback = null; cb(e.code); return; }
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', e => this.down.delete(e.code));
    window.addEventListener('blur', () => { this.down.clear(); this.mouse.left = this.mouse.right = false; });
    target.addEventListener('mousemove', e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    target.addEventListener('mousedown', e => {
      if (e.button === 0) { this.mouse.left = true; this.mouse.leftPressed = true; }
      if (e.button === 2) { this.mouse.right = true; this.mouse.rightPressed = true; }
    });
    window.addEventListener('mouseup', e => { if (e.button === 0) this.mouse.left = false; if (e.button === 2) this.mouse.right = false; });
    target.addEventListener('contextmenu', e => e.preventDefault());
    this.wheel = 0; target.addEventListener('wheel', e => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  }
  setBindings(b) { this.bindings = { ...DEFAULT_BINDINGS, ...(b || {}) }; }
  codesFor(action) { const c = [this.bindings[action]]; if (ALT[action] && this.bindings[action] === DEFAULT_BINDINGS[action]) c.push(ALT[action]); return c; }
  isDown(action) { return this.enabled && this.codesFor(action).some(c => this.down.has(c)); }
  wasPressed(action) { return this.codesFor(action).some(c => this.pressed.has(c)); }
  codePressed(code) { return this.pressed.has(code); }
  endFrame() { this.wheel = 0; this.pressed.clear(); this.mouse.leftPressed = false; this.mouse.rightPressed = false; }
  captureNext(cb) { this.captureCallback = cb; }
}

export function keyLabel(code) {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map = { Space: 'Leertaste', ShiftLeft: 'Shift', ShiftRight: 'Shift R', Escape: 'Esc', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ControlLeft: 'Strg', Tab: 'Tab', Enter: 'Enter', AltLeft: 'Alt' };
  return map[code] || code;
}
