"use client";

import OrderButton from "@/components/cart/OrderButton";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";
import Logo from "@/components/Logo";
import { NAV } from "@/lib/site";

export default function Header() {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setSolid(y > 40));

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className={`fixed inset-x-0 top-0 z-50 px-5 transition-colors duration-500 md:px-12 ${solid ? "bg-coal/70 backdrop-blur-xl" : "bg-transparent"}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between md:h-[72px]">
        <a href="#top" className="text-2xl" aria-label="SELF — на главную">
          <Logo />
        </a>
        <nav aria-label="Разделы" className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="text-sm text-ink/70 transition hover:text-ink">
              {item.label}
            </a>
          ))}
        </nav>
        <OrderButton
          className="rounded-full border border-ink/25 px-5 py-2.5 font-display text-xs font-bold tracking-[0.16em] transition hover:border-flame hover:bg-flame hover:text-coal"
        >
          ЗАКАЗАТЬ
        </OrderButton>
      </div>
    </motion.header>
  );
}
