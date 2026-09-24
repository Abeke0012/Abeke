"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";

import { activeProtocols, loadById, type MenuState } from "@/lib/menu-machine";
import type { TelemetryRefs } from "./scene/BurgerScene";

// Three.js is only downloaded when the viewport is actually powered on.
const BurgerScene = dynamic(() => import("./scene/BurgerScene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center text-xs tracking-[0.3em] text-matrix animate-blink">
      COMPILING MESH ...
    </div>
  ),
});

interface Props {
  state: MenuState;
  /** null until hydrated. */
  isDesktop: boolean | null;
  onPower: (on: boolean) => void;
}

function Corner({ className }: { className: string }) {
  return <span aria-hidden className={`pointer-events-none absolute h-6 w-6 border-matrix ${className}`} />;
}

export function InspectionViewport({ state, isDesktop, onPower }: Props) {
  const telemetry: TelemetryRefs = {
    azimuth: useRef<HTMLSpanElement>(null),
    elevation: useRef<HTMLSpanElement>(null),
    scan: useRef<HTMLSpanElement>(null),
    fps: useRef<HTMLSpanElement>(null),
  };

  const powered = isDesktop === true || (isDesktop === false && state.viewport === "ONLINE");
  const load = loadById(state.load);
  const locks = activeProtocols(state);

  return (
    <section
      aria-label="3D cyber inspection matrix"
      className={`relative overflow-hidden border-b border-steel bg-black lg:fixed lg:inset-y-0 lg:left-0 lg:h-dvh lg:w-[60vw] lg:border-r lg:border-b-0 ${
        powered ? "h-[62svh] min-h-[380px]" : "h-auto"
      }`}
    >
      {powered ? (
        <>
          <BurgerScene state={state} telemetry={telemetry} />

          {/* HUD overlay */}
          <div className="pointer-events-none absolute inset-0 scanlines" aria-hidden />
          <div className="pointer-events-none absolute inset-4 lg:inset-8">
            <Corner className="top-0 left-0 border-t-2 border-l-2" />
            <Corner className="top-0 right-0 border-t-2 border-r-2" />
            <Corner className="bottom-0 left-0 border-b-2 border-l-2" />
            <Corner className="right-0 bottom-0 border-r-2 border-b-2" />

            <div className="absolute top-3 left-4 text-[10px] leading-relaxed tracking-[0.2em] text-muted lg:top-4 lg:left-6">
              <div className="text-matrix">CYBER-BITE // INSPECTION MATRIX</div>
              <div>MODEL: CHZ-{load.code} · {load.label}</div>
              <div>LAYERS: {load.patties * 2 + 3 + locks.length} · MAT: HOLO_WIRE</div>
            </div>

            <div className="absolute top-3 right-4 hidden items-center sm:flex gap-2 text-[10px] tracking-[0.2em] text-matrix lg:top-4 lg:right-6">
              <span className="h-2 w-2 rounded-full bg-matrix animate-blink" />
              LIVE SCAN
            </div>

            {/* Crosshair */}
            <div className="absolute top-1/2 left-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 opacity-40">
              <span className="absolute top-1/2 left-0 h-px w-3 bg-matrix" />
              <span className="absolute top-1/2 right-0 h-px w-3 bg-matrix" />
              <span className="absolute top-0 left-1/2 h-3 w-px bg-matrix" />
              <span className="absolute bottom-0 left-1/2 h-3 w-px bg-matrix" />
            </div>

            {locks.length > 0 && (
              <ul className="absolute top-1/2 left-4 hidden -translate-y-1/2 space-y-1 text-[10px] tracking-[0.2em] sm:block lg:left-6">
                {locks.map((p) => (
                  <li key={p.id} className="border-l-2 border-matrix bg-black/60 px-2 py-1 text-matrix">
                    TARGET {p.code} <span className="animate-blink">■</span>
                  </li>
                ))}
              </ul>
            )}

            <dl className="absolute right-4 bottom-3 left-4 grid grid-cols-4 gap-2 text-[10px] tracking-[0.15em] lg:right-6 lg:bottom-4 lg:left-6">
              {(
                [
                  ["AZIMUTH", telemetry.azimuth, "000.0°"],
                  ["ELEV", telemetry.elevation, "+00.0°"],
                  ["LASER Y", telemetry.scan, "+000mm"],
                  ["FPS", telemetry.fps, "060"],
                ] as const
              ).map(([label, ref, init]) => (
                <div key={label}>
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-sm text-matrix tabular-nums">
                    <span ref={ref}>{init}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="pointer-events-none absolute bottom-16 left-1/2 hidden -translate-x-1/2 text-[10px] tracking-[0.25em] text-muted lg:block lg:bottom-24">
            DRAG TO ORBIT · SCROLL TO ZOOM
          </p>

          {isDesktop === false && (
            <button
              type="button"
              onClick={() => onPower(false)}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 whitespace-nowrap border border-matrix bg-black/80 px-3 py-1.5 text-[10px] tracking-[0.2em] text-matrix"
            >
              ■ POWER DOWN 3D
            </button>
          )}
        </>
      ) : isDesktop === false ? (
        <MobileStandby onActivate={() => onPower(true)} />
      ) : (
        <div className="grid h-24 place-items-center text-[10px] tracking-[0.3em] text-matrix animate-blink lg:h-full">
          BOOTING OPTICS ...
        </div>
      )}
    </section>
  );
}

function MobileStandby({ onActivate }: { onActivate: () => void }) {
  return (
    <div className="relative px-5 py-8 sm:px-8">
      <div className="pointer-events-none absolute inset-0 scanlines" aria-hidden />
      <div className="relative flex items-center gap-5">
        {/* Static wireframe glyph — zero GPU cost */}
        <svg viewBox="0 0 64 56" className="h-16 w-16 shrink-0 text-matrix" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
          <path d="M6 22 Q32 -4 58 22 Z" />
          <path d="M14 14 L50 14 M10 18 L54 18 M32 2 L32 22" opacity=".5" />
          <rect x="5" y="25" width="54" height="6" />
          <path d="M4 34 L60 34 L54 38 L46 34 L38 38 L30 34 L22 38 L14 34" />
          <rect x="5" y="40" width="54" height="6" />
          <path d="M6 49 L58 49 Q56 55 32 55 Q8 55 6 49 Z" />
        </svg>
        <div className="min-w-0 text-[11px] leading-relaxed tracking-[0.15em]">
          <div className="text-matrix">INSPECTION MATRIX // STANDBY</div>
          <div className="text-muted">WebGL render suspended to conserve battery &amp; compute.</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onActivate}
        className="relative mt-6 w-full border-2 border-matrix py-4 text-sm font-bold tracking-[0.3em] text-matrix transition-colors hover:bg-matrix hover:text-black"
      >
        [ ACTIVATE 3D VIEW ]
      </button>
    </div>
  );
}
