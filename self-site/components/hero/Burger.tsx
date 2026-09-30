"use client";

import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { BunId, PattyId } from "@/lib/menu";
import {
  bottomBunGeometry,
  BUN_PALETTES,
  cheeseGeometry,
  leafGeometry,
  onionInstances,
  pattyGeometry,
  sauceDrips,
  sauceGeometry,
  sesameInstances,
  spreadPositions,
  topBunGeometry,
} from "./burgerGeometry";
import { thickness, type Layer, type Look } from "./looks";
import { bunBumpTexture, bunMottleTexture, pattyBumpTexture, pattyColorTexture, rng, salmonTexture } from "./textures";

/** Extra vertical gap each separated layer gets, in scene units. */
const GAP = 0.62;
/** Delay between neighbouring layers when separating. */
const STAGGER = 0.09;

export type Quality = "high" | "low";

type Props = {
  stack: Layer[];
  /** 0 = assembled, 1 = fully separated. Read every frame. */
  explode: { current: number };
  quality?: Quality;
  /**
   * Share of the extra height pushed below the base while separating:
   * 0 grows the stack upward, 0.5 keeps it centred.
   */
  explodeAnchor?: number;
  /** New layers fall into place from above (builder preview). */
  dropIn?: boolean;
} & ThreeElements["group"];

/* ---------- shared, lazily created resources ---------- */

const cache = new Map<string, unknown>();
function cached<T>(key: string, make: () => T): T {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as T;
}

const textures = () =>
  cached("textures", () => {
    const bunBump = bunBumpTexture();
    bunBump.repeat.set(4, 2);
    const mottle = bunMottleTexture();
    mottle.repeat.set(2, 1);
    const pattyMap = pattyColorTexture();
    pattyMap.repeat.set(3, 1);
    const pattyBump = pattyBumpTexture();
    pattyBump.repeat.set(3, 1);
    const salmon = salmonTexture();
    salmon.repeat.set(2, 1);
    return { bunBump, mottle, pattyMap, pattyBump, salmon };
  });

type PhysOpts = THREE.MeshPhysicalMaterialParameters;
const phys = (key: string, opts: PhysOpts) => cached(`mat-${key}`, () => new THREE.MeshPhysicalMaterial(opts));

function bunMaterial(bun: BunId, part: "top" | "bottom") {
  const t = textures();
  const top = part === "top";
  const base: PhysOpts = { vertexColors: true, map: t.mottle, bumpMap: t.bunBump };
  if (bun === "black") return phys(`bun-${bun}-${part}`, { ...base, roughness: top ? 0.4 : 0.6, clearcoat: top ? 0.6 : 0.2, clearcoatRoughness: 0.3, bumpScale: 0.5 });
  if (bun === "sesame") return phys(`bun-${bun}-${part}`, { ...base, roughness: top ? 0.52 : 0.68, clearcoat: top ? 0.3 : 0.15, clearcoatRoughness: 0.45, bumpScale: 0.6 });
  return phys(`bun-${bun}-${part}`, {
    ...base,
    roughness: top ? 0.46 : 0.66,
    clearcoat: top ? 0.55 : 0.2,
    clearcoatRoughness: 0.38,
    sheen: top ? 0.35 : 0,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color("#e8a060"),
    bumpScale: top ? 0.5 : 0.8,
  });
}

