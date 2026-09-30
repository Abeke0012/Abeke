"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fades and lifts its children into place when they scroll into view. */
export function Reveal({ delay = 0, ...props }: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.9, delay, ease: EASE }}
      {...props}
    />
  );
}

/** Same reveal for list items, so lists keep valid markup. */
export function RevealItem({ delay = 0, ...props }: HTMLMotionProps<"li"> & { delay?: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      {...props}
    />
  );
}

export function SectionHeading({ eyebrow, title, intro }: { eyebrow: string; title: React.ReactNode; intro?: string }) {
  return (
    <Reveal className="max-w-3xl">
      <p className="font-display text-xs font-bold tracking-[0.32em] text-flame">{eyebrow}</p>
      <h2 className="mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] font-bold leading-[1.02] tracking-[-0.02em]">{title}</h2>
      {intro && <p className="mt-5 max-w-xl text-lg leading-relaxed text-smoke">{intro}</p>}
    </Reveal>
  );
}

export function Section({ id, className = "", children }: { id: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-20 px-5 py-24 md:px-12 md:py-36 ${className}`}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}
