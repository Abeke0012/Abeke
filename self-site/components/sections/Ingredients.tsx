"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";
import { RevealItem, Section, SectionHeading } from "./ui";

/** Listed top to bottom, the same order as the layers in the photo. */
const LAYERS = [
  { name: "Бриошь", note: "Сливочное тесто, глянцевая корочка. Срез обжариваем на плите перед сборкой, чтобы булка держала сок." },
  { name: "Карамелизированный лук", note: "Томим на медленном огне около 40 минут, пока он не станет мягким, сладким и янтарным." },
  { name: "Чеддер", note: "Кладём на котлету в последнюю минуту жарки и накрываем, чтобы сыр расплавился и стёк по краям." },
  { name: "Говяжья котлета", note: "150 г говяжьего фарша. Жарим на раскалённой плите до плотной тёмной корочки, сохраняя сок внутри." },
  { name: "Соус SELF", note: "Сливочный, с копчёной паприкой и горчицей. Наш рецепт — его нет в магазинах." },
  { name: "Нижняя бриошь", note: "Та же бриошь, поджаренная срезом вверх: основа, которая не размокает до последнего укуса." },
];

export default function Ingredients() {
  const photo = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: photo, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.12, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [-30, 30]);

  return (
    <Section id="ingredients" className="bg-char">
      <SectionHeading
        eyebrow="ИНГРЕДИЕНТЫ"
        title="Шесть слоёв. Ни одного лишнего."
        intro="Мы собираем бургер в одном и том же порядке, потому что каждый слой делает свою работу."
      />
      <div className="mt-16 grid items-start gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <div ref={photo} className="relative overflow-hidden rounded-3xl lg:sticky lg:top-28">
          <motion.div style={{ scale, y }} className="relative aspect-[658/420] w-full">
            <Image
              src="/images/burger-layers.webp"
              alt="Бургер SELF в разрезе по слоям: бриошь, карамелизированный лук, чеддер, говяжья котлета, соус, нижняя бриошь"
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
            />
          </motion.div>
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-line" />
        </div>

        <ol className="flex flex-col">
          {LAYERS.map((layer, i) => (
            <RevealItem
              key={layer.name}
              delay={i * 0.05}
              className="grid grid-cols-[3.5rem_1fr] gap-4 border-t border-line py-7 first:border-t-0 first:pt-0"
            >
              <span className="font-display text-sm font-bold tabular-nums text-flame">{String(LAYERS.length - i).padStart(2, "0")}</span>
              <div>
                <h3 className="font-display text-xl font-bold">{layer.name}</h3>
                <p className="mt-2 leading-relaxed text-smoke">{layer.note}</p>
              </div>
            </RevealItem>
          ))}
        </ol>
      </div>
    </Section>
  );
}
