// ─────────────────────────────────────────────────────────────────────────────
// Vector parts, generated once at boot. Every watch layer shares one viewBox
// (−500…500) so the stack aligns exactly when it re-assembles.
// ─────────────────────────────────────────────────────────────────────────────
const TI = "#F5F5F7", BRASS = "#D4AF37", PLATE = "#111113", DIAL = "#0C0C0E";
const f = (n) => +n.toFixed(2);
const pol = (r, a) => [f(Math.cos(a) * r), f(Math.sin(a) * r)];
const deg = Math.PI / 180;

/** Involute-ish tooth outline as a single closed path. */
export function toothPath(n, ro, ri) {
  const step = (Math.PI * 2) / n; let d = "";
  for (let i = 0; i < n; i++) {
    const a = i * step;
    const p = [pol(ri, a), pol(ro, a + step * 0.16), pol(ro, a + step * 0.44), pol(ri, a + step * 0.6)];
    d += (i ? "L" : "M") + p.map((q) => q.join(" ")).join("L");
  }
  return d + "Z";
}

const ticks = (n, r0, r1, every = 1, stroke = TI, w = 1, op = 1, skip = () => false) => {
  let s = "";
  for (let i = 0; i < n; i++) {
    if (skip(i)) continue;
    const a = (i / n) * Math.PI * 2 - Math.PI / 2, long = i % every === 0;
    const [x0, y0] = pol(long ? r0 : r0 + (r1 - r0) * 0.45, a), [x1, y1] = pol(r1, a);
    s += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${stroke}" stroke-width="${long ? w * 1.6 : w}" opacity="${op}"/>`;
  }
  return s;
};

const spokes = (n, r0, r1, w, stroke, sw) => {
  let s = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, b = w / r1;
    const p = [pol(r0, a - w / r0), pol(r1, a - b), pol(r1, a + b), pol(r0, a + w / r0)];
    s += `<path d="M${p.map((q) => q.join(" ")).join("L")}Z" fill="none" stroke="${stroke}" stroke-width="${sw}"/>`;
  }
  return s;
};

// ── Background gears: stylised, wireframe, brass calibration ring ──
export function gearSVG(teeth, arms) {
  return `<svg viewBox="-100 -100 200 200" aria-hidden="true">
    <path d="${toothPath(teeth, 97, 90)}" fill="none" stroke="${TI}" stroke-opacity=".22" stroke-width=".35"/>
    <circle r="84" fill="none" stroke="${TI}" stroke-opacity=".16" stroke-width=".3"/>
    <circle r="78" fill="none" stroke="${TI}" stroke-opacity=".1" stroke-width=".3" stroke-dasharray="1 2"/>
    <g>${ticks(120, 80, 83.5, 10, BRASS, 0.18, 0.55)}</g>
    ${spokes(arms, 22, 74, 7, TI, 0.3).replace(/stroke="#F5F5F7"/g, `stroke="${TI}" stroke-opacity=".18"`)}
    <circle r="20" fill="none" stroke="${TI}" stroke-opacity=".22" stroke-width=".35"/>
    <circle r="6" fill="none" stroke="${BRASS}" stroke-opacity=".6" stroke-width=".35"/>
    <line x1="-12" y1="0" x2="12" y2="0" stroke="${BRASS}" stroke-opacity=".5" stroke-width=".25"/>
    <line x1="0" y1="-12" x2="0" y2="12" stroke="${BRASS}" stroke-opacity=".5" stroke-width=".25"/>
  </svg>`;
}

const wrap = (inner, extra = "") => `<svg viewBox="-500 -500 1000 1000" ${extra} aria-hidden="true">${inner}</svg>`;

