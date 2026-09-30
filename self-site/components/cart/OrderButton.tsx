"use client";

import { useCart } from "./CartProvider";

/** Any "Заказать" button: opens the order panel. */
export default function OrderButton({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const { open } = useCart();
  return (
    <button type="button" onClick={open} className={className}>
      {children}
    </button>
  );
}
