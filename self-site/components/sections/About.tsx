"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";
import { MENU_SIZE } from "@/lib/menu";
import { formatPrice, INFO } from "@/lib/site";
import { Reveal, Section } from "./ui";

const FACTS = [
  { value: `от ${formatPrice(INFO.priceFrom)}`, label: "цена бургера" },
  { value: String(MENU_SIZE), label: "позиций в меню" },
  { value: INFO.delivery, label: "среднее время доставки" },
];

export default function About() {
  const frame = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: frame, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <Section id="about">
      <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div className="order-2 lg:order-1">
          <Reveal>
            <p className="font-display text-xs font-bold tracking-[0.32em] text-flame">О БРЕНДЕ</p>
            <h2 className="mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] font-bold leading-[1.02] tracking-[-0.02em]">
              Бургерная, где решаешь ты
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-7 flex max-w-xl flex-col gap-5 text-lg leading-relaxed text-smoke">
            <p>
              SELF — бургерная нового формата: здесь нет одного «стандартного» бургера. Гость сам собирает свой — выбирает
              булочку, котлету (можно сразу несколько видов), начинки, соусы, гарнир и напиток — и видит итоговую цену сразу,
              без скрытых доплат.
            </p>
            <p>
              Никаких навязанных решений и лишних вопросов — только понятные шаги сборки и уверенность, что в бургере лежит
              именно то, что выбрал ты сам.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <dl className="mt-12 grid grid-cols-1 gap-6 border-t border-line pt-8 sm:grid-cols-3">
              {FACTS.map((f) => (
                <div key={f.label}>
                  <dt className="sr-only">{f.label}</dt>
                  <dd className="font-display text-[clamp(1.4rem,2.6vw,2.1rem)] font-bold tabular-nums text-ink">{f.value}</dd>
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
              alt="Бургер SELF на бриоши с говяжьей котлетой, сыром и карамелизированным луком"
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
