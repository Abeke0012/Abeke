import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { P, WEB, pose, strandT, smoothstep, clamp01, vis } from "../timeline.js";
import { ROLE } from "../palette.js";

// Strand life (t = 0..1 across its span):
//   FIRE 0–0.12 · TAUT 0.12–0.55 · RELEASE 0.55–0.80 (sag + travelling wave) · FADE 0.80–1
const FIRE = 0.12, TAUT = 0.55, REL = 0.8;
const BONE = new THREE.Color(ROLE.strand).multiplyScalar(1.25);
const HOT = new THREE.Color(ROLE.figureHot).multiplyScalar(1.7);
const HOT_BONE = new THREE.Color(ROLE.strand).multiplyScalar(2.1);

// The strand leaves from just under and beside the camera.
function origin(sp, p, side, pz, out) {
  pose(sp, p, P.reduced, pz);
  const f = new THREE.Vector3(pz.look[0] - pz.pos[0], pz.look[1] - pz.pos[1], pz.look[2] - pz.pos[2]).normalize();
  const up = new THREE.Vector3().fromArray(pz.up);
  const right = new THREE.Vector3().crossVectors(f, up).normalize();
  out.set(pz.pos[0], pz.pos[1], pz.pos[2]).addScaledVector(up, -1.4).addScaledVector(right, 0.7 * side).addScaledVector(f, 0.8);
  return out;
}

export default function Strands() {
  const size = useThree((s) => s.size);
  const SEG = P.mobile ? 22 : 56;   // fewer segments on mobile, never fewer strands
  const N = WEB.length * SEG;
  const { line, mat, posArr, colArr, geo } = useMemo(() => {
    const geo = new LineSegmentsGeometry();
    const posArr = new Float32Array(N * 6), colArr = new Float32Array(N * 6);
    geo.setPositions(posArr); geo.setColors(colArr);
    const mat = new LineMaterial({ linewidth: 2.4, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, worldUnits: false, fog: false });
    const line = new LineSegments2(geo, mat); line.frustumCulled = false; line.renderOrder = 5;
    // Keep the arrays setPositions/setColors wrapped: we write into them in place every frame.
    return { line, mat, geo, posArr: geo.attributes.instanceStart.data.array, colArr: geo.attributes.instanceColorStart.data.array };
  }, [N]);
  useEffect(() => { mat.resolution.set(size.width, size.height); }, [size, mat]);

  const tmp = useMemo(() => ({ pz: { pos: [0, 0, 0], look: [0, 0, 0], up: [0, 1, 0] }, O: new THREE.Vector3(), A: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), lat: new THREE.Vector3(), c: new THREE.Color(), h: new THREE.Color() }), []);

  useFrame(() => {
    const { sp, p } = P;
    const room = vis.room(sp);
    for (let w = 0; w < WEB.length; w++) {
      const S = WEB[w], t = strandT(S, sp), base = w * SEG * 6;
      const alive = t > 0 && t < 1;
      if (!alive) { posArr.fill(0, base, base + SEG * 6); colArr.fill(0, base, base + SEG * 6); continue; }
      const { O, A, lat, c } = tmp;
      A.fromArray(S.anchor);
      // Until release the origin rides with the camera; after release it is pinned where the camera let go.
      const tRel = Math.min(t, TAUT);
      origin(S.at + tRel * S.span, p, S.side, tmp.pz, O);
      const reach = t < FIRE ? 1 - Math.pow(1 - t / FIRE, 3) : 1;
      const rel = clamp01((t - TAUT) / (REL - TAUT));
      const alpha = smoothstep(0, 0.04, t) * (1 - smoothstep(REL, 1, t));
      lat.set(A.z - O.z, 0, O.x - A.x).normalize();
      // After release: the free end drops and swings back; the anchor end stays put.
      O.y -= 7 * rel * rel; O.addScaledVector(lat, -S.side * 2.2 * rel);
      const taut = t < TAUT ? Math.sin(t * 90) * 0.04 * (1 - clamp01((t - FIRE) / 0.2)) : 0;
      // The impulse is scarlet — except inside the room, where it is a hot bone-white, so scarlet and
      // cobalt never share a frame.
      const hot = tmp.h.copy(HOT).lerp(HOT_BONE, room);
      const pt = (s, out) => {
        // s: 0 at the anchor, 1 at the (camera) end. Drawing grows from the camera end during FIRE.
        const q = 1 - (1 - s) * reach;                     // param along O→A actually drawn
        out.lerpVectors(O, A, 1 - q < 0 ? 0 : 1 - q);
        const env = Math.sin(Math.PI * (1 - q));           // zero at both ends
        out.y -= env * (0.2 + 3.2 * rel);                   // sag
        const wave = Math.sin((1 - q) * 14 - rel * 22) * 0.9 * rel * (1 - (1 - q)) * env;
        out.addScaledVector(lat, wave + taut * env);
        return out;
      };
      for (let i = 0; i < SEG; i++) {
        const s0 = 1 - i / SEG, s1 = 1 - (i + 1) / SEG;   // walk from the camera end to the anchor
        pt(s0, tmp.a); pt(s1, tmp.b);
        const o = base + i * 6;
        posArr[o] = tmp.a.x; posArr[o + 1] = tmp.a.y; posArr[o + 2] = tmp.a.z;
        posArr[o + 3] = tmp.b.x; posArr[o + 4] = tmp.b.y; posArr[o + 5] = tmp.b.z;
        // Firing edge: an impulse at the growing tip (the anchor end while firing), mixed not added.
        for (let e = 0; e < 2; e++) {
          const s = e ? s1 : s0;
          const edge = t < FIRE + 0.08 ? Math.exp(-Math.pow((s - 0) / 0.08, 2)) * (1 - smoothstep(FIRE, FIRE + 0.08, t)) : 0;
          const f = alpha * (0.35 + 0.65 * (1 - s * 0.6));   // fades carried in the vertex colour
          c.copy(BONE).lerp(hot, edge);
          colArr[o + e * 3] = c.r * f; colArr[o + e * 3 + 1] = c.g * f; colArr[o + e * 3 + 2] = c.b * f;
        }
      }
    }
    geo.attributes.instanceStart.data.needsUpdate = true;
    geo.attributes.instanceColorStart.data.needsUpdate = true;
    if (import.meta.env.DEV) window.__strands = posArr;
  });

  return <primitive object={line} />;
}
