# CYBER-BITE // Menu Matrix

Holographic 3D menu dashboard for the CYBER-BITE dark kitchen. Built with Next.js (App Router), Tailwind CSS v4 and React Three Fiber.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
npm run lint    # type-check
```

## Layout

| Area | Path |
| --- | --- |
| Unified state machine (load, protocols, viewport power, checkout, audio) | `lib/menu-machine.ts` |
| Config → burger layer stack | `lib/stack-layout.ts` |
| 3D inspection matrix (60vw, fixed) | `components/InspectionViewport.tsx`, `components/scene/*` |
| Laser-scan hologram shader | `components/scene/hologram-material.ts` |
| Tactical control panel (40vw, scrollable) | `components/Dashboard.tsx`, `components/panel/*` |
| Glitch scramble hook (150ms interval loop) | `hooks/useGlitchText.ts` |
| Simulated diagnostics feed | `hooks/useDiagnostics.ts` |
| Sound-effect placeholders (WebAudio blips) | `lib/sfx.ts` |

Below 1024px the layout collapses into a mobile HUD. The WebGL scene is neither downloaded nor rendered until **ACTIVATE 3D VIEW** is pressed, and powering it down unmounts the canvas.
