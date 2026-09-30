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
                  <dd className="whitespace-nowrap font-display text-[clamp(1.2rem,1.9vw,1.75rem)] font-bold tabular-nums text-ink">{f.value}</dd>
                  <dd className="mt-1 text-sm text-smoke">{f.label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
        <div
          ref={frame}
          className="relative order-1 aspect-[4/5] overflow-hidden rounded-3xl bg-char bg-[radial-gradient(60%_45%_at_50%_55%,rgb(255_106_26/0.28),transparent_72%)] lg:order-2"
        >
          <motion.div style={{ y }} className="absolute inset-x-[6%] inset-y-0">
            <Image
              src="/images/burger-photo.webp"
              alt="Бургер на кунжутной булочке с говяжьей котлетой, сыром, помидором, салатом и огурцами"
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)]"
            />
          </motion.div>
        </div>
      </div>
    </Section>
  );
}
