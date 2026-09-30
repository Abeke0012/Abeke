"use client";

import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { frontTexture, lidTexture, rng } from "./textures";
import type { Quality } from "./Burger";

/** Outer size of the box base, scene units. */
export const BOX = { w: 3.4, d: 2.3, h: 0.62, t: 0.035 };
/** Where the burger rests inside the box, relative to the box origin (bottom centre). */
export const BURGER_SLOT = new THREE.Vector3(-0.72, BOX.t, 0.08);
export const BURGER_SCALE = 0.5;

/** Depth of the lid above the hinge, so the closed box clears the burger. */
const LID_H = 0.34;
/** How far the lid walls overlap the base when closed. */
const FLAP = 0.12;
const LID_OPEN = -1.95;

type Props = {
  /** 0 = open, 1 = closed. Read every frame. */
  lid: { current: number };
  quality?: Quality;
} & ThreeElements["group"];

function Fries({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(0.062, 1, 0.062), []);
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#f2b64d", roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.5 }), []);
  useLayoutEffect(() => {
    const rand = rng(17);
    const dummy = new THREE.Object3D();
    const tones = ["#f5c15a", "#eeab3f", "#e39a33", "#f7cc6e"].map((c) => new THREE.Color(c));
    const mesh = ref.current!;
    for (let i = 0; i < count; i++) {
      const len = 0.52 + rand() * 0.24;
      dummy.position.set((rand() - 0.5) * 0.72, len / 2 + 0.03 + rand() * 0.06, (rand() - 0.5) * 0.46);
      dummy.rotation.set((rand() - 0.5) * 0.45, rand() * Math.PI, (rand() - 0.5) * 0.45);
      dummy.scale.set(1, len, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, tones[Math.floor(rand() * tones.length)]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count]);
  return <instancedMesh ref={ref} args={[geometry, material, count]} castShadow />;
}

function FriesHolder({ quality }: { quality: Quality }) {
  const red = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#c9261a", roughness: 0.5, clearcoat: 0.3 }), []);
  const w = 0.92, d = 0.66, h = 0.5, t = 0.02;
  return (
    <group>
      <mesh material={red} position={[0, t / 2, 0]} receiveShadow>
        <boxGeometry args={[w, t, d]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`z${s}`} material={red} position={[0, h / 2, (s * d) / 2]} castShadow receiveShadow>
          <boxGeometry args={[w, h, t]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`x${s}`} material={red} position={[(s * w) / 2, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[t, h, d]} />
        </mesh>
      ))}
      <Fries count={quality === "high" ? 60 : 34} />
    </group>
  );
}

function SauceCup() {
  const paper = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#f3eee6", roughness: 0.6, side: THREE.DoubleSide }), []);
  const sauce = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#f0a03c", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1 }), []);
  return (
    <group>
      <mesh material={paper} position-y={0.11} castShadow receiveShadow>
        <cylinderGeometry args={[0.31, 0.26, 0.22, 48, 1, true]} />
      </mesh>
      <mesh material={paper} position-y={0.005} receiveShadow>
        <cylinderGeometry args={[0.26, 0.26, 0.01, 48]} />
      </mesh>
      <mesh material={sauce} position-y={0.18} receiveShadow>
        <cylinderGeometry args={[0.295, 0.295, 0.02, 48]} />
      </mesh>
      <mesh material={sauce} position-y={0.2} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[0.12, 0.025, 12, 40, Math.PI * 1.6]} />
      </mesh>
    </group>
  );
}

/** Branded black SELF delivery box with a hinged lid. Origin: bottom centre. */
export default function SelfBox({ lid, quality = "high", children, ...group }: Props) {
  const { w, d, h, t } = BOX;
  const mats = useMemo(() => {
    const board = new THREE.MeshPhysicalMaterial({ color: "#111113", roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.45 });
    const inner = new THREE.MeshPhysicalMaterial({ color: "#1a1817", roughness: 0.8 });
    const lidPrint = new THREE.MeshPhysicalMaterial({ map: lidTexture(w / d), roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.35 });
    const frontPrint = new THREE.MeshPhysicalMaterial({ map: frontTexture(w / h), roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.35 });
    return { board, inner, lidPrint, frontPrint };
  }, [w, d, h]);

  const hinge = useRef<THREE.Group>(null);
  useFrame(() => {
    if (hinge.current) hinge.current.rotation.x = LID_OPEN * (1 - lid.current);
  });

  return (
    <group {...group}>
      {/* tray */}
      <mesh material={mats.inner} position={[0, t / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[w, t, d]} />
      </mesh>
      <mesh
        position={[0, h / 2, d / 2 - t / 2]}
        material={[mats.board, mats.board, mats.board, mats.board, mats.frontPrint, mats.inner]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[w, h, t]} />
      </mesh>
      <mesh material={mats.board} position={[0, h / 2, -d / 2 + t / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, t]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={mats.board} position={[(s * (w - t)) / 2, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[t, h, d]} />
        </mesh>
      ))}

      {/* contents */}
      <group position={[0.92, t, -0.36]}>
        <FriesHolder quality={quality} />
      </group>
      <group position={[0.95, t, 0.6]}>
        <SauceCup />
      </group>
      {children}

      {/* lid, hinged on the back top edge */}
      <group ref={hinge} position={[0, h, -d / 2]}>
        <mesh
          position={[0, LID_H + t / 2, d / 2]}
          material={[mats.board, mats.board, mats.lidPrint, mats.inner, mats.board, mats.board]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[w + 0.04, t, d + 0.04]} />
        </mesh>
        <mesh material={mats.board} position={[0, (LID_H - FLAP) / 2, d + 0.02]} castShadow>
          <boxGeometry args={[w + 0.04, LID_H + FLAP, t]} />
        </mesh>
        <mesh material={mats.board} position={[0, LID_H / 2, 0]} castShadow>
          <boxGeometry args={[w + 0.04, LID_H, t]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={mats.board} position={[(s * (w + 0.02)) / 2, (LID_H - FLAP) / 2, d / 2]} castShadow>
            <boxGeometry args={[t, LID_H + FLAP, d]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
