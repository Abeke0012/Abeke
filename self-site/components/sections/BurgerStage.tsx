"use client";

import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import Burger, { type Quality } from "@/components/hero/Burger";
import { THICKNESS, type LayerKind } from "@/components/hero/burgerGeometry";

function Turntable({ stack, open, quality }: { stack: LayerKind[]; open: boolean; quality: Quality }) {
  const spin = useRef<THREE.Group>(null);
  const explode = useRef(0);
  const height = stack.reduce((h, k) => h + THICKNESS[k], 0);

  useFrame((state, delta) => {
    explode.current = THREE.MathUtils.damp(explode.current, open ? 0.42 : 0, 5, delta);
    if (spin.current) {
      spin.current.rotation.y += delta * (open ? 0.5 : 0.22);
      spin.current.rotation.x = THREE.MathUtils.damp(spin.current.rotation.x, -state.pointer.y * 0.15, 4, delta);
    }
  });

  return (
    <group ref={spin}>
      <group position-y={-height / 2}>
        <Burger stack={stack} explode={explode} quality={quality} explodeAnchor={0.5} />
      </group>
    </group>
  );
}

/** Small studio for one burger: warm key, orange rim, soft contact shadow. */
export default function BurgerStage({ stack, open, active, quality }: { stack: LayerKind[]; open: boolean; active: boolean; quality: Quality }) {
  const height = stack.reduce((h, k) => h + THICKNESS[k], 0);
  return (
    <Canvas
      dpr={[1, 1.6]}
      frameloop={active ? "always" : "never"}
      camera={{ fov: 28, position: [0, 1.4, 7.4 + height * 0.8] }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      aria-hidden
    >
      <ambientLight intensity={0.15} />
      <spotLight position={[3, 6, 4]} angle={0.5} penumbra={0.9} decay={0} intensity={3.6} color="#ffd6ad" />
      <spotLight position={[-4, 2.5, -4]} angle={0.6} penumbra={1} decay={0} intensity={2.6} color="#ff6a1a" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2} color="#ffd2a0" position={[0, 5, 3]} scale={[8, 3, 1]} rotation-x={Math.PI / 2.4} />
        <Lightformer form="rect" intensity={2.4} color="#ff7a2a" position={[-6, 1, -2]} scale={[2, 6, 1]} rotation-y={Math.PI / 2} />
      </Environment>
      <Turntable stack={stack} open={open} quality={quality} />
      <ContactShadows position-y={-height / 2 - 0.02} opacity={0.65} scale={6} blur={2.6} far={2} color="#000000" />
    </Canvas>
  );
}
