"use client";

import { motion, useMotionValue, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Star } from "@/components/Logo";

/** Footer-wide outlined SELF that fills with flame from left to right as the page ends. */
export default function GiantWordmark() {
  const ref = useRef<HTMLDivElement>(null);
  // Measured on every scroll rather than cached, so page height changes above never leave it stale.
  const { scrollY } = useScroll();
  const scrollYProgress = useMotionValue(0);
  useMotionValueEvent(scrollY, "change", () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) scrollYProgress.set(Math.min(1, Math.max(0, (innerHeight - r.top) / r.height)));
  });
  const fill = useTransform(scrollYProgress, [0.1, 0.95], ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]);
  const y = useTransform(scrollYProgress, [0, 1], ["30%", "0%"]);

  const word = (
    <span className="flex items-start font-display text-[27vw] font-black leading-[0.8] tracking-[-0.06em]">
      SELF
      <Star className="ml-[0.02em] mt-[0.04em] h-[0.3em] w-[0.3em]" />
    </span>
  );

  return (
    <div ref={ref} aria-hidden className="relative select-none overflow-hidden px-[2vw] pt-10">
      <motion.div style={{ y }} className="relative">
        <div className="text-ink/[0.06]">{word}</div>
        <motion.div style={{ clipPath: fill }} className="absolute inset-0 bg-gradient-to-b from-flame via-brand to-brand/70 bg-clip-text text-transparent [&_svg]:text-brand">
          {word}
        </motion.div>
      </motion.div>
    </div>
  );
}
