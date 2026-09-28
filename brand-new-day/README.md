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

## Real photo for the figure

Beads are sampled from a real photo, which keeps its original colours. The first source found wins:
1. **On the page:** the camera button (top left), or drag a photo onto the page. This also works in the single file opened from disk. The photo is remembered in the browser; right-click the button to reset.
2. **`src/assets/plate.jpg|png|webp`:** built into the bundle, and inlined into `dist-single/index.html`.
3. **`public/plate.png`**
4. Otherwise, the built-in drawn figure.

A photo without transparency is cut out automatically. Background is read from the top edge and the upper part of the sides, so the best results come from a full-height person on a plain or blurred background. A PNG with an already-removed background is ideal.
