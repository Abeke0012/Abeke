"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { MENU } from "@/lib/menu";
import { formatPrice } from "@/lib/site";
import { Reveal, Section, SectionHeading } from "./ui";

export default function Menu() {
  const [tab, setTab] = useState<(typeof MENU)[number]["id"]>("burgers");
  const current = MENU.find((c) => c.id === tab)!;

  return (
    <Section id="menu">
      <SectionHeading eyebrow="МЕНЮ" title="Всё, что жарим сегодня" intro="Котлеты формуем из говяжьего фарша каждое утро, лук томим, пока не станет янтарным." />

      <Reveal delay={0.1} className="mt-14">
        <div role="tablist" aria-label="Категории меню" className="flex flex-wrap gap-2 border-b border-line">
          {MENU.map((c) => (
            <button
              key={c.id}
              role="tab"
              id={`tab-${c.id}`}
              aria-selected={tab === c.id}
              aria-controls={`panel-${c.id}`}
              onClick={() => setTab(c.id)}
              className={`relative px-4 pb-4 pt-2 text-base transition-colors md:text-lg ${tab === c.id ? "text-ink" : "text-smoke hover:text-ink"}`}
            >
              {c.label}
              {tab === c.id && <motion.span layoutId="menu-tab" className="absolute inset-x-3 -bottom-px h-0.5 bg-flame" />}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.ul
            key={current.id}
            role="tabpanel"
            id={`panel-${current.id}`}
            aria-labelledby={`tab-${current.id}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="grid gap-x-16 md:grid-cols-2"
          >
            {current.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-6 border-b border-line py-7">
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold md:text-xl">{item.name}</h3>
                  <p className="mt-2 max-w-md text-smoke">{item.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-lg font-bold tabular-nums text-ink">{formatPrice(item.price)}</p>
                  <p className="mt-1 text-sm tabular-nums text-smoke">{item.portion}</p>
                </div>
              </li>
            ))}
          </motion.ul>
        </AnimatePresence>
      </Reveal>
    </Section>
  );
}
