import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { P, pose } from "../timeline.js";
import { ROLE } from "../palette.js";

/** Reads P, writes the camera. Nothing is smoothed here: the pose IS the function of p. */
export default function CameraRig() {
  const { camera, scene, size } = useThree();
  const pz = useMemo(() => ({ pos: [0, 0, 0], look: [0, 0, 0], up: [0, 1, 0], fogFar: 170 }), []);
  useEffect(() => {
    camera.rotation.order = "YXZ";
    scene.background = new THREE.Color(ROLE.field);
    scene.fog = new THREE.Fog(ROLE.field, 16, 170);
  }, [camera, scene]);
  // Portrait screens: widen the vertical FOV so the horizontal half-angle never drops under ~21°,
  // which keeps every strand anchor (≈14.7° off axis) in frame. Depends on the viewport, not on p.
  useEffect(() => {
    const aspect = size.width / size.height;
    camera.fov = Math.max(50, (2 * Math.atan(Math.tan((21 * Math.PI) / 180) / aspect) * 180) / Math.PI);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  useFrame(() => {
    pose(P.sp, P.p, P.reduced, pz);
    camera.position.fromArray(pz.pos);
    camera.up.fromArray(pz.up);
    camera.lookAt(pz.look[0], pz.look[1], pz.look[2]);
    scene.fog.far = pz.fogFar;
    scene.fog.near = Math.min(16, pz.fogFar * 0.4);
    if (import.meta.env.DEV) window.__cam = [...pz.pos, ...pz.up];
  }, -1);
  return null;
}
