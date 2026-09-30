"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { rng } from "./textures";

let sprite: THREE.Texture | null = null;
function emberSprite() {
  if (sprite) return sprite;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,240,210,1)");
  grad.addColorStop(0.25, "rgba(255,150,60,0.85)");
  grad.addColorStop(1, "rgba(255,80,20,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  sprite = new THREE.CanvasTexture(c);
  sprite.colorSpace = THREE.SRGBColorSpace;
  return sprite;
}

/** Glowing embers drifting up from the grill below, swaying and flickering out as they rise. */
export default function Embers({ count = 140, floor = -1.4, height = 6.5, radius = 4.5 }) {
  const points = useRef<THREE.Points>(null);
  const { geometry, seeds } = useMemo(() => {
    const r = rng(7);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const seeds = Array.from({ length: count }, () => ({
      x: (r() - 0.5) * 2 * radius,
      z: (r() - 0.5) * radius - 0.5,
      speed: 0.25 + r() * 0.55,
      phase: r() * 10,
      sway: 0.15 + r() * 0.35,
      heat: r(),
    }));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return { geometry, seeds };
  }, [count, radius]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const col = geometry.attributes.color as THREE.BufferAttribute;
    const hot = new THREE.Color("#ffd08a");
    const cold = new THREE.Color("#ff3d10");
    const c = new THREE.Color();
    seeds.forEach((s, i) => {
      const life = (t * s.speed * 0.25 + s.phase) % 1;
      const y = floor + life * height;
      pos.setXYZ(i, s.x + Math.sin(t * 0.9 + s.phase) * s.sway * life, y, s.z + Math.cos(t * 0.7 + s.phase) * s.sway * 0.5);
      const flicker = 0.7 + 0.3 * Math.sin(t * 9 + s.phase * 13);
      const fade = Math.sin(Math.PI * life) * flicker;
      c.copy(cold).lerp(hot, s.heat * (1 - life)).multiplyScalar(fade);
      col.setXYZ(i, c.r, c.g, c.b);
    });
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false} renderOrder={30}>
      <pointsMaterial
        map={emberSprite()}
        size={0.11}
        sizeAttenuation
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        fog={false}
      />
    </points>
  );
}
