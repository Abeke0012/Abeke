"use client";

import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  bottomBunGeometry,
  cheeseGeometry,
  onionInstances,
  pattyGeometry,
  sauceDrips,
  sauceGeometry,
  THICKNESS,
  topBunGeometry,
  type LayerKind,
} from "./burgerGeometry";
import { bunBumpTexture, bunMottleTexture, pattyBumpTexture, pattyColorTexture } from "./textures";

export const CLASSIC: LayerKind[] = ["bottomBun", "sauce", "patty", "cheese", "onions", "topBun"];

/** Extra vertical gap each separated layer gets, in scene units. */
const GAP = 0.62;
/** Delay between neighbouring layers when separating. */
const STAGGER = 0.09;

export type Quality = "high" | "low";

type Props = {
  stack?: LayerKind[];
  /** 0 = assembled, 1 = fully separated. Read every frame. */
  explode: { current: number };
  quality?: Quality;
  /**
   * Share of the extra height pushed below the base while separating:
   * 0 grows the stack upward, 0.5 keeps it centred.
   */
  explodeAnchor?: number;
} & ThreeElements["group"];

function useMaterials() {
  return useMemo(() => {
    const bunBump = bunBumpTexture();
    bunBump.repeat.set(4, 2);
    const mottle = bunMottleTexture();
    mottle.repeat.set(2, 1);
    const pattyMap = pattyColorTexture();
    pattyMap.repeat.set(3, 1);
    const pattyBump = pattyBumpTexture();
    pattyBump.repeat.set(3, 1);
    return {
      bun: new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        map: mottle,
        roughness: 0.46,
        clearcoat: 0.55,
        clearcoatRoughness: 0.38,
        sheen: 0.35,
        sheenRoughness: 0.6,
        sheenColor: new THREE.Color("#e8a060"),
        bumpMap: bunBump,
        bumpScale: 0.5,
      }),
      bottomBun: new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        map: mottle,
        roughness: 0.66,
        clearcoat: 0.2,
        bumpMap: bunBump,
        bumpScale: 0.8,
      }),
      patty: new THREE.MeshPhysicalMaterial({
        map: pattyMap,
        bumpMap: pattyBump,
        bumpScale: 3,
        roughness: 0.52,
        clearcoat: 0.45,
        clearcoatRoughness: 0.35,
      }),
      sauce: new THREE.MeshPhysicalMaterial({
        color: "#e9b07a",
        roughness: 0.22,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      }),
      cheese: new THREE.MeshPhysicalMaterial({
        color: "#f6ad14",
        roughness: 0.34,
        clearcoat: 0.5,
        clearcoatRoughness: 0.25,
        sheen: 0.6,
        sheenColor: new THREE.Color("#ffe08a"),
        side: THREE.DoubleSide,
      }),
      onion: new THREE.MeshPhysicalMaterial({
        roughness: 0.28,
        clearcoat: 1,
        clearcoatRoughness: 0.15,
      }),
    };
  }, []);
}

function Onions({ count, material }: { count: number; material: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.TorusGeometry(0.17, 0.027, 8, 24, Math.PI * 1.2), []);
  const items = useMemo(() => onionInstances(count), [count]);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    items.forEach((it, i) => {
      mesh.setMatrixAt(i, it.matrix);
      mesh.setColorAt(i, it.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);
  return <instancedMesh ref={ref} args={[geometry, material, count]} castShadow receiveShadow />;
}

/**
 * Procedural premium burger. Layers sit on top of each other and separate
 * with a staggered, slightly spinning lift when `explode` rises.
 */
export default function Burger({ stack = CLASSIC, explode, quality = "high", explodeAnchor = 0, ...group }: Props) {
  const segs = quality === "high" ? 96 : 48;
  const mats = useMaterials();
  const geos = useMemo(
    () => ({
      topBun: topBunGeometry(segs),
      bottomBun: bottomBunGeometry(segs),
      patty: pattyGeometry(segs),
      sauce: sauceGeometry(segs),
      cheese: cheeseGeometry(),
    }),
    [segs],
  );
  const drips = useMemo(() => sauceDrips(quality === "high" ? 6 : 4), [quality]);
  const dripGeo = useMemo(() => new THREE.CapsuleGeometry(1, 1, 4, 10), []);

  const bases = useMemo(() => {
    let y = 0;
    return stack.map((k) => {
      const b = y;
      y += THICKNESS[k];
      return b;
    });
  }, [stack]);

  const root = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Group | null)[]>([]);

  useFrame(({ clock }) => {
    const e = explode.current;
    const n = stack.length;
    const t = clock.elapsedTime;
    const span = 1 - (n - 1) * STAGGER;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const raw = Math.min(1, Math.max(0, (e - i * STAGGER) / Math.max(span, 0.2)));
      const local = raw * raw * (3 - 2 * raw);
      const dir = i % 2 === 0 ? 1 : -1;
      g.position.y = bases[i] + i * GAP * local + Math.sin(t * 1.3 + i * 1.7) * 0.035 * local;
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
        {stack.map((kind, i) => (
          <group key={`${kind}-${i}`} ref={(el) => void (refs.current[i] = el)}>
            {kind === "topBun" && <mesh geometry={geos.topBun} material={mats.bun} castShadow receiveShadow />}
            {kind === "bottomBun" && <mesh geometry={geos.bottomBun} material={mats.bottomBun} castShadow receiveShadow />}
            {kind === "patty" && <mesh geometry={geos.patty} material={mats.patty} castShadow receiveShadow />}
            {kind === "cheese" && <mesh geometry={geos.cheese} material={mats.cheese} position-y={0.02} castShadow receiveShadow />}
            {kind === "onions" && <Onions count={quality === "high" ? 170 : 90} material={mats.onion} />}
            {kind === "sauce" && (
              <group>
                <mesh geometry={geos.sauce} material={mats.sauce} castShadow receiveShadow />
                {drips.map((d, j) => (
                  <mesh
                    key={j}
                    geometry={dripGeo}
                    material={mats.sauce}
                    position={[Math.cos(d.a) * 1.0, -d.len / 2 + 0.03, Math.sin(d.a) * 1.0]}
                    scale={[d.r, d.len / 2, d.r]}
                  />
                ))}
              </group>
            )}
          </group>
        ))}
      </group>
    </group>
  );
}
