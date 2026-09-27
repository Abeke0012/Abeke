import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { P } from "./timeline.js";
import { readScroll } from "./driver.js";
import Overlays, { updateOverlays } from "./Overlays.jsx";
import CameraRig from "./scene/CameraRig.jsx";
import Figure from "./scene/Figure.jsx";
import Lattice from "./scene/Lattice.jsx";
import Room from "./scene/Room.jsx";
import Strands from "./scene/Strands.jsx";
import Effects from "./scene/Effects.jsx";

// Runs first every frame: p is read once and every later useFrame sees the same value.
function Driver() {
  useFrame(() => updateOverlays(readScroll()), -2);
  return null;
}

export default function App() {
  return (
    <main className="track">
      <div className="stage">
        <Canvas
          dpr={P.mobile ? 1 : 1.5}
          gl={{ antialias: false, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
          camera={{ fov: 50, near: 0.1, far: 400, position: [0, 9.6, 27] }}
        >
          <Driver />
          <CameraRig />
          <Figure />
          <Lattice />
          <Room />
          <Strands />
          <Effects />
        </Canvas>
        <Overlays />
      </div>
    </main>
  );
}
