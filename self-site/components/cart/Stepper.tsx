"use client";

export default function Stepper({ value, onChange, label, max = 99, min = 0 }: { value: number; onChange: (v: number) => void; label: string; max?: number; min?: number }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Меньше: ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="grid h-9 w-9 place-items-center rounded-full border border-line text-lg transition hover:border-ink/40 disabled:opacity-30"
      >
        −
      </button>
      <span className={`w-5 text-center font-display font-bold tabular-nums ${value ? "text-flame" : "text-smoke"}`} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Больше: ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="grid h-9 w-9 place-items-center rounded-full border border-line text-lg transition hover:border-flame hover:text-flame disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
