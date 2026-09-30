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

/** Words rise one after another from behind a mask, like type being set. */
export function SplitWords({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <motion.span
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ staggerChildren: 0.07, delayChildren: delay }}
      aria-label={text}
    >
      {text.split(" ").map((word, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            variants={{ hidden: { y: "105%", rotate: 6 }, shown: { y: 0, rotate: 0 } }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            {word}
          </motion.span>
          {"\u00a0"}
        </span>
      ))}
    </motion.span>
  );
}

export function SectionHeading({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="max-w-3xl">
      <Reveal>
        <p className="flex items-center gap-3 font-display text-xs font-bold tracking-[0.32em] text-flame">
          <span className="h-px w-10 bg-flame" />
          {eyebrow}
        </p>
      </Reveal>
      <h2 className="mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] font-bold leading-[1.02] tracking-[-0.02em]">
        <SplitWords text={title} delay={0.1} />
      </h2>
      {intro && (
        <Reveal delay={0.3}>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-smoke">{intro}</p>
        </Reveal>
      )}
    </div>
  );
}

export function Section({ id, className = "", children }: { id: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-20 px-5 py-24 md:px-12 md:py-36 ${className}`}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}