// ── L1 · Titanium mainplate: perlage, bridges, twin barrel, jewels ──
export function mainplate() {
  let screws = "";
  for (let i = 0; i < 8; i++) {
    const [x, y] = pol(408, (i / 8) * Math.PI * 2 + 0.2);
    screws += `<g transform="translate(${x} ${y}) rotate(${i * 37})"><circle r="11" fill="${PLATE}" stroke="${TI}" stroke-opacity=".55"/><line x1="-8" x2="8" stroke="${TI}" stroke-opacity=".55" stroke-width="2"/></g>`;
  }
  let jewels = "";
  [[-220, -170], [230, -150], [260, 170], [-120, 250], [110, -300], [-300, 60]].forEach(([x, y]) => {
    jewels += `<circle cx="${x}" cy="${y}" r="13" fill="none" stroke="${TI}" stroke-opacity=".6"/><circle cx="${x}" cy="${y}" r="5" fill="${TI}" fill-opacity=".5"/>`;
  });
  // twin barrel (the 65-hour reserve): two toothed barrels with a mainspring spiral
  const barrel = (cx, cy, r) => {
    let sp = ""; for (let t = 0; t < 7 * Math.PI * 2; t += 0.18) { const rr = 18 + (t / (7 * Math.PI * 2)) * (r - 34); const [x, y] = pol(rr, t); sp += (sp ? "L" : "M") + f(cx + x) + " " + f(cy + y); }
    return `<g><path d="${toothPath(64, r, r - 9).replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (m, x, y) => `${f(+x + cx)} ${f(+y + cy)}`)}" fill="${PLATE}" stroke="${TI}" stroke-opacity=".6" stroke-width="1.2"/>
      <circle cx="${cx}" cy="${cy}" r="${r - 16}" fill="none" stroke="${TI}" stroke-opacity=".25"/><path d="${sp}" fill="none" stroke="${TI}" stroke-opacity=".3" stroke-width="1"/>
      <circle cx="${cx}" cy="${cy}" r="16" fill="${PLATE}" stroke="${BRASS}" stroke-opacity=".8"/></g>`;
  };
  return wrap(`
    <defs>
      <pattern id="perlage" width="34" height="30" patternUnits="userSpaceOnUse">
        <circle cx="17" cy="15" r="15" fill="none" stroke="${TI}" stroke-opacity=".07"/>
        <circle cx="0" cy="0" r="15" fill="none" stroke="${TI}" stroke-opacity=".07"/>
        <circle cx="34" cy="30" r="15" fill="none" stroke="${TI}" stroke-opacity=".07"/>
      </pattern>
      <path id="engrave" d="M -360 0 A 360 360 0 0 1 360 0"/>
    </defs>
    <circle r="450" fill="${PLATE}" stroke="${TI}" stroke-opacity=".55" stroke-width="2"/>
    <circle r="440" fill="url(#perlage)"/>
    <circle r="440" fill="none" stroke="${TI}" stroke-opacity=".2"/>
    <circle r="175" fill="none" stroke="${TI}" stroke-opacity=".3" stroke-dasharray="3 5"/>
    ${barrel(-215, -165, 118)}
    ${barrel(215, 150, 96)}
    <path d="M -420 120 C -300 60 -220 260 -60 330 L 40 400 L -80 430 C -260 380 -380 260 -420 120 Z" fill="none" stroke="${TI}" stroke-opacity=".45" stroke-width="1.4"/>
    <path d="M 380 -210 C 300 -300 170 -330 60 -300 L 90 -230 C 190 -250 280 -220 330 -160 Z" fill="none" stroke="${TI}" stroke-opacity=".45" stroke-width="1.4"/>
    ${jewels}${screws}
    <text font-family="JetBrains Mono, monospace" font-size="17" letter-spacing="7" fill="${TI}" fill-opacity=".45"><textPath href="#engrave" startOffset="50%" text-anchor="middle">CALIBRE CM-01 · 38 JEWELS · 28 800 A/H · 65H</textPath></text>
  `);
}

// ── L2 · Peripheral rotor (its own rotating part) ──
export function rotor() {
  const a0 = -160 * deg, a1 = -20 * deg, ro = 432, ri = 386;
  const P = (r, a) => pol(r, a).join(" ");
  let hatch = "";
  for (let a = a0 + 0.05; a < a1 - 0.02; a += 0.045) hatch += `<line x1="${pol(ri + 6, a).join('" y1="')}" x2="${pol(ro - 6, a).join('" y2="')}" stroke="${TI}" stroke-opacity=".22"/>`;
  return wrap(`
    <path d="M ${P(ro, a0)} A ${ro} ${ro} 0 0 1 ${P(ro, a1)} L ${P(ri, a1)} A ${ri} ${ri} 0 0 0 ${P(ri, a0)} Z" fill="#141416" stroke="${TI}" stroke-opacity=".7" stroke-width="1.6"/>
    ${hatch}
    <circle r="409" fill="none" stroke="${TI}" stroke-opacity=".14" stroke-dasharray="2 9"/>
    <path d="M ${P(409, -92 * deg)} L ${P(409, -88 * deg)}" stroke="${BRASS}" stroke-width="3"/>
  `);
}

