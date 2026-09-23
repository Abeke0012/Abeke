# SELF BURGERS — Built like SELF.

Single-page scroll story + menu. Plain HTML/CSS/JS in `index.html`, served by Vite.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/
```

## Assets

Drop your files here (paths are set in `CONFIG` at the top of the script in `index.html`):

| CONFIG key | Default path |
|---|---|
| `videos[0]` (VIDEO_1_URL) | `public/videos/hero.mp4` |
| `videos[1]` (VIDEO_2_URL) | `public/videos/explode.mp4` |
| `videos[2]` (VIDEO_3_URL) | `public/videos/combo.mp4` |
| `videos[3]` (VIDEO_4_URL) | `public/videos/box.mp4` |
| `lineup.burgers[0..2].img` (IMG_1–3) | `public/images/burger-1.jpg` … `burger-3.jpg` |
| `lineup.sides[0..2].img` (IMG_4–6) | `public/images/fries.jpg`, `loaded-fries.jpg`, `shakes.jpg` |

You can also open `index.html` straight from disk: put `videos/` and `images/` folders next to it.
If a video is missing, a red notice on the page names the file and the path it was looked for.

Missing images fall back to a dark gradient with an emoji.

For smooth scrubbing, encode the videos with frequent keyframes, e.g.
`ffmpeg -i in.mp4 -an -c:v libx264 -g 1 -crf 22 -movflags +faststart out.mp4`.

Press **G** to toggle the 12-column grid overlay.
