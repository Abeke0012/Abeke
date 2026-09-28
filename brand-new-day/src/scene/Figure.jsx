import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { P, vis } from "../timeline.js";
import { loadPlate, sampleFigure } from "./plate.js";

const COUNT = 40000;

/** 40,000 beads sampled from the plate. Shade is baked into instanceColor once; nothing per-bead per-frame. */
export default function Figure() {
  const [beads, setBeads] = useState(null);
  const group = useRef(), mesh = useRef();
  const geo = useMemo(() => new THREE.SphereGeometry(0.5, 8, 6), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 1, fog: true }), []);

  useEffect(() => {
    let live = true;
    loadPlate().then(({ img, photo }) => live && setBeads(sampleFigure(img, COUNT, { photo })));
    // A photo picked or dropped on the page re-bakes the beads once. Nothing here runs per frame.
    const onPlate = (e) => setBeads(sampleFigure(e.detail.img, COUNT, { photo: e.detail.photo }));
    window.addEventListener("bnd:plate", onPlate);
    return () => { live = false; window.removeEventListener("bnd:plate", onPlate); };
  }, []);

  useEffect(() => {
    const m = mesh.current; if (!m || !beads) return;
    const o = new THREE.Object3D(), c = new THREE.Color();
    for (let i = 0; i < beads.count; i++) {
      o.position.fromArray(beads.pos, i * 3); o.scale.setScalar(beads.scl[i]); o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.fromArray(beads.col, i * 3));
    }
    m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    if (import.meta.env.DEV) window.__beads = m;
  }, [beads]);

  useFrame(({ clock }) => {
    const g = group.current; if (!g) return;
    const a = vis.figureA(P.sp), b = vis.figureB(P.sp);
    const v = Math.max(a, b);
    g.visible = v > 0.005;
    if (!g.visible) return;
    mat.opacity = v; mat.depthWrite = v > 0.98;
    const at = vis.figureAt(P.sp);
    // Idle float + cursor tilt. The group sits AT the figure centre and the beads are local offsets,
    // so the tilt pivots about the centre (pivot compensation) rather than the feet.
    const t = clock.elapsedTime;
    g.position.set(at[0], at[1] + Math.sin(t * 0.9) * 0.18, at[2]);
    g.rotation.set(-P.my * 0.12 + Math.sin(t * 0.6) * 0.015, P.mx * 0.28, Math.sin(t * 0.5) * 0.01);
  });

  return (
    <group ref={group}>
      {beads && <instancedMesh ref={mesh} args={[geo, mat, beads.count]} frustumCulled={false} />}
    </group>
  );
}
