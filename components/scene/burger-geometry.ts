import * as THREE from "three";

/**
 * Procedural low-poly burger parts. Every geometry has its origin at the
 * BOTTOM of the layer so the stack layout can place it by its base height.
 * Segment counts are deliberately modest: the wireframe is the aesthetic.
 */

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function lathe(profile: [number, number][], segments = 36) {
  return new THREE.LatheGeometry(
    profile.map(([x, y]) => new THREE.Vector2(x, y)),
    segments,
  );
}

export function bunBottomGeometry() {
  return lathe([
    [0, 0],
    [1.3, 0],
    [1.48, 0.08],
    [1.56, 0.26],
    [1.54, 0.42],
    [1.45, 0.5],
    [0, 0.5],
  ]);
}

export function bunTopGeometry() {
  return lathe([
    [0, 0],
    [1.5, 0],
    [1.6, 0.12],
    [1.56, 0.38],
    [1.36, 0.62],
    [1.0, 0.8],
    [0.5, 0.9],
    [0, 0.92],
  ]);
}

export function sesameSeedPositions(count = 70) {
  const rand = seeded(7);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Sample the upper dome (ellipsoid approximation of the top bun).
    const theta = rand() * Math.PI * 2;
    const phi = rand() * 1.1;
    const r = Math.sin(phi) * 1.45;
    positions[i * 3] = Math.cos(theta) * r;
    positions[i * 3 + 1] = 0.12 + Math.cos(phi) * 0.82;
    positions[i * 3 + 2] = Math.sin(theta) * r;
  }
  return positions;
}

export function pattyGeometry(seed: number) {
  const geo = new THREE.CylinderGeometry(1.64, 1.6, 0.34, 30, 2);
  const rand = seeded(seed + 11);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const radial = Math.hypot(v.x, v.z);
    if (radial > 0.01) {
      // Rough, seared edge.
      const k = 1 + (rand() - 0.5) * 0.07;
      v.x *= k;
      v.z *= k;
    }
    v.y += (rand() - 0.5) * 0.03;
    pos.setXYZ(i, v.x, v.y + 0.17, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function cheeseGeometry() {
  const size = 3.1;
  const geo = new THREE.BoxGeometry(size, 0.05, size, 10, 1, 10);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Corners droop over the patty edge.
    const overhang = Math.max(0, Math.hypot(v.x, v.z) - 1.5);
    v.y -= overhang * overhang * 1.4;
    pos.setXYZ(i, v.x, v.y + 0.05, v.z);
  }
  geo.rotateY(Math.PI / 4);
  geo.computeVertexNormals();
  return geo;
}

export function lettuceGeometry() {
  const geo = new THREE.CircleGeometry(1.82, 44, 0, Math.PI * 2);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.z);
    const a = Math.atan2(v.z, v.x);
    v.y = 0.06 + Math.sin(a * 11) * 0.05 * (r / 1.82) - Math.max(0, r - 1.5) * 0.2;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function sauceGeometry() {
  return new THREE.CylinderGeometry(1.5, 1.52, 0.06, 36, 1).translate(0, 0.03, 0);
}

export function baconGeometry() {
  const geo = new THREE.BoxGeometry(3.3, 0.05, 0.42, 28, 1, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.y += Math.sin(v.x * 5) * 0.035 + 0.05;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function jalapenoGeometry() {
  const geo = new THREE.TorusGeometry(0.26, 0.07, 6, 16);
  geo.rotateX(Math.PI / 2);
  geo.scale(1, 0.6, 1);
  geo.translate(0, 0.05, 0);
  return geo;
}

export const JALAPENO_RINGS: [number, number][] = [
  [0, 0],
  [0.72, 0.2],
  [-0.62, 0.38],
  [0.18, -0.74],
  [-0.46, -0.58],
  [0.36, 0.84],
  [0.98, -0.44],
  [-1.02, -0.06],
];

export const BACON_STRIPS = [
  { z: -0.5, rot: 0.25 },
  { z: 0.15, rot: -0.15 },
  { z: 0.72, rot: 0.1 },
];
