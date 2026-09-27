import * as THREE from "three";
import { HUE } from "../palette.js";

// ── The masked portrait plate ──
// If /plate.png exists (a masked figure on transparent alpha) it is used; otherwise an original,
// logo-free suited figure is drawn procedurally. Either way we only read its alpha + colour once.

const PW = 220, PH = 440;

function drawFallback(ctx) {
  const c = ctx;
  const RED = "#c8202a", RED_D = "#7e1117", BLUE = "#2440a8", BLUE_D = "#16286b", DARK = "#1b0a0d";
  const path = (pts, fill) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = fill; c.fill(); };
  c.clearRect(0, 0, PW, PH);
  // legs
  path([[78, 214], [108, 214], [104, 330], [100, 420], [74, 420], [72, 330]], BLUE);
  path([[112, 214], [142, 214], [148, 330], [146, 420], [120, 420], [116, 330]], BLUE);
  path([[72, 340], [104, 340], [100, 424], [70, 424]], RED);              // boots
  path([[116, 340], [148, 340], [150, 424], [120, 424]], RED);
  // arms, slightly away from the body
  path([[52, 100], [70, 104], [62, 170], [52, 238], [36, 236], [40, 168]], BLUE);
  path([[168, 100], [150, 104], [158, 170], [168, 238], [184, 236], [180, 168]], BLUE);
  path([[34, 232], [54, 232], [52, 262], [36, 262]], RED);                // gloves
  path([[166, 232], [186, 232], [184, 262], [168, 262]], RED);
  // torso: red centre panel, blue flanks
  path([[54, 96], [166, 96], [150, 160], [140, 214], [80, 214], [70, 160]], BLUE);
  path([[74, 96], [146, 96], [136, 160], [130, 214], [90, 214], [84, 160]], RED);
  path([[80, 204], [140, 204], [141, 218], [79, 218]], DARK);             // belt
  // neck + head
  path([[98, 74], [122, 74], [124, 98], [96, 98]], RED_D);
  c.beginPath(); c.ellipse(110, 50, 25, 31, 0, 0, Math.PI * 2); c.fillStyle = RED; c.fill();
  // eye lenses (the only speculars on the figure)
  c.fillStyle = "#f4f6f8";
  c.beginPath(); c.ellipse(99, 47, 9, 6, 0.45, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(121, 47, 9, 6, -0.45, 0, Math.PI * 2); c.fill();
  // seams, so lightness varies across panels
  c.strokeStyle = RED_D; c.lineWidth = 2;
  c.beginPath(); c.moveTo(110, 100); c.lineTo(110, 204); c.moveTo(84, 150); c.lineTo(136, 150); c.stroke();
  c.strokeStyle = BLUE_D;
  c.beginPath(); c.moveTo(90, 250); c.lineTo(88, 330); c.moveTo(130, 250); c.lineTo(132, 330); c.stroke();
  // form shading, painted into the plate itself (kept inside the silhouette)
  c.globalCompositeOperation = "source-atop";
  const g = c.createLinearGradient(20, 0, 200, 0);
  g.addColorStop(0, "rgba(0,0,0,0.45)"); g.addColorStop(0.45, "rgba(255,255,255,0.10)"); g.addColorStop(1, "rgba(0,0,0,0.55)");
  c.fillStyle = g; c.fillRect(0, 0, PW, PH);
  c.globalCompositeOperation = "source-over";
}

function loadImage(src) {
  return new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}

export async function loadPlate() {
  const cv = document.createElement("canvas"); cv.width = PW; cv.height = PH;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const im = location.protocol === "file:" ? null : await loadImage("./plate.png");
  if (im) {
    const s = Math.min(PW / im.width, PH / im.height);
    const w = im.width * s, h = im.height * s;
    ctx.drawImage(im, (PW - w) / 2, (PH - h) / 2, w, h);
    try { const d = ctx.getImageData(0, 0, PW, PH); if (d.data.some((v, i) => i % 4 === 3 && v > 128)) return d; } catch { /* tainted: fall through */ }
    ctx.clearRect(0, 0, PW, PH);
  }
  drawFallback(ctx);
  return ctx.getImageData(0, 0, PW, PH);
}

