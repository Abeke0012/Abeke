"use client";

import { useInView } from "framer-motion";
import dynamic from "next/dynamic";
import { useMemo, useRef } from "react";
import useQuality from "@/components/hero/useQuality";
import { stackFor } from "@/components/hero/looks";
import type { Build } from "@/lib/menu";

const BurgerStage = dynamic(() => import("./BurgerStage"), { ssr: false });

/** A slowly turning 3D burger that only renders while on screen. */
export default function Burger3D({ build, open = false, label }: { build: Build; open?: boolean; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { margin: "100px" });
  const quality = useQuality();
  const stack = useMemo(() => stackFor(build), [build]);
  return (
    <div ref={box} role="img" aria-label={label} className="absolute inset-0">
      <BurgerStage stack={stack} open={open} active={inView} quality={quality} />
    </div>
  );
}
