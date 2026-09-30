"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { stackFor } from "@/components/hero/looks";
import useQuality from "@/components/hero/useQuality";
import {
  BUNS,
  buildLines,
  buildTotal,
  DRINKS,
  MAX_PATTIES,
  MAX_SAUCES,
  PATTIES,
  SAUCES,
  SIDES,
  TOPPINGS,
  type Build,
  type PattyId,
  type SauceId,
  type ToppingId,
} from "@/lib/menu";
import { formatPrice, onOpenInBuilder, ORDER_URL } from "@/lib/site";
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

function Summary({ build, onReset }: { build: Build; onReset: () => void }) {
  const lines = buildLines(build);
  const total = buildTotal(build);
  return (
    <div className="rounded-3xl bg-char p-6 ring-1 ring-inset ring-line">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm text-smoke">Итого</p>
        <motion.p key={total} initial={{ opacity: 0.4, y: -6 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl font-bold tabular-nums">
          {formatPrice(total)}
        </motion.p>
      </div>
      <ul className="mt-5 flex max-h-56 flex-col gap-2 overflow-y-auto pr-1 text-sm">
        {lines.map((l, i) => (
          <li key={`${l.name}-${i}`} className="flex justify-between gap-4 text-ink/80">
            <span className="min-w-0">{l.name}</span>
            <span className="shrink-0 tabular-nums text-smoke">{formatPrice(l.price)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={ORDER_URL} className="flex-1 rounded-full bg-flame px-6 py-4 text-center font-display text-xs font-bold tracking-[0.18em] text-coal transition hover:bg-ink">
          ЗАКАЗАТЬ · {formatPrice(total)}
        </a>
        <button type="button" onClick={onReset} className="rounded-full border border-line px-5 py-4 text-sm text-smoke transition hover:text-ink">
          Сбросить
        </button>
      </div>
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

  useEffect(() => onOpenInBuilder((b) => setBuild({ ...b, patties: [...b.patties], toppings: [...b.toppings], sauces: [...b.sauces] })), []);

  const note = (text: string) => {
    setFlash(text);
    window.setTimeout(() => setFlash((f) => (f === text ? null : f)), 2200);
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
          <div ref={preview} className="relative h-[34svh] w-full overflow-hidden rounded-3xl bg-char bg-[radial-gradient(60%_50%_at_50%_60%,rgb(255_106_26/0.16),transparent_70%)] lg:aspect-square lg:h-auto">
            <BurgerStage stack={stack} active={inView} quality={quality} dropIn />
            <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 lg:hidden">
              <p className="rounded-full bg-coal/80 px-4 py-2 font-display text-lg font-bold tabular-nums">{formatPrice(buildTotal(build))}</p>
              <a href={ORDER_URL} className="pointer-events-auto rounded-full bg-flame px-5 py-3 font-display text-xs font-bold tracking-[0.16em] text-coal">
                ЗАКАЗАТЬ
              </a>
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
            <Summary build={build} onReset={() => setBuild(START)} />
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

          <Step n={5} title="Гарнир">
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={!build.side} onClick={() => setBuild({ ...build, side: undefined })} className={chip(!build.side)}>
                Без гарнира
              </button>
              {SIDES.map((s) => {
                const on = build.side === s.id;
                return (
                  <button key={s.id} type="button" aria-pressed={on} onClick={() => setBuild({ ...build, side: s.id })} className={chip(on)}>
                    {s.name} <span className={on ? "text-coal/70" : "text-smoke"}>{formatPrice(s.options[0].price)}</span>
                  </button>
                );
              })}
            </div>
          </Step>

          <Step n={6} title="Напиток">
            <button type="button" aria-pressed={!build.drink} onClick={() => setBuild({ ...build, drink: undefined })} className={chip(!build.drink)}>
              Без напитка
            </button>
            <ul className="mt-4 flex flex-col divide-y divide-line">
              {DRINKS.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="font-medium">{d.name}</span>
                  <span className="flex gap-2">
                    {d.options.map((o, i) => {
                      const on = build.drink?.id === d.id && build.drink.size === i;
                      return (
                        <button key={o.portion} type="button" aria-pressed={on} onClick={() => setBuild({ ...build, drink: { id: d.id, size: i } })} className={chip(on)}>
                          {o.portion} · <span className="tabular-nums">{formatPrice(o.price)}</span>
                        </button>
                      );
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </Step>

          <div className="lg:hidden">
            <Summary build={build} onReset={() => setBuild(START)} />
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
