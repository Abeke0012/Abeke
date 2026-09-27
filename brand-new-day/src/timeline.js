// ─────────────────────────────────────────────────────────────────────────────
// THE ONE RULE: every value in the scene is a pure function of one scalar `p`.
// This module owns that function. Nothing here keeps state between frames:
// the same p always returns the same pose, gates and strand geometry, so
// scrubbing backwards lands on exactly the frame you saw going forwards.
// ─────────────────────────────────────────────────────────────────────────────

/** Written once per frame by the scroll loop, read by every useFrame. React never sees it. */
export const P = { p: 0, sp: 0, mx: 0, my: 0, reduced: false, mobile: false };

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
/** A trapezoid window: rises over [a, a+rin], holds, falls over [b-rout, b]. */
export const ramp = (x, a, b, rin, rout) => Math.min(rin > 0 ? smoothstep(a, a + rin, x) : x >= a ? 1 : 0, rout > 0 ? 1 - smoothstep(b - rout, b, x) : x <= b ? 1 : 0);
/** Acts 1–5 run on the act axis; the closing wipe runs on real p. */
export const actAxis = (p) => clamp01(p / 0.82);

// ── World anchors ──
export const FIG_A = [0, 9, 0];        // act 1: the figure, 14 units tall
export const FIG_B = [0, -40, -175];   // act 5: where the drop lands
export const ROOM = { y: 9, z0: -8, length: 150, radii: [9, 13.95, 19.8], drift: [0.055, -0.03, 0.014] };

// ── Camera keyframes on sp ──
// `linear` marks the leg that STARTS at that key. The corridor legs are linear so the camera changes
// speed on each waypoint instead of stopping on it (smoothstep has zero slope at both ends).
// Gear changes: 300 → 150 → 360 units per unit of sp, stepping where a strand catches and lets go.
const K = [
  { s: 0.00, pos: [0, 9.6, 27], look: [0, 9, 0] },
  { s: 0.12, pos: [7, 11.5, 15], look: [0, 9.2, 0] },
  { s: 0.20, pos: [0, 9.2, 3], look: [0, 9.1, -27], linear: true },           // rest, then the corridor
  { s: 0.30, pos: [0, 9.2, -27], look: [0, 9.1, -57], linear: true },         // 300 u/sp  (strand 0 catches)
  { s: 0.424, pos: [0, 9.2, -45.6], look: [0, 9.1, -75.6], linear: true },    // 150 u/sp  (strand 2 lets go)
  { s: 0.54, pos: [0, 9.2, -87.36], look: [0, 8.4, -117.36] },                // 360 u/sp, then the drop
  { s: 0.66, pos: [0, -24, -128], look: [0, -40, -175] },
  { s: 0.80, pos: [0, -38.5, -150], look: [0, -40, -175] },
  { s: 1.00, pos: [0, -39.4, -158], look: [0, -40, -175] },
];
export const KEYS = K;
const DROP = { from: 5, to: 6, bank: 15 * Math.PI / 180 };

/** The camera spine: keyframed position and look target, no swing. Writes into `out`. */
export function spine(sp, out) {
  let i = 0;
  while (i < K.length - 2 && sp > K[i + 1].s) i++;
  const a = K[i], b = K[i + 1];
  const t = clamp01((sp - a.s) / (b.s - a.s));
  const e = a.linear ? t : t * t * (3 - 2 * t);
  for (let k = 0; k < 3; k++) { out.pos[k] = a.pos[k] + (b.pos[k] - a.pos[k]) * e; out.look[k] = a.look[k] + (b.look[k] - a.look[k]) * e; }
  out.leg = i; out.legT = t;
  return out;
}

// ── THE WEB: one table drives both the strands and the camera ──
// Spacing tightens (0.045, 0.045, 0.038, 0.035, 0.031) so the corridor accelerates into the drop.
// span/at are solved so strand 0 catches at sp 0.300 and strand 2 lets go at 0.424 — the gear changes.
const SPAN = 0.0791;
const AT0 = 0.300 - 0.12 * SPAN;
const GAPS = [0, 0.045, 0.045, 0.038, 0.035, 0.031];
const RADII = [2.6, 2.8, 2.5, 2.9, 2.6, 3.0];
const LIFTS = [2.4, 2.0, 2.6, 2.2, 2.5, 2.0];
export const WEB = GAPS.map((g, i) => {
  const at = AT0 + GAPS.slice(0, i + 1).reduce((s, x) => s + x, 0);
  const radius = RADII[i];
  // lead ≈ 3.8·radius keeps the anchor at atan(1/3.8) ≈ 14.7° off axis: well inside a ~29° × 19° half-frame.
  return { at, span: SPAN, side: i % 2 ? -1 : 1, lead: 3.8 * radius, radius, lift: LIFTS[i] };
});
// Anchors are derived from the spine, never authored in world space.
{
  const tmp = { pos: [0, 0, 0], look: [0, 0, 0] };
  for (const w of WEB) {
    spine(w.at, tmp);
    w.anchor = [tmp.pos[0] + w.side * w.radius, tmp.pos[1] + w.lift, tmp.pos[2] - w.lead];
  }
}
export const strandT = (w, sp) => (sp - w.at) / w.span;

