import { Engine, MAX_PARTICLES } from "./engine.js";

// ─────────────────────────────────────────────────────────────────────────────
// Unified RAF-LERP loop. The viewport is locked; a proxy scroller owns the
// 1800vh scroll. Each frame: LERP the scroll (0.06, frame-time corrected),
// derive velocity + acceleration, step the particle engine, drive the UI.
// ─────────────────────────────────────────────────────────────────────────────

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ph = (p, a, b) => clamp01((p - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const expo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

const LERP = 0.06;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mqMobile = matchMedia("(max-width: 768px)");

const scroller = $("#scroller");
const canvas = $("#matrix-canvas");
const engine = new Engine(canvas);

// ── sizing: throttled (one trailing update per 150ms burst) ──
let mobile = mqMobile.matches;
function applySize() {
  mobile = mqMobile.matches;
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
  engine.resize(innerWidth, innerHeight, dpr);
  const want = mobile ? 120 : MAX_PARTICLES;           // mobile fallback: 120 particles
  if (want !== engine.count || !engine.laidOut) engine.layout(want);
  engine.mouse.enabled = !mobile && !reduced;           // no attraction vectors on mobile
}
let resizeTimer = 0;
addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(applySize, 150); });
applySize();

// ── input: mouse velocity (smoothed) ──
const M = engine.mouse;
let lastMX = 0, lastMY = 0, rawVX = 0, rawVY = 0;
addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") return;
  if (!M.active) { lastMX = e.clientX; lastMY = e.clientY; }
  rawVX += e.clientX - lastMX; rawVY += e.clientY - lastMY;
  lastMX = e.clientX; lastMY = e.clientY;
  M.x = e.clientX; M.y = e.clientY; M.active = true;
}, { passive: true });
document.addEventListener("pointerleave", () => { M.active = false; });
addEventListener("blur", () => { M.active = false; });

// Wheel over an interactive UI element still scrolls the proxy.
$("#ui").addEventListener("wheel", (e) => { scroller.scrollTop += e.deltaY; }, { passive: true });
scroller.focus({ preventScroll: true });

// ── UI refs ──
const titleWords = $$(".title .w"), ledeWords = $$(".lede .w2");
const p1 = $(".p1"), p2 = $(".p2"), p3 = $(".p3"), p4 = $(".p4");
const blocks = $$(".block", p2), cells = $$(".cell", p4);
const cta = $("#cta"), ctaTxt = $(".cta__txt", cta);
const phaseName = $(".phase__name"), phaseBar = $(".phase__bar i"), phasePct = $(".phase__pct");
const live = Object.fromEntries($$("[data-live]").map((el) => [el.dataset.live, el]));
const spinBar = $("[data-live-bar=spin]");
const consoleEl = $("#console");
const PHASES = ["PHASE 01 · CONSTELLATION", "PHASE 02 · VORTEX", "PHASE 03 · VOLUMETRIC MESH", "PHASE 04 · CORE INTERFACE"];
const PHASE_EDGES = [0, 4 / 18, 9 / 18, 14 / 18];   // 0–4 · 4–9 · 9–14 · 14–18 of the 1800vh run

const vis = (el, v) => { el.style.opacity = v.toFixed(3); el.style.visibility = v < 0.005 ? "hidden" : "visible"; };

// Dev console (H)
let consoleOn = false;
addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "h" || e.metaKey || e.ctrlKey || e.altKey) return;
  consoleOn = !consoleOn; consoleEl.classList.toggle("is-on", consoleOn);
});

// CTA: initialisation sequence
let ctaStart = -1;
cta.addEventListener("click", () => {
  if (cta.dataset.state === "running") return;
  if (cta.dataset.state === "online") { cta.dataset.state = ""; ctaTxt.textContent = "[ INITIALIZE CORE ]"; $("[data-core-state]").textContent = "STANDBY"; const sub = $("[data-core-sub]"); sub.textContent = "AWAITING INIT"; sub.className = "cell__s warn"; return; }
  cta.dataset.state = "running"; ctaStart = performance.now(); engine.pulse();
});

// ── loop ──
let current = scroller.scrollTop, prevCurrent = current, vel = 0, acc = 0, prevVel = 0;
let last = performance.now(), fps = 60, frameN = 0, lastPhase = -1, lastPct = "";
const step = { dt: 16.7, p: 0, vel: 0, acc: 0, reduced, scanY: 0 };
const liveState = { through: 4.82, threats: 1284091, latency: 0.41, band: 96.2, temp: 31.4 };

