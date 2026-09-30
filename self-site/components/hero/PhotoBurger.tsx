"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Burger made from real photo cut-outs (public/images/layers). Each layer is a
 * flat photo that always faces the camera; the layers separate and come back
 * together on the same `explode` value as the 3D burger.
 *
 * Coordinates are in pixels of the source photo (413×484) where the layers
 * were shot already apart, which gives the exploded layout for free.
 */
type PhotoLayer = {
  file: string;
  label: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** How far (source px) the layer settles into the one below when assembled. */
  sink: number;
  /** Draw order: lettuce goes behind cheese and tomato so their edges show, like in a real burger. */
  order: number;
};

/** Bottom to top. */
export const PHOTO_LAYERS: PhotoLayer[] = [
  { file: "bottomBun", label: "Нижняя булочка", x0: 101, x1: 315, y0: 370, y1: 468, sink: 0, order: 0 },
  { file: "patty", label: "Говяжья котлета", x0: 101, x1: 312, y0: 309, y1: 370, sink: 68, order: 1 },
  { file: "cheese", label: "Сыр", x0: 123, x1: 283, y0: 263, y1: 309, sink: 40, order: 3 },
  { file: "tomato", label: "Помидор", x0: 130, x1: 283, y0: 213, y1: 263, sink: 36, order: 4 },
  { file: "redOnion", label: "Красный лук", x0: 141, x1: 280, y0: 196, y1: 213, sink: 14, order: 5 },
  { file: "lettuce", label: "Салат", x0: 117, x1: 299, y0: 90, y1: 196, sink: 78, order: 2 },
  { file: "topBun", label: "Верхняя булочка с кунжутом", x0: 99, x1: 315, y0: 18, y1: 90, sink: 66, order: 6 },
];

const CENTER_X = 207;
/** Scene units per source pixel: the bun (~215 px) becomes ~2.1 units wide. */
const UNIT = 2.1 / 215;
const STAGGER = 0.09;

/** Assembled layout: each layer's bottom edge, stacked with its sink. */
function layout() {
  let top = 0;
  return PHOTO_LAYERS.map((l, i) => {
    const h = (l.y1 - l.y0) * UNIT;
    const bottom = i === 0 ? 0 : top - l.sink * UNIT;
    top = bottom + h;
    return { h, w: (l.x1 - l.x0) * UNIT, assembled: bottom + h / 2, x: ((l.x0 + l.x1) / 2 - CENTER_X) * UNIT };
  });
}
const LAYOUT = layout();
export const PHOTO_HEIGHT = Math.max(...LAYOUT.map((l) => l.assembled + l.h / 2));

/** Exploded layout straight from the photo, lifted so the bottom bun stays put. */
const EXPLODED = PHOTO_LAYERS.map((l, i) => {
  const photoCenter = (468 - (l.y0 + l.y1) / 2) * UNIT;
  return LAYOUT[0].assembled + (photoCenter - (468 - (PHOTO_LAYERS[0].y0 + PHOTO_LAYERS[0].y1) / 2) * UNIT) * 1.12 + i * 0.02;
});

export default function PhotoBurger({ explode, opacity }: { explode: { current: number }; opacity: { current: number } }) {
  const textures = useTexture(PHOTO_LAYERS.map((l) => `images/layers/${l.file}.webp`));
  const materials = useMemo(
    () =>
      textures.map((t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
      }),
    [textures],
  );
  const plane = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const face = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const parentQ = useMemo(() => new THREE.Quaternion(), []);

  useFrame(({ camera, clock }) => {
    const g = face.current;
    if (!g || !g.parent) return;
    // Face the camera whatever the parent is doing (spin, tilt).
    g.parent.getWorldQuaternion(parentQ);
    g.quaternion.copy(parentQ.invert().multiply(camera.quaternion));

    const e = explode.current;
    const t = clock.elapsedTime;
    const n = PHOTO_LAYERS.length;
    const span = 1 - (n - 1) * STAGGER;
    const o = opacity.current;
    g.visible = o > 0.01;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const raw = Math.min(1, Math.max(0, (e - i * STAGGER) / span));
      const k = raw * raw * (3 - 2 * raw);
      const L = LAYOUT[i];
      m.position.set(L.x + Math.sin(i * 2.1) * 0.1 * k, THREE.MathUtils.lerp(L.assembled, EXPLODED[i], k) + Math.sin(t * 1.3 + i * 1.7) * 0.03 * k, PHOTO_LAYERS[i].order * 0.004);
      m.rotation.z = Math.sin(i * 1.9) * 0.08 * k + Math.sin(t * 0.8 + i) * 0.02 * k;
      const s = 1 + 0.04 * k;
      m.scale.set(L.w * s, L.h * s, 1);
      materials[i].opacity = o;
    });
  });

  return (
    <group ref={face}>
      {PHOTO_LAYERS.map((l, i) => (
        <mesh key={l.file} ref={(el) => void (refs.current[i] = el)} geometry={plane} material={materials[i]} renderOrder={10 + l.order} />
      ))}
    </group>
  );
}
