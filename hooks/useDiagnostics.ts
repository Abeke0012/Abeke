"use client";

import { useEffect, useState } from "react";
import { loadById, selectPayload, type MenuState } from "@/lib/menu-machine";

export type DiagnosticLevel = "nominal" | "elevated" | "critical";

export interface DiagnosticRow {
  key: string;
  label: string;
  value: string;
  /** 0..1 fill for the inline bar. */
  meter: number;
  level: DiagnosticLevel;
}

const jitter = (amp: number) => (Math.random() - 0.5) * 2 * amp;

/**
 * Simulated live telemetry. Values are derived from the menu state and then
 * perturbed on a timer so the table feels like a real sensor feed. The first
 * render is deterministic (no noise) to keep SSR and hydration in sync.
 */
export function useDiagnostics(state: MenuState, intervalMs = 700): DiagnosticRow[] {
  const [noise, setNoise] = useState({ temp: 0, sear: 0, integrity: 0, press: 0 });

  useEffect(() => {
    const id = setInterval(
      () => setNoise({ temp: jitter(0.6), sear: jitter(0.25), integrity: jitter(0.4), press: jitter(1.5) }),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [intervalMs]);

  const { patties } = loadById(state.load);
  const { grams, kcal } = selectPayload(state);
  const p = state.protocols;

  const temp = 165 + noise.temp;
  const sear = 94.2 + (p.BACON ? 1.1 : 0) + noise.sear;
  const integrity = 99.1 - (patties - 2) * 9.6 - (p.BACON ? 2.2 : 0) - (p.JALAPENO ? 1.1 : 0) + noise.integrity;
  const pressure = 22 + patties * 4 + noise.press;
  const scoville = p.JALAPENO ? 8000 : 0;
  const smoke = p.GOUDA ? 71.4 : 12.0;

  return [
    { key: "temp", label: "Temperature", value: `${temp.toFixed(1)}°F`, meter: temp / 180, level: "nominal" },
    { key: "sear", label: "Sear Density", value: `${sear.toFixed(1)}%`, meter: sear / 100, level: "nominal" },
    { key: "juice", label: "Juiciness Index", value: "Critical", meter: 0.97, level: "critical" },
    {
      key: "integrity",
      label: "Structural Integrity",
      value: `${integrity.toFixed(1)}%`,
      meter: integrity / 100,
      level: integrity < 85 ? "critical" : integrity < 95 ? "elevated" : "nominal",
    },
    { key: "press", label: "Stack Pressure", value: `${pressure.toFixed(1)} kPa`, meter: pressure / 50, level: patties >= 4 ? "elevated" : "nominal" },
    { key: "mass", label: "Mass Payload", value: `${grams} g`, meter: grams / 1100, level: "nominal" },
    { key: "kcal", label: "Caloric Load", value: `${kcal.toLocaleString("en-US")} kcal`, meter: kcal / 2400, level: kcal > 1600 ? "elevated" : "nominal" },
    { key: "shu", label: "Scoville Output", value: `${scoville.toLocaleString("en-US")} SHU`, meter: scoville / 10000, level: scoville ? "elevated" : "nominal" },
    { key: "smoke", label: "Smoke Signature", value: `${smoke.toFixed(1)} ppm`, meter: smoke / 100, level: "nominal" },
  ];
}
