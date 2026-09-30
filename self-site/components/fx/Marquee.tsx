"use client";

import { motion, useAnimationFrame, useMotionValue, useScroll, useSpring, useTransform, useVelocity } from "framer-motion";
import { useRef } from "react";
import { Star } from "@/components/Logo";

/**
 * Oversized running line. It drifts on its own and speeds up, reverses and
 * leans with the scroll, like a ticker reacting to the reader.
 */
export default function Marquee({ words, tone = "flame", tilt = -2 }: { words: string[]; tone?: "flame" | "dark"; tilt?: number }) {
  const base = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(velocity, [-2000, 0, 2000], [-4, 0, 4], { clamp: false });
  const skew = useTransform(velocity, [-2500, 0, 2500], [8, 0, -8]);
  const direction = useRef(1);
  const x = useTransform(base, (v) => `${((v % 50) + 50) % 50 - 50}%`);

  useAnimationFrame((_, delta) => {
    const b = boost.get();
    if (b < -0.1) direction.current = -1;
    else if (b > 0.1) direction.current = 1;
    base.set(base.get() - direction.current * (delta / 1000) * (2.2 + Math.abs(b) * 2.2));
  });

  const flame = tone === "flame";
  const row = (
    <span className="flex shrink-0 items-center">
      {words.map((w) => (
        <span key={w} className="flex items-center">
          <span
            className={`px-6 font-display text-[clamp(2.4rem,7vw,6rem)] font-black uppercase leading-none tracking-[-0.03em] ${
              flame ? "text-coal" : "text-ink"
            }`}
          >
            {w}
          </span>
          <Star className={`h-[clamp(1.4rem,3.5vw,3rem)] w-[clamp(1.4rem,3.5vw,3rem)] ${flame ? "text-coal" : "text-brand"}`} />
        </span>
      ))}
    </span>
  );

  return (
    <div aria-hidden className="relative z-10 overflow-hidden py-2" style={{ transform: `rotate(${tilt}deg)` }}>
      <div className={`py-5 ${flame ? "bg-flame" : "border-y border-line bg-coal"}`}>
        <motion.div style={{ x, skewX: skew }} className="flex w-max">
          {row}
          {row}
          {row}
          {row}
        </motion.div>
      </div>
    </div>
  );
}
