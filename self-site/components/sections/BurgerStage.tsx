"use client";

import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import Burger, { type Quality } from "@/components/hero/Burger";
import { stackHeight, type Layer } from "@/components/hero/looks";

function Turntable({ stack, open, quality, dropIn }: { stack: Layer[]; open: boolean; quality: Quality; dropIn: boolean }) {
  const spin = useRef<THREE.Group>(null);
  const lift = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Group>(null);
  const explode = useRef(0);
  const height = useRef(stackHeight(stack));
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useFrame((state, delta) => {
    const target = stackHeight(stack);
    height.current = THREE.MathUtils.damp(height.current, target, 5, delta);
    explode.current = THREE.MathUtils.damp(explode.current, open ? 0.42 : 0, 5, delta);
    if (spin.current) {
      spin.current.rotation.y += delta * (open ? 0.5 : 0.22);
      spin.current.rotation.x = THREE.MathUtils.damp(spin.current.rotation.x, -state.pointer.y * 0.15, 4, delta);
    }
    if (lift.current) lift.current.position.y = -height.current / 2;
    if (shadow.current) shadow.current.position.y = -height.current / 2 - 0.02;
    // Keep the whole burger in frame however tall it gets, on any card shape.
    const fit = Math.max(1, 0.85 / (size.width / size.height));
    const dist = (5.2 + height.current * 1.35) * fit * (open ? 1.25 : 1);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, dist, 4, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, dist * 0.2, 4, delta);
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <group ref={spin}>
        <group ref={lift}>
          <Burger stack={stack} explode={explode} quality={quality} explodeAnchor={0.5} dropIn={dropIn} />
        </group>
      </group>
      <group ref={shadow}>
        <ContactShadows opacity={0.65} scale={6} blur={2.6} far={2} color="#000000" />
      </group>
    </>
  );
}

/** Small studio for one burger: warm key, orange rim, soft contact shadow. */
export default function BurgerStage({
  stack,
  open = false,
  active,
  quality,
  dropIn = false,
}: {
  stack: Layer[];
  open?: boolean;
  active: boolean;
  quality: Quality;
  dropIn?: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      frameloop={active ? "always" : "never"}
      camera={{ fov: 28, position: [0, 1.6, 8] }}
      gl={{ antialias: true, alpha: true }}
      aria-hidden
    >
      <ambientLight intensity={0.15} />
      <spotLight position={[3, 6, 4]} angle={0.5} penumbra={0.9} decay={0} intensity={3.6} color="#ffd6ad" />
      <spotLight position={[-4, 2.5, -4]} angle={0.6} penumbra={1} decay={0} intensity={2.6} color="#ff6a1a" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2} color="#ffd2a0" position={[0, 5, 3]} scale={[8, 3, 1]} rotation-x={Math.PI / 2.4} />
        <Lightformer form="rect" intensity={2.4} color="#ff7a2a" position={[-6, 1, -2]} scale={[2, 6, 1]} rotation-y={Math.PI / 2} />
      </Environment>
      <Turntable stack={stack} open={open} quality={quality} dropIn={dropIn} />
    </Canvas>
  );
}
