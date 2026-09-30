"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Flame ring that trails the mouse on desktop. It swells over anything
 * clickable and shows the hint from the nearest `data-cursor` attribute.
 * The system cursor stays visible, so nothing gets harder to use.
 */
export default function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [down, setDown] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 });

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    setEnabled(mq.matches);
    if (!mq.matches) return;
    const inspect = (el: Element | null) => {
      const clickable = !!el?.closest?.("a, button, input, textarea, [role=tab]");
      setLabel(clickable ? null : (el?.closest?.("[data-cursor]")?.getAttribute("data-cursor") ?? null));
      setActive(clickable);
    };
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      inspect(e.target as Element | null);
    };
    // Content slides under a still mouse while scrolling, so re-check what is beneath it.
    const scroll = () => inspect(document.elementFromPoint(x.get(), y.get()));
    const press = () => setDown(true);
    const release = () => setDown(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", release);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
    };
  }, [x, y]);

  if (!enabled) return null;
  const size = label ? 84 : active ? 44 : 18;

  return (
    <motion.div aria-hidden className="pointer-events-none fixed left-0 top-0 z-[90]" style={{ x: sx, y: sy }}>
      <motion.div
        animate={{ width: size, height: size, scale: down ? 0.8 : 1, backgroundColor: label ? "rgba(255,106,26,0.95)" : "rgba(255,106,26,0)" }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className="-translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border-2 border-flame"
      >
        {label && <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-coal">{label}</span>}
      </motion.div>
    </motion.div>
  );
}
