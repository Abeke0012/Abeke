export function SectionHeader({ index, title, meta }: { index: string; title: string; meta?: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-3 border-b border-steel pb-2 text-[11px] tracking-[0.2em] uppercase">
      <span className="text-matrix">{index}</span>
      <span className="text-white">{title}</span>
      <span className="flex-1 overflow-hidden whitespace-nowrap text-steel select-none">
        ····································································
      </span>
      {meta && <span className="text-muted">{meta}</span>}
    </div>
  );
}
