"use client";

import { useCallback, useEffect, useReducer } from "react";

import { useDiagnostics } from "@/hooks/useDiagnostics";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  initialMenuState,
  loadById,
  menuReducer,
  selectTotal,
  type MenuEvent,
} from "@/lib/menu-machine";
import { playSfx } from "@/lib/sfx";
import { InspectionViewport } from "./InspectionViewport";
import { DiagnosticsTable } from "./panel/DiagnosticsTable";
import { ExecuteButton } from "./panel/ExecuteButton";
import { LoadSelector } from "./panel/LoadSelector";
import { ProtocolMatrix } from "./panel/ProtocolMatrix";

const TRANSMIT_MS = 1400;
const CONFIRM_HOLD_MS = 3200;

export default function Dashboard() {
  const [state, dispatch] = useReducer(menuReducer, initialMenuState);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const diagnostics = useDiagnostics(state);
  const total = selectTotal(state);
  const locked = state.checkout === "TRANSMITTING";

  /** Single entry point for UI events: dispatch + side-effect cues. */
  const send = useCallback(
    (event: MenuEvent) => {
      switch (event.type) {
        case "TOGGLE_PROTOCOL":
          playSfx(state.protocols[event.protocol] ? "protocolOff" : "protocolOn", state.audio);
          break;
        case "SELECT_LOAD":
          playSfx("select", state.audio);
          break;
        case "EXECUTE":
          playSfx("execute", state.audio);
          break;
        case "SET_VIEWPORT":
          if (event.power === "ONLINE") playSfx("boot", state.audio);
          break;
      }
      dispatch(event);
    },
    [state.protocols, state.audio],
  );

  // Checkout phase timers: TRANSMITTING -> CONFIRMED -> IDLE.
  useEffect(() => {
    if (state.checkout === "TRANSMITTING") {
      const id = setTimeout(() => {
        const orderId = `CB-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
        playSfx("confirm", state.audio);
        dispatch({ type: "EXECUTE_COMPLETE", orderId });
      }, TRANSMIT_MS);
      return () => clearTimeout(id);
    }
    if (state.checkout === "CONFIRMED") {
      const id = setTimeout(() => dispatch({ type: "RESET_CHECKOUT" }), CONFIRM_HOLD_MS);
      return () => clearTimeout(id);
    }
  }, [state.checkout, state.audio]);

  const load = loadById(state.load);

  return (
    <main className="min-h-dvh bg-black text-white">
      <InspectionViewport
        state={state}
        isDesktop={isDesktop}
        onPower={(on) => send({ type: "SET_VIEWPORT", power: on ? "ONLINE" : "OFFLINE" })}
      />

      <aside className="relative flex min-h-dvh flex-col lg:ml-[60vw] lg:w-[40vw]">
        <div className="flex-1 space-y-10 px-5 pt-8 pb-10 sm:px-8 lg:px-12 lg:pt-12">
          <header className="space-y-5">
            <div className="flex items-center justify-between text-[10px] tracking-[0.25em] text-muted">
              <span>NODE 07 // SECTOR 4 DARK KITCHEN</span>
              <button
                type="button"
                onClick={() => send({ type: "TOGGLE_AUDIO" })}
                aria-pressed={state.audio}
                className="border border-steel px-2 py-1 transition-colors hover:border-matrix hover:text-matrix"
              >
                SFX: {state.audio ? "ON" : "OFF"}
              </button>
            </div>
            <h1 className="text-4xl leading-none font-bold tracking-[0.08em] text-white sm:text-5xl">
              CYBER<span className="text-matrix">-</span>BITE
            </h1>
            <p className="text-[11px] leading-relaxed tracking-[0.2em] text-matrix animate-blink sm:text-xs">
              [ SYSTEM INITIALIZED // PROTOCOL: MENU_SELECTION ]
            </p>
            <div className="grid grid-cols-3 border border-steel text-[10px] tracking-[0.15em]">
              {[
                ["UNIT", "DBL-CHZ"],
                ["LOAD", load.code],
                ["STATUS", locked ? "UPLINK" : state.checkout === "CONFIRMED" ? "LOCKED" : "ARMED"],
              ].map(([k, v], i) => (
                <div key={k} className={`px-3 py-2 ${i ? "border-l border-steel" : ""}`}>
                  <div className="text-muted">{k}</div>
                  <div className="mt-0.5 text-sm text-matrix">{v}</div>
                </div>
              ))}
            </div>
          </header>

          <LoadSelector value={state.load} disabled={locked} onSelect={(l) => send({ type: "SELECT_LOAD", load: l })} />
          <ProtocolMatrix value={state.protocols} disabled={locked} onToggle={(p) => send({ type: "TOGGLE_PROTOCOL", protocol: p })} />
          <DiagnosticsTable rows={diagnostics} />
        </div>

        <div className="sticky bottom-0 z-10 border-t border-steel bg-black/90 px-5 py-5 backdrop-blur sm:px-8 lg:px-12 lg:py-6">
          <ExecuteButton
            total={total}
            phase={state.checkout}
            orderId={state.orderId}
            onExecute={() => send({ type: "EXECUTE" })}
          />
        </div>
      </aside>
    </main>
  );
}
