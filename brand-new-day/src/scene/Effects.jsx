import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { VignetteShader } from "three/examples/jsm/shaders/VignetteShader.js";

// Grain runs LAST, after tone mapping, so it sits in display space like film grain on a print.
const GrainShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmount: { value: 0.055 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uAmount; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float n = h(gl_FragCoord.xy + fract(uTime * 7.31) * 811.0) - 0.5;
      c.rgb += n * uAmount * (1.0 - 0.6 * dot(c.rgb, vec3(0.333)));
      gl_FragColor = c;
    }`,
};

export default function Effects() {
  const { gl, scene, camera, size } = useThree();
  const { composer, grain } = useMemo(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));
    // Order matters: bloom (linear HDR) → vignette → OutputPass (tone map + sRGB) → grain.
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.45, 1.15);
    bloom.highPassUniforms.smoothWidth.value = 0.35;
    composer.addPass(bloom);
    const vig = new ShaderPass(VignetteShader);
    vig.uniforms.offset.value = 1.3; vig.uniforms.darkness.value = 1.0;
    composer.addPass(vig);
    composer.addPass(new OutputPass());
    const grain = new ShaderPass(GrainShader);
    composer.addPass(grain);
    return { composer, grain };
  }, [gl, scene, camera]);
  useEffect(() => { composer.setPixelRatio(gl.getPixelRatio()); composer.setSize(size.width, size.height); }, [composer, gl, size]);
  useEffect(() => () => composer.dispose(), [composer]);
  useFrame(({ clock }) => { grain.uniforms.uTime.value = clock.elapsedTime; composer.render(); }, 1);
  return null;
}
