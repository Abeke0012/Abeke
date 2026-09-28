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

// ── Photo sources, first hit wins ──
//   1. a photo the viewer picked or dropped on the page (kept in localStorage)
//   2. src/assets/plate.{png,jpg,jpeg,webp}: bundled, and inlined as a data URI in the single-file build
//   3. public/plate.png (served next to the page; skipped on file://, where canvas reads are blocked)
//   4. the procedural figure
const BUNDLED = Object.values(import.meta.glob("../assets/plate.{png,jpg,jpeg,webp}", { eager: true, query: "?url", import: "default" }))[0];
const STORE = "bnd.plate";

export function storedPlate() { try { return localStorage.getItem(STORE); } catch { return null; } }
export function clearPlate() { try { localStorage.removeItem(STORE); } catch { /* storage blocked */ } }

/** Turns a user photo into a cut-out plate, stores it and returns the ImageData. */
export async function plateFromFile(file) {
  const url = URL.createObjectURL(file);
  const im = await loadImage(url);
  URL.revokeObjectURL(url);
  if (!im) return null;
  const img = cutout(im);
  if (!img) return null;
  const cv = document.createElement("canvas"); cv.width = PW; cv.height = PH;
  cv.getContext("2d").putImageData(img, 0, 0);
  try { localStorage.setItem(STORE, cv.toDataURL("image/png")); } catch { /* too big or blocked: still used this session */ }
  return img;
}

/**
 * Photo → plate. If the photo already has transparency it is used as is. Otherwise the background is
 * estimated from the border and flood-filled away from the edges, so a person on a plain or blurred
 * background comes out as a mask. The result is cropped to the subject and fitted into the plate.
 */
function cutout(im) {
  const MAX = 640, k = Math.min(1, MAX / Math.max(im.width, im.height));
  const W = Math.max(1, Math.round(im.width * k)), H = Math.max(1, Math.round(im.height * k));
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  cx.drawImage(im, 0, 0, W, H);
  let d;
  try { d = cx.getImageData(0, 0, W, H); } catch { return null; }
  const px = d.data, N = W * H;
  let transparent = 0;
  for (let i = 0; i < N; i++) if (px[i * 4 + 3] < 200) transparent++;
  if (transparent < N * 0.05) {
    // No usable alpha: key out the background.
    // Background seeds: the top edge and the upper part of both sides. The bottom edge is left out:
    // a subject is usually cut off by it, and seeding there would key the subject away.
    const border = [];
    for (let x = 0; x < W; x++) border.push(x);
    for (let y = 0; y < H * 0.6; y++) border.push(y * W, y * W + W - 1);
    // Background references sampled along those edges, so gradients and vignettes still key out.
    const refs = [];
    const avg = (x0, y0) => { const r = [0, 0, 0]; let n = 0;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = x0 + dx, y = y0 + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue; const o = (y * W + x) * 4; r[0] += px[o]; r[1] += px[o + 1]; r[2] += px[o + 2]; n++; }
      return r.map((v) => v / n); };
    for (let k = 0; k <= 8; k++) refs.push(avg(Math.round((k / 8) * (W - 1)), 2));
    for (let k = 1; k <= 5; k++) { const y = Math.round((k / 5) * H * 0.6); refs.push(avg(2, y), avg(W - 3, y)); }
    const dist = (i) => { const o = i * 4; let m = 1e9; for (const r of refs) { const a = px[o] - r[0], b = px[o + 1] - r[1], c = px[o + 2] - r[2]; m = Math.min(m, a * a + b * b + c * c); } return Math.sqrt(m); };
    // Threshold from how noisy the background edge itself is.
    const bd = border.map(dist).sort((a, b) => a - b);
    const T = Math.max(26, Math.min(64, bd[(bd.length * 0.85) | 0] * 1.4 + 14));
    const bg = new Uint8Array(N), stack = [];
    for (const i of border) if (!bg[i] && dist(i) < T) { bg[i] = 1; stack.push(i); }
    while (stack.length) {
      const i = stack.pop(), x = i % W;
      const nb = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W];
      for (const j of nb) if (j >= 0 && j < N && !bg[j] && dist(j) < T) { bg[j] = 1; stack.push(j); }
    }
    // Keep only the largest connected subject (drops specks the fill missed).
    const lab = new Int32Array(N).fill(-1); let best = -1, bestN = 0, id = 0;
    for (let i = 0; i < N; i++) {
      if (bg[i] || lab[i] >= 0) continue;
      let n = 0; stack.push(i); lab[i] = id;
      while (stack.length) { const a = stack.pop(), x = a % W; n++;
        for (const j of [x > 0 ? a - 1 : -1, x < W - 1 ? a + 1 : -1, a - W, a + W]) if (j >= 0 && j < N && !bg[j] && lab[j] < 0) { lab[j] = id; stack.push(j); } }
      if (n > bestN) { bestN = n; best = id; } id++;
    }
    if (bestN < N * 0.02) return null;
    for (let i = 0; i < N; i++) px[i * 4 + 3] = lab[i] === best ? 255 : 0;
    cx.putImageData(d, 0, 0);
  }
  // Crop to the subject and fit it into the plate, feet on the floor of the frame.
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] >= 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 <= x0 || y1 <= y0) return null;
  const out = document.createElement("canvas"); out.width = PW; out.height = PH;
  const ox = out.getContext("2d", { willReadFrequently: true });
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, s = Math.min((PW - 8) / bw, (PH - 8) / bh);
  ox.drawImage(cv, x0, y0, bw, bh, (PW - bw * s) / 2, PH - 4 - bh * s, bw * s, bh * s);
  return ox.getImageData(0, 0, PW, PH);
}

export async function loadPlate() {
  const sources = [storedPlate(), BUNDLED, location.protocol === "file:" ? null : "./plate.png"].filter(Boolean);
  for (const src of sources) {
    const im = await loadImage(src);
    const img = im && cutout(im);
    if (img) return { img, photo: true };
  }
  const cv = document.createElement("canvas"); cv.width = PW; cv.height = PH;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  drawFallback(ctx);
  return { img: ctx.getImageData(0, 0, PW, PH), photo: false };
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
export function sampleFigure(img, COUNT, { photo = false, HEIGHT = 14 } = {}) {
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
    // A real photo keeps its own colours. The procedural figure is pulled to scarlet / cobalt.
    const spec = !photo && hsl.s < 0.12 && hsl.l > 0.8;   // lenses: pushed past the bloom threshold
    if (!photo) remap(c, hsl);
    n.set(x, y * 0.15, z).normalize();
    const shade = spec ? 1.9 : photo ? 0.72 + 0.38 * Math.max(0, n.dot(L)) : 0.28 + 0.9 * Math.max(0, n.dot(L));
    col[i * 3] = c.r * shade; col[i * 3 + 1] = c.g * shade; col[i * 3 + 2] = c.b * shade;
  }
  return { pos, scl, col, count: COUNT };
}
