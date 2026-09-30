"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { burgerPrice, cartCount, cartTotals, extrasLines, whatsappUrl } from "@/lib/cart";
import { describe } from "@/lib/menu";
import { formatPrice, INFO } from "@/lib/site";
import { useCart } from "./CartProvider";
import ExtrasPicker from "./ExtrasPicker";
import Stepper from "./Stepper";

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.82 14.13c-.25.7-1.44 1.33-1.99 1.38-.51.05-.99.24-3.34-.7-2.82-1.11-4.62-4-4.76-4.18-.14-.19-1.13-1.5-1.13-2.87 0-1.36.71-2.03.97-2.31.25-.28.55-.35.73-.35l.53.01c.17 0 .4-.06.62.48.25.6.84 2.06.91 2.21.08.14.12.31.03.5-.1.19-.14.31-.28.48-.14.17-.3.38-.43.51-.14.14-.29.3-.12.58.17.28.74 1.22 1.59 1.98 1.09.97 2.01 1.28 2.3 1.42.28.14.45.12.62-.07.17-.19.71-.83.9-1.12.19-.28.38-.23.63-.14.26.09 1.64.77 1.92.91.28.14.47.21.54.33.07.12.07.68-.18 1.38Z"
      />
    </svg>
  );
}

export default function CartDrawer() {
  const { cart, isOpen, open, close, setBurgerQty, update, clear } = useCart();
  const [extrasOpen, setExtrasOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const count = cartCount(cart);
  const totals = cartTotals(cart);
  const extras = extrasLines(cart);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  return (
    <>
      {/* floating order button */}
      <AnimatePresence>
        {count > 0 && !isOpen && (
          <motion.button
            type="button"
            onClick={open}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] right-4 z-[55] flex items-center gap-3 rounded-full bg-flame py-3 pl-4 pr-5 font-display text-sm font-bold text-coal shadow-[0_10px_40px_-8px] shadow-flame/60 md:right-8"
          >
            <span className="grid h-7 min-w-7 place-items-center rounded-full bg-coal px-2 text-xs text-flame tabular-nums">{count}</span>
            <span className="tabular-nums">Заказ · {formatPrice(totals.total)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="shade"
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
            />
            <motion.div
              key="panel"
              ref={panel}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Ваш заказ"
              data-lenis-prevent
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-lg flex-col bg-coal outline-none ring-1 ring-line"
            >
              <header className="flex items-center justify-between border-b border-line px-5 py-4 pt-[calc(env(safe-area-inset-top,0px)+16px)] md:px-7">
                <h2 className="font-display text-xl font-bold">Ваш заказ</h2>
                <button type="button" onClick={close} className="rounded-full border border-line px-4 py-2 text-sm text-smoke transition hover:text-ink">
                  Закрыть
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-5 py-6 md:px-7">
                {cart.burgers.length === 0 && extras.length === 0 ? (
                  <div className="flex flex-col items-start gap-4 py-10">
                    <p className="text-lg">Заказ пока пуст.</p>
                    <p className="text-smoke">Соберите бургер в конструкторе или возьмите готовое комбо — они появятся здесь.</p>
                    <a href="#builder" onClick={close} className="rounded-full bg-flame px-6 py-3 font-display text-xs font-bold tracking-[0.16em] text-coal">
                      СОБРАТЬ БУРГЕР
                    </a>
                  </div>
                ) : (
                  <>
                    <ul className="flex flex-col gap-4">
                      {cart.burgers.map((b) => (
                        <li key={b.id} className="rounded-2xl bg-char p-4 ring-1 ring-inset ring-line">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-display font-bold">{b.name}</p>
                              <p className="mt-1 text-sm leading-relaxed text-smoke">{describe(b.build)}</p>
                            </div>
                            <p className="shrink-0 font-display font-bold tabular-nums">{formatPrice(burgerPrice(b.build) * b.qty)}</p>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-sm tabular-nums text-smoke">{formatPrice(burgerPrice(b.build))} за шт.</span>
                            <Stepper label={b.name} value={b.qty} onChange={(q) => setBurgerQty(b.id, q)} />
                          </div>
                        </li>
                      ))}
                    </ul>

                    {extras.length > 0 && (
                      <ul className="mt-5 flex flex-col gap-2 text-sm">
                        {extras.map((l) => (
                          <li key={l.name} className="flex justify-between gap-4">
                            <span>
                              {l.name} <span className="text-smoke">×{l.qty}</span>
                            </span>
                            <span className="tabular-nums">{formatPrice(l.price * l.qty)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                <div className="mt-6 border-t border-line pt-5">
                  <button
                    type="button"
                    aria-expanded={extrasOpen}
                    onClick={() => setExtrasOpen((o) => !o)}
                    className="flex w-full items-center justify-between text-left font-medium"
                  >
                    Добавить гарниры и напитки
                    <span className={`text-flame transition ${extrasOpen ? "rotate-45" : ""}`}>+</span>
                  </button>
                  {extrasOpen && (
                    <div className="mt-4">
                      <ExtrasPicker compact />
                    </div>
                  )}
                </div>

                <fieldset className="mt-6 border-t border-line pt-5">
                  <legend className="sr-only">Способ получения</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(["delivery", "pickup"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={cart.mode === m}
                        onClick={() => update({ mode: m })}
                        className={`rounded-2xl border p-3 text-left transition ${cart.mode === m ? "border-flame bg-flame/10" : "border-line"}`}
                      >
                        <span className="block font-medium">{m === "delivery" ? "Доставка" : "Самовывоз"}</span>
                        <span className="text-sm text-smoke">{m === "delivery" ? INFO.delivery : `за ${INFO.pickupReady}, −${INFO.pickupDiscount}%`}</span>
                      </button>
                    ))}
                  </div>
                  {cart.mode === "delivery" ? (
                    <label className="mt-4 block">
                      <span className="text-sm text-smoke">Адрес доставки</span>
                      <input
                        id="cart-address"
                        value={cart.address}
                        onChange={(e) => update({ address: e.target.value })}
                        placeholder="Улица, дом, квартира"
                        className="mt-1 w-full rounded-xl border border-line bg-char px-4 py-3 outline-none focus:border-flame"
                      />
                    </label>
                  ) : (
                    <p className="mt-4 text-sm text-smoke">Забрать: {INFO.address}</p>
                  )}
                  <label className="mt-4 block">
                    <span className="text-sm text-smoke">Комментарий</span>
                    <textarea
                      id="cart-comment"
                      value={cart.comment}
                      onChange={(e) => update({ comment: e.target.value })}
                      rows={2}
                      placeholder="Например, без лишних приборов"
                      className="mt-1 w-full resize-none rounded-xl border border-line bg-char px-4 py-3 outline-none focus:border-flame"
                    />
                  </label>
                </fieldset>
              </div>

              <footer className="border-t border-line px-5 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] md:px-7">
                {totals.discount > 0 && (
                  <p className="flex justify-between text-sm text-smoke">
                    <span>Скидка за самовывоз</span>
                    <span className="tabular-nums">−{formatPrice(totals.discount)}</span>
                  </p>
                )}
                <p className="mt-1 flex items-baseline justify-between">
                  <span className="text-smoke">Итого</span>
                  <span className="font-display text-2xl font-bold tabular-nums">{formatPrice(totals.total)}</span>
                </p>
                <div className="mt-4 flex gap-2">
                  <a
                    href={count ? whatsappUrl(cart) : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={!count}
                    className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-4 font-display text-[11px] font-bold tracking-[0.08em] transition sm:px-6 sm:text-xs sm:tracking-[0.14em] ${
                      count ? "bg-[#25d366] text-coal hover:bg-ink" : "pointer-events-none bg-char text-smoke"
                    }`}
                  >
                    <WhatsAppIcon className="h-5 w-5" />
                    ОТПРАВИТЬ В WHATSAPP
                  </a>
                  {count > 0 && (
                    <button type="button" onClick={clear} className="rounded-full border border-line px-4 text-sm text-smoke transition hover:text-ink">
                      Очистить
                    </button>
                  )}
                </div>
                <p className="mt-3 text-xs text-smoke">Откроется WhatsApp с готовым текстом заказа — останется нажать «Отправить».</p>
              </footer>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
