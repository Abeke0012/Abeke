// ─────────────────────────────────────────────────────────────────────────────
// NEXUS-MIND · procedural particle engine
// Pure Canvas 2D. Every particle is allocated once into a pool; per-frame work
// only writes numbers into existing objects and typed arrays, so the hot loop
// produces no garbage.
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_PARTICLES = 400;
const MINT = "0, 255, 179";
const LINK_DIST = 80;
const MOUSE_R = 150;
const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

// Style strings are built once and indexed by a quantised level: no string allocation per frame.
const LEVELS = 24;
const lvl = (v) => Math.max(0, Math.min(LEVELS, Math.round(v * LEVELS)));
const LINK_STYLES = [0, 1, 2].map((b) => Array.from({ length: LEVELS + 1 }, (_, l) => `rgba(${MINT},${(0.15 * ((b + 1) / 3) * (l / LEVELS) * 1.6).toFixed(3)})`));
const MESH_STYLES = Array.from({ length: LEVELS + 1 }, (_, l) => `rgba(${MINT},${(0.16 * (l / LEVELS)).toFixed(3)})`);
const SCAN_STYLES = Array.from({ length: LEVELS + 1 }, (_, l) => `rgba(${MINT},${(0.55 * (l / LEVELS)).toFixed(3)})`);
const TRAIL_STYLES = Array.from({ length: LEVELS + 1 }, (_, l) => `rgba(3,3,3,${(0.26 + 0.2 * (l / LEVELS)).toFixed(3)})`);

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (t) => t * t * (3 - 2 * t);

