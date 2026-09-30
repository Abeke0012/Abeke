"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";
import { Reveal, Section } from "./ui";

const FACTS = [
  { value: "150 г", label: "говядины в каждой котлете" },
  { value: "40 мин", label: "томим лук до карамели" },
  { value: "6", label: "слоёв в SELF Classic" },
];

export default function About() {
  const frame = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: frame, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <Section id="about" className="bg-char">
      <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div className="order-2 lg:order-1">
          <Reveal>
            <p className="font-display text-xs font-bold tracking-[0.32em] text-flame">О БРЕНДЕ</p>
            <h2 className="mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] font-bold leading-[1.02] tracking-[-0.02em]">
              Бургер, который говорит сам за себя
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-7 flex max-w-xl flex-col gap-5 text-lg leading-relaxed text-smoke">
            <p>
              SELF — это про уверенный вкус без компромиссов. Мы не прячем бургер за длинным меню: несколько рецептов,
              доведённых до точности, и продукты, которые видно в разрезе.
            </p>
            <p>Горячая котлета, тянущийся чеддер, сладкий лук и бриошь, которая держит всё вместе. Смело. Просто. Сытно.</p>
          </Reveal>
          <Reveal delay={0.2}>
            <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-line pt-8">
              {FACTS.map((f) => (
                <div key={f.label}>
                  <dt className="sr-only">{f.label}</dt>
                  <dd className="font-display text-[clamp(1.6rem,3vw,2.5rem)] font-bold tabular-nums text-ink">{f.value}</dd>
                  <dd className="mt-1 text-sm text-smoke">{f.label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
        <div ref={frame} className="relative order-1 aspect-[4/5] overflow-hidden rounded-3xl lg:order-2">
          <motion.div style={{ y }} className="absolute -inset-y-[10%] inset-x-0">
            <Image
              src="/images/burger-signature.webp"
              alt="SELF Classic: бриошь, карамелизированный лук, расплавленный чеддер и говяжья котлета"
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover object-center"
            />
          </motion.div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-coal/60 via-transparent to-transparent" />
        </div>
      </div>
    </Section>
  );
}
