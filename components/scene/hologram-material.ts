import * as THREE from "three";

/**
 * Shared uniforms: one `useFrame` updates time + laser position and every
 * hologram material in the scene picks it up for free.
 */
export const hologramUniforms = {
  uTime: { value: 0 },
  uScanY: { value: 0 },
  uColor: { value: new THREE.Color("#00FF66") },
};

const vertexShader = /* glsl */ `
  uniform float uPointSize;
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPointSize * (6.0 / -mv.z);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uScanY;
  uniform vec3 uColor;
  uniform float uBase;
  uniform float uOpacity;
  varying vec3 vWorld;

  void main() {
    // Horizontal laser band sweeping up/down the stack.
    float d = abs(vWorld.y - uScanY);
    float band = smoothstep(0.45, 0.0, d);
    float core = smoothstep(0.05, 0.0, d);

    // Fine horizontal scan grid scrolling upward.
    float grid = step(0.92, fract(vWorld.y * 14.0 - uTime * 0.6));

    // Low-frequency holographic flicker.
    float flicker = 0.92 + 0.08 * sin(uTime * 23.0 + vWorld.y * 4.0);

    float alpha = (uBase + band * 0.75 + core + grid * 0.18) * flicker * uOpacity;
    vec3 col = uColor * (0.55 + band * 1.2) + vec3(core * 0.6);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

interface HologramOptions {
  wireframe?: boolean;
  base?: number;
  opacity?: number;
  pointSize?: number;
}

export function createHologramMaterial({
  wireframe = true,
  base = 0.28,
  opacity = 1,
  pointSize = 0,
}: HologramOptions = {}) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    wireframe,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      ...hologramUniforms,
      uBase: { value: base },
      uOpacity: { value: opacity },
      uPointSize: { value: pointSize },
    },
  });
}