// Deterministic PRNG, so the layouts are the same on every load.
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export class Particle {
  constructor(i) {
    this.i = i;
    // required state
    this.x = 0; this.y = 0; this.targetX = 0; this.targetY = 0; this.vx = 0; this.vy = 0;
    this.radius = 1; this.alpha = 0; this.baseAlpha = 1;
    // layout seeds (normalised), written by Engine.layout()
    this.sx = 0; this.sy = 0;                 // spawn
    this.cx = 0; this.cy = 0; this.cr = 0; this.ca = 0; // constellation cluster offset
    this.wob = 0; this.wobS = 1;              // wander phase / speed
    this.vt = 0; this.varm = 0;               // vortex parameter + arm
    this.mx = 0; this.my = 0; this.mz = 0;    // mesh point (unit space)
    this.kind = 0;                            // 0 shell · 1 ring · 2 core
    this.stx = 0; this.sty = 0; this.std = 0; // starfield position + depth
    this.px = 0; this.py = 0; this.pz = 0;    // projected mesh point (scratch)
  }
}

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.pool = Array.from({ length: MAX_PARTICLES }, (_, i) => new Particle(i));
    this.count = MAX_PARTICLES;
    this.w = 1; this.h = 1; this.dpr = 1;
    this.time = 0; this.born = 0;
    this.spin = 0; this.spinRate = 0;
    this.mouse = { x: -9999, y: -9999, vx: 0, vy: 0, speed: 0, active: false, enabled: true };
    this.pulseT = -1;
    // mesh edges: pairs of particle indices (preallocated, never resized)
    this.edges = new Int16Array(MAX_PARTICLES * 8);
    this.edgeCount = 0;
    // spatial hash for the 80px link search
    this.cellHead = new Int16Array(1); this.cellNext = new Int16Array(MAX_PARTICLES);
    this.cols = 1; this.rows = 1;
    // line buckets (alpha levels) to batch strokes: indices into a flat coords array
    this.lineBuf = new Float32Array(MAX_PARTICLES * 40);
    this.lineBucket = new Uint8Array(MAX_PARTICLES * 10);
    this.sprite = this.makeSprite();
    this.scanSprite = this.makeScan();
    this.stats = { links: 0, drawn: 0 };
  }

  makeSprite() {
    const s = 64, c = document.createElement("canvas"); c.width = c.height = s;
    const g = c.getContext("2d"), grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, "rgba(220,255,245,1)"); grd.addColorStop(0.18, `rgba(${MINT},0.9)`);
    grd.addColorStop(0.45, `rgba(${MINT},0.22)`); grd.addColorStop(1, `rgba(${MINT},0)`);
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    return c;
  }

  makeScan() {
    const c = document.createElement("canvas"); c.width = 1; c.height = 32;
    const g = c.getContext("2d"), grd = g.createLinearGradient(0, 0, 0, 32);
    grd.addColorStop(0, `rgba(${MINT},0)`); grd.addColorStop(1, `rgba(${MINT},0.14)`);
    g.fillStyle = grd; g.fillRect(0, 0, 1, 32);
    return c;
  }

  resize(w, h, dpr) {
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.fillStyle = "#030303"; this.ctx.fillRect(0, 0, w, h);
    this.cols = Math.ceil(w / LINK_DIST) + 1; this.rows = Math.ceil(h / LINK_DIST) + 1;
    if (this.cellHead.length < this.cols * this.rows) this.cellHead = new Int16Array(this.cols * this.rows); // resize-time only
  }

  /** Assigns layout seeds for the active count. Called at boot and when the count changes — never per frame. */
  layout(count) {
    const first = this.count !== count || !this.laidOut;
    this.count = count; this.laidOut = true;
    const R = mulberry(0xc0de + count);
    const clusters = [[0.58, 0.38], [0.76, 0.56], [0.66, 0.74], [0.86, 0.3], [0.48, 0.62], [0.9, 0.72]];
    const nShell = Math.round(count * 0.52), nRing = Math.round(count * 0.3), nCore = count - nShell - nRing;
    for (let i = 0; i < count; i++) {
      const p = this.pool[i];
      p.sx = R(); p.sy = R();
      const c = clusters[i % clusters.length];
      p.cx = c[0]; p.cy = c[1]; p.cr = Math.pow(R(), 0.7); p.ca = R() * TAU;
      p.wob = R() * TAU; p.wobS = 0.3 + R() * 0.7;
      p.vt = i / count; p.varm = i % 4;
      p.stx = R(); p.sty = R(); p.std = 0.2 + R() * 0.8;
      p.radius = 0.8 + R() * 1.6;
      p.baseAlpha = 0.45 + R() * 0.55;
      // Mesh: a Fibonacci shell, two tilted orbital rings, and a dense inner core.
      if (i < nShell) {
        const k = i, y = 1 - (2 * (k + 0.5)) / nShell, r = Math.sqrt(1 - y * y), t = k * GOLDEN;
        p.mx = Math.cos(t) * r; p.my = y; p.mz = Math.sin(t) * r; p.kind = 0;
      } else if (i < nShell + nRing) {
        const k = i - nShell, half = Math.ceil(nRing / 2), ring = k < half ? 0 : 1, kk = ring ? k - half : k, n = ring ? nRing - half : half;
        const a = (kk / n) * TAU, rr = 1.32, tilt = ring ? 1.05 : -0.45;
        const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
        p.mx = x; p.my = -z * Math.sin(tilt); p.mz = z * Math.cos(tilt); p.kind = 1;
      } else {
        const k = i - nShell - nRing, y = 1 - (2 * (k + 0.5)) / nCore, r = Math.sqrt(1 - y * y), t = k * GOLDEN * 1.7;
        const rr = 0.38 + 0.06 * Math.sin(k * 1.3);
        p.mx = Math.cos(t) * r * rr; p.my = y * rr; p.mz = Math.sin(t) * r * rr; p.kind = 2;
      }
      if (first) { p.x = p.sx * this.w; p.y = p.sy * this.h; p.vx = p.vy = 0; p.alpha = 0; }
    }
    this.buildEdges(nShell, nRing, nCore);
  }

  buildEdges(nShell, nRing, nCore) {
    const E = this.edges; let e = 0;
    const push = (a, b) => { if (e < E.length - 1) { E[e++] = a; E[e++] = b; } };
    const near = (from, to, k) => {
      for (let i = from; i < to; i++) {
        const a = this.pool[i]; let b1 = -1, b2 = -1, b3 = -1, d1 = 9, d2 = 9, d3 = 9;
        for (let j = from; j < to; j++) {
          if (j === i) continue;
          const b = this.pool[j], d = (a.mx - b.mx) ** 2 + (a.my - b.my) ** 2 + (a.mz - b.mz) ** 2;
          if (d < d1) { d3 = d2; b3 = b2; d2 = d1; b2 = b1; d1 = d; b1 = j; } else if (d < d2) { d3 = d2; b3 = b2; d2 = d; b2 = j; } else if (d < d3) { d3 = d; b3 = j; }
        }
        if (b1 > i) push(i, b1); if (k > 1 && b2 > i) push(i, b2); if (k > 2 && b3 > i) push(i, b3);
      }
    };
    near(0, nShell, 3);
    const half = Math.ceil(nRing / 2);
    for (let k = 0; k < nRing; k++) {
      const ring = k < half ? 0 : 1, start = nShell + (ring ? half : 0), n = ring ? nRing - half : half, kk = k - (ring ? half : 0);
      push(start + kk, start + ((kk + 1) % n));
    }
    near(nShell + nRing, nShell + nRing + nCore, 2);
    // spokes: core → shell
    for (let k = 0; k < nCore; k += 3) push(nShell + nRing + k, (k * 7) % nShell);
    this.edgeCount = e / 2;
  }

  pulse() { this.pulseT = this.time; }

  /**
   * One simulation + render step.
   * s: { dt, p, vel, acc, reduced, scanY } — p is LERPed scroll progress, vel/acc its derivatives (px/frame).
   */
  step(s) {
    const { ctx, w, h } = this;
    const dtN = s.dt / 16.667;
    this.time += s.dt / 1000;
    const t = this.time, N = this.count, P = this.pool;

    // ── phase weights (sequential blends between the four layouts) ──
    const b1 = smooth(clamp01((s.p - 0.19) / 0.07));
    const b2 = smooth(clamp01((s.p - 0.46) / 0.08));
    const b3 = smooth(clamp01((s.p - 0.75) / 0.07));
    const wA = 1 - b1, wB = b1 * (1 - b2), wC = b2 * (1 - b3), wD = b3;
    const W = this.weights || (this.weights = new Float32Array(4));
    W[0] = wA; W[1] = wB; W[2] = wC; W[3] = wD;

    // Vortex spin is bound to scroll speed (plus a slow idle drift).
    this.spinRate = (s.reduced ? 0.0006 : 0.0015) + s.vel * 0.0016;
    this.spin += this.spinRate * dtN;
    const breathe = 1 + Math.max(-0.18, Math.min(0.18, s.acc * 0.03));   // scroll acceleration breathes the spiral

    const cxS = w * (w > 768 ? 0.42 : 0.5), cyS = h * 0.5, minWH = Math.min(w, h);
    const intro = smooth(clamp01((t - 0.2) / 3.2));
    // mesh camera
    const yaw = t * 0.32 + s.p * 3, pitch = 0.38 + Math.sin(t * 0.21) * 0.08;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cpt = Math.cos(pitch), spt = Math.sin(pitch);
    const meshR = minWH * (w > 768 ? 0.3 : 0.32), meshCx = w > 768 ? w * 0.6 : w * 0.5, meshCy = h * (w > 768 ? 0.5 : 0.44);
    const M = this.mouse, mouseOn = M.enabled && M.active;
    const scanning = mouseOn && wC > 0.5;
    const pulseAge = this.pulseT >= 0 ? t - this.pulseT : 99;

    for (let i = 0; i < N; i++) {
      const p = P[i];
      let tx = 0, ty = 0, a = 0;
      if (wA > 0) {
        // Constellation: spawn positions drift toward their cluster, wandering on a slow orbit.
        const cr = p.cr * minWH * 0.2;
        const kx = p.cx * w + Math.cos(p.ca) * cr, ky = p.cy * h + Math.sin(p.ca) * cr;
        const d = 0.25 + 0.55 * intro;
        const ox = Math.sin(t * p.wobS + p.wob) * 14, oy = Math.cos(t * p.wobS * 0.8 + p.wob) * 14;
        tx += wA * (p.sx * w + (kx - p.sx * w) * d + ox);
        ty += wA * (p.sy * h + (ky - p.sy * h) * d + oy);
        a += wA * intro;
      }
      if (wB > 0) {
        // Vortex: four logarithmic arms around the screen centre.
        const u = p.vt, r = (0.04 + Math.pow(u, 0.75) * 0.5) * minWH * breathe;
        const ang = p.varm * (TAU / 4) + u * 9.5 + this.spin * (1.6 - u);
        tx += wB * (cxS + Math.cos(ang) * r);
        ty += wB * (cyS + Math.sin(ang) * r * 0.86);
        a += wB;
      }
      if (wC > 0) {
        // Volumetric mesh: rotate, project, then bend around the cursor probe.
        let x = p.mx, y = p.my, z = p.mz;
        if (p.kind === 1) { const sp = t * 0.4; const c = Math.cos(sp), sN = Math.sin(sp); const nx = x * c - z * sN; z = x * sN + z * c; x = nx; }
        const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw;
        const y1 = y * cpt - z1 * spt, z2 = y * spt + z1 * cpt;
        const persp = 3.2 / (3.2 + z2);
        let px = meshCx + x1 * meshR * persp, py = meshCy + y1 * meshR * persp;
        if (scanning) {
          const dx = px - M.x, dy = py - M.y, d2 = dx * dx + dy * dy;
          if (d2 < 190 * 190) {
            const d = Math.sqrt(d2) || 1, f = (1 - d / 190) ** 2;
            const bulge = f * (38 + 60 * (1 - z2) * 0.5);     // nearer nodes bulge more: a 3D lens
            px += (dx / d) * bulge; py += (dy / d) * bulge;
          }
        }
        p.px = px; p.py = py; p.pz = z2;
        tx += wC * px; ty += wC * py;
        a += wC * (0.55 + 0.45 * (1 - (z2 + 1.4) / 2.8));
      }
      if (wD > 0) {
        // Starfield: blown out across the whole screen, parallax by depth.
        tx += wD * (p.stx * (w + 80) - 40 + Math.sin(t * 0.1 + p.wob) * 6 * p.std);
        ty += wD * (p.sty * (h + 80) - 40 - (s.p - 0.85) * 260 * p.std);
        a += wD * (0.25 + 0.75 * p.std);
      }
      p.targetX = tx; p.targetY = ty;

      // ── spring physics toward the target ──
      const k = wD > 0.5 ? 0.02 : 0.045, damp = 0.84;
      let ax = (tx - p.x) * k, ay = (ty - p.y) * k;
      // explosion out of the mesh: a one-way radial kick as phase 4 begins
      if (wD > 0 && wD < 0.35) { const dx = p.x - meshCx, dy = p.y - meshCy, d = Math.hypot(dx, dy) || 1; ax += (dx / d) * 1.4 * (1 - wD / 0.35); ay += (dy / d) * 1.4 * (1 - wD / 0.35); }
      // mouse gravity: slow cursor attracts, fast cursor repels
      if (mouseOn) {
        const dx = p.x - M.x, dy = p.y - M.y, d2 = dx * dx + dy * dy;
        if (d2 < MOUSE_R * MOUSE_R && d2 > 1) {
          const d = Math.sqrt(d2), f = (1 - d / MOUSE_R) ** 2;
          const sp = Math.min(1, M.speed / 18);            // 0 slow … 1 fast
          const force = (sp * 7.5 - (1 - sp) * 1.1) * f;   // + repel · − attract
          ax += (dx / d) * force; ay += (dy / d) * force;
        }
      }
      // CTA pulse: a travelling ring of force from the centre
      if (pulseAge < 1.6) {
        const dx = p.x - w / 2, dy = p.y - h / 2, d = Math.hypot(dx, dy) || 1, front = pulseAge * minWH * 1.1;
        const f = Math.exp(-(((d - front) / 60) ** 2)) * 5 * (1 - pulseAge / 1.6);
        ax += (dx / d) * f; ay += (dy / d) * f;
      }
      p.vx = (p.vx + ax * dtN) * Math.pow(damp, dtN);
      p.vy = (p.vy + ay * dtN) * Math.pow(damp, dtN);
      p.x += p.vx * dtN; p.y += p.vy * dtN;
      p.alpha = p.baseAlpha * a;
    }

    // ── render ──
    // Motion trails: fade the previous frame instead of clearing it.
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = s.reduced ? "#030303" : TRAIL_STYLES[lvl(wD)];
    ctx.fillRect(0, 0, w, h);

    this.stats.links = 0;
    if (wA > 0.01) this.drawLinks(wA * intro);
    if (wC > 0.01) this.drawMesh(wC, s.scanY, scanning, meshCx, meshR);

    ctx.globalCompositeOperation = "lighter";
    const spr = this.sprite;
    let drawn = 0;
    for (let i = 0; i < N; i++) {
      const p = P[i];
      if (p.alpha < 0.02 || p.x < -20 || p.y < -20 || p.x > w + 20 || p.y > h + 20) continue;
      let boost = 1;
      if (scanning && Math.abs(p.py - s.scanY) < 7) boost = 2.2;   // holographic scan band
      ctx.globalAlpha = Math.min(1, p.alpha * boost);
      const r = p.radius * (wD > 0.5 ? 2.6 : 4.4) * (boost > 1 ? 1.4 : 1);
      ctx.drawImage(spr, p.x - r, p.y - r, r * 2, r * 2);
      drawn++;
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    this.stats.drawn = drawn;
  }

  /** Links within 80px via a spatial hash; strokes batched into 3 alpha buckets. */
  drawLinks(fade) {
    const { ctx, cols, rows, cellHead, cellNext, pool: P, count: N } = this;
    cellHead.fill(-1, 0, cols * rows);
    for (let i = 0; i < N; i++) {
      const p = P[i];
      const cx = (p.x / LINK_DIST) | 0, cy = (p.y / LINK_DIST) | 0;
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) { cellNext[i] = -2; continue; }
      const c = cy * cols + cx; cellNext[i] = cellHead[c]; cellHead[c] = i;
    }
    const L = this.lineBuf, B = this.lineBucket, maxL = B.length; let n = 0;
    const D2 = LINK_DIST * LINK_DIST;
    for (let i = 0; i < N && n < maxL; i++) {
      if (cellNext[i] === -2) continue;
      const a = P[i], cx = (a.x / LINK_DIST) | 0, cy = (a.y / LINK_DIST) | 0;
      for (let oy = 0; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        if (oy === 0 && ox < 0) continue;            // visit each neighbouring pair once
        const gx = cx + ox, gy = cy + oy;
        if (gx < 0 || gy >= rows || gx >= cols) continue;
        for (let j = cellHead[gy * cols + gx]; j >= 0; j = cellNext[j]) {
          if (oy === 0 && ox === 0 && j <= i) continue;
          const b = P[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 > D2) continue;
          const q = 1 - Math.sqrt(d2) / LINK_DIST;
          const o = n * 4; L[o] = a.x; L[o + 1] = a.y; L[o + 2] = b.x; L[o + 3] = b.y;
          B[n] = q > 0.66 ? 2 : q > 0.33 ? 1 : 0; n++;
          if (n >= maxL) break;
        }
      }
    }
    this.stats.links = n;
    ctx.lineWidth = 0.6;
    for (let bucket = 0; bucket < 3; bucket++) {
      ctx.strokeStyle = LINK_STYLES[bucket][lvl(fade)];
      ctx.beginPath();
      for (let k = 0; k < n; k++) { if (B[k] !== bucket) continue; const o = k * 4; ctx.moveTo(L[o], L[o + 1]); ctx.lineTo(L[o + 2], L[o + 3]); }
      ctx.stroke();
    }
  }

  /** Wireframe of the volumetric core, plus the scan line when probed. */
  drawMesh(fade, scanY, scanning, mcx, mr) {
    const { ctx, edges: E, edgeCount, pool: P } = this;
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = MESH_STYLES[lvl(fade)];
    ctx.beginPath();
    for (let e = 0; e < edgeCount; e++) {
      const a = P[E[e * 2]], b = P[E[e * 2 + 1]];
      if (a.pz + b.pz > 0.6) continue;               // drop the far back edges: keeps depth readable
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    if (scanning) {
      // the band only spans the core, never the copy beside it
      const x0 = mcx - mr * 1.55, bw = mr * 3.1;
      ctx.globalAlpha = fade; ctx.drawImage(this.scanSprite, x0, scanY - 30, bw, 32); ctx.globalAlpha = 1;
      ctx.fillStyle = SCAN_STYLES[lvl(fade)]; ctx.fillRect(x0, scanY, bw, 1);
    }
  }
}
