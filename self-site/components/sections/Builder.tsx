"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import ExtrasPicker from "@/components/cart/ExtrasPicker";
import { stackFor } from "@/components/hero/looks";
import useQuality from "@/components/hero/useQuality";
import {
  BUNS,
  buildLines,
  buildTotal,
  MAX_PATTIES,
  MAX_SAUCES,
  PATTIES,
  SAUCES,
  TOPPINGS,
  type Build,
  type PattyId,
  type SauceId,
  type ToppingId,
} from "@/lib/menu";
import { formatPrice, onOpenInBuilder } from "@/lib/site";
import { Reveal, Section, SectionHeading } from "./ui";

const BurgerStage = dynamic(() => import("./BurgerStage"), { ssr: false });

const START: Build = { bun: "brioche", patties: ["beef"], toppings: ["cheese"], sauces: [] };

const chip = (on: boolean) =>
  `rounded-full border px-4 py-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-35 ${
    on ? "border-flame bg-flame text-coal" : "border-line text-ink hover:border-ink/40"
  }`;

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line py-8 first:border-t-0 first:pt-0">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-bold">
          <span className="mr-3 tabular-nums text-flame">{String(n).padStart(2, "0")}</span>
          {title}
        </h3>
        {hint && <p className="text-sm text-smoke">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Summary({ build, onReset, onAdd }: { build: Build; onReset: () => void; onAdd: () => void }) {
  const { cart, open } = useCart();
  const lines = buildLines(build);
  const total = buildTotal(build);
  const inCart = cart.burgers.reduce((n, b) => n + b.qty, 0);
  return (
    <div>
      <div className="rotate-[-0.6deg] drop-shadow-[0_24px_30px_rgba(0,0,0,0.55)]">
      <div className="receipt relative bg-ink px-6 pb-9 pt-6 text-coal">
        <div className="flex items-center justify-between border-b-2 border-dashed border-coal/25 pb-4">
          <p className="font-display text-xl font-black tracking-[-0.02em]">SELF</p>
          <p className="font-display text-[10px] font-bold tracking-[0.3em] text-coal/55">ТВОЙ ЧЕК</p>
        </div>
        <ul className="mt-4 flex max-h-40 flex-col gap-2 overflow-y-auto pr-1 text-sm">
          <AnimatePresence initial={false}>
            {lines.map((l, i) => (
              <motion.li
                key={`${l.name}-${i}`}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="flex items-baseline gap-2"
              >
                <span className="min-w-0 font-medium">{l.name}</span>
                <span className="mb-1 min-w-4 flex-1 border-b-2 border-dotted border-coal/25" />
                <span className="shrink-0 tabular-nums text-coal/70">{formatPrice(l.price)}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <div className="mt-4 flex items-baseline justify-between border-t-2 border-dashed border-coal/25 pt-4">
          <p className="font-display text-xs font-bold tracking-[0.24em]">ИТОГО</p>
          <motion.p key={total} initial={{ opacity: 0.4, y: -6 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl font-black tabular-nums">
            {formatPrice(total)}
          </motion.p>
        </div>
      </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onAdd}
          className="flex-1 rounded-full bg-flame px-6 py-4 text-center font-display text-xs font-bold tracking-[0.18em] text-coal transition hover:bg-ink"
        >
          <span className="hidden sm:inline">ДОБАВИТЬ </span>В ЗАКАЗ · {formatPrice(total)}
        </button>
        <button type="button" onClick={onReset} className="rounded-full border border-line px-5 py-4 text-sm text-smoke transition hover:text-ink">
          Сбросить
        </button>
      </div>
      {inCart > 0 && (
        <button type="button" onClick={open} className="mt-4 w-full text-center text-sm text-smoke underline-offset-4 transition hover:text-ink hover:underline">
          В заказе бургеров: {inCart} — открыть заказ
        </button>
      )}
    </div>
  );
}

export default function Builder() {
  const [build, setBuild] = useState<Build>(START);
  const [flash, setFlash] = useState<string | null>(null);
  const quality = useQuality();
  const preview = useRef<HTMLDivElement>(null);
  const inView = useInView(preview, { margin: "100px" });
  const stack = useMemo(() => stackFor(build), [build]);
  const { addBurger } = useCart();

  const note = (text: string) => {
    setFlash(text);
    window.setTimeout(() => setFlash((f) => (f === text ? null : f)), 2600);
  };

  // A combo opens here as a burger; its side is picked separately in step 5.
  useEffect(
    () =>
      onOpenInBuilder((b) => {
        setBuild({ bun: b.bun, patties: [...b.patties], toppings: [...b.toppings], sauces: [...b.sauces] });
        if (b.side) note("Гарнир из комбо можно добавить в шаге 5");
      }),
    [],
  );

  const add = () => {
    const name = addBurger(build);
    note(`${name} в заказе. Можно собрать следующий`);
  };

  const count = (p: PattyId) => build.patties.filter((x) => x === p).length;
  const addPatty = (p: PattyId) => {
    if (build.patties.length >= MAX_PATTIES) return note(`В бургер помещается до ${MAX_PATTIES} котлет`);
    setBuild({ ...build, patties: [...build.patties, p] });
  };
  const removePatty = (p: PattyId) => {
    const i = build.patties.lastIndexOf(p);
    if (i < 0) return;
    if (build.patties.length === 1) return note("В бургере должна быть хотя бы одна котлета");
    setBuild({ ...build, patties: build.patties.filter((_, j) => j !== i) });
  };
  const toggleTopping = (t: ToppingId) =>
    setBuild({ ...build, toppings: build.toppings.includes(t) ? build.toppings.filter((x) => x !== t) : [...build.toppings, t] });
  const toggleSauce = (s: SauceId) => {
    if (build.sauces.includes(s)) return setBuild({ ...build, sauces: build.sauces.filter((x) => x !== s) });
    if (build.sauces.length >= MAX_SAUCES) return note(`Можно выбрать до ${MAX_SAUCES} соусов`);
    setBuild({ ...build, sauces: [...build.sauces, s] });
  };

  return (
    <Section id="builder">
      <SectionHeading
        eyebrow="КОНСТРУКТОР"
        title="Твой бургер. Твои правила."
        intro="Выбирай булочку, котлеты и всё, что после. Каждый слой и его цена видны сразу — без сюрпризов в конце."
      />

      <div className="mt-14 grid items-start gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        {/* preview */}
        <div className="sticky top-16 z-10 -mx-5 bg-coal/90 px-5 pb-3 backdrop-blur-md md:top-[72px] lg:top-24 lg:mx-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
          <div ref={preview} className="relative h-[34svh] w-full overflow-hidden rounded-3xl bg-char bg-[radial-gradient(60%_50%_at_50%_60%,rgb(255_106_26/0.16),transparent_70%)] lg:h-[min(44svh,520px)]">
            <BurgerStage stack={stack} active={inView} quality={quality} dropIn />
            <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 lg:hidden">
              <p className="rounded-full bg-coal/80 px-4 py-2 font-display text-lg font-bold tabular-nums">{formatPrice(buildTotal(build))}</p>
              <button type="button" onClick={add} className="pointer-events-auto rounded-full bg-flame px-5 py-3 font-display text-xs font-bold tracking-[0.16em] text-coal">
                В ЗАКАЗ
              </button>
            </div>
            <AnimatePresence>
              {flash && (
                <motion.p
                  role="status"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-x-4 top-4 rounded-2xl bg-ink px-4 py-3 text-center text-sm font-medium text-coal"
                >
                  {flash}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <div className="mt-6 hidden lg:block">
            <Summary build={build} onReset={() => setBuild(START)} onAdd={add} />
          </div>
        </div>

        {/* steps */}
        <Reveal>
          <Step n={1} title="Булочка">
            <div role="radiogroup" aria-label="Булочка" className="grid gap-3 sm:grid-cols-3">
              {BUNS.map((b) => {
                const on = build.bun === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setBuild({ ...build, bun: b.id })}
                    className={`rounded-2xl border p-4 text-left transition ${on ? "border-flame bg-flame/10" : "border-line hover:border-ink/40"}`}
                  >
                    <span className="block font-medium">{b.name}</span>
                    <span className="mt-1 block text-sm tabular-nums text-smoke">
                      {b.options[0].portion} · {formatPrice(b.options[0].price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </Step>

          <Step n={2} title="Котлеты" hint={`${build.patties.length} из ${MAX_PATTIES} · можно разные`}>
            <ul className="flex flex-col divide-y divide-line">
              {PATTIES.map((p) => {
                const c = count(p.id);
                return (
                  <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm tabular-nums text-smoke">
                        {p.options[0].portion} · {formatPrice(p.options[0].price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label={`Убрать: ${p.name}`}
                        disabled={c === 0}
                        onClick={() => removePatty(p.id)}
                        className="grid h-10 w-10 place-items-center rounded-full border border-line text-lg transition hover:border-ink/40 disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className={`w-5 text-center font-display font-bold tabular-nums ${c ? "text-flame" : "text-smoke"}`}>{c}</span>
                      <button
                        type="button"
                        aria-label={`Добавить: ${p.name}`}
                        onClick={() => addPatty(p.id)}
                        className="grid h-10 w-10 place-items-center rounded-full border border-line text-lg transition hover:border-flame hover:text-flame"
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Step>

          <Step n={3} title="Ингредиенты" hint="Сколько угодно">
            <div className="flex flex-wrap gap-2">
              {TOPPINGS.map((t) => {
                const on = build.toppings.includes(t.id);
                return (
                  <button key={t.id} type="button" aria-pressed={on} onClick={() => toggleTopping(t.id)} className={chip(on)}>
                    {t.name} <span className={on ? "text-coal/70" : "text-smoke"}>+{formatPrice(t.options[0].price)}</span>
                  </button>
                );
              })}
            </div>
          </Step>

          <Step n={4} title="Соусы" hint={`${build.sauces.length} из ${MAX_SAUCES}`}>
            <div className="flex flex-wrap gap-2">
              {SAUCES.map((s) => {
                const on = build.sauces.includes(s.id);
                return (
                  <button key={s.id} type="button" aria-pressed={on} onClick={() => toggleSauce(s.id)} className={chip(on)}>
                    {s.name} <span className={on ? "text-coal/70" : "text-smoke"}>+{formatPrice(s.options[0].price)}</span>
                  </button>
                );
              })}
            </div>
          </Step>

          <Step n={5} title="Гарниры и напитки к заказу" hint="Любое количество">
            <ExtrasPicker />
          </Step>

          <div className="lg:hidden">
            <Summary build={build} onReset={() => setBuild(START)} onAdd={add} />
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
