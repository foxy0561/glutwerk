// Kleine DOM-Helfer für die Oberfläche.
import { audio } from '../engine/Audio.js';

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
export function frame(el, thin = false) {
  el.classList.add('frame'); if (thin) el.classList.add('thin');
  if (!thin) for (const c of ['tl', 'tr', 'bl', 'br']) el.append(h('i', { class: 'cn ' + c }));
  return el;
}
export function button(label, onClick, cls = '') {
  return h('button', { class: 'btn pe ' + cls, onclick: e => { audio.init(); audio.sfx('click'); onClick(e); }, onmouseenter: () => audio.sfx('hover') }, label);
}
export function img(src, cls = 'px') { return h('img', { src, class: cls, draggable: 'false', alt: '' }); }
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
export function canvasEl(w, h2, cls = 'px') { const c = document.createElement('canvas'); c.width = w; c.height = h2; c.className = cls; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return c; }

export const CORNER_SVG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M1 1h7l-2 2H3v3L1 8z" fill="#f0d27a"/><path d="M2 2h4L4 4H4v0H2z" fill="#fff4d6"/><rect x="5.5" y="5.5" width="3" height="3" transform="rotate(45 7 7)" fill="#b98cf0"/></svg>');
