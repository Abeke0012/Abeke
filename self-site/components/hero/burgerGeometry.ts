import * as THREE from "three";
import { noise3, rng } from "./textures";

/** Colours of one bun type, from the cut face to the top of the dome. */
export type BunPalette = { crumb: string; side: string; glow: string; top: string; low: string; high: string };

export const BUN_PALETTES = {
  brioche: { crumb: "#efd09a", side: "#c9803a", glow: "#8f4214", top: "#5e260a", low: "#7a3812", high: "#c98440" },
  sesame: { crumb: "#f2dcae", side: "#d9a052", glow: "#b86d2c", top: "#94501e", low: "#9a5a24", high: "#dca561" },
  black: { crumb: "#4a3f37", side: "#2c2623", glow: "#1e1917", top: "#121010", low: "#171313", high: "#2b2522" },
} satisfies Record<string, BunPalette>;

/** Thickness of the top and bottom buns. */
export const TOP_BUN_H = 0.72;
export const BOTTOM_BUN_H = 0.34;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function lathe(points: [number, number][], segments: number, detail = 48) {
  const curve = new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const pts = curve.getSpacedPoints(detail).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
  pts[0].x = 0;
  pts[pts.length - 1].x = 0;
  return new THREE.LatheGeometry(pts, segments);
}

function paint(geo: THREE.BufferGeometry, colorAt: (x: number, y: number, z: number, n: number) => THREE.Color) {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const c = colorAt(x, y, z, noise3(x * 4.1, y * 4.1, z * 4.1));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

const C = (hex: string) => new THREE.Color(hex);
const mix = (a: THREE.Color, b: THREE.Color, t: number) => a.clone().lerp(b, t);

/** Bun dome: pale cut underneath, lighter sides, darkest on top. */
export function topBunGeometry(segments: number, pal: BunPalette) {
  const pts: [number, number][] = [[0, 0], [0.5, 0], [0.93, 0], [0.99, 0.025], [1.02, 0.08]];
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * (Math.PI / 2);
    pts.push([1.02 * Math.pow(Math.cos(a), 0.75), 0.08 + 0.64 * Math.pow(Math.sin(a), 0.95)]);
  }
  const geo = lathe(pts, segments, 72);
  const crumb = C(pal.crumb), side = C(pal.side), glow = C(pal.glow), top = C(pal.top);
  paint(geo, (_x, y, _z, n) => {
    if (y < 0.004) return crumb;
    const h = y / TOP_BUN_H;
    const base = mix(side, mix(glow, top, smoothstep(0.45, 1, h)), smoothstep(0.05, 0.5, h));
    return base.offsetHSL(0, -0.04, n * 0.03);
  });
  geo.computeVertexNormals();
  return geo;
}

export function bottomBunGeometry(segments: number, pal: BunPalette) {
  const geo = lathe(
    [[0, 0], [0.6, 0], [0.88, 0.0], [0.97, 0.03], [1.0, 0.1], [1.01, 0.19], [0.99, 0.27], [0.95, 0.32], [0.88, 0.34], [0.4, 0.34], [0, 0.34]],
    segments,
    56,
  );
  const crumb = C(pal.crumb), low = C(pal.low), high = C(pal.high);
  paint(geo, (x, y, z, n) => {
    const r = Math.hypot(x, z);
    if (y > 0.332 && r < 0.93) return crumb.clone().offsetHSL(0, 0, n * 0.02);
    return mix(low, high, smoothstep(0.0, 0.26, y)).offsetHSL(0, -0.04, n * 0.03);
  });
  geo.computeVertexNormals();
  return geo;
}

/** Thick patty with an uneven, craggy edge. */
export function pattyGeometry(segments: number) {
  const geo = lathe(
    [[0, 0], [0.7, 0], [0.98, 0.0], [1.05, 0.04], [1.08, 0.16], [1.05, 0.28], [0.98, 0.32], [0.6, 0.32], [0, 0.32]],
    segments,
    40,
  );
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 0.001) continue;
    const n = noise3(x * 3.2, y * 3.2, z * 3.2) * 0.035 + noise3(x * 9, y * 9, z * 9) * 0.012;
    const k = 1 + n * smoothstep(0.3, 1, r);
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
    pos.setY(i, y + noise3(x * 7 + 3, y * 7, z * 7) * 0.014);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Sauce spread with a wavy edge. */
export function sauceGeometry(segments: number) {
  const geo = lathe([[0, 0], [0.6, 0], [1.0, 0.0], [1.035, 0.022], [1.0, 0.045], [0.5, 0.045], [0, 0.045]], segments, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 0.001) continue;
    const a = Math.atan2(z, x);
    const k = 1 + (Math.sin(a * 5) * 0.025 + Math.sin(a * 11 + 1) * 0.015) * smoothstep(0.7, 1, r);
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Positions of sauce drips hanging over the bun edge. */
export function sauceDrips(count: number, seed = 3) {
  const rand = rng(seed);
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + rand() * 0.5;
    return { a, len: 0.05 + rand() * 0.08, r: 0.017 + rand() * 0.01 };
  });
}