function pattyMaterial(p: PattyId) {
  const t = textures();
  switch (p) {
    case "beef":
      return phys("patty-beef", { map: t.pattyMap, bumpMap: t.pattyBump, bumpScale: 3, roughness: 0.52, clearcoat: 0.45, clearcoatRoughness: 0.35 });
    case "chicken":
      return phys("patty-chicken", { color: "#c27a2e", bumpMap: t.pattyBump, bumpScale: 4, roughness: 0.82, clearcoat: 0.1 });
    case "chickenFillet":
      return phys("patty-fillet", { color: "#d9a35e", bumpMap: t.pattyBump, bumpScale: 1.4, roughness: 0.55, clearcoat: 0.35 });
    case "pulled":
      return phys("patty-pulled", { color: "#4a1f0e", bumpMap: t.pattyBump, bumpScale: 5, roughness: 0.42, clearcoat: 0.65, clearcoatRoughness: 0.25 });
    case "salmon":
      return phys("patty-salmon", { map: t.salmon, bumpMap: t.pattyBump, bumpScale: 0.8, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  }
}

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/* ---------- layer meshes ---------- */

function Instanced({ geometry, material, matrices, colors }: { geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[]; colors?: THREE.Color[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    colors?.forEach((c, i) => mesh.setColorAt(i, c));
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [matrices, colors]);
  return <instancedMesh ref={ref} args={[geometry, material, matrices.length]} castShadow receiveShadow />;
}

function Bun({ look, segs, quality }: { look: Extract<Look, { shape: "bun" }>; segs: number; quality: Quality }) {
  const geometry = cached(`bun-${look.part}-${look.bun}-${segs}`, () =>
    look.part === "top" ? topBunGeometry(segs, BUN_PALETTES[look.bun]) : bottomBunGeometry(segs, BUN_PALETTES[look.bun]),
  );
  const seeds = useMemo(() => (look.bun === "sesame" && look.part === "top" ? sesameInstances(quality === "high" ? 110 : 60) : null), [look, quality]);
  const seedGeo = cached("seed-geo", () => new THREE.SphereGeometry(1, 8, 6).scale(0.042, 0.022, 0.012));
  const seedMat = phys("seed", { color: "#f4e2b2", roughness: 0.5, clearcoat: 0.3 });
  return (
    <>
      <mesh geometry={geometry} material={bunMaterial(look.bun, look.part)} castShadow receiveShadow />
      {seeds && <Instanced geometry={seedGeo} material={seedMat} matrices={seeds} />}
    </>
  );
}

function Sauce({ color, quality }: { color: string; quality: Quality }) {
  const segs = quality === "high" ? 96 : 48;
  const geometry = cached(`sauce-geo-${segs}`, () => sauceGeometry(segs));
  const dripGeo = cached("drip-geo", () => new THREE.CapsuleGeometry(1, 1, 4, 10));
  const drips = useMemo(() => sauceDrips(quality === "high" ? 6 : 4, hash(color)), [color, quality]);
  const material = phys(`sauce-${color}`, { color, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12 });
  return (
    <group>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      {drips.map((d, j) => (
        <mesh
          key={j}
          geometry={dripGeo}
          material={material}
          position={[Math.cos(d.a) * 1.0, -d.len / 2 + 0.03, Math.sin(d.a) * 1.0]}
          scale={[d.r, d.len / 2, d.r]}
        />
      ))}
    </group>
  );
}

function Strands({ quality }: { quality: Quality }) {
  const count = quality === "high" ? 170 : 90;
  const geometry = cached("strand-geo", () => new THREE.TorusGeometry(0.17, 0.027, 8, 24, Math.PI * 1.2));
  const material = phys("strands", { roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 });
  const items = useMemo(() => onionInstances(count), [count]);
  return <Instanced geometry={geometry} material={material} matrices={items.map((i) => i.matrix)} colors={items.map((i) => i.color)} />;
}

function Slices({ look, seed }: { look: Extract<Look, { shape: "slices" }>; seed: number }) {
  const outer = cached(`slice-${look.radius}-${look.height}`, () => new THREE.CylinderGeometry(look.radius, look.radius, look.height, 28));
  const inner = cached(`slice-in-${look.radius}`, () => new THREE.CylinderGeometry(look.radius * 0.72, look.radius * 0.72, 0.004, 28));
  const matOuter = phys(`slice-${look.color}`, { color: look.color, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const matInner = phys(`slice-in-${look.inner}`, { color: look.inner ?? look.color, roughness: 0.4, clearcoat: 0.6 });
  const [m1, m2] = useMemo(() => {
    const rand = rng(seed);
    const d = new THREE.Object3D();
    const a: THREE.Matrix4[] = [];
    const b: THREE.Matrix4[] = [];
    spreadPositions(look.count, look.ring, seed).forEach(([x, z]) => {
      const y = look.height / 2 + rand() * 0.02;
      d.position.set(x, y, z);
      d.rotation.set((rand() - 0.5) * 0.12, rand() * Math.PI, (rand() - 0.5) * 0.12);
      d.updateMatrix();
      a.push(d.matrix.clone());
      d.position.y = y + look.height / 2 + 0.002;
      d.updateMatrix();
      b.push(d.matrix.clone());
    });
    return [a, b];
  }, [look, seed]);
  return (
    <>
      <Instanced geometry={outer} material={matOuter} matrices={m1} />
      {look.inner && <Instanced geometry={inner} material={matInner} matrices={m2} />}
    </>
  );
}

function Rings({ look, seed }: { look: Extract<Look, { shape: "rings" }>; seed: number }) {
  const geometry = cached(`ring-${look.radius}-${look.tube}`, () => new THREE.TorusGeometry(look.radius, look.tube, 10, 36).rotateX(Math.PI / 2));
  const t = textures();
  const material = look.fried
    ? phys(`ring-${look.color}`, { color: look.color, bumpMap: t.pattyBump, bumpScale: 3, roughness: 0.8, clearcoat: 0.15 })
    : phys(`ring-${look.color}`, { color: look.color, roughness: 0.3, clearcoat: 0.8, transmission: 0.1, thickness: 0.2 });
  const matrices = useMemo(() => {
    const rand = rng(seed);
    const d = new THREE.Object3D();
    return spreadPositions(look.count, look.ring, seed).map(([x, z]) => {
      d.position.set(x, look.tube + rand() * 0.02, z);
      d.rotation.set((rand() - 0.5) * 0.2, 0, (rand() - 0.5) * 0.2);
      d.scale.setScalar(0.85 + rand() * 0.3);
      d.updateMatrix();
      return d.matrix.clone();
    });
  }, [look, seed]);
  return <Instanced geometry={geometry} material={material} matrices={matrices} />;
}

function Disc({ look }: { look: Extract<Look, { shape: "disc" }> }) {
  const geometry = cached(`disc-${look.radius}-${look.height}`, () => new THREE.CylinderGeometry(look.radius, look.radius * 0.97, look.height, 56));
  const t = textures();
  const material = phys(`disc-${look.color}`, { color: look.color, bumpMap: t.pattyBump, bumpScale: 2.5, roughness: 0.78, clearcoat: 0.15 });
  return <mesh geometry={geometry} material={material} position-y={look.height / 2} castShadow receiveShadow />;
}

function Leaf({ look, seed }: { look: Extract<Look, { shape: "leaf" }>; seed: number }) {
  const geometry = cached(`leaf-${look.ruffle}-${look.scallops}`, () => leafGeometry(look.ruffle, look.scallops, 1.3));
  const material = phys(`leaf-${look.color}`, {
    color: look.color,
    roughness: 0.42,
    clearcoat: 0.4,
    sheen: 0.5,
    sheenColor: new THREE.Color("#e8ffd0"),
    side: THREE.DoubleSide,
  });
  const turn = (seed % 628) / 100;
  return (
    <>
      <mesh geometry={geometry} material={material} position-y={0.05} rotation-y={turn} castShadow receiveShadow />
      {look.double && <mesh geometry={geometry} material={material} position-y={0.09} rotation-y={turn + 1.7} scale={0.96} castShadow receiveShadow />}
    </>
  );
}

function Strips({ look, seed }: { look: Extract<Look, { shape: "strips" }>; seed: number }) {
  const geometry = cached("strip-geo", () => new THREE.CapsuleGeometry(0.035, 0.42, 4, 8).rotateZ(Math.PI / 2));
  const material = phys(`strip-${look.color}`, { color: look.color, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.15 });
  const matrices = useMemo(() => {
    const rand = rng(seed);
    const d = new THREE.Object3D();
    return Array.from({ length: look.count }, () => {
      const r = Math.sqrt(rand()) * 0.65;
      const a = rand() * Math.PI * 2;
      d.position.set(Math.cos(a) * r, 0.04, Math.sin(a) * r);
      d.rotation.set(0, rand() * Math.PI, (rand() - 0.5) * 0.15);
      d.updateMatrix();
      return d.matrix.clone();
    });
  }, [look, seed]);
  return <Instanced geometry={geometry} material={material} matrices={matrices} />;
}

function LayerMesh({ layer, quality }: { layer: Layer; quality: Quality }) {
  const segs = quality === "high" ? 96 : 48;
  const look = layer.look;
  const seed = hash(layer.key);
  switch (look.shape) {
    case "bun":
      return <Bun look={look} segs={segs} quality={quality} />;
    case "patty":
      return <mesh geometry={cached(`patty-geo-${segs}`, () => pattyGeometry(segs))} material={pattyMaterial(look.patty)} castShadow receiveShadow />;
    case "cheese":
      return (
        <mesh
          geometry={cached("cheese-geo", cheeseGeometry)}
          material={phys("cheese", {
            color: "#f6ad14",
            roughness: 0.34,
            clearcoat: 0.5,
            clearcoatRoughness: 0.25,
            sheen: 0.6,
            sheenColor: new THREE.Color("#ffe08a"),
            side: THREE.DoubleSide,
          })}
          position-y={0.02}
          castShadow
          receiveShadow
        />
      );
    case "sauce":
      return <Sauce color={look.color} quality={quality} />;
    case "strands":
      return <Strands quality={quality} />;
    case "slices":
      return <Slices look={look} seed={seed} />;
    case "rings":
      return <Rings look={look} seed={seed} />;
    case "disc":
      return <Disc look={look} />;
    case "leaf":
      return <Leaf look={look} seed={seed} />;
    case "strips":
      return <Strips look={look} seed={seed} />;
  }
}

/**
 * Procedural burger built from any stack of layers. Layers separate with a
 * staggered, slightly spinning lift when `explode` rises, and glide to their
 * new height when the stack changes.
 */
export default function Burger({ stack, explode, quality = "high", explodeAnchor = 0, dropIn = false, ...group }: Props) {
  const bases = useMemo(() => {
    let y = 0;
    return stack.map((l) => {
      const b = y;
      y += thickness(l.look);
      return b;
    });
  }, [stack]);

  const root = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const settled = useRef(new Map<string, number>());

  useFrame(({ clock }, delta) => {
    const e = explode.current;
    const n = stack.length;
    const t = clock.elapsedTime;
    const span = 1 - (n - 1) * STAGGER;
    stack.forEach((layer, i) => {
      const g = refs.current[i];
      if (!g) return;
      let base = settled.current.get(layer.key);
      if (base === undefined) base = dropIn ? bases[i] + 2.2 : bases[i];
      base = THREE.MathUtils.damp(base, bases[i], 7, delta);
      settled.current.set(layer.key, base);

      const raw = Math.min(1, Math.max(0, (e - i * STAGGER) / Math.max(span, 0.2)));
      const local = raw * raw * (3 - 2 * raw);
      const dir = i % 2 === 0 ? 1 : -1;
      g.position.y = base + i * GAP * local + Math.sin(t * 1.3 + i * 1.7) * 0.035 * local;
      g.position.x = Math.sin(i * 2.3) * 0.12 * local;
      g.rotation.y = dir * 0.45 * local + Math.sin(t * 0.6 + i) * 0.05 * local;
      g.rotation.x = Math.sin(i * 1.7) * 0.14 * local;
      g.rotation.z = Math.cos(i * 1.3) * 0.12 * local;
    });
    if (root.current) root.current.position.y = -e * (n - 1) * GAP * explodeAnchor;
  });

  return (
    <group {...group}>
      <group ref={root}>
        {stack.map((layer, i) => (
          <group key={layer.key} ref={(el) => void (refs.current[i] = el)}>
            <LayerMesh layer={layer} quality={quality} />
          </group>
        ))}
      </group>
    </group>
  );
}
