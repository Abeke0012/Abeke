import { PROTOCOLS, type ProtocolId } from "@/lib/menu-machine";
import { SectionHeader } from "./SectionHeader";

interface Props {
  value: Record<ProtocolId, boolean>;
  disabled: boolean;
  onToggle: (protocol: ProtocolId) => void;
}

export function ProtocolMatrix({ value, disabled, onToggle }: Props) {
  const armed = PROTOCOLS.filter((p) => value[p.id]).length;
  return (
    <section>
      <SectionHeader index="02" title="Protocol Add-ons" meta={`${armed}/${PROTOCOLS.length} ARMED`} />
      <ul className="divide-y divide-steel border border-steel">
        {PROTOCOLS.map((p) => {
          const on = value[p.id];
          return (
            <li key={p.id}>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                disabled={disabled}
                onClick={() => onToggle(p.id)}
                className={`grid w-full grid-cols-[1fr_auto] items-center gap-4 px-4 py-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  on ? "bg-matrix/[0.07]" : "hover:bg-white/[0.03]"
                }`}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-[10px] tracking-[0.2em] text-muted">
                    <span className={on ? "text-matrix" : ""}>{p.code}</span>
                    <span>+${p.price.toFixed(2)}</span>
                  </span>
                  <span className={`mt-1 block text-sm ${on ? "text-matrix" : "text-white"}`}>{p.label}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted">{p.detail}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className={`hidden text-[10px] tracking-[0.2em] sm:inline ${on ? "text-matrix animate-blink" : "text-muted"}`}>
                    {on ? "ENGAGED" : "STANDBY"}
                  </span>
                  <span
                    aria-hidden
                    className={`relative h-5 w-10 border transition-colors ${on ? "border-matrix bg-matrix/20" : "border-steel bg-black"}`}
                  >
                    <span
                      className={`absolute top-[3px] h-3 w-3 transition-all duration-150 ${
                        on ? "left-[23px] bg-matrix shadow-[0_0_10px_#00FF66]" : "left-[3px] bg-steel"
                      }`}
                    />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
