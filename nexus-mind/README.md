# NEXUS-MIND — Procedural Matrix

A single page built in vanilla HTML/CSS/JS around a Canvas 2D particle engine. It uses no third-party runtime code.

```
npm install
npm run dev     # local
npm run build   # dist/index.html: everything (CSS + JS) compiled into one file
```

- **`src/engine.js`:** the `Particle` and `Engine` classes.
  - All 400 particles are pooled at boot, and the hot loop allocates nothing.
  - Style strings, the glow sprite and the scan band are pre-built.
  - Links use a spatial hash and batched strokes.
- **`src/main.js`:** one RAF loop.
  - Scroll uses LERP 0.06 on a proxy scroller, corrected for frame time.
  - Scroll velocity and acceleration feed the engine.
  - The UI phases and the dev console run in the same loop.
- **Phases** (fractions of the 1800vh run):

  | Range | Phase |
  |---|---|
  | 0–4/18 | Constellation |
  | 4/18–9/18 | Vortex (spin bound to scroll speed, radius breathes with scroll acceleration) |
  | 9/18–14/18 | Volumetric mesh (hover to scan) |
  | 14/18–1 | Starfield + core interface |

- **Mouse field:** a slow cursor attracts particles and a fast cursor repels them, within a 150px radius. Particles spring back to their targets.
- **Mobile (≤768px):** 120 particles, no mouse vectors, DPR capped at 1.5.
- Press **H** for the canvas console.
