"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { loadById, PROTOCOLS, type MenuState, type ProtocolId } from "@/lib/menu-machine";
import { buildStack, type Layer, type LayerKind } from "@/lib/stack-layout";
import { createHologramMaterial, hologramUniforms } from "./hologram-material";
import {
  BACON_STRIPS,
  JALAPENO_RINGS,
  baconGeometry,
  bunBottomGeometry,
  bunTopGeometry,
  cheeseGeometry,
  jalapenoGeometry,
  lettuceGeometry,
  pattyGeometry,
  sauceGeometry,
  sesameSeedPositions,
} from "./burger-geometry";

/* ------------------------------------------------------------------ */
/* Shared GPU resources (created once, reused across remounts)         */
/* ------------------------------------------------------------------ */

let shared: ReturnType<typeof createShared> | null = null;

function createShared() {
  return {
    wire: createHologramMaterial({ wireframe: true, base: 0.3 }),
    wireDim: createHologramMaterial({ wireframe: true, base: 0.14, opacity: 0.8 }),
    fill: createHologramMaterial({ wireframe: false, base: 0.035, opacity: 0.6 }),
    geo: {
      bunBottom: bunBottomGeometry(),
      bunTop: bunTopGeometry(),
      cheese: cheeseGeometry(),
      lettuce: lettuceGeometry(),
      sauce: sauceGeometry(),
      bacon: baconGeometry(),
      jalapeno: jalapenoGeometry(),
      patties: [0, 1, 2, 3].map((i) => pattyGeometry(i)),
      seeds: sesameSeedPositions(),
    },
  };
}

function useShared() {
  if (!shared) shared = createShared();
  return shared;
}

/* ------------------------------------------------------------------ */
/* Burger parts                                                         */
/* ------------------------------------------------------------------ */

function HoloMesh({ geometry, dim = false }: { geometry: THREE.BufferGeometry; dim?: boolean }) {
  const s = useShared();
  return (
    <>
      <mesh geometry={geometry} material={s.fill} />
      <mesh geometry={geometry} material={dim ? s.wireDim : s.wire} />
    </>
  );
}

function SesameSeeds() {
  const s = useShared();
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#00FF66",
        size: 0.05,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <points material={material}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[s.geo.seeds, 3]} />
      </bufferGeometry>
    </points>
  );
}

function LayerMesh({ layer }: { layer: Layer }) {
  const s = useShared();
  const g = s.geo;
  switch (layer.kind) {
    case "bunBottom":
      return <HoloMesh geometry={g.bunBottom} />;
    case "bunTop":
      return (
        <>
          <HoloMesh geometry={g.bunTop} />
          <SesameSeeds />
        </>
      );
    case "patty": {
      const index = Number(layer.id.split("-")[1]) % g.patties.length;
      return <HoloMesh geometry={g.patties[index]} />;
    }
    case "cheese":
      return <HoloMesh geometry={g.cheese} dim />;
    case "lettuce":
      return <HoloMesh geometry={g.lettuce} dim />;
    case "sauce":
      return <HoloMesh geometry={g.sauce} dim />;
    case "bacon":
      return (
        <>
          {BACON_STRIPS.map((strip) => (
            <group key={strip.z} position={[0, 0, strip.z]} rotation={[0, strip.rot, 0]}>
              <HoloMesh geometry={g.bacon} />
            </group>
          ))}
        </>
      );
    case "jalapeno":
      return (
        <>
          {JALAPENO_RINGS.map(([x, z]) => (
            <group key={`${x}:${z}`} position={[x, 0, z]}>
              <HoloMesh geometry={g.jalapeno} />
            </group>
          ))}
        </>
      );
  }
}

