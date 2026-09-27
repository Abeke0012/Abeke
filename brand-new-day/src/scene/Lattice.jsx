import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { P, vis } from "../timeline.js";
import { ROLE } from "../palette.js";

// A cage around the figure. Non-indexed segments; both vertices of a segment share one random value,
// and each vertex knows which end it is. A segment draws from its start as the build scalar passes
// its staggered threshold, so one scalar weaves the cage and the same scalar un-weaves it.
function cage() {
  const P0 = [], P1 = [], R = [], E = [];
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const seg = (a, b) => { const r = rnd(); P0.push(...a, ...a); P1.push(...a, ...b); R.push(r, r); E.push(0, 1); };
  const N = 28, rad = 5.4, y0 = -8, y1 = 8, rings = 9;
  const pt = (i, y, r = rad) => { const a = (i / N) * Math.PI * 2; return [Math.cos(a) * r, y, Math.sin(a) * r]; };
  for (let k = 0; k < rings; k++) {
    const y = y0 + ((y1 - y0) * k) / (rings - 1);
    const r = rad * (1 - 0.18 * Math.pow((y / 8), 2));
    for (let i = 0; i < N; i++) seg(pt(i, y, r), pt(i + 1, y, r));
    if (k < rings - 1) {
      const yn = y0 + ((y1 - y0) * (k + 1)) / (rings - 1), rn = rad * (1 - 0.18 * Math.pow(yn / 8, 2));
      for (let i = 0; i < N; i++) { seg(pt(i, y, r), pt(i, yn, rn)); if ((i + k) % 2 === 0) seg(pt(i, y, r), pt(i + 1, yn, rn)); else seg(pt(i + 1, y, r), pt(i, yn, rn)); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P1, 3));
  g.setAttribute("aStart", new THREE.Float32BufferAttribute(P0, 3));
  g.setAttribute("aRand", new THREE.Float32BufferAttribute(R, 1));
  g.setAttribute("aEnd", new THREE.Float32BufferAttribute(E, 1));
  return g;
}

export default function Lattice() {
  const ref = useRef();
  const geo = useMemo(cage, []);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true, blending: THREE.AdditiveBlending,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uBuild: { value: 0 }, uColor: { value: new THREE.Color(ROLE.lattice) } }]),
    vertexShader: /* glsl */`
      attribute vec3 aStart; attribute float aRand; attribute float aEnd;
      uniform float uBuild; varying float vOn;
      #include <fog_pars_vertex>
      void main(){
        float th = aRand * 0.72;
        float k = clamp((uBuild - th) / 0.28, 0.0, 1.0);
        vec3 p = mix(aStart, position, aEnd * k);
        vOn = step(0.0001, k);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; varying float vOn;
      #include <fog_pars_fragment>
      void main(){
        if (vOn < 0.5) discard;
        gl_FragColor = vec4(uColor * 0.55, 1.0);
        #include <fog_fragment>
      }`,
  }), []);

  useFrame(() => {
    const b = vis.lattice(P.sp, P.p);
    const m = ref.current; m.visible = b > 0.001;
    mat.uniforms.uBuild.value = b;
    const at = vis.figureAt(P.sp);
    m.position.set(at[0], at[1], at[2]);
    m.rotation.y = P.sp * 3.0;
  });
  return <lineSegments ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}
