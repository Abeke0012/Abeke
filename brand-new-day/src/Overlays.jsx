import { useEffect, useRef } from "react";
import { P, WEB, strandT, smoothstep, clamp01 } from "./timeline.js";
import { plateFromFile, loadPlate, clearPlate, storedPlate } from "./scene/plate.js";

// DOM overlays: absolute, inset 0, pointer-events none. Each is a smoothstep window on the act axis
// and goes visibility:hidden below 0.01. Letters touch only transform / filter / opacity.
export const OV = { title: null, hold: null, let: null, dots: [], bar: null, replay: null, photo: null };

const split = (txt) => [...txt].map((ch, i) => <span key={i} className="ch">{ch === " " ? " " : ch}</span>);

/**
 * inA: arrival 0→1 (front-to-back, resolving out of blur).
 * outA: departure 0→1 (back-to-front, into blur).
 */
function letters(el, inA, outA) {
  if (!el) return;
  const v = Math.min(inA, 1 - outA);
  el.style.visibility = v < 0.01 ? "hidden" : "visible";
  if (v < 0.01) return;
  const ch = el.children, n = ch.length;
  for (let i = 0; i < n; i++) {
    const o = n > 1 ? i / (n - 1) : 0;
    const a = clamp01(inA * 1.6 - o * 0.6);            // first letter arrives first
    const d = clamp01(outA * 1.6 - (1 - o) * 0.6);     // last letter leaves first
    const z = (1 - a) * 380 - d * 520, blur = (1 - a) * 14 + d * 12, op = a * (1 - d);
    const s = ch[i].style;
    s.transform = `translate3d(0,${(d * -26).toFixed(2)}px,${z.toFixed(1)}px)`;
    s.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
    s.opacity = op.toFixed(3);
  }
}

export function updateOverlays(G) {
  const { sp, p } = P;
  // Title: present at rest, leaves as the weave begins; returns for the close on real p.
  if (sp < 0.5) letters(OV.title, 1, smoothstep(0.015, 0.1, sp));
  else letters(OV.title, smoothstep(0.86, 0.975, p), 0);
  // Phrases, repeated with each strand: HOLD ON on the catch, LET GO on the release.
  let hIn = 0, hOut = 1, lIn = 0, lOut = 1;
  for (const w of WEB) {
    const t = strandT(w, sp);
    if (t > 0.06 && t < 0.56) { hIn = smoothstep(0.08, 0.2, t); hOut = smoothstep(0.44, 0.55, t); }
    if (t > 0.54 && t < 0.86) { lIn = smoothstep(0.55, 0.64, t); lOut = smoothstep(0.74, 0.84, t); }
  }
  letters(OV.hold, hIn, hOut);
  letters(OV.let, lIn, lOut);
  const acts = [G.act1, G.act2, G.act3, G.act4, G.act5, G.act6];
  OV.dots.forEach((d, i) => d && (d.style.opacity = (0.18 + 0.82 * acts[i]).toFixed(3)));
  if (OV.bar) OV.bar.style.transform = `scaleX(${p.toFixed(4)})`;
  if (OV.photo) { const v = 1 - smoothstep(0.05, 0.1, sp); OV.photo.style.opacity = v.toFixed(3); OV.photo.style.visibility = v < 0.01 ? "hidden" : "visible"; }
  if (OV.replay) { const r = smoothstep(0.93, 0.99, p); OV.replay.style.opacity = r.toFixed(3); OV.replay.style.visibility = r < 0.01 ? "hidden" : "visible"; }
}

async function applyPhoto(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const img = await plateFromFile(file);
  if (img) window.dispatchEvent(new CustomEvent("bnd:plate", { detail: { img, photo: true } }));
}

export default function Overlays() {
  const t = useRef(), h = useRef(), l = useRef(), bar = useRef(), rp = useRef(), ph = useRef(), input = useRef(), dots = useRef([]);
  useEffect(() => { OV.title = t.current; OV.hold = h.current; OV.let = l.current; OV.bar = bar.current; OV.replay = rp.current; OV.photo = ph.current; OV.dots = dots.current; }, []);
  // Drop a photo anywhere on the page.
  useEffect(() => {
    const over = (e) => e.preventDefault();
    const drop = (e) => { e.preventDefault(); applyPhoto(e.dataTransfer?.files?.[0]); };
    window.addEventListener("dragover", over); window.addEventListener("drop", drop);
    return () => { window.removeEventListener("dragover", over); window.removeEventListener("drop", drop); };
  }, []);
  const reset = async (e) => {
    e.preventDefault(); if (!storedPlate()) return;
    clearPlate(); const r = await loadPlate(); window.dispatchEvent(new CustomEvent("bnd:plate", { detail: r }));
  };
  return (
    <div className="ov" aria-hidden="false">
      <h1 ref={t} className="title" aria-label="BRAND NEW DAY">{split("BRAND NEW DAY")}</h1>
      <p ref={h} className="phrase" aria-label="HOLD ON">{split("HOLD ON")}</p>
      <p ref={l} className="phrase" aria-label="LET GO">{split("LET GO")}</p>
      <div className="dots">{[0, 1, 2, 3, 4, 5].map((i) => <i key={i} ref={(e) => (dots.current[i] = e)} />)}</div>
      <div className="bar"><i ref={bar} /></div>
      <button ref={ph} className="photo" aria-label="Choose a photo for the figure (right-click resets)" title="Photo" onClick={() => input.current.click()} onContextMenu={reset}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 8h3l2-2h6l2 2h3v11H4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { applyPhoto(e.target.files?.[0]); e.target.value = ""; }} />
      <button ref={rp} className="replay" aria-label="Back to the start" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↺</button>
    </div>
  );
}
