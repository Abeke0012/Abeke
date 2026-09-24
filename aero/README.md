# Aero® — scroll-driven hero

Single-file (`index.html`) vanilla HTML/CSS/JS page served with Vite.

```bash
npm install
npm run dev      # dev server
npm run build    # outputs dist/
```

Before deploying, replace the two video placeholders in `index.html`:

- `[ЗАМЕНИТЕ_НА_ВАШУ_ССЫЛКУ_НА_ВИДЕО_1]` — video 1 (scrubbed first)
- `[ЗАМЕНИТЕ_НА_ВАШУ_ССЫЛКУ_НА_ВИДЕО_2]` — video 2 (scrubbed after the crossfade)

For smooth scrubbing, encode videos with frequent keyframes (e.g. `ffmpeg -i in.mp4 -c:v libx264 -g 5 -movflags +faststart out.mp4`) and host them on a server that supports HTTP range requests.

Press **G** to toggle the 12-column dev grid overlay.
