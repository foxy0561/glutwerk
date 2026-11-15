// Weich folgende Kamera mit Weltbegrenzung und optionalem Wackeln.
export class Camera {
  constructor() { this.x = 0; this.y = 0; this.w = 400; this.h = 225; this.shake = 0; }
  resize(w, h) { this.w = w; this.h = h; }
  follow(tx, ty, worldW, worldH, dt, snap = false) {
    const gx = tx - this.w / 2, gy = ty - this.h / 2;
    const k = snap ? 1 : 1 - Math.pow(0.0015, dt);
    this.x += (gx - this.x) * k; this.y += (gy - this.y) * k;
    this.x = Math.max(0, Math.min(worldW - this.w, this.x));
    this.y = Math.max(0, Math.min(worldH - this.h, this.y));
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 8);
  }
  get ix() { return Math.round(this.x + (this.shake ? (Math.random() - 0.5) * this.shake * 2 : 0)); }
  get iy() { return Math.round(this.y + (this.shake ? (Math.random() - 0.5) * this.shake * 2 : 0)); }
  visible(x, y, w, h) { return x + w > this.x && x < this.x + this.w && y + h > this.y && y < this.y + this.h; }
}
