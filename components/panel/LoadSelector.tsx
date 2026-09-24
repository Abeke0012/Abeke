import { LOADS, formatPrice, type LoadId } from "@/lib/menu-machine";
import { SectionHeader } from "./SectionHeader";

interface Props {
  value: LoadId;
  disabled: boolean;
  onSelect: (load: LoadId) => void;
}

export function LoadSelector({ value, disabled, onSelect }: Props) {
  return (
    <section aria-labelledby="load-heading">
      <SectionHeader index="01" title="System Load" meta="SIZE_SELECT" />
      <h2 id="load-heading" className="sr-only">System load (size)</h2>
      <div role="radiogroup" aria-label="System load" className="grid grid-cols-3 gap-2 sm:gap-3">
        {LOADS.map((load) => {
          const active = load.id === value;
          return (
            <button
              key={load.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onSelect(load.id)}
              className={`group relative flex flex-col items-start gap-3 border p-3 text-left transition-colors sm:p-4 disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? "border-matrix bg-matrix/10 text-matrix shadow-[0_0_24px_-6px_#00FF66]"
                  : "border-steel text-muted hover:border-matrix/60 hover:text-white"
              }`}
            >
              <span className="text-[10px] tracking-[0.2em]">{load.code}</span>
              {/* Stack glyph: one bar per patty */}
              <span className="flex h-9 flex-col-reverse justify-start gap-[3px]" aria-hidden>
                {Array.from({ length: load.patties }).map((_, i) => (
                  <span
                    key={i}
                    className={`block h-[5px] w-10 ${active ? "bg-matrix" : "bg-steel group-hover:bg-matrix/50"}`}
                  />
                ))}
              </span>
              <span className="text-xs leading-tight font-bold tracking-wider sm:text-sm">{load.label}</span>
              <span className="flex w-full flex-wrap justify-between gap-1 text-[10px] tracking-wider sm:text-[11px]">
                <span>{load.spec}</span>
                <span className={active ? "text-matrix" : "text-white/70"}>{formatPrice(load.price)}</span>
              </span>
              {active && <span className="absolute top-2 right-2 h-1.5 w-1.5 bg-matrix animate-blink" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