// ── L2 · Flying tourbillon cage (rotates once a minute) ──
export function cage() {
  let arms = "";
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 - Math.PI / 2, [x, y] = pol(150, a), [xl, yl] = pol(150, a - 0.28), [xr, yr] = pol(150, a + 0.28), [hx, hy] = pol(26, a);
    arms += `<path d="M ${hx} ${hy} Q ${f(x * 0.55)} ${f(y * 0.55)} ${xl} ${yl} L ${xr} ${yr} Q ${f(x * 0.6)} ${f(y * 0.6)} ${hx} ${hy}Z" fill="#161618" stroke="${TI}" stroke-opacity=".85" stroke-width="1.4"/>
      <circle cx="${f(x * 0.93)}" cy="${f(y * 0.93)}" r="6" fill="#161618" stroke="${TI}" stroke-opacity=".8"/>`;
  }
  // escape wheel + pallet fork, riding inside the cage
  return wrap(`
    <circle r="165" fill="none" stroke="${TI}" stroke-opacity=".25" stroke-dasharray="1 4"/>
    <circle r="152" fill="none" stroke="${TI}" stroke-opacity=".8" stroke-width="3"/>
    <circle r="144" fill="none" stroke="${TI}" stroke-opacity=".35"/>
    <g>${ticks(60, 156, 164, 5, BRASS, 0.8, 0.9)}</g>
    <g transform="translate(78 92)"><path d="${toothPath(15, 30, 22)}" fill="#161618" stroke="${TI}" stroke-opacity=".8"/><circle r="6" fill="none" stroke="${BRASS}"/></g>
    <path d="M 60 60 L 100 30 L 112 44 L 70 70 Z M 100 30 L 118 12" fill="none" stroke="${TI}" stroke-opacity=".7" stroke-width="1.4"/>
    ${arms}
    <circle r="26" fill="#161618" stroke="${TI}" stroke-opacity=".85" stroke-width="1.4"/>
  `);
}

// ── L2 · Balance wheel + hairspring (oscillates at 4 Hz) ──
export function balance() {
  let spring = "";
  for (let t = 0; t < 12 * Math.PI * 2; t += 0.1) { const [x, y] = pol(14 + t * 0.72, t); spring += (spring ? "L" : "M") + x + " " + y; }
  let screws = "";
  for (let i = 0; i < 16; i++) { const [x, y] = pol(112, (i / 16) * Math.PI * 2); screws += `<circle cx="${x}" cy="${y}" r="4.2" fill="#1a1a1c" stroke="${i % 4 ? TI : BRASS}" stroke-opacity=".9"/>`; }
  return wrap(`
    <path d="${spring}" fill="none" stroke="${TI}" stroke-opacity=".55" stroke-width=".9"/>
    <circle r="104" fill="none" stroke="${TI}" stroke-width="5" stroke-opacity=".9"/>
    <circle r="97" fill="none" stroke="${TI}" stroke-opacity=".3"/>
    ${spokes(3, 12, 100, 4, TI, 1.2)}
    ${screws}
    <circle r="11" fill="#1a1a1c" stroke="${BRASS}" stroke-width="1.4"/>
    <circle r="3.2" fill="${TI}"/>
  `);
}

