# VANGUARD — assets

Drop the files below into this folder with exactly these names. Until a file is here the page shows a thin
accent banner (`// ASSET MISSING — assets/<name>`) and a dark accent-glow fallback, so it always works.

The media is shown colour-true: the page only adds film grain, a vignette and the HUD on top.

| File | What it is | Your prompt |
|---|---|---|
| `hero-halcyon.jpg` | Chapter 1 poster + roster card | "Live-action film still of an original superhero 'Halcyon'…" (graphite armour, helmet under arm, subject right third) |
| `halcyon.mp4` | Chapter 1, first half | "…slowly turns his head toward camera and exhales, the teal chest core pulses…" |
| `halcyon-flight.mp4` | Chapter 1, second half (crossfade at 55%) | "…drops from above and lands in a crouch on a smoky red-lit concrete platform…" |
| `smoke-wipe.mp4` | Transition 1 → 2 (blended with `screen`, so black = transparent) | "Thick white smoke rolls across the frame… then clears to black" |
| `hero-stratos.jpg` | Chapter 2 poster + roster card | "Live-action film still of an original superhero 'Stratos', the storm warden…" |
| `stratos.mp4` | Chapter 2 | "…raises the crystal glaive in pouring rain, violet lightning strikes it…" |
| `hero-wraith.jpg` | Chapter 3 poster + roster card | "Live-action film still of an original superhero 'Wraith'…" (rooftop ledge, rain) |
| `wraith.mp4` | Chapter 3 | "…sprints and leaps between two wet rooftops…" |
| `wraith-persona.jpg` | The Dual Persona card | "Photorealistic studio portrait split down the middle…" — keep the **unmasked face on the left** and the **mask on the right**: the scanner starts on the left half and uncovers the right. A portrait crop (about 2:3) fits the card best; a 16:9 frame works too, it is cropped to the centre. |
| `theme.mp3` | Optional. Original or royalty-free track, only plays after the visitor turns sound on | — |

## Preparing the videos for scroll scrubbing

Scrubbing seeks back and forth constantly. Normal web encodes keep a full frame only every few seconds, so
seeking stutters. Re-encode every clip so each frame is a keyframe, drop the audio, and put the index up front:

```bash
ffmpeg -i halcyon-raw.mp4 -vf "scale=1920:-2" -c:v libx264 -g 1 -crf 23 -preset slow \
       -pix_fmt yuv420p -movflags +faststart -an halcyon.mp4
```

- 4–8 seconds per clip is plenty (the scroll stretches it across 400vh).
- 1920 px wide is a good ceiling; 1280 px keeps files lighter on mobile.
- Poster from the first frame, if you want the still to match the video exactly:
  `ffmpeg -i halcyon.mp4 -frames:v 1 -q:v 3 hero-halcyon.jpg`
- `smoke-wipe.mp4`: white smoke on pure black; the black drops out because the layer uses `mix-blend-mode: screen`.
