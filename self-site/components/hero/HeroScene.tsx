"use client";

import { ContactShadows, Environment, Lightformer, MeshReflectorMaterial } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, DepthOfField, EffectComposer, Vignette } from "@react-three/postprocessing";
import type { MotionValue } from "framer-motion";
import type { DepthOfFieldEffect } from "postprocessing";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import Burger, { type Quality } from "./Burger";
import { HERO_BUILD, stackFor, stackHeight } from "./looks";
import Embers from "./Embers";
import SelfBox, { BOX, BURGER_SCALE, BURGER_SLOT } from "./SelfBox";
import { cameraAt, easeInOut, easeOutBack, lerp, orbitAngle, phaseAt, range, smooth } from "./timeline";

export const HERO_STACK = stackFor(HERO_BUILD);
const FLOOR = -1.2;
/** Centres the assembled burger on the origin. */
const HERO_POS = new THREE.Vector3(0, -stackHeight(HERO_STACK) / 2, 0);
const SLOT_POS = new THREE.Vector3(0, FLOOR, 0).add(BURGER_SLOT);
const BOX_CENTER = new THREE.Vector3(0, FLOOR + BOX.h * 0.5, 0);
const INTRO_SECONDS = 2.4;
const FOG_NEAR = 9;

const FOG_FAR = 20;

type RigProps = { progress: MotionValue<number>; quality: Quality };

