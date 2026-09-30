"use client";

import { useInView } from "framer-motion";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import useQuality from "@/components/hero/useQuality";
import { BURGERS, type Burger } from "@/lib/menu";
import { formatPrice, ORDER_URL } from "@/lib/site";
import { Reveal, Section, SectionHeading } from "./ui";

const BurgerStage = dynamic(() => import("./BurgerStage"), { ssr: false });

const PICKS = ["classic", "double", "onion"].map((id) => BURGERS.find((b) => b.id === id)!);

function Card({ burger, index }: { burger: Burger; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: "100px" });
  const [open, setOpen] = useState(false);
  const quality = useQuality();

  return (
    <Reveal delay={index * 0.12}>
      <article
        ref={ref}
        onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
        onPointerUp={(e) => e.pointerType !== "mouse" && setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-char"
      >
        <div className="relative aspect-[4/5] w-full bg-[radial-gradient(60%_50%_at_50%_58%,rgb(255_106_26/0.16),transparent_70%)]">
          <BurgerStage stack={burger.stack} open={open} active={inView} quality={quality} />
          <span className="absolute left-5 top-5 font-display text-xs font-bold tracking-[0.28em] text-smoke">
            {burger.portion}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-6 md:p-7">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-display text-2xl font-bold">{burger.name}</h3>
            <p className="font-display text-lg font-bold tabular-nums text-flame">{formatPrice(burger.price)}</p>
          </div>
          <p className="text-smoke">{burger.description}</p>
          <a
            href={ORDER_URL}
            className="mt-auto inline-flex w-fit items-center gap-2 pt-3 font-display text-xs font-bold tracking-[0.2em] text-ink transition group-hover:text-flame"
          >
            ЗАКАЗАТЬ <span aria-hidden>→</span>
          </a>
        </div>
      </article>
    </Reveal>
  );
}

export default function Popular() {
  return (
    <Section id="popular" className="bg-coal">
      <SectionHeading
        eyebrow="ПОПУЛЯРНОЕ"
        title="Три бургера, ради которых возвращаются"
        intro="Наведите на бургер или коснитесь его, чтобы заглянуть внутрь."
      />
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {PICKS.map((b, i) => (
          <Card key={b.id} burger={b} index={i} />
        ))}
      </div>
    </Section>
  );
}
