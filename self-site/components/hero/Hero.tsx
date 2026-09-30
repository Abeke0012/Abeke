"use client";

import OrderButton from "@/components/cart/OrderButton";
import { motion, useInView, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import Logo from "@/components/Logo";
import { PHOTO_LAYERS } from "./PhotoBurger";
import { phaseAt } from "./timeline";
import useQuality from "./useQuality";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

/** Fade a block in over [a, b] and out over [c, d] of hero progress. */
function useBeat(p: MotionValue<number>, a: number, b: number, c = 2, d = 3) {
  const opacity = useTransform(p, [a, b, c, d], [0, 1, 1, 0]);
  const y = useTransform(p, [a, b], [24, 0]);
  const pointerEvents = useTransform(opacity, (o) => (o > 0.5 ? "auto" : "none"));
  return { opacity, y, pointerEvents };
}

const HERO_LAYERS = PHOTO_LAYERS.map((l) => ({ key: l.file, label: l.label }));

function LayerList({ progress }: { progress: MotionValue<number> }) {
  const [active, setActive] = useState(-1);
  useMotionValueEvent(progress, "change", (p) => {
    const e = phaseAt(p).explode;
    const n = HERO_LAYERS.length;
    setActive(e < 0.05 ? -1 : Math.min(n - 1, Math.floor(e * n)));
  });
  const beat = useBeat(progress, 0.08, 0.14, 0.4, 0.46);
  return (
    <motion.ol style={beat} className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col gap-3 md:flex lg:right-12">
      {[...HERO_LAYERS].reverse().map((layer, idx) => {
        const i = HERO_LAYERS.length - 1 - idx;
        const on = i <= active;
        return (
          <li key={layer.key} className="flex items-center justify-end gap-3 text-right">
            <span className={`text-sm transition-colors duration-500 ${on ? "text-ink" : "text-smoke/50"}`}>{layer.label}</span>
            <span className={`h-px transition-all duration-500 ${on ? "w-10 bg-flame" : "w-4 bg-smoke/40"}`} />
          </li>
        );
      })}
    </motion.ol>
  );
}

export default function Hero() {
  const section = useRef<HTMLElement>(null);
  const quality = useQuality();
  const inView = useInView(section, { margin: "200px 0px 200px 0px" });
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 32, mass: 0.6 });

  const intro = useBeat(progress, -1, 0, 0.05, 0.11);
  const boxed = useBeat(progress, 0.58, 0.64, 0.78, 0.84);
  const finale = useBeat(progress, 0.9, 0.97);
  const cue = useTransform(progress, [0, 0.04], [1, 0]);

  return (
    <section
      ref={section}
      id="top"
      aria-label="SELF — Burgers Made Bold"
      className={quality === "high" ? "relative h-[620vh]" : "relative h-[440vh]"}
    >
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        <div className="absolute inset-0">
          <HeroScene progress={progress} quality={quality} active={inView} />
        </div>

        {/* warm floor glow + edge fades so the scene melts into the page */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-coal to-transparent" />

        {/* Beat 1: hero copy */}
        <motion.div
          style={intro}
          className="absolute inset-x-0 bottom-0 flex flex-col gap-8 px-5 pb-10 md:flex-row md:items-end md:justify-between md:px-12 md:pb-14"
        >
          <div className="max-w-xl">
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-[clamp(4.5rem,13vw,10.5rem)] leading-[0.82]"
            >
              <Logo />
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.1 }}
              className="mt-5 font-display text-sm font-bold tracking-[0.34em] text-flame md:text-base"
            >
              BURGERS MADE BOLD
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.3 }}
              className="mt-3 text-lg text-ink/80 md:text-xl"
            >
              Сочные бургеры. Яркий вкус.
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.5 }}
            className="flex items-center gap-6"
          >
            <OrderButton
              className="rounded-full bg-flame px-9 py-4 font-display text-sm font-bold tracking-[0.18em] text-coal transition hover:bg-ink"
            >
              ЗАКАЗАТЬ
            </OrderButton>
            <motion.span style={{ opacity: cue }} className="hidden items-center gap-3 text-sm text-smoke md:flex">
              <span className="relative h-10 w-px overflow-hidden bg-smoke/30">
                <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollcue_1.8s_ease-in-out_infinite] bg-flame" />
              </span>
              Листайте
            </motion.span>
          </motion.div>
        </motion.div>

        {/* Beat 2: layer names light up as they separate */}
        <LayerList progress={progress} />

        {/* Beat 3: packed */}
        <motion.div style={boxed} className="pointer-events-none absolute left-5 top-24 max-w-sm md:left-12 md:top-1/3">
          <p className="font-display text-xs font-bold tracking-[0.3em] text-flame">КОМБО SELF</p>
          <p className="mt-3 font-display text-2xl font-bold leading-tight md:text-4xl">Горячим — прямо в коробку</p>
          <p className="mt-3 text-ink/70">Бургер, картофель фри и сырный соус в фирменной коробке SELF.</p>
        </motion.div>

        {/* Beat 4: finale */}
        <motion.div style={finale} className="absolute inset-x-0 top-[11svh] flex flex-col items-center text-center">
          <Logo withTagline className="text-[clamp(3rem,7vw,5.5rem)]" />
        </motion.div>
        <motion.div style={finale} className="absolute inset-x-0 bottom-[6svh] flex justify-center">
          <OrderButton
            className="rounded-full bg-flame px-12 py-5 font-display text-sm font-bold tracking-[0.2em] text-coal shadow-[0_0_60px_-10px] shadow-flame/60 transition hover:bg-ink"
          >
            ЗАКАЗАТЬ
          </OrderButton>
        </motion.div>
      </div>
    </section>
  );
}