function Rig({ progress, quality }: RigProps) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const scene = useThree((s) => s.scene);
  const anchor = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const box = useRef<THREE.Group>(null);
  const key = useRef<THREE.SpotLight>(null);
  const dof = useRef<DepthOfFieldEffect>(null);

  const explode = useRef(0);
  const lid = useRef(0);
  const start = useRef<number | null>(null);
  const cam = useRef({ pos: [0, 0, 0], look: [0, 0, 0] });
  const look = useRef(new THREE.Vector3());
  const focus = useRef(new THREE.Vector3());
  const pointer = useRef(new THREE.Vector2());

  useFrame((state, delta) => {
    const p = progress.get();
    const ph = phaseAt(p);
    if (start.current === null) start.current = state.clock.elapsedTime;
    const intro = easeInOut(Math.min(1, (state.clock.elapsedTime - start.current) / INTRO_SECONDS));
    const t = state.clock.elapsedTime;

    // Burger: separate, reassemble, then arc into the box.
    explode.current = ph.explode;
    lid.current = ph.lid;
    const m = easeInOut(ph.toBox);
    if (anchor.current) {
      anchor.current.position.lerpVectors(HERO_POS, SLOT_POS, m);
      anchor.current.position.y += Math.sin(Math.PI * m) * 1.25 + (1 - intro) * -0.6;
      const s = lerp(1, BURGER_SCALE, m) * lerp(0.6, 1, easeOutBack(intro));
      anchor.current.scale.setScalar(s);
      anchor.current.rotation.y = (t * 0.25 + (1 - intro) * -2.6) * (1 - m) + m * Math.PI * 2;
    }

    // Pointer reaction while the burger is the star of the frame.
    pointer.current.lerp(state.pointer, 1 - Math.pow(0.001, delta));
    if (tilt.current) {
      const k = 1 - m;
      tilt.current.rotation.x = -pointer.current.y * 0.18 * k;
      tilt.current.rotation.z = -pointer.current.x * 0.08 * k;
      tilt.current.rotation.y = pointer.current.x * 0.4 * k;
    }

    // Box rises from below the frame.
    if (box.current) {
      box.current.position.y = FLOOR + lerp(-6, 0, ph.boxIn);
      box.current.visible = ph.boxIn > 0.001;
    }

    // Camera path + orbit around the box + parallax + load push-in.
    const c = cameraAt(p, cam.current);
    const aspect = size.width / size.height;
    // Narrow screens see less horizontally, so pull the camera (and the fog)
    // back to keep the burger and the box fully in frame.
    const reach = Math.max(1, 1.05 / aspect);
    for (let k = 0; k < 3; k++) c.pos[k] = c.look[k] + (c.pos[k] - c.look[k]) * reach;
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = FOG_NEAR * reach;
      scene.fog.far = FOG_FAR * reach;
    }
    // Opening frame leaves room for the headline: burger sits right on wide
    // screens and high on tall ones, then drifts to centre as the story starts.
    const settle = 1 - smooth(range(p, 0.03, 0.16));
    const frameX = aspect > 1.15 ? -1.0 * settle : 0;
    const frameY = aspect < 0.85 ? -1.3 * settle : 0;
    c.pos[0] += frameX;
    c.look[0] += frameX;
    c.pos[1] += frameY;
    c.look[1] += frameY;
    look.current.set(c.look[0], c.look[1], c.look[2]);
    const a = orbitAngle(ph);
    const dx = c.pos[0] - look.current.x;
    const dz = c.pos[2] - look.current.z;
    camera.position.set(
      look.current.x + dx * Math.cos(a) + dz * Math.sin(a) + pointer.current.x * 0.22,
      c.pos[1] + pointer.current.y * 0.12 + (1 - intro) * 0.4,
      look.current.z - dx * Math.sin(a) + dz * Math.cos(a) + (1 - intro) * 3.8,
    );
    camera.lookAt(look.current);

    if (key.current) key.current.intensity = lerp(0, 4.2, intro);

    if (dof.current?.target) {
      focus.current.set(0, ph.explode * 1.2, 0).lerp(BOX_CENTER, m);
      dof.current.target.copy(focus.current);
    }
  });

  const high = quality === "high";

  return (
    <>
      <color attach="background" args={["#0a0807"]} />
      <fog attach="fog" args={["#0a0807", FOG_NEAR, FOG_FAR]} />

      <ambientLight intensity={0.12} color="#ffcfa3" />
      <spotLight
        ref={key}
        position={[3.5, 7, 4.5]}
        angle={0.42}
        penumbra={0.9}
        decay={0}
        color="#ffd6ad"
        castShadow
        shadow-mapSize={[high ? 2048 : 1024, high ? 2048 : 1024]}
        shadow-bias={-0.0004}
      />
      <spotLight position={[-4.5, 3.5, -5]} angle={0.5} penumbra={1} decay={0} intensity={2.8} color="#ff6a1a" />
      <spotLight position={[4, 1.5, -4]} angle={0.5} penumbra={1} decay={0} intensity={1.8} color="#ff9a3c" />
      <directionalLight position={[-5, 2, 4]} intensity={0.25} color="#b7c4ff" />

      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#ffd2a0" position={[0, 5, 3]} scale={[8, 3, 1]} rotation-x={Math.PI / 2.4} />
        <Lightformer form="rect" intensity={3} color="#ff7a2a" position={[-6, 1, -2]} scale={[2, 6, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[6, 2, 1]} scale={[2, 4, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer form="ring" intensity={0.7} color="#ffb070" position={[0, 2, 6]} scale={3} />
      </Environment>

      <group ref={anchor}>
        <group ref={tilt}>
          <Burger stack={HERO_STACK} explode={explode} quality={quality} explodeAnchor={0.1} />
        </group>
      </group>

      <group ref={box}>
        <SelfBox lid={lid} quality={quality} />
      </group>

      <Embers count={high ? 160 : 70} floor={FLOOR} />

      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} position-y={FLOOR - 0.001} receiveShadow>
        <circleGeometry args={[14, 64]} />
        {high ? (
          <MeshReflectorMaterial
            resolution={1024}
            blur={[400, 120]}
            mixBlur={1.2}
            mixStrength={1.4}
            roughness={0.9}
            depthScale={0.8}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
            color="#0d0a08"
            metalness={0.4}
            mirror={0.35}
          />
        ) : (
          <meshStandardMaterial color="#0d0a08" roughness={0.85} />
        )}
      </mesh>
      {!high && <ContactShadows position-y={FLOOR + 0.002} opacity={0.7} scale={10} blur={2.4} far={3} />}

      {high && (
        <EffectComposer multisampling={4}>
          <DepthOfField ref={dof} target={[0, 0, 0]} worldFocusRange={3.2} bokehScale={3.2} />
          <Bloom intensity={0.22} luminanceThreshold={0.96} luminanceSmoothing={0.1} mipmapBlur />
          <Vignette offset={0.25} darkness={0.75} />
        </EffectComposer>
      )}
    </>
  );
}

export default function HeroScene({
  progress,
  quality,
  active,
}: {
  progress: MotionValue<number>;
  quality: Quality;
  active: boolean;
}) {
  return (
    <Canvas
      shadows
      dpr={quality === "high" ? [1, 1.75] : [1, 1.5]}
      frameloop={active ? "always" : "never"}
      camera={{ fov: 32, near: 0.1, far: 60, position: [0, 0.5, 9] }}
      gl={{ antialias: quality === "low", powerPreference: "high-performance" }}
      aria-hidden
    >
      <Suspense fallback={null}>
        <Rig progress={progress} quality={quality} />
      </Suspense>
    </Canvas>
  );
}