// ── L3 · Open-worked dial with two registers ──
export function dial() {
  const skip = (i) => (i >= 12 && i <= 18) || (i >= 42 && i <= 48);   // keep the registers clear
  let idx = "";
  for (let h = 0; h < 12; h++) {
    if (h === 3 || h === 9) continue;
    const a = (h / 12) * 360;
    idx += `<g transform="rotate(${a})"><rect x="${h === 0 ? -9 : -5}" y="-400" width="${h === 0 ? 18 : 10}" height="70" fill="none" stroke="${TI}" stroke-width="1.5"/><rect x="${h === 0 ? -4 : -1.5}" y="-392" width="${h === 0 ? 8 : 3}" height="54" fill="${TI}" fill-opacity=".85"/></g>`;
  }
  const reg = (cx, label) => `<g transform="translate(${cx} 0)">
      <circle r="70" fill="${DIAL}" stroke="${TI}" stroke-opacity=".7" stroke-width="1.4"/>
      <circle r="62" fill="none" stroke="${TI}" stroke-opacity=".2"/>
      ${ticks(30, 54, 66, 5, TI, 1, 0.7)}
      <text y="30" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" letter-spacing="2" fill="${TI}" fill-opacity=".6">${label}</text>
    </g>`;
  return wrap(`
    <defs><mask id="dialcut"><rect x="-500" y="-500" width="1000" height="1000" fill="#fff"/><circle r="232" fill="#000"/></mask></defs>
    <circle r="446" fill="${DIAL}" mask="url(#dialcut)" fill-opacity=".96"/>
    <circle r="446" fill="none" stroke="${TI}" stroke-opacity=".5" stroke-width="1.5"/>
    <circle r="232" fill="none" stroke="${TI}" stroke-opacity=".8" stroke-width="2"/>
    <circle r="244" fill="none" stroke="${BRASS}" stroke-opacity=".7" stroke-width="1"/>
    <g>${ticks(60, 418, 438, 5, TI, 1.3, 0.85, skip)}</g>
    <g>${ticks(300, 440, 445, 1000, BRASS, 0.6, 0.6)}</g>
    ${idx}
    ${reg(345, "30 MIN")}${reg(-345, "SEC")}
    <text y="-266" text-anchor="middle" font-family="Syncopate, sans-serif" font-weight="700" font-size="22" letter-spacing="6" fill="${TI}">CHRONO-MATRIX</text>
    <text y="296" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" letter-spacing="5" fill="${TI}" fill-opacity=".55">FLYBACK · TOURBILLON</text>
  `);
}

// Hands, each its own rotating part (composited rotation, no repaint).
export function handHour() {
  return wrap(`<path d="M -16 40 L -11 -250 L 0 -268 L 11 -250 L 16 40 Z" fill="#0c0c0e" stroke="${TI}" stroke-width="2"/>
    <path d="M -6 -40 L -5 -236 L 0 -248 L 5 -236 L 6 -40 Z" fill="${TI}" fill-opacity=".9"/><circle r="22" fill="#0c0c0e" stroke="${TI}" stroke-width="2"/>`);
}
export function handMinute() {
  return wrap(`<path d="M -12 50 L -8 -390 L 0 -412 L 8 -390 L 12 50 Z" fill="#0c0c0e" stroke="${TI}" stroke-width="2"/>
    <path d="M -4 -60 L -3.4 -376 L 0 -392 L 3.4 -376 L 4 -60 Z" fill="${TI}" fill-opacity=".9"/><circle r="16" fill="#0c0c0e" stroke="${TI}" stroke-width="2"/>`);
}
export function handSeconds() {
  return wrap(`<line x1="0" y1="90" x2="0" y2="-430" stroke="${TI}" stroke-width="2"/>
    <line x1="0" y1="-360" x2="0" y2="-436" stroke="${BRASS}" stroke-width="3"/>
    <circle cy="70" r="12" fill="none" stroke="${TI}" stroke-width="2"/><circle r="8" fill="${BRASS}"/>`);
}
export function handSub(cx) {
  return `<svg viewBox="-500 -500 1000 1000" aria-hidden="true" style="transform-origin:${50 + cx / 10}% 50%"><g transform="translate(${cx} 0)">
    <line x1="0" y1="12" x2="0" y2="-60" stroke="${TI}" stroke-width="2.4"/><circle r="6" fill="${TI}"/></g></svg>`;
}

