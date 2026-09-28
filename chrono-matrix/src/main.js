import * as V from "./svg.js";

// ─────────────────────────────────────────────────────────────────────────────
// RAF-LERP ENGINE
// One requestAnimationFrame loop. `currentScroll` chases window.scrollY with a
// tight LERP (0.07 per 60 Hz frame, corrected for frame time so 120 Hz screens
// feel identical), and every visual below is derived from that single value.
// Only transform / opacity are written per frame (plus a short blur on the
// title's exit and a few text readouts).
// ─────────────────────────────────────────────────────────────────────────────

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ph = (p, a, b) => clamp01((p - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const expo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));      // matches --ease-expo's feel
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const LERP = reduced ? 1 : 0.07;

// ── Build the parts ──
const gears = { a: [48, 5], b: [34, 6], c: [26, 4] };
$$("[data-gear]").forEach((el) => { const [t, arms] = gears[el.dataset.gear]; el.innerHTML = V.gearSVG(t, arms); });
$(".blueprint").innerHTML = V.blueprint();

const L = Object.fromEntries($$("[data-layer]").map((el) => [el.dataset.layer, el]));
const part = (host, svg) => { const d = document.createElement("div"); d.className = "part"; d.innerHTML = svg; host.appendChild(d); return d; };
L[1].innerHTML = V.mainplate();
const zoom = $(".zoom", L[2]);
const rotorEl = part(zoom, V.rotor());
const cageEl = part(zoom, V.cage());
const balanceEl = part(zoom, V.balance());
L[3].innerHTML = V.dial();
const subChrono = part(L[3], V.handSub(345));
const subSec = part(L[3], V.handSub(-345));
subChrono.style.transformOrigin = "84.5% 50%";
subSec.style.transformOrigin = "15.5% 50%";
const hourEl = part(L[3], V.handHour());
const minEl = part(L[3], V.handMinute());
const secEl = part(L[3], V.handSeconds());
L[4].innerHTML = V.bezel();

const lens = $(".lens"), chassis = $(".chassis"), hero = $(".hero");
const title = $(".title"), rows = $$(".title__row", title);
const macro = $(".macro"), spec = $(".spec"), cells = $$(".spec__cell");
const blueprintEl = $(".blueprint");
const tags = Object.fromEntries($$("[data-tag]").map((el) => [el.dataset.tag, { el, line: $(".tag__line", el), left: el.classList.contains("tag--l") }]));
const hudPhase = $(".hud__phase"), hudGauge = $(".hud__gauge i"), hudPct = $(".hud__pct"), hudZ = $(".hud__z");
const clockTxt = $(".head__time"), clockTick = $(".head__tick");

// ── Calibration matrix (G) ──
const grid = $(".dev-grid");
$(".dev-grid__cols").innerHTML = "<i></i>".repeat(12);
addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "g" || e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return;
  grid.classList.toggle("is-on");
});

// ── Metrics (read on resize only: no layout reads inside the loop) ──
const M = { top: 0, run: 1, vh: innerHeight, vw: innerWidth, size: 600, mobile: false };
function measure() {
  M.vh = innerHeight; M.vw = innerWidth;
  M.top = hero.offsetTop;
  M.run = Math.max(1, hero.offsetHeight - M.vh);
  M.size = chassis.offsetWidth;
  M.mobile = matchMedia("(max-width: 768px)").matches;
  // Narrow screens: the power-reserve tag moves to the right barrel so the two left tags don't collide.
  if (tags[1]) { tags[1].left = !M.mobile; tags[1].el.classList.toggle("tag--l", !M.mobile); tags[1].el.classList.toggle("tag--r", M.mobile); }
}
measure();
addEventListener("resize", measure);
addEventListener("load", measure);
document.fonts?.ready.then(measure);

// Nav anchors: jump to a point of the timeline; the LERP turns the jump into a glide.
$$("[data-jump]").forEach((a) => a.addEventListener("click", (e) => {
  e.preventDefault();
  scrollTo({ top: M.top + +a.dataset.jump * M.run, behavior: "instant" });
}));

// ── Projection: where a point inside the chassis lands on screen ──
// Mirrors the CSS: perspective 1800px on .lens (origin centre), then
// translate3d(tx,ty) rotateX(a) rotateZ(b) scale(s) on .chassis, then translateZ(z) on a layer.
const PERSP = 1800;
function project(x, y, z, T, out) {
  x *= T.s; y *= T.s;
  const cb = Math.cos(T.b), sb = Math.sin(T.b), ca = Math.cos(T.a), sa = Math.sin(T.a);
  const x1 = x * cb - y * sb, y1 = x * sb + y * cb;
  const y2 = y1 * ca - z * sa, z2 = y1 * sa + z * ca;
  const k = PERSP / (PERSP - z2);
  out.x = M.vw / 2 + (x1 + T.tx) * k; out.y = M.vh / 2 + (y2 + T.ty) * k;
  return out;
}