// Deterministic RNG: the same beads every load.
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Pull the hue to the nearer of scarlet / cobalt along the shortest arc, 85%, keeping lightness. */
function remap(col, hsl) {
  col.getHSL(hsl);
  if (hsl.s < 0.12) return col;
  const arc = (a, b) => { let d = b - a; d -= Math.round(d); return d; };
  const ds = arc(hsl.h, HUE.scarlet), dc = arc(hsl.h, HUE.cobalt);
  const d = Math.abs(ds) < Math.abs(dc) ? ds : dc;
  let h = hsl.h + d * 0.85; h -= Math.floor(h);
  return col.setHSL(h, hsl.s, hsl.l);
}

/**
 * Samples COUNT beads from the plate alpha. Returns local offsets (relative to the figure centre),
 * per-bead scale and baked linear colour. Shade is baked once from the figure's own axis.
 */
export function sampleFigure(img, COUNT, HEIGHT = 14) {
  const { data, width: W, height: H } = img;
  const A = (x, y) => data[(y * W + x) * 4 + 3];
  // Opaque pixels and their horizontal runs (so arms and torso get their own depth).
  const opaque = [], runOf = new Int32Array(W * H).fill(-1), runs = [];
  let minY = H, maxY = 0;
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      if (A(x, y) < 128) { x++; continue; }
      const x0 = x; while (x < W && A(x, y) >= 128) x++;
      const r = runs.length / 2; runs.push((x0 + x - 1) / 2, (x - x0) / 2);
      for (let k = x0; k < x; k++) { runOf[y * W + k] = r; opaque.push(y * W + k); }
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  const unit = HEIGHT / Math.max(1, maxY - minY);
  const midX = W / 2, midY = (minY + maxY) / 2;
  const rnd = mulberry(0x5eed);
  const pos = new Float32Array(COUNT * 3), scl = new Float32Array(COUNT), col = new Float32Array(COUNT * 3);
  const c = new THREE.Color(), hsl = {}, n = new THREE.Vector3(), L = new THREE.Vector3(-0.45, 0.55, 0.75).normalize();
  for (let i = 0; i < COUNT; i++) {
    const idx = opaque[(rnd() * opaque.length) | 0];
    const px = idx % W, py = (idx / W) | 0;
    const r = runOf[idx], hw = runs[r * 2 + 1];
    const jx = px + rnd() - 0.5, jy = py + rnd() - 0.5;
    const dx = jx - runs[r * 2];
    const depth = Math.sqrt(Math.max(0, hw * hw - dx * dx)) * 0.62;
    const x = (jx - midX) * unit, y = (midY - jy) * unit;
    const z = (rnd() < 0.72 ? 1 : -1) * depth * (0.55 + 0.45 * rnd()) * unit;   // front-weighted shell
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    scl[i] = (0.12 + rnd() * 0.08);
    // Colour: plate pixel → hue remap → baked shade from n = (x, y·0.15, z).
    const o = idx * 4;
    c.setRGB(data[o] / 255, data[o + 1] / 255, data[o + 2] / 255, THREE.SRGBColorSpace);
    c.getHSL(hsl);
    const spec = hsl.s < 0.12 && hsl.l > 0.8;   // lenses: pushed past the bloom threshold
    remap(c, hsl);
    n.set(x, y * 0.15, z).normalize();
    const shade = spec ? 1.9 : 0.28 + 0.9 * Math.max(0, n.dot(L));
    col[i * 3] = c.r * shade; col[i * 3 + 1] = c.g * shade; col[i * 3 + 2] = c.b * shade;
  }
  return { pos, scl, col, count: COUNT };
}
