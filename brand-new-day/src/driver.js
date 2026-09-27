import { P, actAxis, gates } from "./timeline.js";

// The ONLY place scroll is read. Once per frame: scrollY → p → sp, written into the mutable P.
const G = {};
export function readScroll() {
  const el = document.scrollingElement || document.documentElement;
  const max = Math.max(1, el.scrollHeight - window.innerHeight);
  P.p = Math.min(1, Math.max(0, el.scrollTop / max));
  P.sp = actAxis(P.p);
  gates(P.sp, P.p, G);
  if (import.meta.env.DEV) { window.__gates = G; window.__P = P; }
  return G;
}

export function initInput() {
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  P.reduced = mq.matches; mq.addEventListener?.("change", (e) => (P.reduced = e.matches));
  P.mobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  // Cursor is input, not scene state: the tilt is a direct function of it.
  window.addEventListener("pointermove", (e) => { P.mx = (e.clientX / innerWidth) * 2 - 1; P.my = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
}