/** A layer that eases toward its stack position and scales in on mount. */
function StackLayer({ layer }: { layer: Layer }) {
  const ref = useRef<THREE.Group>(null);
  const spawn = useRef(0);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const k = 1 - Math.exp(-dt * 7);
    g.position.y += (layer.y - g.position.y) * k;
    spawn.current = Math.min(1, spawn.current + dt * 2.4);
    const e = 1 - Math.pow(1 - spawn.current, 3);
    g.scale.set(0.6 + e * 0.4, e, 0.6 + e * 0.4);
  });

  // New layers drop in from above the current stack top.
  return (
    <group ref={ref} position={[0, layer.y + 1.2, 0]} scale={[0.6, 0.001, 0.6]}>
      <LayerMesh layer={layer} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Protocol bounding boxes                                              */
/* ------------------------------------------------------------------ */

const BOX_DIMS: Partial<Record<LayerKind, { w: number; d: number; h: number; rot: number; lift: number }>> = {
  cheese: { w: 3.35, d: 3.35, h: 0.34, rot: Math.PI / 4, lift: -0.06 },
  jalapeno: { w: 2.7, d: 2.4, h: 0.3, rot: 0, lift: 0 },
  bacon: { w: 3.7, d: 2.3, h: 0.3, rot: 0.08, lift: 0 },
  sauce: { w: 3.4, d: 3.4, h: 0.26, rot: 0, lift: 0 },
};

const boxFaces = new THREE.BoxGeometry(1, 1, 1);
const boxEdges = new THREE.EdgesGeometry(boxFaces);

function ProtocolBox({ layer, protocol }: { layer: Layer; protocol: ProtocolId }) {
  const dims = BOX_DIMS[layer.kind]!;
  const ref = useRef<THREE.Group>(null);
  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#00FF66",
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  const face = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#00FF66",
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      material.dispose();
      face.dispose();
    },
    [material, face],
  );

  const spec = PROTOCOLS.find((p) => p.id === protocol)!;
  const targetY = layer.y + layer.height / 2 + dims.lift;

  useFrame(({ clock }, dt) => {
    const g = ref.current;
    if (!g) return;
    g.position.y += (targetY - g.position.y) * (1 - Math.exp(-dt * 7));
    // Hard tactical flash: mostly on, with sharp blackout ticks.
    const t = clock.elapsedTime;
    const blink = Math.sin(t * 9) > -0.35 ? 1 : 0.1;
    material.opacity = blink * (0.75 + 0.25 * Math.sin(t * 31));
    face.opacity = blink * 0.07;
  });

  return (
    <group ref={ref} position={[0, targetY, 0]} rotation={[0, dims.rot, 0]}>
      <lineSegments geometry={boxEdges} material={material} scale={[dims.w, dims.h, dims.d]} />
      <lineSegments geometry={boxEdges} material={material} scale={[dims.w + 0.08, dims.h + 0.08, dims.d + 0.08]} />
      <mesh geometry={boxFaces} material={face} scale={[dims.w, dims.h, dims.d]} />
      <Html
        position={[dims.w / 2, dims.h / 2, dims.d / 2]}
        zIndexRange={[20, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div className="lock-tag">
          [{spec.code}] LOCK
        </div>
      </Html>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Scanner, environment, telemetry                                      */
/* ------------------------------------------------------------------ */

function LaserScanner({ halfHeight }: { halfHeight: number }) {
  const ring = useRef<THREE.Group>(null);
  const range = useRef(halfHeight);

  useFrame(({ clock }, dt) => {
    range.current += (halfHeight + 0.25 - range.current) * (1 - Math.exp(-dt * 4));
    const t = clock.elapsedTime;
    const y = Math.sin(t * 0.9) * range.current;
    hologramUniforms.uTime.value = t;
    hologramUniforms.uScanY.value = y;
    if (ring.current) ring.current.position.y = y;
  });

  return (
    <group ref={ring}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.05, 2.12, 96]} />
        <meshBasicMaterial color="#00FF66" transparent opacity={0.85} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.05, 64]} />
        <meshBasicMaterial color="#00FF66" transparent opacity={0.05} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.1, 4.1, 16, 16]} />
        <meshBasicMaterial color="#00FF66" wireframe transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Platform({ floorY }: { floorY: number }) {
  const spin = useRef<THREE.Mesh>(null);
  const root = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.z += dt * 0.35;
    if (root.current) root.current.position.y += (floorY - root.current.position.y) * (1 - Math.exp(-dt * 5));
  });
  return (
    <group ref={root} position={[0, floorY, 0]}>
      <gridHelper args={[26, 52, "#0d3a22", "#0a1f14"]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.9, 1.94, 96]} />
        <meshBasicMaterial color="#00FF66" transparent opacity={0.6} />
      </mesh>
      <mesh ref={spin} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[2.3, 2.45, 64, 1, 0, Math.PI * 1.4]} />
        <meshBasicMaterial color="#00FF66" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Dust() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(420 * 3);
    for (let i = 0; i < 420; i++) {
      const r = 3 + Math.random() * 7;
      const a = Math.random() * Math.PI * 2;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  }, []);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y -= dt * 0.03;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#00FF66" size={0.025} transparent opacity={0.45} depthWrite={false} />
    </points>
  );
}