// ── L4 · Sapphire crystal & bezel ──
export function bezel() {
  return wrap(`
    <defs>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".38" stop-color="#fff" stop-opacity=".02"/>
        <stop offset=".62" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".07"/>
      </linearGradient>
      <mask id="ring"><circle r="498" fill="#fff"/><circle r="452" fill="#000"/></mask>
    </defs>
    <rect x="482" y="-34" width="44" height="68" rx="6" fill="#151517" stroke="${TI}" stroke-opacity=".6"/>
    <g stroke="${TI}" stroke-opacity=".35">${Array.from({ length: 11 }, (_, i) => `<line x1="${490 + i * 3.6}" y1="-30" x2="${490 + i * 3.6}" y2="30"/>`).join("")}</g>
    <circle r="498" fill="#141416" mask="url(#ring)"/>
    <circle r="498" fill="none" stroke="${TI}" stroke-opacity=".75" stroke-width="2"/>
    <circle r="452" fill="none" stroke="${TI}" stroke-opacity=".75" stroke-width="1.5"/>
    <g>${ticks(60, 462, 488, 5, TI, 1.4, 0.8, (i) => i === 0)}</g>
    <path d="M -12 458 L 12 458 L 0 478 Z" transform="rotate(180)" fill="${BRASS}"/>
    <circle r="452" fill="url(#glass)"/>
    <path d="M -360 -210 A 420 420 0 0 1 120 -410" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="7" stroke-linecap="round"/>
    <path d="M -380 -130 A 420 420 0 0 1 -330 -250" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="3" stroke-linecap="round"/>
  `);
}

// ── Phase 3 backdrop: a blueprint of the cage ──
export function blueprint() {
  let rings = "";
  [150, 210, 280, 360, 450].forEach((r, i) => { rings += `<circle cx="800" cy="500" r="${r}" fill="none" stroke="${TI}" stroke-opacity="${0.16 - i * 0.02}" ${i % 2 ? 'stroke-dasharray="4 8"' : ""}/>`; });
  let rays = "";
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; rays += `<line x1="${f(800 + Math.cos(a) * 160)}" y1="${f(500 + Math.sin(a) * 160)}" x2="${f(800 + Math.cos(a) * 470)}" y2="${f(500 + Math.sin(a) * 470)}" stroke="${TI}" stroke-opacity=".05"/>`; }
  const note = (x, y, t, anchor = "start") => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="JetBrains Mono, monospace" font-size="11" letter-spacing="2" fill="${TI}" fill-opacity=".55">${t}</text>`;
  return `<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <pattern id="bp-min" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="${TI}" stroke-opacity=".045"/></pattern>
      <pattern id="bp-maj" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#bp-min)"/><path d="M 100 0 L 0 0 0 100" fill="none" stroke="${TI}" stroke-opacity=".1"/></pattern>
    </defs>
    <rect width="1600" height="1000" fill="url(#bp-maj)"/>
    ${rays}${rings}
    <line x1="0" y1="500" x2="1600" y2="500" stroke="${BRASS}" stroke-opacity=".35"/>
    <line x1="800" y1="0" x2="800" y2="1000" stroke="${BRASS}" stroke-opacity=".35"/>
    <path d="M 350 500 L 350 940 M 1250 500 L 1250 940" stroke="${BRASS}" stroke-opacity=".6"/>
    <path d="M 350 920 L 1250 920" stroke="${BRASS}" stroke-opacity=".8"/>
    <path d="M 350 920 l 12 -5 v 10 z M 1250 920 l -12 -5 v 10 z" fill="${BRASS}"/>
    ${note(800, 910, "Ø 12.40 MM · FLYING CAGE", "middle")}
    <path d="M 1130 250 L 1260 180 L 1460 180" fill="none" stroke="${BRASS}" stroke-opacity=".7"/>
    ${note(1270, 170, "BALANCE Ø 10.00 · 4 HZ")}
    <path d="M 520 300 L 380 210 L 140 210" fill="none" stroke="${BRASS}" stroke-opacity=".7"/>
    ${note(140, 200, "CAGE MASS 0.29 G · 1 REV / 60 S")}
    ${note(40, 128, "DWG CM-01 / T-03 · SCALE 4.5:1")}
    ${note(1560, 128, "TOL ±0.002 MM", "end")}
  </svg>`;
}
