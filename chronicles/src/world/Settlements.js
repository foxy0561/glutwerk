// Erzeugt für jeden Ort der Thyrvenna-Karte eine passende Anlage: Gebäude, Plätze, Mauern, Wahrzeichen,
// Bewohner, Händler, Schiffe, Dungeon-Eingänge und Teleportzirkel. Alles deterministisch (gleiche Welt bei jedem Start).
import { mulberry32 } from '../engine/PixelUtil.js';
import * as B from '../art/buildingArt.js';
import * as P from '../art/propArt.js';
import { M, SOLID, PLACE_R, T } from './WorldGen.js';
import { NAMES, LINES, SHOPS, randomApp } from '../data/worldPeople.js';

const HOUSE = { small: { w: 40, wh: 18, rh: 20 }, large: { w: 52, wh: 22, rh: 24 } };

export const PORT_IDS = ['mervasque', 'dornbucht', 'velcair', 'sefra'];
export const ROUTES = { mervasque: ['dornbucht', 'velcair', 'sefra'], dornbucht: ['mervasque'], velcair: ['mervasque', 'sefra'], sefra: ['velcair', 'mervasque'] };

export function buildSettlements(D, gen, isNight) {
  const out = { objects: [], npcs: [], ports: {}, teles: [], dungeons: [], entrance: null };
  const places = D.places.filter(p => p.layer === 'surf');
  const occupied = []; // belegte Rechtecke in Pixeln
  const free = (x, y, w, h) => !occupied.some(o => x < o[0] + o[2] && x + w > o[0] && y < o[1] + o[3] && y + h > o[1]);
  const mat = (tx, ty) => gen.tileMat(Math.floor(tx), Math.floor(ty));
  const okTile = (tx, ty, allowRoad = false) => { const m = mat(tx, ty); return !SOLID.has(m) && m !== M.BRIDGE && (allowRoad || (m !== M.ROAD)); };
  const areaOk = (tx, ty, w, h, allowRoad) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!okTile(tx + x, ty + y, allowRoad)) return false; return true; };
  const add = o => { out.objects.push(o); return o; };
  const light = (x, y, r, color, a = 0.6, flicker = 0.05, night = true) => ({ x, y, r, color, a, flicker, on: night ? isNight : null });

  function addBuilding(tx, ty, spec, extra = {}) {
    const cv = B.building(spec);
    const x = tx * T, y = ty * T;
    const w = spec.w, depth = Math.round(spec.wh + spec.rh * 0.55);
    if (!free(x - w / 2 - 4, y - depth - 4, w + 8, depth + 12)) return null;
    occupied.push([x - w / 2 - 4, y - depth - 4, w + 8, depth + 12]);
    return add({ type: 'building', x, y, ox: Math.floor(cv.width / 2), oy: cv.height - 2, sprite: () => B.building(spec), col: [x - w / 2, y - depth, w, depth], light: light(x, y - spec.wh * 0.6, 34 + w / 4, [255, 190, 110], 0.55), ...extra });
  }
  function addProp(tx, ty, sprite, ox, oy, col, extra = {}) {
    const x = tx * T, y = ty * T;
    if (col && !free(x + col[0], y + col[1], col[2], col[3])) return null;
    if (col) occupied.push([x + col[0], y + col[1], col[2], col[3]]);
    return add({ type: extra.type || 'prop', x, y, ox, oy, sprite, col: col ? [x + col[0], y + col[1], col[2], col[3]] : null, ...extra });
  }
  function addNPC(p, region, r, i, role) {
    for (let k = 0; k < 20; k++) {
      const a = r() * 6.283, d = (PLACE_R[p.type] || 6) * (0.15 + r() * 0.5);
      const tx = p.x + Math.cos(a) * d, ty = p.y + Math.sin(a) * d * 0.8;
      if (!okTile(tx, ty, true)) continue;
      const names = NAMES[region] || NAMES.draventhal;
      const lines = LINES[region] || LINES.draventhal;
      const name = role === 'merchant' ? { de: 'Händler' + (r() < 0.5 ? '' : 'in'), en: 'Merchant' } : role === 'guard' ? { de: 'Wache', en: 'Guard' } : names[(i + Math.floor(r() * 99)) % names.length];
      const app = randomApp(region, r);
      if (role === 'guard') { app.outfit = 'tunika'; app.cloth = region === 'valcrest' ? '#e8e4ee' : '#6e1d2e'; app.species = 'mensch'; }
      const line = lines[Math.floor(r() * lines.length)];
      out.npcs.push({ id: `${p.id}_${i}`, place: p.id, region, x: tx, y: ty, name, role, app, line, shop: role === 'merchant' ? SHOPS[region] : null, weapon: role === 'guard' ? 'sword' : null });
      return;
    }
  }
  function ring(p, rMin, rMax, n, fn, r) {
    let placed = 0;
    for (let rr = rMin; rr <= rMax && placed < n; rr += 4.2) {
      const steps = Math.max(5, Math.floor(rr * 6.283 / 4.6));
      const off = r() * 6.283;
      for (let s = 0; s < steps && placed < n; s++) {
        const a = off + s / steps * 6.283;
        const tx = p.x + Math.cos(a) * rr, ty = p.y + Math.sin(a) * rr * 0.82;
        if (r() < 0.15) continue;
        if (fn(tx, ty, rr, a)) placed++;
      }
    }
    return placed;
  }
  function houses(p, region, r, rMin, rMax, n, large = 0.3) {
    return ring(p, rMin, rMax, n, (tx, ty) => {
      const big = r() < large, sp = { ...(big ? HOUSE.large : HOUSE.small), region, v: Math.floor(r() * 6) };
      const wt = Math.ceil(sp.w / T) + 1, ht = Math.ceil((sp.wh + sp.rh) / T);
      if (!areaOk(Math.floor(tx - wt / 2), Math.floor(ty - ht + 1), wt, ht + 1)) return false;
      return !!addBuilding(tx, ty, sp);
    }, r);
  }

  for (const p of places) {
    const r = mulberry32([...p.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0);
    const region = gen.regionAt(p.x, p.y) === 'asche' ? 'asche' : (p.r === 'valcrest' && p.id === 'morvhal' ? 'asche' : p.r);
    const R = PLACE_R[p.type] || 4;
    switch (p.type) {
      case 'capital': case 'city': {
        const cap = p.type === 'capital';
        if (region !== 'brennvald') addProp(p.x, p.y + 1, () => B.fountain(region), 22, 33, [-18, -10, 36, 12], { type: 'fountain' });
        else addProp(p.x, p.y + 1, () => B.well(), 11, 29, [-9, -8, 18, 9]);
        ring(p, 3.4, 3.6, cap ? 5 : 3, (tx, ty) => !!addProp(tx, ty, (v => () => B.stall(v))(Math.floor(r() * 5)), 17, 28, [-15, -10, 30, 10]), r);
        houses(p, region, r, 6, R - 1.5, cap ? 30 : 16, cap ? 0.45 : 0.3);
        // Laternen am Platz
        for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + 0.6; addProp(p.x + Math.cos(a) * 5, p.y + Math.sin(a) * 4, () => P.lanternPost(true), 6, 39, [-3, -4, 6, 4], { light: light((p.x + Math.cos(a) * 5) * T + 8, (p.y + Math.sin(a) * 4) * T - 25, 54, [255, 210, 140], 0.75) }); }
        if (cap) cityWalls(p, region, R, r);
        if (p.id === 'velcair') { addBuilding(p.x + 9, p.y - 8, { w: 72, wh: 30, rh: 30, region, v: 1, kind: 'temple', spire: 1 }); addProp(p.x - 10, p.y - 9, () => B.tower(region, 2, 68), 13, 86, [-11, -8, 22, 8]); }
        if (p.id === 'grauhorn') { addProp(p.x - 6, p.y - 6, () => B.tower('brennvald', 1, 52), 13, 70, [-11, -8, 22, 8]); }
        if (p.id === 'qalimra') { for (let i = 0; i < 10; i++) { const a = r() * 6.283, d = 8 + r() * 5; const tx = p.x + Math.cos(a) * d, ty = p.y + Math.sin(a) * d * 0.7; if (okTile(tx, ty)) addProp(tx, ty, (v => () => B.palm(v))(i), 22, 58, [-4, -4, 8, 4]); } }
        for (let i = 0; i < (cap ? 9 : 5); i++) addNPC(p, region, r, i, i === 0 ? 'merchant' : i < (cap ? 3 : 2) ? 'guard' : 'villager');
        break;
      }
      case 'spot': {
        if (p.id === 'kronhuegel') addBuilding(p.x, p.y + 1, { w: 112, wh: 34, rh: 40, region, v: 2, kind: 'palace' });
        else if (p.id === 'haendlerviertel') { addBuilding(p.x - 3, p.y, { w: 64, wh: 20, rh: 20, region, v: 3, kind: 'warehouse' }); addBuilding(p.x + 3, p.y + 4, { w: 52, wh: 20, rh: 20, region, v: 4, kind: 'warehouse' }); }
        else if (p.id === 'siegelhaus') addBuilding(p.x, p.y, { w: 44, wh: 22, rh: 20, region: 'brennvald', v: 5, kind: 'seal' });
        else if (p.id === 'kettenmarkt') { for (let i = 0; i < 3; i++) addProp(p.x - 3 + i * 3, p.y, (v => () => B.stall(v))(i + 1), 17, 28, [-15, -10, 30, 10]); }
        break;
      }
      case 'village': {
        if (p.id === 'nebelfarn') { houses(p, 'fennwyrd', r, 3, 6, 3, 0); break; }
        addProp(p.x, p.y, () => B.well(), 11, 29, [-9, -8, 18, 9]);
        houses(p, region, r, 4, R - 1, 6, 0.2);
        ring(p, R - 1, R + 1, 4, (tx, ty) => okTile(tx, ty) && !!addProp(tx, ty, () => (r() < 0.5 ? B.haystack() : B.fence(0)), 11, 16, [-10, -6, 20, 6]), r);
        if (p.id === 'hollerbach') addProp(p.x + 6, p.y - 3, () => B.tower('draventhal', 3, 40), 13, 58, [-11, -8, 22, 8]);
        if (p.id === 'moewenstein') { const c = findCoast(p.x, p.y, 12); if (c) addProp(c[0], c[1], () => B.tower('saltrivo', 0, 56, 'light'), 13, 74, [-11, -8, 22, 8], { light: light(c[0] * T, c[1] * T - 66, 120, [255, 230, 160], 0.9, 0.1) }); }
        if (p.id === 'lichtbrunn') addProp(p.x + 3, p.y + 3, () => B.statue('valcrest'), 10, 39, [-7, -9, 14, 9]);
        if (p.id === 'kesselgrund') addProp(p.x - 4, p.y - 5, () => B.caveEntrance('brennvald'), 24, 39, [-24, -16, 48, 16]);
        for (let i = 0; i < 3; i++) addNPC(p, region, r, i, i === 0 && p.id !== 'kesselgrund' ? 'merchant' : 'villager');
        break;
      }
      case 'fort': {
        addBuilding(p.x, p.y - 2, { w: 64, wh: 30, rh: 26, region: 'brennvald', v: 6, kind: 'keep' });
        cityWalls(p, 'brennvald', 6, r);
        addNPC(p, region, r, 0, 'guard'); addNPC(p, region, r, 1, 'guard');
        break;
      }
      case 'ruin': {
        const sylv = p.id === 'sylvanor', mond = p.id === 'mondbau';
        if (mond) addProp(p.x, p.y - 1, () => B.caveEntrance('fennwyrd'), 24, 39, [-24, -16, 48, 16], { it: { kind: 'sign', text: { de: 'Der Mondbau. Unter den Wurzeln ist es still geworden.', en: 'The Moon Burrow. It has grown quiet beneath the roots.' } } });
        for (let i = 0; i < (sylv ? 10 : 5); i++) {
          const a = r() * 6.283, d = 2 + r() * (R - 1), tx = p.x + Math.cos(a) * d, ty = p.y + Math.sin(a) * d * 0.8;
          if (!okTile(tx, ty, true)) continue;
          const k = r();
          if (k < 0.4) addProp(tx, ty, (v => () => P.ruinWall(v, 32, 28))(i), 16, 31, [-16, -10, 32, 10]);
          else if (k < 0.7) addProp(tx, ty, (v => () => P.pillar(v % 2))(i), 9, 40, [-8, -6, 16, 6]);
          else addProp(tx, ty, (v => () => P.crystal(v, 1))(i), 11, 29, [-7, -5, 14, 6], { light: light(tx * T, ty * T - 12, 46, [170, 110, 255], 0.5, 0.05, false) });
        }
        if (sylv) addProp(p.x, p.y, () => P.altar(true), 12, 25, [-10, -6, 20, 6], { light: light(p.x * T, p.y * T - 18, 50, [190, 140, 255], 0.7, 0.05, false), it: { kind: 'sign', text: { de: 'Der Mondaltar von Sylvanor. Ein Splitter fehlt.', en: 'The Moon Altar of Sylvanor. A shard is missing.' } } });
        break;
      }
      case 'minor': {
        if (p.id === 'rabenhorst') addProp(p.x, p.y, () => B.tower('draventhal', 4, 60), 13, 78, [-11, -8, 22, 8]);
        else if (p.id === 'himmelswacht') { addProp(p.x, p.y, () => B.tower('valcrest', 5, 64), 13, 82, [-11, -8, 22, 8]); addProp(p.x + 3, p.y + 2, () => B.statue('valcrest'), 10, 39, [-7, -9, 14, 9]); }
        else if (p.id === 'dornbucht') { addProp(p.x - 2, p.y, () => P.tent(), 24, 38, [-20, -14, 40, 14]); addProp(p.x + 2, p.y + 2, () => P.campfire(0), 12, 26, [-10, -8, 20, 8], { light: light(p.x * T + 32, p.y * T + 22, 80, [255, 150, 60], 0.9, 0.2, false), anim: 10, spriteF: f => P.campfire(f % 4) }); }
        else if (p.id === 'kraehenmoor') { houses(p, 'fennwyrd', r, 1, 3, 1, 0); for (let i = 0; i < 5; i++) { const a = r() * 6.283, d = 2 + r() * 4; const tx = p.x + Math.cos(a) * d, ty = p.y + Math.sin(a) * d; if (okTile(tx, ty)) addProp(tx, ty, (v => () => B.deadTree(v))(i), 18, 49, [-3, -4, 6, 4]); } }
        else if (p.id === 'glutbrunnen') { addProp(p.x, p.y, () => B.hotSpring(0), 20, 20, [-17, -12, 34, 14], { anim: 3, spriteF: f => B.hotSpring(f % 2), steam: true }); addProp(p.x - 4, p.y - 2, () => P.tent(), 24, 38, [-20, -14, 40, 14]); for (let i = 0; i < 3; i++) addProp(p.x + 3 + i * 2, p.y - 3 + i, (v => () => B.palm(v))(i + 3), 22, 58, [-4, -4, 8, 4]); addNPC(p, 'sarkhazim', r, 0, 'merchant'); }
        else if (p.id === 'laternenbruecke') {
          // Eingang zum Farnlager (eigene Karte)
          const ex = p.x + 1, ey = p.y - 5;
          out.entrance = { x: ex * T, y: ey * T };
          addProp(ex - 2, ey + 1, () => P.lanternPost(true), 6, 39, [-3, -4, 6, 4], { light: light((ex - 2) * T + 8, (ey + 1) * T - 25, 56, [180, 220, 255], 0.85, 0.05, false) });
          addProp(ex + 2, ey + 1, () => P.lanternPost(true), 6, 39, [-3, -4, 6, 4], { light: light((ex + 2) * T + 8, (ey + 1) * T - 25, 56, [180, 220, 255], 0.85, 0.05, false) });
          addProp(ex + 3.5, ey + 2.6, () => P.signpost(), 11, 27, [-3, -4, 6, 4], { it: { kind: 'sign', text: { de: '↑ Farnlager', en: '↑ Fern Camp' } } });
        }
        break;
      }
      case 'special': {
        addProp(p.x, p.y - 1, () => B.tower('asche', 7, 80), 13, 98, [-11, -8, 22, 8], { light: light(p.x * T, p.y * T - 90, 60, [190, 120, 255], 0.7, 0.1, false) });
        cityWalls(p, 'asche', 6, r);
        addNPC(p, 'asche', r, 0, 'villager');
        break;
      }
      case 'dungeon': {
        const reg = p.r === 'sarkhazim' ? 'sarkhazim' : 'brennvald';
        addProp(p.x, p.y, () => B.caveEntrance(reg), 24, 39, [-24, -16, 48, 16], { it: { kind: 'dungeon', place: p } });
        out.dungeons.push(p);
        break;
      }
      case 'tele': {
        for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283; const tx = p.x + Math.cos(a) * 2.4, ty = p.y + Math.sin(a) * 1.7; addProp(tx, ty, (v => () => B.standingStone(v, true))(i), 6, 21, [-4, -3, 8, 3]); }
        const o = add({ type: 'tele', x: p.x * T, y: p.y * T, ox: 0, oy: 0, flat: true, sprite: null, it: { kind: 'tele', place: p, r: 26 }, light: light(p.x * T, p.y * T - 8, 44, [200, 140, 255], 0.55, 0.08, false) });
        out.teles.push({ place: p, obj: o });
        break;
      }
    }
    // Häfen: Schiff im nächsten tiefen Wasser
    if (PORT_IDS.includes(p.id)) {
      const s = findSea(p.x, p.y, 30, true) || findSea(p.x, p.y, 60, false);
      if (s) {
        const o = add({ type: 'ship', x: s[0] * T, y: s[1] * T, ox: 38, oy: 54, sprite: (v => () => B.ship(v))(p.id.length), it: { kind: 'ship', port: p.id, r: 70 } });
        out.ports[p.id] = { ship: o, land: s.land, place: p };
      }
    }
  }

  function cityWalls(p, region, R, r) {
    const y0 = p.y - R * 0.82, y1 = p.y + R * 0.82;
    for (const yy of [y0, y1]) for (let x = p.x - R + 1; x < p.x + R - 1; x += 2) {
      const road = mat(x, yy) === M.ROAD || mat(x + 1, yy) === M.ROAD || mat(x - 1, yy) === M.ROAD;
      if (road) continue;
      if (!okTile(x, yy, true)) continue;
      addProp(x, yy, () => B.cityWall(region, 32, false), 16, 27, [-16, -10, 32, 10]);
    }
    for (const xx of [p.x - R, p.x + R]) for (let y = y0; y <= y1; y += 2.4) { if (!okTile(xx, y, false)) continue; addProp(xx, y, () => B.tower(region, 9, 30), 13, 48, [-11, -8, 22, 8]); }
  }
  function findSea(cx, cy, maxR, strict) {
    for (let rr = 3; rr < maxR; rr++) for (let a = 0; a < 24; a++) {
      const t = a / 24 * 6.283, tx = Math.round(cx + Math.cos(t) * rr), ty = Math.round(cy + Math.sin(t) * rr);
      if (mat(tx, ty) === M.SEA || mat(tx, ty) === M.SHALLOW) {
        // passendes Land daneben für die Ankunft
        for (let k = 1; k < 12; k++) { const lx = Math.round(tx - Math.cos(t) * k), ly = Math.round(ty - Math.sin(t) * k); if (okTile(lx, ly, strict)) { const deep = [tx + Math.cos(t) * 2, ty + Math.sin(t) * 2]; deep.land = [lx + 0.5, ly + 0.5]; return deep; } }
      }
    }
    return null;
  }
  function findCoast(cx, cy, maxR) {
    for (let rr = 4; rr < maxR; rr++) for (let a = 0; a < 24; a++) {
      const t = a / 24 * 6.283, tx = cx + Math.cos(t) * rr, ty = cy + Math.sin(t) * rr;
      if (okTile(tx, ty) && (mat(tx + Math.cos(t) * 2, ty + Math.sin(t) * 2) === M.SEA || mat(tx + Math.cos(t) * 2, ty + Math.sin(t) * 2) === M.SHALLOW || mat(tx + Math.cos(t) * 2, ty + Math.sin(t) * 2) === M.BEACH)) return [tx, ty];
    }
    return null;
  }
  return out;
}