// ── Clock ──
const pad = (n, w = 2) => String(n).padStart(w, "0");
const t0 = performance.now();

let current = scrollY, last = performance.now(), lastPhase = "", lastZ = "", lastPct = "";
const T = { a: 0, b: 0, s: 1, tx: 0, ty: 0 }, pt = { x: 0, y: 0 };
const PHASES = ["PHASE 01 / CALIBER", "PHASE 02 / ANATOMY", "PHASE 03 / MACRO", "PHASE 04 / SPEC"];

function frame(now) {
  const dt = Math.min(64, now - last); last = now;
  const target = scrollY;
  current += (target - current) * (1 - Math.pow(1 - LERP, dt / 16.667));
  if (Math.abs(target - current) < 0.05) current = target;

  const p = clamp01((current - M.top) / M.run);
  lens.style.setProperty("--scroll-progress", p.toFixed(4));
  // Gears: targetRotation = scrollY * 0.4, fed by the LERPed scroll so they coast to a stop.
  lens.style.setProperty("--gear-rotation", `${(current * 0.4).toFixed(2)}deg`);

  // ── PHASE 1 · intro + tourbillon sync ──
  const exit = smooth(ph(p, 0.25, 0.31));
  rows.forEach((r, i) => {
    const t = reduced ? 1 : expo(clamp01((now - t0 - 250 - i * 140) / 1500));
    r.style.transform = `translate3d(${((1 - t) * -60).toFixed(2)}vw,0,0)`;
  });
  title.style.transform = `translate3d(0,${(-exit * 160).toFixed(1)}px,0)`;
  title.style.opacity = (1 - exit).toFixed(3);
  title.style.filter = exit > 0.001 ? `blur(${(exit * 16).toFixed(1)}px)` : "none";
  title.style.visibility = exit > 0.999 ? "hidden" : "visible";

  // Hands: spin from 00:00 to the device's time, then ride on top of the scroll.
  const d = new Date();
  const ms = d.getMilliseconds(), sec = d.getSeconds() + ms / 1000;
  const realMin = d.getHours() * 60 + d.getMinutes() + sec / 60;
  const handIntro = reduced ? 1 : expo(clamp01((now - t0) / 2600));
  const shown = realMin * handIntro + (current / M.vh) * 3;          // scrolling winds 3 min per screen
  hourEl.style.transform = `rotate(${(shown * 0.5).toFixed(3)}deg)`;
  minEl.style.transform = `rotate(${(shown * 6).toFixed(3)}deg)`;
  const beat = Math.floor(sec * 8) / 8;                               // 4 Hz = 8 beats a second
  secEl.style.transform = `rotate(${(beat * 6 * handIntro).toFixed(2)}deg)`;
  subSec.style.transform = `rotate(${(beat * 6).toFixed(2)}deg)`;
  subChrono.style.transform = `rotate(${((current / M.vh) * 12).toFixed(2)}deg)`;
  cageEl.style.transform = `rotate(${((now / 60000) * 360 + current * 0.05).toFixed(2)}deg)`;
  balanceEl.style.transform = `rotate(${(150 * Math.sin((now / 1000) * Math.PI * 2 * 4)).toFixed(2)}deg)`;
  rotorEl.style.transform = `rotate(${(current * 0.22 + now * 0.004).toFixed(2)}deg)`;

  // ── PHASE 2 · explode · PHASE 3 · macro · PHASE 4 · re-assembly ──
  const x = smooth(ph(p, 0.27, 0.45));
  const back = smooth(ph(p, 0.76, 0.86));
  const E = x * (1 - back);                          // explosion amount
  const Z = smooth(ph(p, 0.52, 0.66)) * (1 - back);  // macro zoom
  const tilt = E * (1 - Z);                          // flatten the chassis to dive into the cage
  const shift = smooth(ph(p, 0.8, 0.92));
  const S = M.size;

  if (!M.mobile) {
    T.a = (56 * tilt * Math.PI) / 180; T.b = (-26 * tilt * Math.PI) / 180; T.s = 1;
    T.tx = -0.25 * M.vw * shift; T.ty = 0;
    chassis.style.transform = `translate3d(${T.tx.toFixed(1)}px,0,0) rotateX(${(56 * tilt).toFixed(3)}deg) rotateZ(${(-26 * tilt).toFixed(3)}deg)`;
    L[4].style.transform = `translate3d(0,0,${(300 * E).toFixed(1)}px)`;
    L[3].style.transform = `translate3d(0,0,${(150 * E).toFixed(1)}px)`;
    L[2].style.transform = "translate3d(0,0,0)";
    L[1].style.transform = `translate3d(0,0,${(-200 * E).toFixed(1)}px)`;
  } else {
    // Mobile: the 3D explosion becomes a vertical stack reveal.
    T.a = 0; T.b = 0; T.s = 1 - 0.42 * E - 0.2 * shift; T.tx = 0; T.ty = -0.2 * M.vh * shift;
    chassis.style.transform = `translate3d(0,${T.ty.toFixed(1)}px,0) scale(${T.s.toFixed(4)})`;
    L[4].style.transform = `translate3d(0,${(-0.66 * S * E).toFixed(1)}px,0)`;
    L[3].style.transform = `translate3d(0,${(-0.33 * S * E).toFixed(1)}px,0)`;
    L[2].style.transform = "translate3d(0,0,0)";
    L[1].style.transform = `translate3d(0,${(0.36 * S * E).toFixed(1)}px,0)`;
  }
  L[4].style.opacity = (M.mobile ? 1 - 0.55 * E - 0.45 * Z : 1 - E).toFixed(3);
  L[3].style.opacity = (1 - Z).toFixed(3);
  L[1].style.opacity = (1 - Z).toFixed(3);
  L[2].style.opacity = (1 - 0.3 * Z).toFixed(3);
  zoom.style.transform = `scale(${(1 + 3.5 * Z).toFixed(4)})`;
  blueprintEl.style.opacity = Z.toFixed(3);

  // Side-labels: pinned to their layer by projecting its 3D anchor every frame.
  const lab = smooth(ph(p, 0.37, 0.44)) * (1 - smooth(ph(p, 0.49, 0.54)));
  const u = S / 1000;
  const anchors = M.mobile
    ? { 3: [345 * u, -0.33 * S * E, 0], 2: [-120 * u, 0, 0], 1: [215 * u, 150 * u + 0.36 * S * E, 0] }
    : { 3: [415 * u, 0, 150 * E], 2: [-152 * u, 0, 0], 1: [-333 * u, -165 * u, -200 * E] };
  for (const k in tags) {
    const tg = tags[k];
    tg.el.style.opacity = lab.toFixed(3);
    tg.el.style.visibility = lab < 0.005 ? "hidden" : "visible";
    if (lab < 0.005) continue;
    project(anchors[k][0], anchors[k][1], anchors[k][2], T, pt);
    tg.el.style.transform = `translate3d(${pt.x.toFixed(1)}px,${pt.y.toFixed(1)}px,0) translate(${tg.left ? "-100%" : "0"},-50%)`;
    tg.line.style.transform = `scaleX(${lab.toFixed(3)})`;
  }

  // PHASE 3 copy
  const mIn = smooth(ph(p, 0.58, 0.64)), mOut = smooth(ph(p, 0.71, 0.75));
  macro.style.opacity = (mIn * (1 - mOut)).toFixed(3);
  macro.style.transform = `translate3d(0,${((1 - mIn) * 36 - mOut * 36).toFixed(1)}px,0)`;

  // PHASE 4 spec grid
  spec.style.opacity = shift > 0.001 ? "1" : "0";
  spec.classList.toggle("is-live", shift > 0.5);
  cells.forEach((c, i) => {
    const v = expo(ph(p, 0.85 + i * 0.025, 0.93 + i * 0.025));
    c.style.opacity = v.toFixed(3);
    c.style.transform = `translate3d(0,${((1 - v) * 28).toFixed(1)}px,0)`;
  });

  // HUD (text only changes when its value does)
  const phase = PHASES[Math.min(3, Math.floor(p * 4))];
  if (phase !== lastPhase) { hudPhase.textContent = phase; lastPhase = phase; }
  const pct = `${(p * 100).toFixed(1).padStart(5, "0")}%`;
  if (pct !== lastPct) { hudPct.textContent = pct; lastPct = pct; }
  hudGauge.style.transform = `scaleX(${p.toFixed(4)})`;
  const zt = `Z · L4 +${pad(Math.round(300 * E), 3)} · L3 +${pad(Math.round(150 * E), 3)} · L1 −${pad(Math.round(200 * E), 3)} · ×${(1 + 3.5 * Z).toFixed(2)}`;
  if (zt !== lastZ) { hudZ.textContent = zt; lastZ = zt; }

  // Head clock: 24h with milliseconds, plus a tiny analog second tick.
  clockTxt.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(ms, 3)}`;
  clockTick.style.transform = `rotate(${(sec * 6).toFixed(1)}deg)`;

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
