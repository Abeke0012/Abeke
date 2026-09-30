"use client";

import { useInView } from "framer-motion";
import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { stackFor } from "@/components/hero/looks";
import useQuality from "@/components/hero/useQuality";
import { buildTotal, COMBOS, describe, type Combo } from "@/lib/menu";
import { formatPrice, openInBuilder, ORDER_URL } from "@/lib/site";
import { Reveal, Section, SectionHeading } from "./ui";

const BurgerStage = dynamic(() => import("./BurgerStage"), { ssr: false });

function Card({ combo, index }: { combo: Combo; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: "100px" });
  const [open, setOpen] = useState(false);
  const quality = useQuality();
  const stack = useMemo(() => stackFor(combo.build), [combo]);

  return (
    <Reveal delay={index * 0.1} className="h-full">
      <article
        ref={ref}
        onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
        className="group flex h-full flex-col overflow-hidden rounded-3xl bg-char"
      >
        <button
          type="button"
          aria-label={`Показать слои: ${combo.name}`}
          onClick={() => setOpen((o) => !o)}
          className="relative aspect-square w-full bg-[radial-gradient(60%_50%_at_50%_58%,rgb(255_106_26/0.16),transparent_70%)]"
        >
          <BurgerStage stack={stack} open={open} active={inView} quality={quality} />
        </button>
        <div className="flex flex-1 flex-col gap-3 p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-display text-xl font-bold">{combo.name}</h3>
            <p className="shrink-0 font-display text-lg font-bold tabular-nums text-flame">{formatPrice(buildTotal(combo.build))}</p>
          </div>
          <p className="text-sm leading-relaxed text-smoke">{describe(combo.build)}</p>
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <a href={ORDER_URL} className="rounded-full bg-ink px-5 py-3 font-display text-[11px] font-bold tracking-[0.16em] text-coal transition hover:bg-flame">
              ЗАКАЗАТЬ
            </a>
            <button
              type="button"
              onClick={() => openInBuilder(combo.build)}
              className="rounded-full border border-line px-5 py-3 text-sm text-ink transition hover:border-flame hover:text-flame"
            >
              Изменить под себя
            </button>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

export default function Combos() {
  return (
    <Section id="combo" className="bg-char/40">
      <SectionHeading
        eyebrow="ГОТОВЫЕ КОМБО"
        title="Не хочешь собирать — возьми готовое"
        intro="Любое комбо можно доработать под себя одним движением. Наведите или нажмите на бургер, чтобы увидеть слои."
      />
      <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {COMBOS.map((c, i) => (
          <Card key={c.id} combo={c} index={i} />
        ))}
      </div>
    </Section>
  );
}
