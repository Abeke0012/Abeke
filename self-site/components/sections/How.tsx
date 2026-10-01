"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { type Build, BUNS, MAX_PATTIES, MAX_SAUCES, PATTIES, SAUCES, SIDES, TOPPINGS } from "@/lib/menu";
import { formatPrice, INFO } from "@/lib/site";
import Burger3D from "./Burger3D";
import { RevealItem, Section, SectionHeading } from "./ui";

/** A full build shown open, so every step on the right has a layer on the left. */
const LAYERED: Build = { bun: "sesame", patties: ["beef", "beef"], toppings: ["cheese", "tomato", "lettuce", "redOnion"], sauces: ["bbq"] };

const min = (list: readonly { options: { price: number }[] }[]) => Math.min(...list.map((i) => i.options[0].price));

/** The order a guest builds a burger in, with real counts and prices from the menu. */
const STEPS = [
  { name: "Булочка", note: `Классическая с кунжутом, бриошь или чёрная — от ${formatPrice(min(BUNS))}.` },
  { name: "Котлеты", note: `${PATTIES.length} видов: говядина, курица, куриное филе, томлёное мясо, сёмга. До ${MAX_PATTIES} котлет в одном бургере, можно разных.` },
  { name: "Начинки", note: `${TOPPINGS.length} ингредиентов — от солёных огурцов до обжаренных шампиньонов. От ${formatPrice(min(TOPPINGS))} за порцию.` },
  { name: "Соусы", note: `${SAUCES.length} соусов, до ${MAX_SAUCES} на бургер: от BBQ и ранча до вишнёвого.` },
  { name: "Гарнир и напиток", note: `${SIDES.length} гарниров от ${formatPrice(min(SIDES))}, лимонады, газировка и вода.` },
  {
    name: "Получаешь как удобно",
    note: `Курьер до двери за ${INFO.delivery} или самовывоз: готово за ${INFO.pickupReady}, скидка −${INFO.pickupDiscount}%.`,
  },
];

export default function How() {
  const photo = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: photo, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.12, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [-30, 30]);

  return (
    <Section id="how" className="bg-char">
      <SectionHeading
        eyebrow="КАК ЭТО РАБОТАЕТ"
        title="Выбираешь. Собираешь. Получаешь."
        intro="Ничего не добавляем за тебя и не прячем состав. Каждый слой и его цена видны сразу — без сюрпризов в конце."
      />
      <div className="mt-16 grid items-start gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <div ref={photo} className="relative overflow-hidden rounded-3xl lg:sticky lg:top-28">
          <motion.div style={{ scale, y }} className="relative aspect-[658/420] w-full bg-coal bg-[radial-gradient(55%_60%_at_50%_55%,rgb(255_106_26/0.18),transparent_72%)]">
            <Burger3D build={LAYERED} open label="Бургер SELF в разрезе по слоям: булочка, котлеты, сыр, помидор, салат, лук и соус" />
          </motion.div>
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-line" />
        </div>

        <ol className="flex flex-col">
          {STEPS.map((step, i) => (
            <RevealItem
              key={step.name}
              delay={i * 0.05}
              className="grid grid-cols-[3.5rem_1fr] gap-4 border-t border-line py-7 first:border-t-0 first:pt-0"
            >
              <span className="font-display text-sm font-bold tabular-nums text-flame">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="font-display text-xl font-bold">{step.name}</h3>
                <p className="mt-2 leading-relaxed text-smoke">{step.note}</p>
              </div>
            </RevealItem>
          ))}
        </ol>
      </div>
    </Section>
  );
}