/** Square cheese slice melting over the patty: corners droop and ripple. */
export function cheeseGeometry() {
  const size = 2.24;
  const geo = new THREE.PlaneGeometry(size, size, 64, 64);
  geo.rotateX(-Math.PI / 2);
  geo.rotateY(Math.PI / 4 + 0.2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), z = pos.getZ(i);
    // round the square's corners
    const sq = Math.max(Math.abs(x), Math.abs(z));
    const r0 = Math.hypot(x, z);
    const round = r0 > 0 ? THREE.MathUtils.lerp(1, sq / r0, 0.35) : 1;
    x *= round;
    z *= round;
    const r = Math.hypot(x, z);
    const over = Math.max(0, r - 0.98);
    const a = Math.atan2(z, x);
    // past the patty edge the slice folds down and hugs the side
    const fold = Math.min(over, 0.3);
    const radial = r - over * 0.85 + Math.sin(over * 5) * 0.02;
    const k = r > 0 ? radial / r : 1;
    let y = -fold * 0.95 - Math.max(0, over - 0.3) * 0.25;
    y += Math.sin(a * 7 + r * 5) * 0.01 * smoothstep(0.6, 1.1, r);
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Instance transforms and tints for a pile of caramelised onion strands. */
export function onionInstances(count: number, seed = 5) {
  const rand = rng(seed);
  const dummy = new THREE.Object3D();
  const tones = ["#6b3210", "#8c4a1a", "#a8662c", "#c68a45", "#d9a560", "#5a290c"].map(C);
  return Array.from({ length: count }, () => {
    const r = Math.sqrt(rand()) * 0.92;
    const a = rand() * Math.PI * 2;
    dummy.position.set(Math.cos(a) * r, 0.03 + rand() * 0.11, Math.sin(a) * r);
    dummy.rotation.set(-Math.PI / 2 + (rand() - 0.5) * 0.9, (rand() - 0.5) * 0.6, rand() * Math.PI * 2);
    const s = 0.7 + rand() * 0.7;
    dummy.scale.set(s, s, 0.45 + rand() * 0.3);
    dummy.updateMatrix();
    return { matrix: dummy.matrix.clone(), color: tones[Math.floor(rand() * tones.length)].clone().offsetHSL(0, 0, (rand() - 0.5) * 0.05) };
  });
}

/** Sesame seeds sitting on the upper part of the dome. */
export function sesameInstances(count: number, seed = 9) {
  const rand = rng(seed);
  const dummy = new THREE.Object3D();
  return Array.from({ length: count }, () => {
    const e = THREE.MathUtils.lerp(0.35, 1.45, Math.sqrt(rand()));
    const t = rand() * Math.PI * 2;
    const r = 1.02 * Math.pow(Math.cos(e), 0.75);
    const y = 0.08 + 0.64 * Math.pow(Math.sin(e), 0.95);
    dummy.position.set(Math.cos(t) * r, y, Math.sin(t) * r);
    dummy.lookAt(Math.cos(t) * r * 2, y * 2 + 0.3, Math.sin(t) * r * 2);
    dummy.rotateZ(rand() * Math.PI);
    dummy.updateMatrix();
    return dummy.matrix.clone();
  });
}

/** Ruffled leaf (lettuce, iceberg, arugula): a thin disc with a wavy, scalloped edge. */
export function leafGeometry(ruffle: number, scallops: number, seed = 1) {
  const geo = new THREE.CircleGeometry(1.1, 96);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 0.001) continue;
    const a = Math.atan2(z, x);
    const edge = smoothstep(0.55, 1.1, r);
    const k = 1 + Math.sin(a * scallops + seed) * 0.05 * edge;
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
    pos.setY(i, Math.sin(a * (scallops * 0.7) + r * 6 + seed) * ruffle * edge - edge * 0.06);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Positions for a few round pieces: one in the middle and the rest on a ring. */
export function spreadPositions(count: number, ringRadius: number, seed: number) {
  const rand = rng(seed);
  const center = count >= 5;
  const onRing = center ? count - 1 : count;
  const out: [number, number][] = center ? [[0, 0]] : [];
  for (let i = 0; i < onRing; i++) {
    const a = (i / onRing) * Math.PI * 2 + rand() * 0.3;
    const rr = onRing === 1 ? 0 : ringRadius * (0.9 + rand() * 0.2);
    out.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return out;
}
