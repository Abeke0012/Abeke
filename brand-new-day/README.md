# BRAND NEW DAY

One page, one canvas: a 2200vh scroll track with a sticky stage. Scrolling flies the camera through six acts. Every scene value is a pure function of the scroll scalar `p` (`src/timeline.js`).

```
npm install
npm run dev           # dev: window.__gates, window.__overlaps, window.__P
npm run build         # dist/
npm run build:single  # dist-single/index.html, a single file that opens straight from disk
```

- `public/plate.png` is optional: a masked figure on transparent alpha. If it is missing, an original procedural figure is drawn instead.
- The six-strand web table is `WEB` in `src/timeline.js`. It drives both the strands and the camera swing.
- The post chain is bloom → vignette → OutputPass → grain (`src/scene/Effects.jsx`).
