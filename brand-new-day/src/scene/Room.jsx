import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { P, ROOM, vis } from "../timeline.js";
import { ROLE } from "../palette.js";

// Three nested wireframe cylinders; the camera flies down their shared axis. No ground plane —
// fog carries the floor — and one thin horizon bar at the far end.
function shell(r, len, n, ringStep) {
  const v = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r; v.push(x, -len / 2, z, x, len / 2, z); }
  for (let y = -len / 2; y <= len / 2 + 1e-6; y += ringStep)
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      v.push(Math.cos(a0) * r, y, Math.sin(a0) * r, Math.cos(a1) * r, y, Math.sin(a1) * r);
    }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.rotateX(Math.PI / 2); // axis now runs along Z; the drift below spins about that axis
  return g;
}

export default function Room() {
  const group = useRef(), shells = useRef([]), bar = useRef();
  const geos = useMemo(() => ROOM.radii.map((r, i) => shell(r, ROOM.length, [40, 56, 72][i], [5, 7, 9.5][i])), []);
  const mats = useMemo(() => ROOM.radii.map(() => new THREE.LineBasicMaterial({ color: ROLE.room, transparent: true, opacity: 0.22, depthWrite: false, fog: true })), []);
  const barMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(ROLE.room).multiplyScalar(2.2), transparent: true, depthWrite: false, fog: false }), []);

  useFrame(() => {
    const v = vis.room(P.sp);
    group.current.visible = v > 0.005;
    if (!group.current.visible) return;
    // Drift is a function of scroll, not the clock: the far shell counter-rotates.
    shells.current.forEach((m, i) => { m.rotation.z = ROOM.drift[i] * P.sp * 60; mats[i].opacity = 0.22 * v; });
    barMat.opacity = v;
  });

  return (
    <group ref={group} position={[0, ROOM.y, ROOM.z0 - ROOM.length / 2]}>
      {geos.map((g, i) => <lineSegments key={i} ref={(m) => (shells.current[i] = m)} geometry={g} material={mats[i]} frustumCulled={false} />)}
      <mesh ref={bar} position={[0, -0.6, -ROOM.length / 2 - 12]} material={barMat}><planeGeometry args={[600, 0.07]} /></mesh>
    </group>
  );
}
