"use client";

import { useEffect, useState } from "react";
import type { Quality } from "./Burger";

/** Phones, touch devices and reduced-motion users get the lighter scene. */
export default function useQuality(): Quality {
  const [quality, setQuality] = useState<Quality>("high");
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px), (pointer: coarse), (prefers-reduced-motion: reduce)");
    const update = () => setQuality(mq.matches ? "low" : "high");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return quality;
}
