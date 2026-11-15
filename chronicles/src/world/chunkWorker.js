// Web Worker: berechnet Bodenpixel der Weltchunks im Hintergrund, damit das Spiel flüssig bleibt.
import { Gen } from './WorldGen.js';

let gen = null;
self.onmessage = e => {
  const m = e.data;
  if (m.type === 'init') { gen = new Gen(m.masks); self.postMessage({ type: 'ready' }); return; }
  if (!gen) return;
  if (m.type === 'chunk') {
    const px = gen.chunkPixels(m.cx, m.cy, m.size);
    self.postMessage({ type: 'chunk', cx: m.cx, cy: m.cy, data: px }, [px.buffer]);
  }
  if (m.type === 'overview') {
    const px = gen.overview();
    self.postMessage({ type: 'overview', data: px }, [px.buffer]);
  }
};
