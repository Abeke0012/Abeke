"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Star } from "@/components/Logo";

const MIN_MS = 1500;
const SEEN_KEY = "self-intro-seen";

/** Short branded intro: SELF rises letter by letter while a flame line fills, then the curtain lifts. Once per session. */
export default function Preloader() {
  const [show, setShow] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShow(false);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / MIN_MS);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        try {
          sessionStorage.setItem(SEEN_KEY, "1");
        } catch {}
        setTimeout(() => setShow(false), 250);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center bg-coal"
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          initial={{ clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="flex items-start overflow-hidden font-display text-[clamp(4rem,16vw,11rem)] font-black leading-none tracking-[-0.04em]">
            {"SELF".split("").map((ch, i) => (
              <motion.span
                key={ch}
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block"
              >
                {ch}
              </motion.span>
            ))}
            <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.55, type: "spring", stiffness: 260, damping: 14 }}>
              <Star className="ml-[0.06em] mt-[0.06em] h-[0.34em] w-[0.34em] text-brand" />
            </motion.span>
          </div>
          <div className="mt-8 h-[3px] w-[min(60vw,320px)] overflow-hidden rounded-full bg-line">
            <div className="h-full bg-gradient-to-r from-brand via-flame to-gold" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="mt-4 font-display text-xs font-bold tracking-[0.4em] text-smoke tabular-nums">{Math.round(progress * 100)}%</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
