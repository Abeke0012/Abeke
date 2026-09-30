import * as THREE from "three";

/** Deterministic PRNG so the burger looks the same on every load. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 3D value noise in [-1, 1], used to roughen the patty and sauce. */
export function noise3(x: number, y: number, z: number) {
  const hash = (i: number, j: number, k: number) => {
    let h = (i * 374761393 + j * 668265263 + k * 1274126177) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz);
  const x00 = l(c(0, 0, 0), c(1, 0, 0), u), x10 = l(c(0, 1, 0), c(1, 1, 0), u);
  const x01 = l(c(0, 0, 1), c(1, 0, 1), u), x11 = l(c(0, 1, 1), c(1, 1, 1), u);
  return l(l(x00, x10, v), l(x01, x11, v), w) * 2 - 1;
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, color = true) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  if (color) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, count: number, r: [number, number], tones: string[], seed: number) {
  const rand = rng(seed);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = tones[Math.floor(rand() * tones.length)];
    ctx.globalAlpha = 0.25 + rand() * 0.6;
    ctx.beginPath();
    ctx.ellipse(rand() * w, rand() * h, r[0] + rand() * (r[1] - r[0]), r[0] + rand() * (r[1] - r[0]), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Fine pores of a baked brioche crust. */
export function bunBumpTexture() {
  return canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, 512, 512);
    speckle(ctx, 512, 512, 2600, [0.6, 2.2], ["#5a5a5a", "#9c9c9c", "#6e6e6e"], 7);
  }, false);
}

/** Egg-wash mottling multiplied over the bun colours: darker blotches, lighter streaks. */
export function bunMottleTexture() {
  return canvasTexture(1024, 512, (ctx) => {
    ctx.fillStyle = "#f2ece6";
    ctx.fillRect(0, 0, 1024, 512);
    speckle(ctx, 1024, 512, 900, [8, 38], ["#d9c2ad", "#e6d6c6", "#c9ab90"], 3);
    speckle(ctx, 1024, 512, 260, [14, 60], ["#fff8f0"], 4);
    speckle(ctx, 1024, 512, 1800, [1, 3], ["#b8906c", "#fffaf2"], 5);
  });
}

/** Seared ground beef: dark crust, lighter fat flecks, charred edges. */
export function pattyColorTexture() {
  return canvasTexture(1024, 512, (ctx) => {
    ctx.fillStyle = "#3b1d10";
    ctx.fillRect(0, 0, 1024, 512);
    speckle(ctx, 1024, 512, 5200, [1.5, 6], ["#2a130a", "#512a17", "#6b3a20", "#1c0d06"], 11);
    speckle(ctx, 1024, 512, 700, [1, 3], ["#8a5634", "#a86a3e"], 12);
    speckle(ctx, 1024, 512, 260, [4, 12], ["#140905"], 13);
  });
}

/** Salmon fillet: coral flesh with pale fat lines. */
export function salmonTexture() {
  return canvasTexture(1024, 512, (ctx) => {
    ctx.fillStyle = "#e9825a";
    ctx.fillRect(0, 0, 1024, 512);
    ctx.strokeStyle = "#f7cdb2";
    ctx.lineWidth = 7;
    for (let x = -512; x < 1024; x += 46) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 120, 170, x + 60, 340, x + 200, 512);
      ctx.stroke();
    }
    speckle(ctx, 1024, 512, 900, [1, 4], ["#d86d45", "#f09a74"], 51);
  });
}

export function pattyBumpTexture() {
  return canvasTexture(1024, 512, (ctx) => {
    ctx.fillStyle = "#777";
    ctx.fillRect(0, 0, 1024, 512);
    speckle(ctx, 1024, 512, 6000, [1.5, 7], ["#333", "#bbb", "#555", "#999"], 21);
  }, false);
}

const displayFont = () => {
  if (typeof window === "undefined") return "sans-serif";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-unbounded").trim();
  return v || "'Arial Black', sans-serif";
};

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}

function wordmark(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, tagline = true) {
  const font = displayFont();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#e4ddd3";
  ctx.font = `900 ${size}px ${font}`;
  const w = ctx.measureText("SELF").width;
  ctx.fillText("SELF", cx, cy);
  ctx.fillStyle = "#e2311d";
  star(ctx, cx + w / 2 + size * 0.2, cy - size * 0.62, size * 0.17);
  if (tagline) {
    ctx.font = `700 ${size * 0.2}px ${font}`;
    ctx.letterSpacing = `${size * 0.08}px`;
    ctx.fillText("BURGERS", cx + size * 0.04, cy + size * 0.36);
    ctx.letterSpacing = "0px";
  }
}

/** Matte black lid print: wordmark, rule, tagline and a red quality seal. */
export function lidTexture(aspect: number) {
  const W = 2048;
  const H = Math.round(W / aspect);
  return canvasTexture(W, H, (ctx) => {
    ctx.fillStyle = "#0e0e0f";
    ctx.fillRect(0, 0, W, H);
    // subtle paper grain
    speckle(ctx, W, H, 9000, [0.5, 1.6], ["#151517", "#0a0a0b"], 31);
    wordmark(ctx, W / 2, H * 0.52, H * 0.34);
    ctx.strokeStyle = "#e2311d";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(W * 0.3, H * 0.7);
    ctx.lineTo(W * 0.7, H * 0.7);
    ctx.stroke();
    ctx.fillStyle = "#cfc6bb";
    ctx.textAlign = "center";
    ctx.font = `600 ${H * 0.045}px ${displayFont()}`;
    ctx.letterSpacing = `${H * 0.012}px`;
    ctx.fillText("MADE FRESH. MADE BOLD.", W / 2, H * 0.8);
    ctx.letterSpacing = "0px";
    // seal
    const sx = W * 0.12, sy = H * 0.2, sr = H * 0.11;
    ctx.fillStyle = "#e2311d";
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f6f1ea";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#f6f1ea";
    ctx.font = `900 ${sr * 0.5}px ${displayFont()}`;
    ctx.fillText("100%", sx, sy + sr * 0.05);
    ctx.font = `700 ${sr * 0.26}px ${displayFont()}`;
    ctx.fillText("BEEF", sx, sy + sr * 0.42);
  });
}

/** Print on the front wall of the box base. */
export function frontTexture(aspect: number) {
  const W = 2048;
  const H = Math.round(W / aspect);
  return canvasTexture(W, H, (ctx) => {
    ctx.fillStyle = "#0e0e0f";
    ctx.fillRect(0, 0, W, H);
    speckle(ctx, W, H, 6000, [0.5, 1.6], ["#151517", "#0a0a0b"], 41);
    wordmark(ctx, W * 0.5, H * 0.62, H * 0.5, false);
    ctx.fillStyle = "#e2311d";
    ctx.fillRect(0, H - H * 0.06, W, H * 0.06);
  });
}
