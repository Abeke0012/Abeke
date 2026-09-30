import * as THREE from "three";
import { noise3, rng } from "./textures";

export type LayerKind = "bottomBun" | "sauce" | "patty" | "cheese" | "onions" | "topBun";

/** Assembled thickness of each layer, in scene units (bun radius ≈ 1). */
export const THICKNESS: Record<LayerKind, number> = {
  bottomBun: 0.34,
  sauce: 0.045,
  patty: 0.32,
  cheese: 0.035,
  onions: 0.17,
  topBun: 0.72,
};

export const LAYER_LABEL: Record<LayerKind, string> = {
  bottomBun: "Нижняя бриошь",
  sauce: "Соус SELF",
  patty: "Говяжья котлета",
  cheese: "Чеддер",
  onions: "Карамелизированный лук",
  topBun: "Верхняя бриошь",
};

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

/** Glossy brioche dome: pale cut underneath, golden sides, deep mahogany top. */
export function topBunGeometry(segments: number) {
  const pts: [number, number][] = [[0, 0], [0.5, 0], [0.93, 0], [0.99, 0.025], [1.02, 0.08]];
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * (Math.PI / 2);
    pts.push([1.02 * Math.pow(Math.cos(a), 0.75), 0.08 + 0.64 * Math.pow(Math.sin(a), 0.95)]);
  }
  const geo = lathe(pts, segments, 72);
  const crumb = C("#efd09a"), side = C("#c9803a"), glow = C("#8f4214"), top = C("#5e260a");
  paint(geo, (_x, y, _z, n) => {
    if (y < 0.004) return crumb;
    const h = y / 0.72;
    const base = mix(side, mix(glow, top, smoothstep(0.45, 1, h)), smoothstep(0.05, 0.5, h));
    return base.offsetHSL(0, -0.04, n * 0.03);
  });
  geo.computeVertexNormals();
  return geo;
}

export function bottomBunGeometry(segments: number) {
  const geo = lathe(
    [[0, 0], [0.6, 0], [0.88, 0.0], [0.97, 0.03], [1.0, 0.1], [1.01, 0.19], [0.99, 0.27], [0.95, 0.32], [0.88, 0.34], [0.4, 0.34], [0, 0.34]],
    segments,
    56,
  );
  const crumb = C("#efd09a"), low = C("#7a3812"), high = C("#c98440");
  paint(geo, (x, y, z, n) => {
    const r = Math.hypot(x, z);
    if (y > 0.332 && r < 0.93) return crumb.clone().offsetHSL(0, 0, n * 0.02);
    return mix(low, high, smoothstep(0.0, 0.26, y)).offsetHSL(0, -0.04, n * 0.03);
  });
  geo.computeVertexNormals();
  return geo;
}

/** Thick seared patty with an uneven, craggy edge. */
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

/** Square cheddar slice melting over the patty: corners droop and ripple. */
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

/** Instance transforms and tints for a pile of caramelised onion rings. */
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
