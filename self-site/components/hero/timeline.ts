/**
 * Scroll timeline of the hero commercial. Every value is derived from one
 * progress number p in [0, 1], so the scene stays in sync with the scrollbar.
 *
 *   0.00 – 0.06  finished burger, camera settles
 *   0.06 – 0.30  layers separate one after another and hang in the air
 *   0.36 – 0.50  layers fall back and reassemble
 *   0.44 – 0.58  black SELF box rises into frame
 *   0.50 – 0.64  burger arcs into the box
 *   0.62 – 0.80  camera orbits the open box
 *   0.80 – 0.92  lid closes, camera settles on the hero shot
 *   0.90 – 1.00  SELF logo and order button
 */

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t: number) => {
  const c1 = 1.2;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type Phase = {
  /** 0 = assembled, 1 = fully separated layers. */
  explode: number;
  /** 0 = box below frame, 1 = box in place. */
  boxIn: number;
  /** 0 = burger in hero position, 1 = burger resting in the box. */
  toBox: number;
  /** 0..1 progress of the camera orbit around the box. */
  orbit: number;
  /** 0 = lid open, 1 = lid closed. */
  lid: number;
  /** Final logo overlay opacity. */
  finale: number;
};

export function phaseAt(p: number): Phase {
  const apart = range(p, 0.06, 0.3);
  const together = range(p, 0.36, 0.5);
  return {
    explode: apart * (1 - together),
    boxIn: easeInOut(range(p, 0.44, 0.58)),
    toBox: range(p, 0.5, 0.64),
    orbit: easeInOut(range(p, 0.62, 0.8)),
    lid: easeInOut(range(p, 0.8, 0.9)),
    finale: smooth(range(p, 0.9, 0.98)),
  };
}

type Key = { p: number; pos: [number, number, number]; look: [number, number, number] };

/** Camera path before the orbit is applied on top. */
const CAMERA_KEYS: Key[] = [
  { p: 0.0, pos: [0, 0.5, 5.6], look: [0, 0.05, 0] },
  { p: 0.08, pos: [0.2, 0.7, 5.4], look: [0, 0.15, 0] },
  { p: 0.24, pos: [0.7, 2.1, 10.6], look: [0, 1.4, 0] },
  { p: 0.36, pos: [0.3, 2.0, 10.2], look: [0, 1.35, 0] },
  { p: 0.5, pos: [0, 0.6, 5.5], look: [0, 0.05, 0] },
  { p: 0.62, pos: [0, 2.5, 5.6], look: [0, -0.95, 0] },
  { p: 0.8, pos: [0, 2.8, 5.3], look: [0, -1.0, 0] },
  { p: 0.93, pos: [0, 4.3, 6.9], look: [0, -0.6, 0] },
  { p: 1.0, pos: [0, 4.4, 7.1], look: [0, -0.56, 0] },
];

export function cameraAt(p: number, out: { pos: number[]; look: number[] }) {
  let i = 0;
  while (i < CAMERA_KEYS.length - 2 && p > CAMERA_KEYS[i + 1].p) i++;
  const a = CAMERA_KEYS[i];
  const b = CAMERA_KEYS[i + 1];
  const t = easeInOut(range(p, a.p, b.p));
  for (let k = 0; k < 3; k++) {
    out.pos[k] = lerp(a.pos[k], b.pos[k], t);
    out.look[k] = lerp(a.look[k], b.look[k], t);
  }
  return out;
}

/** Orbit angle around the box: swing out, then come back to a centred hero shot. */
export function orbitAngle(ph: Phase) {
  return Math.sin(ph.orbit * Math.PI) * 0.85;
}
