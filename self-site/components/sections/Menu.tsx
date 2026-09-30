"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { MENU_SIZE, MENU_TABS } from "@/lib/menu";
import { formatPrice } from "@/lib/site";
import { Reveal, Section, SectionHeading } from "./ui";

export default function Menu() {
  const [tab, setTab] = useState(MENU_TABS[0].id);
  const current = MENU_TABS.find((c) => c.id === tab)!;

  return (
    <Section id="menu">
      <SectionHeading
        eyebrow="МЕНЮ"
        title="Всё, из чего собирается твой бургер"
        intro={`${MENU_SIZE} позиций: булочки, котлеты, начинки, соусы, гарниры и напитки. Цена каждой видна сразу.`}
      />

      <Reveal delay={0.1} className="mt-14">
        <div role="tablist" aria-label="Категории меню" className="-mx-5 flex gap-1 overflow-x-auto border-b border-line px-5 md:mx-0 md:flex-wrap md:px-0">
          {MENU_TABS.map((c) => (
            <button
              key={c.id}
              role="tab"
              id={`tab-${c.id}`}
              aria-selected={tab === c.id}
              aria-controls={`panel-${c.id}`}
              onClick={() => setTab(c.id)}
              className={`relative shrink-0 px-4 pb-4 pt-2 text-base transition-colors md:text-lg ${tab === c.id ? "text-ink" : "text-smoke hover:text-ink"}`}
            >
              {c.label}
              {tab === c.id && <motion.span layoutId="menu-tab" className="absolute inset-x-3 -bottom-px h-0.5 bg-flame" />}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            role="tabpanel"
            id={`panel-${current.id}`}
            aria-labelledby={`tab-${current.id}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {current.note && <p className="mt-6 text-smoke">{current.note}</p>}
            <ul className="mt-2 grid gap-x-16 md:grid-cols-2">
              {current.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-6 border-b border-line py-5">
                  <h3 className="min-w-0 text-lg font-medium">{item.name}</h3>
                  <dl className="flex shrink-0 flex-col items-end gap-1">
                    {item.options.map((o) => (
                      <div key={o.portion} className="flex items-baseline gap-4">
                        <dt className="text-sm tabular-nums text-smoke">{o.portion}</dt>
                        <dd className="w-24 text-right font-display font-bold tabular-nums">{formatPrice(o.price)}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>
      </Reveal>
    </Section>
  );
}