export interface TelemetryRefs {
  azimuth: React.RefObject<HTMLSpanElement | null>;
  elevation: React.RefObject<HTMLSpanElement | null>;
  scan: React.RefObject<HTMLSpanElement | null>;
  fps: React.RefObject<HTMLSpanElement | null>;
}

/** Writes camera/scan telemetry straight to the DOM — no React re-renders per frame. */
function Telemetry({ refs }: { refs: TelemetryRefs }) {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const acc = useRef({ t: 0, frames: 0 });
  useFrame((_, dt) => {
    const a = acc.current;
    a.t += dt;
    a.frames++;
    if (a.t < 0.12) return;
    const fps = Math.round(a.frames / a.t);
    a.t = 0;
    a.frames = 0;
    if (controls) {
      const az = ((THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()) % 360) + 360) % 360;
      const el = 90 - THREE.MathUtils.radToDeg(controls.getPolarAngle());
      if (refs.azimuth.current) refs.azimuth.current.textContent = az.toFixed(1).padStart(5, "0") + "°";
      if (refs.elevation.current) refs.elevation.current.textContent = (el >= 0 ? "+" : "") + el.toFixed(1) + "°";
    }
    if (refs.scan.current) {
      const y = hologramUniforms.uScanY.value;
      refs.scan.current.textContent = (y >= 0 ? "+" : "") + (y * 100).toFixed(0).padStart(3, "0") + "mm";
    }
    if (refs.fps.current) refs.fps.current.textContent = String(fps).padStart(3, "0");
  });
  return null;
}

/** Pull the camera back on portrait viewports so the full stack stays in frame. */
function ResponsiveFraming() {
  const camera = useThree((s) => s.camera);
  const aspect = useThree((s) => s.size.width / s.size.height);
  useEffect(() => {
    const distance = aspect < 0.8 ? 12 : aspect < 1.2 ? 11 : 10;
    camera.position.setLength(distance);
  }, [aspect, camera]);
  return null;
}

/* ------------------------------------------------------------------ */
/* Root                                                                 */
/* ------------------------------------------------------------------ */

function Burger({ state }: { state: MenuState }) {
  const { patties } = loadById(state.load);
  const { layers, total } = useMemo(() => buildStack(patties, state.protocols), [patties, state.protocols]);

  // Squash-and-stretch pulse whenever the system load changes.
  const group = useRef<THREE.Group>(null);
  const pulse = useRef(0);
  useEffect(() => {
    pulse.current = 1;
  }, [state.load]);
  useFrame((_, dt) => {
    pulse.current = Math.max(0, pulse.current - dt * 1.6);
    const p = pulse.current;
    if (group.current) group.current.scale.y = 1 + Math.sin(p * Math.PI * 3) * 0.07 * p;
  });

  return (
    <>
      <group ref={group}>
        {layers.map((layer) => (
          <StackLayer key={layer.id} layer={layer} />
        ))}
        {layers
          .filter((l) => l.protocol)
          .map((l) => (
            <ProtocolBox key={`box-${l.id}`} layer={l} protocol={l.protocol!} />
          ))}
      </group>
      <LaserScanner halfHeight={total / 2} />
      <Platform floorY={-total / 2 - 0.9} />
    </>
  );
}

export default function BurgerScene({ state, telemetry }: { state: MenuState; telemetry: TelemetryRefs }) {
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 1.75]}
      camera={{ position: [7, 2.9, 7], fov: 38, near: 0.1, far: 80 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 9, 22]} />
      <Burger state={state} />
      <Dust />
      <OrbitControls
        makeDefault
        autoRotate
        autoRotateSpeed={1.3}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={6}
        maxDistance={16}
        minPolarAngle={Math.PI * 0.26}
        maxPolarAngle={Math.PI * 0.6}
        rotateSpeed={0.6}
      />
      <ResponsiveFraming />
      <Telemetry refs={telemetry} />
    </Canvas>
  );
}
