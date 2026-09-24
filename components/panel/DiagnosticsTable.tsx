import type { DiagnosticRow } from "@/hooks/useDiagnostics";
import { SectionHeader } from "./SectionHeader";

const LEVEL_STYLE = {
  nominal: "text-white",
  elevated: "text-amber-300",
  critical: "text-matrix animate-blink font-bold",
} as const;

export function DiagnosticsTable({ rows }: { rows: DiagnosticRow[] }) {
  return (
    <section>
      <SectionHeader index="03" title="Performance Specs" meta="LIVE // 1.4Hz" />
      <table className="w-full border-collapse text-xs">
        <caption className="sr-only">Simulated diagnostic data</caption>
        <thead>
          <tr className="text-left text-[10px] tracking-[0.2em] text-muted">
            <th scope="col" className="pb-2 font-normal">PARAM</th>
            <th scope="col" className="hidden pb-2 font-normal sm:table-cell">SIGNAL</th>
            <th scope="col" className="pb-2 text-right font-normal">READOUT</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-steel/70">
              <th scope="row" className="py-2.5 pr-3 text-left font-normal text-muted uppercase tracking-wider">
                {row.label}
              </th>
              <td className="hidden w-[38%] py-2.5 pr-4 sm:table-cell">
                <div className="h-1.5 w-full bg-steel/60" aria-hidden>
                  <div
                    className={`h-full transition-[width] duration-500 ${row.level === "elevated" ? "bg-amber-300" : "bg-matrix"}`}
                    style={{ width: `${Math.min(100, Math.max(2, row.meter * 100))}%` }}
                  />
                </div>
              </td>
              <td className={`py-2.5 text-right tabular-nums ${LEVEL_STYLE[row.level]}`}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