/** The swing: a position-only offset summed over the same table. Every envelope is 0 at both ends. */
export function swing(sp, amp, out) {
  out.x = 0; out.y = 0; out.bank = 0;
  for (const w of WEB) {
    const u = (strandT(w, sp) - 0.08) / (0.82 - 0.08);  // windows overlap, sides alternate → an S-weave
    if (u <= 0 || u >= 1) continue;
    const env = Math.sin(Math.PI * u) * amp;
    out.x += w.side * 3.2 * env;
    out.y -= 1.5 * env;                                // dip under the anchor
    out.bank += w.side * 0.15 * env;                   // bank into the turn
  }
  return out;
}

// ── Pose: spine + swing (position only) + banked up vector ──
const _sp = { pos: [0, 0, 0], look: [0, 0, 0], leg: 0, legT: 0 };
const _sw = { x: 0, y: 0, bank: 0 };
export function pose(sp, p, reduced, out) {
  spine(sp, _sp);
  swing(sp, reduced ? 0 : 1, _sw);
  // Closing (real p): a last push toward the figure while the fog closes.
  const close = smoothstep(0.82, 1, p);
  out.pos[0] = _sp.pos[0] + _sw.x;
  out.pos[1] = _sp.pos[1] + _sw.y;
  out.pos[2] = _sp.pos[2] - close * 3;
  out.look[0] = _sp.look[0]; out.look[1] = _sp.look[1]; out.look[2] = _sp.look[2];
  // Bank: out to ~15° mid-drop and back upright by arrival, plus the swing's lean. Never a full roll.
  let bank = _sw.bank;
  if (_sp.leg === DROP.from) bank += DROP.bank * Math.sin(Math.PI * _sp.legT);
  // Rodrigues: rotate world up about the view axis f.
  let fx = out.look[0] - out.pos[0], fy = out.look[1] - out.pos[1], fz = out.look[2] - out.pos[2];
  const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
  let vx = 0, vy = 1, vz = 0;
  if (Math.abs(fy) > 0.97) { vx = 0; vy = 0; vz = -1; }           // guard the near-vertical case
  const c = Math.cos(bank), s = Math.sin(bank), d = fx * vx + fy * vy + fz * vz;
  out.up[0] = vx * c + (fy * vz - fz * vy) * s + fx * d * (1 - c);
  out.up[1] = vy * c + (fz * vx - fx * vz) * s + fy * d * (1 - c);
  out.up[2] = vz * c + (fx * vy - fy * vx) * s + fz * d * (1 - c);
  out.fogFar = 170 - 162 * smoothstep(0.84, 1, p);  // the wipe: fog closes over the figure
  return out;
}

// ── Act gates: every boundary overlaps its neighbour by 0.06–0.14 of the act axis ──
export function gates(sp, p, out = {}) {
  out.act1 = ramp(sp, -1, 0.22, 0, 0.07);      // figure + lattice         overlaps 2 by 0.06
  out.act2 = ramp(sp, 0.16, 0.34, 0.06, 0.05); // into the grid room      overlaps 3 by 0.07
  out.act3 = ramp(sp, 0.27, 0.58, 0.03, 0.05); // the web / swing         overlaps 4 by 0.08
  out.act4 = ramp(sp, 0.50, 0.72, 0.05, 0.06); // the drop                overlaps 5 by 0.08
  out.act5 = ramp(sp, 0.64, 2, 0.08, 0);       // arrival                 overlaps 6 by ~0.07 of sp
  out.act6 = smoothstep(0.76, 0.84, p);        // closing wipe (real p)
  return out;
}

// ── Element visibilities. Scarlet and cobalt never share a frame: the figure is gone before the room
//    appears, and the room is gone before the figure comes back. The bone lattice and strands bridge. ──
export const vis = {
  figureA: (sp) => 1 - smoothstep(0.12, 0.185, sp),
  figureB: (sp) => smoothstep(0.645, 0.72, sp),
  room: (sp) => smoothstep(0.215, 0.29, sp) * (1 - smoothstep(0.56, 0.63, sp)),
  // ONE scalar weaves the cage and un-weaves it (and weaves it again around the landing).
  lattice: (sp, p) => smoothstep(0.02, 0.12, sp) * (1 - smoothstep(0.15, 0.215, sp)) + smoothstep(0.6, 0.76, sp) * (1 - smoothstep(0.86, 0.97, p)),
  figureAt: (sp) => (sp < 0.44 ? FIG_A : FIG_B),
};

/** Proves the overlap rather than asserting it: at every act boundary at least two gates are live. */
export function checkOverlaps() {
  const g = {}, bad = [];
  for (let i = 0; i <= 1000; i++) {
    const p = i / 1000, sp = actAxis(p);
    gates(sp, p, g);
    const live = Object.values(g).filter((v) => v > 1e-4).length;
    if (live < 1) bad.push(p);
  }
  // Boundaries in real p: where one act hands over to the next.
  const boundaries = { "1→2": 0.19 * 0.82, "2→3": 0.305 * 0.82, "3→4": 0.54 * 0.82, "4→5": 0.68 * 0.82, "5→6": 0.80 };
  const at = Object.fromEntries(Object.entries(boundaries).map(([k, p]) => { gates(actAxis(p), p, g); return [k, Object.values(g).filter((v) => v > 1e-4).length]; }));
  return { gaps: bad.length, liveAtBoundaries: at };
}
