"use client";

import { useGlitchText } from "@/hooks/useGlitchText";
import { formatPrice, type CheckoutPhase } from "@/lib/menu-machine";

interface Props {
  total: number;
  phase: CheckoutPhase;
  orderId: string | null;
  onExecute: () => void;
}

export function ExecuteButton({ total, phase, orderId, onExecute }: Props) {
  const label =
    phase === "TRANSMITTING"
      ? "TRANSMITTING ORDER ..."
      : phase === "CONFIRMED"
        ? `ORDER LOCKED [ ${orderId} ]`
        : `EXECUTE ORDER [ ${formatPrice(total)} ]`;
  const { display, glitching, trigger } = useGlitchText(label);

  return (
    <button
      type="button"
      onClick={onExecute}
      onMouseEnter={trigger}
      onFocus={trigger}
      disabled={phase !== "IDLE"}
      aria-label={label}
      aria-live="polite"
      className={`execute-btn group relative block w-full overflow-hidden border-2 px-6 py-6 text-left transition-colors sm:py-7 ${
        phase === "CONFIRMED"
          ? "border-matrix bg-matrix text-black"
          : "border-matrix bg-black text-matrix hover:bg-matrix hover:text-black"
      } disabled:cursor-default`}
    >
      {phase === "TRANSMITTING" && <span className="absolute inset-y-0 left-0 bg-matrix/25 animate-transmit" aria-hidden />}
      <span className="relative flex items-center justify-between gap-4">
        <span
          className={`glitch block text-lg font-bold tracking-[0.12em] whitespace-nowrap sm:text-2xl ${glitching ? "is-glitching" : ""}`}
          data-text={display}
          aria-hidden
        >
          {display}
        </span>
        <span aria-hidden className="text-2xl transition-transform group-hover:translate-x-1 sm:text-3xl">
          {phase === "CONFIRMED" ? "■" : "▶"}
        </span>
      </span>
      <span aria-hidden className="relative mt-2 flex justify-between text-[10px] tracking-[0.25em] opacity-70">
        <span>{phase === "IDLE" ? "AUTH: BIOMETRIC // READY" : phase === "TRANSMITTING" ? "UPLINK: ENCRYPTING" : "DISPATCH: KITCHEN NODE 07"}</span>
        <span className="hidden sm:inline">ETA 00:14:00</span>
      </span>
    </button>
  );
}