function frame(now) {
  const dt = Math.min(50, now - last); last = now;
  fps += (1000 / Math.max(1, dt) - fps) * 0.05;
  frameN++;

  // scroll LERP
  const target = scroller.scrollTop;
  const run = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
  current += (target - current) * (1 - Math.pow(1 - LERP, dt / 16.667));
  if (Math.abs(target - current) < 0.05) current = target;
  const rawVel = (current - prevCurrent) * (16.667 / dt); prevCurrent = current;
  vel += (rawVel - vel) * 0.25;
  const rawAcc = vel - prevVel; prevVel = vel;
  acc += (rawAcc - acc) * 0.2;
  const p = clamp01(current / run);

  // mouse speed (px/frame), decays when the cursor stops
  const mvx = rawVX * (16.667 / dt), mvy = rawVY * (16.667 / dt); rawVX = rawVY = 0;
  M.vx += (mvx - M.vx) * 0.3; M.vy += (mvy - M.vy) * 0.3;
  M.speed = Math.hypot(M.vx, M.vy);

  // scan band: sweeps on its own, and locks onto the cursor while it probes the core
  const sweep = (Math.sin(now / 900) * 0.5 + 0.5) * innerHeight;
  step.scanY = M.active && M.enabled ? M.y : sweep;
  step.dt = dt; step.p = p; step.vel = vel / 10; step.acc = acc; // vel normalised to ~0…10
  engine.step(step);

  // ── UI · phase 1: title, word-blur dissolve ──
  const intro = reduced ? 1 : expo(clamp01((now - 200) / 1600));
  titleWords.forEach((w, i) => {
    const inT = reduced ? 1 : expo(clamp01((now - 250 - i * 180) / 1400));
    const out = smooth(ph(p, 0.15 + i * 0.025, 0.21 + i * 0.025));
    const blur = (1 - inT) * 18 + out * 22;
    w.style.transform = `translate3d(${((1 - inT) * -80).toFixed(1)}px,${(-out * 40).toFixed(1)}px,0) scale(${(1 + out * 0.08).toFixed(3)})`;
    w.style.filter = blur > 0.05 ? `blur(${blur.toFixed(1)}px)` : "none";
    w.style.opacity = (inT * (1 - out)).toFixed(3);
  });
  ledeWords.forEach((w, i) => {
    const out = smooth(ph(p, 0.12 + i * 0.006, 0.17 + i * 0.006));
    w.style.filter = out > 0.01 ? `blur(${(out * 10).toFixed(1)}px)` : "none";
    w.style.opacity = (intro * (1 - out)).toFixed(3);
  });
  p1.style.visibility = p > 0.3 ? "hidden" : "visible";

  // phase 2: data blocks on the right margin
  const p2In = ph(p, 0.23, 0.31), p2Out = smooth(ph(p, 0.44, 0.49));
  vis(p2, p2In > 0 ? 1 - p2Out : 0);
  blocks.forEach((b, i) => {
    const v = expo(clamp01(p2In * 1.8 - i * 0.22));
    b.style.opacity = v.toFixed(3);
    b.style.transform = `translate3d(${((1 - v) * 40).toFixed(1)}px,0,0)`;
  });

  // phase 3: mesh caption
  const p3v = smooth(ph(p, 0.53, 0.58)) * (1 - smooth(ph(p, 0.73, 0.77)));
  vis(p3, p3v);
  p3.style.transform = `translate3d(0,${((1 - p3v) * 24).toFixed(1)}px,0)`;

  // phase 4: diagnostics grid + CTA
  const p4In = ph(p, 0.81, 0.92);
  vis(p4, p4In > 0 ? 1 : 0);
  cells.forEach((c, i) => {
    const v = expo(clamp01(p4In * 2.2 - (i % 4) * 0.14 - Math.floor(i / 4) * 0.24));
    c.style.opacity = v.toFixed(3);
    c.style.transform = `translate3d(0,${((1 - v) * 22).toFixed(1)}px,0)`;
  });
  const ctaV = expo(clamp01(p4In * 2 - 0.9));
  cta.style.opacity = ctaV.toFixed(3);
  cta.classList.toggle("is-live", ctaV > 0.6);

  // CTA sequence progress
  if (cta.dataset.state === "running") {
    const k = clamp01((now - ctaStart) / 1900);
    cta.style.setProperty("--prog", k.toFixed(3));
    ctaTxt.textContent = `[ INITIALIZING · ${String(Math.round(k * 100)).padStart(3, "0")}% ]`;
    if (k >= 1) {
      cta.dataset.state = "online"; ctaTxt.textContent = "[ CORE ONLINE ]"; cta.style.removeProperty("--prog");
      $("[data-core-state]").textContent = "ONLINE";
      const sub = $("[data-core-sub]"); sub.textContent = "SYNAPTIC LINK LIVE"; sub.className = "cell__s ok";
      engine.pulse();
    }
  }

  // phase meter
  let ph4 = 0; for (let i = 0; i < 4; i++) if (p >= PHASE_EDGES[i]) ph4 = i;
  if (ph4 !== lastPhase) { phaseName.textContent = PHASES[ph4]; lastPhase = ph4; }
  phaseBar.style.transform = `scaleX(${p.toFixed(4)})`;
  const pct = `${String(Math.round(p * 100)).padStart(3, "0")}%`;
  if (pct !== lastPct) { phasePct.textContent = pct; lastPct = pct; }

  // live numbers + console: text updates throttled to every 6th frame
  if (frameN % 6 === 0) {
    liveState.through += (Math.random() - 0.5) * 0.02;
    liveState.threats += Math.random() < 0.4 ? 1 + ((Math.random() * 3) | 0) : 0;
    liveState.latency = 0.38 + Math.random() * 0.07;
    liveState.band = 95.8 + Math.random() * 0.8;
    liveState.temp += (31.4 - liveState.temp) * 0.1 + (Math.random() - 0.5) * 0.06;
    if (p2In > 0 && p2Out < 1) {
      live.through.textContent = liveState.through.toFixed(2);
      live.entropy.textContent = (0.9995 + Math.random() * 0.0004).toFixed(5);
      live.threats.textContent = liveState.threats.toLocaleString("en-US");
      const spinRad = engine.spinRate * 60;
      live.spin.textContent = spinRad.toFixed(2);
      spinBar.style.transform = `scaleX(${clamp01(Math.abs(spinRad) / 2).toFixed(3)})`;
    }
    if (p3v > 0) live.scan.textContent = M.active && M.enabled ? `PROBE ${Math.round(M.x)},${Math.round(M.y)}` : mobile ? "AUTO-SWEEP" : "IDLE";
    if (p4In > 0) {
      live.latency.textContent = liveState.latency.toFixed(2);
      live.band.textContent = liveState.band.toFixed(1);
      live.temp.textContent = liveState.temp.toFixed(1);
      live.nodes.textContent = String(engine.count);
    }
    if (consoleOn) {
      const W = engine.weights;
      consoleEl.textContent =
`NEXUS-MIND · CANVAS CONSOLE
────────────────────────────────
FPS              ${fps.toFixed(1)}
PARTICLES        ${engine.count} active / ${MAX_PARTICLES} pooled
DRAWN            ${engine.stats.drawn}
LINKS            ${engine.stats.links}
CANVAS           ${canvas.width}×${canvas.height} @${engine.dpr}x
────────────────────────────────
SCROLL VEL       ${vel >= 0 ? "+" : ""}${vel.toFixed(2)} px/f  ${vel > 0.05 ? "▼" : vel < -0.05 ? "▲" : "·"}
SCROLL ACC       ${acc >= 0 ? "+" : ""}${acc.toFixed(3)} px/f²
MOUSE VEL        (${M.vx.toFixed(1)}, ${M.vy.toFixed(1)}) |${M.speed.toFixed(1)}|
MOUSE FIELD      ${M.enabled ? (M.active ? (M.speed > 9 ? "REPEL" : "ATTRACT") : "ARMED") : "DISABLED"}
────────────────────────────────
LERP k           ${LERP}
LERP target      ${target.toFixed(0)} px
LERP current     ${current.toFixed(1)} px
LERP delta       ${(target - current).toFixed(2)} px
PROGRESS         ${(p * 100).toFixed(2)}%
PHASE            ${PHASES[ph4]}
WEIGHTS          A${W[0].toFixed(2)} B${W[1].toFixed(2)} C${W[2].toFixed(2)} D${W[3].toFixed(2)}
VORTEX SPIN      ${(engine.spinRate * 60).toFixed(3)} rad/s`;
    }
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
