# CHRONO-MATRIX — Caliber 01

A single page in vanilla HTML/CSS/JS, served by Vite. No frameworks and no animation libraries.

```
npm install
npm run dev           # local
npm run build         # dist/
npm run build:single  # dist-single/index.html, one file that opens straight from disk
```

- **Engine:** `src/main.js`. One `requestAnimationFrame` loop. `currentScroll` LERPs toward `scrollY` with a factor of 0.07, corrected for frame time. Every transform is derived from that value.
- **Parts:** `src/svg.js`. Gears, the four chassis layers (mainplate, rotor, tourbillon cage and balance, dial and hands, bezel and sapphire) and the blueprint are all generated vectors.
- **Timeline:** the 1600vh hero is split into four equal phases of its scroll run: 0–25% caliber, 25–50% anatomy, 50–75% macro, 75–100% spec.
- Press **G** for the calibration matrix.
